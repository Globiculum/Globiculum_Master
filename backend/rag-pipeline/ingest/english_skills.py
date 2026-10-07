"""English Classes XI-XII as language SKILLS, for CBSE (NCERT) and ISC.

Why: both boards' English nodes in the database are prescribed literature
(Hornbill / Snapshots / Flamingo / Vistas chapters, ISC poems and plays). A US
student's English standards are skills (comprehension, argument writing,
language use), so chapter titles like "The Proposal" or "Silk Road" never match
anything and English always scored 0%, with chapter titles listed as the top
gaps. These nodes describe what each board actually examines in English, so the
comparison is skill against skill. Literature is kept as ONE skill (critical
reading of prose, poetry and drama) rather than one gap per chapter.

The gap engine uses these nodes instead of the chapter nodes wherever they
exist: see preferEnglishSkillNodes() in supabase/functions/_shared/curriculumGaps.ts,
which keys on metadata.component == "language-skills".

Sources:
  ISC  - ISC 2027 English (801) regulations: Paper I (composition, directed
         writing, proposal writing, grammar, comprehension and summary) and
         Paper II project work (listening, speaking). backend/data/ISC/text/english.txt
  CBSE - CBSE English Core (301) curriculum: Section A reading skills,
         Section B grammar and creative writing, Section C literature, plus the
         internal Assessment of Listening and Speaking.

Usage (from backend/rag-pipeline/):
    python ingest/english_skills.py --dry-run
    python ingest/english_skills.py            # insert, then embed the new nodes
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from subject_streams import subject_streams  # noqa: E402

COMPONENT = "language-skills"

# (curriculum_system, subject label used by that board's existing nodes,
#  grade_min, grade_max, source_id prefix, board label, skills[(name, description)])
SKILL_SETS: list[tuple[str, str, int, int, str, str, list[tuple[str, str]]]] = [
    ("isc-cisce", "English", 11, 12, "ISC-ENGSKILL-11-12", "ISC", [
        ("Composition writing",
         "Write a 400-450 word composition: narrative, descriptive, reflective, "
         "argumentative/persuasive or expository essay, or an original short story. "
         "Range and accuracy of vocabulary, sentence structure, grammar, punctuation "
         "and spelling; organising ideas across paragraphs."),
        ("Directed writing",
         "Write a 250-300 word piece from given information and points: feature "
         "article, book review, blog, newspaper report or statement of purpose, in "
         "the correct format; amplifying, describing and restating for a purpose and audience."),
        ("Proposal writing",
         "Write a formal proposal for a given situation with a heading, objectives, "
         "a list of measures to be taken and a concluding statement."),
        ("Functional grammar and usage",
         "Transformation of sentences, phrasal verbs, verb forms and tenses; "
         "correct functional English grammar and sentence structure."),
        ("Reading comprehension",
         "Read an unseen passage of about 700 words; understand content, infer "
         "information and meaning, analyse the text and explain vocabulary in context."),
        ("Summary writing",
         "Identify the main ideas of a passage and write a coherent summary within "
         "a word limit, in complete sentences."),
        ("Listening skills",
         "Listen to an unseen passage read aloud, take brief notes and answer "
         "questions testing listening comprehension."),
        ("Speaking skills",
         "Give an individual presentation and discuss it: narrating an experience, "
         "giving instructions, describing, reporting and expressing an opinion with "
         "fluency, vocabulary and confidence."),
        ("Critical reading of literature",
         "Comprehend, analyse and appreciate prescribed prose, poetry and drama: "
         "themes, characters, context, and stylistic and literary features, "
         "supported by close reference to the text."),
    ]),
    ("ncert-cbse", "English", 11, 11, "NCERT-ENGSKILL-11", "CBSE", [
        ("Reading comprehension",
         "Read unseen factual, descriptive, discursive and literary passages; "
         "understand, interpret and infer meaning, and work out vocabulary in context."),
        ("Note-making and summarising",
         "Make notes from a passage with headings, sub-headings and abbreviations, "
         "and write a summary of its main ideas."),
        ("Grammar and usage",
         "Gap filling with correct tenses and clauses; re-ordering words into "
         "sentences and transformation of sentences."),
        ("Functional writing: advertisements and posters",
         "Write classified and display advertisements and posters with the right "
         "format, content and concise language."),
        ("Persuasive writing: speech and debate",
         "Write a speech and a debate on a given topic, building an argument with "
         "reasons and examples in an appropriate format and register."),
        ("Listening and speaking skills",
         "Listen to and understand spoken English, and speak fluently and "
         "accurately in presentations and discussion."),
        ("Critical reading of literature",
         "Comprehend and analyse prose, poetry and drama from the prescribed texts: "
         "themes, characters, literary devices and inference, in short and long answers."),
    ]),
    ("ncert-cbse", "English Core", 12, 12, "NCERT-ENGSKILL-12", "CBSE", [
        ("Reading comprehension",
         "Read unseen passages, including a case-based factual passage with visual "
         "or statistical input; understand, interpret, infer, analyse and summarise."),
        ("Functional writing: notices and invitations",
         "Write notices, formal invitations and replies with the right format and "
         "concise, accurate language."),
        ("Letter writing",
         "Write letters from verbal or visual input: job applications with a "
         "bio-data or resume, and letters to the editor giving suggestions or "
         "opinions on issues of public interest."),
        ("Article and report writing",
         "Write articles and reports on a given topic, organising ideas with a "
         "suitable heading, structure and style."),
        ("Listening and speaking skills",
         "Listen to and understand spoken English, and speak fluently and "
         "accurately in presentations and discussion."),
        ("Critical reading of literature",
         "Comprehend and analyse prose, poetry and drama from the prescribed texts: "
         "themes, characters, literary devices and inference, in short and long answers."),
    ]),
]


def build_nodes() -> list[dict]:
    nodes = []
    for system, subject, gmin, gmax, prefix, board, skills in SKILL_SETS:
        grade_label = f"Class {gmin}" if gmin == gmax else f"Classes {gmin}-{gmax}"
        for i, (name, description) in enumerate(skills, 1):
            nodes.append({
                "node_type": "topic",
                "name": name,
                "description": description,
                "grade_level_min": gmin,
                "grade_level_max": gmax,
                "curriculum_system": system,
                "metadata": {
                    "source_id": f"{prefix}-S{i}",
                    "source_type": "skill",
                    "component": COMPONENT,
                    "subject": subject,
                    "streams": subject_streams(subject, gmin),
                    "board": board,
                    # Phrased as a skill, like the US standards it is matched
                    # against; generate_embeddings uses it for skill nodes.
                    "embedding_text": f"{board} English language skill, {grade_label} - {name} - {description}",
                },
            })
    return nodes


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert English skill nodes and embed them")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    nodes = build_nodes()
    if args.dry_run:
        for n in nodes:
            m = n["metadata"]
            print(f"{n['curriculum_system']:<11} {m['subject']:<13} {n['grade_level_min']}-{n['grade_level_max']} "
                  f"{m['source_id']:<22} {n['name']}")
        print(f"{len(nodes)} nodes")
        return 0

    from config import INSERT_BATCH_SIZE  # noqa: E402
    from db.supabase_client import batch_insert, get_client, get_existing_source_ids, refresh_subject_index  # noqa: E402
    from generate_embeddings import generate_embeddings  # noqa: E402

    client = get_client()
    systems = sorted({n["curriculum_system"] for n in nodes})
    existing: set[str] = set()
    for system in systems:
        existing |= get_existing_source_ids(client, system)
    new = [n for n in nodes if n["metadata"]["source_id"] not in existing]
    print(f"{len(nodes)} skill nodes, {len(new)} new")
    if new:
        batch_insert(client, "curriculum_nodes", new, INSERT_BATCH_SIZE)
        refresh_subject_index(client)
    # Embeds only nodes that have no embedding yet.
    generate_embeddings(systems)
    return 0


if __name__ == "__main__":
    sys.exit(main())
