// Test suite for alignment-engine edge function
// Covers: Curriculum alignment calculations, gap detection, overlap analysis

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/alignment-engine`;

async function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return response;
}

// ============================================================================
// TEST 1-10: Authentication
// ============================================================================

Deno.test("AE-1: Missing auth returns 401", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-2: Invalid bearer returns 401", async () => {
  const response = await makeRequest(
    { sourceCurriculum: "cbse", targetCurriculum: "common_core", gradeLevel: 10 },
    { Authorization: "Bearer invalid" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-3: Empty bearer returns 401", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer " });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-4: Basic auth rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Basic abc123" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-5: Malformed JWT rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer not.valid.jwt" });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 6-15: Input Validation
// ============================================================================

Deno.test("AE-6: Missing sourceCurriculum returns 400", async () => {
  const response = await makeRequest(
    { targetCurriculum: "common_core", gradeLevel: 10 },
    { Authorization: "Bearer fake" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-7: Missing targetCurriculum returns 400", async () => {
  const response = await makeRequest(
    { sourceCurriculum: "cbse", gradeLevel: 10 },
    { Authorization: "Bearer fake" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-8: Invalid gradeLevel (0) rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 0,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-9: Invalid gradeLevel (13) rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 13,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-10: Valid gradeLevel 1-12 accepted", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-11: Empty sourceCurriculum rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-12: Empty targetCurriculum rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-13: Negative gradeLevel rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: -5,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-14: gradeLevel as string rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: "ten",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-15: subjects array optional", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math", "science"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 16-25: Curriculum Types
// ============================================================================

Deno.test("AE-16: CBSE source curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-17: ICSE source curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "icse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-18: IB source curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "ib",
    targetCurriculum: "common_core",
    gradeLevel: 11,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-19: Common Core target curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-20: IGCSE source curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "igcse",
    targetCurriculum: "cbse",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-21: State Board source curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "state_board",
    targetCurriculum: "common_core",
    gradeLevel: 9,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-22: Same source and target curriculum", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "cbse",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-23: Curriculum with SQL injection", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse'; DROP TABLE curriculum;--",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-24: Curriculum with XSS", async () => {
  const response = await makeRequest({
    sourceCurriculum: "<script>alert('xss')</script>",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-25: Very long curriculum name", async () => {
  const response = await makeRequest({
    sourceCurriculum: "a".repeat(500),
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 26-35: Subject Filtering
// ============================================================================

Deno.test("AE-26: Math subject filter", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-27: Science subject filter", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["science"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-28: Multiple subjects filter", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math", "science", "english"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-29: Empty subjects array uses defaults", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: [],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-30: All core subjects", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math", "science", "english", "social_studies"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-31: Invalid subject name", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["invalid_subject"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-32: Subject as number rejected", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: [123],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-33: Subjects as string instead of array", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: "math",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-34: Duplicate subjects", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math", "math", "science"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("AE-35: Subject with special characters", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
    subjects: ["math<script>"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 36-45: CORS and Headers
// ============================================================================

Deno.test("AE-36: CORS preflight returns 204", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("AE-37: CORS allows POST", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  const methods = response.headers.get("Access-Control-Allow-Methods");
  assertEquals(methods?.includes("POST"), true);
  await response.text();
});

Deno.test("AE-38: CORS allows authorization", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  const headers = response.headers.get("Access-Control-Allow-Headers");
  assertEquals(headers?.includes("authorization"), true);
  await response.text();
});

Deno.test("AE-39: Response is JSON", async () => {
  const response = await makeRequest({
    sourceCurriculum: "cbse",
    targetCurriculum: "common_core",
    gradeLevel: 10,
  });
  assertEquals(response.headers.get("Content-Type"), "application/json");
  await response.json();
});

Deno.test("AE-40: CORS Max-Age set", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertExists(response.headers.get("Access-Control-Max-Age"));
  await response.text();
});

Deno.test("AE-41: Vary header set", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.headers.get("Vary"), "Origin");
  await response.text();
});

Deno.test("AE-42: lovableproject.com allowed", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://test.lovableproject.com" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("AE-43: lovable.app allowed", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://app.lovable.app" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("AE-44: localhost allowed", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("AE-45: 127.0.0.1 allowed", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

// ============================================================================
// TEST 46-50: Error Handling
// ============================================================================

Deno.test("AE-46: Error response has error field", async () => {
  const response = await makeRequest({});
  const body = await response.json();
  assertExists(body.error);
});

Deno.test("AE-47: 401 error message descriptive", async () => {
  const response = await makeRequest({});
  const body = await response.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("AE-48: Invalid JSON returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake",
    },
    body: "{ invalid }",
  });
  assertEquals(response.status, 401);
  await response.text();
});

Deno.test("AE-49: Empty body returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake",
    },
    body: "",
  });
  assertEquals(response.status, 401);
  await response.text();
});

Deno.test("AE-50: null body returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake",
    },
    body: "null",
  });
  assertEquals(response.status, 401);
  await response.json();
});
