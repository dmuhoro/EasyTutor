import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  Switch, type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { COLORS } from '../../src/design/tokens';
import { cn } from '../../lib/utils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ProfileScreenProps {
  className?: StyleProp<ViewStyle>;
}

/**
 * Profile/Settings screen — theme, low-data, locale.
 * Token-driven colours, honest states, no dark patterns.
 */
export function ProfileScreen({ className }: ProfileScreenProps) {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { studyStreak, xpTotal, getLevel } = useProgressStore();
  const { theme, lowDataMode, setTheme, setLowDataMode } = useSettingsStore();

  const displayName = user?.email?.split('@')[0] ?? 'Student';
  const email = user?.email ?? '';
  const level = getLevel(xpTotal);

  const [themeValue, setThemeValue] = useState(theme);
  const [lowDataValue, setLowDataValue] = useState(lowDataMode);

  useEffect(() => {
    setThemeValue(theme);
    setLowDataValue(lowDataMode);
  }, [theme, lowDataMode]);

  const handleThemeChange = (value: 'dark' | 'light' | 'system') => {
    setThemeValue(value);
    setTheme(value);
  };

  const handleLowDataChange = (value: boolean) => {
    setLowDataValue(value);
    setLowDataMode(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Profile header */}
        <View className="mb-8 items-center">
          <View className="w-20 h-20 rounded-full bg-brand-500/20 flex-row items-center justify-center mb-4 border border-brand-500/30">
            <Text className="text-text-inverse text-3xl font-bold font-syne">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-text-primary text-2xl font-bold font-syne">{displayName}</Text>
          <Text className="text-text-secondary font-dmsans text-base mt-1">{email}</Text>
          <Text className="text-brand-400 text-sm font-bold font-dmsans mt-2">
            Level {level}
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mb-8">
          {[
            { label: 'Study Streak', value: `${studyStreak} days`, icon: 'flame', color: COLORS.warning.light, bgClass: 'bg-warning/10' },
            { label: 'Total XP', value: xpTotal.toString(), icon: 'sparkles', color: COLORS.brand[400], bgClass: 'bg-brand-500/10' },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-surface-card p-5 rounded-2xl border border-surface-border">
              <View className={cn('w-10 h-10 rounded-lg flex-row items-center justify-center mb-3', stat.bgClass)}>
                <Ionicons name={stat.icon as IconName} size={20} color={stat.color} />
              </View>
              <Text className="text-text-primary text-2xl font-bold font-syne">{stat.value}</Text>
              <Text className="text-text-secondary font-dmsans text-xs uppercase tracking-wider">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View className="space-y-3 mb-8">
          <View className="bg-surface-card p-5 rounded-2xl border border-surface-border">
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">Preferences</Text>

            {/* Theme */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-text-primary font-dmsans font-medium">Theme</Text>
                <Badge variant="neutral" size="sm">{themeValue}</Badge>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => handleThemeChange(t)}
                    activeOpacity={0.8}
                    className={`px-4 py-2 rounded-xl border flex-row items-center gap-2 mr-3 ${
                      themeValue === t
                        ? 'bg-brand-500/20 border-brand-500/40'
                        : 'bg-surface-elevated border-surface-border'
                    }`}
                  >
                    <Ionicons
                      name={t === 'dark' ? 'moon' : t === 'light' ? 'sunny' : 'globe'} as IconName
                      size={16}
                      color={themeValue === t ? COLORS.brand[400] : COLORS.text.secondary}
                    />
                    <Text className="font-dmsans text-sm font-medium text-text-primary">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Low data mode */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1">
                  <Text className="text-text-primary font-dmsans font-medium">Low Data Mode</Text>
                  <Text className="text-text-secondary text-xs font-dmsans mt-1">
                    Reduces image quality and preloads less content on mobile data.
                  </Text>
                </View>
                <Switch
                  value={lowDataValue}
                  onValueChange={handleLowDataChange}
                  trackColor={{ false: COLORS.surface.border, true: COLORS.brand[400] }}
                  thumbColor={lowDataValue ? COLORS.brand[400] : COLORS.text.secondary}
                  ios_backgroundColor={lowDataValue ? COLORS.brand[400] : COLORS.surface.border}
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => router.push('/setup')}
              activeOpacity={0.8}
              accessibilityRole="button"
              aria-label="Re-run onboarding"
              className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-text-primary font-bold font-syne text-lg">Onboarding</Text>
                <Text className="text-text-secondary font-dmsans text-sm mt-1">Update your learning preferences</Text>
              </View>
              <Ionicons name="school" size={20} color={COLORS.brand[400]} as IconName />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={signOut}
              activeOpacity={0.8}
              accessibilityRole="button"
              aria-label="Sign out"
              className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-error-light font-bold font-syne text-lg">Sign Out</Text>
                <Text className="text-text-secondary font-dmsans text-sm mt-1">Log out of your account</Text>
              </View>
              <Ionicons name="log-out" size={20} color={COLORS.error.light} as IconName />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
