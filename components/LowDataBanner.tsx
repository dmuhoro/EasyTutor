import { LEGACY_COLORS } from '../src/design/legacyPalette';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../lib/utils';
import { COLORS } from '../src/design/tokens';
import { useSettingsStore } from '../store/settingsStore';

export interface LowDataBannerProps {
  className?: string;
}

/**
 * Visible per-session data-use estimate banner. Shows how many KB the session
 * has consumed so far and lets the learner toggle low-data mode (text-first,
 * shorter AI replies, no autoplay). Displayed on the settings screen and any
 * screen where network-bound features are used.
 */
export function LowDataBanner({ className }: LowDataBannerProps) {
  const { lowDataMode, setLowDataMode, dataUseKB, addDataUseKB } =
    useSettingsStore((s) => ({
      lowDataMode: s.lowDataMode,
      setLowDataMode: s.setLowDataMode,
      dataUseKB: s.dataUseKB,
      addDataUseKB: s.addDataUseKB,
    }));

  const kb = Math.max(0, dataUseKB);
  const mb = (kb / 1024).toFixed(2);

  return (
    <View className={cn('flex-row items-center justify-between px-4 py-3', className)}>
      <View className="flex-1">
        <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-widest font-bold mb-1">
          Data use this session
        </Text>
        <Text className="text-white font-bold font-syne text-lg">
          {kb < 1024 ? `${kb} KB` : `${mb} MB`}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => setLowDataMode(!lowDataMode)}
          className={cn(
            'flex-row items-center gap-1.5 py-1.5 px-3 rounded-xl border',
            lowDataMode
              ? 'bg-legacy-green500/10 border-legacy-green500/30'
              : 'bg-surface-card border-legacy-night-border'
          )}
        >
          <Ionicons
            name={lowDataMode ? 'checkmark-circle' : 'radio-button-off'}
            size={14}
            color={lowDataMode ? LEGACY_COLORS.green500 : COLORS.text.secondary}
          />
          <Text
            className={cn(
              'text-[10px] font-bold font-syne uppercase tracking-widest',
              lowDataMode ? 'text-legacy-green500' : 'text-legacy-night-text-muted'
            )}
          >
            Low data
          </Text>
        </TouchableOpacity>
        <ActivityIndicator
          color={COLORS.brand[400]}
          size="small"
          style={{ opacity: lowDataMode ? 1 : 0 }}
        />
      </View>
    </View>
  );
}

export function recordDataUseKB(kb: number) {
  const { addDataUseKB } = useSettingsStore.getState();
  addDataUseKB(kb);
}
