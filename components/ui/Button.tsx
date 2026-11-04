import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 border border-brand-400/30',
  secondary: 'bg-surface-card border border-surface-border',
  ghost: 'bg-transparent border border-transparent',
  danger: 'bg-error border border-error-light/30',
  inverse: 'bg-white border border-white',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text-primary',
  ghost: 'text-brand-400',
  danger: 'text-white',
  inverse: 'text-[#0d0f12]',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 rounded-xl',
  md: 'h-12 px-5 rounded-2xl',
  lg: 'h-16 px-6 rounded-2xl',
};

const LABEL_SIZE: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

const ICON_COLOR: Record<ButtonVariant, string> = {
  primary: COLORS.text.primary,
  secondary: COLORS.text.primary,
  ghost: COLORS.brand[400],
  danger: COLORS.text.primary,
  inverse: COLORS.text.inverse,
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconNode = icon ? (
    <Ionicons
      name={icon}
      size={ICON_SIZE[size]}
      color={ICON_COLOR[variant]}
      style={iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }}
    />
  ) : null;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      activeOpacity={0.8}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        CONTAINER[variant],
        SIZE[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <View className="flex-row items-center">
          <ActivityIndicator color={ICON_COLOR[variant]} />
          <Text className={cn('font-syne font-bold ml-2', LABEL[variant], LABEL_SIZE[size])}>
            {children}
          </Text>
        </View>
      ) : (
        <>
          {iconPosition === 'left' && iconNode}
          <Text className={cn('font-syne font-bold', LABEL[variant], LABEL_SIZE[size])}>
            {children}
          </Text>
          {iconPosition === 'right' && iconNode}
        </>
      )}
    </TouchableOpacity>
  );
}
