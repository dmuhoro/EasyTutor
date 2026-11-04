import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoadmapView } from "../../../components/RoadmapView";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from "../../../store/roadmapStore";
import { useAuthStore } from "../../../store/authStore";
import { trackEvent } from "../../../lib/analytics";
import * as Haptics from '../../../lib/haptics';
import { SyncIndicator } from "../../../components/SyncIndicator";
import { logEvent } from "../../../lib/logEvent";
import { getAllProgress, getWeakTopics } from "../../../data/knowledgeStore";
import { isUuid } from "../../../lib/supabaseOps";
import { useRoadmapGeneration } from "../../../hooks/useOrchestration";

export default function HighSchoolRoadmap() {
  const router = useRouter();
  const { subject, topic, topicId: routeTopicId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { roadmaps, addRoadmap, checkedTasks, toggleTask, topicId, fetchCachedRoadmap, saveRoadmap } = useRoadmapStore();
  const { generateRoadmap, loading: generating } = useRoadmapGeneration();
  const activeTopicId = typeof routeTopicId === 'string' ? routeTopicId : topicId;
  
  const [saving, setSaving] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const statusMessages = ["Analyzing your goal...", "Building learning path...", "Structuring roadmap..."];

  useEffect(() => {
    let interval: any;
    if (loading || generating) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading, generating]);

  // Check if we already have a roadmap for this topic
  const existingRoadmap = roadmaps.find(r => r.topic === topic);

  const performGeneration = async (force = false) => {
    if (!topic || typeof topic !== 'string' || !user) return;
    
    setLoading(true);
    setError(null);
    const generationStartedAt = Date.now();
    try {
      // 1. Check local state (unless forcing)
      if (!force) {
        const local = roadmaps.find(r => r.topic === topic);
        if (local) {
          setLoading(false);
          return;
        }

        // 2. Check cloud cache
        if (subject && activeTopicId && isUuid(activeTopicId)) {
          const cached = await fetchCachedRoadmap(subject as string, activeTopicId);
          if (cached) {
            setLoading(false);
            return;
          }
        }
      }

      // 3. Generate from ORCHESTRATOR
      const result = await generateRoadmap({
        subject_id: subject as string,
        topic_id: activeTopicId as string,
        learning_goal: `Create a study roadmap for ${topic} in ${subject}`,
        mastery_state: { score: 0, attempts: 0, weak_points: [] }
      });

      if (result?.pipeline?.output) {
        const roadmapData = result.pipeline.output as any;
        const newRoadmap = {
          id: Date.now().toString(),
          topic: topic,
          subjectId: subject as string,
          title: roadmapData.title || topic,
          days: roadmapData.days || [],
          createdAt: new Date().toISOString(),
          learningMode: 'high_school' as const
        };
        addRoadmap(newRoadmap);
        // Auto-save on generation
        saveRoadmap(newRoadmap, 'high_school');
        trackEvent('roadmap_generated', {
          user_id: user.id,
          learning_mode: 'high_school',
          topic,
          title: newRoadmap.title,
          subjectId: subject,
          duration_ms: Date.now() - generationStartedAt,
          source: 'high_school_roadmap',
        });
      } else {
        setError("Failed to generate roadmap.");
      }
    } catch (err) {
      console.error('[SAFE_ERROR] [ROADMAP] Generation Error:', err);
      setError("Couldn't generate your roadmap. You're still able to study offline using saved roadmaps.");
      void logEvent('ERROR', 'roadmap_generation_failed', { topic, subject, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!existingRoadmap && topic) {
      performGeneration();
    }
  }, [topic]);

  const handleSave = async () => {
    if (!existingRoadmap) return;
    setSaving(true);
    try {
      await saveRoadmap(existingRoadmap, 'high_school');
      Haptics.notificationAsync('success');
      Alert.alert("Success", "Roadmap saved to your profile!");
    } catch (err) {
      Alert.alert("Error", "Failed to save roadmap.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (day: number, task: string) => {
    if (!existingRoadmap) return;
    Haptics.impactAsync('light');
    toggleTask(existingRoadmap.id, day, task);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-[#4f7cff] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">AI Study Guide</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Roadmap'}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <View className="mr-3">
            <SyncIndicator />
          </View>
          <TouchableOpacity 
            onPress={() => performGeneration(true)}
            disabled={loading}
            className="bg-[#161920] p-2 rounded-xl border border-[#2a2f3d] mr-2"
          >
            <Ionicons name="refresh" size={18} color="#8a8fa3" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(high_school)/[subject]/quiz', params: { subject, topic, topicId: activeTopicId } })}
            className="bg-[#4f7cff]/10 px-4 py-2 rounded-xl border border-[#4f7cff]/20"
          >
            <Text className="text-[#4f7cff] font-bold font-syne text-xs">Start Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        {loading || generating ? (
          <View className="flex-1 px-2">
            <View className="items-center justify-center mb-12 mt-10">
              <View className="w-20 h-20 bg-[#4f7cff]/10 rounded-full items-center justify-center mb-6">
                 <ActivityIndicator size="large" color="#4f7cff" />
              </View>
              <Text className="text-white text-2xl font-bold font-syne text-center mb-2">
                {statusMessages[statusIndex]}
              </Text>
              <Text className="text-[#8a8fa3] text-center font-dmsans">
                Creating KICD-aligned content for "{topic}"
              </Text>
            </View>

            {/* Skeleton blocks */}
            {[1, 2, 3].map(i => (
              <View key={i} className="bg-[#161920] rounded-[28px] p-6 mb-4 border border-[#2a2f3d] opacity-50">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-[#2a2f3d] rounded-xl mr-3" />
                  <View className="h-6 bg-[#2a2f3d] rounded-lg w-1/2" />
                </View>
                <View className="h-4 bg-[#2a2f3d] rounded w-full mb-3" />
                <View className="h-4 bg-[#2a2f3d] rounded w-3/4" />
              </View>
            ))}
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-10">
            <View className="w-20 h-20 bg-[#ef4444]/10 rounded-full items-center justify-center mb-6">
               <Ionicons name="alert-circle" size={40} color="#ef4444" />
            </View>
            <Text className="text-white text-xl font-bold font-syne text-center mb-2">Generation Failed</Text>
            <Text className="text-[#8a8fa3] text-center font-dmsans mb-8">
              Having trouble generating your plan. Check your connection and try again.
            </Text>
            <TouchableOpacity 
              onPress={() => performGeneration()}
              className="bg-[#4f7cff] px-8 py-4 rounded-2xl shadow-lg shadow-[#4f7cff]/20"
            >
              <Text className="text-white font-bold font-syne">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : existingRoadmap ? (
          <RoadmapView 
            roadmap={existingRoadmap} 
            checkedTasks={checkedTasks[existingRoadmap.id] || {}} 
            onToggleTask={handleToggle}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
