"""Build the learning-resources catalogue shown in reports: textbooks, video
lessons and practice material per board, class and subject.

Every candidate link is opened in a real browser (Chrome via Playwright; Khan
Academy and BYJU'S render with JavaScript and block plain HTTP clients) and
kept only if the page actually shows the expected class and subject. Sites
often answer 200 with a "PAGE NOT FOUND" page, so the status code alone is not
trusted. NCERT book links are read from NCERT's own book selector, so they are
spot-checked rather than all opened.

Sources:
  NCERT textbooks     ncert.nic.in/textbook.php selector (official, free PDFs)
  Khan Academy        NCERT-aligned courses listed on khanacademy.org/math/in-math-ncert
                      and /science/in-science-ncert
  Vedantu, BYJU'S     NCERT solutions; BYJU'S ISC papers
  CBSE                cbseacademic.nic.in sample question papers
  CISCE               ISC 2026 specimen papers with answer keys (cisce.org)
  YouTube             Magnet Brains, Physics Wallah, Khan Academy India

Usage (from backend/rag-pipeline/):
    python ingest/learning_resources.py --verify      # build + verify -> JSON
    python ingest/learning_resources.py --load        # replace DB rows from JSON
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

REPO_ROOT = Path(__file__).resolve().parents[3]
OUT = REPO_ROOT / "backend" / "data" / "resources" / "learning_resources.json"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")

# Subject keys used by the report (frontend/src/hooks/useLearningResources.ts).
SUBJECTS_BY_CLASS: dict[int, list[str]] = {
    1: ["mathematics", "english", "hindi"],
    2: ["mathematics", "english", "hindi"],
    3: ["mathematics", "english", "hindi", "evs"],
    4: ["mathematics", "english", "hindi", "evs"],
    5: ["mathematics", "english", "hindi", "evs"],
    **{c: ["mathematics", "science", "english", "social-science", "hindi", "sanskrit"] for c in (6, 7, 8, 9, 10)},
    11: ["physics", "chemistry", "biology", "mathematics", "english", "accountancy", "business-studies",
         "economics", "history", "geography", "political-science", "computer-science", "hindi"],
    12: ["physics", "chemistry", "biology", "mathematics", "english", "accountancy", "business-studies",
         "economics", "history", "geography", "political-science", "computer-science", "hindi"],
}
LABEL = {
    "mathematics": "Maths", "science": "Science", "english": "English", "social-science": "Social Science",
    "hindi": "Hindi", "sanskrit": "Sanskrit", "evs": "EVS", "physics": "Physics", "chemistry": "Chemistry",
    "biology": "Biology", "accountancy": "Accountancy", "business-studies": "Business Studies",
    "economics": "Economics", "history": "History", "geography": "Geography",
    "political-science": "Political Science", "computer-science": "Computer Science",
}
# Words a page about the subject must contain (any one).
EXPECT = {
    "mathematics": ["math"], "science": ["science"], "english": ["english"], "social-science": ["social"],
    "hindi": ["hindi"], "sanskrit": ["sanskrit"], "evs": ["evs", "environmental", "world around"],
    "physics": ["physics"], "chemistry": ["chemistry"], "biology": ["biology"],
    "accountancy": ["accountancy", "accounts"], "business-studies": ["business"],
    "economics": ["economics"], "history": ["history"], "geography": ["geography"],
    "political-science": ["political"], "computer-science": ["computer"],
}
# NCERT books and Khan Academy's NCERT courses are CBSE material: ISC students
# get ISC syllabuses, ISC textbook solutions and ISC papers instead (see ISC_*).

# NCERT selector subject name -> key (None: not shown in reports).
NCERT_SUBJECT = {
    "English": "english", "Mathematics": "mathematics", "Science": "science",
    "Social Science": "social-science", "Environmental Studies": "evs", "The World Around Us": "evs",
    "Hindi": "hindi", "Sanskrit": "sanskrit", "Physics": "physics", "Chemistry": "chemistry",
    "Biology": "biology", "Accountancy": "accountancy", "Business Studies": "business-studies",
    "Economics": "economics", "History": "history", "Geography": "geography",
    "Political Science": "political-science", "Computer Science": "computer-science",
}
# Class 10 Social Science books are separate subjects in the report.
NCERT_BOOK_SUBJECT = {"jess1": "geography", "jess2": "economics", "jess3": "history", "jess4": "political-science"}

KHAN = "https://www.khanacademy.org"
KHAN_MATH = {1: "/math/class-1-ncf", 2: "/math/in-in-class-2nd-math-cbse", 3: "/math/in-in-class-3rd-math-cbse",
             4: "/math/in-in-class-4th-math-cbse", 5: "/math/in-in-class-5th-math-cbse", 6: "/math/class-6-ncf",
             7: "/math/class-7-ncf", 8: "/math/class-8-ncf", 9: "/math/ncert-math-class-9-new",
             10: "/math/ncert-class-10", 11: "/math/ncert-class-11", 12: "/math/ncert-class-12"}
KHAN_SCIENCE = {6: "/science/ncert-class-6-science", 7: "/science/ncert-class-7-science",
                8: "/science/ncert-class-8-science", 9: "/science/ncert-class-9-science",
                10: "/science/ncert-class-10-science"}
KHAN_11_12 = {(11, "physics"): "/science/in-in-class11th-physics", (11, "chemistry"): "/science/class-11-chemistry-india",
              (11, "biology"): "/science/in-in-class-11-biology-india", (12, "physics"): "/science/in-in-class-12th-physics-india",
              (12, "chemistry"): "/science/class-12-chemistry-india", (12, "biology"): "/science/in-in-class-12-biology-india"}
KHAN_PYQ = {10: "/math/ncert-math-class-10-pyq-2026", 12: "/math/ncert-math-class-12-pyq-2026"}

VEDANTU_SLUG = {"mathematics": "maths", "social-science": "social-science", "business-studies": "business-studies",
                "political-science": "political-science", "computer-science": "computer-science"}

CISCE = "https://cisce.org/wp-content/uploads/2025"
ISC_SPECIMEN = {
    "mathematics": f"{CISCE}/08/860-MATHEMATICS-SQP-AK.pdf",
    "physics": f"{CISCE}/08/861A-PHYSICS-PAPER-1-SQP-AK.pdf",
    "chemistry": f"{CISCE}/08/862A-CHEMISTRY-PAPER-1-SQP-AK.pdf",
    "biology": f"{CISCE}/07/863A-BIOLOGY-PAPER-1-SQP-AK.pdf",
    "accountancy": f"{CISCE}/07/858-ACCOUNTS-SQP-AK.pdf",
    "business-studies": f"{CISCE}/07/859-BUSINESS-STUDIES-SQP-AK.pdf",
    "geography": f"{CISCE}/08/853-GEOGRAPHY-SQP-AK.pdf",
}
BYJUS_ISC_SLUG = {"mathematics": "maths"}

# Official ISC 2027 syllabus per subject (CISCE regulations and syllabuses);
# CISCE publishes no textbooks of its own.
ISC_SYLLABUS = {
    "english": "2025/04/2.-ISC-English.pdf",
    "history": "2025/04/8.-ISC-History-2.pdf",
    "political-science": "2025/04/9.-ISC-Political-Science-1.pdf",
    "geography": "2025/04/10.-ISC-Geography-1.pdf",
    "economics": "2025/04/13.-ISC-Economics-1.pdf",
    "accountancy": "2025/04/15.-ISC-Accountancy.docx.pdf",
    "business-studies": "2025/04/16.-ISC-Business-Studies-1.pdf",
    "mathematics": "2025/04/17.-ISC-Mathematics.pdf",
    "physics": "2026/02/ISC-2027-Physics.pdf",
    "chemistry": "2025/04/19.-ISC-Chemistry-1.pdf",
    "biology": "2025/04/20.-ISC-Biology.pdf",
    "computer-science": "2025/04/25.-ISC-Computer-Science.doc.pdf",
}
ISC_PRESCRIBED_BOOKS = "https://cisce.org/wp-content/uploads/2026/04/40.-ISC-Appendix-I-List-of-Prescribed-Textbooks.pdf"

# Free solutions to the textbooks ISC schools use (ICSEHELP, KnowledgeBoat),
# links taken from each site's ISC Class 11 / 12 index pages.
# (subject, grade_min, grade_max, provider, title, url)
ISC_SOLUTIONS = [
    ("physics", 11, 11, "ICSEHELP", "Nootan ISC Physics Class 11 solutions", "https://icsehelp.com/isc-nootan-solutions-class-11-physics-nageen-prakashan/"),
    ("physics", 12, 12, "ICSEHELP", "Nootan ISC Physics Class 12 solutions", "https://icsehelp.com/isc-nootan-solutions-class-12-physics-nageen-prakashan/"),
    ("chemistry", 11, 11, "ICSEHELP", "Nootan ISC Chemistry Class 11 solutions", "https://icsehelp.com/isc-class-11-nootan-chemistry-solutions-nageen-prakashan/"),
    ("mathematics", 11, 11, "ICSEHELP", "ML Aggarwal ISC Maths Class 11 Vol 1 solutions", "https://icsehelp.com/isc-class-11-maths-vol-1/"),
    ("mathematics", 11, 11, "ICSEHELP", "ML Aggarwal ISC Maths Class 11 Vol 2 solutions", "https://icsehelp.com/ml-aggarwal-solutions-class-11-vol-2-isc-maths-latest-edition/"),
    ("mathematics", 11, 11, "ICSEHELP", "OP Malhotra (S. Chand) ISC Maths Class 11 solutions", "https://icsehelp.com/op-malhotra-schand-class-11-publication-isc-maths-solutions/"),
    ("mathematics", 12, 12, "ICSEHELP", "ML Aggarwal ISC Maths Class 12 Vol 1 solutions", "https://icsehelp.com/ml-aggarwal-solutions-class-12-vol-1-isc-maths/"),
    ("mathematics", 12, 12, "ICSEHELP", "ML Aggarwal ISC Maths Class 12 Vol 2 solutions", "https://icsehelp.com/ml-aggarwal-solutions-class-12-vol-2-isc-maths/"),
    ("mathematics", 12, 12, "ICSEHELP", "OP Malhotra (S. Chand) ISC Maths Class 12 solutions", "https://icsehelp.com/op-malhotra-class-12-s-chand-isc-maths-solutions/"),
    ("mathematics", 11, 11, "KnowledgeBoat", "ML Aggarwal Understanding ISC Mathematics Class 11 solutions", "https://www.knowledgeboat.com/learn/class-11-isc-ml-aggarwal-maths/content"),
    ("english", 11, 12, "ICSEHELP", "Prism: ISC short stories workbook solutions", "https://icsehelp.com/prism-workbook-solutions/"),
    ("english", 11, 12, "ICSEHELP", "Rhapsody: ISC poems workbook solutions", "https://icsehelp.com/rhapsody-workbook-solutions-isc-english-evergreen-publications/"),
    ("english", 11, 12, "ICSEHELP", "Macbeth: ISC drama workbook solutions", "https://icsehelp.com/macbeth-workbook-solutions-act-wise-scene-wise-for-isc-class-11-12/"),
    ("english", 12, 12, "ICSEHELP", "Total English ISC Class 12 (Morning Star) solutions", "https://icsehelp.com/total-english-isc-class-12-morning-star-solutions/"),
    ("computer-science", 12, 12, "KnowledgeBoat", "Solved ISC Computer Science practical papers", "https://www.knowledgeboat.com/learn/class-12-isc-question-papers-computer-science-solved/content"),
    ("*", 12, 12, "KnowledgeBoat", "Solved ISC Class 12 board papers", "https://www.knowledgeboat.com/solutions/icse/board-paper-class-12"),
    ("*", 12, 12, "ICSEHELP", "Solved ISC Class 12 previous-year papers (last 10 years)", "https://icsehelp.com/isc-previous-question-papers-solved-class-12-last-10-years/"),
    ("*", 12, 12, "ICSEHELP", "ISC 2026 specimen papers (all subjects)", "https://icsehelp.com/isc-specimen-paper-2026-cisce-released-model-sample-paper/"),
]
# ISC-focused YouTube channels; kept only if the channel page verifies.
ISC_YOUTUBE = [
    ("*", "Vedantu ICSE: ICSE/ISC lessons", "https://www.youtube.com/@VedantuICSE", "vedantu"),
    ("computer-science", "Amplify Learning: ISC Computer Science (Java)", "https://www.youtube.com/@AmplifyLearning", "amplify"),
    ("*", "Sir Tarun Rupani: ICSE/ISC lessons", "https://www.youtube.com/@SirTarunRupani", "tarun"),
]

YOUTUBE = [
    # (board, grade_min, grade_max, subjects, title, url, expected title word)
    ("cbse", 1, 12, ["*"], "Magnet Brains: full CBSE courses, Classes 1-12", "https://www.youtube.com/@MagnetBrainsEducation", "magnet brains"),
    ("any", 9, 12, ["physics", "chemistry", "biology", "mathematics"], "Physics Wallah: Physics, Chemistry, Biology and Maths",
     "https://www.youtube.com/@PhysicsWallah", "physics wallah"),
    ("any", 1, 12, ["*"], "Khan Academy India (English)", "https://www.youtube.com/@KhanAcademyIndiaEnglish", "khan academy"),
]


def row(board, subject, gmin, gmax, rtype, provider, title, url, expect, check="title"):
    return {"board": board, "subject": subject, "grade_min": gmin, "grade_max": gmax,
            "resource_type": rtype, "provider": provider, "title": title, "url": url,
            "_expect": expect, "_check": check}


def ncert_books() -> list[dict]:
    # ncert.nic.in resets connections intermittently.
    for attempt in range(5):
        try:
            html = requests.get("https://ncert.nic.in/textbook.php", headers={"User-Agent": UA}, timeout=90).text
            break
        except requests.RequestException:
            if attempt == 4:
                raise
            time.sleep(5 * (attempt + 1))
    blocks = re.findall(
        r'if\s*\(\(document\.test\.tclass\.value==(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text=="([^"]+)"\)\)\s*\{(.*?)\}',
        html, re.S)
    out = []
    for cls, subject, body in blocks:
        cls = int(cls)
        key = NCERT_SUBJECT.get(subject)
        if key is None or cls > 12 or key not in SUBJECTS_BY_CLASS.get(cls, []) and key != "social-science":
            continue
        opts: dict[str, dict] = {}
        for idx, kind, val in re.findall(r'^\s*document\.test\.tbook\.options\[(\d+)\]\.(text|value)="([^"]*)"', body, re.M):
            opts.setdefault(idx, {})[kind] = val
        for o in opts.values():
            m = re.match(r"textbook\.php\?(([a-z])([a-z])[a-z]{2}\d)=0-\d+", o.get("value", ""))
            if not m or (m.group(3) != "e" and key not in ("hindi", "sanskrit")):
                continue
            code = m.group(1)
            subj = NCERT_BOOK_SUBJECT.get(code, key)
            out.append(row("cbse", subj, cls, cls, "textbook", "NCERT",
                           f"NCERT Class {cls} {o.get('text', '').strip()} (free PDF)",
                           # A real book page lists its chapters with this link. The
                           # selector's title text differs from the page's
                           # ("Ganita Prakash-II" vs "Ganita Prakash II"), so it can't be used.
                           "https://ncert.nic.in/" + o["value"], ["download complete book"], "body"))
    return out


def candidates() -> list[dict]:
    rows = ncert_books()
    for c, path in KHAN_MATH.items():
        rows.append(row("cbse", "mathematics", c, c, "video", "Khan Academy",
                        f"Khan Academy: NCERT Maths Class {c}", KHAN + path, [f"class {c}"]))
    for c, path in KHAN_SCIENCE.items():
        rows.append(row("cbse", "science", c, c, "video", "Khan Academy",
                        f"Khan Academy: NCERT Science Class {c}", KHAN + path, [f"class {c}"]))
    for (c, s), path in KHAN_11_12.items():
        rows.append(row("cbse", s, c, c, "video", "Khan Academy",
                        f"Khan Academy: NCERT {LABEL[s]} Class {c}", KHAN + path, [f"class {c}"]))
    for c, path in KHAN_PYQ.items():
        rows.append(row("cbse", "mathematics", c, c, "practice", "Khan Academy",
                        f"Khan Academy: Class {c} Maths board revision with past papers", KHAN + path, [f"class {c}"]))
    for c, subjects in SUBJECTS_BY_CLASS.items():
        for s in subjects:
            slug = VEDANTU_SLUG.get(s, s)
            rows.append(row("cbse", s, c, c, "practice", "Vedantu", f"Vedantu: NCERT Solutions Class {c} {LABEL[s]}",
                            f"https://www.vedantu.com/ncert-solutions/ncert-solutions-class-{c}-{slug}",
                            [f"class {c}"] + EXPECT[s]))
            rows.append(row("cbse", s, c, c, "practice", "BYJU'S", f"BYJU'S: NCERT Solutions Class {c} {LABEL[s]}",
                            f"https://byjus.com/ncert-solutions-class-{c}-{slug}/", [f"class {c}"] + EXPECT[s], "body"))
    for c, label in ((10, "X"), (12, "XII")):
        rows.append(row("cbse", "*", c, c, "practice", "CBSE", f"CBSE official sample papers, Class {c} (2026-27)",
                        f"https://cbseacademic.nic.in/SQP_CLASS{label}_2026-27.html", [f"class {label.lower()}"], "body"))
    for s, url in ISC_SPECIMEN.items():
        rows.append(row("isc", s, 12, 12, "practice", "CISCE", f"ISC 2026 specimen paper with answer key: {LABEL[s]}",
                        url, [], "pdf"))
    for s in ("physics", "chemistry", "mathematics", "biology"):
        slug = BYJUS_ISC_SLUG.get(s, s)
        rows.append(row("isc", s, 12, 12, "practice", "BYJU'S", f"BYJU'S: ISC Class 12 {LABEL[s]} previous-year papers",
                        f"https://byjus.com/isc-class-12-{slug}-previous-year-question-papers/", ["isc"] + EXPECT[s], "body"))
        for c in (11, 12):
            rows.append(row("isc", s, c, c, "practice", "BYJU'S", f"BYJU'S: ISC Class {c} {LABEL[s]} sample papers",
                            f"https://byjus.com/isc-class-{c}-{slug}-sample-papers/", ["isc"] + EXPECT[s], "body"))
    for c in (11, 12):
        rows.append(row("isc", "*", c, c, "textbook", "BYJU'S", f"BYJU'S: ISC Class {c} recommended books",
                        f"https://byjus.com/isc-class-{c}-books/", ["isc", "book"], "body"))
    for s, path in ISC_SYLLABUS.items():
        rows.append(row("isc", s, 11, 12, "textbook", "CISCE", f"Official ISC 2027 {LABEL[s]} syllabus (CISCE)",
                        f"https://cisce.org/wp-content/uploads/{path}", [], "pdf"))
    rows.append(row("isc", "*", 11, 12, "textbook", "CISCE", "CISCE list of prescribed ISC textbooks",
                    ISC_PRESCRIBED_BOOKS, [], "pdf"))
    for s, gmin, gmax, provider, title, url in ISC_SOLUTIONS:
        words = ["isc"] + (EXPECT[s] if s != "*" else [])
        rows.append(row("isc", s, gmin, gmax, "practice", provider, f"{provider}: {title}", url, words, "body"))
    for s, title, url, word in ISC_YOUTUBE:
        rows.append(row("isc", s, 11, 12, "video", "YouTube", title, url, [word]))
    for board, gmin, gmax, subjects, title, url, word in YOUTUBE:
        for s in subjects:
            rows.append(row(board, s, gmin, gmax, "video", "YouTube", title, url, [word]))
    return rows


def verify(rows: list[dict], ncert_sample: int) -> list[dict]:
    from playwright.sync_api import sync_playwright

    ncert = [r for r in rows if r["provider"] == "NCERT"]
    sampled = {id(r) for r in random.sample(ncert, min(ncert_sample, len(ncert)))}
    cache: dict[str, tuple[str, str]] = {}
    kept = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(user_agent=UA, locale="en-IN").new_page()
        for r in rows:
            if r["provider"] == "NCERT" and id(r) not in sampled:
                kept.append(r)
                continue
            if r["_check"] == "pdf":
                try:
                    h = requests.head(r["url"], headers={"User-Agent": UA}, timeout=40, allow_redirects=True)
                    ok = h.status_code == 200 and "pdf" in h.headers.get("content-type", "")
                except Exception:  # noqa: BLE001
                    ok = False
                print(f"{'OK ' if ok else 'BAD'} {r['url']}")
                if ok:
                    kept.append(r)
                continue
            if r["url"] not in cache:
                try:
                    resp = page.goto(r["url"], wait_until="domcontentloaded", timeout=45000)
                    page.wait_for_timeout(2500)
                    status = resp.status if resp else 0
                    title = (page.title() or "").lower()
                    body = " ".join(page.inner_text("body").split())[:3000].lower()
                    if status >= 400:
                        title, body = "", ""
                except Exception:  # noqa: BLE001
                    title, body = "", ""
                cache[r["url"]] = (title, body)
            title, body = cache[r["url"]]
            text = title if r["_check"] == "title" else f"{title} {body}"
            not_found = re.search(r"page not found|404|not found", title) is not None
            ok = bool(text) and not not_found and matches(text, r["_expect"])
            print(f"{'OK ' if ok else 'BAD'} {r['url']}  [{title[:60]}]")
            if ok:
                kept.append(r)
        browser.close()
    return kept


def matches(text: str, words: list[str]) -> bool:
    """The first word (class, board or book title) must appear; of the rest
    (subject words) any one is enough. "class 1" must not match "class 11"."""
    def has(w: str) -> bool:
        return re.search(re.escape(w) + (r"(?!\d)" if w[-1:].isdigit() else ""), text) is not None
    if not words:
        return True
    return has(words[0]) and (len(words) == 1 or any(has(w) for w in words[1:]))


def load(rows: list[dict]) -> None:
    from db.supabase_client import get_client

    client = get_client()
    client.table("learning_resources").delete().neq("url", "").execute()
    clean = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    for i in range(0, len(clean), 200):
        client.table("learning_resources").insert(clean[i:i + 200]).execute()
    print(f"loaded {len(clean)} rows")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true", help="build candidates, verify, write JSON")
    parser.add_argument("--ncert-sample", type=int, default=15)
    parser.add_argument("--load", action="store_true", help="replace DB rows from the JSON")
    parser.add_argument("--refresh-isc", action="store_true",
                        help="re-verify only ISC rows and merge them into the existing JSON")
    args = parser.parse_args()
    if args.refresh_isc:
        kept = [r for r in json.loads(OUT.read_text(encoding="utf-8")) if r["board"] != "isc"]
        # Earlier runs tagged NCERT books and Khan Academy NCERT courses 'any'.
        for r in kept:
            if r["provider"] in ("NCERT", "Khan Academy") and r["board"] == "any":
                r["board"] = "cbse"
        isc = [r for r in candidates() if r["board"] == "isc"]
        print(f"{len(isc)} ISC candidates")
        kept += verify(isc, 0)
        OUT.write_text(json.dumps(kept, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"{len(kept)} rows -> {OUT}")
    if args.verify:
        rows = candidates()
        print(f"{len(rows)} candidates")
        kept = verify(rows, args.ncert_sample)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(kept, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"{len(kept)} kept -> {OUT}")
    if args.load:
        load(json.loads(OUT.read_text(encoding="utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
