// Parent permission to use a child's details (tracker T27), shared by
// record-consent and its tests.
//
// Each version names one exact wording of the "Before we begin" card
// (frontend/src/lib/parentConsent.ts). Never change a version's wording: add a
// new version here and in the frontend, and the card shows again for everyone.

export const CONSENT_TYPE = "child_data";

/** Wordings the server accepts, oldest first. The frontend sends the newest. */
export const PARENT_CONSENT_VERSIONS = ["parent-2026-11-24"] as const;

/** The two boxes on the card. Both must be ticked to agree. */
export const PARENT_CONSENT_STATEMENTS = ["parent_or_guardian", "child_data_use"] as const;

/** Which form the agreement is for. The student form gets its own later. */
export const CONSENT_FORMS = ["parent"] as const;

export type ConsentRequest =
  | { action: "status"; version: string; form: string }
  | { action: "grant"; version: string; form: string; statements: string[] };

/** The request body, or a short reason it was refused (sent back as a 400). */
export function parseConsentRequest(body: unknown): ConsentRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Request body must be a JSON object" };
  const { action, version, form, statements } = body as Record<string, unknown>;
  if (action !== "status" && action !== "grant") return { error: "Unknown action" };
  if (typeof version !== "string" || !(PARENT_CONSENT_VERSIONS as readonly string[]).includes(version)) {
    return { error: "Unknown consent version" };
  }
  if (typeof form !== "string" || !(CONSENT_FORMS as readonly string[]).includes(form)) return { error: "Unknown form" };
  if (action === "status") return { action, version, form };

  const ticked = Array.isArray(statements) ? statements : [];
  const allTicked =
    ticked.length === PARENT_CONSENT_STATEMENTS.length &&
    PARENT_CONSENT_STATEMENTS.every((s) => ticked.includes(s));
  if (!allTicked) return { error: "Both statements must be agreed to" };
  return { action, version, form, statements: [...PARENT_CONSENT_STATEMENTS] };
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-f:]{2,39}$/i;

/**
 * The browser's IP address from the proxy headers, or null. Only a well-formed
 * address is kept: the column is Postgres `inet`, which rejects anything else.
 */
export function clientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const raw of candidates) {
    const ip = raw?.trim();
    if (ip && (IPV4.test(ip) || (ip.includes(":") && IPV6.test(ip)))) return ip;
  }
  return null;
}
