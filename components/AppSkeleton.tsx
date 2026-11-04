import { View } from 'react-native';

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
      className="flex-1 bg-[#0d0f12] px-5 pt-14"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="h-7 w-32 rounded-lg bg-[#1a1e28]" />
        <View className="h-9 w-9 rounded-full bg-[#1a1e28]" />
      </View>

      {/* Greeting */}
      <View className="mt-8 h-4 w-24 rounded bg-[#161a23]" />
      <View className="mt-3 h-8 w-52 rounded-lg bg-[#1a1e28]" />

      {/* Primary card */}
      <View className="mt-8 h-36 rounded-3xl bg-[#141822]" />
      <View className="mt-4 h-4 w-40 rounded bg-[#161a23]" />
      <View className="mt-3 h-3 w-56 rounded bg-[#12161e]" />

      {/* Subject grid */}
      <View className="mt-8 flex-row flex-wrap justify-between">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="mb-4 h-24 w-[47%] rounded-2xl bg-[#141822]" />
        ))}
      </View>
    </View>
  );
}
