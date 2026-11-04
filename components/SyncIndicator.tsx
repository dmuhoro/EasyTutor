import React from 'react';
import { View, Text, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { isSupabaseAvailable } from '../lib/supabase';

export const SyncIndicator = () => {
  const { isConnected } = useNetInfo();
  const items = useSyncQueueStore((state) => state.items);
  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'failed').length;
  
  const isSyncing = pendingCount > 0 && isConnected;
  const pulseAnim = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing]);

  if (!isSupabaseAvailable()) {
    return (
      <View className="flex-row items-center bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
        <Ionicons name="eye-off" size={12} color="#f59e0b" />
        <Text className="text-warning text-[10px] font-bold font-syne ml-1 uppercase">Offline Mode</Text>
      </View>
    );
  }

  if (isConnected === false) {
    return (
      <View className="flex-row items-center bg-error/10 px-3 py-1 rounded-full border border-error/20">
        <Ionicons name="cloud-offline" size={12} color="#ef4444" />
        <Text className="text-error text-[10px] font-bold font-syne ml-1 uppercase">Disconnected</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <Animated.View 
        className="flex-row items-center bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20"
        style={{ opacity: pulseAnim }}
      >
        <Ionicons name="sync" size={12} color="#4f7cff" />
        <Text className="text-brand-500 text-[10px] font-bold font-syne ml-1 uppercase">Syncing...</Text>
      </Animated.View>
    );
  }

  return (
    <View className="flex-row items-center bg-success/10 px-3 py-1 rounded-full border border-success/20">
      <Ionicons name="cloud-done" size={12} color="#22c55e" />
      <Text className="text-success text-[10px] font-bold font-syne ml-1 uppercase">Synced</Text>
    </View>
  );
};
