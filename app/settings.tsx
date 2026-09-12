import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';
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
  available: { label: 'AVAILABLE', color: '#22c55e', className: 'bg-green-500/10 border-green-500/40' },
  not_pulled: { label: 'NOT PULLED', color: '#f59e0b', className: 'bg-amber-500/10 border-amber-500/40' },
  unknown: { label: 'UNKNOWN', color: '#8a8fa3', className: 'bg-[#2a2f3d]/40 border-[#2a2f3d]' },
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
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2a2f3d]">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold font-syne">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-white font-bold font-syne text-xl mb-4">Offline AI Capabilities</Text>

        <View className="bg-[#161920] rounded-3xl p-5 border border-[#2a2f3d]/60 mb-6 shadow-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-white font-bold font-syne text-lg">Use Local AI (Ollama)</Text>
              <Text className="text-[#8a8fa3] text-sm mt-1 mb-4 font-dmsans flex-wrap leading-5">
                Run Ollama on your computer and connect your phone to the same WiFi. Use your computer's LAN IP below (e.g. 192.168.1.23), not "localhost". No `/v1` suffix — local AI works fully offline!
              </Text>
            </View>
            <Switch
              value={useLocalLLM}
              onValueChange={setUseLocalLLM}
              trackColor={{ false: '#2a2f3d', true: '#4f7cff' }}
              thumbColor={'#ffffff'}
              ios_backgroundColor="#2a2f3d"
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], alignSelf: 'flex-start', marginTop: 4 }}
            />
          </View>
          
          <Text className="text-white font-bold font-syne mb-3 mt-4 mt-2">Ollama Server URL</Text>
          <TextInput
            className="w-full bg-[#0d0f12] text-white border border-[#2a2f3d] rounded-2xl px-4 py-4 mb-5 font-dmsans"
            placeholder="http://192.168.1.x:11434"
            placeholderTextColor="#8a8fa3"
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text className="text-white font-bold font-syne mb-3 mt-4">Configured Models</Text>
          <Text className="text-[#8a8fa3] text-xs mb-4 font-dmsans leading-5">
            The chat model drives tutoring; the embedding model powers Polymath RAG.
            Both are editable so you can pin any model you have pulled.
          </Text>

          <View className="flex-row items-center gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-[#8a8fa3] text-xs font-bold font-syne uppercase tracking-widest mb-2">Reasoning / Chat</Text>
              <TextInput
                className="w-full bg-[#0d0f12] text-white border border-[#2a2f3d] rounded-2xl px-4 py-3 font-dmsans"
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
              <Text className="text-[#8a8fa3] text-xs font-bold font-syne uppercase tracking-widest mb-2">Embedding / RAG</Text>
              <TextInput
                className="w-full bg-[#0d0f12] text-white border border-[#2a2f3d] rounded-2xl px-4 py-3 font-dmsans"
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
            <Text className="text-white font-bold font-syne">Model Slots</Text>
            <TouchableOpacity onPress={() => void refreshStatus()} disabled={checking} activeOpacity={0.7}>
              <Text className={`font-dmsans text-xs font-bold ${checking ? 'text-[#3a3f53]' : 'text-[#4f7cff]'}`}>
                {checking ? 'CHECKING…' : 'REFRESH'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-[#8a8fa3] text-xs mb-4 font-dmsans leading-5">
            Each role calls its own model. Status is detected from Ollama's /api/tags. Run{' '}
            <Text className="text-white font-bold">ollama pull &lt;model&gt;</Text> for any slot marked NOT PULLED.
          </Text>

          {OLLAMA_MODEL_ROLES.map((role) => {
            const spec = OLLAMA_MODELS[role];
            const status = STATUS_STYLES[modelStatus[role]];
            return (
              <View key={role} className="flex-row items-center justify-between bg-[#0d0f12] border border-[#2a2f3d] rounded-2xl px-4 py-3 mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-white font-bold font-syne text-sm capitalize">{role}</Text>
                  <Text className="text-[#8a8fa3] text-xs font-dmsans">{spec.id}</Text>
                  <Text className="text-[#5a5f73] text-xs font-dmsans mt-1">{spec.useCase}</Text>
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
          <Text className="text-[#8a8fa3] font-bold font-syne text-xs uppercase tracking-widest mb-4 px-2">Support & Info</Text>
          <View className="bg-[#161920] rounded-3xl border border-[#2a2f3d]/60 overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between p-5 border-b border-[#2a2f3d]/30">
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color="#8a8fa3" className="mr-4" />
                <Text className="text-white font-dmsans ml-3">Help Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3a3f53" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-5">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={20} color="#8a8fa3" className="mr-4" />
                <Text className="text-white font-dmsans ml-3">App Version</Text>
              </View>
              <Text className="text-[#3a3f53] font-dmsans text-xs">v1.0.0-beta</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            className="mt-8 flex-row items-center justify-center p-5 rounded-3xl bg-red-500/5 border border-red-500/10"
            onPress={() => router.push('/')}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-500 font-bold font-syne ml-3">Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
