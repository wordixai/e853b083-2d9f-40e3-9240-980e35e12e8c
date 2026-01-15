import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取用户的紧急联系人
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", userId);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "没有紧急联系人" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 获取用户最后签到时间
    const { data: lastCheckin } = await supabase
      .from("checkins")
      .select("checked_at")
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    const lastCheckinDate = lastCheckin
      ? new Date(lastCheckin.checked_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
      : "从未签到";

    const emailsSent = [];

    // 给所有联系人发送邮件
    for (const contact of contacts) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "死了么 <onboarding@resend.dev>",
          to: contact.email,
          subject: "⚠️ 紧急通知：您关心的人需要您的关注",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #e74c3c;">⚠️ 紧急通知</h1>
              <p>尊敬的 ${contact.name}：</p>
              <p>您被设置为某位用户的紧急联系人。该用户主动触发了紧急通知，请您尽快确认其安全状况。</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>最后签到时间：</strong>${lastCheckinDate}</p>
              </div>
              <p style="color: #e74c3c;"><strong>请立即联系确认该用户的安全情况！</strong></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">此邮件由"死了么"应用发送，请勿回复。</p>
            </div>
          `,
        }),
      });

      if (emailResponse.ok) {
        emailsSent.push({ email: contact.email, name: contact.name });
      } else {
        const errorText = await emailResponse.text();
        console.error(`Failed to send email to ${contact.email}:`, errorText);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功发送 ${emailsSent.length} 封邮件`,
        emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
