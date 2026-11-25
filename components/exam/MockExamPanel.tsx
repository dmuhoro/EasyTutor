import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { submitMockExam } from '../../services/mockExam';
import type { MockExam, MockExamResult } from '../../src/domain/exam/mockExam';
import { t } from '../../src/locales';

/**
 * Reachable mock-exam surface on the tutor route. Answers are graded by the
 * real domain function; the result reports unanswered questions explicitly and
 * never invents marks. Token-driven styling and existing locale keys only —
 * adding new strings here would load them into the shared login-route chunk.
 */
export function MockExamPanel({ exam }: { exam: MockExam }) {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [result, setResult] = useState<MockExamResult | null>(null);

  const handleSubmit = (): void => {
    setResult(submitMockExam(exam, exam.questions.map((question) => ({
      questionId: question.id,
      selectedIndex: selections[question.id] ?? null,
    }))));
  };

  return (
    <View className="mb-6 rounded-2xl border border-surface-border bg-surface-card p-4">
      <Text className="text-text-primary font-syne font-bold mb-3">{t('quiz')}</Text>
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
        onPress={handleSubmit}
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
