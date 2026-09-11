import { retrieveRelevantChunks } from './retrieval';
import { generateOfflineResponse } from './ollama';
import { generateCloudResponse } from './cloud';
import { shouldUseCloud } from './aiProvider';
import { measurePerformance } from './performance';
import { getMemoryCachedResponse, setMemoryCachedResponse } from './cache';
import { deduplicateRequest, retryAsync, withTimeout } from './network';
import { PortalContextResolver } from '../src/infrastructure/contextResolver';
import { GovernedRetrievalContext } from '../src/infrastructure/database';

const resolveTutorRetrievalContext = (question: string): GovernedRetrievalContext => {
  const portalContext = PortalContextResolver.resolve();
  const taxonomyScope = portalContext.taxonomy_scope
    ?? portalContext.knowledge_scope
    ?? `taxonomy:${portalContext.portal_type}`;

  return {
    ...portalContext,
    curriculum_scope: portalContext.curriculum_scope ?? 'UNKNOWN_CURRICULUM',
    taxonomy_scope: taxonomyScope,
    mastery_level: portalContext.mastery_level ?? 0,
    user_goal: portalContext.user_goal ?? question,
    active_path: portalContext.active_path?.length ? portalContext.active_path : [taxonomyScope],
  };
};

export const askBookTutor = async ({
  question
}: {
  question: string;
}) => {
  try {
    const cached = getMemoryCachedResponse(question);
    if (cached) {
      console.log('[CACHE HIT]');
      return cached;
    }

    const chunks = await measurePerformance('RETRIEVAL', async () => {
      return await retrieveRelevantChunks(question, resolveTutorRetrievalContext(question));
    });

    const context = chunks
      .map((c) => c.content)
      .join('\n');

    const prompt = `
Use this study material:

${context.slice(0, 3000)}

Answer this question:

${question}
`;

    const responseText = await measurePerformance('AI_BOOK_TUTOR', async () => {
      return deduplicateRequest(`book_${question}`, async () => {
        return retryAsync(async () => {
          return withTimeout(
            (async () => {
              if (
                shouldUseCloud({
                  promptLength: prompt.length,
                  complexity: 'normal'
                })
              ) {
                return await generateCloudResponse(prompt);
              }
              return await generateOfflineResponse(prompt);
            })(),
            15000,
            '[AI TIMEOUT] Tutor generation took too long'
          );
        }, 3);
      });
    });

    if (responseText) {
      setMemoryCachedResponse(question, responseText);
    }

    return responseText;

  } catch (err) {
    console.error('[ERROR] [BOOK TUTOR FALLBACK]', err);
    return 'I seem to be having trouble connecting to my knowledge base right now. Please try again later.';
  }
};
