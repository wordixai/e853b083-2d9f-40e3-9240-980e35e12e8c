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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 查找48小时内没有签到的用户
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // 获取所有用户的最后签到时间
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`
        id,
        device_id,
        checkins (
          checked_at
        ),
        emergency_contacts (
          id,
          name,
          email
        )
      `);

    if (usersError) throw usersError;

    const emailsSent = [];

    for (const user of users || []) {
      // 获取最后签到时间
      const checkins = user.checkins || [];
      const lastCheckin = checkins.length > 0
        ? checkins.reduce((latest: any, current: any) =>
            new Date(current.checked_at) > new Date(latest.checked_at) ? current : latest
          )
        : null;

      // 检查是否超过48小时未签到
      const isInactive = !lastCheckin || new Date(lastCheckin.checked_at) < new Date(cutoffTime);

      if (!isInactive) continue;

      // 获取紧急联系人
      const contacts = user.emergency_contacts || [];
      if (contacts.length === 0) continue;

      // 检查是否已在24小时内发送过邮件（避免重复发送）
      const emailCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentEmails } = await supabase
        .from("email_logs")
        .select("contact_id")
        .eq("user_id", user.id)
        .gte("sent_at", emailCutoff);

      const recentContactIds = new Set((recentEmails || []).map((e: any) => e.contact_id));

      // 给每个未通知的联系人发送邮件
      for (const contact of contacts) {
        if (recentContactIds.has(contact.id)) continue;

        const lastCheckinDate = lastCheckin
          ? new Date(lastCheckin.checked_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
          : "从未签到";

        // 使用 Resend 发送邮件
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "死了么 <onboarding@resend.dev>",
            to: contact.email,
            subject: "⚠️ 紧急通知：您关心的人已超过48小时未签到",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #e74c3c;">⚠️ 紧急通知</h1>
                <p>尊敬的 ${contact.name}：</p>
                <p>您被设置为某位用户的紧急联系人。该用户已经<strong>超过 48 小时</strong>未在"死了么"应用中签到。</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>最后签到时间：</strong>${lastCheckinDate}</p>
                </div>
                <p>请尽快联系确认该用户的安全情况。</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">此邮件由"死了么"应用自动发送，请勿回复。</p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          // 记录已发送的邮件
          await supabase.from("email_logs").insert({
            user_id: user.id,
            contact_id: contact.id,
            type: "alert",
          });

          emailsSent.push({
            userId: user.id,
            contactEmail: contact.email,
            contactName: contact.name,
          });
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${contact.email}:`, errorText);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${users?.length || 0} users, sent ${emailsSent.length} emails`,
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
