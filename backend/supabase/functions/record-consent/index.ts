// Records and reports a parent's permission to use their child's details, given
// on the parent form's "Before we begin" card (tracker T27).
//
// The browser can't read or write user_consents (row security on, no rules), so
// this function does both with the service key, after checking who is signed
// in. Each agreement is one row: the server's time, the wording version shown,
// the statements ticked, and the browser's IP address and user agent. That row
// is our evidence that the parent agreed, so rows are only ever added.
//
//   { action: "status", version, form: "parent" }  -> { granted, grantedAt }
//   { action: "grant", version, form: "parent", statements: [...] } -> { granted: true, grantedAt }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { clientIp, CONSENT_TYPE, parseConsentRequest } from "../_shared/consent.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });

  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return reply(401, { error: "Please log in first" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return reply(401, { error: "Please log in first" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Request body must be a JSON object" });
  }
  const request = parseConsentRequest(body);
  if ("error" in request) return reply(400, { error: request.error });

  const existing = await admin
    .from("user_consents")
    .select("granted_at")
    .eq("user_id", user.id)
    .eq("consent_type", CONSENT_TYPE)
    .eq("version", request.version)
    .eq("granted", true)
    .is("revoked_at", null)
    .order("granted_at", { ascending: false })
    .limit(1);
  if (existing.error) {
    console.error("[record-consent] lookup failed:", existing.error.message);
    return reply(500, { error: "Could not check your agreement" });
  }
  const current = existing.data?.[0];
  if (request.action === "status" || current) {
    return reply(200, { granted: !!current, grantedAt: current?.granted_at ?? null });
  }

  const grantedAt = new Date().toISOString();
  const { error: insertError } = await admin.from("user_consents").insert({
    user_id: user.id,
    consent_type: CONSENT_TYPE,
    granted: true,
    granted_at: grantedAt,
    version: request.version,
    ip_address: clientIp(req.headers),
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    metadata: { form: request.form, statements: request.statements },
  });
  if (insertError) {
    console.error("[record-consent] insert failed:", insertError.message);
    return reply(500, { error: "Could not save your agreement" });
  }
  return reply(200, { granted: true, grantedAt });
});
