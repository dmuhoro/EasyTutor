import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const randomQuestionSet = vi.fn();
vi.mock('../../lib/questionBank', () => ({
  getRandomQuestionSet: (...args: unknown[]) => randomQuestionSet(...args),
}));

import {
  MockExamError,
  buildMockExam,
  gradeMockExam,
  mockExamDurationSeconds,
  type MockExamQuestion,
} from '../../src/domain/exam/mockExam';
import { loadMockExam, submitMockExam } from '../../services/mockExam';
import type { QuestionBankItem } from '../../lib/questionBank';
import { MockExamPanel } from '../../components/exam/MockExamPanel';

/**
 * C27 / GT-03 / E8-T1 — a mock exam must be assembled from real question-bank
 * data, rejected when its mark scheme is invalid, and graded without silent
 * drops. Unknown answers and invalid selections fail closed.
 */

const questions: MockExamQuestion[] = [
  { id: 'q1', prompt: '2 + 2?', options: ['3', '4', '5'], correctIndex: 1, explanation: 'four' },
  { id: 'q2', prompt: '3 + 3?', options: ['5', '6', '7'], correctIndex: 1 },
  { id: 'q3', prompt: '4 + 4?', options: ['7', '8', '9'], correctIndex: 1 },
];

const bankItem = (index: number): QuestionBankItem => ({
  id: `bank-${index}`,
  subject: 'mathematics',
  topic: 'algebra',
  difficulty: 'easy',
  question: `Question ${index}`,
  options: ['wrong', 'right'],
  correct_answer: 'right',
  explanation: 'explanation',
});

describe('mock exam domain', () => {
  it('builds a valid exam and grades answers with the declared mark scheme', () => {
    const exam = buildMockExam({
      id: 'exam-1', subject: 'mathematics', topic: 'algebra',
      marksPerQuestion: 2, questions,
    });
    expect(exam.questions).toHaveLength(3);

    const result = submitMockExam(exam, [
      { questionId: 'q1', selectedIndex: 1 },
      { questionId: 'q2', selectedIndex: 0 },
      { questionId: 'q3', selectedIndex: null },
    ]);

    expect(result).toMatchObject({
      examId: 'exam-1',
      totalQuestions: 3,
      answered: 2,
      correct: 1,
      marksObtained: 2,
      totalMarks: 6,
      unresolved: ['q3'],
    });
    expect(result.perQuestion[0]).toMatchObject({ correct: true, explanation: 'four' });
    expect(result.perQuestion[2].selectedIndex).toBeNull();
  });

  it('rejects malformed exams instead of shipping an ungradable paper', () => {
    const base = { id: 'e', subject: 's', topic: 't', marksPerQuestion: 1 };
    expect(() => buildMockExam({ ...base, questions: [] }))
      .toThrowError(expect.objectContaining({ reason: 'EMPTY_EXAM' }));
    expect(() => buildMockExam({ ...base, marksPerQuestion: 0, questions }))
      .toThrowError(expect.objectContaining({ reason: 'INVALID_MARK_SCHEME' }));
    expect(() => buildMockExam({ ...base, questions: [questions[0], questions[0]] }))
      .toThrowError(expect.objectContaining({ reason: 'DUPLICATE_QUESTION' }));
    expect(() => buildMockExam({
      ...base,
      questions: [{ ...questions[0], options: ['only-one'], correctIndex: 0 }],
    })).toThrowError(expect.objectContaining({ reason: 'INVALID_OPTIONS' }));
    expect(() => buildMockExam({
      ...base,
      questions: [{ ...questions[0], correctIndex: 99 }],
    })).toThrowError(expect.objectContaining({ reason: 'INVALID_CORRECT_INDEX' }));
  });

  it('fails closed on unknown questions and out-of-range selections', () => {
    const exam = buildMockExam({
      id: 'e', subject: 's', topic: 't', marksPerQuestion: 1, questions,
    });
    expect(() => gradeMockExam(exam, [{ questionId: 'not-in-exam', selectedIndex: 0 }]))
      .toThrowError(expect.objectContaining({ reason: 'UNKNOWN_QUESTION' }));
    expect(() => gradeMockExam(exam, [{ questionId: 'q1', selectedIndex: 99 }]))
      .toThrowError(expect.objectContaining({ reason: 'INVALID_SELECTION' }));
    expect(MockExamError.name).toBe('MockExamError');
  });
});

describe('mock exam question-bank service', () => {
  beforeEach(() => randomQuestionSet.mockReset());

  it('returns null when the bank has no questions — never invents a paper', async () => {
    randomQuestionSet.mockResolvedValue([]);
    await expect(loadMockExam('mathematics', 'algebra')).resolves.toBeNull();
    expect(randomQuestionSet).toHaveBeenCalledWith('mathematics', 'algebra', undefined, 3);
  });

  it('assembles and marks a real bank-derived exam', async () => {
    randomQuestionSet.mockResolvedValue([bankItem(1), bankItem(2)]);
    const loaded = await loadMockExam('mathematics', 'algebra');
    expect(loaded?.questionCount).toBe(2);
    expect(loaded?.exam.questions[0]).toMatchObject({
      id: 'bank-1', prompt: 'Question 1', correctIndex: 1,
    });
    const result = gradeMockExam(loaded!.exam, loaded!.exam.questions.map((q) => ({
      questionId: q.id, selectedIndex: q.correctIndex,
    })));
    expect(result).toMatchObject({ correct: 2, marksObtained: 2, totalMarks: 2, percentage: 100 });
  });

  it('fails closed when the bank marks a correct answer that is not an option', async () => {
    randomQuestionSet.mockResolvedValue([{
      ...bankItem(1), options: ['a', 'b'], correct_answer: 'not-an-option',
    }]);
    await expect(loadMockExam('mathematics', 'algebra'))
      .rejects.toThrowError(expect.objectContaining({ reason: 'INVALID_CORRECT_INDEX' }));
  });
});

describe('exam timer on the live mock-exam panel (E8-T2)', () => {
  const exam = buildMockExam({
    id: 'timer-exam',
    subject: 'mathematics',
    topic: 'algebra',
    marksPerQuestion: 1,
    questions,
  });

  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  function allText(tree: TestRenderer.ReactTestRenderer): string {
    return tree.root
      .findAll((node) => node.type === ('Text' as never))
      .map((node) => {
        const value: unknown = node.props.children;
        if (value == null || typeof value === 'boolean') return '';
        if (Array.isArray(value)) return value.map((child) => String(child)).join('');
        return String(value);
      })
      .join(' ');
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives the duration from the declared mark scheme, never a hidden default', () => {
    expect(mockExamDurationSeconds(exam)).toBe(180);
    expect(mockExamDurationSeconds({ ...exam, marksPerQuestion: 2 })).toBe(360);
  });

  it('renders the real countdown and auto-submits when time expires', async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = TestRenderer.create(React.createElement(MockExamPanel, { exam }));
    });
    if (!tree) throw new Error('MockExamPanel did not render');
    expect(allText(tree)).toContain('03:00');

    await act(async () => {
      vi.advanceTimersByTime(180_000);
    });

    const text = allText(tree);
    expect(text).toContain('00:00');
    expect(text).toContain('Correct answer 0/3');
    expect(text).toContain('You answered {{score}} out of {{total}} questions correctly. 0/3');
  });
});
