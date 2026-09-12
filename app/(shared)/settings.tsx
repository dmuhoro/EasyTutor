import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "../../store/settingsStore";
import { useProgressStore } from "../../store/progressStore";
import { useRoadmapStore, LearningMode } from "../../store/roadmapStore";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from "../../lib/supabaseOps";
import { track } from "../../lib/analytics";

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, useLocalLLM, setTheme, setUseLocalLLM } = useSettingsStore();
  const { clearProgress } = useProgressStore();
  const { clearRoadmaps, learningMode, setLearningMode } = useRoadmapStore();
  const { signOut, user } = useAuthStore();
  
  const [updatingMode, setUpdatingMode] = useState(false);

  const handleClearData = () => {
    Alert.alert(
      "Reset All Progress",
      "This will permanently delete all your roadmaps and study history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset Everything", 
          style: "destructive", 
          onPress: () => {
            clearProgress();
            clearRoadmaps();
            Alert.alert("Success", "All local data has been cleared.");
          }
        }
      ]
    );
  };

  const handleSwitchMode = async (newMode: LearningMode) => {
    if (newMode === learningMode) return;
    if (!user?.id) {
      Alert.alert("Error", "You must be signed in to switch learning mode.");
      return;
    }
    
    setUpdatingMode(true);
    try {
      const client = getSupabaseClient();
      const authUser = await getAuthenticatedUser();

      const { error } = await client
        .from('profiles')
        .update({ learning_mode: newMode })
        .eq('id', authUser.id);

      if (error) {
        logSupabaseError('profiles', 'update', error);
        throw error;
      }

      setLearningMode(newMode);
      track('portal_selected', {
        user_id: authUser.id,
        learning_mode: newMode,
        selected_mode: newMode,
        source: 'settings',
      });
      
      // Redirect to new portal
      if (newMode === 'high_school') router.replace('/(high_school)');
      else if (newMode === 'university') router.replace('/(university)');
      else if (newMode === 'self_directed') router.replace('/(self_directed)');
      
    } catch (err: any) {
      console.error('[ERROR] [PROFILE] learning mode switch failed', err);
      Alert.alert("Error", "Could not switch learning mode. Please check your connection.");
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold font-syne">Settings</Text>
        <View className="w-7" />
      </View>

      <ScrollView className="flex-1 px-5 pt-8">
        {/* Learning Mode Section (Task 5.1) */}
        <Text className="text-[#8a8fa3] font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Learning Mode</Text>
        <View className="bg-[#161920] rounded-[32px] p-6 mb-10 border border-[#2a2f3d]">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-[#8a8fa3] text-[10px] font-bold uppercase tracking-widest mb-1">Current Portal</Text>
              <Text className="text-white text-xl font-bold font-syne capitalize">
                {(learningMode || 'high_school').replace('_', ' ')}
              </Text>
            </View>
            <View className="bg-[#4f7cff1a] px-3 py-1 rounded-full border border-[#4f7cff33]">
              <Text className="text-[#4f7cff] text-[10px] font-bold uppercase">Active</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              const options = [
                { id: 'high_school', name: 'High School', desc: 'KCSE and CBC curriculum, Kenya syllabus' },
                { id: 'university', name: 'University', desc: 'Degree-level subjects, local universities' },
                { id: 'self_directed', name: 'Self-Directed', desc: 'Learn anything, your way, no curriculum' }
              ];

              Alert.alert(
                "Switch Learning Mode",
                "Choose your preferred scholarly environment:",
                options.map(opt => ({
                  text: opt.name,
                  onPress: () => {
                    // Task 5.2 Confirmation
                    Alert.alert(
                      `Switch to ${opt.name}`,
                      `Switching to ${opt.name} will change your learning portal. Your progress is saved and you can switch back anytime.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Switch", onPress: () => handleSwitchMode(opt.id as LearningMode) }
                      ]
                    );
                  }
                })).concat([{ text: "Cancel", style: "cancel" }] as any)
              );
            }}
            className="bg-[#4f7cff] py-4 rounded-2xl items-center justify-center shadow-lg shadow-[#4f7cff]/20"
          >
            <Text className="text-white font-bold font-syne">Switch Learning Mode</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-[#8a8fa3] font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Preferences</Text>
        <View className="bg-[#161920] rounded-[32px] p-6 mb-10 border border-[#2a2f3d]">
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={22} color="#8a8fa3" />
              <Text className="text-white font-dmsans text-lg ml-3">Dark Mode</Text>
            </View>
            <Switch 
              value={theme === 'dark' || theme === 'system'} 
              onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
              trackColor={{ false: '#2a2f3d', true: '#4f7cff' }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center mb-1">
                <Ionicons name="cloud-offline-outline" size={22} color="#8a8fa3" />
                <Text className="text-white font-dmsans text-lg ml-3">Local Logic</Text>
              </View>
              <Text className="text-[#5a5f73] text-[10px] ml-9 uppercase font-bold tracking-widest">Force Ollama fallback</Text>
            </View>
            <Switch 
              value={useLocalLLM} 
              onValueChange={setUseLocalLLM}
              trackColor={{ false: '#2a2f3d', true: '#4f7cff' }}
            />
          </View>
        </View>

        <Text className="text-[#ef4444] font-bold uppercase text-xs mb-4 ml-2 tracking-widest">Danger Zone</Text>
        <View className="bg-red-500/5 rounded-[32px] p-2 mb-20 border border-red-500/20">
          <TouchableOpacity onPress={handleClearData} className="flex-row items-center p-5">
             <Ionicons name="refresh-circle" size={24} color="#ef4444" />
             <Text className="text-[#ef4444] font-syne text-base ml-3">Reset All Local Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} className="flex-row items-center p-5 border-t border-red-500/10">
             <Ionicons name="log-out" size={24} color="#ef4444" />
             <Text className="text-[#ef4444] font-syne text-base ml-3">Sign Out of Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
