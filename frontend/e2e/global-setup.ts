import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "./localSupabase";
import { ANALYSIS_DATA, DELETED_REPORT_ID, FORM_DATA, PARENT_A, PARENT_B, PASSWORD, REPORT_ID, REPORT_TITLE, TOKENS } from "./testData";

// Recreates the test accounts and reports in the local Supabase before each run.
export default async function globalSetup() {
  const sb = localSupabase();
  const admin = createClient(sb.url, sb.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const emails = [PARENT_A.email, PARENT_B.email];
  const old = list.users.filter((u) => emails.includes(u.email ?? ""));
  if (old.length) {
    // saved_reports.user_id has no foreign key to auth.users, so delete the
    // reports first (their share links go with them: ON DELETE CASCADE).
    const { error } = await admin.from("saved_reports").delete().in("user_id", old.map((u) => u.id));
    if (error) throw error;
    for (const u of old) {
      const { error: delError } = await admin.auth.admin.deleteUser(u.id);
      if (delError) throw delError;
    }
  }

  const ids: Record<string, string> = {};
  for (const p of [PARENT_A, PARENT_B]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: p.name },
    });
    if (error) throw error;
    ids[p.email] = data.user.id;
  }

  const owner = ids[PARENT_A.email];
  const { error: reportError } = await admin.from("saved_reports").insert([
    { id: REPORT_ID, user_id: owner, title: REPORT_TITLE, form_data: FORM_DATA, analysis_data: ANALYSIS_DATA },
    {
      id: DELETED_REPORT_ID,
      user_id: owner,
      title: REPORT_TITLE,
      form_data: FORM_DATA,
      analysis_data: ANALYSIS_DATA,
      deleted_at: new Date().toISOString(),
    },
  ]);
  if (reportError) throw reportError;

  const day = 24 * 60 * 60 * 1000;
  const { error: shareError } = await admin.from("shared_reports").insert([
    { user_id: owner, report_id: REPORT_ID, token: TOKENS.valid, expires_at: new Date(Date.now() + 7 * day).toISOString() },
    { user_id: owner, report_id: REPORT_ID, token: TOKENS.expired, expires_at: new Date(Date.now() - day).toISOString() },
    { user_id: owner, report_id: DELETED_REPORT_ID, token: TOKENS.deletedReport, expires_at: new Date(Date.now() + 7 * day).toISOString() },
  ]);
  if (shareError) throw shareError;
}
