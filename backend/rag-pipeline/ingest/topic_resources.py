"""Build the study links for each gap topic in reports (table topic_resources).

A subject card lists the topics a student is missing: NCERT chapters (CBSE) or
CISCE syllabus units (ICSE IX-X, ISC XI-XII). Each used to link only to its
source document: NCERT's chapter viewer page, which shows the PDF inside a
frame that phones and some browsers leave blank (and for most Class 11-12
chapters pointed at the book's front pages, "=ps-N"), or the whole CISCE
syllabus PDF. This script gives every topic links that open on any device and
belong to its board:

  textbook  NCERT chapter PDF, direct (ncert.nic.in/textbook/pdf/<book><nn>.pdf)    CBSE
  video     Khan Academy unit of the NCERT-aligned course for that class          CBSE, ICSE, ISC
  practice  KnowledgeBoat's free chapter-wise solutions: NCERT books (6-10, CS
            11-12), and for ICSE the books schools use (Selina Concise, Total
            History & Civics, Total Geography, Sumita Arora)                   CBSE, ICSE

Khan Academy and KnowledgeBoat links are read from their live course and book
pages and matched to topics by title; NCERT links are built from the node's
book code and chapter number and each one is checked to be a PDF. Books whose
data can't be trusted for that (wrong book, pre-2023 chapter numbers, skipped
file numbers) were checked on ncert.nic.in and are listed in NCERT_BOOKS; their
topics are matched by title instead. The report also offers a YouTube search
per topic, built on the page, so it needs no row.

Language skills (English, Hindi, Sanskrit gaps are skills, not chapters) get
rows pointing at the chapters that practise them, from skill_chapters.py, with
the book in the provider ("NCERT Poorvi"); --build adds them too.

Usage (from backend/rag-pipeline/):
    python ingest/topic_resources.py --build    # harvest, match, verify -> JSON; prints every match
    python ingest/topic_resources.py --skills   # only refresh the language skills' rows in the JSON
    python ingest/topic_resources.py --load     # replace all topic_resources rows from the JSON
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from learning_resources import KB_BOOKS, KHAN, KHAN_11_12, KHAN_MATH, KHAN_SCIENCE, KNOWLEDGEBOAT  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
OUT = REPO_ROOT / "backend" / "data" / "resources" / "topic_resources.json"

SYSTEM_BOARD = {"ncert-cbse": "cbse", "icse-cisce": "icse", "isc-cisce": "isc"}

# ── NCERT ────────────────────────────────────────────────────────────────────
# Chapter links read "textbook.php?<book><part>=<chapter>-<chapters in part>";
# "=ps-N" opens the front pages and "=0-N" the whole book.
NCERT_LINK = re.compile(r"textbook\.php\?([a-z]{4})(\d)=(\w+)-(\d+)$")
NCERT_PDF = "https://ncert.nic.in/textbook/pdf/{code}{part}{idx:02d}.pdf"

# NCERT books checked by hand on ncert.nic.in (Reprint 2026-27): each chapter
# file by number, with the texts it holds, read from the book's Contents page
# and the files themselves. Our curriculum data can't place these books' topics:
# links open the front pages or the whole book; they name the wrong book (the
# Constitution chapters carry keps1, which is Political Theory; Chemistry XII
# chapters 4-5 carry Part II); or they number chapters as before NCERT's 2023
# rationalisation, which deleted chapters and renumbered the rest (Geography
# XI, Business Studies XII Part II, Health and Physical Education XI, Politics
# in India). Three readers skip file numbers (Flamingo has no lefl109-110,
# Kaleidoscope's drama is lekl131-132), and the portal's own links to the
# skipped files are broken. A file can hold several texts: Hornbill's poems sit
# with a prose chapter, and Khel Yoga has one file per unit.
# Topics of these books are matched to a file by title; a topic that matches
# none (a chapter NCERT deleted, such as Bill of Exchange) gets no NCERT link.
NCERT_BOOKS: dict[str, tuple[str, dict[int, list[str]]]] = {
    "deky1": ("Khel Yoga", {
        1: ["Basic Motor Movements", "Throwing and Catching", "Kicking and Receiving", "Strike the Shuttlecock", "Little Steps"],
        2: ["Our Games", "Local and Traditional Games"],
        3: ["Yoga", "Yoga for Daily Life", "Yoga Sadhana"]}),
    "keac1": ("Accountancy: Financial Accounting Part I", {
        1: ["Introduction to Accounting"], 2: ["Theory Base of Accounting"], 3: ["Recording of Transactions - I"],
        4: ["Recording of Transactions - II"], 5: ["Bank Reconciliation Statement"],
        6: ["Trial Balance and Rectification of Errors"], 7: ["Depreciation, Provisions and Reserves"]}),
    "keac2": ("Accountancy: Financial Accounting Part II", {
        1: ["Financial Statements - I"], 2: ["Financial Statements - II"]}),
    "kecs1": ("Computer Science", {
        1: ["Computer System"], 2: ["Encoding Schemes and Number System"], 3: ["Emerging Trends"],
        4: ["Introduction to Problem Solving"], 5: ["Getting Started with Python"], 6: ["Flow of Control"],
        7: ["Functions"], 8: ["Strings"], 9: ["Lists"], 10: ["Tuples and Dictionaries"], 11: ["Societal Impact"]}),
    "kegy2": ("Fundamentals of Physical Geography", {
        1: ["Geography as a Discipline"], 2: ["The Origin and Evolution of the Earth"], 3: ["Interior of the Earth"],
        4: ["Distribution of Oceans and Continents"], 5: ["Geomorphic Processes"], 6: ["Landforms and their Evolution"],
        7: ["Composition and Structure of Atmosphere"], 8: ["Solar Radiation, Heat Balance and Temperature"],
        9: ["Atmospheric Circulation and Weather Systems"], 10: ["Water in the Atmosphere"],
        11: ["World Climate and Climate Change"], 12: ["Water (Oceans)"], 13: ["Movements of Ocean Water"],
        14: ["Biodiversity and Conservation", "Life on the Earth"]}),
    "kehb1": ("Hornbill", {
        1: ["The Portrait of a Lady", "A Photograph"], 2: ["We're Not Afraid to Die... if We Can All Be Together"],
        3: ["Discovering Tut: the Saga Continues", "The Laburnum Top", "The Voice of the Rain"],
        4: ["The Ailing Planet: the Green Movement's Role", "Childhood"], 5: ["The Adventure"],
        6: ["Silk Road", "Father to Son"], 11: ["Writing Skills", "Note-making"], 12: ["Summarising"],
        13: ["Sub-titling"], 14: ["Essay-writing"], 15: ["Letter-writing"], 16: ["Creative Writing"]}),
    "kehp1": ("Health and Physical Education", {
        1: ["Physical Education"], 2: ["Understanding Health"],
        3: ["Physical and Physiological Aspects of Physical Education and Sports"], 4: ["Individual Games"],
        5: ["Team Games"], 6: ["Yoga and its Relevance in the Modern Times"], 7: ["Safety and Security"],
        8: ["Health Related Physical Fitness"], 9: ["Measurement and Evaluation"],
        10: ["Tournaments and Competitions"], 11: ["Adventure Sports"]}),
    "keps1": ("Political Theory", {
        1: ["Political Theory: An Introduction"], 2: ["Freedom"], 3: ["Equality"], 4: ["Social Justice"],
        5: ["Rights"], 6: ["Citizenship"], 7: ["Nationalism"], 8: ["Secularism"]}),
    "keps2": ("Indian Constitution at Work", {
        1: ["Constitution: Why and How?"], 2: ["Rights in the Indian Constitution"],
        3: ["Election and Representation"], 4: ["Executive"], 5: ["Legislature"], 6: ["Judiciary"],
        7: ["Federalism"], 8: ["Local Governments"], 9: ["Constitution as a Living Document"],
        10: ["The Philosophy of the Constitution"]}),
    "kest1": ("Statistics for Economics", {
        1: ["Introduction"], 2: ["Collection of Data"], 3: ["Organisation of Data"], 4: ["Presentation of Data"],
        5: ["Measures of Central Tendency"], 6: ["Correlation"], 7: ["Index Numbers"], 8: ["Use of Statistical Tools"]}),
    "lebs2": ("Business Studies Part II", {
        1: ["Financial Management"], 2: ["Marketing"], 3: ["Consumer Protection"]}),
    "lech1": ("Chemistry Part I", {
        1: ["Solutions"], 2: ["Electrochemistry"], 3: ["Chemical Kinetics"], 4: ["The d- and f-Block Elements"],
        5: ["Coordination Compounds"]}),
    "lech2": ("Chemistry Part II", {
        1: ["Haloalkanes and Haloarenes"], 2: ["Alcohols, Phenols and Ethers"],
        3: ["Aldehydes, Ketones and Carboxylic Acids"], 4: ["Amines"], 5: ["Biomolecules"]}),
    "lecs1": ("Computer Science", {
        1: ["Exception Handling in Python"], 2: ["File Handling in Python"], 3: ["Stack"], 4: ["Queue"],
        5: ["Sorting"], 6: ["Searching"], 7: ["Understanding Data"], 8: ["Database Concepts"],
        9: ["Structured Query Language (SQL)"], 10: ["Computer Networks"], 11: ["Data Communication"],
        12: ["Security Aspects"], 13: ["Project Based Learning"]}),
    "lefl1": ("Flamingo", {
        1: ["The Last Lesson"], 2: ["Lost Spring"], 3: ["Deep Water"], 4: ["The Rattrap"], 5: ["Indigo"],
        6: ["Poets and Pancakes"], 7: ["The Interview"], 8: ["Going Places"], 11: ["My Mother at Sixty-six"],
        12: ["Keeping Quiet"], 13: ["A Thing of Beauty"], 14: ["A Roadside Stand"], 15: ["Aunt Jennifer's Tigers"]}),
    "legy2": ("India: People and Economy", {
        1: ["Population: Distribution, Density, Growth and Composition"], 2: ["Human Settlements"],
        3: ["Land Resources and Agriculture"], 4: ["Water Resources"], 5: ["Mineral and Energy Resources"],
        6: ["Planning and Sustainable Development in Indian Context"], 7: ["Transport and Communication"],
        8: ["International Trade"], 9: ["Geographical Perspective on Selected Issues and Problems"]}),
    "lehs3": ("Themes in Indian History Part III", {
        1: ["Colonialism and the Countryside: Exploring Official Archives"],
        2: ["Rebels and the Raj: The Revolt of 1857 and its Representations"],
        3: ["Mahatma Gandhi and the Nationalist Movement: Civil Disobedience and Beyond"],
        4: ["Framing the Constitution: The Beginning of a New Era"]}),
    "lekl1": ("Kaleidoscope", {
        1: ["I Sell My Dreams"], 2: ["Eveline"], 3: ["A Wedding in Brownsville"], 4: ["Tomorrow"],
        5: ["One Centimetre"], 11: ["A Lecture Upon the Shadow"], 12: ["Poems by Milton"], 13: ["Poems by Blake"],
        14: ["Kubla Khan"], 15: ["Trees"], 16: ["The Wild Swans at Coole"], 17: ["Time and Time Again"],
        18: ["Blood"], 21: ["Freedom"], 22: ["The Mark on the Wall"], 23: ["Film-making"],
        24: ["Why the Novel Matters"], 25: ["The Argumentative Indian"], 26: ["On Science Fiction"],
        31: ["Chandalika"], 32: ["Broken Images"]}),
    "leps2": ("Politics in India Since Independence", {
        1: ["Challenges of Nation Building"], 2: ["Era of One-Party Dominance"], 3: ["Politics of Planned Development"],
        4: ["India's External Relations"], 5: ["Challenges to and Restoration of the Congress System"],
        6: ["The Crisis of Democratic Order"], 7: ["Regional Aspirations"], 8: ["Recent Developments in Indian Politics"]}),
    "levt1": ("Vistas", {
        1: ["The Third Level"], 2: ["The Tiger King"], 3: ["Journey to the End of the Earth"], 4: ["The Enemy"],
        5: ["On the Face of It"], 6: ["Memories of Childhood"]}),
    # Our data puts lesson 5 (counting) at 14, so lessons 5-14 sat one file off.
    # The English names are the glosses in our topic names.
    "fsde1": ("Deepakam", {
        1: ["वयं वर्णमालां पठामः"], 2: ["संयुक्त-व्यञ्जनानि"], 3: ["एषः कः? एषा का? एतत् किम्?"], 4: ["अहं च त्वं च"],
        5: ["सङ्ख्यागणना ननु सरला", "Counting Numbers is Indeed Simple"],
        6: ["अहं प्रातः उत्तिष्ठामि", "My Daily Routine"], 7: ["शूराः वयं धीराः वयम्", "We are Brave, We are Courageous"],
        8: ["सः एव महान् चित्रकारः", "He is the Great Painter"], 9: ["अतिथिदेवो भव"],
        10: ["बुद्धिः सर्वार्थसाधिका", "Wisdom Accomplishes All Purposes"],
        11: ["यो जानाति सः पण्डितः", "One Who Knows is a Scholar"], 12: ["त्वम् आपणं गच्छ", "Go to the Market"],
        13: ["पृथिव्यां त्रीणि रत्नानि", "Three Jewels on the Earth"],
        14: ["आलस्यं हि मनुष्याणां शरीरस्थो महान् रिपुः", "Laziness is Man's Greatest Enemy"],
        15: ["माधवस्य प्रियम् अङ्गम्"], 16: ["वृक्षाः सत्पुरुषाः इव"]}),
}
# Topics that carry no NCERT link but name their book.
NCERT_BOOK_NAMES = {"Business Studies Part II: Business Finance and Marketing": "lebs2"}
# Books (curriculum_nodes metadata.book) that NCERT has replaced while our
# curriculum still lists them: the code their topics link then holds the new
# book's chapters, so they get no NCERT link until the curriculum is updated.
# Empty since 2026-11-06, when Class 6 Hindi (Vasant -> Malhar) and Class 9
# Sanskrit (Shemushi -> Sharada) were re-ingested from the current books.
NCERT_REPLACED: set[str] = set()

# ── Khan Academy NCERT courses: (class, course subject) -> path ─────────────
KHAN_COURSES: dict[tuple[int, str], str] = {
    **{(c, "mathematics"): p for c, p in KHAN_MATH.items()},
    **{(c, "science"): p for c, p in KHAN_SCIENCE.items()},
    **dict(KHAN_11_12.items()),
}

# KnowledgeBoat books: KB_BOOKS, shared with the subject cards' practice links.
KB = KNOWLEDGEBOAT
SOCIAL_KEYS = {"social-science", "history", "geography", "political-science", "economics"}


def family(subject: str) -> str:
    """Node subject -> the family used to pick courses and books."""
    s = subject.lower()
    for key in ("mathematics", "physics", "chemistry", "biology", "geography", "computer"):
        if key[:4] in s:
            return key
    if "history" in s or "civics" in s:
        return "history"
    if "science" in s and "social" not in s and "political" not in s and "computer" not in s:
        return "science"
    if any(k in s for k in ("social", "political", "economics")):
        return "social"
    return s


def book_family(board: str, subject_key: str) -> str:
    """A KB_BOOKS subject key -> the family of the topics it serves. CBSE Social
    Science comes as History, Geography... books that share its topics."""
    if board == "cbse" and subject_key in SOCIAL_KEYS:
        return "social"
    return "computer" if subject_key == "computer-science" else subject_key


# ── Title matching ───────────────────────────────────────────────────────────
STOP = {"the", "of", "and", "a", "an", "in", "to", "with", "its", "our", "on", "for", "from", "by", "at", "is",
        "are", "some", "part", "unit", "chapter", "introduction", "elementary", "concept"}


def _stem(w: str) -> str:
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]
    return w


def word_list(title: str) -> list[str]:
    t = title.lower()
    t = re.sub(r"\(.*?\)", " ", t)                       # "(Unit: Up High)", "(1915-1947)", "(A)"
    t = re.sub(r"^\s*(history|civics)\s*:\s*", " ", t)   # ICSE "History: The Vedic Period"
    t = re.sub(r"\bncert\b|\bnew\b", " ", t)
    return [_stem(w) for w in re.findall(r"[a-z]+", t) if w not in STOP and len(w) > 1]


def tokens(title: str) -> set[str]:
    return set(word_list(title))


def similarity(topic: str, candidate: str) -> float:
    """0..1: Jaccard over title words. A topic whose every word is in a longer
    title ("Laws of Motion" -> "Force and Laws of Motion") scores 0.5, and so
    does a one-word topic the title starts with ("Light" -> "Light: reflection
    and refraction"), but not one it merely contains ("Geometry" is not
    "Coordinate Geometry")."""
    a, b = tokens(topic), tokens(candidate)
    if not a or not b:
        return 0.0
    jaccard = len(a & b) / len(a | b)
    if jaccard > 0.5:
        return jaccard
    if len(a) >= 2 and a <= b:
        return 0.5
    if len(a) == 1 and word_list(candidate)[:1] == list(a):
        return 0.5
    return 0.0


def best_match(topic: str, candidates: list[dict], threshold: float = 0.5) -> dict | None:
    """The single best candidate at or above threshold. None when two tie, or
    when the topic is a unit spread over several chapters (all its words in
    each: "Medieval India" -> the Cholas, the Delhi Sultanate, the Mughals)."""
    words = tokens(topic)
    if len(words) >= 2 and sum(words <= tokens(c["title"]) for c in candidates) >= 2:
        return None
    scored = sorted(((similarity(topic, c["title"]), i) for i, c in enumerate(candidates)), reverse=True)
    if not scored or scored[0][0] < threshold:
        return None
    if len(scored) > 1 and scored[1][0] == scored[0][0]:
        return None
    return candidates[scored[0][1]]


# ── Data ─────────────────────────────────────────────────────────────────────
def fetch_topics() -> list[dict]:
    from db.supabase_client import get_client

    client = get_client()
    out: list[dict] = []
    for system, board in SYSTEM_BOARD.items():
        start = 0
        while True:
            res = (client.table("curriculum_nodes")
                   .select("name, grade_level_min, url:metadata->>url, source_url:metadata->>source_url, "
                           "subject:metadata->>subject, chapter:metadata->>chapter_number, book:metadata->>book")
                   .eq("curriculum_system", system).eq("node_type", "topic")
                   .order("id").range(start, start + 999).execute())
            rows = res.data or []
            for r in rows:
                out.append({"board": board, "grade": r["grade_level_min"], "subject": (r["subject"] or "").strip(),
                            "topic": r["name"], "url": r["url"] or "", "chapter": r["chapter"], "book": r["book"]})
            if len(rows) < 1000:
                break
            start += 1000
    print(f"{len(out)} topics: " + ", ".join(f"{b} {sum(t['board'] == b for t in out)}" for b in SYSTEM_BOARD.values()))
    return out


FrontPages = dict[tuple[str, int, int], list[dict]]  # (book code, part, chapters in part) -> topics


def ncert_chapter_pdfs(topics: list[dict]) -> tuple[list[dict], FrontPages, dict[tuple[str, int], int]]:
    """Chapter PDFs for NCERT topics whose link names the chapter ("=3-7");
    topics whose link opens the front pages ("=ps-7") are returned by book part
    for resolve_front_page_links. Also returns chapters per book part."""
    direct: list[dict] = []
    front: FrontPages = defaultdict(list)
    totals: dict[tuple[str, int], int] = {}
    for t in topics:
        m = NCERT_LINK.search(t["url"]) if t["board"] == "cbse" else None
        if not m:
            continue
        code, part, chap, total = m.group(1), int(m.group(2)), m.group(3), int(m.group(4))
        totals[(code, part)] = total
        if chap.isdigit() and 1 <= int(chap) <= total:
            direct.append(ncert_row(t, code, part, int(chap)))
        elif chap in ("ps", "0"):  # front pages, whole book
            front[(code, part, total)].append(t)
    print(f"NCERT: {len(direct)} chapter links; {sum(len(v) for v in front.values())} front-page links in {len(front)} book parts")
    return direct, front, totals


def ncert_row(t: dict, code: str, part: int, idx: int, title: str | None = None) -> dict:
    book = re.sub(r"^NCERT\s+|\s*\(Class \d+\)$", "", t["book"] or t["subject"])
    label = t["chapter"] if str(t["chapter"] or "").isdigit() else idx
    return row(t, "textbook", "NCERT", title or f"NCERT Class {t['grade']} {book}: Chapter {label}",
               NCERT_PDF.format(code=code, part=part, idx=idx))


def _plain(s: str) -> str:
    """Lower-case words (Latin or Devanagari) without bracketed parts."""
    return " ".join(re.findall(r"[a-z0-9ऀ-ॿ]+", re.sub(r"\(.*?\)", " ", s.lower())))


def match_chapter(topic: str, chapters: list[dict]) -> dict | None:
    """The chapter (of NCERT_BOOKS) a topic names: the same title, or the same
    as the topic's bracketed gloss; else the best title match by words."""
    for name in [_plain(topic)] + [_plain(g) for g in re.findall(r"\((.*?)\)", topic)]:
        same = [c for c in chapters if name and _plain(c["title"]) == name]
        if same and len({(c["book"], c["file"]) for c in same}) == 1:
            return same[0]
    return best_match(topic, chapters)


