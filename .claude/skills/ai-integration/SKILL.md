---
name: ai-integration
description: Use this skill when the conversation requires integrating AI services (such as image analysis, text generation, intelligent recognition, etc.) to generate integration code based on AI gateway or API
---

# AI Integration

## Before Starting - Supabase Integration Check

**CRITICAL**: AI Integration requires Supabase as the backend (uses Supabase Edge Functions). Always check Supabase integration status before proceeding:

**Step 1: Check Existing Supabase Integration**

Check if Supabase is already integrated:
- Look for `src/lib/supabase.ts` file
- Check `.env` file for Supabase environment variables:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_URL`

**Step 2: Handle Based on Status**

**If Supabase is already integrated** (supabase.ts exists with valid configuration):
- ✓ Inform user: "Supabase is already integrated. Proceeding with AI integration..."
- Continue with AI integration workflow below

**If Supabase is NOT integrated** (no supabase.ts):
- ⚠️ Stop immediately and inform user: "AI integration requires Supabase backend. Setting up Supabase first..."
- Call `supabase-enable` tool or use the `supabase-integration` skill
- Follow the complete Supabase setup workflow:
  1. Install `@supabase/supabase-js` dependency
  2. Create `.env` file with Supabase credentials
  3. Create `src/lib/supabase.ts` client configuration
  4. Create `supabase/migrations` directory
- After Supabase setup is complete, proceed with AI integration

---

## Overview
  
When users need to integrate AI functionality into their projects, use this skill to generate standardized AI service integration code. Supports multiple AI capabilities: vision recognition, text analysis, content generation, etc.

**Tech Stack:** Supabase Functions (Deno + TypeScript) + Supabase Client

**Generated Code Structure:**
- Backend: `supabase/functions/<function-name>/index.ts` (Supabase Edge Function)
- Frontend: Direct invocation using `supabase.functions.invoke()` or API (supports both standard and streaming responses)

**Core Principles:** Generate reliable, scalable, and maintainable AI integration code

**Announce at the start:** "I'm using the ai-integration skill to generate AI integration code for you."

## When to Use This Skill

```
Trigger Conditions (use if any are met):
- User explicitly mentions "AI analysis", "intelligent recognition", "image recognition"
- Need to call large language model APIs (GPT, Claude, Gemini, etc.)
- Need visual AI capabilities (OCR, object recognition, image analysis)
- Need text AI capabilities (translation, summarization, sentiment analysis)
- User asks "how to integrate AI"
```

## Supabase Project Structure

After generating AI integration code, the project structure looks like this:

```
project-root/
├── supabase/
│   ├── functions/
│   │   ├── <function-name-1>/
│   │   │   └── index.ts          # AI Feature 1
│   │   ├── <function-name-2>/
│   │   │   └── index.ts          # AI Feature 2
│   │   └── <function-name-3>/
│   │       └── index.ts          # AI Feature 3
│   ├── .env.local                # Functions environment variables
│   └── config.toml               # Supabase configuration
├── src/
│   ├── lib/
│   │   └── supabase.ts           # Supabase Client configuration
│   └── ...
└── .env                          # Frontend environment variables (VITE_SUPABASE_URL, etc.)
```

## AI Integration Architecture Patterns

### 1. Backend API Pattern (Recommended for Production)

**Use Cases:**
- Need to protect API keys
- Need rate limiting and usage control
- Need data preprocessing or postprocessing
- Need caching or logging

**Architecture:**
```
Frontend → Backend API → AI Gateway/Service → AI Provider
```

### 2. Client Direct Connection Pattern

**Use Cases:**
- Prototyping or demos
- Using user's own API keys
- Scenarios requiring extremely high real-time performance

**Architecture:**
```
Frontend → AI Gateway/Service → AI Provider
```

## Standard Code Templates

### Backend API Endpoint Template (Supabase Functions)

**File Location:** `supabase/functions/<function-name>/index.ts`

Examples:
- `supabase/functions/ai-analysis/index.ts`
- `supabase/functions/ai-process/index.ts`
- `supabase/functions/ai-service/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRequest {
  // Define request parameters based on specific AI functionality
  input: string | object;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AIRequest = await req.json();

    // Validate input
    if (!requestData.input) {
      return new Response(
        JSON.stringify({ error: "Missing required input parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key (from environment variables)
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      console.error("AI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing AI request...");

    // Call AI service (using Needware AI gateway as example)
    const response = await fetch("https://ai.gateway.needware.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: requestData.options?.model || "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional AI assistant. Provide accurate and helpful responses based on user needs."
          },
          {
            role: "user",
            content: typeof requestData.input === 'string' 
              ? requestData.input 
              : JSON.stringify(requestData.input)
          }
        ],
        temperature: requestData.options?.temperature || 0.7,
        max_tokens: requestData.options?.maxTokens || 1000,
      }),
    });

    // Handle error response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI service error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Request rate too high, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No AI response generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI processing completed");

    // Return processing result
    return new Response(
      JSON.stringify({ 
        result: content,
        model: requestData.options?.model || "google/gemini-2.5-flash"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Frontend Usage Template (TypeScript)

**Prerequisites:** Supabase Client configured in `src/lib/supabase.ts`

```typescript
// src/lib/supabase.ts (if not already present)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Direct Usage in React Component:**

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ImageAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async (imageData: string) => {
    setIsAnalyzing(true);

    try {
      // Directly invoke Supabase Function
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { 
          image: imageData,
          prompt: "Please analyze this image in detail"
        }
      });

      // Check invocation error
      if (error) {
        throw error;
      }

      // Check business error in response
      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast.success("Analysis completed");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ... component render
}
```

**Text Analysis Example:**

```typescript
const handleTextAnalysis = async (text: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-text-analysis', {
      body: { 
        text,
        analysisType: 'summary'
      }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Use data.result
    console.log(data.result);
  } catch (error) {
    console.error("Text analysis error:", error);
  }
};
```

### Streaming Chat Template (Frontend)

**Use Case:** Real-time streaming responses for chat applications

**Type Definitions and Streaming Function:**

```typescript
// Define message type
export type Message = { 
  role: "user" | "assistant"; 
  content: string;
  id: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        messages: messages.map(m => ({ role: m.role, content: m.content })) 
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        onError(errorData.error || "Request rate too high, please try again later");
        return;
      }
      if (resp.status === 402) {
        onError(errorData.error || "Insufficient quota, please recharge to continue");
        return;
      }
      onError(errorData.error || "Connection failed, please retry");
      return;
    }

    if (!resp.body) {
      onError("Unable to get response stream");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    console.error("Stream chat error:", e);
    onError("Network connection failed, please check your network and retry");
  }
}
```

**React Component Usage Example:**

```typescript
import { useState } from 'react';
import { streamChat, Message } from '@/lib/streamChat';
import { toast } from 'sonner';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");

  const handleSendMessage = async (userMessage: string) => {
    // Add user message
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Prepare assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    setCurrentResponse("");
    setIsStreaming(true);

    await streamChat({
      messages: [...messages, newMessage],
      onDelta: (deltaText) => {
        setCurrentResponse(prev => prev + deltaText);
      },
      onDone: () => {
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: currentResponse,
        }]);
        setCurrentResponse("");
        setIsStreaming(false);
      },
      onError: (error) => {
        toast.error(error);
        setIsStreaming(false);
        setCurrentResponse("");
      },
    });
  };

  // ... component render
}
```

### Image Analysis Specialized Template

Use this template when users need image analysis functionality.

**File Location:** `supabase/functions/analyze-image/index.ts`

```typescript
// supabase/functions/analyze-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, prompt } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing image...");

    const response = await fetch("https://ai.gateway.needware.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Model with vision support
        messages: [
          {
            role: "system",
            content: "You are a professional image analysis expert. Please analyze image content in detail and provide accurate descriptions."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt || "Please analyze the content of this image in detail"
              },
              {
                type: "image_url",
                image_url: {
                  url: image // Supports data:image/... or https://...
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI service error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Image analysis failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    // If expecting structured JSON, try to parse
    let structuredResult;
    try {
      const jsonMatch = analysis.match(/```json\n?([\s\S]*?)\n?```/) || analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        structuredResult = JSON.parse(jsonStr);
      }
    } catch (parseError) {
      console.log("Response is not JSON format, returning raw text");
      structuredResult = { analysis };
    }

    console.log("Image analysis completed");

    return new Response(
      JSON.stringify({ 
        result: structuredResult || analysis,
        model: "google/gemini-2.5-flash"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Image analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Implementation Checklist

When users request AI integration, follow these steps:

### Step 1: Requirements Analysis
- [ ] Confirm AI functionality type (image/text/speech/other)
- [ ] Confirm input/output formats
- [ ] Confirm if structured response is needed
- [ ] Confirm performance requirements (response time, concurrency)

### Step 2: Choose Architecture
- [ ] Backend API pattern ✅ Recommended (more secure)
- [ ] Client direct connection pattern

### Step 3: Choose AI Provider
- [ ] Needware AI Gateway (out-of-the-box, multi-model support)
- [ ] OpenAI (GPT series)
- [ ] Anthropic (Claude series)
- [ ] Google (Gemini series)
- [ ] Other custom APIs

### Step 4: Install Dependencies
If @supabase/supabase-js is not present, install it

**Install Supabase Client for Frontend:**
```bash
pnpm add @supabase/supabase-js
```

### Step 5: Implement Code
- [ ] Create Supabase Function (path: `supabase/functions/<function-name>/index.ts`)
- [ ] Create Supabase Client configuration (path: `src/lib/supabase.ts`)
- [ ] Use `supabase.functions.invoke()` directly in components
- [ ] Add error handling (check both `error` and `data.error`)
- [ ] Add request logging and monitoring

**Supabase Function Naming Convention:**
- Use kebab-case naming: `ai-service`, `ai-process`, `ai-handler`, etc.
- Function names should clearly express functionality
- Each feature gets its own independent function directory

### Step 6: Configure Environment Variables

**Configure in Supabase Dashboard:**
1. Go to Project Settings → Edge Functions → Secrets
2. Add environment variables:
   - `AI_API_KEY`: Your AI service API key
   - `AI_MODEL`: (Optional) Default model name
   - `AI_MAX_TOKENS`: (Optional) Maximum token count

**Or use Supabase CLI:**
```bash
# Set secrets
supabase secrets set AI_API_KEY=your_api_key_here
supabase secrets set AI_MODEL=google/gemini-2.5-flash
supabase secrets set AI_MAX_TOKENS=2000
```

**Local Development Environment Variables:**
Create `supabase/.env.local` file (for Supabase Functions):
```bash
AI_API_KEY=your_api_key_here
AI_MODEL=google/gemini-2.5-flash
AI_MAX_TOKENS=2000
```

**Frontend Environment Variables:**
Configure in `.env` or `.env.local` file:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 7: Testing

**Test Supabase Function Locally:**
```bash
# Start local Supabase
supabase start

# Deploy function locally
supabase functions serve <function-name>

# Test invocation (text example)
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"text":"test text","options":{"model":"google/gemini-2.5-flash"}}'

# Test invocation (image example)
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"image":"data:image/png;base64,...","prompt":"Please analyze this image"}'
```

**Deploy to Production:**
```bash
# Deploy function
supabase functions deploy <function-name>

# View logs
supabase functions logs <function-name>
```


## Best Practices

### Security
- ✅ **Never** expose API keys in the frontend
- ✅ Use environment variables to store sensitive information
- ✅ Implement request rate limiting
- ✅ Validate and sanitize user input
- ✅ Add request size limits

### Cost Control
- ✅ Choose cost-effective models
- ✅ Optimize prompt length
- ✅ Limit max_tokens parameter
- ✅ Implement usage monitoring and alerts
- ✅ Consider using batch processing to reduce costs

## Error Handling Checklist

```typescript
// Standard error handling pattern
const handleAIError = (error: any, statusCode: number) => {
  const errorMap: Record<number, string> = {
    400: "Invalid request parameters",
    401: "API key invalid or expired",
    402: "Insufficient account balance or quota exhausted",
    403: "No permission to access this API",
    404: "API endpoint does not exist",
    429: "Too many requests, please try again later",
    500: "AI service internal error",
    503: "AI service temporarily unavailable",
  };

  return {
    error: errorMap[statusCode] || "Unknown error",
    statusCode,
    originalError: error?.message,
    timestamp: new Date().toISOString(),
  };
};
```

## When NOT to Use This Skill

❌ **Do not use in the following situations:**
- Simple frontend UI components (not involving AI)
- Pure data processing logic (no AI inference needed)
- Static content display
- User is just asking about AI concepts (just provide explanation)

## Final Reminders

**After completing AI integration, must:**
1. ✅ Test all error scenarios
2. ✅ Verify API key configuration
3. ✅ Check response format correctness
4. ✅ Test edge cases (extra-long input, special characters, etc.)
5. ✅ Confirm smooth user experience
6. ✅ Add usage documentation and examples

**Remember: AI integration is not "set it and forget it", requires continuous monitoring and optimization.**

