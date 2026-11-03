"""Turn the CISCE ICSE (Classes IX-X) syllabus PDFs into structured units + subtopics.

Same output format and Stage B as isc_structure.py (which it imports), with an
ICSE Stage A:

  Stage A (deterministic)  Each content subject has a "CLASS IX" and a "CLASS X"
                           part; the theory runs from that heading to the first
                           "INTERNAL ASSESSMENT" (practical work comes after it).
                           Units are the numbered headings in sequence (1., 2., ...).
                           The full heading is kept: ICSE titles are sentence
                           case, so ISC's Title-Case name rule cut them short
                           ("Periodic Properties and"). History & Civics numbers
                           its Civics and History sections separately, so each
                           section is read on its own.

  Stage B (LLM)            isc_structure.structure_unit(): each unit's own text ->
                           {subtopic, description}, cached per unit text.

English and the Indian languages are examined as language skills, not units, so
they are not structured here (see language_skills.py).

Sources: backend/data/ICSE/pdfs, downloaded from
https://cisce.org/regulations-and-syllabuses-icse-2028/ (links in
"backend/data/ICSE/ICSE all sub URLs.txt"); text in backend/data/ICSE/text.

Usage (from backend/rag-pipeline/):
    python ingest/icse_structure.py --dry-run          # Stage A only: print the units
    python ingest/icse_structure.py                    # A + B -> data/ICSE/structured
    python ingest/icse_structure.py --only physics
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import isc_structure as isc  # noqa: E402

ICSE_DIR = isc.REPO_ROOT / "backend" / "data" / "ICSE"
TEXT_DIR = ICSE_DIR / "text"
OUT_DIR = ICSE_DIR / "structured"
SOURCE_PAGE = "https://cisce.org/regulations-and-syllabuses-icse-2028/"

# slug -> (subject label used in curriculum_nodes, source PDF on the CISCE page)
SUBJECTS: dict[str, tuple[str, str]] = {
    "mathematics": ("Mathematics", "https://cisce.org/wp-content/uploads/2026/01/9.-Mathematics.pdf"),
    "physics": ("Physics", "https://cisce.org/wp-content/uploads/2026/01/10.-Physics.pdf"),
    "chemistry": ("Chemistry", "https://cisce.org/wp-content/uploads/2026/01/11.-Chemistry.pdf"),
    "biology": ("Biology", "https://cisce.org/wp-content/uploads/2026/01/12.-Biology.pdf"),
    "history-civics": ("History & Civics", "https://cisce.org/wp-content/uploads/2026/01/5.-History-Civics.pdf"),
    "geography": ("Geography", "https://cisce.org/wp-content/uploads/2026/01/6.-Geography.pdf"),
    "economics": ("Economics", "https://cisce.org/wp-content/uploads/2026/01/13.-Economics.pdf"),
    "commercial-studies": ("Commercial Studies", "https://cisce.org/wp-content/uploads/2026/01/14.-Commercial-Studies.pdf"),
    "computer-applications": ("Computer Applications", "https://cisce.org/wp-content/uploads/2026/01/18.-Computer-Applications.pdf"),
}

CLASSES = (("CLASS IX", "IX", 9), ("CLASS X", "X", 10))
HEADING_RE = re.compile(r"^\s*(\d{1,2})\.\s*(.*?)\s*$")
SECTION_RE = re.compile(r"^\s*SECTION\s+[AB]\s*:\s*(CIVICS|HISTORY)\s*$", re.M)

# Stage B is shared with ISC; only the board name in the prompt and the cache differ.
isc.SYSTEM_PROMPT = isc.SYSTEM_PROMPT.replace("official ISC (CISCE)", "official ICSE (CISCE)").replace(
    "an ISC subject", "an ICSE subject")
isc.CACHE_DIR = ICSE_DIR / "llm_cache"


def class_theory(text: str, roman: str) -> str:
    """The theory part of one class: from 'CLASS IX' / 'CLASS X' to INTERNAL ASSESSMENT."""
    m = re.search(rf"^\s*CLASS\s+{roman}\s*$", text, re.M)
    if not m:
        return ""
    rest = text[m.end():]
    end = re.search(r"^\s*INTERNAL ASSESSMENT", rest, re.M)
    return rest[: end.start()] if end else rest


def clean_title(title: str) -> str:
    # The PDF text has U+FFFD where a dash was ("Properties � Physical").
    title = re.sub(r"\s+", " ", title.replace("�", "-")).strip(" .:-–")
    return title[:160]


def extract_units(theory: str, prefix: str = "") -> list[dict]:
    """Numbered headings in sequence; a heading's text runs to the next heading."""
    lines = theory.splitlines()
    heads: list[tuple[int, int, str]] = []  # (line index, number, title)
    expected = 1
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if not m or int(m.group(1)) != expected:
            continue
        title = m.group(2)
        if not title:  # "1." alone on its line: the title is the next non-empty line
            title = next((l for l in lines[i + 1:i + 4] if l.strip()), "")
        heads.append((i, expected, clean_title(title)))
        expected += 1
    units = []
    for k, (i, _, title) in enumerate(heads):
        # Class X Computer Applications opens with "Revision of Class IX Syllabus":
        # its content is Class IX's, which would then count twice.
        if title.lower().startswith("revision of"):
            continue
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        body = "\n".join(lines[i:end]).strip()
        units.append({
            "number": len(units) + 1,
            "name": f"{prefix}{title}",
            "weightage": None,
            "text": body,
            "char_count": len(body),
        })
    return units