def checked_book_rows(topics: list[dict]) -> tuple[list[dict], list[dict]]:
    """NCERT rows for CBSE topics whose book is in NCERT_BOOKS, matched by title
    against that book and the other listed parts and siblings of it (keps1 and
    keps2, lech1 and lech2), so a topic filed under the wrong one still finds
    its chapter. Returns the rows and the topics left for ncert_chapter_pdfs."""
    rows, rest, unmatched, replaced = [], [], [], 0
    for t in topics:
        if t["board"] != "cbse":
            rest.append(t)
            continue
        if t["book"] in NCERT_REPLACED:
            replaced += 1
            continue
        m = NCERT_LINK.search(t["url"])
        own = m.group(1) + m.group(2) if m else NCERT_BOOK_NAMES.get(t["book"] or "", "")
        if own not in NCERT_BOOKS:
            rest.append(t)
            continue
        chapters = [{"title": title, "book": b, "file": f}
                    for b in NCERT_BOOKS if b[:4] == own[:4] for f, titles in NCERT_BOOKS[b][1].items() for title in titles]
        hit = match_chapter(t["topic"], chapters)
        if hit:
            book, file = hit["book"], hit["file"]
            klass = ord(book[0]) - ord("a") + 1  # NCERT codes: a = Class 1 ... l = Class 12
            rows.append(ncert_row(t, book[:4], int(book[4]), file,
                                  f"NCERT Class {klass} {NCERT_BOOKS[book][0]}: {NCERT_BOOKS[book][1][file][0]}"))
        else:
            unmatched.append(f"{own} g{t['grade']}: {t['topic']}")
    print(f"NCERT books checked on the portal: {len(rows)} topics placed; {len(unmatched)} not in the current book; "
          f"{replaced} from replaced books (no link)")
    for u in unmatched:
        print("   not in book", u)
    return rows, rest


