import type { LearningPort } from '../src/domain/learning/learningPort';

/**
 * Dependency inversion for the store layer.
 *
 * Stores only know this port. The default implementation lives in
 * `services/learningPort.ts` and is loaded on first use, which keeps the
 * intelligence/runtime graph out of the initial bundle until a learner
 * actually persists something. Tests may inject a port with
 * `setLearningPort()`.
 */
let injectedPort: LearningPort | null = null;
let defaultPort: Promise<LearningPort> | null = null;

export const setLearningPort = (port: LearningPort | null): void => {
  injectedPort = port;
};

export const getLearningPort = async (): Promise<LearningPort> => {
  if (injectedPort) return injectedPort;

  if (!defaultPort) {
    defaultPort = import('../services/learningPort')
      .then((module) => module.learningPort)
      .catch((error: unknown) => {
        defaultPort = null;
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `[LEARNING PORT] Persistence service unavailable: ${reason}. The action was not applied to the cloud.`
        );
      });
  }

  return defaultPort;
};
