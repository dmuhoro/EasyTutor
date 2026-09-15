// AI rail — provider calls go straight over fetch (no Node-stdlib SDK in the
// bundle; @anthropic-ai/sdk pulled node:fs and broke the Android runtime).
import { useSettingsStore } from '../store/settingsStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { buildSystemPrompt } from '../services/systemPrompts';
import { RoadmapSchema, QuizQuestionSchema } from './schemas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from './supabaseOps';
import { resolveTopicId } from './resolveTopicId';
import { executeWithReliability, AIProvider } from './ai/reliability';
import { logEvent } from './logEvent';
import { normalizeOllamaUrl, resolveOllamaModel, OllamaModelRole } from './ollamaModels';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Provider detection ──────────────────────────────────────────────────────

export function checkGroqAvailable(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GROQ_API_KEY);
}

// ─── Shared response type ────────────────────────────────────────────────────

interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type AIChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// ─── Internal routing helpers ────────────────────────────────────────────────

export async function callOllama(
  systemPrompt: string,
  messages: AIChatMessage[],
  ollamaUrl: string,
  modelRole: OllamaModelRole = 'reasoning',
  jsonMode = false,
  configuredModelId?: string,
): Promise<string> {
  // Role-based routing: the model is the user's configured model for that role
  // (or the registry default). never from a free-text setting. A call always
  // names its true model in errors.
  const model = resolveOllamaModel(modelRole, configuredModelId);
  const base = normalizeOllamaUrl(ollamaUrl);
  const endpoint = `${base}/api/chat`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: false,
        ...(jsonMode ? { format: 'json' } : {}),
      }),
    });
  } catch (networkErr) {
    const detail = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(`[ollama] ${modelRole} call to ${endpoint} failed (network): ${detail}`, {
      cause: networkErr,
    });
  }

  if (!res.ok) {
    if (res.status === 404) {
      // Fail closed: name the missing model and the fix. Never silently swap it.
      throw new Error(
        `[ollama:not_pulled] Model "${model}" (role: ${modelRole}) is not pulled on Ollama (${base}). Run: ollama pull ${model}`,
      );
    }
    throw new Error(`[ollama] ${modelRole} call to ${endpoint} failed: HTTP ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  return raw.message?.content ?? '';
}

export async function callGroq(
  systemPrompt: string,
  messages: AIChatMessage[],
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.statusText}`);
  const raw = await res.json();
  return raw.choices?.[0]?.message?.content ?? '';
}

async function callAnthropicFetch(
  systemPrompt: string,
  messages: AIChatMessage[],
  apiKey: string,
): Promise<string> {
  // Plain fetch to the Messages API — the same on-device-proven rail shape the
  // Groq rail uses. Never the Node-bound @anthropic-ai/sdk in an Expo Go bundle.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`);
  const raw = await res.json();
  return raw.content?.[0]?.type === 'text' ? raw.content[0].text : '';
}

export async function callAnthropic(
  systemPrompt: string,
  messages: AIChatMessage[],
): Promise<string> {
  return callAnthropicFetch(
    systemPrompt,
    messages,
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  );
}

// ─── Route to the right provider ─────────────────────────────────────────────

