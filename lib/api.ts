// AI rail orchestration. Provider choice is made by `selectProvider` through
// `resolveProviderSelection`; no caller here may pick a direct provider rail.
import { buildSystemPrompt } from '../services/systemPrompts';
import { RoadmapSchema, QuizQuestionSchema } from './schemas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from './supabaseOps';
import { resolveTopicId } from './resolveTopicId';
import { executeWithReliability, type AIProvider } from './ai/reliability';
import { logEvent } from './logEvent';
import { getActiveLearningMode } from '../src/infrastructure/portalContext';
import { OllamaModelRole } from './ollamaModels';
import { resolveProviderSelection } from './ai/providerResolver';
import type { ModelProvider } from './ai/providerSelection';

// Re-exported to keep the public `lib/api` surface unchanged. Direct
// Groq/Anthropic helpers were removed and archived under `archive/lib/ai`.
import { callOllama, callAIProxy, type AIChatMessage } from './ai/providers';

export { callOllama, callAIProxy };
export type { AIChatMessage };

interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  /** Source that actually answered (proxy, local, cache, placeholder or offline). */
  provider?: AIProvider;
  /** Rail chosen by the single selector before any fallback. */
  selectedProvider?: ModelProvider;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const offlineMessage = (): string =>
  "You're offline and no local model is available. Your question was not sent; reconnect or queue it for later.";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function askTutor(
  systemPrompt: string,
  messages: AIChatMessage[],
  modelRole: OllamaModelRole = 'reasoning',
): Promise<AIResponse> {
  try {
    const selection = await resolveProviderSelection();
    if (selection.provider === 'offline') {
      return {
        success: false,
        provider: 'offline',
        selectedProvider: 'offline',
        error: selection.reason === 'offline-no-network'
          ? offlineMessage()
          : 'The tutor service is unavailable and no local model is enabled. Please retry shortly.',
      };
    }

    const result = await executeWithReliability<string>(
      systemPrompt,
      messages,
      {
        provider: selection.provider,
        modelRole,
        timeoutMs: 15000,
        retries: 2,
        fallbackPlaceholder: '',
        context: { feature: 'explanation' },
      },
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        provider: result.provider,
        selectedProvider: result.selectedProvider,
        error: result.error ?? 'The tutor service could not answer that question.',
      };
    }

    return {
      success: true,
      data: result.data,
      provider: result.provider,
      selectedProvider: result.selectedProvider,
    };
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
): Promise<{
  success: boolean;
  data?: RoadmapData;
  error?: string;
  provider?: AIProvider;
  selectedProvider?: ModelProvider;
}> {
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
    const learningMode = getActiveLearningMode();
    const fullSystemPrompt = buildSystemPrompt({
      mode: learningMode,
      topic,
      subject: subjectId
    }) + "\nSTRICT RULE: You are a JSON API. Respond ONLY with raw JSON.";

    const selection = await resolveProviderSelection();
    const cacheKey = `easytutor_roadmap_cache:${userId || 'anon'}:${subjectId || 'default'}:${topicId || topic}`;

    const fallbackPlaceholder: RoadmapData = {
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

    const result = await executeWithReliability<RoadmapData>(
      fullSystemPrompt,
      [{ role: 'user', content: prompt }],
      {
        provider: selection.provider,
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

    if (result.success && result.data && userId && subjectId && topicId && result.provider !== 'cache') {
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

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      provider: result.provider,
      selectedProvider: result.selectedProvider,
    };
  } catch (error: unknown) {
    isGeneratingRoadmap = false;
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

interface RoadmapData {
  title: string;
  days: Array<{ day: number; title: string; tasks: string[] }>;
}

export async function generateQuizQuestion(
  unit: string,
  topic: string,
  retries = 2
): Promise<{
  success: true;
  data: QuizQuestion;
  provider?: AIProvider;
  selectedProvider?: ModelProvider;
} | {
  success: false;
  error: string;
  provider?: AIProvider;
  selectedProvider?: ModelProvider;
}> {
  const cacheKey = `easytutor_quiz_cache_v1:${unit}:${topic}`;

  const fallbackPlaceholder: QuizQuestion = {
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
    const learningMode = getActiveLearningMode();
    const fullSystemPrompt = buildSystemPrompt({
      mode: learningMode,
      topic,
      subject: unit,
      isQuiz: true
    }) + "\nSTRICT RULE: Respond ONLY with a raw JSON object with these exact properties: question (string), options (array of 4 strings), correct (zero-indexed number), explanation (string). No markdown, no extra text.";

    const userMessage = `Generate a challenging multiple-choice question for the unit '${unit}' on the topic '${topic}'.`;

    const selection = await resolveProviderSelection();
    const result = await executeWithReliability<QuizQuestion>(
      fullSystemPrompt,
      [{ role: 'user', content: userMessage }],
      {
        provider: selection.provider,
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

    if (result.success && result.data) {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        const existing: QuizQuestion[] = raw ? JSON.parse(raw) : [];
        const next = [...existing, result.data].slice(-50);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // never crash
      }
      return {
        success: true,
        data: result.data,
        provider: result.provider,
        selectedProvider: result.selectedProvider,
      };
    }

    // Offline/fallback: replay a previously validated question from the local
    // array cache, or serve the deterministic starter question. Both report
    // the source actually used.
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      const cachedArray: QuizQuestion[] = raw ? JSON.parse(raw) : [];
      if (cachedArray.length > 0) {
        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
        void logEvent('INFO', `[QUIZ] Served random cached question from offline array cache for ${topic}`);
        return {
          success: true,
          data: pick,
          provider: 'cache',
          selectedProvider: result.selectedProvider,
        };
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      data: fallbackPlaceholder,
      provider: result.provider,
      selectedProvider: result.selectedProvider,
    };
  } catch (error: unknown) {
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      const cachedArray: QuizQuestion[] = raw ? JSON.parse(raw) : [];
      if (cachedArray.length > 0) {
        const pick = cachedArray[Math.floor(Math.random() * cachedArray.length)];
        return { success: true, data: pick, provider: 'cache' };
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      data: fallbackPlaceholder,
      provider: 'placeholder',
    };
  }
}
