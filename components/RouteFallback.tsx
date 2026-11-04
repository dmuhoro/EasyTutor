import { ActivityIndicator, View } from 'react-native';

/** Shown while a lazily-loaded route chunk is fetched. */
export function RouteFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-[#0d0f12]">
      <ActivityIndicator color="#4f7cff" />
    </View>
  );
}
