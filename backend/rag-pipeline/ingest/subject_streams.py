"""Which Class XI-XII streams each CBSE (NCERT) and ISC subject belongs to.

Indian boards split Classes XI-XII into four streams. A subject is listed under
a stream only when students of that stream normally take it, because every
listed subject is compared in the report and an unlisted one is not:

  science-pcm  Science, Non-Medical: English, Physics, Chemistry, Mathematics,
               Computer Science (the usual fifth subject, as in the
               data/Ncret "Non Medical" folder)
  science-pcb  Science, Medical: English, Physics, Chemistry, Biology
  commerce     English, Accountancy, Business Studies, Economics, Mathematics
  humanities   English, History, Political Science, Geography, Economics

Sources: the stream folders under backend/data/Ncret, and the CBSE / CISCE
scheme of studies. Two places where this goes beyond the folders:
  * Economics is in Commerce. It is one of the three core Commerce subjects
    (Accountancy, Business Studies, Economics); the Class XI folder has it only
    under Arts because each file was stored once.
  * Computer Science is NOT in Commerce. Commerce students who take a computing
    subject take Informatics Practices, a different syllabus.
Physical Education is optional in every stream, so it is left out rather than
reported as a gap for students who don't take it.

"science" is the earlier, unsplit Science value. Science subjects keep it so
reports generated before the split can still be retaken.

The NCERT importer's own single `stream` field is not used: it holds whichever
folder a subject was first imported from (Mathematics: only "Commerce").
"""

PCM, PCB, COMMERCE, HUMANITIES = "science-pcm", "science-pcb", "commerce", "humanities"
LEGACY_SCIENCE = "science"
ALL_STREAMS = [PCM, PCB, COMMERCE, HUMANITIES]

SUBJECT_STREAMS: dict[str, list[str]] = {
    # English is taken in every stream, including the legacy Science value.
    "English":           [LEGACY_SCIENCE, *ALL_STREAMS],
    "English Core":      [LEGACY_SCIENCE, *ALL_STREAMS],
    "English Elective":  [HUMANITIES],
    "Physics":           [LEGACY_SCIENCE, PCM, PCB],
    "Chemistry":         [LEGACY_SCIENCE, PCM, PCB],
    "Biology":           [LEGACY_SCIENCE, PCB],
    "Mathematics":       [LEGACY_SCIENCE, PCM, COMMERCE],
    "Computer Science":  [LEGACY_SCIENCE, PCM],
    "Accountancy":       [COMMERCE],
    "Business Studies":  [COMMERCE],
    "Economics":         [COMMERCE, HUMANITIES],
    "History":           [HUMANITIES],
    "Geography":         [HUMANITIES],
    "Political Science": [HUMANITIES],
}

STREAM_FIRST_GRADE = 11


def subject_streams(subject: str, grade_min: int | None) -> list[str]:
    """Streams for a node; empty below Class XI, where streams don't exist."""
    if grade_min is None or grade_min < STREAM_FIRST_GRADE:
        return []
    return SUBJECT_STREAMS.get(subject, [])


# Kept for ingest_ncert.py, which imported it under this name.
ncert_streams = subject_streams
