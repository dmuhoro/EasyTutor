# Pass 6 – AI and offline truth
Defaults:
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
    id: 'qwen2.5:1.5b',
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
Offline tests:
adaptive.system.test.ts
ai.quiz.test.ts
ai.system.test.ts
dashboard.habits.test.ts
database.governance.test.ts
launch.hardening.test.ts
learning.flow.test.ts
offline.rag.test.ts
ollama.offline.test.ts
onboarding.flow.test.ts
orchestration.contract.test.ts
polymath.flow.test.ts
progress.flow.test.ts
progress.system.test.ts
quiz.batch.test.ts
quiz.flow.test.ts
semantic.performance.test.ts
session.intelligence.test.ts
sync.flow.test.ts
voice.tutor.test.ts
