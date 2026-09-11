import { getSupabaseClient } from './supabaseOps';
import { getAIProvider } from './aiProvider';
import { getMemoryCachedResponse, setMemoryCachedResponse } from './cache';
import { executeWithReliability, AIProvider } from './ai/reliability';
import { useSettingsStore } from '../store/settingsStore';

export interface ExplanationParams {
  topicTitle: string;
  masteryLevel: number;
  subjectId: string;
}

/**
 * Generates a personalized explanation for a topic based on student mastery.
 */
export const generateExplanation = async ({
  topicTitle,
  masteryLevel,
  subjectId
}: ExplanationParams): Promise<string> => {
  try {
    const systemPrompt = `You are a world-class tutor specializing in ${subjectId}.`;
    
    const prompt = `
Explain the topic: "${topicTitle}"

Context:
- Student mastery: ${masteryLevel}%
- Subject: ${subjectId}

Rules:
- If mastery < 40 → explain like beginner (use simple analogies, foundational concepts)
- If mastery 40–70 → intermediate depth (include technical terms, process explanations)
- If mastery > 70 → advanced explanation (deep dive into edge cases, complex relationships)

Keep it:
- clear
- structured
- concise
- example-driven
`;

    console.log('[AI] generating explanation', { topicTitle, masteryLevel });
    
    const cached = getMemoryCachedResponse(prompt);
    if (cached) {
      console.log('[CACHE HIT]');
      return cached;
    }

    const { aiMode } = useSettingsStore.getState();
    const providers: AIProvider[] = aiMode === 'local'
      ? ['local_ollama', 'cache', 'placeholder']
      : ['hosted_claude', 'hosted_groq', 'local_ollama', 'cache', 'placeholder'];

    const cacheKey = `easytutor_explanation_cache:${subjectId}:${topicTitle}`;

    const result = await executeWithReliability<string>(
      systemPrompt,
      [{ role: 'user', content: prompt }],
      {
        providers,
        timeoutMs: 12000,
        retries: 2,
        cacheKey,
        fallbackPlaceholder: `We are currently operating offline or having trouble reaching the tutor service. Here is a baseline explanation:\n\nThis topic covers essential foundations in ${subjectId}. Please check your connection or retry in a few moments.`,
        context: {
          feature: 'explanation',
          metadata: { topicTitle, masteryLevel, subjectId }
        }
      }
    );

    if (result.success && result.data) {
      setMemoryCachedResponse(prompt, result.data);
    }
    
    return result.data;

  } catch (err) {
    console.error('[ERROR] [AI]', err);
    return `An error occurred while generating explanation for ${topicTitle}.`;
  }
};

/**
 * Logs AI interactions for future optimization.
 */
export const logAIEvent = async ({
  userId,
  type,
  payload
}: {
  userId: string;
  type: string;
  payload: any;
}) => {
  try {
    const supabase = getSupabaseClient();
    
    // Using user_events table for tracking AI interactions
    const { error } = await supabase.from('user_events').insert({
      user_id: userId,
      event_type: type,
      payload,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('[ERROR] [AI LOG] Failed to log AI event', error);
    } else {
      console.log('[AI] logged interaction', { type });
    }
  } catch (err) {
    console.error('[ERROR] [AI LOG]', err);
  }
};
