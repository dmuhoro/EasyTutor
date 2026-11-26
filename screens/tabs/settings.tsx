import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import { View, Text, Switch, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "../../store/settingsStore";
import { useProgressStore } from "../../store/progressStore";
import { useStudyStore } from "../../store/studyStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useAuthStore } from "../../store/authStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert } from "react-native";

export default function SettingsTab() {
  const { theme, useLocalLLM, ollamaChatModel, setTheme, setUseLocalLLM, setOllamaChatModel } = useSettingsStore();
  const { clearProgress } = useProgressStore();
  const { clearSession } = useStudyStore();
  const { clearRoadmaps } = useRoadmapStore();
  const { signOut, user } = useAuthStore();

  const handleClearData = () => {
    clearProgress();
    clearSession();
    clearRoadmaps();
    Alert.alert("Success", "All local data has been cleared.");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <View className="px-4 py-6 border-b border-legacy-night-border">
        <Text className="text-white text-3xl font-bold font-syne">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        <Text className="text-legacy-night-text-muted font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Account</Text>
        <View className="bg-legacy-night-surface rounded-[24px] p-4 mb-8 border border-legacy-night-border">
          <TouchableOpacity onPress={handleSignOut} className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-red-400/10 rounded-2xl items-center justify-center mr-3">
                <Ionicons name="log-out-outline" size={20} color={LEGACY_COLORS.red400} />
              </View>
              <View>
                <Text className="text-legacy-red400 font-dmsans text-base font-bold">Sign Out</Text>
                <Text className="text-legacy-night-text-muted text-[10px] font-dmsans uppercase">{user?.email}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={LEGACY_COLORS.red400} />
          </TouchableOpacity>
        </View>

        <Text className="text-legacy-night-text-muted font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Preferences</Text>
        
        <View className="bg-legacy-night-surface rounded-[24px] p-4 mb-8 border border-legacy-night-border">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-legacy-night-border rounded-2xl items-center justify-center mr-3">
                <Ionicons name="moon-outline" size={20} color={LEGACY_COLORS.blueRibbon} />
              </View>
              <Text className="text-white font-dmsans text-base font-medium">Dark Mode</Text>
            </View>
            <Switch 
              value={theme === 'dark'} 
              onValueChange={(val) => setTheme(val ? 'dark' : 'light')} 
              trackColor={{ false: LEGACY_COLORS.nightBorder, true: LEGACY_COLORS.blueRibbon }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-legacy-night-border rounded-2xl items-center justify-center mr-3">
                <Ionicons name="cloud-offline-outline" size={20} color={LEGACY_COLORS.blueRibbon} />
              </View>
              <View>
                <Text className="text-white font-dmsans text-base font-medium">Offline Mode</Text>
                <Text className="text-legacy-night-text-muted text-xs font-dmsans">Force local Ollama fallback</Text>
              </View>
            </View>
            <Switch 
              value={useLocalLLM} 
              onValueChange={setUseLocalLLM} 
              trackColor={{ false: LEGACY_COLORS.nightBorder, true: LEGACY_COLORS.blueRibbon }}
            />
          </View>
        </View>

        <Text className="text-legacy-night-text-muted font-bold uppercase text-xs mb-4 ml-2 tracking-widest">AI Brain</Text>
        
        <View className="bg-legacy-night-surface rounded-[24px] p-4 mb-8 border border-legacy-night-border">
          <TouchableOpacity 
            className="flex-row items-center justify-between mb-6"
            onPress={() => setOllamaChatModel('claude-sonnet-4-6')}
          >
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-3 ${ollamaChatModel === 'claude-sonnet-4-6' ? 'bg-legacy-blue-ribbon' : 'bg-legacy-night-border'}`} />
              <Text className={`font-dmsans text-base ${ollamaChatModel === 'claude-sonnet-4-6' ? 'text-white font-bold' : 'text-legacy-night-text-muted'}`}>Claude 3.5 Sonnet</Text>
            </View>
            {ollamaChatModel === 'claude-sonnet-4-6' && <Ionicons name="checkmark-circle" size={20} color={LEGACY_COLORS.blueRibbon} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center justify-between"
            onPress={() => setOllamaChatModel('llama3.2')}
          >
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-3 ${ollamaChatModel === 'llama3.2' ? 'bg-legacy-blue-ribbon' : 'bg-legacy-night-border'}`} />
              <Text className={`font-dmsans text-base ${ollamaChatModel === 'llama3.2' ? 'text-white font-bold' : 'text-legacy-night-text-muted'}`}>Local Ollama (Offline)</Text>
            </View>
            {ollamaChatModel === 'llama3.2' && <Ionicons name="checkmark-circle" size={20} color={LEGACY_COLORS.blueRibbon} />}
          </TouchableOpacity>
        </View>

        <Text className="text-legacy-night-text-muted font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Support & Info</Text>
        <View className="bg-legacy-night-surface rounded-[24px] p-2 mb-10 border border-legacy-night-border">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-legacy-night-border/50">
             <View className="flex-row items-center">
               <Ionicons name="share-social-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
               <Text className="text-white font-dmsans text-base ml-3">Share EasyTutor</Text>
             </View>
             <Ionicons name="chevron-forward" size={16} color={LEGACY_COLORS.nightTextMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleClearData} className="flex-row items-center justify-between p-4 border-b border-legacy-night-border/50">
            <View className="flex-row items-center">
              <Ionicons name="refresh-outline" size={20} color={LEGACY_COLORS.red500} />
              <Text className="text-legacy-red500 font-dmsans text-base ml-3">Reset All Progress</Text>
            </View>
          </TouchableOpacity>

          <View className="p-4 items-center">
             <Text className="text-legacy-night-text-secondary text-[10px] uppercase font-bold tracking-[2px]">EasyTutor v1.0.4 Premium</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

