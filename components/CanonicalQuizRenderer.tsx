import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card, CardTitle, CardDescription } from './ui/Card';
import { GlassView } from './ui/GlassView';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CanonicalQuizRendererProps {
  questions: QuizQuestion[];
  currentIndex: number;
  selectedOption: number | null;
  showExplanation: boolean;
  onSelectOption: (index: number) => void;
  onNext: () => void;
  loading?: boolean;
  interventionText?: string;
  accentColor?: string;
}

export const CanonicalQuizRenderer: React.FC<CanonicalQuizRendererProps> = ({
  questions,
  currentIndex,
  selectedOption,
  showExplanation,
  onSelectOption,
  onNext,
  loading,
  interventionText,
  accentColor = LEGACY_COLORS.blueRibbon
}) => {
  const currentQuestion = questions[currentIndex];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={accentColor} />
        <Text className="text-legacy-night-text-muted mt-4 text-center font-dmsans">
          Designing a challenging question for you...
        </Text>
      </View>
    );
  }

  if (!currentQuestion) return null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <Text className="text-white text-2xl font-bold font-syne mb-8 leading-9">
        {currentQuestion.question}
      </Text>

      <View className="mb-6">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = showExplanation && idx === currentQuestion.correctIndex;
          const isWrong = showExplanation && isSelected && !isCorrect;
          
          const borderColor = isCorrect ? 'border-green-500' : isWrong ? 'border-red-500' : isSelected ? `border-[${accentColor}]` : 'border-legacy-night-border';
          const bgColor = isCorrect ? 'bg-green-500/10' : isWrong ? 'bg-red-500/10' : isSelected ? `${accentColor}20` : 'bg-legacy-night-surface';

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectOption(idx)}
              activeOpacity={0.7}
              disabled={showExplanation}
              className={`p-5 rounded-2xl mb-4 border-2 flex-row items-center justify-between ${borderColor} ${bgColor}`}
            >
              <Text className={`text-base font-dmsans flex-1 pr-4 leading-6 ${showExplanation && (isCorrect || isWrong) ? 'text-white' : 'text-legacy-slate200'}`}>
                {option}
              </Text>
              {showExplanation && isCorrect && <Ionicons name="checkmark-circle" size={24} color={LEGACY_COLORS.green500} />}
              {showExplanation && isWrong && <Ionicons name="close-circle" size={24} color={LEGACY_COLORS.red500} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {showExplanation && (
        <Card className="mb-8">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color={accentColor} />
            <CardTitle className="text-lg ml-2">Explanation</CardTitle>
          </View>
          <CardDescription className="text-base leading-6">
            {currentQuestion.explanation}
          </CardDescription>
        </Card>
      )}

      {showExplanation && interventionText && (
        <GlassView className="mb-8" borderColor={LEGACY_COLORS.amberBright}>
          <View className="flex-row items-center mb-2">
            <Ionicons name="bulb-outline" size={20} color={LEGACY_COLORS.amberBright} />
            <Text className="text-lg ml-2 text-legacy-amber-bright font-syne font-bold">Tutor Intervention</Text>
          </View>
          <Text className="text-base leading-6 text-white/90 font-dmsans">
            {interventionText}
          </Text>
        </GlassView>
      )}

      {showExplanation && (
        <TouchableOpacity 
          onPress={onNext}
          className="py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg"
          style={{ backgroundColor: accentColor, shadowColor: accentColor, shadowOpacity: 0.3 }}
        >
          <Text className="text-white font-bold text-lg font-syne mr-2">
            {currentIndex + 1 >= questions.length ? "Finish Quiz" : "Next Question"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={LEGACY_COLORS.white} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};
