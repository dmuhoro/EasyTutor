import React from 'react';
import {
  View,
  Text,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { cn } from '../../lib/utils';

export type StageStatus = 'pending' | 'active' | 'complete';

export interface StageStep {
  label: string;
  status?: StageStatus;
}

export interface StageStepperProps {
  steps: StageStep[];
  className?: StyleProp<ViewStyle>;
  labelClassName?: StyleProp<TextStyle>;
}

/**
 * Numbered stepper for multi-stage flows (tutor session: Understand →
 * Practice → Quiz → Review). Active stage highlighted in brand colour.
 * Token-driven colours, 44px+ touch targets.
 */
export function StageStepper({
  steps,
  className,
  labelClassName,
}: StageStepperProps) {
  return (
    <View className={cn('flex-row items-center justify-between', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isActive = step.status === 'active';
        const isComplete = step.status === 'complete';

        return (
          <View key={step.label} className="flex-row items-center gap-2">
            {/* Step number */}
            <View
              className={cn(
                'w-7 h-7 rounded-full flex-row items-center justify-center',
                isActive
                  ? 'bg-brand-500 border-brand-500'
                  : isComplete
                    ? 'bg-success border-success'
                    : 'bg-surface-elevated border-surface-border',
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-dmsans font-bold',
                  isActive || isComplete
                    ? 'text-text-inverse'
                    : 'text-text-muted',
                )}
              >
                {i + 1}
              </Text>
            </View>

            {/* Step label */}
            <Text
              className={cn(
                'text-[11px] font-dmsans font-medium leading-tight',
                isActive ? 'text-brand-400' : 'text-text-secondary',
                labelClassName,
              )}
            >
              {step.label}
            </Text>

            {/* Connector line between steps */}
            {!isLast && (
              <View
                className={cn(
                  'w-1 h-px',
                  isActive || isComplete
                    ? 'bg-brand-400'
                    : 'bg-surface-border',
                )}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
