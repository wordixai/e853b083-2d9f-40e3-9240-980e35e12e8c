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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 获取用户的紧急联系人
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", userId);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "没有紧急联系人" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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

    // 发送邮件给所有联系人
    const results = await Promise.all(
      contacts.map(async (contact) => {
        const emailResponse = await resend.emails.send({
          from: "死了么 <onboarding@resend.dev>",
          to: [contact.email],
          subject: "⚠️ 紧急通知：您关心的人需要您的关注",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                ⚠️ 紧急通知
              </h1>
              <p>您好，${contact.name}：</p>
              <p>您被设置为某位用户的紧急联系人。该用户主动触发了紧急通知，请您尽快确认其安全状况。</p>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;">
                  <strong>最后签到时间：</strong>${lastCheckinDate}
                </p>
              </div>
              <p style="color: #e74c3c; font-weight: bold;">
                请立即联系确认该用户的安全情况！
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                此邮件由"死了么"应用发送，请勿回复。
              </p>
            </div>
          `,
        });
        return { contact: contact.email, response: emailResponse };
      })
    );

    console.log("Emails sent successfully:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功发送 ${results.length} 封邮件`,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
