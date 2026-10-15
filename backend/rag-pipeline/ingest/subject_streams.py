"""Which Class XI-XII streams each CBSE (NCERT) and ISC subject belongs to, as a
core subject or as an optional one (elective).

Indian boards split Classes XI-XII into four streams. Each stream has
compulsory subjects, which every report for that stream compares, and optional
ones a student may add, which are compared only when the student chooses them
in the form's Electives section:

  stream       core (always compared)                     optional (if chosen)
  science-pcm  English, Physics, Chemistry, Mathematics    Computer Science, Economics, Physical Education
  science-pcb  English, Physics, Chemistry, Biology        Mathematics, Computer Science, Physical Education
  commerce     English, Accountancy, Business Studies,     Mathematics, Physical Education
               Economics
  humanities   English, History, Political Science,        Economics, English Elective, Physical Education
               Geography

Sources: the stream folders under backend/data/Ncret, and the CBSE / CISCE
scheme of studies: Science = Physics + Chemistry + Mathematics or Biology;
Commerce = Accountancy + Business Studies + Economics, with Mathematics or
Informatics Practices as a choice; Humanities = History, Political Science,
Geography, with Economics a common choice. Computer Science was listed as a
PCM core subject before, which put it in every PCM report even for students
who don't take it.

metadata.streams holds both kinds: the stream value for core subjects
("science-pcm") and "<stream>:optional" for optional ones
("science-pcm:optional"). A lookup for a stream therefore returns only its
core subjects, and a lookup for "<stream>:optional" its electives.

"science" is the earlier, unsplit Science value. Science subjects keep it so
reports generated before the split can still be retaken.

The NCERT importer's own single `stream` field is not used: it holds whichever
folder a subject was first imported from (Mathematics: only "Commerce").
"""

PCM, PCB, COMMERCE, HUMANITIES = "science-pcm", "science-pcb", "commerce", "humanities"
LEGACY_SCIENCE = "science"
ALL_STREAMS = [PCM, PCB, COMMERCE, HUMANITIES]


def optional(*streams: str) -> list[str]:
    return [f"{s}:optional" for s in streams]


SUBJECT_STREAMS: dict[str, list[str]] = {
    # English is taken in every stream, including the legacy Science value.
    "English":            [LEGACY_SCIENCE, *ALL_STREAMS],
    "English Core":       [LEGACY_SCIENCE, *ALL_STREAMS],
    "English Elective":   optional(HUMANITIES),
    "Physics":            [LEGACY_SCIENCE, PCM, PCB],
    "Chemistry":          [LEGACY_SCIENCE, PCM, PCB],
    "Biology":            [LEGACY_SCIENCE, PCB],
    "Mathematics":        [LEGACY_SCIENCE, PCM, *optional(PCB, COMMERCE)],
    "Computer Science":   [LEGACY_SCIENCE, *optional(PCM, PCB)],
    "Accountancy":        [COMMERCE],
    "Business Studies":   [COMMERCE],
    "Economics":          [COMMERCE, *optional(PCM, HUMANITIES)],
    "History":            [HUMANITIES],
    "Geography":          [HUMANITIES],
    "Political Science":  [HUMANITIES],
    "Physical Education": optional(*ALL_STREAMS),
}

STREAM_FIRST_GRADE = 11


def subject_streams(subject: str, grade_min: int | None) -> list[str]:
    """Streams for a node; empty below Class XI, where streams don't exist."""
    if grade_min is None or grade_min < STREAM_FIRST_GRADE:
        return []
    return SUBJECT_STREAMS.get(subject, [])


# Kept for ingest_ncert.py, which imported it under this name.
ncert_streams = subject_streams
