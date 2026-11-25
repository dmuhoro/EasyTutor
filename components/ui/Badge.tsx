import React from 'react';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: StyleProp<ViewStyle>;
}

/**
 * Small status pill. Token-driven colours; no hard-coded hex.
 * `outline` variant shows a bordered badge with transparent fill.
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
}: BadgeProps) {
  const CONTAINER: Record<BadgeVariant, string> = {
    neutral: 'bg-surface-elevated border-surface-border',
    brand: 'bg-brand-500/15 border-brand-500/30',
    success: 'bg-success/15 border-success/30',
    warning: 'bg-warning/15 border-warning/30',
    danger: 'bg-error/15 border-error/30',
    outline: 'border-surface-border bg-transparent',
  };

  const LABEL: Record<BadgeVariant, string> = {
    neutral: 'text-text-secondary',
    brand: 'text-brand-400',
    success: 'text-success-light',
    warning: 'text-warning-light',
    danger: 'text-error-light',
    outline: 'text-text-secondary',
  };

  return (
    <View
      className={cn(
        'flex-row items-center rounded-full border',
        size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1',
        CONTAINER[variant],
        className,
      )}
    >
      <Text
        className={cn(
          'font-dmsans font-bold uppercase tracking-wider',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          LABEL[variant],
        )}
      >
        {children}
      </Text>
    </View>
  );
}
