import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller has admin role using their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await serviceClient
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch auth users to get emails
    const { data: { users: authUsers }, error: authError } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
    if (authError) throw authError;

    const emailMap: Record<string, string> = {};
    for (const u of authUsers) {
      emailMap[u.id] = u.email ?? "";
    }

    // Fetch report counts per user
    const { data: reports, error: reportsError } = await serviceClient
      .from("saved_reports")
      .select("id, user_id, analysis_data, form_data, created_at, title")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (reportsError) throw reportsError;

    // Count reports per user
    const reportCountMap: Record<string, number> = {};
    for (const r of reports ?? []) {
      reportCountMap[r.user_id] = (reportCountMap[r.user_id] || 0) + 1;
    }

    // Fetch student profiles for student names and curriculum info
    const { data: studentProfiles } = await serviceClient
      .from("student_profiles")
      .select("user_id, student_name, previous_curriculum, target_curriculum")
      .is("deleted_at", null);

    const studentMap: Record<string, { student_name: string; previous_curriculum: string; target_curriculum: string }> = {};
    for (const sp of studentProfiles ?? []) {
      studentMap[sp.user_id] = {
        student_name: sp.student_name,
        previous_curriculum: sp.previous_curriculum,
        target_curriculum: sp.target_curriculum,
      };
    }

    // Build users response
    const usersData = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: emailMap[p.id] ?? "",
      created_at: p.created_at,
      report_count: reportCountMap[p.id] ?? 0,
    }));

    // Build reports response
    const reportsData = (reports ?? []).map((r) => {
      const analysis = r.analysis_data as Record<string, any> ?? {};
      const student = studentMap[r.user_id];
      return {
        id: r.id,
        user_email: emailMap[r.user_id] ?? "",
        student_name: student?.student_name ?? "Unknown",
        alignment_percentage: analysis?.overallAlignment?.percentage ?? 0,
        previous_curriculum: student?.previous_curriculum ?? "",
        target_curriculum: student?.target_curriculum ?? "",
        created_at: r.created_at,
        title: r.title,
      };
    });

    return new Response(
      JSON.stringify({ users: usersData, reports: reportsData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin data error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
