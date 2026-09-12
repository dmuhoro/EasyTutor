import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoadmapView } from "../../components/RoadmapView";
import { Ionicons } from "@expo/vector-icons";
import { useRoadmapStore } from "../../store/roadmapStore";
import { generateStudyRoadmap } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { logError } from "../../lib/logEvent";
import { FeedbackModal } from "../../components/FeedbackModal";
import * as Haptics from '../../lib/haptics';

export default function SelfDirectedRoadmap() {
  const router = useRouter();
  const { topic } = useLocalSearchParams();
  const { roadmaps, addRoadmap, checkedTasks, toggleTask, saveRoadmap, userId, learningMode } = useRoadmapStore();
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const statusMessages = ["Analyzing your goal...", "Building learning path...", "Structuring roadmap..."];
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (userId) {
        trackEvent('time_spent', {
          user_id: userId,
          learning_mode: learningMode,
          screen: 'roadmap',
          duration,
          topic
        });
      }
    };
  }, []);

  // Check if we already have a roadmap for this topic
  const existingRoadmap = roadmaps.find(r => r.topic === topic);

  const performGeneration = async () => {
    if (!topic || typeof topic !== 'string') return;
    
    setLoading(true);
    setError(null);
    const generationStartedAt = Date.now();
    try {
      const res = await generateStudyRoadmap(topic);
      if (res.data) {
        if (res.provider === 'local_ollama') {
          setNote('Generated on this device via Ollama — no cloud needed.');
        } else if (res.provider === 'cache') {
          setNote('Loaded from the offline cache.');
        } else if (res.provider === 'placeholder') {
          setNote('Ollama was unreachable, so this is a general starter plan. Start Ollama for a personalized roadmap.');
        } else {
          setNote(null);
        }
        const newRoadmap = {
          id: Date.now().toString(),
          topic: topic,
          title: res.data.title,
          days: res.data.days,
          createdAt: new Date().toISOString(),
          learningMode: 'self_directed' as const
        };
        addRoadmap(newRoadmap);
        // Auto-save on generation — never leave an unhandled rejection.
        // Free-form topics have no curriculum subject yet, so cloud save is
        // blocked loudly (fail-closed); the roadmap is kept on this device.
        saveRoadmap(newRoadmap, 'self_directed').catch((err) => {
          logError('ROADMAP_cloud_save_blocked', err);
          setError('Saved on this device — cloud sync for custom topics is coming soon.');
        });
        if (userId) {
          trackEvent('roadmap_generated', {
            user_id: userId,
            learning_mode: learningMode,
            topic,
            title: res.data.title,
            duration_ms: Date.now() - generationStartedAt,
            source: 'self_directed_roadmap',
          });
        }

        // Celebratory feedback only for a real (non-placeholder) generation —
        // an offline starter plan is honest, but it is not "built".
        if (res.success) {
          Haptics.notificationAsync('success');
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
          setTimeout(() => setShowFeedback(true), 4000);
        }
      } else {
        setError(res.error || "Failed to generate roadmap.");
      }
    } catch (err: any) {
      console.error('Generation Error:', err);
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
      await saveRoadmap(existingRoadmap, 'self_directed');
      Haptics.notificationAsync('success');
      Alert.alert("Success", "Mission saved to your profile!");
    } catch (err) {
      logError('ROADMAP_manual_save_blocked', err);
      Alert.alert(
        "Not Available Yet",
        "Cloud save for custom topics is coming soon. Your roadmap is saved on this device."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (day: number, task: string) => {
    if (!existingRoadmap) return;
    Haptics.impactAsync('light');
    toggleTask(existingRoadmap.id, day, task);
  };

  const handleTeachTask = (task: string) => {
    Haptics.impactAsync('medium');
    router.push({
      pathname: '/(self_directed)/quiz',
      params: { 
        topic: task,
        context: `This is part of my roadmap for: ${topic}` 
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color="#22c55e" />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-[#22c55e] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">Personalized Architecture</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Goal'}</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(self_directed)/quiz', params: { topic } })}
            className="bg-[#22c55e]/10 px-4 py-2 rounded-xl border border-[#22c55e]/20"
          >
            <Text className="text-[#22c55e] font-bold font-syne text-xs">Knowledge Check</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        {loading ? (
          <View className="flex-1 px-2">
            <View className="items-center justify-center mb-12 mt-10">
              <View className="w-20 h-20 bg-[#22c55e]/10 rounded-full items-center justify-center mb-6">
                 <ActivityIndicator size="large" color="#22c55e" />
              </View>
              <Text className="text-white text-2xl font-bold font-syne text-center mb-2">
                {statusMessages[statusIndex]}
              </Text>
              <Text className="text-[#8a8fa3] text-center font-dmsans">
                Designing your mission for "{topic}"
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
              className="bg-[#22c55e] px-8 py-4 rounded-2xl shadow-lg shadow-[#22c55e]/20"
            >
              <Text className="text-white font-bold font-syne">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : existingRoadmap ? (
          <>
            {note && (
              <View className="bg-[#161920] border border-[#2a2f3d]/60 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-[#8a8fa3] text-sm font-dmsans">
                  {note}
                </Text>
              </View>
            )}
            <RoadmapView 
              roadmap={existingRoadmap} 
              checkedTasks={checkedTasks[existingRoadmap.id] || {}} 
              onToggleTask={handleToggle}
              onTeachTask={handleTeachTask}
            />
            {showCelebration && (
              <View className="absolute inset-0 items-center justify-center pointer-events-none">
                 <View className="bg-[#22c55e]/90 p-6 rounded-[32px] items-center shadow-2xl">
                    <Ionicons name="sparkles" size={48} color="white" />
                    <Text className="text-white font-bold font-syne text-xl mt-2">Roadmap Built!</Text>
                 </View>
              </View>
            )}
          </>
        ) : null}
      </View>
      <FeedbackModal 
        isVisible={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        source="roadmap_generation" 
        topic={typeof topic === 'string' ? topic : undefined}
        contentType="roadmap"
      />
    </SafeAreaView>
  );
}
