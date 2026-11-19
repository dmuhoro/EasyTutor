/**
 * Pure mapping from the rail that actually answered to a learner-facing i18n key.
 *
 * `AIResponse.provider` is the source of truth produced by the M1 reliability
 * wrapper. A cached answer, a placeholder and an offline reply are not model
 * answers; the labels say so explicitly rather than implying a hosted tutor.
 * An absent or unknown source fails closed to "source unavailable".
 */
import type { AIProvider } from './reliability';

export type AnswerSourceLabelKey =
  | 'answeredByHosted'
  | 'answeredByLocal'
  | 'answeredByCached'
  | 'answeredByPlaceholder'
  | 'answeredByOffline'
  | 'answeredByUnknown';

export function answerSourceLabelKey(source: AIProvider | undefined): AnswerSourceLabelKey {
  switch (source) {
    case 'hosted_proxy':
      return 'answeredByHosted';
    case 'local_ollama':
      return 'answeredByLocal';
    case 'cache':
      return 'answeredByCached';
    case 'placeholder':
      return 'answeredByPlaceholder';
    case 'offline':
      return 'answeredByOffline';
    default:
      return 'answeredByUnknown';
  }
}