def resolve_front_page_links(page, front: FrontPages, totals: dict[tuple[str, int], int]) -> list[dict]:
    """The chapter PDF for each topic whose link opens the book's front pages.

    When the topics' chapter numbers are exactly the part's chapters (1..N, or
    continuing Part I's numbering in Part II) they are used as they are.
    Otherwise (the rationalised books dropped chapters, so old numbers no longer
    match the PDFs) every chapter PDF of the part is opened and each topic goes
    to the chapter whose first page carries its title.
    """
    rows, to_read = [], []
    for (code, part, total), ts in front.items():
        nums = [int(t["chapter"]) for t in ts if str(t["chapter"] or "").isdigit()]
        earlier = sum(totals.get((code, p), 0) for p in range(1, part))
        for offset in dict.fromkeys((0, earlier)):
            if len(nums) == len(ts) and sorted(n - offset for n in nums) == list(range(1, total + 1)):
                rows += [ncert_row(t, code, part, int(t["chapter"]) - offset) for t in ts]
                break
        else:
            to_read.append((code, part, total, ts))
    print(f"NCERT front-page links: {len(rows)} from chapter numbers; reading {sum(p[2] for p in to_read)} chapter PDFs "
          f"for {sum(len(p[3]) for p in to_read)} more")
    page.goto("https://ncert.nic.in/textbook.php", wait_until="domcontentloaded", timeout=90000)
    unmatched = []
    for code, part, total, ts in to_read:
        urls = [NCERT_PDF.format(code=code, part=part, idx=i) for i in range(1, total + 1)]
        texts = first_page_texts(page, urls)
        # The title is near the top; words found there count first, so a
        # common word ("computer" in every Computer Science chapter) doesn't tie.
        top = {i: tokens(text[:200]) for i, text in enumerate(texts, 1)}
        head = {i: tokens(text) for i, text in enumerate(texts, 1)}
        for t in ts:
            words = tokens(t["topic"])
            if not words:
                unmatched.append(f"{code}{part} ch={t['chapter']}: {t['topic']}")
                continue
            scored = sorted((((len(words & head[i]) / len(words)), len(words & top[i]), i) for i in head), reverse=True)
            best = scored[0]
            if best[0] >= 0.75 and (len(scored) == 1 or scored[1][:2] < best[:2]):
                rows.append(ncert_row(t, code, part, best[2]))
            else:
                unmatched.append(f"{code}{part} ch={t['chapter']}: {t['topic']}")
    print(f"   matched by title: {sum(len(p[3]) for p in to_read) - len(unmatched)}; no chapter found: {len(unmatched)}")
    for u in unmatched:
        print("   no chapter", u)
    return rows


