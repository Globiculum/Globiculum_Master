import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clientIp, parseConsentRequest, PARENT_CONSENT_VERSIONS } from "./consent.ts";

const version = PARENT_CONSENT_VERSIONS[PARENT_CONSENT_VERSIONS.length - 1];

Deno.test("parseConsentRequest accepts a status check and a full agreement", () => {
  assertEquals(parseConsentRequest({ action: "status", version, form: "parent" }), { action: "status", version, form: "parent" });
  assertEquals(
    parseConsentRequest({ action: "grant", version, form: "parent", statements: ["child_data_use", "parent_or_guardian"] }),
    { action: "grant", version, form: "parent", statements: ["parent_or_guardian", "child_data_use"] }
  );
});

Deno.test("parseConsentRequest refuses unknown versions, forms and half agreements", () => {
  assertEquals(parseConsentRequest(null), { error: "Request body must be a JSON object" });
  assertEquals(parseConsentRequest({ action: "revoke", version, form: "parent" }), { error: "Unknown action" });
  assertEquals(parseConsentRequest({ action: "status", version: "v0", form: "parent" }), { error: "Unknown consent version" });
  // The student form has no agreement of its own yet.
  assertEquals(parseConsentRequest({ action: "status", version, form: "student" }), { error: "Unknown form" });
  const half = { action: "grant", version, form: "parent" };
  assertEquals(parseConsentRequest({ ...half, statements: ["parent_or_guardian"] }), { error: "Both statements must be agreed to" });
  assertEquals(parseConsentRequest({ ...half, statements: ["parent_or_guardian", "parent_or_guardian"] }), {
    error: "Both statements must be agreed to",
  });
  assertEquals(parseConsentRequest(half), { error: "Both statements must be agreed to" });
});

Deno.test("clientIp keeps only a well-formed address", () => {
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assertEquals(clientIp(new Headers({ "cf-connecting-ip": "2001:db8::1", "x-forwarded-for": "203.0.113.7" })), "2001:db8::1");
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "not-an-ip" })), null);
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "999.1.1.1" })), null);
  assertEquals(clientIp(new Headers()), null);
});
