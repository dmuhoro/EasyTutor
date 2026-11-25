import React from 'react';
import { View, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export interface TimerProps {
  seconds: number;
  label?: string;
  warningAt?: number;
  className?: StyleProp<ViewStyle>;
  textClassName?: StyleProp<TextStyle>;
}

/**
 * Countdown timer for mock exam mode. Shows warning colour when below
 * warningAt seconds (default 60). Token-driven colours.
 */
export function Timer({
  seconds,
  label,
  warningAt = 60,
  className,
  textClassName,
}: TimerProps) {
  const isWarning = seconds <= warningAt && seconds > 0;
  const isExpired = seconds <= 0;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg',
        isExpired
          ? 'bg-surface-elevated border-surface-border'
          : isWarning
            ? 'bg-warning/15 border-warning/30'
            : 'bg-surface-elevated border-surface-border',
        className,
      )}
    >
      <Ionicons
        name="alert-circle"
        size={14}
        color={
          isExpired
            ? COLORS.text.muted
            : isWarning
              ? COLORS.warning.light
              : COLORS.text.secondary
        }
      />
      <Text
        className={cn(
          'font-dmsans font-bold text-sm',
          isExpired
            ? 'text-text-muted'
            : isWarning
              ? 'text-warning-light'
              : 'text-text-secondary',
          textClassName,
        )}
      >
        {timeString}
      </Text>
      {label && (
        <Text
          className={cn(
            'font-dmsans text-[10px]',
            isExpired
              ? 'text-text-muted'
              : isWarning
                ? 'text-warning-light'
                : 'text-text-muted',
          )}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
