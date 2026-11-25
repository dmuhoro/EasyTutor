import { getRandomQuestionSet } from '../lib/questionBank';
import {
  buildMockExam,
  gradeMockExam,
  type MockExam,
  type MockExamAnswer,
  type MockExamResult,
} from '../src/domain/exam/mockExam';

/**
 * Connects the local-first question bank to the mock-exam domain. The bank is
 * already offline-first (network, then persisted cache); this service adds no
 * silent fallback to invented questions. An empty bank returns `null`, and an
 * item whose correct answer is not in its options fails closed in the domain
 * builder instead of producing an ungradable exam.
 */

export interface LoadedMockExam {
  exam: MockExam;
  questionCount: number;
}

export async function loadMockExam(
  subject: string,
  topic?: string,
  count: number = 3,
): Promise<LoadedMockExam | null> {
  const items = await getRandomQuestionSet(subject, topic, undefined, count);
  if (items.length === 0) return null;

  const questions = items.map((item) => ({
    id: item.id,
    prompt: item.question,
    options: [...item.options],
    correctIndex: item.options.indexOf(item.correct_answer),
  }));

  // Published mark scheme: one mark per question. No hidden weighting.
  const marksPerQuestion = 1;

  return {
    exam: buildMockExam({
      id: `mock-${subject}-${topic ?? 'all'}`,
      subject,
      topic: topic ?? subject,
      marksPerQuestion,
      questions,
    }),
    questionCount: items.length,
  };
}

export function submitMockExam(exam: MockExam, answers: readonly MockExamAnswer[]): MockExamResult {
  return gradeMockExam(exam, answers);
}
