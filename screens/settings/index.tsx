import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView,
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
import { PortalSwitcher } from '../../components/ui/PortalSwitcher';
import { PrivacySection } from '../../components/privacy/PrivacySection';
import {
  OLLAMA_MODELS,
  OLLAMA_MODEL_ROLES,
  checkOllamaModelAvailability,
  type OllamaModelRole,
  type OllamaModelStatus,
} from '../../lib/ollamaModels';
import { COLORS } from '../../src/design/tokens';
import { cn } from '../../lib/utils';
import { t } from '../../src/locales';

const STATUS_STYLES: Record<OllamaModelStatus, { label: string; color: string; className: string }> = {
  available: { label: 'AVAILABLE', color: LEGACY_COLORS.green500, className: 'bg-green-500/10 border-green-500/40' },
  not_pulled: { label: 'NOT PULLED', color: LEGACY_COLORS.amberBright, className: 'bg-amber-500/10 border-amber-500/40' },
  unknown: { label: 'UNKNOWN', color: LEGACY_COLORS.nightTextMuted, className: 'bg-surface-elevated border-surface-border' },
};

const ALL_UNKNOWN: Record<OllamaModelRole, OllamaModelStatus> = {
  reasoning: 'unknown',
  agent: 'unknown',
  coding: 'unknown',
  embedding: 'unknown',
};

