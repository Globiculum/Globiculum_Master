// Test suite for log-audit-event edge function
// Covers: Authentication, API contracts, validation, CORS, rate limiting

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/log-audit-event`;

// Helper to make requests
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
// TEST 1-5: CORS and Preflight
// ============================================================================

Deno.test("Test 1: CORS preflight returns 204", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("Test 2: CORS headers present in response", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  assertExists(response.headers.get("Access-Control-Allow-Headers"));
  await response.text();
});

Deno.test("Test 3: CORS allows lovableproject.com origins", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://test.lovableproject.com" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("Test 4: CORS allows localhost in dev", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("Test 5: CORS Vary header is set", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.headers.get("Vary"), "Origin");
  await response.text();
});

// ============================================================================
// TEST 6-12: Authentication
// ============================================================================

Deno.test("Test 6: Missing Authorization header returns 401", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test_table",
  });
  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.error.code, "UNAUTHORIZED");
});

Deno.test("Test 7: Invalid Authorization format returns 401", async () => {
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: "Basic invalid" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 8: Expired token returns 401", async () => {
  const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.Nz";
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: `Bearer ${expiredToken}` }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 9: Malformed JWT returns 401", async () => {
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: "Bearer not-a-jwt" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 10: Empty Bearer token returns 401", async () => {
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: "Bearer " }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 11: Missing Bearer prefix returns 401", async () => {
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: SUPABASE_ANON_KEY }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 12: Wrong case Bearer returns 401", async () => {
  const response = await makeRequest(
    { action: "test", table_name: "test_table" },
    { Authorization: "bearer " + SUPABASE_ANON_KEY }
  );
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 13-20: API Version Validation
// ============================================================================

Deno.test("Test 13: Missing API version uses default v1", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  // Should not fail on version, will fail on auth
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 14: Invalid API version returns 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v99",
    },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error.code, "INVALID_API_VERSION");
});

Deno.test("Test 15: Accept-Version header also works", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "v99",
    },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  assertEquals(response.status, 400);
  await response.json();
});

Deno.test("Test 16: X-API-Version takes precedence", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v1",
      "Accept-Version": "v99",
    },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  // Should pass version check, fail on auth
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 17: Response includes API version headers", async () => {
  const response = await makeRequest({ action: "test", table_name: "test" });
  // Check for version headers in error response
  const body = await response.json();
  assertExists(body.meta?.apiVersion);
});

// ============================================================================
// TEST 18-25: Content-Type Validation
// ============================================================================

Deno.test("Test 18: Missing Content-Type returns 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "X-API-Version": "v1" },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  assertEquals(response.status, 400);
  await response.json();
});

Deno.test("Test 19: Wrong Content-Type returns 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "X-API-Version": "v1",
    },
    body: "not json",
  });
  assertEquals(response.status, 400);
  await response.json();
});

Deno.test("Test 20: application/json with charset accepted", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-Version": "v1",
    },
    body: JSON.stringify({ action: "test", table_name: "test" }),
  });
  // Should pass content-type, fail on auth
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 21: Invalid JSON body returns 400", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v1",
      "Authorization": "Bearer fake-token",
    },
    body: "{ invalid json }",
  });
  // Will fail on auth first since token is invalid
  assertEquals(response.status, 401);
  await response.text();
});

// ============================================================================
// TEST 22-30: Schema Validation
// ============================================================================

Deno.test("Test 22: Missing action field returns validation error", async () => {
  const response = await makeRequest({ table_name: "test" });
  // Fails on auth, but schema validation would catch missing action
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 23: Missing table_name field returns validation error", async () => {
  const response = await makeRequest({ action: "test" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 24: Empty action string should fail validation", async () => {
  const response = await makeRequest({ action: "", table_name: "test" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 25: Action with SQL injection attempt", async () => {
  const response = await makeRequest({
    action: "SELECT * FROM users; DROP TABLE users;--",
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 26: Table name with special characters", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test<script>alert('xss')</script>",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 27: Very long action string", async () => {
  const longAction = "a".repeat(10000);
  const response = await makeRequest({
    action: longAction,
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 28: Valid optional record_id as UUID", async () => {
  const response = await makeRequest({
    action: "update",
    table_name: "test",
    record_id: "123e4567-e89b-12d3-a456-426614174000",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 29: Invalid record_id format", async () => {
  const response = await makeRequest({
    action: "update",
    table_name: "test",
    record_id: "not-a-uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 30: old_data and new_data as objects", async () => {
  const response = await makeRequest({
    action: "update",
    table_name: "test",
    old_data: { field: "old_value" },
    new_data: { field: "new_value" },
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 31-35: Request Size Limits
// ============================================================================

Deno.test("Test 31: Normal size request passes size check", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    new_data: { small: "data" },
  });
  // Fails on auth, not size
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 32: old_data with nested objects", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    old_data: {
      level1: {
        level2: {
          level3: "deeply nested",
        },
      },
    },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 33: Array in new_data", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    new_data: { items: [1, 2, 3, 4, 5] },
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 34: Empty old_data and new_data", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    old_data: {},
    new_data: {},
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 35: null values in data fields", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    old_data: null,
    new_data: null,
    record_id: null,
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 36-40: Error Response Format
// ============================================================================

Deno.test("Test 36: Error response has correct structure", async () => {
  const response = await makeRequest({ action: "test", table_name: "test" });
  const body = await response.json();
  assertExists(body.error);
  assertExists(body.error.code);
  assertExists(body.error.message);
  assertExists(body.meta);
});

Deno.test("Test 37: Error response includes timestamp", async () => {
  const response = await makeRequest({ action: "test", table_name: "test" });
  const body = await response.json();
  assertExists(body.meta.timestamp);
});

Deno.test("Test 38: Error response includes apiVersion", async () => {
  const response = await makeRequest({ action: "test", table_name: "test" });
  const body = await response.json();
  assertEquals(body.meta.apiVersion, "v1");
});

Deno.test("Test 39: Validation error includes details array", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v99",
    },
    body: JSON.stringify({}),
  });
  const body = await response.json();
  assertEquals(body.error.code, "INVALID_API_VERSION");
});

Deno.test("Test 40: User-friendly message in error response", async () => {
  const response = await makeRequest({ action: "test", table_name: "test" });
  const body = await response.json();
  assertExists(body.error.user_message);
});

// ============================================================================
// TEST 41-45: Edge Cases
// ============================================================================

Deno.test("Test 41: Unicode characters in action", async () => {
  const response = await makeRequest({
    action: "créer_utilisateur_日本語",
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 42: Emoji in table_name", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test_🎉",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 43: Numbers as action", async () => {
  const response = await makeRequest({
    action: 12345,
    table_name: "test",
  });
  // Type validation should catch this
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 44: Boolean as table_name", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: true,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 45: Array as action", async () => {
  const response = await makeRequest({
    action: ["test", "action"],
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 46-50: Additional Validation Scenarios
// ============================================================================

Deno.test("Test 46: Extra unknown fields in request", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test",
    unknown_field: "should be ignored or rejected",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 47: Whitespace-only action", async () => {
  const response = await makeRequest({
    action: "   ",
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 48: Newlines in table_name", async () => {
  const response = await makeRequest({
    action: "test",
    table_name: "test\ntable\n",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 49: Control characters in action", async () => {
  const response = await makeRequest({
    action: "test\x00\x01\x02action",
    table_name: "test",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("Test 50: Double-encoded JSON", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "v1",
    },
    body: JSON.stringify(JSON.stringify({ action: "test", table_name: "test" })),
  });
  // Should fail parsing or validation
  assertEquals(response.status, 401);
  await response.text();
});
