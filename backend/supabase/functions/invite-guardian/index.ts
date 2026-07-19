import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { guardianEmail, studentProfileId } = await req.json();

    if (!guardianEmail || !studentProfileId) {
      return new Response(JSON.stringify({ error: "Missing guardianEmail or studentProfileId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guardianEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the student profile belongs to this user
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("id, student_name")
      .eq("id", studentProfileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Student profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from("guardian_invitations")
      .select("id, status")
      .eq("guardian_email", guardianEmail)
      .eq("student_profile_id", studentProfileId)
      .maybeSingle();

    if (existing && existing.status === "pending") {
      return new Response(JSON.stringify({ error: "An invitation has already been sent to this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update invitation
    const { data: invitation, error: inviteError } = existing
      ? await supabase
          .from("guardian_invitations")
          .update({ status: "pending", accepted_at: null, token: crypto.randomUUID() })
          .eq("id", existing.id)
          .select("token")
          .single()
      : await supabase
          .from("guardian_invitations")
          .insert({
            parent_user_id: user.id,
            guardian_email: guardianEmail,
            student_profile_id: studentProfileId,
          })
          .select("token")
          .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend if API key is available
    if (resendApiKey) {
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const parentName = parentProfile?.full_name || "A parent";
      const studentName = profile.student_name;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">You've been invited as a guardian on Globiculum</h2>
          <p>${parentName} has invited you to view <strong>${studentName}</strong>'s educational progress and reports on Globiculum.</p>
          <p>As a guardian, you'll be able to:</p>
          <ul>
            <li>View curriculum alignment reports</li>
            <li>Monitor learning progress</li>
            <li>Access assessment results</li>
          </ul>
          <p>To get started, simply sign up or log in to Globiculum with this email address (<strong>${guardianEmail}</strong>). Your guardian access will be activated automatically.</p>
          <div style="margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL') || 'https://academi-align.app'}/auth" 
               style="background-color: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Globiculum <noreply@globiculum.com>",
            to: [guardianEmail],
            subject: `${parentName} invited you to view ${studentName}'s progress on Globiculum`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          console.error("Resend email failed:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the invite if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
