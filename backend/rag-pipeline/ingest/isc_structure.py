"""Turn extracted ISC syllabus text into structured units + subtopics.

Two stages, deliberately split:

  Stage A (deterministic)  class sections -> Paper I theory block -> numbered units,
                           plus the exam-weightage table and the practicals list.
                           These boundaries are reliable: isc_extract_text.py's QA
                           verified unit numbering is sequential in all 38 subjects.

  Stage B (LLM)            each unit's prose -> {subtopic, description} records.
                           The source has no per-subtopic delimiter - it is running
                           prose with (i)/(a) elaboration - so this is the one part
                           regex cannot do honestly.

Stage B results are cached per unit keyed by a hash of the unit text, so re-running
after a Stage A change costs nothing for units whose text did not move.

Usage (from backend/rag-pipeline/):
    python ingest/isc_structure.py --only physics --dry-run   # Stage A only
    python ingest/isc_structure.py --only physics             # A + B
    python ingest/isc_structure.py --core                     # the 12 core subjects
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(REPO_ROOT / ".env", override=False)

ISC_DIR = REPO_ROOT / "backend" / "data" / "isc"
TEXT_DIR = ISC_DIR / "text"
OUT_DIR = ISC_DIR / "structured"
CACHE_DIR = ISC_DIR / "llm_cache"
QA_REPORT = ISC_DIR / "extraction_qa.json"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("ISC_GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Subjects that map onto a gap-analysis domain. Art/Music/SUPW/Fashion Designing etc.
# have no domain in _shared/curriculumGaps.ts and would only add retrieval noise.
CORE_SUBJECTS = [
    "mathematics", "physics", "chemistry", "biology", "english", "history",
    "geography", "economics", "political-science", "computer-science",
    "accountancy", "business-studies",
]

CLASS_SPLIT_RE = re.compile(
    r"(?m)^\s*(CLASS(?:ES)?\s+XI\s*(?:&|and)\s*XII|CLASS\s+XII|CLASS\s+XI)\s*$",
    re.IGNORECASE,
)
THEORY_START_RE = re.compile(r"(?m)^\s*PAPER\s*[-–]?\s*I\b[^\n]*THEORY", re.IGNORECASE)
PRACTICAL_START_RE = re.compile(
    r"(?m)^\s*(PAPER\s*[-–]?\s*(?:II|2)\b|PRACTICAL\s+WORK)", re.IGNORECASE
)
PROJECT_START_RE = re.compile(r"(?m)^\s*PROJECT\s+WORK", re.IGNORECASE)
# Reflow merges a unit heading with the prose that follows it, so a heading line can
# run to 250+ chars. Capture the whole line and derive the title separately rather
# than anchoring to end-of-line.
# Lowercase starts are legitimate: Chemistry XII unit 4 is "d-and f-Block Elements".
UNIT_HEADING_RE = re.compile(r"(?m)^\s{0,6}(\d{1,2})\.\s{1,4}([A-Za-z][^\n]*)$")
NUMBERED_ITEM_RE = re.compile(r"(?m)^\s{0,6}(\d{1,2})\.\s{1,4}(\S[^\n]*)$")
PAGE_MARKER_RE = re.compile(r"(?m)^=== PAGE \d+ ===\s*$")
# Optional name text followed by a marks value, e.g. "23 Marks" or
# "Work, Energy and Power 17 Marks" - the table puts them either way.
TABLE_MARKS_RE = re.compile(r"^(?:(.*?)\s+)?(\d{1,3})\s*Marks?\.?$", re.IGNORECASE)
TABLE_NUM_RE = re.compile(r"^(\d{1,2})\.?$")

# Words that may legitimately appear lowercase inside a unit title.
TITLE_CONNECTORS = {"and", "of", "the", "in", "for", "to", "or", "with", "a", "an", "on"}

# Below this many numbered units in a section carrying real content, assume the
# subject simply isn't numbered and let the LLM structure the whole block.
MIN_UNITS_BEFORE_FALLBACK = 2
FALLBACK_MIN_CHARS = 600

# Paper-level headings used to name a fallback unit, so it reads as something
# meaningful ("English Language") rather than "Unit 1".
PAPER_TITLE_RE = re.compile(
    r"(?m)^\s*(?:PAPER\s*[-–]?\s*[I1]\s*[:\-–]?\s*)?"
    r"(LANGUAGE|LITERATURE|THEORY)\b[^\n]*$",
    re.IGNORECASE,
)


def strip_pages(text: str) -> str:
    return PAGE_MARKER_RE.sub("", text)


def split_classes(text: str) -> list[dict]:
    """Split the document into class sections, returning label + body."""
    matches = list(CLASS_SPLIT_RE.finditer(text))
    if not matches:
        return [{"label": "CLASSES XI & XII", "grade_min": 11, "grade_max": 12, "body": text}]

    sections = []
    for i, m in enumerate(matches):
        raw_label = re.sub(r"\s+", " ", m.group(1).strip().upper())
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end():end]

        # Order matters: "XI" is a substring of "XII", so test the combined form
        # and then XII explicitly before falling through to XI.
        if re.search(r"\bXI\b\s*(&|AND)\s*\bXII\b", raw_label):
            label, gmin, gmax = "CLASSES XI & XII", 11, 12
        elif re.search(r"\bXII\b", raw_label):
            label, gmin, gmax = "CLASS XII", 12, 12
        else:
            label, gmin, gmax = "CLASS XI", 11, 11

        # Repeated headers (running titles) produce tiny fragments; fold them away.
        if len(body.strip()) < 200 and sections:
            sections[-1]["body"] += "\n" + body
            continue
        sections.append({"label": label, "grade_min": gmin, "grade_max": gmax, "body": body})

    # A class heading can recur later in the document (project-work sections repeat
    # it). Duplicates are resolved by the caller, which picks whichever candidate
    # actually yields syllabus units - neither "first" nor "largest" is reliable:
    # Political Science's project-work section is both later and bigger than the
    # syllabus section, and its numbered rubric otherwise parses as units.
    return sections


def parse_weightage(body: str) -> dict[int, dict]:
    """Parse the 'S.NO | UNIT | TOTAL WEIGHTAGE' table when the subject has one.

    Returns {unit_number: {"name": ..., "weightage": ...}}. The table is emitted one
    cell per line, and the marks value covers a *group* of units (units 1-3 share
    "23 Marks"), so a mark applies to every unit seen since the previous mark.

    Where present this is the authoritative source of unit names: paragraph reflow
    fuses the in-body heading with the prose after it, but table cells stay clean.
    """
    table_start = re.search(r"(?m)^\s*S\.\s*N[oO]\.?\s*$", body)
    if not table_start:
        return {}

    window = body[table_start.end(): table_start.end() + 4000]
    lines = [ln.strip() for ln in window.splitlines() if ln.strip()]

    table: dict[int, dict] = {}
    current: int | None = None
    name_parts: list[str] = []
    order: list[int] = []            # unit numbers in table order
    marks_events: list[tuple[int, str]] = []  # (units_seen_so_far, "NN Marks")

    def flush_name() -> None:
        if current is not None and name_parts:
            name = re.sub(r"\s+", " ", " ".join(name_parts)).strip(" .:-")
            if name:
                table.setdefault(current, {})["name"] = name[:300]

    for line in lines:
        # Header cells first: "TOTAL WEIGHTAGE" is a column title, not the closing
        # "TOTAL 70 Marks" row, and must not be mistaken for the end of the table.
        if re.match(r"^(UNIT|S\.\s*N[oO]\.?|TOTAL\s+WEIGHTAGE)$", line, re.IGNORECASE):
            continue
        if re.match(r"^TOTAL\b", line, re.IGNORECASE):
            flush_name()
            break

        num = TABLE_NUM_RE.match(line)
        if num:
            flush_name()
            current = int(num.group(1))
            name_parts = []
            order.append(current)
            continue

        marks = TABLE_MARKS_RE.match(line)
        if marks:
            if marks.group(1):
                name_parts.append(marks.group(1))
            flush_name()
            name_parts = []
            marks_events.append((len(order), f"{marks.group(2)} Marks"))
            continue

        name_parts.append(line)

    flush_name()

    # A marks cell spans several unit rows and is emitted at the START of the group
    # it covers, so values are forward-filled: each value holds until the next one.
    # (Physics XI: 23+17+20+10 = 70 = the table's stated total.)
    for idx, (units_seen, value) in enumerate(marks_events):
        start = max(units_seen - 1, 0)
        end = marks_events[idx + 1][0] - 1 if idx + 1 < len(marks_events) else len(order)
        for n in order[start:end]:
            table.setdefault(n, {})["weightage"] = value

    return table


def check_weightage(units: list[dict], body: str) -> dict | None:
    """Validate the parsed table arithmetically against the table's own TOTAL row.

    Marks are summed once per *contiguous* run of units sharing a value - the same
    value can legitimately appear in two separate groups (Physics XII: units 7 and 9
    are both '7 Marks'), so deduplicating by value would undercount.
    """
    total_row = re.search(r"(?m)^\s*TOTAL\s+(\d{1,3})\s*Marks?\s*$", body, re.IGNORECASE)
    if not total_row:
        return None

    summed, prev = 0, None
    for unit in units:
        value = unit.get("weightage")
        if value and value != prev:
            summed += int(re.match(r"(\d+)", value).group(1))
        prev = value

    stated = int(total_row.group(1))
    return {"stated_total": stated, "parsed_total": summed, "matches": summed == stated}


def derive_unit_name(raw_line: str, table_name: str | None) -> str:
    """Clean unit title. Prefers the weightage-table cell; otherwise trims the
    reflowed heading line at the point prose starts."""
    if table_name:
        return table_name

    text = re.sub(r"\s+", " ", raw_line).strip()
    words = text.split(" ")
    kept: list[str] = []
    for word in words:
        bare = word.strip("(),:;.")
        if not bare:
            break
        # A title runs while words are capitalised (connectors excepted). The first
        # ordinary lowercase word marks where the syllabus prose begins.
        if kept and bare[:1].islower() and bare.lower() not in TITLE_CONNECTORS:
            break
        kept.append(word)
        if len(" ".join(kept)) > 70:
            break
        if word.endswith((":", ".", ";")):
            break
    name = " ".join(kept).strip(" .:-;,")
    return (name or text[:70]).strip()


def theory_scope(body: str) -> str:
    """Everything before the first Paper II / Practical / Project Work marker.

    The project-work section carries its own marks table whose rows are evaluation
    criteria ("Process", "Presentation", "Viva"). Parsing weightage over the whole
    section picks that table up and its criteria then override the real unit names.
    """
    # The cut point is the first Paper II / Project Work marker that appears AFTER
    # the last Paper-I heading. Subjects put the weightage table on either side of
    # that heading (Physics XII before it, Mathematics after it), so the scope runs
    # from the start of the section; only the trailing project-work block - whose
    # own marks table lists evaluation criteria - has to be excluded.
    theory_heads = list(THEORY_START_RE.finditer(body))
    after = theory_heads[-1].end() if theory_heads else 0

    ends = [
        m.start()
        for m in (PRACTICAL_START_RE.search(body, after), PROJECT_START_RE.search(body, after))
        if m
    ]
    return body[: min(ends)] if ends else body


def slice_theory(body: str) -> str:
    """Return the theory block: last Paper-I heading up to the first non-theory section.

    The end boundary takes the EARLIEST of Paper II / Practical Work / Project Work.
    Cutting only at Paper II leaves the project-work evaluation rubric inside the
    slice, and its numbered criteria ("1. Process", "2. Understanding", ...) chain
    straight into the syllabus numbering to form a longer, bogus unit run.
    """
    theory_heads = list(THEORY_START_RE.finditer(body))
    start = theory_heads[-1].end() if theory_heads else 0

    ends = [
        m.start()
        for m in (PRACTICAL_START_RE.search(body, start), PROJECT_START_RE.search(body, start))
        if m
    ]
    return body[start: min(ends) if ends else len(body)]


def fallback_unit_name(theory: str) -> str:
    """Name a whole-section fallback unit from its paper heading, if it has one."""
    head = PAPER_TITLE_RE.search(theory)
    if head:
        label = re.sub(r"\s+", " ", head.group(1)).strip().title()
        if label and label.lower() != "theory":
            return label
    for line in theory.splitlines():
        candidate = line.strip(" .:-–—")
        # Skip mark allocations and other non-title debris ("– 80 Marks").
        if len(candidate) > 8 and candidate[:1].isalnum() and not re.search(r"\bmarks?\b", candidate, re.I):
            return candidate[:70]
    return "Syllabus Content"


def extract_units(theory: str, table: dict[int, dict]) -> list[dict]:
    """Pull numbered units as the longest run of consecutively numbered headings.

    Requiring the run to start at 1 is too brittle: when a unit-1 heading is mangled
    by reflow (Political Science XI), that rule skips the real syllabus and latches
    onto a stray "1." in the project-work rubric further down. Taking the longest
    consecutive chain instead recovers units 2..12 and ignores the short rubric run.
    """
    headings = list(UNIT_HEADING_RE.finditer(theory))

    def chain_score(chain: list[re.Match]) -> tuple[int, int]:
        # Length first, then how much text the chain spans. The span tie-break
        # matters where a subject lists its units twice - once in the marks
        # distribution table, once as the real syllabus (Mathematics). Both chains
        # are the same length; the detailed one is an order of magnitude longer.
        span = (chain[-1].start() - chain[0].start()) if chain else 0
        return len(chain), span

    best_chain: list[re.Match] = []
    for i in range(len(headings)):
        chain = [headings[i]]
        expected = int(headings[i].group(1)) + 1
        for m in headings[i + 1:]:
            if int(m.group(1)) == expected:
                chain.append(m)
                expected += 1
        if chain_score(chain) > chain_score(best_chain):
            best_chain = chain

    kept = best_chain

    # Not every ISC subject numbers its syllabus. English's Language paper is
    # organised as "Question One / Question Two / ..." and its Literature paper as
    # a list of prescribed texts, so the numbered-chain scan finds nothing and the
    # whole paper would be dropped (measured: 47% of English's theory text made it
    # into units, vs 97-100% for the other 11 core subjects). Rather than
    # special-casing English, hand the whole block to Stage B as a single unit
    # whenever deterministic parsing clearly failed on a section with real content.
    if len(kept) < MIN_UNITS_BEFORE_FALLBACK and len(theory.strip()) >= FALLBACK_MIN_CHARS:
        return [
            {
                "number": 1,
                "name": fallback_unit_name(theory),
                "weightage": None,
                "text": theory.strip(),
                "char_count": len(theory.strip()),
                "parse_mode": "llm-fallback",
            }
        ]

    units = []
    for i, m in enumerate(kept):
        end = kept[i + 1].start() if i + 1 < len(kept) else len(theory)
        number = int(m.group(1))
        entry = table.get(number, {})
        unit_text = theory[m.start():end].strip()
        units.append(
            {
                "number": number,
                "name": derive_unit_name(m.group(2), entry.get("name"))[:300],
                "weightage": entry.get("weightage"),
                "text": unit_text,
                "char_count": len(unit_text),
            }
        )
    return units


def extract_practicals(body: str) -> list[str]:
    """Experiment list from the Paper II block only.

    Scoped to start at the Paper II heading: scanning the whole section would
    re-match the theory units' own numbering and report them as practicals.
    """
    prac = PRACTICAL_START_RE.search(body)
    if not prac:
        return []
    end_match = PROJECT_START_RE.search(body, prac.end())
    block = body[prac.end(): end_match.start() if end_match else len(body)]

    items, expected = [], 1
    for m in NUMBERED_ITEM_RE.finditer(block):
        if int(m.group(1)) != expected:
            continue
        start = m.start()
        nxt = None
        for m2 in NUMBERED_ITEM_RE.finditer(block, m.end()):
            if int(m2.group(1)) == expected + 1:
                nxt = m2.start()
                break
        text = block[start: nxt if nxt else min(len(block), start + 1200)]
        items.append(re.sub(r"\s+", " ", text).strip()[:600])
        expected += 1
    return items


# ── Stage B: LLM structuring ──────────────────────────────────────────────────

SYSTEM_PROMPT = """You extract structured curriculum data from official ISC (CISCE) syllabus text.

