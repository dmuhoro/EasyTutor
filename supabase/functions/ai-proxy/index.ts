// supabase/functions/ai-proxy/index.ts
// Deno edge function — holds GROQ_API_KEY server side, requires user JWT,
// rate limits per user, allowlists providers + models, caps max_tokens + body size.
// Never forwards arbitrary URLs; never echoes keys or raw upstream errors.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PROVIDER_ALLOWLIST = new Set(["groq"]);
const MODEL_ALLOWLIST = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const MAX_BODY_BYTES = 16 * 1024;
const MAX_OUTPUT_TOKENS = 1000;
const DAILY_LIMIT = 200;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function todaysCallCount(supabaseUrl: string, serviceRoleKey: string, userId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/ai_call_logs?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${dayStart.toISOString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "no jwt" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "misconfigured" }, 503);
  if (!GROQ_API_KEY) return json({ error: "no groq key" }, 503);

  // Validate user with service role (rejects anonymous/invalid JWT).
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${jwt}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
  });
  if (!userRes.ok) return json({ error: "invalid jwt" }, 401);
  const user = await userRes.json();
  if (!user || !user.id) return json({ error: "invalid jwt" }, 401);

  // Per-user daily rate limit.
  const count = await todaysCallCount(SUPABASE_URL, SERVICE_ROLE_KEY, user.id);
  if (count >= DAILY_LIMIT) return json({ error: "rate limit exceeded" }, 429);

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_BYTES) return json({ error: "too large" }, 413);
  let body: any;
  try { body = JSON.parse(bodyText); } catch { return json({ error: "bad json" }, 400); }

  // Allowlist providers AND models.
  const provider = body?.provider && PROVIDER_ALLOWLIST.has(body.provider) ? body.provider : null;
  if (!provider) return json({ error: "provider not allowed" }, 400);

  const model = body?.model && MODEL_ALLOWLIST.has(body.model) ? body.model : "llama-3.1-8b-instant";

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) return json({ error: "no messages" }, 400);

  // Cap max_tokens; never forward an arbitrary upstream URL.
  const requestedMaxTokens = Number(body?.max_tokens) || 0;
  const maxTokens = requestedMaxTokens > 0 ? Math.min(requestedMaxTokens, MAX_OUTPUT_TOKENS) : MAX_OUTPUT_TOKENS;

  const gr = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: body?.systemPrompt || "" }, ...messages],
    }),
  });

  if (!gr.ok) return json({ error: "upstream provider error" }, 502);
  const raw = await gr.json().catch(() => ({}));
  const content = raw?.choices?.[0]?.message?.content || "";

  // Append-only log without message content and without echoing upstream errors/keys.
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_call_logs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body: JSON.stringify({ user_id: user.id, feature: "proxy", provider, model, success: true }),
    });
  } catch { /* ignore */ }

  return json({ content });
});
