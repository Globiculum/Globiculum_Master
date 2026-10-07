"""Repair ISC unit names that PDF extraction cut short or merged, in the
structured JSON and in the database.

The ISC syllabus PDFs lay unit headings out in table columns, so Stage A of
isc_structure.py sometimes kept only the first cell ("Primitive", "Objects",
"Introduction", "d- and"), glued on a section header ("Solutions Physical
Chemistry"), or merged two headings ("Chemical Kinetics 4. d -and f -Block
Elements..."). These names show up verbatim in reports as gap titles and weaken
the embeddings. Every corrected name below was read from the unit's heading in
backend/data/ISC/text/<subject>.txt.

Also:
  * Geography Class XI unit 1 is marked "not to be tested" in the syllabus;
    it is removed so it is never reported as a gap.
  * Mathematics Class XII unit 2 (Algebra: matrices and determinants) had no
    extracted content and was never ingested; it is added from the syllabus text.

Usage (from backend/rag-pipeline/):
    python ingest/isc_fix_units.py --dry-run
    python ingest/isc_fix_units.py           # then re-embeds and adds Algebra
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ingest_isc import STRUCTURED_DIR, CURRICULUM_ISC, build_embedding_text, subject_code  # noqa: E402

# (slug, grade_min, unit number) -> corrected name
RENAMES: dict[tuple[str, int, int], str] = {
    ("chemistry", 11, 1): "Some Basic Concepts of Chemistry",
    ("chemistry", 11, 7): "Redox Reactions",
    ("chemistry", 11, 8): "Organic Chemistry: Some Basic Principles and Techniques",
    ("chemistry", 12, 1): "Solutions",
    ("chemistry", 12, 3): "Chemical Kinetics",
    ("chemistry", 12, 4): "d- and f-Block Elements",
    ("chemistry", 12, 6): "Haloalkanes and Haloarenes",
    ("computer-science", 11, 1): "Numbers",
    ("computer-science", 11, 3): "Propositional Logic, Hardware Implementation, Arithmetic Operations",
    ("computer-science", 11, 4): "Introduction to Object Oriented Programming using Java",
    ("computer-science", 11, 6): "Primitive Values, Wrapper Classes, Types and Casting",
    ("computer-science", 11, 7): "Variables, Expressions",
    ("computer-science", 11, 8): "Statements, Scope",
    ("computer-science", 11, 9): "Methods and Constructors",
    ("computer-science", 11, 10): "Arrays, Strings",
    ("computer-science", 11, 11): "Basic Input/Output and Data File Handling",
    ("computer-science", 11, 12): "Recursion",
    ("computer-science", 11, 13): "Implementation of Algorithms to Solve Problems",
    ("computer-science", 11, 14): "Packages",
    ("computer-science", 11, 15): "Trends in Computing and Ethical Issues",
    ("computer-science", 12, 3): "Implementation of Algorithms to Solve Problems",
    ("computer-science", 12, 4): "Programming in Java (Review of Class XI Sections B and C)",
    ("computer-science", 12, 6): "Primitive Values, Wrapper Classes, Types and Casting",
    ("computer-science", 12, 7): "Variables, Expressions",
    ("computer-science", 12, 8): "Statements, Scope",
    ("computer-science", 12, 9): "Methods and Constructors",
    ("computer-science", 12, 10): "Arrays, Strings",
    ("computer-science", 12, 11): "Recursion",
    ("computer-science", 12, 13): "Data Structures",
    ("computer-science", 12, 14): "Complexity and Big O Notation",
    ("mathematics", 12, 3): "Calculus",
    ("mathematics", 12, 5): "Three-dimensional Geometry",
    ("accountancy", 11, 1): "Introduction to Accounting",
    ("accountancy", 11, 6): "Accounting Concepts, GAAP and Accounting Standards",
    ("accountancy", 11, 7): "Final Accounts",
    ("accountancy", 12, 1): "Partnership Accounts",
    # Held the Company Accounts content under a section header.
    ("accountancy", 12, 2): "Company Accounts",
    ("accountancy", 12, 5): "Ratio Analysis",
    # Held the computerised-accounting content under a footnote line.
    ("accountancy", 12, 8): "Computerised Accounting: Spreadsheets and DBMS",
    ("business-studies", 11, 4): "Automation at Workplaces",
    ("business-studies", 12, 2): "Business Communication and Correspondence",
    ("business-studies", 12, 4): "Globalisation and Recent Trends in Business",
    ("economics", 12, 2): "Theory of Income and Employment",
    ("economics", 12, 4): "Balance of Payments and Exchange Rate",
    ("geography", 12, 2): "Population and Human Settlements",
    # Held population composition, settlement and resource topics.
    ("geography", 12, 3): "Population Composition, Settlements and Resources",
    ("geography", 12, 4): "Infrastructural Resources (Transport and Communication)",
    ("geography", 12, 7): "Map Work",
    ("history", 11, 3): "Protest Movements against Colonial Rule",
    ("history", 11, 7): "World War I: Causes and Peace Settlements",
    ("history", 11, 9): "Rise of Communism under Stalin in Russia (1917-1939)",
    ("history", 11, 10): "Rise of Fascism under Mussolini in Italy (1919-39)",
    ("history", 11, 11): "Rise of Nazism under Hitler in Germany (1933-39)",
    ("history", 12, 1): "Towards Independence and Partition: The Last Phase (1939-1947)",
    ("history", 12, 2): "Establishment of Indian Democracy (1947-1966)",
    ("history", 12, 3): "Development of Indian Democracy (1964-1977)",
    ("history", 12, 4): "Changing Face of Indian Democracy (1977-1986)",
    ("history", 12, 6): "Movements for Women's Rights",
    ("history", 12, 9): "Cold War (1945-91): Origin, End and Impact",
    ("history", 12, 10): "Protest Movements: Civil Rights, Anti-Apartheid and Feminist Movements",
    ("history", 12, 11): "Middle East: Israeli-Palestine Conflict (1916-1993)",
    ("political-science", 11, 2): "The Origin of the State",
    ("political-science", 11, 3): "Political Ideologies: Liberalism and Communism",
    ("political-science", 11, 4): "Sovereignty",
    ("political-science", 11, 5): "Law",
    ("political-science", 11, 6): "Liberty",
    ("political-science", 11, 7): "Equality",
    ("political-science", 11, 8): "Justice",
    ("political-science", 11, 10): "Unipolar World: U.S. Unilateralism",
    ("political-science", 11, 11): "Regional Cooperation: ASEAN, EU, SAARC, BRICS, QUAD",
    ("political-science", 11, 12): "South Asia: India's Relationship with its Neighbours",
    ("political-science", 12, 2): "Constitution",
    ("political-science", 12, 8): "Fundamental Rights and Directive Principles of State Policy",
    ("political-science", 12, 9): "Local Self-Government",
    ("political-science", 12, 10): "Democracy in India: Challenges",
}

# Units the syllabus itself excludes from assessment.
DROPS: set[tuple[str, int, int]] = {("geography", 11, 1)}  # "(not to be tested)"

# Content for units extraction missed entirely. From the syllabus text.
ADDITIONS: dict[tuple[str, int, int], list[dict]] = {
    ("mathematics", 12, 2): [
        {"name": "Matrices",
         "description": "Concept, notation, order, equality and types of matrices; zero, identity, "
                        "diagonal, scalar and triangular matrices; transpose; symmetric and skew "
                        "symmetric matrices; addition, scalar multiplication and multiplication of "
                        "matrices; non-commutativity of matrix multiplication."},
        {"name": "Determinants",
         "description": "Determinant of a square matrix up to 3 x 3; minors, cofactors and "
                        "expansion; properties of determinants; area of a triangle and collinearity "
                        "using determinants."},
        {"name": "Inverse of a matrix and systems of linear equations",
         "description": "Adjoint and inverse of a square matrix; singular and non-singular matrices; "
                        "consistency of a system of linear equations; solving systems of linear "
                        "equations in two or three variables using the inverse of a matrix."},
    ],
}
ADDITION_NAMES = {("mathematics", 12, 2): "Algebra: Matrices and Determinants"}


def unit_sid(slug: str, cls: dict, number: int) -> str:
    gmin, gmax = cls["grade_min"], cls["grade_max"]
    span = f"{gmin}" if gmin == gmax else f"{gmin}-{gmax}"
    return f"ISC-{subject_code(slug)}-{span}-U{number}"


def fix_json(dry: bool) -> tuple[list[tuple[str, str, str, int]], list[str]]:
    """Apply the fixes to structured JSON. Returns (renamed units as
    (unit_sid, new_name, subject, grade), dropped unit_sids)."""
    renamed, dropped = [], []
    slugs = {k[0] for k in [*RENAMES, *DROPS, *ADDITIONS]}
    for slug in sorted(slugs):
        path = STRUCTURED_DIR / f"{slug}.json"
        doc = json.loads(path.read_text(encoding="utf-8"))
        for cls in doc["classes"]:
            for unit in cls["units"]:
                key = (slug, cls["grade_min"], unit["number"])
                sid = unit_sid(slug, cls, unit["number"])
                if key in RENAMES and unit["name"] != RENAMES[key]:
                    print(f"  rename {sid:<28} {unit['name'][:45]!r} -> {RENAMES[key]!r}")
                    unit["name"] = RENAMES[key]
                    renamed.append((sid, unit["name"], doc["subject"], cls["grade_min"]))
                if key in DROPS and unit.get("subtopics"):
                    print(f"  drop   {sid:<28} {unit['name'][:45]!r} (not assessed)")
                    unit["subtopics"] = []
                    unit["excluded"] = "not to be tested per the syllabus"
                    dropped.append(sid)
                if key in ADDITIONS and not unit.get("subtopics"):
                    print(f"  add    {sid:<28} {ADDITION_NAMES[key]!r} ({len(ADDITIONS[key])} topics)")
                    unit["name"] = ADDITION_NAMES[key]
                    unit["subtopics"] = ADDITIONS[key]
                    unit["text"] = " ".join(s["description"] for s in ADDITIONS[key])
        if not dry:
            path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    return renamed, dropped


def fix_db(renamed, dropped) -> None:
    from db.supabase_client import get_client  # noqa: E402

    client = get_client()
    stale_ids: list[str] = []

    for sid, name, subject, grade in renamed:
        rows = (client.table("curriculum_nodes").select("id, node_type, name, description, metadata")
                .eq("curriculum_system", CURRICULUM_ISC)
                .or_(f"metadata->>source_id.eq.{sid},metadata->>parent_source_id.eq.{sid}")
                .execute().data or [])
        for row in rows:
            meta = row["metadata"] or {}
            is_unit = meta.get("source_id") == sid
            desc = row.get("description") or ""
            if is_unit:
                meta["embedding_text"] = build_embedding_text(subject, grade, name, name, desc, True)
                patch = {"name": name[:500], "metadata": meta}
            else:
                meta["unit"] = name
                meta["embedding_text"] = build_embedding_text(subject, grade, name, row["name"], desc, False)
                patch = {"metadata": meta}
            client.table("curriculum_nodes").update(patch).eq("id", row["id"]).execute()
            stale_ids.append(row["id"])
        print(f"  db     {sid:<28} {len(rows)} rows updated")

    for sid in dropped:
        rows = (client.table("curriculum_nodes").select("id")
                .eq("curriculum_system", CURRICULUM_ISC)
                .or_(f"metadata->>source_id.eq.{sid},metadata->>parent_source_id.eq.{sid}")
                .execute().data or [])
        ids = [r["id"] for r in rows]
        if ids:
            # Live FKs have no cascade: edges and embeddings go first. Only
            # source-side edges are deleted here: a lookup on target_node_id
            # times out through the API, and a subtopic's only incoming edge is
            # the "contains" edge from its unit, which is in `ids` already.
            client.table("curriculum_edges").delete().in_("source_node_id", ids).execute()
            client.table("curriculum_embeddings").delete().in_("node_id", ids).execute()
            client.table("curriculum_nodes").delete().in_("id", ids).execute()
        print(f"  db     {sid:<28} {len(ids)} rows deleted")

    # Renamed nodes are re-embedded from their new text.
    for i in range(0, len(stale_ids), 100):
        client.table("curriculum_embeddings").delete().in_("node_id", stale_ids[i:i + 100]).execute()
    print(f"  {len(stale_ids)} embeddings cleared for re-embedding")


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair ISC unit names")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    renamed, dropped = fix_json(args.dry_run)
    print(f"{len(renamed)} renamed, {len(dropped)} dropped")
    if args.dry_run:
        return 0

    fix_db(renamed, dropped)

    # Insert the added unit(s): ingest_isc only adds source_ids not yet present.
    import subprocess
    here = Path(__file__).resolve().parent
    # --core: "--only mathematics" alone also matches applied-mathematics,
    # which is not one of the ingested core subjects.
    subprocess.run([sys.executable, str(here / "ingest_isc.py"), "--core", "--only", "mathematics"], check=True)

    from generate_embeddings import generate_embeddings  # noqa: E402
    from db.supabase_client import get_client, refresh_subject_index  # noqa: E402
    generate_embeddings([CURRICULUM_ISC])
    refresh_subject_index(get_client())
    return 0


if __name__ == "__main__":
    sys.exit(main())
