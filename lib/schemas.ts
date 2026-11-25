import type { SchemaValidationResult, ValidationSchema } from './ai/validation';

/**
 * Runtime validation for AI-generated quiz questions and roadmaps.
 *
 * These validators sit on the common login path (`lib/api` imports them), so
 * they deliberately use no runtime dependencies. They preserve the previous
 * Zod contract: only known keys survive, malformed values fail closed, and a
 * failure carries a readable `error.message` for the reliability wrapper.
 */
export interface ValidatedQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface ValidatedRoadmapDay {
  day: number;
  title: string;
  tasks: string[];
}

export interface ValidatedRoadmap {
  title: string;
  days: ValidatedRoadmapDay[];
}

function pass<T>(data: T): SchemaValidationResult<T> {
  return { success: true, data };
}

function reject<T>(message: string): SchemaValidationResult<T> {
  return { success: false, error: { message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export const QuizQuestionSchema: ValidationSchema<ValidatedQuizQuestion> = {
  safeParse(value) {
    if (!isRecord(value)) return reject('Quiz question must be an object');
    if (typeof value.question !== 'string') return reject('question must be a string');
    if (!isStringArray(value.options) || value.options.length !== 4) {
      return reject('options must contain exactly four strings');
    }
    if (!isFiniteNumber(value.correct) || value.correct < 0 || value.correct > 3) {
      return reject('correct must be an index from 0 to 3');
    }
    if (typeof value.explanation !== 'string') return reject('explanation must be a string');
    return pass({
      question: value.question,
      options: [...value.options],
      correct: value.correct,
      explanation: value.explanation,
    });
  },
};

function parseRoadmapDay(value: unknown): ValidatedRoadmapDay | null {
  if (!isRecord(value)) return null;
  if (!isFiniteNumber(value.day)) return null;
  if (typeof value.title !== 'string') return null;
  if (!isStringArray(value.tasks) || value.tasks.length < 1) return null;
  return { day: value.day, title: value.title, tasks: [...value.tasks] };
}

export const RoadmapSchema: ValidationSchema<ValidatedRoadmap> = {
  safeParse(value) {
    if (!isRecord(value)) return reject('Roadmap must be an object');
    if (typeof value.title !== 'string') return reject('title must be a string');
    if (!Array.isArray(value.days) || value.days.length !== 7) {
      return reject('days must contain exactly seven entries');
    }
    const days = value.days.map(parseRoadmapDay);
    if (days.some((day) => day === null)) {
      return reject('each day needs a finite day number, title and at least one task');
    }
    return pass({ title: value.title, days: days as ValidatedRoadmapDay[] });
  },
};
