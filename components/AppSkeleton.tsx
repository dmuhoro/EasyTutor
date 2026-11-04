import { View } from 'react-native';
import { Skeleton } from './ui/Skeleton';

/**
 * First-paint skeleton. Renders before auth/profile/fonts settle so the user
 * sees the app shell instead of a blank screen. Intentionally font-free and
 * dependency-light: it is part of the eager entry chunk.
 */
export function AppSkeleton() {
  return (
    <View
      testID="app-skeleton"
      accessibilityLabel="Loading EasyTutor"
      accessibilityRole="progressbar"
      className="flex-1 bg-surface-bg px-5 pt-14"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Skeleton width={128} height={28} rounded="lg" />
        <Skeleton width={36} height={36} rounded="full" />
      </View>

      {/* Greeting */}
      <View className="mt-8">
        <Skeleton width={96} height={16} rounded="sm" />
      </View>
      <View className="mt-3">
        <Skeleton width={208} height={32} rounded="lg" />
      </View>

      {/* Primary card */}
      <View className="mt-8">
        <Skeleton height={144} rounded="2xl" />
      </View>
      <View className="mt-4">
        <Skeleton width={160} height={16} rounded="sm" />
      </View>
      <View className="mt-3">
        <Skeleton width={224} height={12} rounded="sm" />
      </View>

      {/* Subject grid */}
      <View className="mt-8 flex-row flex-wrap justify-between">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="mb-4 w-[47%]">
            <Skeleton height={96} rounded="lg" />
          </View>
        ))}
      </View>
    </View>
  );
}
