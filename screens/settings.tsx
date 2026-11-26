import { t } from '../src/locales';
import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { PortalSwitcher } from '../components/ui/PortalSwitcher';
import {
  OLLAMA_MODELS,
  OLLAMA_MODEL_ROLES,
  checkOllamaModelAvailability,
  OllamaModelRole,
  OllamaModelStatus,
} from '../lib/ollamaModels';

const STATUS_STYLES: Record<OllamaModelStatus, { label: string; color: string; className: string }> = {
  available: { label: t('kv'), color: LEGACY_COLORS.green500, className: 'bg-green-500/10 border-green-500/40' },
  not_pulled: { label: t('ms'), color: LEGACY_COLORS.amberBright, className: 'bg-amber-500/10 border-amber-500/40' },
  unknown: { label: t('bs'), color: LEGACY_COLORS.nightTextMuted, className: 'bg-legacy-night-border/40 border-legacy-night-border' },
};

const ALL_UNKNOWN: Record<OllamaModelRole, OllamaModelStatus> = {
  reasoning: 'unknown',
  agent: 'unknown',
  coding: 'unknown',
  embedding: 'unknown',
};

function StatusBadge({ status }: { status: OllamaModelStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <View className={`px-3 py-1 rounded-full border ${s.className}`}>
      <Text className="font-dmsans text-xs font-bold" style={{ color: s.color }}>{s.label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    useLocalLLM, setUseLocalLLM,
    ollamaUrl, setOllamaUrl,
    ollamaChatModel, setOllamaChatModel,
    ollamaEmbeddingModel, setOllamaEmbeddingModel,
  } = useSettingsStore();
  const [modelStatus, setModelStatus] = useState<Record<OllamaModelRole, OllamaModelStatus>>(ALL_UNKNOWN);
  const [checking, setChecking] = useState(false);

  const refreshStatus = async () => {
    setChecking(true);
    const next = await checkOllamaModelAvailability(ollamaUrl);
    setModelStatus(next);
    setChecking(false);
  };

  useEffect(() => {
    void refreshStatus();
  }, [ollamaUrl]);

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-legacy-night-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={LEGACY_COLORS.white} />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold font-syne">{t('settings')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-white font-bold font-syne text-xl mb-4">{t('kb')}</Text>

        <View className="bg-legacy-night-surface rounded-3xl p-5 border border-legacy-night-border/60 mb-6 shadow-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-white font-bold font-syne text-lg">{t('useLocalAI')}</Text>
              <Text className="text-legacy-night-text-muted text-sm mt-1 mb-4 font-dmsans flex-wrap leading-5">
                {t('ii')}
              </Text>
            </View>
            <Switch
              value={useLocalLLM}
              onValueChange={setUseLocalLLM}
              trackColor={{ false: LEGACY_COLORS.nightBorder, true: LEGACY_COLORS.blueRibbon }}
              thumbColor={LEGACY_COLORS.white}
              ios_backgroundColor={LEGACY_COLORS.nightBorder}
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], alignSelf: 'flex-start', marginTop: 4 }}
            />
          </View>
          
          <Text className="text-white font-bold font-syne mb-3 mt-4 mt-2">{t('ollamaServerUrl')}</Text>
          <TextInput
            className="w-full bg-legacy-night-canvas text-white border border-legacy-night-border rounded-2xl px-4 py-4 mb-5 font-dmsans"
            placeholder="http://192.168.1.x:11434"
            placeholderTextColor={LEGACY_COLORS.nightTextMuted}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-white font-bold font-syne mb-3 mt-4">{t('configuredModels')}</Text>
          <Text className="text-legacy-night-text-muted text-xs mb-4 font-dmsans leading-5">
            {t('cw')}
          </Text>

          <View className="flex-row items-center gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-legacy-night-text-muted text-xs font-bold font-syne uppercase tracking-widest mb-2">{t('reasoningChat')}</Text>
              <TextInput
                className="w-full bg-legacy-night-canvas text-white border border-legacy-night-border rounded-2xl px-4 py-3 font-dmsans"
                value={ollamaChatModel}
                onChangeText={setOllamaChatModel}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="py-1">
              <StatusBadge status={modelStatus.reasoning} />
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-1">
              <Text className="text-legacy-night-text-muted text-xs font-bold font-syne uppercase tracking-widest mb-2">{t('embeddingRAG')}</Text>
              <TextInput
                className="w-full bg-legacy-night-canvas text-white border border-legacy-night-border rounded-2xl px-4 py-3 font-dmsans"
                value={ollamaEmbeddingModel}
                onChangeText={setOllamaEmbeddingModel}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="py-1">
              <StatusBadge status={modelStatus.embedding} />
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-bold font-syne">{t('modelSlots')}</Text>
            <TouchableOpacity onPress={() => void refreshStatus()} disabled={checking} activeOpacity={0.7}>
              <Text className={`font-dmsans text-xs font-bold ${checking ? 'text-legacy-night-border-strong' : 'text-legacy-blue-ribbon'}`}>
                {checking ? t('mg') : t('bf')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-legacy-night-text-muted text-xs mb-4 font-dmsans leading-5">
            {t('et')}{' '}
            <Text className="text-white font-bold">{t('z')}</Text> {t('fj')}
          </Text>

          {OLLAMA_MODEL_ROLES.map((role) => {
            const spec = OLLAMA_MODELS[role];
            const status = STATUS_STYLES[modelStatus[role]];
            return (
              <View key={role} className="flex-row items-center justify-between bg-legacy-night-canvas border border-legacy-night-border rounded-2xl px-4 py-3 mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-white font-bold font-syne text-sm capitalize">{role}</Text>
                  <Text className="text-legacy-night-text-muted text-xs font-dmsans">{spec.id}</Text>
                  <Text className="text-legacy-night-text-secondary text-xs font-dmsans mt-1">{spec.useCase}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full border ${status.className}`}>
                  <Text className="font-dmsans text-xs font-bold" style={{ color: status.color }}>{status.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <PortalSwitcher />

        <View className="mt-8 mb-20">
          <Text className="text-legacy-night-text-muted font-bold font-syne text-xs uppercase tracking-widest mb-4 px-2">{t('bg')}</Text>
          <View className="bg-legacy-night-surface rounded-3xl border border-legacy-night-border/60 overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-legacy-night-border/30">
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color={LEGACY_COLORS.nightTextMuted} className="mr-4" />
                <Text className="text-white font-dmsans ml-3">{t('ki')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={LEGACY_COLORS.nightBorderStrong} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-5">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={20} color={LEGACY_COLORS.nightTextMuted} className="mr-4" />
                <Text className="text-white font-dmsans ml-3">{t('bd')}</Text>
              </View>
              <Text className="text-legacy-night-border-strong font-dmsans text-xs">{t('cg')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            className="mt-8 flex-row items-center justify-center p-5 rounded-3xl bg-red-500/5 border border-red-500/10"
            onPress={() => router.push('/')}
          >
            <Ionicons name="log-out-outline" size={20} color={LEGACY_COLORS.red500} />
            <Text className="text-red-500 font-bold font-syne ml-3">{t('signOut')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
