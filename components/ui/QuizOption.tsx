import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export type QuizOptionState = 'default' | 'selected' | 'correct' | 'wrong';

export interface QuizOptionProps {
  label: string;
  value: string;
  selectedValue: string | null;
  correctValue: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
  className?: StyleProp<ViewStyle>;
  textClassName?: StyleProp<TextStyle>;
}

/**
 * Selectable answer card for quiz questions.
 * States: default (card bg), selected (brand border), correct (success bg),
 * wrong (error bg). Token-driven, 44px+ touch target.
 */
export function QuizOption({
  label,
  value,
  selectedValue,
  correctValue,
  onSelect,
  disabled = false,
  className,
  textClassName,
}: QuizOptionProps) {
  const isSelected = selectedValue === value;
  const isCorrect = correctValue === value;
  const isWrong = isSelected && !isCorrect;
  const showAnswer = correctValue !== null;

  const state: QuizOptionState = showAnswer
    ? isCorrect
      ? 'correct'
      : isWrong
        ? 'wrong'
        : 'default'
    : isSelected
      ? 'selected'
      : 'default';

  const CONTAINER: Record<QuizOptionState, string> = {
    default: 'bg-surface-card border-surface-border',
    selected: 'bg-brand-500/15 border-brand-500/40',
    correct: 'bg-success/15 border-success',
    wrong: 'bg-error/15 border-error',
  };

  const CHECK_ICON: Record<QuizOptionState, string> = {
    default: '',
    selected: '',
    correct: 'checkmark',
    wrong: 'close',
  };

  const handlePress = () => {
    if (disabled || showAnswer) return;
    onSelect(value);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || showAnswer}
      accessibilityRole="button"
      aria-label={`Option ${label}`}
      aria-checked={isSelected}
      className={cn(
        'flex-row items-center justify-between p-4 rounded-xl border',
        CONTAINER[state],
        disabled ? 'opacity-50' : '',
        className,
      )}
    >
      <Text
        className={cn(
          'font-dmsans text-base leading-7 flex-1',
          state === 'correct' ? 'text-success-light' : '',
          state === 'wrong' ? 'text-error-light' : '',
          state === 'selected' ? 'text-brand-400' : 'text-text-primary',
          textClassName,
        )}
      >
        {label}
      </Text>

      {CHECK_ICON[state] && (
        <View className="w-5 h-5 rounded-full flex-row items-center justify-center shrink-0">
          <Ionicons
            name={CHECK_ICON[state] as React.ComponentProps<typeof Ionicons>['name']}
            size={14}
            color={
              state === 'correct'
                ? COLORS.success.light
                : state === 'wrong'
                  ? COLORS.error.light
                : COLORS.text.secondary
            }
          />
        </View>
      )}
    </TouchableOpacity>
  );
}