def class_units(slug: str, theory: str) -> list[dict]:
    if slug != "history-civics":
        return extract_units(theory)
    # Civics and History are numbered separately: read each section on its own.
    parts = list(SECTION_RE.finditer(theory))
    units: list[dict] = []
    for k, m in enumerate(parts):
        end = parts[k + 1].start() if k + 1 < len(parts) else len(theory)
        section = m.group(1).title()
        for u in extract_units(theory[m.end():end], prefix=f"{section}: "):
            u["number"] = len(units) + 1
            units.append(u)
    return units


def process_subject(slug: str, dry_run: bool) -> dict:
    subject, source_url = SUBJECTS[slug]
    text = isc.strip_pages((TEXT_DIR / f"{slug}.txt").read_text(encoding="utf-8"))
    classes = []
    for label, roman, grade in CLASSES:
        units = class_units(slug, class_theory(text, roman))
        if not dry_run:
            for u in units:
                u["subtopics"] = isc.structure_unit(subject, label, u)
        classes.append({
            "class_label": label, "grade_min": grade, "grade_max": grade,
            "unit_count": len(units), "weightage_check": None, "units": units, "practicals": [],
        })
    return {
        "subject": subject, "slug": slug, "source_url": source_url, "source_page": SOURCE_PAGE,
        "syllabus_year": "2028", "board": "ICSE", "template": "icse-class-units", "classes": classes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Structure ICSE IX-X syllabus text")
    parser.add_argument("--only", help="substring filter on subject slug")
    parser.add_argument("--dry-run", action="store_true", help="Stage A only; print units, write nothing")
    args = parser.parse_args()

    slugs = [s for s in SUBJECTS if not args.only or args.only in s]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        data = process_subject(slug, args.dry_run)
        for cls in data["classes"]:
            subs = sum(len(u.get("subtopics", [])) for u in cls["units"])
            print(f"{data['subject']:<22} {cls['class_label']:<8} units={cls['unit_count']:>2}"
                  + ("" if args.dry_run else f" subtopics={subs:>3}"))
            if args.dry_run:
                for u in cls["units"]:
                    print(f"    {u['number']:>2}. {u['name']}  ({u['char_count']} chars)")
        if not args.dry_run:
            (OUT_DIR / f"{slug}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
