/**
 * Mock exam domain — deterministic assembly and marking.
 *
 * No I/O and no hidden defaults: an exam must declare its mark scheme, and a
 * malformed exam never reaches a learner. Unknown or out-of-range answers are
 * rejected explicitly rather than silently counted as wrong (no silent drops).
 */

export type MockExamFailure =
  | 'EMPTY_EXAM'
  | 'INVALID_ID'
  | 'DUPLICATE_QUESTION'
  | 'INVALID_OPTIONS'
  | 'INVALID_CORRECT_INDEX'
  | 'INVALID_MARK_SCHEME'
  | 'UNKNOWN_QUESTION'
  | 'INVALID_SELECTION';

export class MockExamError extends Error {
  constructor(
    public readonly reason: MockExamFailure,
    message: string,
  ) {
    super(message);
    this.name = 'MockExamError';
  }
}

export interface MockExamQuestion {
  id: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  explanation?: string;
}

export interface MockExam {
  id: string;
  subject: string;
  topic: string;
  marksPerQuestion: number;
  questions: readonly MockExamQuestion[];
}

/** One minute per declared mark: the exam's timing rule lives with its mark scheme. */
export const MOCK_EXAM_SECONDS_PER_MARK = 60;

export function mockExamDurationSeconds(exam: MockExam): number {
  return exam.questions.length * exam.marksPerQuestion * MOCK_EXAM_SECONDS_PER_MARK;
}

export interface MockExamAnswer {
  questionId: string;
  selectedIndex: number | null;
}

export interface MockExamResult {
  examId: string;
  totalQuestions: number;
  answered: number;
  correct: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  unresolved: readonly string[];
  perQuestion: ReadonlyArray<{
    questionId: string;
    correct: boolean;
    selectedIndex: number | null;
    explanation?: string;
  }>;
}

function requireText(value: string, reason: MockExamFailure, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MockExamError(reason, `${label} must be a non-empty string`);
  }
}

/** Builds and validates an exam. Invalid input fails closed with a typed reason. */
export function buildMockExam(input: {
  id: string;
  subject: string;
  topic: string;
  marksPerQuestion: number;
  questions: readonly MockExamQuestion[];
}): MockExam {
  requireText(input.id, 'INVALID_ID', 'exam id');
  requireText(input.subject, 'INVALID_ID', 'subject');
  requireText(input.topic, 'INVALID_ID', 'topic');

  if (!Number.isInteger(input.marksPerQuestion) || input.marksPerQuestion <= 0) {
    throw new MockExamError('INVALID_MARK_SCHEME', 'marksPerQuestion must be a positive integer');
  }
  if (input.questions.length === 0) {
    throw new MockExamError('EMPTY_EXAM', 'an exam must contain at least one question');
  }

  const seen = new Set<string>();
  for (const question of input.questions) {
    requireText(question.id, 'INVALID_ID', 'question id');
    if (seen.has(question.id)) {
      throw new MockExamError('DUPLICATE_QUESTION', `duplicate question id: ${question.id}`);
    }
    seen.add(question.id);
    requireText(question.prompt, 'INVALID_OPTIONS', `prompt for ${question.id}`);
    if (question.options.length < 2 || question.options.some((option) => option.trim().length === 0)) {
      throw new MockExamError('INVALID_OPTIONS', `question ${question.id} needs at least two non-empty options`);
    }
    if (!Number.isInteger(question.correctIndex)
      || question.correctIndex < 0
      || question.correctIndex >= question.options.length) {
      throw new MockExamError('INVALID_CORRECT_INDEX', `question ${question.id} has no valid correct option`);
    }
  }

  return {
    id: input.id,
    subject: input.subject,
    topic: input.topic,
    marksPerQuestion: input.marksPerQuestion,
    questions: [...input.questions],
  };
}

/** Marks a submitted exam. Selection indices must belong to the exam, or the call fails closed. */
export function gradeMockExam(
  exam: MockExam,
  answers: readonly MockExamAnswer[],
): MockExamResult {
  const answerById = new Map<string, number | null>();
  for (const answer of answers) {
    if (!exam.questions.some((question) => question.id === answer.questionId)) {
      throw new MockExamError('UNKNOWN_QUESTION', `unknown question id: ${answer.questionId}`);
    }
    answerById.set(answer.questionId, answer.selectedIndex);
  }

  let answered = 0;
  let correct = 0;
  const unresolved: string[] = [];
  const perQuestion: MockExamResult['perQuestion'][number][] = [];

  for (const question of exam.questions) {
    const selectedIndex = answerById.get(question.id) ?? null;
    if (selectedIndex !== null
      && (!Number.isInteger(selectedIndex)
        || selectedIndex < 0
        || selectedIndex >= question.options.length)) {
      throw new MockExamError('INVALID_SELECTION', `invalid selection for ${question.id}`);
    }

    const isCorrect = selectedIndex === question.correctIndex;
    if (selectedIndex === null) unresolved.push(question.id);
    else answered += 1;
    if (isCorrect) correct += 1;

    perQuestion.push({
      questionId: question.id,
      correct: isCorrect,
      selectedIndex,
      ...(question.explanation ? { explanation: question.explanation } : {}),
    });
  }

  const totalMarks = exam.questions.length * exam.marksPerQuestion;
  return {
    examId: exam.id,
    totalQuestions: exam.questions.length,
    answered,
    correct,
    marksObtained: correct * exam.marksPerQuestion,
    totalMarks,
    percentage: (correct / exam.questions.length) * 100,
    unresolved,
    perQuestion,
  };
}
