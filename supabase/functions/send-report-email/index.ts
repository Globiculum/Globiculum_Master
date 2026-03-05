import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  reportId: string;
  studentName: string;
  overallAlignmentPercentage: number;
  criticalGapCount: number;
  estimatedBridgeDuration: string;
  reportTitle: string;
}

const buildEmailHtml = (payload: EmailPayload, viewUrl: string): string => {
  const {
    studentName,
    overallAlignmentPercentage,
    criticalGapCount,
    estimatedBridgeDuration,
    reportTitle,
  } = payload;

  const alignmentColor =
    overallAlignmentPercentage >= 75
      ? "#0D9488"
      : overallAlignmentPercentage >= 50
      ? "#F59E0B"
      : "#EF4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 32px 40px; text-align: center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:-0.5px;">EduSetu</h1>
              <p style="margin:8px 0 0;color:#94A3B8;font-size:14px;">Curriculum Transition Readiness Report</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 16px;">
              <p style="margin:0;color:#0F172A;font-size:16px;">Hi there,</p>
              <p style="margin:12px 0 0;color:#475569;font-size:15px;line-height:1.6;">
                Your curriculum alignment report for <strong style="color:#0F172A;">${studentName}</strong> is ready. Here's a quick summary of the findings:
              </p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding:8px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Alignment Score -->
                  <td width="33%" style="padding:8px;">
                    <div style="background-color:#F8FAFC;border-radius:10px;padding:20px 16px;text-align:center;border:1px solid #E2E8F0;">
                      <div style="font-size:32px;font-weight:800;color:${alignmentColor};line-height:1;">${overallAlignmentPercentage}%</div>
                      <div style="font-size:12px;color:#64748B;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Alignment</div>
                    </div>
                  </td>
                  <!-- Critical Gaps -->
                  <td width="33%" style="padding:8px;">
                    <div style="background-color:#F8FAFC;border-radius:10px;padding:20px 16px;text-align:center;border:1px solid #E2E8F0;">
                      <div style="font-size:32px;font-weight:800;color:${criticalGapCount > 0 ? '#EF4444' : '#0D9488'};line-height:1;">${criticalGapCount}</div>
                      <div style="font-size:12px;color:#64748B;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Critical Gaps</div>
                    </div>
                  </td>
                  <!-- Duration -->
                  <td width="33%" style="padding:8px;">
                    <div style="background-color:#F8FAFC;border-radius:10px;padding:20px 16px;text-align:center;border:1px solid #E2E8F0;">
                      <div style="font-size:20px;font-weight:800;color:#0F172A;line-height:1.2;">${estimatedBridgeDuration}</div>
                      <div style="font-size:12px;color:#64748B;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Est. Duration</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="${viewUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0F172A,#1E293B);color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                View Full Report →
              </a>
            </td>
          </tr>

          <!-- Reassurance -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background-color:#F0FDFA;border-left:4px solid #0D9488;border-radius:0 8px 8px 0;padding:16px 20px;">
                <p style="margin:0;color:#0F172A;font-size:14px;line-height:1.5;">
                  💡 <strong>Remember:</strong> These insights are designed to help you prepare confidently — not to highlight deficiencies. Every transition is a step forward.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 40px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                This email was sent by EduSetu. You're receiving this because a report was generated for your account.
              </p>
              <p style="margin:8px 0 0;color:#CBD5E1;font-size:11px;">
                © ${new Date().getFullYear()} EduSetu — Bridging Education, Building Confidence
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: EmailPayload = await req.json();

    if (!body.reportId || !body.studentName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: reportId, studentName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the view URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://syllabysync-ai.lovable.app";
    const viewUrl = `${siteUrl}/reports`;

    const emailHtml = buildEmailHtml(body, viewUrl);

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EduSetu <onboarding@resend.dev>",
        to: [user.email],
        subject: `📊 ${body.studentName}'s Readiness Report — ${body.overallAlignmentPercentage}% Alignment`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", JSON.stringify(resendData));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email delivery failed [${resendResponse.status}]: ${resendData?.message || "Unknown error"}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", resendData.id);

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-report-email error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
