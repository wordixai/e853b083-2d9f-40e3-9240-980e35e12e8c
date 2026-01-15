import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

        try {
          const emailResponse = await resend.emails.send({
            from: "死了么 <onboarding@resend.dev>",
            to: [contact.email],
            subject: "⚠️ 紧急通知：您关心的人已超过48小时未签到",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                  ⚠️ 紧急通知
                </h1>
                <p>您好，${contact.name}：</p>
                <p>您被设置为某位用户的紧急联系人。该用户已经<strong>超过 48 小时</strong>未在"死了么"应用中签到。</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #991b1b;">
                    <strong>最后签到时间：</strong>${lastCheckinDate}
                  </p>
                </div>
                <p style="color: #e74c3c; font-weight: bold;">
                  请尽快联系确认该用户的安全情况！
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">
                  此邮件由"死了么"应用自动发送，请勿回复。
                </p>
              </div>
            `,
          });

          if (emailResponse.data) {
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
          }
        } catch (emailError: any) {
          console.error(`Failed to send email to ${contact.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${users?.length || 0} users, sent ${emailsSent.length} emails`,
        emailsSent,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
