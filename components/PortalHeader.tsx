import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { useProgressStore } from '../store/progressStore';
import { GlassView } from './ui/GlassView';
import { SYSTEM_CONFIG } from '../src/config/registry';
import { PortalType } from '../src/types/canonical';
import { Telemetry } from '../src/observability/telemetry';

export function PortalHeader() {
  const router = useRouter();
  const { learningMode } = useRoadmapStore();
  const { studyStreak, xpTotal } = useProgressStore();

  const mode = (learningMode || 'self_directed') as PortalType;
  const config = SYSTEM_CONFIG.PORTALS[mode];

  const handleProfilePress = () => {
    Telemetry.emit({
      event: 'PORTAL_CONTEXT_RESOLVED',
      source: 'ui',
      payload: { mode }
    });
    router.push('/profile');
  };

  return (
    <View className="px-5 py-4 flex-row items-center justify-between">
      {/* Portal Indicator (Left) */}
      <TouchableOpacity 
        onPress={() => router.push('/settings')}
        activeOpacity={0.7}
      >
        <GlassView className="px-3 py-2 flex-row items-center" borderColor={config.theme_color + '40'}>
          <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: config.theme_color }} />
          <Text className="text-white font-syne font-bold text-[10px] uppercase tracking-widest">
            {mode.replace('_', ' ')}
          </Text>
        </GlassView>
      </TouchableOpacity>

      {/* Stats (Center) */}
      <View className="flex-row items-center bg-surface-elevated/50 px-4 py-2 rounded-full border border-surface-border">
        <View className="flex-row items-center mr-4">
          <Ionicons name="flame" size={16} color="#f59e0b" />
          <Text className="text-white font-bold ml-1.5 text-xs">{studyStreak}d</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="sparkles" size={16} color="#4f7cff" />
          <Text className="text-white font-bold ml-1.5 text-xs">{xpTotal} XP</Text>
        </View>
      </View>

      {/* Profile Toggle (Right) */}
      <TouchableOpacity 
        onPress={handleProfilePress}
        activeOpacity={0.7}
        className="w-10 h-10 rounded-full bg-brand-500 items-center justify-center border-2 border-white/20 shadow-lg"
      >
        <Ionicons name="person" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}
