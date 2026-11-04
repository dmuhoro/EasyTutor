import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export type ChipVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

const CONTAINER: Record<ChipVariant, string> = {
  neutral: 'bg-surface-elevated border-surface-border',
  brand: 'bg-brand-500/15 border-brand-500/30',
  success: 'bg-success/15 border-success/30',
  warning: 'bg-warning/15 border-warning/30',
  danger: 'bg-error/15 border-error/30',
};

const LABEL: Record<ChipVariant, string> = {
  neutral: 'text-text-secondary',
  brand: 'text-brand-400',
  success: 'text-success-light',
  warning: 'text-warning-light',
  danger: 'text-error-light',
};

const ICON_COLOR: Record<ChipVariant, string> = {
  neutral: COLORS.text.secondary,
  brand: COLORS.brand[400],
  success: COLORS.success.light,
  warning: COLORS.warning.light,
  danger: COLORS.error.light,
};

export function Chip({
  label,
  variant = 'neutral',
  size = 'sm',
  icon,
  selected = false,
  onPress,
  className,
}: ChipProps) {
  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 12 : 14}
          color={ICON_COLOR[variant]}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        className={cn(
          'font-dmsans font-bold uppercase tracking-wider',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          LABEL[variant],
        )}
      >
        {label}
      </Text>
    </>
  );

  const classes = cn(
    'flex-row items-center self-start rounded-full border',
    size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5',
    CONTAINER[variant],
    selected && 'border-brand-500',
    className,
  );

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected }}
        activeOpacity={0.8}
        onPress={onPress}
        className={classes}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View className={classes}>{content}</View>;
}