async function getAIResponse(
  systemPrompt: string,
  messages: AIChatMessage[],
  jsonMode = false,
  isFallback = false,
  retries = 2,
  modelRole: OllamaModelRole = 'reasoning'
): Promise<string> {
  const { aiMode, ollamaUrl, ollamaChatModel, customApiKey, customProvider } = useSettingsStore.getState();

  try {
    if (aiMode === 'local' && !isFallback) {
      return await callOllama(
        systemPrompt,
        messages,
        ollamaUrl,
        modelRole,
        jsonMode,
        modelRole === 'reasoning' ? ollamaChatModel : undefined,
      );
    }

    if (aiMode === 'custom' && !isFallback) {
      if (customProvider === 'groq') {
         const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             Authorization: `Bearer ${customApiKey}`,
           },
           body: JSON.stringify({
             model: 'llama-3.1-8b-instant',
             messages: [{ role: 'system', content: systemPrompt }, ...messages],
           }),
         });
         if (!res.ok) throw new Error(`Custom Groq error: ${res.statusText}`);
         const raw = await res.json();
         return raw.choices?.[0]?.message?.content ?? '';
         } else {
            return await callAnthropicFetch(systemPrompt, messages, customApiKey);
         }
    }

    if (checkGroqAvailable()) {
      return await callGroq(systemPrompt, messages);
    }

    return await callAnthropic(systemPrompt, messages);
  } catch (error) {
    if (retries > 0) {
      await sleep(1000);
      return getAIResponse(systemPrompt, messages, jsonMode, isFallback, retries - 1, modelRole);
    }

    // Fail closed: a missing local model is explicit and never silently
    // replaced — the error names the model and the pull command. Only
    // genuine network/connectivity failures may fall back to hosted.
    const modelUnavailable = String(error).includes('ollama:not_pulled');
    if (aiMode === 'local' && !isFallback && !modelUnavailable) {
      console.warn('[AI API] Local LLM failed. Falling back to Hosted...');
      return getAIResponse(systemPrompt, messages, jsonMode, true, 2, modelRole);
    }
    throw error;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function askTutor(
  systemPrompt: string,
  messages: AIChatMessage[],
  modelRole: OllamaModelRole = 'reasoning',
): Promise<AIResponse> {
  try {
    const data = await getAIResponse(systemPrompt, messages, false, false, 2, modelRole);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (__DEV__) {
      console.error('[AI API] askTutor failed:', message);
    }
    return { success: false, error: message };
  }
}

let isGeneratingRoadmap = false;

export async function generateStudyRoadmap(
  topic: string,
  subjectId?: string,
  topicId?: string,
  userId?: string,
  retries = 2,
  opts?: {
    weakFocus?: string[];
    masteredSkip?: string[];
    context?: 'high_school' | 'university' | 'self_directed';
  }
): Promise<{ success: boolean; data?: any; error?: string; provider?: string }> {
  if (isGeneratingRoadmap) return { success: false, error: 'A generation is already in progress.' };
  
  isGeneratingRoadmap = true;
  
  const weak = (opts?.weakFocus ?? []).slice(0, 8);
  const mastered = (opts?.masteredSkip ?? []).slice(0, 8);
  const adaptationBlock =
    weak.length > 0 || mastered.length > 0
      ? `\nPersonalization:\n- Prioritize these weak areas: ${weak.length ? weak.join(', ') : 'none'}\n- Skip or de-emphasize these mastered areas: ${mastered.length ? mastered.join(', ') : 'none'}\n`
      : '';

  const prompt = `Generate a structured 7-day study roadmap for the topic: "${topic}".
  For each day, provide a title and 3-4 specific, actionable study tasks.
  Return the response as a valid JSON object with the following structure:
  {
    "title": "Roadmap Title",
    "days": [
      {
        "day": 1,
        "title": "Day 1 Title",
        "tasks": ["Task 1", "Task 2", "Task 3"]
      },
      ... up to day 7
    ]
  }
  Be concise and practical.${adaptationBlock}
  Output ONLY the JSON object. No markdown, no extra text.`;

  try {
    const { learningMode } = useRoadmapStore.getState();
    const fullSystemPrompt = buildSystemPrompt({
      mode: learningMode,
      topic,
      subject: subjectId
    }) + "\nSTRICT RULE: You are a JSON API. Respond ONLY with raw JSON.";

    const { aiMode } = useSettingsStore.getState();
    const providers: AIProvider[] = aiMode === 'local'
      ? ['local_ollama', 'cache', 'placeholder']
      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];

    const cacheKey = `easytutor_roadmap_cache:${userId || 'anon'}:${subjectId || 'default'}:${topicId || topic}`;

    const fallbackPlaceholder = {
      title: `7-Day Study Roadmap for ${topic}`,
      days: [
        { day: 1, title: `Introduction to ${topic}`, tasks: [`Read introductory material on ${topic}`, `Define key foundational terms`, `Note core sub-topics`] },
        { day: 2, title: `Core Concepts`, tasks: [`Study primary rules or formulations`, `Work through basic practice examples`, `Review foundational concepts`] },
        { day: 3, title: `Intermediate Exercises`, tasks: [`Attempt simple quiz questions`, `Analyze solved textbook problems`, `Discuss foundational parts with peers`] },
        { day: 4, title: `Practical Application`, tasks: [`Apply concepts to standard test scenarios`, `Create a summary card of key processes`, `Review common errors`] },
        { day: 5, title: `Advanced Deep-Dive`, tasks: [`Solve complex multi-part questions`, `Read explanation for challenging edge cases`, `Compare theoretical concepts`] },
        { day: 6, title: `Integration and Synthesis`, tasks: [`Summarize topic insights in own words`, `Formulate practice summaries`, `Test self on memory terms`] },
        { day: 7, title: `Final Mastery Check`, tasks: [`Complete comprehensive mock test`, `Revise any remaining weak focus items`, `Conclude study roadmap session`] }
      ]
    };

    const result = await executeWithReliability<any>(
      fullSystemPrompt,
      [{ role: 'user', content: prompt }],
      {
        providers,
        timeoutMs: 15000,
        retries,
        cacheKey,
        validationSchema: RoadmapSchema,
        fallbackPlaceholder,
        context: {
          feature: 'roadmap',
          metadata: { topic, subjectId, topicId, userId }
        }
      }
    );

    isGeneratingRoadmap = false;

    if (result.success && result.data && userId && subjectId && topicId) {
      try {
        const client = getSupabaseClient();
        const user = await getAuthenticatedUser();
        const resolvedTopicId = await resolveTopicId(topicId || topic, subjectId);
        if (resolvedTopicId) {
          const { error } = await client.from('cached_roadmaps').upsert({
            user_id: user.id,
            subject_id: subjectId,
            topic_id: resolvedTopicId,
            roadmap_json: result.data
          }, { onConflict: 'user_id,topic_id' });
          if (error) {
            logSupabaseError('cached_roadmaps', 'upsert', error);
          }
        }
      } catch (dbErr) {
        // Log but don't fail the roadmap generation
        void logEvent('WARN', '[ROADMAP] Failed to persist generated roadmap to Supabase', {
          error: dbErr instanceof Error ? dbErr.message : String(dbErr)
        });
      }
    }

    return { success: result.success, data: result.data, error: result.error, provider: result.provider };
  } catch (error: any) {
    isGeneratingRoadmap = false;
    return { success: false, error: error.message };
  }
}

