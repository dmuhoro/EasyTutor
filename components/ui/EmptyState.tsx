import { View, Text, TouchableOpacity, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: StyleProp<ViewStyle>;
}

const ICON_COLORS: Record<string, string> = {
  'information-circle': COLORS.brand[400],
  'alert-circle': COLORS.warning.DEFAULT,
  'warning': COLORS.warning.DEFAULT,
  'close': COLORS.error.DEFAULT,
  'help-circle-outline': COLORS.brand[400],
};

export function EmptyState({
  icon = 'information-circle',
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-6', className)}>
      <View className="bg-surface-card border border-surface-border rounded-3xl p-8 shadow-lg shadow-black/20">
        <View className={`w-16 h-16 rounded-full items-center justify-center mb-6 ${ICON_COLORS[icon] ? 'bg-[#4f7cff]/10' : 'bg-surface-elevated'}`}>
          <Ionicons name={icon} size={32} color={ICON_COLORS[icon] ?? COLORS.text.secondary} />
        </View>
        <Text className="text-white font-bold font-syne text-xl mb-2 text-center">
          {title}
        </Text>
        {message && (
          <Text className="text-[#8a8fa3] font-dmsans text-base leading-7 mb-6 text-center max-w-md">
            {message}
          </Text>
        )}
        {actionLabel && onAction && (
          <TouchableOpacity
            onPress={onAction}
            className="bg-brand-500 border border-brand-400/30 py-3 px-6 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            <Text className="text-white font-bold font-syne text-base ml-2">
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-6', className)}>
      <View className="bg-surface-card border border-surface-border rounded-3xl p-8 shadow-lg shadow-black/20">
        <View className="w-16 h-16 rounded-full items-center justify-center mb-6 bg-[#ef4444]/10">
          <Ionicons name="alert-circle" size={32} color={COLORS.error.DEFAULT} />
        </View>
        <Text className="text-white font-bold font-syne text-xl mb-2 text-center">
          {title}
        </Text>
        {message && (
          <Text className="text-[#8a8fa3] font-dmsans text-base leading-7 mb-6 text-center max-w-md">
            {message}
          </Text>
        )}
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            className="bg-[#ef4444] border border-[#ef4444]/30 py-3 px-6 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="refresh" size={16} color="#ffffff" />
            <Text className="text-white font-bold font-syne text-base ml-2">
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export interface LoadingStateProps {
  message?: string;
  className?: StyleProp<ViewStyle>;
}

export function LoadingState({ message = 'Loading…', className }: LoadingStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-6', className)}>
      <ActivityIndicator color={COLORS.brand[400]} size="large" />
      <Text className="text-[#8a8fa3] mt-4 font-dmsans text-base">{message}</Text>
    </View>
  );
}
