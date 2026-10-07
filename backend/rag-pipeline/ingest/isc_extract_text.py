"""Extract text from the downloaded ISC syllabus PDFs, normalise it, and QA the result.

Extractor choice is load-bearing, measured on these exact files:

  pypdf                 correct column order, but splits words across text objects
                        (1,234 artifacts across 38 subjects: "CL"/"ASS XII", "P aper").
                        Mangled the CLASS XII marker in Biology and CLASS XI in
                        Accountancy badly enough that the class sections went undetected.
  pymupdf sort=True     REPRODUCES the two-column interleaving bug: it sorts by
                        y-coordinate across the full page width, fusing left- and
                        right-column sentences mid-thought. Never use it here.
  pymupdf plain         correct column order AND near-zero character splitting.  <-- used

PyMuPDF emits justified text one word per line, so raw output is reflowed into
paragraphs below. Word order is already correct, so reflow is safe; column
interleaving, by contrast, would not be recoverable.

Usage (from backend/rag-pipeline/):
    python ingest/isc_extract_text.py
    python ingest/isc_extract_text.py --only physics
    python ingest/isc_extract_text.py --raw        # also keep un-normalised text
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import pymupdf  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
ISC_DIR = REPO_ROOT / "backend" / "data" / "isc"
PDF_DIR = ISC_DIR / "pdfs"
TEXT_DIR = ISC_DIR / "text"
RAW_DIR = ISC_DIR / "text_raw"
MANIFEST = ISC_DIR / "manifest.json"
QA_REPORT = ISC_DIR / "extraction_qa.json"

MIN_CHARS_PER_PAGE = 40

# Repeated on every content page; carries no syllabus information and would otherwise
# be spliced into unit text during reflow.
RUNNING_HEADER_RE = re.compile(r"^\s*ISC\s+Examination\s+Year\s+\d{4}\s*$", re.IGNORECASE)

# Lines that must keep their own line break because the structure parser keys off them.
STRUCTURAL_START_RE = re.compile(
    r"""^\s*(
        \d{1,2}\.(\s|$)                 # 1.  Unit heading
      | \(\s*[ivxlcIVXLC]{1,5}\s*\)     # (i) (ii) (iii)
      | \([a-z]\)                       # (a) (b) (c)
      | [A-Z][A-Z0-9 &'\-/.]{4,}\s*$    # ALL-CAPS heading / CLASS XI / PAPER II
      | (CLASS|CLASSES)\s+(XI|XII)
      | (PAPER|SECTION|NOTE|Aims|TOTAL)\b
      | S\.\s*N[oO]\.
      | [-•●]\s                # bullets
    )""",
    re.VERBOSE,
)

SENTENCE_END_RE = re.compile(r"[.;:!?…]\s*$")

# Headings that form a complete line on their own. Nothing may be reflowed onto them,
# otherwise "CLASS XI" silently becomes "CLASS XI There will be two papers..." and
# every downstream class/section boundary check stops matching.
HEADING_LINE_RE = re.compile(
    r"""^\s*(
        (CLASS|CLASSES)\s+(XI|XII)(\s*(&|and)\s*XII)?\s*$
      | PAPER\s*[-–]?\s*(I|II|1|2)\b.*$
      | SECTION\s+[A-Z]\b.*$
      | [A-Z][A-Z0-9 &'\-/().]{6,}\s*$
    )""",
    re.VERBOSE | re.IGNORECASE,
)

CLASS_ANY_RE = re.compile(r"(?m)^\s*(CLASS|CLASSES)\s+(XI\s*(&|and)\s*XII|XII|XI)\b", re.IGNORECASE)
CLASS_XI_RE = re.compile(r"(?m)^\s*CLASS\s+XI\b(?!\s*(&|and))", re.IGNORECASE)
CLASS_XII_RE = re.compile(r"(?m)^\s*CLASS\s+XII\b", re.IGNORECASE)
CLASS_COMBINED_RE = re.compile(r"(?m)^\s*CLASS(ES)?\s+XI\s*(&|and)\s*XII", re.IGNORECASE)
UNIT_HEADING_RE = re.compile(r"(?m)^\s{0,6}(\d{1,2})\.\s{1,4}([A-Z][^\n]{3,90})$")
WEIGHTAGE_TABLE_RE = re.compile(r"S\.\s*N[oO]\.?\s+UNIT\s+TOTAL", re.IGNORECASE)
PRACTICAL_RE = re.compile(r"PAPER\s*(II|2)\b|PRACTICAL\s+WORK", re.IGNORECASE)

SPLIT_CAP_RE = re.compile(r"(?m)(?<=[a-zA-Z ])\b[A-Z]\s*\n[a-z]")
LONE_CAP_RE = re.compile(r"(?m)^[A-Z]{1,2}\s*$")
SPACED_WORD_RE = re.compile(r"\b[A-Z] [a-z]{2,}")


def normalise(raw: str) -> str:
    """Reflow one-word-per-line justified output back into paragraphs."""
    out_pages = []
    for page_block in raw.split("\x0c"):
        lines = [ln.rstrip() for ln in page_block.splitlines()]
        lines = [ln for ln in lines if not RUNNING_HEADER_RE.match(ln)]

        reflowed: list[str] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if reflowed and reflowed[-1] != "":
                    reflowed.append("")
                continue

            starts_structure = bool(STRUCTURAL_START_RE.match(line))
            if not reflowed or reflowed[-1] == "" or starts_structure:
                reflowed.append(stripped)
                continue

            prev = reflowed[-1]
            # A standalone heading is closed: never reflow the next line onto it.
            if HEADING_LINE_RE.match(prev):
                reflowed.append(stripped)
                continue

            # Keep the break when the previous line closed a sentence and this one
            # starts a new capitalised one - that is a genuine paragraph boundary.
            if SENTENCE_END_RE.search(prev) and stripped[:1].isupper():
                reflowed.append(stripped)
                continue

            if prev.endswith("-") and stripped[:1].islower():
                reflowed[-1] = prev[:-1] + stripped  # de-hyphenate across the break
            else:
                reflowed[-1] = f"{prev} {stripped}"

        text = "\n".join(reflowed)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        out_pages.append(text.strip())

    return out_pages


def extract_pdf(pdf_path: Path) -> tuple[str, str, dict]:
    doc = pymupdf.open(str(pdf_path))
    raw_pages: list[str] = []
    empty_pages: list[int] = []

    for i, page in enumerate(doc, 1):
        # sort=False is deliberate - see module docstring.
        content = page.get_text()
        if len(content.strip()) < MIN_CHARS_PER_PAGE:
            empty_pages.append(i)
        raw_pages.append(content)

    page_count = len(doc)
    doc.close()

    raw_text = "\n".join(f"=== PAGE {i} ===\n{p}\n" for i, p in enumerate(raw_pages, 1))
    norm_pages = normalise("\x0c".join(raw_pages))
    norm_text = "\n\n".join(
        f"=== PAGE {i} ===\n{p}" for i, p in enumerate(norm_pages, 1) if p is not None
    )

    body = re.sub(r"=== PAGE \d+ ===", "", norm_text)
    headings = [(int(m.group(1)), m.group(2).strip()) for m in UNIT_HEADING_RE.finditer(body)]
    numbers = [n for n, _ in headings]

    best = run = 1 if numbers else 0
    for prev, cur in zip(numbers, numbers[1:]):
        run = run + 1 if cur == prev + 1 else 1
        best = max(best, run)

    stats = {
        "pages": page_count,
        "chars": len(body.strip()),
        "chars_per_page": round(len(body.strip()) / max(page_count, 1)),
        "empty_page_count": len(empty_pages),
        "empty_pages": empty_pages,
        "class_xi": bool(CLASS_XI_RE.search(body)),
        "class_xii": bool(CLASS_XII_RE.search(body)),
        "class_combined": bool(CLASS_COMBINED_RE.search(body)),
        "class_markers": len(CLASS_ANY_RE.findall(body)),
        "weightage_table": bool(WEIGHTAGE_TABLE_RE.search(body)),
        "practical_section": bool(PRACTICAL_RE.search(body)),
        "unit_headings": len(numbers),
        "longest_ascending_run": best,
        "sample_headings": [f"{n}. {t}" for n, t in headings[:10]],
        "artifacts": {
            "split_cap": len(SPLIT_CAP_RE.findall(body)),
            "lone_cap": len(LONE_CAP_RE.findall(body)),
            "spaced_word": len(SPACED_WORD_RE.findall(body)),
        },
    }
    return raw_text, norm_text, stats


def template_of(stats: dict) -> str:
    if stats["class_combined"]:
        return "COMBINED-XI-XII"
    if stats["class_xi"] and stats["class_xii"]:
        return "SPLIT-XI-XII"
    if stats["class_xii"]:
        return "XII-ONLY"
    if stats["class_xi"]:
        return "XI-ONLY"
    return "NO-CLASS-MARKER"


def classify(stats: dict, is_subject: bool) -> str:
    if not is_subject:
        return "reference-doc"
    if stats["chars"] < 500 or stats["empty_page_count"] > stats["pages"] * 0.5:
        return "needs-ocr"
    if stats["unit_headings"] and stats["longest_ascending_run"] < 3:
        return "needs-review-reading-order"
    if stats["class_markers"] == 0:
        return "needs-review-no-class-markers"
    return "ok"


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract + normalise ISC syllabus text")
    parser.add_argument("--only", help="substring filter on subject name")
    parser.add_argument("--raw", action="store_true", help="also write un-normalised text")
    args = parser.parse_args()

    if not MANIFEST.exists():
        print(f"[ERROR] manifest missing, run isc_fetch_pdfs.py first: {MANIFEST}")
        return 1

    entries = [
        e for e in json.loads(MANIFEST.read_text(encoding="utf-8"))
        if e.get("status") in ("downloaded", "cached")
    ]
    if args.only:
        needle = args.only.lower()
        entries = [e for e in entries if needle in e["subject"].lower()]

    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    if args.raw:
        RAW_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] extracting {len(entries)} PDFs (pymupdf, sort=False) -> {TEXT_DIR}\n")
    report = []

    for i, entry in enumerate(entries, 1):
        pdf_path = PDF_DIR / entry["filename"]
        if not pdf_path.exists():
            print(f"  [{i:2}/{len(entries)}] MISSING {entry['subject']}")
            continue
        try:
            raw_text, norm_text, stats = extract_pdf(pdf_path)
        except Exception as exc:  # noqa: BLE001
            print(f"  [{i:2}/{len(entries)}] ERROR   {entry['subject']}: {type(exc).__name__}: {exc}")
            report.append({**entry, "verdict": "extract-failed", "error": str(exc)})
            continue

        (TEXT_DIR / f"{entry['slug']}.txt").write_text(norm_text, encoding="utf-8")
        if args.raw:
            (RAW_DIR / f"{entry['slug']}.raw.txt").write_text(raw_text, encoding="utf-8")

        verdict = classify(stats, entry.get("is_subject", True))
        template = template_of(stats) if entry.get("is_subject", True) else "-"
        report.append(
            {**entry, "text_file": f"{entry['slug']}.txt", "template": template,
             **stats, "verdict": verdict}
        )
        art = stats["artifacts"]
        print(
            f"  [{i:2}/{len(entries)}] {verdict:<28} {entry['subject']:<38} "
            f"{template:<16} {stats['pages']:>3}p units={stats['unit_headings']:>3} "
            f"run={stats['longest_ascending_run']:>2} artifacts={art['split_cap'] + art['lone_cap']:>3}"
        )

    QA_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    counts: dict[str, int] = {}
    templates: dict[str, int] = {}
    total_artifacts = 0
    for r in report:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
        if r.get("template") and r["template"] != "-":
            templates[r["template"]] = templates.get(r["template"], 0) + 1
        if r.get("artifacts"):
            total_artifacts += r["artifacts"]["split_cap"] + r["artifacts"]["lone_cap"]

    print(f"\n[DONE] QA report -> {QA_REPORT}")
    print("       verdicts:")
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"         {k:<32} {v}")
    print("       templates:")
    for k, v in sorted(templates.items(), key=lambda kv: -kv[1]):
        print(f"         {k:<32} {v}")
    print(f"       total char-split artifacts: {total_artifacts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
