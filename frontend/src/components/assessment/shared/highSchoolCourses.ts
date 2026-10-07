// High-school courses a student can say they have taken or are taking. Stored
// in academicPath by their value, which is also the metadata.subject of the
// course's units in the 'us-courses' curriculum
// (backend/rag-pipeline/ingest/us_courses.py) — keep the two in step. The gap
// engine credits these courses on top of the state standards, which describe a
// minimum, not what a Chemistry or AP Physics course teaches.
//
// The seven AP values that existed before keep their exact strings so saved
// reports still match.

const AP = "AP (Advanced Placement) ";

export const HIGH_SCHOOL_COURSES: string[] = [
  "High School Biology",
  "High School Chemistry",
  "High School Physics",
  "Algebra II",
  "Precalculus",
];

export const AP_COURSES: string[] = [
  `${AP}Calculus`,
  `${AP}Statistics`,
  `${AP}Physics`,
  `${AP}Chemistry`,
  `${AP}Biology`,
  `${AP}Computer Science A`,
  `${AP}Computer Science Principles`,
  `${AP}English`,
  `${AP}US History`,
];

export const ALL_COURSES: string[] = [...HIGH_SCHOOL_COURSES, ...AP_COURSES];

/** Chip label: "AP (Advanced Placement) Physics" -> "AP Physics". */
export const courseLabel = (course: string): string => course.replace("(Advanced Placement) ", "");
