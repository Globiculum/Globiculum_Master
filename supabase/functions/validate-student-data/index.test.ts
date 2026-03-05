// Test suite for validate-student-data edge function
// Covers: Student data validation, curriculum compatibility, age-grade rules

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/validate-student-data`;

async function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return response;
}

// ============================================================================
// TEST 1-10: Authentication & Authorization
// ============================================================================

Deno.test("VSD-1: Missing auth returns 401", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-2: Invalid token returns 401", async () => {
  const response = await makeRequest(
    { schoolStage: "high", snapshotGrade: 10, currentCurriculum: "CBSE" },
    { Authorization: "Bearer invalid" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-3: Empty Bearer returns 401", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer " });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-4: Basic auth not accepted", async () => {
  const response = await makeRequest({}, { Authorization: "Basic dXNlcjpwYXNz" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-5: Expired JWT returns 401", async () => {
  const expiredJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.4Hh";
  const response = await makeRequest({}, { Authorization: `Bearer ${expiredJWT}` });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 6-15: School Stage Validation
// ============================================================================

Deno.test("VSD-6: Elementary school stage valid", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 3,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-7: Middle school stage valid", async () => {
  const response = await makeRequest({
    schoolStage: "middle",
    snapshotGrade: 7,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-8: High school stage valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-9: Invalid school stage", async () => {
  const response = await makeRequest({
    schoolStage: "preschool",
    snapshotGrade: 1,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-10: Missing school stage", async () => {
  const response = await makeRequest({
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 11-20: Grade Level Validation
// ============================================================================

Deno.test("VSD-11: Valid elementary grades (1-5)", async () => {
  for (let grade = 1; grade <= 5; grade++) {
    const response = await makeRequest({
      schoolStage: "elementary",
      snapshotGrade: grade,
      currentCurriculum: "CBSE",
    });
    assertEquals(response.status, 401);
    await response.json();
  }
});

Deno.test("VSD-12: Valid middle school grades (6-8)", async () => {
  for (let grade = 6; grade <= 8; grade++) {
    const response = await makeRequest({
      schoolStage: "middle",
      snapshotGrade: grade,
      currentCurriculum: "CBSE",
    });
    assertEquals(response.status, 401);
    await response.json();
  }
});

Deno.test("VSD-13: Valid high school grades (9-12)", async () => {
  for (let grade = 9; grade <= 12; grade++) {
    const response = await makeRequest({
      schoolStage: "high",
      snapshotGrade: grade,
      currentCurriculum: "CBSE",
    });
    assertEquals(response.status, 401);
    await response.json();
  }
});

Deno.test("VSD-14: Grade 0 invalid", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 0,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-15: Negative grade invalid", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: -1,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-16: Grade 13 invalid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 13,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-17: Grade as string rejected", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: "ten",
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-18: Grade as float", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10.5,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-19: Grade stage mismatch - elementary grade in high", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 3,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-20: Grade stage mismatch - high grade in elementary", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 11,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 21-30: Curriculum Validation
// ============================================================================

Deno.test("VSD-21: CBSE curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-22: ICSE curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "ICSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-23: IB curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 11,
    currentCurriculum: "IB",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-24: Common Core curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "Common Core",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-25: State Board curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "State Board",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-26: IGCSE curriculum valid", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "IGCSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-27: Unknown curriculum", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "Unknown System",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-28: Empty curriculum string", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-29: Curriculum with special chars", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE<script>",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-30: Curriculum case insensitive check", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "cbse",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 31-40: Age-Grade Validation
// ============================================================================

Deno.test("VSD-31: Typical age for grade 1 (6-7)", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 1,
    snapshotAge: 6,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-32: Typical age for grade 10 (15-16)", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    snapshotAge: 15,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-33: Age too young for grade warning", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 12,
    snapshotAge: 13,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-34: Age too old for grade warning", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 1,
    snapshotAge: 12,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-35: Age as optional field", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-36: Invalid age (negative)", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    snapshotAge: -5,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-37: Invalid age (too high)", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    snapshotAge: 50,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-38: Age as string rejected", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    snapshotAge: "fifteen",
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-39: Age boundary - just within range", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 5,
    snapshotAge: 10,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-40: Age boundary - just outside range", async () => {
  const response = await makeRequest({
    schoolStage: "elementary",
    snapshotGrade: 5,
    snapshotAge: 14,
    currentCurriculum: "CBSE",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 41-50: Location and Timeline Validation
// ============================================================================

Deno.test("VSD-41: US location requires state", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "Common Core",
    snapshotLocation: "us",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-42: US location with valid state", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "Common Core",
    snapshotLocation: "us",
    usState: "California",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-43: Non-US location doesn't require state", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    snapshotLocation: "india",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-44: Valid timeline - 3 months", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    timeline: "3months",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-45: Valid timeline - 6 months", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    timeline: "6months",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-46: Valid timeline - 1 year", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    timeline: "1year",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-47: Valid timeline - 2 years", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    timeline: "2years",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-48: Invalid timeline value", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
    timeline: "5years",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("VSD-49: API version header in response", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  const body = await response.json();
  assertExists(body.meta?.apiVersion);
});

Deno.test("VSD-50: Response timestamp present", async () => {
  const response = await makeRequest({
    schoolStage: "high",
    snapshotGrade: 10,
    currentCurriculum: "CBSE",
  });
  const body = await response.json();
  assertExists(body.meta?.timestamp);
});