You are given the verbatim text of ONE unit from an ISC subject syllabus. Break it into
the distinct teachable subtopics a teacher would actually cover.

RULES
- Use ONLY content present in the supplied text. Never invent topics.
- Each subtopic must be a concrete teachable concept, not a heading like "Introduction".
- 3 to 15 subtopics per unit. Merge trivial fragments; split genuinely separate concepts.
- "name": a short noun phrase (3-10 words), the concept itself.
- "description": one sentence of scope drawn from the text, including any explicit
  exclusions the syllabus states (e.g. "derivation not required").
- Ignore mark allocations, exam instructions, and cross-references to other units.
- Return ONLY valid JSON. No markdown fences, no prose before or after."""

USER_TEMPLATE = """Subject: {subject}
Class: {class_label}
Unit {number}: {unit_name}

--- VERBATIM UNIT TEXT ---
{unit_text}
--- END ---

Return JSON exactly matching:
{{"subtopics":[{{"name":"...","description":"..."}}]}}"""


def cache_key(subject: str, unit_text: str) -> str:
    return hashlib.sha256(f"{subject}\x00{unit_text}".encode()).hexdigest()[:24]


def call_gemini(prompt: str, retries: int = 4) -> dict | None:
    url = GEMINI_URL.format(model=GEMINI_MODEL)
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json",
        },
    }
    for attempt in range(1, retries + 1):
        try:
            resp = requests.post(
                url, params={"key": GEMINI_API_KEY}, json=payload, timeout=120
            )
            if resp.status_code == 200:
                body = resp.json()
                text = body["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            # 429/5xx are worth waiting out; 4xx client errors are not.
            if resp.status_code not in (429, 500, 502, 503, 504):
                print(f"      [ERROR] gemini {resp.status_code}: {resp.text[:200]}")
                return None
            wait = min(2 ** attempt * 2, 60)
            print(f"      [WARN] gemini {resp.status_code}, retry in {wait}s")
            time.sleep(wait)
        except Exception as exc:  # noqa: BLE001
            print(f"      [WARN] gemini call failed ({type(exc).__name__}), attempt {attempt}")
            time.sleep(min(2 ** attempt * 2, 60))
    return None


def structure_unit(subject: str, class_label: str, unit: dict) -> list[dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = cache_key(subject, unit["text"])
    cache_file = CACHE_DIR / f"{key}.json"

    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8")).get("subtopics", [])
        except Exception:  # noqa: BLE001 - a corrupt cache entry should just be redone
            pass

    prompt = USER_TEMPLATE.format(
        subject=subject,
        class_label=class_label,
        number=unit["number"],
        unit_name=unit["name"],
        unit_text=unit["text"][:24000],
    )
    result = call_gemini(prompt)
    if not result:
        return []

    # Gemini honours the JSON mime type but not always the wrapper shape - it
    # sometimes returns the bare array instead of {"subtopics": [...]}.
    if isinstance(result, list):
        items = result
    elif isinstance(result, dict):
        items = result.get("subtopics") or []
    else:
        items = []

    subs = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = re.sub(r"\s+", " ", str(item.get("name", ""))).strip()
        desc = re.sub(r"\s+", " ", str(item.get("description", ""))).strip()
        if name:
            subs.append({"name": name[:400], "description": desc[:1500]})

    cache_file.write_text(json.dumps({"subtopics": subs}, indent=2), encoding="utf-8")
    return subs


def process_subject(entry: dict, dry_run: bool) -> dict:
    text = strip_pages((TEXT_DIR / entry["text_file"]).read_text(encoding="utf-8"))
    subject = entry["subject"]

    # Parse every candidate section, then keep the best one per class label.
    parsed_by_label: dict[str, dict] = {}
    for sec in split_classes(text):
        table = parse_weightage(theory_scope(sec["body"]))
        theory = slice_theory(sec["body"])
        units = extract_units(theory, table)
        practicals = extract_practicals(sec["body"])

        # ISC always prints the syllabus before the project-work section, so the
        # first candidate that yields any units is the right one. Scoring on size
        # or unit count instead picks the project rubric, whose numbered criteria
        # chain into the syllabus numbering and produce a longer bogus run.
        score = (len(units), sum(u["char_count"] for u in units))
        existing = parsed_by_label.get(sec["label"])
        if existing and existing["units"]:
            continue
        parsed_by_label[sec["label"]] = {
            "score": score, "sec": sec, "table": table,
            "units": units, "practicals": practicals,
        }

    classes = []
    for entry_data in parsed_by_label.values():
        sec = entry_data["sec"]
        units = entry_data["units"]
        practicals = entry_data["practicals"]

        for unit in units:
            unit["subtopics"] = [] if dry_run else structure_unit(subject, sec["label"], unit)
            if not dry_run:
                print(
                    f"      unit {unit['number']:>2}. {unit['name'][:46]:<46} "
                    f"{unit['char_count']:>6}c -> {len(unit['subtopics']):>2} subtopics"
                )

        classes.append(
            {
                "class_label": sec["label"],
                "grade_min": sec["grade_min"],
                "grade_max": sec["grade_max"],
                "unit_count": len(units),
                "weightage_check": check_weightage(units, theory_scope(sec["body"])),
                "units": units,
                "practicals": practicals,
            }
        )

    return {
        "subject": subject,
        "slug": entry["slug"],
        "source_url": entry["url"],
        "syllabus_year": 2027,
        "board": "ISC",
        "template": entry.get("template"),
        "classes": classes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Structure ISC syllabus text")
    parser.add_argument("--only", help="substring filter on subject name or slug")
    parser.add_argument("--core", action="store_true", help="the 12 core academic subjects")
    parser.add_argument("--dry-run", action="store_true", help="Stage A only, no LLM calls")
    args = parser.parse_args()

    entries = [
        e for e in json.loads(QA_REPORT.read_text(encoding="utf-8"))
        if e.get("is_subject") and e.get("text_file")
    ]
    if args.core:
        entries = [e for e in entries if e["slug"] in CORE_SUBJECTS]
    if args.only:
        needle = args.only.lower()
        entries = [e for e in entries if needle in e["subject"].lower() or needle in e["slug"]]

    if not entries:
        print("[ERROR] no subjects matched")
        return 1
    if not args.dry_run and not GEMINI_API_KEY:
        print("[ERROR] GEMINI_API_KEY not set in .env")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mode = "Stage A only (dry-run)" if args.dry_run else f"Stage A + B ({GEMINI_MODEL})"
    print(f"[INFO] structuring {len(entries)} subject(s) - {mode}\n")

    totals = {"units": 0, "subtopics": 0, "practicals": 0}
    for i, entry in enumerate(entries, 1):
        print(f"  [{i}/{len(entries)}] {entry['subject']}")
        doc = process_subject(entry, args.dry_run)

        for cls in doc["classes"]:
            totals["units"] += cls["unit_count"]
            totals["practicals"] += len(cls["practicals"])
            totals["subtopics"] += sum(len(u["subtopics"]) for u in cls["units"])
            print(
                f"      {cls['class_label']:<18} units={cls['unit_count']:>2} "
                f"subtopics={sum(len(u['subtopics']) for u in cls['units']):>3} "
                f"practicals={len(cls['practicals']):>2}"
            )

        (OUT_DIR / f"{entry['slug']}.json").write_text(
            json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    print(f"\n[DONE] -> {OUT_DIR}")
    print(f"       units={totals['units']} subtopics={totals['subtopics']} practicals={totals['practicals']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
