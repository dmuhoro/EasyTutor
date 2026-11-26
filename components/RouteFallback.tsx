import { LEGACY_COLORS } from '../src/design/legacyPalette';
import { ActivityIndicator, View } from 'react-native';

/** Shown while a lazily-loaded route chunk is fetched. */
export function RouteFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-legacy-night-canvas">
      <ActivityIndicator color={LEGACY_COLORS.blueRibbon} />
    </View>
  );
}
