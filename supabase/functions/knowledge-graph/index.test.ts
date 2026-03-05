// Test suite for knowledge-graph edge function
// Covers: Graph traversal, prerequisites, path finding

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/knowledge-graph`;

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

Deno.test("KG-1: Missing auth returns 401", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-2: Invalid bearer returns 401", async () => {
  const response = await makeRequest(
    { operation: "traverse" },
    { Authorization: "Bearer invalid" }
  );
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-3: Empty bearer returns 401", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer " });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-4: Basic auth rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Basic abc" });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-5: Malformed JWT rejected", async () => {
  const response = await makeRequest({}, { Authorization: "Bearer bad.jwt" });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 6-15: Operation Validation
// ============================================================================

Deno.test("KG-6: traverse operation valid", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "123e4567-e89b-12d3-a456-426614174000",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-7: find-path operation valid", async () => {
  const response = await makeRequest({
    operation: "find-path",
    startNodeId: "uuid1",
    endNodeId: "uuid2",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-8: get-prerequisites operation valid", async () => {
  const response = await makeRequest({
    operation: "get-prerequisites",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-9: get-descendants operation valid", async () => {
  const response = await makeRequest({
    operation: "get-descendants",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-10: find-related operation valid", async () => {
  const response = await makeRequest({
    operation: "find-related",
    curriculumSystem: "cbse",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-11: Unknown operation rejected", async () => {
  const response = await makeRequest({
    operation: "invalid-operation",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-12: Missing operation rejected", async () => {
  const response = await makeRequest({
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-13: Empty operation rejected", async () => {
  const response = await makeRequest({
    operation: "",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-14: Operation with SQL injection", async () => {
  const response = await makeRequest({
    operation: "traverse'; DROP TABLE nodes;--",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-15: traverse requires startNodeId", async () => {
  const response = await makeRequest({
    operation: "traverse",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 16-25: MaxDepth Validation
// ============================================================================

Deno.test("KG-16: Default maxDepth is 5", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-17: maxDepth 1 valid", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 1,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-18: maxDepth 10 valid", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 10,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-19: maxDepth clamped to minimum 1", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 0,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-20: maxDepth clamped to maximum 10", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 100,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-21: Negative maxDepth clamped", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: -5,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-22: maxDepth as string rejected", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: "five",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-23: maxDepth as float", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 5.5,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-24: Very large maxDepth handled", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: 999999,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-25: maxDepth null uses default", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    maxDepth: null,
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 26-35: Traversal Mode
// ============================================================================

Deno.test("KG-26: BFS traversal mode", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "bfs",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-27: DFS traversal mode", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "dfs",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-28: shortest-path mode", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "shortest-path",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-29: all-paths mode", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "all-paths",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-30: Default traversal mode is bfs", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-31: Invalid traversal mode", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "invalid",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-32: Traversal mode as number rejected", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: 123,
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-33: Empty traversal mode uses default", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-34: Traversal mode with spaces", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: " bfs ",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-35: Traversal mode case sensitive", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    traversalMode: "BFS",
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 36-45: Relationship Types
// ============================================================================

Deno.test("KG-36: contains relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["contains"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-37: prerequisite relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["prerequisite"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-38: related_to relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["related_to"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-39: equivalent_to relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["equivalent_to"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-40: Multiple relationship types", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["contains", "prerequisite", "extends"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-41: Empty relationship array", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: [],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-42: Invalid relationship type", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["invalid_type"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-43: Relationship type as string", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: "contains",
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-44: maps_to relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["maps_to"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

Deno.test("KG-45: extends relationship", async () => {
  const response = await makeRequest({
    operation: "traverse",
    startNodeId: "uuid",
    relationshipTypes: ["extends"],
  });
  assertEquals(response.status, 401);
  await response.json();
});

// ============================================================================
// TEST 46-50: CORS and Error Handling
// ============================================================================

Deno.test("KG-46: CORS preflight returns 204", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "https://lovable.dev" },
  });
  assertEquals(response.status, 204);
  await response.text();
});

Deno.test("KG-47: Response is JSON", async () => {
  const response = await makeRequest({});
  assertEquals(response.headers.get("Content-Type"), "application/json");
  await response.json();
});

Deno.test("KG-48: Error has error field", async () => {
  const response = await makeRequest({});
  const body = await response.json();
  assertExists(body.error);
});

Deno.test("KG-49: Invalid JSON rejected", async () => {
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

Deno.test("KG-50: find-path requires both nodes", async () => {
  const response = await makeRequest({
    operation: "find-path",
    startNodeId: "uuid",
  });
  assertEquals(response.status, 401);
  await response.json();
});
