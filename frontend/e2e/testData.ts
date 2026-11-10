// Test accounts and reports created in the LOCAL Supabase by global-setup.ts.

export const PASSWORD = "e2e-local-only-Password1";

export const PARENT_A = { email: "e2e-parent-a@globiculum.test", name: "E2E Parent A" };
export const PARENT_B = { email: "e2e-parent-b@globiculum.test", name: "E2E Parent B" };

// Unusual names, so a leak is unmistakable wherever it turns up.
export const CHILD = { first: "Zephyrine", last: "Quillfeather" };

export const REPORT_ID = "e2e00000-0000-4000-8000-000000000001";
export const DELETED_REPORT_ID = "e2e00000-0000-4000-8000-000000000002";
export const REPORT_TITLE = "Curriculum Alignment Report - Grade 5";

export const TOKENS = {
  valid: "e2e00000-0000-4000-8000-0000000000a1",
  expired: "e2e00000-0000-4000-8000-0000000000a2",
  deletedReport: "e2e00000-0000-4000-8000-0000000000a3",
  unknown: "e2e00000-0000-4000-8000-0000000000ff",
};

// topic_resources rows for two Class 6 English skills, as topic_resources.py --skills writes them.
const skillRow = (topic: string, title: string, file: string) => ({
  board: "cbse", grade: 6, subject: "English", topic, resource_type: "textbook", provider: "NCERT Poorvi",
  title, url: `https://ncert.nic.in/textbook/pdf/${file}.pdf`,
});
export const SKILL_ROWS = [
  skillRow("Grammar", "Unit 2: Friendship (past tenses)", "fepr102"),
  skillRow("Grammar", "Unit 1: Fables and Folk Tales (present continuous, adverbs)", "fepr101"),
  skillRow("Reading comprehension", "Every chapter: Unit 1: Fables and Folk Tales", "fepr101"),
];

// Same shape as a parent submission (parentMapper.ts).
export const FORM_DATA = {
  childName: CHILD.first,
  childLastName: CHILD.last,
  snapshotAge: "10",
  schoolStage: "middle",
  snapshotGrade: "5",
  snapshotLocation: "us",
  usState: "TX",
  currentCurriculum: ["us-common-core"],
  targetGoal: "cbse",
  targetGrade: "next",
  timeline: "3-6-months",
  selectedLanguages: ["english", "hindi"],
  academicPath: ["Math", "Science"],
};

// Same shape as an analyze-curriculum result (the dev preview mock in ReportPreview.tsx).
export const ANALYSIS_DATA = {
  overallAlignment: {
    percentage: 72,
    subjectsNeedingBridge: ["Science", "Social Science"],
    estimatedDuration: "5 Months",
  },
  subjectAnalysis: [
    { subject: "Mathematics", topicsCovered: 18, totalTopics: 20, alignmentLevel: "strong", keyGaps: [] },
    { subject: "Science", topicsCovered: 12, totalTopics: 20, alignmentLevel: "moderate", keyGaps: ["Diagram-based question practice"] },
    {
      subject: "English",
      topicsCovered: 16,
      totalTopics: 20,
      alignmentLevel: "moderate",
      // Language gaps are skills (language_skills.py); SKILL_ROWS point them at chapters.
      keyGaps: [
        { topic: "Grammar", grade: 6, severity: "CRITICAL", reason: "Expected by Class 6: nouns, pronouns, verbs, adverbs." },
        { topic: "Reading comprehension", grade: 6, severity: "CRITICAL", reason: "Expected by Class 6: main ideas and sequence." },
      ],
    },
    { subject: "Social Science", topicsCovered: 7, totalTopics: 20, alignmentLevel: "high_gap", keyGaps: ["Indian History", "Civics", "Geography"] },
  ],
  criticalGaps: ["Indian History", "Civics & Governance"],
  bridgeTimeline: {
    phase1: { name: "Foundation", duration: "Month 1-2", bullets: ["Introduce Indian History timeline"] },
    phase2: { name: "Building", duration: "Month 3-4", bullets: ["Deepen Social Science coverage"] },
    phase3: { name: "Consolidation", duration: "Month 5", bullets: ["Practice CBSE-style assessments"] },
  },
  recommendations: {
    study: ["Daily Social Science reading"],
    skillStrategy: ["Practice diagram-based Science questions"],
    resources: ["NCERT Class 6 Social Science"],
    culturalLanguage: ["Watch Indian history documentaries"],
  },
};
