---
name: resend-integration
description: Complete Resend email integration for sending transactional emails, notifications, and alerts. REQUIRES Supabase integration as prerequisite (Resend functions run on Supabase Edge Functions). Use this skill when users mention sending emails, email notifications, transactional emails, or email alerts. 使用此技能处理邮件发送、邮件通知、事务性邮件等功能。必须先集成 Supabase 才能使用此技能。
---

# Resend Integration

## Before Starting - Integration Check

**CRITICAL**: Resend integration requires Supabase Edge Functions. Before proceeding, always check Supabase integration status:

**Step 1: Check Supabase Integration**

Check if Supabase is already integrated:
- Look for `src/lib/supabase.ts` file
- Check `.env` file for Supabase environment variables:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`

**Step 2: Handle Based on Status**

**If Supabase is already integrated** (supabase.ts exists with valid configuration):
- ✓ Proceed with Resend integration
- Inform user: "✓ Supabase is integrated. Proceeding with Resend setup."

**If Supabase is NOT integrated** (no supabase.ts or missing environment variables):
- ❌ Stop immediately
- Inform user: "⚠️ Supabase integration is required before setting up Resend. Resend email functions run on Supabase Edge Functions."
- Suggest: "Please enable Supabase first by saying 'Enable Cloud' or use the supabase-integration skill."
- Do NOT proceed with Resend setup until Supabase is properly configured

**Step 3: Add Resend API Key Secret**

Once Supabase is confirmed integrated:
1. Call `add-secret` tool to add the Resend API key
2. The tool will prompt user to add the `RESEND_API_KEY` secret
3. **IMMEDIATELY PAUSE and wait** - Do NOT proceed until user confirmation
4. Wait for user confirmation: `needware tool use: Approved`
5. Proceed to next step only after Approved


**Step 4: Verify Edge Functions Support**

Once Supabase is confirmed and Resend API key secret is added:
- Check if `supabase/functions/` directory exists
- If not, create the directory structure
- Proceed with Resend Edge Function creation

---

## Quick Start

### When to Use This Skill

Use this skill when working with:
- Transactional emails (welcome emails, password resets)
- Email notifications (alerts, reminders)
- Batch email sending
- HTML email templates
- Email verification and confirmation
- User communication

**关键原则**: 
- ✅ 使用 Resend 作为邮件发送服务
- ✅ 所有邮件功能通过 Supabase Edge Functions 实现
- ⚠️ **必须先集成 Supabase** - Resend 依赖 Supabase Edge Functions 运行

## Initial Setup

### Prerequisites

**Required**:
1. ✅ **Supabase must be integrated** - Resend functions run on Supabase Edge Functions
   - Verify `src/lib/supabase.ts` exists
   - Verify Supabase environment variables are configured
   - Verify `supabase/functions/` directory exists

2. 🔑 **Resend API key** - If no API key is available, remind user to:
   - Visit [Resend Dashboard](https://resend.com/api-keys)
   - Create a new API key
   - Add key to Supabase Edge Functions environment variables (`supabase/.env.local`)

### Installation in Edge Functions

**Step 1: Import Resend in Edge Function**

Create a new Edge Function file in `/supabase/functions/<function-name>/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
```

**Step 2: CORS Headers Setup**

Always include CORS headers for client-side invocation:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

## Email Sending Patterns

### Basic Email Template

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message }: EmailRequest = await req.json();

    const { data, error } = await resend.emails.send({
      from: "Your App <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: `<p>${message}</p>`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
```

### Batch Email Sending

Send emails to multiple recipients:

```typescript
interface BatchEmailRequest {
  recipients: {
    name: string;
    email: string;
  }[];
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, message }: BatchEmailRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send emails in parallel
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const emailResponse = await resend.emails.send({
          from: "Your App <onboarding@resend.dev>",
          to: [recipient.email],
          subject: subject,
          html: `<p>Hi ${recipient.name},</p><p>${message}</p>`,
        });
        return { 
          recipient: recipient.email, 
          response: emailResponse 
        };
      })
    );

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
```

### Alert Email Example

