import { supabase } from "@/integrations/supabase/client";

/**
 * The parent's permission to use their child's details, asked once on the
 * "Before we begin" card before the parent form's first question (tracker T27).
 * Saved on the server by the record-consent edge function: the browser can't
 * write the consent table itself.
 *
 * PARENT_CONSENT_VERSION names this exact wording. Never edit the wording under
 * the same version: add a new version here and in
 * backend/supabase/functions/_shared/consent.ts, and every parent sees the card
 * again.
 */
export const PARENT_CONSENT_VERSION = "parent-2026-11-24";

/** The two boxes on the card; both must be ticked. Keys match the server's list. */
export const PARENT_CONSENT_STATEMENTS = [
  { key: "parent_or_guardian", label: "I'm 18 or over, and I'm this child's parent or legal guardian." },
  { key: "child_data_use", label: "I agree to Globiculum using my child's details as described here to make the report." },
] as const;

export interface ConsentStatus {
  granted: boolean;
  grantedAt: string | null;
}

async function call(body: Record<string, unknown>): Promise<ConsentStatus> {
  const { data, error } = await supabase.functions.invoke("record-consent", {
    body: { version: PARENT_CONSENT_VERSION, form: "parent", ...body },
  });
  if (error || typeof data?.granted !== "boolean") throw new Error("record-consent failed");
  return { granted: data.granted, grantedAt: data.grantedAt ?? null };
}

/** Whether the signed-in parent has agreed to the current wording. */
export const getParentConsent = () => call({ action: "status" });

/** Saves the agreement (both statements). Agreeing again keeps the first record. */
export const recordParentConsent = () =>
  call({ action: "grant", statements: PARENT_CONSENT_STATEMENTS.map((s) => s.key) });
