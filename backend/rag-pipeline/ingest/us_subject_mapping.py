"""Map raw US state standards subject names onto canonical Globiculum subjects.

US curriculum data comes from the Common Standards Project, which stores each
state's own label for a standards document as metadata.subject. Across the 51
jurisdictions that is 1,053 distinct strings for what is really a handful of
subjects, because the labels carry:

  - year ranges marking a vintage:   "Science (1998-2013)", "Science (2013-)"
  - state branding:                  "Mathematics (B.E.S.T.)", "Language Arts Florida Standards (LAFS)"
  - non-academic documents:          CTE clusters, early-childhood guidelines,
                                     teacher evaluation, library media, SEL,
                                     test blueprints, alternate standards

This module turns every raw label into one row of the subject_mappings table:

    raw_subject -> canonical_subject | NULL (excluded), domain, is_core, vintage_end

and writes a seed migration so the database is the single source of truth for
both the assessment form's subject list and the gap engine's source pools.

Re-run after ingesting new US data; unclassified labels are reported and must
be reviewed before the seed is regenerated.

Usage (from backend/rag-pipeline/):
    python ingest/us_subject_mapping.py                 # classify + print review
    python ingest/us_subject_mapping.py --emit-sql      # also write the seed migration
    python ingest/us_subject_mapping.py --cache FILE    # reuse a saved audit instead of querying
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_PATH = REPO_ROOT / "backend" / "supabase" / "migrations" / "20261005000001_seed_subject_mappings.sql"

# Labels are only treated as superseded if their year range closed before this.
CURRENT_YEAR = date.today().year

# ── canonical subjects ────────────────────────────────────────────────────────
# Core subjects are the ones the gap engine can compare against Indian boards;
# their domain values must match SubjectDomain in _shared/curriculumGaps.ts.
CANONICAL = {
    "Mathematics":                ("mathematics", True),
    "English":                    ("english", True),
    "Science":                    ("science", True),
    "Social Studies":             ("social-science", True),
    "Computer Science":           ("computer-science", True),
    "World Languages":            ("other-language", False),
    "Arts":                       ("other", False),
    "Physical Education & Health": ("other", False),
    "Personal Finance":           ("other", False),
}


@dataclass(frozen=True)
class Rule:
    pattern: re.Pattern
    canonical: str | None      # None = excluded
    reason: str


def r(pattern: str) -> re.Pattern:
    return re.compile(pattern, re.IGNORECASE)


# Order is the whole design: first match wins. Labels collide constantly —
# "English Language Arts" contains "Arts", "History-Social Science" contains
# "Science", "Social and Emotional Learning" contains "Social", "Spanish
# Language Arts" contains "Language Arts", "Health Science" is a CTE cluster —
# so exclusions and narrow overrides run before the broad subject patterns.
RULES: list[Rule] = [
    # Narrow overrides for labels the broad rules below would misroute.
    Rule(r(r"^algebra with finance$|^computer mathematics$|^mathematics - spanish$"), "Mathematics", "override"),
    Rule(r(r"^science literacy$"), "Science", "override"),
    Rule(r(r"^math, science & technology$|^(integrated )?stem$|science, technology, engineering, and mathematics"),
         None, "mixed-subject framework"),

    # Alternate standards for students with significant cognitive disabilities.
    # Real subject content, but a different achievement scale entirely: as a
    # source pool they would dilute the general-education standards.
    Rule(r(r"extended (learning|content|evidence)|expanded core|essential elements|"
           r"alternat(e|ive) (content|academic)|\baas\b|vaap|connectors|dynamic learning maps|"
           r"significant disabilit|applied studies"), None, "alternate standards"),

    Rule(r(r"early (learning|childhood)|preschool|pre-?k\b|pre-?kindergarten|prekindergarten|"
           r"infant|toddler|birth|transitional kindergarten|ptk drdp|\bwa kids\b|"
           r"kindergarten (guidelines|learning)|child development|physical development"),
         None, "early childhood"),
    Rule(r(r"teacher|teaching|danielson|professional development|educator"), None, "educator standards"),
    Rule(r(r"assessment|caaspp|smarter balance|\bpssa\b|keystone|tsia|test prep|aquestt|^pass$"),
         None, "assessment"),
    Rule(r(r"librar|information literacy|information fluency|\bfinds\b|research process|"
           r"i-sail|\breads\b|information (and|&) technology literacy"), None, "library & information literacy"),
    Rule(r(r"social[- /]?emotional|social (and|&) emotional|\bsel\b|character|leadership|counsel|"
           r"guidance|mindsets|interpersonal|social skills|student success|"
           r"personal (and|&) social development|noble classroom|portrait of a graduate|cultural standards"),
         None, "social-emotional learning"),
    Rule(r(r"english language (proficiency|development)|\belp\b|\beld\b|wida|english learner|"
           r"\bcelp\b|oaelps|transitional english"), None, "English language proficiency (ESL)"),
    Rule(r(r"\babe\b|\base\b|adult"), None, "adult education"),

    # Disciplinary literacy is Common Core ELA applied to other subjects. It has
    # to be claimed before the History/Science patterns see those words in it.
    Rule(r(r"^literacy in|standards for literacy in|reading\s+(&|and)\s+writing for|"
           r"disciplinary literacy|ccss ela-literacy|^history/social studies, science, and technical|"
           r"^science/technical subjects$"), "English", "disciplinary literacy"),

    Rule(r(r"personal financ|financial (literacy|education)|economics and personal finance"),
         "Personal Finance", "subject"),

    Rule(r(r"\bcte\b|ctae|career|vocational|work-?based|employab|workplace|life and careers|"
           r"programs of study|agricultur|hospitality|architecture|construction|law and public service|"
           r"health science|biomedical|pltw|21st century skills|dual credit|community college|"
           r"college (transition|and career)|path-college|life skills|parenting|family life|"
           r"famil(y|ies) (and|&) consumer|\bfcs\b|practical living|business|marketing|^finance$"),
         None, "career & technical education"),

    Rule(r(r"gifted|driver|traffic safety|sexual health|nutrition|hand ?writing|keyboarding|"
           r"digital citizenship|journalism|millcreek|banzai|\betsa\b|creative process|"
           r"pre-international|environmental (education|literacy)|essential skills|transition standards"),
         None, "non-core elective / local"),

    Rule(r(r"computer science|computing|cyber"), "Computer Science", "subject"),

    # Technology-use standards (ISTE etc.) describe using digital tools across
    # subjects rather than a course the student takes, so they are excluded.
    Rule(r(r"educational technology|education technology|\biste\b|technology literacy|"
           r"technology tools|digital learning|integrated technology|"
           r"information (and|&) (communication )?technology|^information & technology$|"
           r"^technology( applications| education| education standards)?$|computer (literacy|technology)|"
           r"^computer and technology$|^(engineering and technology|technology and engineering)"),
         None, "technology-use standards"),

    Rule(r(r"world.?lang|foreign lang|languages other than english|modern (world )?lang|"
           r"spanish language|french|hawaiian|world-readiness|native lang|arts and humanities: world|"
           r"espa.ol|lenguaje"),
         "World Languages", "subject"),

    # English before Social Studies: "English Language Arts and Literacy in
    # History/Social Studies" is an ELA document that names History.
    Rule(r(r"english|language arts|\bela\b|\blafs\b"), "English", "subject"),

    Rule(r(r"social stud|social science|history|civics|econom|geograph|government|"
           r"ethnic|indians|oceti|black and latino|social foundations"), "Social Studies", "subject"),

    # Science after Computer Science and Social Studies, both of which contain
    # the word. NGSS framework pieces carry no "Science" in some labels.
    Rule(r(r"science|ngss|engineering|\bseed\b|physics|chemistry|biology|ecology|"
           r"\bdci\b|performance expectations|appendix [fg]|crosscutting"), "Science", "subject"),

    # Looser ELA labels, deliberately after Science so "Science Literacy"-style
    # labels have already been routed.
    Rule(r(r"reading|writing|literacy|communicat"), "English", "subject"),

    Rule(r(r"\bmath|algebra"), "Mathematics", "subject"),

    # Arts last among subjects: "Language Arts" must never land here.
    Rule(r(r"\barts?\b|music|dance|theat|drama|visual|media art|humanities"), "Arts", "subject"),
    Rule(r(r"physical education|health|wellness|fitness"), "Physical Education & Health", "subject"),
]

YEAR_RANGE_RE = re.compile(r"[\(\[]\s*(\d{4})?\s*[-–]?\s*(\d{4})?\s*[\)\]]")
TRAILING_YEAR_RE = re.compile(r"\s*[-–]\s*(\d{4})\s*$")


def strip_vintage(name: str) -> str:
    """'Science (1998-2013)' -> 'Science'; leaves non-year parentheses alone."""
    out = name
    while True:
        m = re.search(r"\s*[\(\[]\s*\d{4}?\s*[-–]?\s*\d{0,4}\s*[\)\]]\s*$", out)
        if not m or not re.search(r"\d{4}", m.group(0)):
            break
        out = out[: m.start()].rstrip()
    out = TRAILING_YEAR_RE.sub("", out).strip()
    return out or name


def vintage_end(name: str) -> int | None:
    """End year of the label's closed year range, or None when it is open-ended.

    "(1998-2013)" -> 2013; "(2013-)" and labels with no range -> None. A single
    trailing year ("- 2010") is a publication year, not an end date, so None.
    Stored rather than a current/superseded flag so the database decides
    currency against today's date: a "(2021-2026)" label rolls over to
    superseded in 2027 without regenerating the seed.
    """
    ends = [int(end) for start, end in YEAR_RANGE_RE.findall(name) if start and end]
    return max(ends) if ends else None


def is_current(name: str) -> bool:
    """A label with a closed year range that ended in the past is superseded.

    "(2013-)" and labels with no years are current; "(1998-2013)" is not. A
    single trailing year ("- 2010") is a publication year, not an end date.
    """
    for start, end in YEAR_RANGE_RE.findall(name):
        if start and end and int(end) < CURRENT_YEAR:
            return False
    return True


def classify(raw: str) -> tuple[str | None, str]:
    base = strip_vintage(raw)
    for rule in RULES:
        if rule.pattern.search(base):
            return rule.canonical, rule.reason
    return None, "unclassified"


def load_raw(cache: Path | None) -> dict[str, dict[str, int]]:
    """{curriculum_system: {raw_subject: node_count}} for every US system."""
    if cache and cache.exists():
        data = json.loads(cache.read_text(encoding="utf-8"))
        return {sysname: {row["subject"]: row["nodes"] for row in rows} for sysname, rows in data.items()}

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from db.supabase_client import get_client  # noqa: E402

    client = get_client()
    systems = [row["curriculum_system"] for row in client.rpc("get_distinct_curriculum_systems").execute().data]
    out: dict[str, dict[str, int]] = {}
    for sysname in systems:
        if not (sysname.startswith("us-") or sysname == "ngss"):
            continue
        rows = client.rpc(
            "get_curriculum_subjects",
            {"p_curriculum_system": sysname, "p_grade": None, "p_stream": None},
        ).execute().data or []
        out[sysname] = {row["subject"]: row["node_count"] for row in rows}
    return out


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def emit_sql(rows: list[dict]) -> str:
    lines = [
        "-- GENERATED by backend/rag-pipeline/ingest/us_subject_mapping.py --emit-sql.",
        "-- Do not hand-edit: change the rules in that file and regenerate.",
        f"-- {len(rows)} raw US subject labels.",
        "",
        "INSERT INTO public.subject_mappings",
        "  (raw_subject, canonical_subject, domain, is_core, vintage_end, excluded_reason)",
        "VALUES",
    ]
    values = []
    for row in rows:
        values.append(
            "  ("
            + ", ".join([
                sql_literal(row["raw"]),
                sql_literal(row["canonical"]),
                sql_literal(row["domain"]),
                "TRUE" if row["is_core"] else "FALSE",
                "NULL" if row["vintage_end"] is None else str(row["vintage_end"]),
                sql_literal(row["excluded_reason"]),
            ])
            + ")"
        )
    lines.append(",\n".join(values))
    lines += [
        "ON CONFLICT (raw_subject) DO UPDATE SET",
        "  canonical_subject = EXCLUDED.canonical_subject,",
        "  domain            = EXCLUDED.domain,",
        "  is_core           = EXCLUDED.is_core,",
        "  vintage_end       = EXCLUDED.vintage_end,",
        "  excluded_reason   = EXCLUDED.excluded_reason,",
        "  updated_at        = now();",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify US subject labels")
    parser.add_argument("--cache", type=Path, help="reuse a saved audit JSON")
    parser.add_argument("--emit-sql", action="store_true", help="write the seed migration")
    args = parser.parse_args()

    raw_by_system = load_raw(args.cache)

    nodes_by_raw: dict[str, int] = defaultdict(int)
    systems_by_raw: dict[str, set[str]] = defaultdict(set)
    for sysname, subjects in raw_by_system.items():
        for raw, count in subjects.items():
            nodes_by_raw[raw] += count
            systems_by_raw[raw].add(sysname)

    rows = []
    for raw in sorted(nodes_by_raw):
        canonical, reason = classify(raw)
        domain, core = CANONICAL.get(canonical, (None, False)) if canonical else (None, False)
        rows.append({
            "raw": raw,
            "canonical": canonical,
            "domain": domain,
            "is_core": core,
            "is_current": is_current(raw),
            "vintage_end": vintage_end(raw),
            "excluded_reason": None if canonical else reason,
            "nodes": nodes_by_raw[raw],
            "systems": len(systems_by_raw[raw]),
        })

    total_nodes = sum(r_["nodes"] for r_ in rows)
    print(f"{len(rows)} raw labels across {len(raw_by_system)} US systems, {total_nodes:,} nodes\n")

    by_canonical: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_canonical[row["canonical"] or f"(excluded) {row['excluded_reason']}"].append(row)

    print(f"{'CANONICAL / EXCLUSION':<44}{'labels':>8}{'nodes':>10}{'share':>8}")
    print("-" * 70)
    for key, group in sorted(by_canonical.items(), key=lambda kv: -sum(x["nodes"] for x in kv[1])):
        n = sum(x["nodes"] for x in group)
        print(f"{key[:43]:<44}{len(group):>8}{n:>10,}{n / total_nodes:>8.1%}")

    unclassified = [row for row in rows if row["excluded_reason"] == "unclassified"]
    print(f"\nunclassified labels: {len(unclassified)}")
    for row in sorted(unclassified, key=lambda x: -x["nodes"]):
        print(f"   {row['raw'][:70]:<70} {row['nodes']:>6}")

    superseded = [row for row in rows if not row["is_current"] and row["canonical"]]
    print(f"\nsuperseded vintages (mapped but closed year range): {len(superseded)}")

    if args.emit_sql:
        SEED_PATH.write_text(emit_sql(rows), encoding="utf-8")
        print(f"\nseed written -> {SEED_PATH}")

    return 1 if unclassified else 0


if __name__ == "__main__":
    sys.exit(main())
