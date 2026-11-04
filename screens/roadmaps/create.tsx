import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from "../../store/roadmapStore";
import * as Haptics from '../../lib/haptics';
import { useRoadmapGeneration } from "../../hooks/useOrchestration";

export default function CreateRoadmap() {
  const router = useRouter();
  const { addRoadmap } = useRoadmapStore();
  const { generateRoadmap, loading: generating } = useRoadmapGeneration();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    Haptics.impactAsync('medium');

    try {
      const result = await generateRoadmap({
        subject_id: 'self_directed',
        topic_id: topic.trim(),
        learning_goal: `Create a study roadmap for ${topic.trim()}`,
        mastery_state: { score: 0, attempts: 0, weak_points: [] }
      });

      if (result?.pipeline?.output) {
        const roadmapData = result.pipeline.output as any;
        const newRoadmap = {
          id: Date.now().toString(),
          topic: topic.trim(),
          title: roadmapData.title || topic.trim(),
          days: roadmapData.days || [],
          createdAt: new Date().toISOString()
        };
        addRoadmap(newRoadmap);
        Haptics.notificationAsync('success');
        router.replace({ pathname: `/roadmaps/${newRoadmap.id}` });
      } else {
        Alert.alert("Error", "Failed to generate roadmap.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-5 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold font-syne">New Roadmap</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-8">
          <View className="bg-[#161920] rounded-[32px] p-8 border border-[#2a2f3d] mb-10 shadow-2xl">
            <View className="w-16 h-16 bg-[#4f7cff]/20 rounded-2xl items-center justify-center mb-6">
              <Ionicons name="sparkles" size={32} color="#4f7cff" />
            </View>
            
            <Text className="text-white text-3xl font-bold font-syne mb-2">What's your next goal?</Text>
            <Text className="text-[#8a8fa3] text-base font-dmsans mb-8 leading-6">
              Tell me what you want to learn, and I'll architect a personalized 7-day curriculum just for you.
            </Text>

            <View className="bg-[#0d0f12] rounded-2xl border border-[#2a2f3d] p-4 mb-8">
               <TextInput
                 className="text-white text-lg font-dmsans min-h-[100px]"
                 placeholder="e.g. Master React Native, Quantum Physics basics, Mediterranean Cooking..."
                 placeholderTextColor="#5a5f73"
                 multiline
                 value={topic}
                 onChangeText={setTopic}
                 textAlignVertical="top"
               />
            </View>

            <TouchableOpacity 
              className={`py-5 rounded-2xl flex-row items-center justify-center ${topic.trim() ? 'bg-[#4f7cff] shadow-lg shadow-[#4f7cff]/30' : 'bg-[#2a2f3d]'}`}
              onPress={handleGenerate}
              disabled={!topic.trim() || loading || generating}
            >
              {loading || generating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-bold font-syne text-lg mr-2">Generate Curriculum</Text>
                  <Ionicons name="flash" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="items-center opacity-50">
             <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-widest">Powered by Claude & Llama</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
