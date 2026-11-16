// supabase/functions/ai-proxy/index.ts
// Deno edge function — holds GROQ_API_KEY server side, requires user JWT,
// rate limits per user, allowlists providers + models, caps max_tokens + body size.
// Never forwards arbitrary URLs; never echoes keys or raw upstream errors.
// Model allowlist MUST stay in sync with src/config/registry.ts SYSTEM_CONFIG.GROQ.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PROVIDER_ALLOWLIST = new Set(["groq"]);
const MODEL_ALLOWLIST = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_OUTPUT_TOKENS = 1000;
const DAILY_LIMIT = 200;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function handleHealthCheck(supabaseUrl: string, serviceRoleKey: string, groqApiKey: string): Promise<Response> {
  if (!groqApiKey) return json({ ok: false, model: DEFAULT_MODEL, error: "no groq key" }, 503);

  try {
    const gr = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    if (!gr.ok) {
      return json({ ok: false, model: DEFAULT_MODEL, error: `upstream HTTP ${gr.status}` }, 502);
    }

    return json({ ok: true, model: DEFAULT_MODEL });
  } catch (err) {
    return json({ ok: false, model: DEFAULT_MODEL, error: String(err) }, 503);
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health") && req.method === "GET") {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!SUPABASE_URL) return json({ ok: false, model: DEFAULT_MODEL, error: "misconfigured" }, 503);
    return handleHealthCheck(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", GROQ_API_KEY || "");
  }

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

  // Per-user daily rate limit — ATOMIC single SQL statement via RPC.
  // No SELECT-then-INSERT race: increment_daily_ai_calls() does the check
  // and increment in one statement. Fail closed: if the RPC returns count
  // above the limit, reject before any provider call.
  const newCount = await (async () => {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_daily_ai_calls`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ p_user_id: user.id, p_call_date: new Date().toISOString().slice(0, 10) }),
    });
    if (!rpcRes.ok) throw new Error(`daily cap RPC failed: HTTP ${rpcRes.status}`);
    const rpcBody = await rpcRes.json();
    return typeof rpcBody === 'number' ? rpcBody : rpcBody?.increment_daily_ai_calls ?? 0;
  })();

  if (newCount > DAILY_LIMIT) return json({ error: "daily AI call limit exceeded" }, 429);

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_BYTES) return json({ error: "too large" }, 413);
  let body: any;
  try { body = JSON.parse(bodyText); } catch { return json({ error: "bad json" }, 400); }

  // Allowlist providers AND models.
  const provider = body?.provider && PROVIDER_ALLOWLIST.has(body.provider) ? body.provider : null;
  if (!provider) return json({ error: "provider not allowed" }, 400);

  const requestedModel = body?.model;
  const model = MODEL_ALLOWLIST.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

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
