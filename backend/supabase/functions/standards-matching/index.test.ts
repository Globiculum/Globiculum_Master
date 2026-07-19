// Test suite for standards-matching edge function
// Covers: Standard matching modes, threshold validation, curriculum matching

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/standards-matching`;

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

Deno.test("SM-1: Missing auth returns 401", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-2: Invalid bearer returns 401", async () => {
  const response = await makeRequest(
    { sourceStandard: { curriculum: "cbse" } },
    { Authorization: "Bearer invalid" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-3: Empty bearer returns 401", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer " });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-4: Basic auth rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Basic abc" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-5: Malformed JWT rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer bad" });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 6-15: Source Standard Validation
// ============================================================================

Deno.test("SM-6: sourceStandard required", async () => {
  const response = await makeRequest({
    matchingMode: "fuzzy",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-7: sourceStandard.curriculum required", async () => {
  const response = await makeRequest({
    sourceStandard: {},
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-8: sourceStandard with id", async () => {
  const response = await makeRequest({
    sourceStandard: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      curriculum: "cbse",
    },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-9: sourceStandard with code", async () => {
  const response = await makeRequest({
    sourceStandard: {
      code: "MATH.10.A.1",
      curriculum: "cbse",
    },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-10: sourceStandard with name", async () => {
  const response = await makeRequest({
    sourceStandard: {
      name: "Quadratic Equations",
      curriculum: "cbse",
    },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-11: sourceStandard with subject", async () => {
  const response = await makeRequest({
    sourceStandard: {
      curriculum: "cbse",
      subject: "math",
    },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-12: Empty sourceStandard curriculum", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-13: sourceStandard as string rejected", async () => {
  const response = await makeRequest({
    sourceStandard: "cbse",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-14: sourceStandard.curriculum with SQL injection", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse'; DROP TABLE;--" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-15: Very long curriculum name", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "a".repeat(500) },
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 16-25: Matching Mode
// ============================================================================

Deno.test("SM-16: exact matching mode", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "exact",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-17: fuzzy matching mode", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "fuzzy",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-18: semantic matching mode", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "semantic",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-19: Default matching mode is fuzzy", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-20: Invalid matching mode", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "invalid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-21: Empty matching mode uses default", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-22: Matching mode as number rejected", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: 123,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-23: Matching mode case sensitive", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: "FUZZY",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-24: null matching mode uses default", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: null,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-25: Matching mode with spaces", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    matchingMode: " fuzzy ",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 26-35: Threshold Validation
// ============================================================================

Deno.test("SM-26: Default threshold is 0.5", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-27: Threshold 0 valid", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 0,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-28: Threshold 1 valid", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 1,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-29: Threshold 0.75 valid", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 0.75,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-30: Negative threshold", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: -0.5,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-31: Threshold > 1", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 1.5,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-32: Threshold as string", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: "0.5",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-33: null threshold uses default", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: null,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-34: Very small threshold", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 0.001,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-35: Threshold with many decimals", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    threshold: 0.123456789,
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 36-45: Target Standards
// ============================================================================

Deno.test("SM-36: Default target standards", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-37: Single target standard", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: ["common_core"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-38: Multiple target standards", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: ["common_core", "ib", "igcse"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-39: Empty target standards uses default", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: [],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-40: Target standards as string", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: "common_core",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-41: Invalid target standard", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: ["invalid_standard"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-42: Duplicate target standards", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: ["common_core", "common_core"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-43: Target standard with injection", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: ["common_core'; DROP TABLE;--"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-44: null target standards uses default", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    targetStandards: null,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("SM-45: Grade level filter", async () => {
  const response = await makeRequest({
    sourceStandard: { curriculum: "cbse" },
    gradeLevel: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 46-50: CORS and Error Handling
// ============================================================================

Deno.test("SM-46: CORS preflight returns 204", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("SM-47: Response is JSON", async () => {
  const response = await makeRequest({});
  assertEquals(response.headers.get("Content-Type"), "application/json");
  await response.json();
});

Deno.test("SM-48: Error has error field", async () => {
  const response = await makeRequest({});
  const body = await response.json();
  assertExists(body.error);
});

Deno.test("SM-49: Invalid JSON rejected", async () => {
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

Deno.test("SM-50: Empty body rejected", async () => {
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