export async function generateQuizQuestion(
  unit: string,
  topic: string,
  retries = 2
): Promise<{ success: true; data: any } | { success: false; error: string }> {
  const cacheKey = `easytutor_quiz_cache_v1:${unit}:${topic}`;
  
  const fallbackPlaceholder = {
    question: `Practice check: Which statement best describes "${topic}" inside "${unit}"?`,
    options: [
      'It is a fundamental concept in this topic.',
      'It is unrelated to this topic.',
      'It is only used in highly specialized situations.',
      'It is not part of the standard syllabus.',
    ],
    correct: 0,
    explanation: `Served offline practice question for "${topic}". Select the first option as baseline practice validation.`,
  };

  try {
    const { learningMode } = useRoadmapStore.getState();
    const fullSystemPrompt = buildSystemPrompt({
      mode: learningMode,
      topic,
      subject: unit,
      isQuiz: true
    }) + "\nSTRICT RULE: Respond ONLY with a raw JSON object with these exact properties: question (string), options (array of 4 strings), correct (zero-indexed number), explanation (string). No markdown, no extra text.";
    
    const userMessage = `Generate a challenging multiple-choice question for the unit '${unit}' on the topic '${topic}'.`;

    const { aiMode } = useSettingsStore.getState();
    const providers: AIProvider[] = aiMode === 'local'
      ? ['local_ollama', 'placeholder']
      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'placeholder'];

    const result = await executeWithReliability<any>(
      fullSystemPrompt,
      [{ role: 'user', content: userMessage }],
      {
        providers,
        timeoutMs: 12000,
        retries,
        validationSchema: QuizQuestionSchema,
        fallbackPlaceholder,
        context: {
          feature: 'quiz',
          metadata: { unit, topic }
        }
      }
    );

    // If successful and it is not a fallback placeholder, write to our local array cache for subsequent offline runs
    if (result.success && result.provider !== 'placeholder' && result.data) {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const next = [...existing, result.data].slice(-50);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // never crash
      }
      return { success: true, data: result.data };
    }

    // If result was placeholder/failed, try loading from local offline array cache
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      const cachedArray: any[] = raw ? JSON.parse(raw) : [];
      if (cachedArray.length > 0) {
        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
        void logEvent('INFO', `[QUIZ] Served random cached question from offline array cache for ${topic}`);
        return { success: true, data: pick };
      }
    } catch {
      // ignore
    }

    // Serve deterministic fallback placeholder if everything fails
    return { success: true, data: fallbackPlaceholder };

  } catch (error: any) {
    // Attempt local array cache as a final backup
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      const cachedArray: any[] = raw ? JSON.parse(raw) : [];
      if (cachedArray.length > 0) {
        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
        return { success: true, data: pick };
      }
    } catch {
      // ignore
    }

    return { success: true, data: fallbackPlaceholder };
  }
}
