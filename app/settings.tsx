import React from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PortalSwitcher } from '../components/ui/PortalSwitcher';

const MODELS = ['llama3.2', 'mistral', 'phi3', 'gemma2'];

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    useLocalLLM, setUseLocalLLM, 
    ollamaUrl, setOllamaUrl, 
    ollamaModel, setOllamaModel 
  } = useSettingsStore();

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

          <Text className="text-white font-bold font-syne mb-3">Model Selection</Text>
          <View className="flex-row flex-wrap">
            {MODELS.map((model) => {
              const isActive = ollamaModel === model;
              return (
                <TouchableOpacity
                  key={model}
                  onPress={() => setOllamaModel(model)}
                  className={`px-4 py-2 border rounded-full mr-3 mb-3 ${isActive ? 'bg-[#4f7cff] border-[#4f7cff]' : 'bg-[#0d0f12] border-[#2a2f3d]'}`}
                  activeOpacity={0.7}
                >
                  <Text className={`font-dmsans font-bold ${isActive ? 'text-white' : 'text-[#8a8fa3]'}`}>
                    {model}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
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