def first_page_texts(page, urls: list[str]) -> list[str]:
    """The first 700 characters of each PDF's text, read in Chrome from
    ncert.nic.in (NCERT resets plain HTTP clients)."""
    import logging

    from pypdf import PdfReader

    logging.getLogger("pypdf").setLevel(logging.ERROR)  # font-encoding notices on every NCERT PDF
    out: list[str] = []
    for i in range(0, len(urls), 4):
        blobs = page.evaluate("""async (urls) => Promise.all(urls.map(async u => {
            for (let k = 0; k < 3; k++) {
              try { const r = await fetch(u); if (!r.ok) return '';
                    const b = new Uint8Array(await r.arrayBuffer()); let s = '';
                    for (let j = 0; j < b.length; j += 8192) s += String.fromCharCode(...b.subarray(j, j + 8192));
                    return btoa(s); }
              catch (e) { await new Promise(s => setTimeout(s, 2000)); }
            }
            return ''; }))""", urls[i:i + 4])
        for b64 in blobs:
            text = ""
            if b64:
                try:
                    reader = PdfReader(io.BytesIO(base64.b64decode(b64)))
                    text = " ".join((reader.pages[k].extract_text() or "") for k in range(min(2, len(reader.pages))))
                except Exception:  # noqa: BLE001
                    text = ""
            out.append(" ".join(text.split())[:700])
    return out


