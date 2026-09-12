// Ollama model registry: one canonical model per role, so local AI calls
// route by role ('reasoning' | 'agent' | 'coding' | 'embedding') instead of
// a single free-text model. Fail-closed: a role always resolves to its
// registry id (or an explicit user override); it never silently swaps roles.

export type OllamaModelRole = 'reasoning' | 'agent' | 'coding' | 'embedding';

export interface OllamaModelSpec {
  id: string;
  fallback?: string;
  useCase: string;
}

export const OLLAMA_MODELS: Record<OllamaModelRole, OllamaModelSpec> = {
  reasoning: {
    id: 'deepseek-r1:14b',
    fallback: 'deepseek-r1:7b',
    useCase: 'Explanations, polymath learning, complex reasoning',
  },
  agent: {
    id: 'hermes3:8b',
    useCase: 'Tool use, structured outputs, agent orchestration',
  },
  coding: {
    id: 'qwen2.5-coder:7b',
    useCase: 'Code completion, debugging, technical explanations',
  },
  embedding: {
    id: 'nomic-embed-text',
    useCase: 'RAG document retrieval — required for polymath mode',
  },
};

export const OLLAMA_MODEL_ROLES = Object.keys(OLLAMA_MODELS) as OllamaModelRole[];

// Ollama's native API lives at {base}/api/chat (no /v1). Legacy persisted
// values may include the OpenAI-compatible /v1 suffix — normalize it away so
// every caller targets the real endpoint.
export function normalizeOllamaUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
}

// Resolves the model for a role. An explicit configured id (e.g. the user's
// ollamaChatModel / ollamaEmbeddingModel from settings) wins; otherwise the
// registry default for the role is used. Callers must treat the result as the
// one true model — never swap roles silently.
export function resolveOllamaModel(role: OllamaModelRole, configuredId?: string): string {
  const override = configuredId?.trim();
  return override && override.length > 0 ? override : OLLAMA_MODELS[role].id;
}

// ─── Availability detection (settings screen) ──────────────────────────────

export type OllamaModelStatus = 'available' | 'not_pulled' | 'unknown';

export interface OllamaTaggedModel {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
}

export async function getInstalledOllamaModels(ollamaUrl: string): Promise<string[]> {
  const base = normalizeOllamaUrl(ollamaUrl);
  const res = await fetch(`${base}/api/tags`);
  if (!res.ok) {
    throw new Error(`[ollama] GET ${base}/api/tags failed: HTTP ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { models?: OllamaTaggedModel[] };
  return (data.models ?? []).map((m) => m.name);
}

// Fail-closed status report: 'available' only when the PRIMARY model id is
// pulled. A present fallback still counts the slot as 'not_pulled' because
// calls never silently swap to a fallback model.
export async function checkOllamaModelAvailability(
  ollamaUrl: string,
): Promise<Record<OllamaModelRole, OllamaModelStatus>> {
  const result: Record<OllamaModelRole, OllamaModelStatus> = {
    reasoning: 'unknown',
    agent: 'unknown',
    coding: 'unknown',
    embedding: 'unknown',
  };

  try {
    const installed = new Set(await getInstalledOllamaModels(ollamaUrl));
    for (const role of OLLAMA_MODEL_ROLES) {
      result[role] = installed.has(OLLAMA_MODELS[role].id) ? 'available' : 'not_pulled';
    }
  } catch {
    // Connectivity or parse failure: leave every slot 'unknown'. The screen
    // renders this as a neutral state, never as 'available'.
  }

  return result;
}