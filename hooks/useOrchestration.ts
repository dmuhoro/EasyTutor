import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  withDeadline,
  DeadlineError,
  isAbortError,
} from '../lib/ai/reliability';
import { useAuthStore } from '../store/authStore';
import { useRoadmapStore, portalFromMode } from '../store/roadmapStore';
import { useProgressStore } from '../store/progressStore';
import { 
  learningOrchestrator, 
  RuntimeContext, 
  RuntimeContextInput,
  OrchestrationResult
} from '../src/intelligence';

/**
 * Hook to build a RuntimeContext from current store state.
 * This ensures UI components don't have to manually gather context.
 */
export function useRuntimeContext() {
  const { user } = useAuthStore();
  const { learningMode, subjectId, topicId } = useRoadmapStore();
  const { topicsStudied } = useProgressStore();

  const buildContextInput = useCallback((overrides?: Partial<RuntimeContextInput>): RuntimeContextInput => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const portalType = portalFromMode(learningMode || 'high_school');
    const currentSubjectId = overrides?.subject_id || subjectId;
    const currentTopicId = overrides?.topic_id || topicId;

    if (!currentSubjectId || !currentTopicId) {
      throw new Error('Subject and Topic must be defined for RuntimeContext');
    }

    // Attempt to find existing mastery score if available
    const studied = topicsStudied[currentSubjectId] || [];
    const isTopicStudied = studied.includes(currentTopicId);
    
    return {
      user_id: user.id,
      portal_type: portalType,
      subject_id: currentSubjectId,
      topic_id: currentTopicId,
      learning_goal: `Mastery of ${currentTopicId} in ${currentSubjectId}`,
      mastery_state: {
        score: isTopicStudied ? 70 : 0, // Simplified default
        attempts: isTopicStudied ? 1 : 0,
        weak_points: [],
      },
      ...overrides
    };
  }, [user?.id, learningMode, subjectId, topicId, topicsStudied]);

  return { buildContextInput };
}

/**
 * Phase 2 — ORCHESTRATED LEARNING FLOWS
 */

export function useLearningSession() {
  const { buildContextInput } = useRuntimeContext();
  const [loading, setLoading] = useState(false);

  const startSession = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setLoading(true);
    try {
      const input = buildContextInput(overrides);
      // In a real implementation, this might involve more setup
      return await learningOrchestrator.generateLesson(input);
    } finally {
      setLoading(false);
    }
  }, [buildContextInput]);

  return { startSession, loading };
}