export interface ProfileScreenProps {
  className?: StyleProp<ViewStyle>;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Profile/Settings screen — theme, low-data, locale.
 * Token-driven colours, honest states, no dark patterns.
 * All user-facing strings via t() locale lookups.
 */
export function ProfileScreen({ className }: ProfileScreenProps) {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { studyStreak, xpTotal, getLevel } = useProgressStore();
  const {
    theme, lowDataMode, setTheme, setLowDataMode,
    useLocalLLM, setUseLocalLLM,
    ollamaUrl, setOllamaUrl,
    ollamaChatModel, setOllamaChatModel,
    ollamaEmbeddingModel, setOllamaEmbeddingModel,
  } = useSettingsStore();

  const displayName = user?.email?.split('@')[0] ?? t('student');
  const email = user?.email ?? '';
  const level = getLevel(xpTotal);

  const [themeValue, setThemeValue] = useState(theme);
  const [lowDataValue, setLowDataValue] = useState(lowDataMode);
  const [modelStatus, setModelStatus] = useState<Record<OllamaModelRole, OllamaModelStatus>>(ALL_UNKNOWN);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setThemeValue(theme);
    setLowDataValue(lowDataMode);
  }, [theme, lowDataMode]);

  const refreshStatus = async () => {
    setChecking(true);
    try {
      setModelStatus(await checkOllamaModelAvailability(ollamaUrl));
    } finally {
      setChecking(false);
    }
  };

  // Same governed Ollama model-status probe as the previous live settings screen.
  useEffect(() => {
    void refreshStatus();
  }, [ollamaUrl]);

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
            { label: t('studyStreak'), value: `${studyStreak} days`, icon: 'flame', color: COLORS.warning.light, bgClass: 'bg-warning/10' },
            { label: t('totalXP'), value: xpTotal.toString(), icon: 'sparkles', color: COLORS.brand[400], bgClass: 'bg-brand-500/10' },
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
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">{t('preferences')}</Text>

            {/* Theme */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-text-primary font-dmsans font-medium">{t('theme')}</Text>
                <Badge variant="neutral" size="sm">{themeValue}</Badge>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                {(['dark', 'light', 'system'] as const).map((tVal) => (
                  <TouchableOpacity
                    key={tVal}
                    onPress={() => handleThemeChange(tVal)}
                    activeOpacity={0.8}
                    className={`px-4 py-2 rounded-xl border flex-row items-center gap-2 mr-3 ${
                      themeValue === tVal
                        ? 'bg-brand-500/20 border-brand-500/40'
                        : 'bg-surface-elevated border-surface-border'
                    }`}
                  >
                    <Ionicons
                      name={tVal === 'dark' ? 'moon' : tVal === 'light' ? 'sunny' : 'globe'} as IconName
                      size={16}
                      color={themeValue === tVal ? COLORS.brand[400] : COLORS.text.secondary}
                    />
                    <Text className="font-dmsans text-sm font-medium text-text-primary">
                      {tVal.charAt(0).toUpperCase() + tVal.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Low data mode */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1">
                  <Text className="text-text-primary font-dmsans font-medium">{t('lowDataMode')}</Text>
                  <Text className="text-text-secondary text-xs font-dmsans mt-1">
                    {t('lowDataDesc')}
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

          {/* Offline AI — ported from the live settings screen so the design
              refresh does not drop Ollama config or model-status detection. */}
          <View className="bg-surface-card p-5 rounded-2xl border border-surface-border">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pr-4">
                <Text className="text-text-primary font-bold font-syne text-lg">{t('useLocalAI')}</Text>
                <Text className="text-text-secondary text-sm mt-1 mb-4 font-dmsans flex-wrap leading-5">
                  {t('ollamaDesc')}
                </Text>
              </View>
              <Switch
                value={useLocalLLM}
                onValueChange={setUseLocalLLM}
                trackColor={{ false: COLORS.surface.border, true: COLORS.brand[400] }}
                thumbColor={COLORS.text.inverse}
                accessibilityLabel={t('useLocalAI')}
              />
            </View>

            <Text className="text-text-primary font-bold font-syne mb-3 mt-2">{t('ollamaServerUrl')}</Text>
            <TextInput
              className="w-full bg-surface-bg text-text-primary border border-surface-border rounded-xl px-4 py-3 mb-5 font-dmsans"
              placeholder="http://192.168.1.x:11434"
              placeholderTextColor={COLORS.text.secondary}
              value={ollamaUrl}
              onChangeText={setOllamaUrl}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('ollamaServerUrl')}
            />

            <Text className="text-text-primary font-bold font-syne mb-3">{t('configuredModels')}</Text>
            <Text className="text-text-secondary text-xs mb-4 font-dmsans leading-5">
              {t('configuredModelsDesc')}
            </Text>

            <View className="flex-row items-center gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-text-secondary text-xs font-bold font-syne uppercase tracking-widest mb-2">
                  {t('reasoningChat')}
                </Text>
                <TextInput
                  className="w-full bg-surface-bg text-text-primary border border-surface-border rounded-xl px-4 py-3 font-dmsans"
                  value={ollamaChatModel}
                  onChangeText={setOllamaChatModel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('reasoningChat')}
                />
              </View>
              <Badge variant={modelStatus.reasoning === 'available' ? 'success' : 'neutral'} size="sm">
                {STATUS_STYLES[modelStatus.reasoning].label}
              </Badge>
            </View>

            <View className="flex-row items-center gap-3 mb-5">
              <View className="flex-1">
                <Text className="text-text-secondary text-xs font-bold font-syne uppercase tracking-widest mb-2">
                  {t('embeddingRAG')}
                </Text>
                <TextInput
                  className="w-full bg-surface-bg text-text-primary border border-surface-border rounded-xl px-4 py-3 font-dmsans"
                  value={ollamaEmbeddingModel}
                  onChangeText={setOllamaEmbeddingModel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('embeddingRAG')}
                />
              </View>
              <Badge variant={modelStatus.embedding === 'available' ? 'success' : 'neutral'} size="sm">
                {STATUS_STYLES[modelStatus.embedding].label}
              </Badge>
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-primary font-bold font-syne">{t('modelSlots')}</Text>
              <TouchableOpacity
                onPress={() => void refreshStatus()}
                disabled={checking}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('refresh')}
              >
                <Text className={`font-dmsans text-xs font-bold ${checking ? 'text-text-muted' : 'text-brand-400'}`}>
                  {checking ? t('checking') : t('refresh')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-text-secondary text-xs mb-4 font-dmsans leading-5">{t('modelSlotsDesc')}</Text>

            {OLLAMA_MODEL_ROLES.map((role) => {
              const spec = OLLAMA_MODELS[role];
              const status = STATUS_STYLES[modelStatus[role]];
              return (
                <View key={role} className="flex-row items-center justify-between bg-surface-bg border border-surface-border rounded-xl px-4 py-3 mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-text-primary font-bold font-syne text-sm capitalize">{role}</Text>
                    <Text className="text-text-secondary text-xs font-dmsans">{spec.id}</Text>
                    <Text className="text-text-muted text-xs font-dmsans mt-1">{spec.useCase}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full border ${status.className}`}>
                    <Text className="font-dmsans text-xs font-bold" style={{ color: status.color }}>{status.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <PortalSwitcher />

          {/* Privacy — consent, export and explicit erasure on the real route */}
          <PrivacySection />

          {/* Actions */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => router.push('/setup-wizard')}
              activeOpacity={0.8}
              accessibilityRole="button"
              aria-label={t('reRunOnboarding')}
              className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-text-primary font-bold font-syne text-lg">{t('onboarding')}</Text>
                <Text className="text-text-secondary font-dmsans text-sm mt-1">{t('updateLearningPreferences')}</Text>
              </View>
              <Ionicons name="school" size={20} color={COLORS.brand[400]} as IconName />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={signOut}
              activeOpacity={0.8}
              accessibilityRole="button"
              aria-label={t('signOut')}
              className="bg-surface-card p-5 rounded-2xl border border-surface-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-error-light font-bold font-syne text-lg">{t('signOut')}</Text>
                <Text className="text-text-secondary font-dmsans text-sm mt-1">{t('logOut')}</Text>
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
