// ai-proxy request handler. Web-standard APIs only (Request/Response/fetch), so the
// production path runs unchanged in Deno and is exercised directly by Node/vitest.
// index.ts is a thin Deno adapter that injects Deno.env; no logic lives there.
//
// Auth, per-user daily cap, allowlists, body/token caps and error shapes are unchanged
// from the pre-CORS implementation. CORS is applied at the single response boundary:
// every return goes through `json`, `preflightResponse` or `withCors`.
import { checkProxyHealth, GROQ_CHAT_ENDPOINT } from "./health.ts";
import { allowedOrigins, jsonResponse, preflightResponse, withCors } from "./cors.ts";

export interface ProxyEnv {
  SUPABASE_URL?: string;
  SERVICE_ROLE_KEY?: string;
  GROQ_API_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

const PROVIDER_ALLOWLIST = new Set(["groq"]);
const MODEL_ALLOWLIST = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const DEFAULT_MODEL = [...MODEL_ALLOWLIST][0];
const MAX_BODY_BYTES = 16 * 1024;
const MAX_OUTPUT_TOKENS = 1000;
const DAILY_LIMIT = 200;

export async function handleProxyRequest(
  req: Request,
  env: ProxyEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins(env.ALLOWED_ORIGINS);
  const json = (body: unknown, status = 200) => jsonResponse(body, status, origin, allowed);

  if (req.method === "OPTIONS") return preflightResponse(origin, allowed);

  const url = new URL(req.url);
  if (url.pathname.endsWith("/health") && req.method === "GET") {
    if (!env.SUPABASE_URL) {
      return json({ ok: false, error: "AI proxy is misconfigured." }, 503);
    }
    return withCors(
      await checkProxyHealth({
        groqApiKey: env.GROQ_API_KEY || "",
        modelAllowlist: [...MODEL_ALLOWLIST],
        fetchImpl,
      }),
      origin,
      allowed,
    );
  }

  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "no jwt" }, 401);

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
  const GROQ_API_KEY = env.GROQ_API_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "misconfigured" }, 503);
  if (!GROQ_API_KEY) return json({ error: "no groq key" }, 503);

  // Validate user with service role (rejects anonymous/invalid JWT).
  const userRes = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${jwt}`, apikey: env.SUPABASE_ANON_KEY || "" },
  });
  if (!userRes.ok) return json({ error: "invalid jwt" }, 401);
  const user: unknown = await userRes.json();
  if (!user || typeof user !== 'object' || !('id' in user) || !(user as { id?: unknown }).id) {
    return json({ error: "invalid jwt" }, 401);
  }
  const userId = String((user as { id: unknown }).id);

  // Per-user daily rate limit — ATOMIC single SQL statement via RPC.
  // No SELECT-then-INSERT race: the RPC checks and increments in one statement.
  const newCount = await (async () => {
    const rpcRes = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/increment_daily_ai_calls`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ p_user_id: userId, p_call_date: new Date().toISOString().slice(0, 10) }),
    });
    if (!rpcRes.ok) throw new Error(`daily cap RPC failed: HTTP ${rpcRes.status}`);
    const rpcBody: unknown = await rpcRes.json();
    if (typeof rpcBody === 'number') return rpcBody;
    if (rpcBody && typeof rpcBody === 'object' && 'increment_daily_ai_calls' in rpcBody) {
      const value = (rpcBody as { increment_daily_ai_calls?: unknown }).increment_daily_ai_calls;
      return typeof value === 'number' ? value : 0;
    }
    return 0;
  })();

  if (newCount > DAILY_LIMIT) return json({ error: "daily AI call limit exceeded" }, 429);

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_BYTES) return json({ error: "too large" }, 413);
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const body = (parsedBody && typeof parsedBody === 'object' ? parsedBody : {}) as Record<string, unknown>;

  // Allowlist providers AND models.
  const provider = typeof body.provider === 'string' && PROVIDER_ALLOWLIST.has(body.provider) ? body.provider : null;
  if (!provider) return json({ error: "provider not allowed" }, 400);

  const requestedModel = body.model;
  const model = typeof requestedModel === 'string' && MODEL_ALLOWLIST.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return json({ error: "no messages" }, 400);

  // Cap max_tokens; never forward an arbitrary upstream URL.
  const requestedMaxTokens = Number(body.max_tokens) || 0;
  const maxTokens = requestedMaxTokens > 0 ? Math.min(requestedMaxTokens, MAX_OUTPUT_TOKENS) : MAX_OUTPUT_TOKENS;

  const gr = await fetchImpl(GROQ_CHAT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: typeof body.systemPrompt === 'string' ? body.systemPrompt : "" }, ...messages],
    }),
  });

  if (!gr.ok) return json({ error: "upstream provider error" }, 502);
  const raw: unknown = await gr.json().catch(() => ({}));
  const choices = raw && typeof raw === 'object' && 'choices' in raw ? (raw as { choices?: unknown }).choices : undefined;
  const first = Array.isArray(choices) ? choices[0] : undefined;
  const message = first && typeof first === 'object' && 'message' in first ? (first as { message?: unknown }).message : undefined;
  const content = message && typeof message === 'object' && 'content' in message
    ? (message as { content?: unknown }).content
    : "";
  const answer = typeof content === 'string' ? content : "";

  // Append-only log without message content and without echoing upstream errors/keys.
  try {
    await fetchImpl(`${SUPABASE_URL}/rest/v1/ai_call_logs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ user_id: userId, feature: "proxy", provider, model, success: true }),
    });
  } catch { /* ignore */ }

  return json({ content: answer });
}