Complete example for sending alert emails:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  contacts: {
    name: string;
    email: string;
  }[];
  userName?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, userName = "用户", message }: AlertEmailRequest = await req.json();

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No contacts provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const results = await Promise.all(
      contacts.map(async (contact) => {
        const emailResponse = await resend.emails.send({
          from: "Your App <onboarding@resend.dev>",
          to: [contact.email],
          subject: `⚠️ Alert: ${userName} triggered notification`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
                ⚠️ Alert Notification
              </h1>
              <p>Hi ${contact.name},</p>
              <p>This is an alert notification from Your App.</p>
              <p><strong>${userName}</strong> ${message || "has triggered an alert notification."}</p>
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                  Please take appropriate action.
                </p>
              </div>
              <p style="color: #666; font-size: 14px;">
                This is an automated email from Your App.
              </p>
            </div>
          `,
        });
        return { contact: contact.email, response: emailResponse };
      })
    );

    console.log("Emails sent successfully:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
```

## Email Templates

### Welcome Email Template

```typescript
const welcomeEmailHTML = (userName: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h1>Welcome to Our App!</h1>
    <p>Hi ${userName},</p>
    <p>Thank you for signing up. We're excited to have you on board!</p>
    <a href="https://yourapp.com/get-started" 
       style="background: #3b82f6; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; display: inline-block;">
      Get Started
    </a>
  </div>
`;
```

### Password Reset Template

```typescript
const resetPasswordHTML = (resetLink: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h1>Reset Your Password</h1>
    <p>Click the button below to reset your password:</p>
    <a href="${resetLink}" 
       style="background: #ef4444; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      If you didn't request this, please ignore this email.
    </p>
  </div>
`;
```

### Notification Email Template

```typescript
const notificationEmailHTML = (title: string, content: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
      ${title}
    </h2>
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #374151;">${content}</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">
      This is an automated notification from Your App.
    </p>
  </div>
`;
```

## Invoking from Client

### Using Supabase Functions

```typescript
// In your React/Vue/etc. component
import { supabase } from '@/lib/supabase';

// Send single email
const sendEmail = async () => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: 'user@example.com',
      subject: 'Hello from Your App',
      message: 'This is a test email'
    }
  });

  if (error) {
    console.error('Error sending email:', error);
    return;
  }

  console.log('Email sent:', data);
};

// Send alert emails
const sendAlertEmails = async () => {
  const { data, error } = await supabase.functions.invoke('send-alert-email', {
    body: {
      contacts: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ],
      userName: '张三',
      message: '触发了紧急通知'
    }
  });

  if (error) {
    console.error('Error sending alerts:', error);
    return;
  }

  console.log('Alerts sent:', data);
};
```

## Common Use Cases

### 1. Welcome Emails
Send when user signs up:
```typescript
const { data, error } = await supabase.functions.invoke('send-welcome-email', {
  body: { email: user.email, name: user.name }
});
```

### 2. Password Reset
Send password reset link:
```typescript
const { data, error } = await supabase.functions.invoke('send-password-reset', {
  body: { email: user.email, resetToken: token }
});
```

### 3. Email Verification
Send verification code:
```typescript
const { data, error } = await supabase.functions.invoke('send-verification', {
  body: { email: user.email, code: verificationCode }
});
```

### 4. Transaction Confirmations
Send order/payment confirmations:
```typescript
const { data, error } = await supabase.functions.invoke('send-confirmation', {
  body: { email: user.email, orderDetails: order }
});
```

### 5. Scheduled Reminders
Send reminder emails:
```typescript
const { data, error } = await supabase.functions.invoke('send-reminder', {
  body: { email: user.email, reminderText: reminder }
});
```

## Best Practices

### 1. Email Sender Configuration

**✅ DO**:
- Use custom domain for production: `Your App <noreply@yourdomain.com>`
- Use descriptive sender names
- Keep sender email consistent

**❌ DON'T**:
- Use `onboarding@resend.dev` in production (for testing only)
- Change sender email frequently
- Use confusing sender names

### 2. Error Handling

Always handle errors gracefully:

```typescript
try {
  const { data, error } = await resend.emails.send({...});
  
  if (error) {
    console.error("Resend API error:", error);
    throw new Error(error.message);
  }
  
  return new Response(JSON.stringify({ success: true, data }), {...});
} catch (error: any) {
  console.error("Unexpected error:", error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500, headers: {...} }
  );
}
```

### 3. Rate Limiting

Implement rate limiting for batch sends:

```typescript
// Send emails in batches of 10
const batchSize = 10;
for (let i = 0; i < recipients.length; i += batchSize) {
  const batch = recipients.slice(i, i + batchSize);
  await Promise.all(batch.map(recipient => sendEmail(recipient)));
  // Add delay between batches if needed
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 4. HTML Email Best Practices

**✅ DO**:
- Use inline CSS styles
- Keep width under 600px
- Test on multiple email clients
- Include plain text fallback
- Use responsive design
- Add unsubscribe links (if applicable)

**❌ DON'T**:
- Use external CSS files
- Use JavaScript
- Use complex layouts
- Forget alt text for images

### 5. Security

**✅ DO**:
- Store API key in environment variables
- Validate input data
- Sanitize user-generated content
- Use HTTPS for all links
- Implement rate limiting

**❌ DON'T**:
- Hardcode API keys
- Trust user input without validation
- Include sensitive data in emails
- Allow arbitrary email sending


## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Templates Best Practices](https://resend.com/docs/send-with-react)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
