// ai-proxy health logic. Uses only Web-standard APIs (fetch / Response) so it
// runs unchanged in Deno (the edge runtime) and can be tested in Node/vitest.
// No Deno-only globals live here.
export const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
export const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface HealthDeps {
  groqApiKey: string;
  modelAllowlist: readonly string[];
  fetchImpl?: typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * W1-2e / ADR-009: health is derived from the provider's LIVE model list,
 * intersected with the configured allowlist — no model name is hardcoded here.
 * A friendly, non-echoing error is returned on every failure path: raw upstream
 * errors (which may contain the key) are never surfaced to the caller.
 */
export async function checkProxyHealth(deps: HealthDeps): Promise<Response> {
  const {
    groqApiKey,
    modelAllowlist,
    fetchImpl = fetch,
  } = deps;

  if (!groqApiKey) {
    return json({ ok: false, error: "AI provider key is not configured." }, 503);
  }

  let available: string[];
  try {
    const listRes = await fetchImpl(GROQ_MODELS_ENDPOINT, {
      headers: { authorization: `Bearer ${groqApiKey}` },
    });
    if (!listRes.ok) {
      return json({ ok: false, error: `AI provider model list is unavailable (HTTP ${listRes.status}).` }, 502);
    }
    const listBody = await listRes.json();
    available = Array.isArray(listBody?.data)
      ? listBody.data.map((m: unknown) => String((m as { id?: unknown })?.id ?? "")).filter(Boolean)
      : [];
  } catch {
    return json({ ok: false, error: "Could not reach the AI provider model list." }, 503);
  }

  // Intersect the live list with the allowlist, preserving allowlist order.
  const callable = modelAllowlist.filter((m) => available.includes(m));
  if (callable.length === 0) {
    return json({
      ok: false,
      error: "No allowlisted AI model is currently available for the configured key.",
      availableModelCount: available.length,
    }, 503);
  }

  // Probe the first callable model to confirm it is actually invocable.
  const probeModel = callable[0];
  try {
    const probeRes = await fetchImpl(GROQ_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${groqApiKey}` },
      body: JSON.stringify({ model: probeModel, max_tokens: 5, messages: [{ role: "user", content: "ping" }] }),
    });
    if (!probeRes.ok) {
      return json({ ok: false, model: probeModel, error: `AI model probe failed (HTTP ${probeRes.status}).` }, 502);
    }
    return json({ ok: true, model: probeModel, callableModels: callable });
  } catch {
    return json({ ok: false, model: probeModel, error: "AI model probe could not reach the provider." }, 503);
  }
}
