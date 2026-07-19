import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    // Fetch the shared report record
    const { data: shared, error: sharedError } = await client
      .from("shared_reports")
      .select("report_id, expires_at")
      .eq("token", token)
      .single();

    if (sharedError || !shared) {
      return new Response(
        JSON.stringify({ error: "Report not found or link is invalid" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(shared.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This shared link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the actual report
    const { data: report, error: reportError } = await client
      .from("saved_reports")
      .select("id, title, form_data, analysis_data, created_at")
      .eq("id", shared.report_id)
      .is("deleted_at", null)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: "Report no longer exists" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student profile for the report owner
    const { data: savedReport } = await client
      .from("saved_reports")
      .select("user_id")
      .eq("id", shared.report_id)
      .single();

    let studentName = "Student";
    if (savedReport) {
      const { data: profile } = await client
        .from("student_profiles")
        .select("student_name")
        .eq("user_id", savedReport.user_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (profile) studentName = profile.student_name;
    }

    return new Response(
      JSON.stringify({
        report: {
          ...report,
          student_name: studentName,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch shared report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
