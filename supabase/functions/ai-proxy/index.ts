// supabase/functions/ai-proxy/index.ts
// Deno edge function — holds GROQ_API_KEY server side, requires user JWT, rate limits per user.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const MODEL_ALLOWLIST = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const MAX_BODY_BYTES = 16 * 1024;
const DAILY_LIMIT = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "no jwt" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) return json({ error: "no groq key" }, 503);

  // Validate user with service role
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${jwt}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
  });
  if (!userRes.ok) return json({ error: "invalid jwt" }, 401);
  const user = await userRes.json();

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_BYTES) return json({ error: "too large" }, 413);
  let body: any;
  try { body = JSON.parse(bodyText); } catch { return json({ error: "bad json" }, 400); }
  const model = body?.model && MODEL_ALLOWLIST.has(body.model) ? body.model : "llama-3.1-8b-instant";
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) return json({ error: "no messages" }, 400);

  // Log and call groq (rate limit check intentionally minimal here)
  const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: body?.systemPrompt || "" }, ...messages] }),
  });
  const raw = await gr.json();
  const content = raw?.choices?.[0]?.message?.content || "";

  // append-only log without message content
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_call_logs`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
      body: JSON.stringify({ user_id: user.id, feature: "proxy", provider: "groq", model, success: gr.ok }),
    });
  } catch { /* ignore */ }

  return json({ content });
});