def row(t: dict, rtype: str, provider: str, title: str, url: str) -> dict:
    return {"board": t["board"], "grade": t["grade"], "subject": t["subject"], "topic": t["topic"],
            "resource_type": rtype, "provider": provider, "title": title, "url": url}


def harvest(page, url: str, href_prefix: str) -> list[dict]:
    """Links on a course/book page that start with href_prefix: [{n, title, url}]."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(f'a[href^="{href_prefix}"]', timeout=30000)
        page.wait_for_timeout(1500)
    except Exception as e:  # noqa: BLE001
        print(f"   could not read {url}: {str(e).splitlines()[0][:100]}")
        return []
    links = page.eval_on_selector_all(
        "a[href]", "els => els.map(e => [e.getAttribute('href'), (e.innerText || '').trim()])")
    out, seen = [], set()
    for href, text in links:
        if not href or not href.startswith(href_prefix) or href in seen:
            continue
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        # "UNIT 4 Quadratic Equations", "Chapter 3 Laws of Motion", "Civics — Chapter 1 Our Constitution",
        # "Section A — Chapter 2 Growth of Nationalism"
        m = re.match(r"^(?:(History|Civics|Geography|Section [A-Z])\W*)?(?:UNIT|Chapter)\s*(\d+)\s*(.*)$", " ".join(lines), re.I)
        if not m or not m.group(3):
            continue
        seen.add(href)
        out.append({"n": f"{m.group(1) + ' ' if m.group(1) else ''}{m.group(2)}", "title": m.group(3).strip(),
                    "url": href if href.startswith("http") else
                    ("https://www.khanacademy.org" if href.startswith("/math") or href.startswith("/science") else "https://www.knowledgeboat.com") + href})
    return out


def build() -> list[dict]:
    from playwright.sync_api import sync_playwright

    topics = fetch_topics()
    rows, rest = checked_book_rows(topics)
    direct, front, totals = ncert_chapter_pdfs(rest)
    rows += direct

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(locale="en-IN").new_page()

        khan: dict[tuple[int, str], list[dict]] = {}
        for (c, s), path in KHAN_COURSES.items():
            units = harvest(page, KHAN + path, path + "/")
            khan[(c, s)] = units
            print(f"Khan {path}: {len(units)} units")

        kb: dict[tuple[str, int, str], list[tuple[str, str, list[dict]]]] = defaultdict(list)
        for board, c, key, slug, book in KB_BOOKS:
            chapters = harvest(page, f"{KB}/{slug}/content", f"/learn/{slug}/solutions/")
            kb[(board, c, book_family(board, key))].append((slug, f"{book} solutions", chapters))
            print(f"KnowledgeBoat {slug}: {len(chapters)} chapters")

        rows += resolve_front_page_links(page, front, totals)
        rows = verify_ncert(page, rows)
        browser.close()

    log: list[str] = []
    for t in topics:
        fam = family(t["subject"])
        # Khan Academy: the NCERT course for this class (ICSE/ISC science and
        # maths follow the same chapters closely enough to match by title).
        course = "science" if fam in ("physics", "chemistry", "biology") and t["grade"] <= 10 else fam
        units = khan.get((t["grade"], course), [])
        unit = best_match(t["topic"], units) if units else None
        if unit:
            rows.append(row(t, "video", "Khan Academy", f"Khan Academy: {unit['title']}", unit["url"]))
            log.append(f"KHAN {t['board']} {t['grade']} {t['subject']}: {t['topic']!r} -> {unit['title']!r}")
        # KnowledgeBoat: the chapter of this topic, or for an ICSE syllabus
        # unit spanning several chapters ("Algebra"), the book's chapter list.
        # CBSE Classes 9-10 Social Science comes as separate History, Geography... books.
        kb_fam = "social" if t["board"] == "cbse" and fam in ("history", "geography") else fam
        for slug, label, chapters in kb.get((t["board"], t["grade"], kb_fam), []):
            chapter = best_match(t["topic"], chapters)
            if chapter:
                # "Civics 1" -> "Civics Chapter 1", "Section A 2" -> "Section A Chapter 2"
                number = re.sub(r"^(.+) (\d+)$", r"\1 Chapter \2", chapter["n"]) if " " in chapter["n"] else f"Chapter {chapter['n']}"
                rows.append(row(t, "practice", "KnowledgeBoat", f"{label}: {number}, {chapter['title']}", chapter["url"]))
                log.append(f"KB   {t['board']} {t['grade']} {t['subject']}: {t['topic']!r} -> {chapter['title']!r} ({slug})")
                break
        else:
            books = kb.get((t["board"], t["grade"], kb_fam), [])
            if t["board"] == "icse" and books:
                slug, label, _ = books[0]
                rows.append(row(t, "practice", "KnowledgeBoat", f"{label} (all chapters)", f"{KB}/{slug}/content"))
                log.append(f"KB*  {t['board']} {t['grade']} {t['subject']}: {t['topic']!r} -> book index ({slug})")

    print("\n".join(sorted(log)))
    by = defaultdict(int)
    for r in rows:
        by[(r["board"], r["resource_type"])] += 1
    print("rows:", dict(sorted(by.items())))
    return rows


def verify_ncert(page, rows: list[dict], sample: int = 12) -> list[dict]:
    """Drop NCERT rows whose PDF doesn't exist (checked from ncert.nic.in
    itself), then read the first page of a sample to confirm the chapter."""
    page.goto("https://ncert.nic.in/textbook.php", wait_until="domcontentloaded", timeout=90000)
    urls = sorted({r["url"] for r in rows if r["provider"] == "NCERT"})
    status: dict[str, bool] = {}
    for i in range(0, len(urls), 12):
        res = page.evaluate("""async (urls) => Promise.all(urls.map(async u => {
            for (let k = 0; k < 3; k++) {
              try { const r = await fetch(u, {method: 'HEAD'});
                    return [u, r.ok && (r.headers.get('content-type') || '').includes('pdf')]; }
              catch (e) { await new Promise(s => setTimeout(s, 1500)); }
            }
            return [u, false]; }))""", urls[i:i + 12])
        status.update(dict(res))
    bad = sorted(u for u, ok in status.items() if not ok)
    print(f"NCERT PDFs: {len(urls) - len(bad)} open, {len(bad)} missing")
    for u in bad[:10]:
        print("   missing", u)
    rows = [r for r in rows if r["provider"] != "NCERT" or status.get(r["url"])]
    picked = random.sample([r for r in rows if r["provider"] == "NCERT"], sample)
    heads = first_page_texts(page, [r["url"] for r in picked])
    ok = 0
    for r, head in zip(picked, heads):
        words = tokens(r["topic"])
        good = not words or len(words & tokens(head)) / len(words) >= 0.5
        ok += good
        print(f"   {'title ok' if good else 'TITLE? '} {r['url']}  {r['topic']!r}")
    print(f"NCERT sample title check: {ok}/{len(picked)}")
    return rows


SKILL_PROVIDER = re.compile(r"^NCERT .+")  # "NCERT Poorvi": a language skill's chapters (skill_chapters.py)


def with_skill_rows(rows: list[dict]) -> list[dict]:
    """Replace the language-skill rows (skill_chapters.py) in rows, checking any
    chapter PDF not already among the verified chapter links."""
    from playwright.sync_api import sync_playwright
    from skill_chapters import build_rows

    keep = [r for r in rows if not SKILL_PROVIDER.match(r["provider"])]
    skill = build_rows()
    known = {r["url"] for r in keep if r["provider"] == "NCERT"}
    unchecked = sorted({r["url"] for r in skill} - known)
    if unchecked:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)
            page = browser.new_context(locale="en-IN").new_page()
            page.goto("https://ncert.nic.in/textbook.php", wait_until="domcontentloaded", timeout=90000)
            status = dict(page.evaluate("""async (urls) => Promise.all(urls.map(async u => {
                for (let k = 0; k < 3; k++) {
                  try { const r = await fetch(u, {method: 'HEAD'});
                        return [u, r.ok && (r.headers.get('content-type') || '').includes('pdf')]; }
                  catch (e) { await new Promise(s => setTimeout(s, 1500)); }
                }
                return [u, false]; }))""", unchecked))
            browser.close()
        bad = sorted(u for u, ok in status.items() if not ok)
        if bad:
            raise SystemExit("skill chapters that don't open:\n  " + "\n  ".join(bad))
    print(f"skill rows: {len(skill)} ({len(unchecked)} new chapter PDFs checked); replaced "
          f"{len(rows) - len(keep)} old skill rows")
    return keep + skill


def load(rows: list[dict]) -> None:
    from db.supabase_client import get_client

    client = get_client()
    client.table("topic_resources").delete().neq("url", "").execute()
    for i in range(0, len(rows), 500):
        client.table("topic_resources").insert(rows[i:i + 500]).execute()
    print(f"loaded {len(rows)} topic_resources rows")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", action="store_true", help="harvest, match and verify -> JSON")
    parser.add_argument("--skills", action="store_true",
                        help="add the language skills' chapters (skill_chapters.py) to the JSON")
    parser.add_argument("--load", action="store_true", help="replace topic_resources rows from the JSON")
    args = parser.parse_args()
    if args.build:
        rows = build()
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"{len(rows)} rows -> {OUT}")
    if args.build or args.skills:
        rows = with_skill_rows(json.loads(OUT.read_text(encoding="utf-8")))
        OUT.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"{len(rows)} rows -> {OUT}")
    if args.load:
        load(json.loads(OUT.read_text(encoding="utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
