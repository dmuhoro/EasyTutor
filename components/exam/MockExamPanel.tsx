import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { submitMockExam } from '../../services/mockExam';
import {
  mockExamDurationSeconds,
  type MockExam,
  type MockExamResult,
} from '../../src/domain/exam/mockExam';
import { t } from '../../src/locales';

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
}

/**
 * Reachable mock-exam surface on the tutor route. Answers are graded by the
 * real domain function; the result reports unanswered questions explicitly and
 * never invents marks. The countdown is rendered with plain token-styled text
 * so the login route keeps its unchanged byte budget; no new locale key or icon
 * import is added.
 */
export function MockExamPanel({ exam }: { exam: MockExam }) {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [result, setResult] = useState<MockExamResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => mockExamDurationSeconds(exam));
  const finished = useRef(false);
  const submitRef = useRef<() => void>(() => {});

  submitRef.current = (): void => {
    if (finished.current) return;
    finished.current = true;
    setResult(submitMockExam(exam, exam.questions.map((question) => ({
      questionId: question.id,
      selectedIndex: selections[question.id] ?? null,
    }))));
  };

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          submitRef.current();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  return (
    <View className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-4">
      <View className="flex-row items-center justify-between gap-2 mb-3">
        <Text className="text-text-primary font-syne font-bold">{t('quiz')}</Text>
        <Text className="font-dmsans text-text-secondary">{formatClock(secondsLeft)}</Text>
      </View>
      {exam.questions.map((question, questionIndex) => (
        <View key={question.id} className="mb-4">
          <Text className="text-text-primary font-dmsans text-sm">
            {`${questionIndex + 1}. ${question.prompt}`}
          </Text>
          {question.options.map((option, optionIndex) => {
            const selected = selections[question.id] === optionIndex;
            return (
              <TouchableOpacity
                key={`${question.id}-${optionIndex}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSelections((current) => ({ ...current, [question.id]: optionIndex }))}
                className={`min-h-[44px] px-3 py-2 mb-1 rounded-xl border ${selected ? 'border-primary bg-primary/10' : 'border-surface-border'}`}
              >
                <Text className={`font-dmsans ${selected ? 'text-primary' : 'text-text-secondary'}`}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <TouchableOpacity
        accessibilityRole="button"
        disabled={Boolean(result)}
        onPress={() => submitRef.current()}
        className="min-h-[48px] items-center justify-center rounded-xl bg-primary px-4"
      >
        <Text className="text-text-inverse font-dmsans">{t('finishQuiz')}</Text>
      </TouchableOpacity>
      {result && (
        <View className="mt-2">
          <Text className="text-text-primary font-dmsans">
            {`${t('correctAnswer')} ${result.correct}/${result.totalQuestions}`}
          </Text>
          <Text className="text-text-primary font-dmsans">
            {`${t('youAnswered')} ${result.answered}/${result.totalQuestions}`}
          </Text>
          <Text className="text-warning font-dmsans">
            {`${t('outstanding')} ${result.unresolved.length}`}
          </Text>
        </View>
      )}
    </View>
  );
}