export function useAdaptiveLesson() {
  const { buildContextInput } = useRuntimeContext();
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<OrchestrationResult | null>(null);

  const generateLesson = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setLoading(true);
    try {
      const input = buildContextInput(overrides);
      const result = await learningOrchestrator.generateLesson(input);
      setLesson(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [buildContextInput]);

  return { generateLesson, lesson, loading };
}

export function useRoadmapGeneration() {
  const { buildContextInput } = useRuntimeContext();
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<OrchestrationResult | null>(null);

  const generateRoadmap = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setLoading(true);
    try {
      const input = buildContextInput(overrides);
      const result = await learningOrchestrator.generateRoadmap(input);
      setRoadmap(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [buildContextInput]);

  return { generateRoadmap, roadmap, loading };
}

export function useGovernedQuiz() {
  const { buildContextInput } = useRuntimeContext();
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<OrchestrationResult | null>(null);

  const assembleQuiz = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setLoading(true);
    try {
      const input = buildContextInput(overrides);
      const result = await learningOrchestrator.assembleQuiz(input);
      setQuiz(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [buildContextInput]);

  return { assembleQuiz, quiz, loading };
}

/** Total wall-clock budget for one quiz-generation request (< the 35 s product limit). */
export const QUIZ_GENERATION_DEADLINE_MS = 30_000;

const friendlyQuizError = (err: unknown): Error => {
  if (err instanceof DeadlineError || (err instanceof Error && /timed out/i.test(err.message))) {
    return new Error('AI inference timed out — please check your connection and try again.');
  }
  if (isAbortError(err)) return new Error('Request cancelled.');
  return new Error("We couldn't reach the learning service. Please try again.");
};

export function useQuizQuestionGeneration() {
  const { buildContextInput } = useRuntimeContext();
  const { isConnected } = useNetInfo();
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<OrchestrationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const cancel = useCallback(() => {
    // Abort only; the request's own finally clears the ref and loading state.
    // A refresh replaces controllerRef with the new request after cancelling.
    controllerRef.current?.abort('cancelled');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort('cancelled');
    };
  }, []);

  const generateQuizQuestion = useCallback(async (
    overrides?: Partial<RuntimeContextInput>,
    options?: { deadlineMs?: number },
  ) => {
    // Fail closed and fail fast when offline: no request is attempted, no
    // 30 s wait, and the caller gets an explicit, user-readable reason.
    if (isConnected === false) {
      const offline = new Error("You're offline. Reconnect to the internet and try again.");
      if (mountedRef.current) {
        setError(offline);
        setLoading(false);
      }
      throw offline;
    }

    cancel(); // supersede any in-flight request before starting a new one
    const controller = new AbortController();
    controllerRef.current = controller;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const input = buildContextInput(overrides);
      const result = await withDeadline(
        (signal) => learningOrchestrator.generateQuizQuestion(input, signal),
        {
          signal: controller.signal,
          deadlineMs: options?.deadlineMs ?? QUIZ_GENERATION_DEADLINE_MS,
          maxRetries: 1,
          baseDelayMs: 200,
          // Never retry a cancellation or a deadline — those are terminal.
          shouldRetry: (e) => !(e instanceof DeadlineError) && !isAbortError(e),
        },
      );
      if (controllerRef.current === controller && mountedRef.current) setQuestion(result);
      return result;
    } catch (err) {
      const intentionalCancel = controller.signal.aborted && controller.signal.reason === 'cancelled';
      if (intentionalCancel) throw err; // caller observes the abort; no error state, no stale result
      const friendly = friendlyQuizError(err);
      if (controllerRef.current === controller && mountedRef.current) setError(friendly);
      throw friendly;
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, [buildContextInput, isConnected, cancel]);

  return { generateQuizQuestion, question, loading, error, cancel };
}

export function useMasteryProgress() {
  const { buildContextInput } = useRuntimeContext();
  const [updating, setUpdating] = useState(false);

  const updateMastery = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setUpdating(true);
    try {
      const input = buildContextInput(overrides);
      return await learningOrchestrator.updateMastery(input);
    } finally {
      setUpdating(false);
    }
  }, [buildContextInput]);

  return { updateMastery, updating };
}

export function useRoadmapFlow() {
  const { buildContextInput } = useRuntimeContext();
  const [loading, setLoading] = useState(false);

  const progressRoadmap = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setLoading(true);
    try {
      const input = buildContextInput(overrides);
      return await learningOrchestrator.progressRoadmap(input);
    } finally {
      setLoading(false);
    }
  }, [buildContextInput]);

  return { progressRoadmap, loading };
}

export function useProgressUpdates() {
  const { buildContextInput } = useRuntimeContext();
  const [updating, setUpdating] = useState(false);

  const markTopicComplete = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setUpdating(true);
    try {
      const input = buildContextInput(overrides);
      await learningOrchestrator.markTopicComplete(input);
    } finally {
      setUpdating(false);
    }
  }, [buildContextInput]);

  const recordQuizScore = useCallback(async (score: number, total: number, overrides?: Partial<RuntimeContextInput>) => {
    setUpdating(true);
    try {
      const input = buildContextInput(overrides);
      await learningOrchestrator.recordQuizScore({ ...input, score, total });
    } finally {
      setUpdating(false);
    }
  }, [buildContextInput]);

  const saveRoadmap = useCallback(async (roadmapData: any, overrides?: Partial<RuntimeContextInput>) => {
    setUpdating(true);
    try {
      const input = buildContextInput(overrides);
      await learningOrchestrator.saveRoadmap({ ...input, roadmapData });
    } finally {
      setUpdating(false);
    }
  }, [buildContextInput]);

  return { markTopicComplete, recordQuizScore, saveRoadmap, updating };
}

export function usePrefetchedContent() {
  const { buildContextInput } = useRuntimeContext();
  const [prefetching, setPrefetching] = useState(false);

  const prefetchNext = useCallback(async (overrides?: Partial<RuntimeContextInput>) => {
    setPrefetching(true);
    try {
      const input = buildContextInput(overrides);
      return await learningOrchestrator.prefetchNext(input);
    } finally {
      setPrefetching(false);
    }
  }, [buildContextInput]);

  return { prefetchNext, prefetching };
}
