import React from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export interface InputProps
  extends Omit<TextInputProps, 'ref' | 'className'> {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: StyleProp<ViewStyle>;
  containerClassName?: string;
}

/**
 * Token-driven text input. No hard-coded colours — all surfaces come from
 * COLORS. Shows error state with error-coloured border and helper text.
 */
export function Input({
  label,
  icon,
  error,
  helperText,
  disabled = false,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const hasError = !!error;
  const borderColor = hasError
    ? COLORS.error.light
    : disabled
      ? COLORS.surface.border
      : COLORS.text.muted;
  const bgColor = disabled ? COLORS.surface.elevated : COLORS.surface.card;

  return (
    <View className={cn('flex-col gap-1', containerClassName)}>
      {label && (
        <Text
          className={cn(
            'text-sm font-dmsans font-medium',
            hasError ? 'text-error-light' : 'text-text-secondary',
          )}
        >
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center border rounded-xl',
          bgColor ? `bg-[${bgColor}]` : 'bg-surface-card',
          `border-[${borderColor}]`,
          hasError ? 'border-error' : 'border-surface-border',
          disabled ? 'opacity-60' : '',
          className,
        )}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={hasError ? COLORS.error.light : COLORS.text.muted}
            style={{ marginLeft: 10, marginRight: 8 }}
          />
        )}
        <TextInput
          placeholderTextColor={COLORS.text.muted}
          editable={!disabled}
          className={cn(
            'flex-1 h-12 text-text-primary font-dmsans text-base',
            disabled ? 'text-text-muted' : '',
          )}
          {...props}
        />
      </View>
      {error && (
        <Text className="text-xs font-dmsans text-error-light">{error}</Text>
      )}
      {helperText && !error && (
        <Text className="text-xs font-dmsans text-text-muted">{helperText}</Text>
      )}
    </View>
  );
}
