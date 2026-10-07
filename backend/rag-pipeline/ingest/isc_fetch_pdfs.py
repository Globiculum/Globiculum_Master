"""Download CISCE ISC syllabus PDFs listed in backend/data/isc/ISC all sub URLs.txt.

CISCE republishes syllabuses yearly under a new /uploads/<year>/<month>/ path, so the
URL list is data, not code: re-export it from the CISCE site and re-run this script.

Usage (from backend/rag-pipeline/):
    python ingest/isc_fetch_pdfs.py                 # download anything missing
    python ingest/isc_fetch_pdfs.py --force         # re-download everything
    python ingest/isc_fetch_pdfs.py --only physics  # substring filter on subject name
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[3]
ISC_DIR = REPO_ROOT / "backend" / "data" / "isc"
URL_LIST = ISC_DIR / "ISC all sub URLs.txt"
PDF_DIR = ISC_DIR / "pdfs"
MANIFEST = ISC_DIR / "manifest.json"

# Entries that are not subject syllabuses. Downloaded anyway (regulations carry the
# scheme-of-studies tables and the prescribed-textbook list), but never ingested as
# curriculum nodes.
NON_SUBJECT_PATTERNS = (
    "cover page",
    "regulations",
    "syllabus contents",
    "appendix",
)

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
REQUEST_DELAY = 1.0
MAX_RETRIES = 3


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "unnamed"


def parse_url_list(path: Path) -> list[dict]:
    """Parse the '<n>. <Subject>' / '<url>' pairs out of the exported URL list."""
    if not path.exists():
        raise SystemExit(f"[ERROR] URL list not found: {path}")

    lines = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines()]
    entries: list[dict] = []
    pending_name: str | None = None

    for line in lines:
        if not line:
            continue
        numbered = re.match(r"^(\d+)\.\s+(.*\S)\s*$", line)
        if numbered and not line.lower().startswith("http"):
            pending_name = numbered.group(2)
            continue
        if line.lower().startswith("http"):
            if pending_name is None:
                print(f"[WARN] URL with no preceding subject name, skipped: {line}")
                continue
            lowered = pending_name.lower()
            entries.append(
                {
                    "subject": pending_name,
                    "slug": slugify(pending_name),
                    "url": line,
                    "is_subject": not any(p in lowered for p in NON_SUBJECT_PATTERNS),
                }
            )
            pending_name = None

    return entries


def download(entry: dict, force: bool) -> dict:
    target = PDF_DIR / f"{entry['slug']}.pdf"
    result = dict(entry, filename=target.name)

    if target.exists() and not force:
        data = target.read_bytes()
        result.update(
            status="cached",
            bytes=len(data),
            sha256=hashlib.sha256(data).hexdigest(),
        )
        return result

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(
                entry["url"], headers={"User-Agent": BROWSER_UA}, timeout=90
            )
            if resp.status_code != 200:
                last_error = f"HTTP {resp.status_code}"
            elif not resp.content.startswith(b"%PDF-"):
                # CISCE sits behind Cloudflare; a challenge page returns 200 + HTML.
                last_error = f"not a PDF (content-type={resp.headers.get('content-type')})"
            else:
                target.write_bytes(resp.content)
                result.update(
                    status="downloaded",
                    bytes=len(resp.content),
                    sha256=hashlib.sha256(resp.content).hexdigest(),
                )
                return result
        except Exception as exc:  # noqa: BLE001 - report and retry any transport error
            last_error = f"{type(exc).__name__}: {exc}"

        if attempt < MAX_RETRIES:
            time.sleep(2 * attempt)

    result.update(status="failed", error=last_error)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Download ISC syllabus PDFs")
    parser.add_argument("--force", action="store_true", help="re-download cached files")
    parser.add_argument("--only", help="substring filter on subject name")
    args = parser.parse_args()

    entries = parse_url_list(URL_LIST)
    if args.only:
        needle = args.only.lower()
        entries = [e for e in entries if needle in e["subject"].lower()]

    if not entries:
        print("[ERROR] no entries matched")
        return 1

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] {len(entries)} entries -> {PDF_DIR}")

    results = []
    for i, entry in enumerate(entries, 1):
        res = download(entry, args.force)
        results.append(res)
        size = res.get("bytes")
        detail = f"{size / 1024:.0f} KB" if size else res.get("error", "")
        print(f"  [{i:2}/{len(entries)}] {res['status']:<10} {entry['subject']:<40} {detail}")
        if res["status"] == "downloaded":
            time.sleep(REQUEST_DELAY)

    MANIFEST.write_text(json.dumps(results, indent=2), encoding="utf-8")

    failed = [r for r in results if r["status"] == "failed"]
    print(f"\n[DONE] manifest -> {MANIFEST}")
    print(f"       ok={len(results) - len(failed)} failed={len(failed)}")
    for r in failed:
        print(f"       FAILED {r['subject']}: {r.get('error')}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
