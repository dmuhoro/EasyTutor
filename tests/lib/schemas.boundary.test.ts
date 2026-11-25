import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuizQuestionSchema, RoadmapSchema } from '../../lib/schemas';

const source = (relativePath: string): string =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('shared validation boundary', () => {
  // The login route loads lib/api -> lib/schemas in the common chunk. A zod
  // import there puts the whole validator into every learner's first load.
  it('does not import zod into the common login path', () => {
    expect(source('lib/schemas.ts')).not.toMatch(/from ['"]zod['"]/);
    expect(source('lib/ai/reliability.ts')).not.toMatch(
      /import\s*\{[^}]*ZodSchema[^}]*\}\s*from\s*['"]zod['"]/,
    );
  });

  it('accepts a valid quiz question and strips unknown keys', () => {
    const result = QuizQuestionSchema.safeParse({
      question: 'What is friction?',
      options: ['a', 'b', 'c', 'd'],
      correct: 1,
      explanation: 'It opposes motion.',
      injected: 'must not survive',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('injected');
  });

  it('rejects a quiz question with the wrong number of options', () => {
    const result = QuizQuestionSchema.safeParse({
      question: 'Q',
      options: ['a', 'b', 'c'],
      correct: 0,
      explanation: 'E',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a quiz answer outside the four-option index range', () => {
    const result = QuizQuestionSchema.safeParse({
      question: 'Q',
      options: ['a', 'b', 'c', 'd'],
      correct: 4,
      explanation: 'E',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string quiz question', () => {
    const result = QuizQuestionSchema.safeParse({
      question: 42,
      options: ['a', 'b', 'c', 'd'],
      correct: 0,
      explanation: 'E',
    });
    expect(result.success).toBe(false);
  });

  const day = (index: number) => ({
    day: index,
    title: `Day ${index}`,
    tasks: [`Task ${index}`],
  });

  it('accepts a seven-day roadmap', () => {
    const result = RoadmapSchema.safeParse({
      title: 'Friction',
      days: [1, 2, 3, 4, 5, 6, 7].map(day),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.days).toHaveLength(7);
  });

  it('rejects a roadmap that is not seven days', () => {
    const result = RoadmapSchema.safeParse({
      title: 'Friction',
      days: [1, 2, 3, 4, 5, 6].map(day),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a roadmap day with no tasks', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map(day);
    days[2] = { day: 3, title: 'Day 3', tasks: [] };
    const result = RoadmapSchema.safeParse({ title: 'Friction', days });
    expect(result.success).toBe(false);
  });
});
