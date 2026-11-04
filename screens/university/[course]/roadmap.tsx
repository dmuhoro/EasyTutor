import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoadmapView } from "../../../components/RoadmapView";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from "../../../store/roadmapStore";
import { generateStudyRoadmap } from "../../../lib/api";
import { trackEvent } from "../../../lib/analytics";
import * as Haptics from '../../../lib/haptics';
import { FeedbackModal } from "../../../components/FeedbackModal";

export default function UniversityRoadmap() {
  const router = useRouter();
  const { course, topic } = useLocalSearchParams();
  const { roadmaps, addRoadmap, checkedTasks, toggleTask, saveRoadmap, userId, learningMode } = useRoadmapStore();
  
  const [saving, setSaving] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const statusMessages = ["Analyzing your goal...", "Building learning path...", "Structuring roadmap..."];
  const [showFeedback, setShowFeedback] = useState(false);
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
          screen: 'roadmap_university',
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
      if (res.success && res.data) {
        const newRoadmap = {
          id: Date.now().toString(),
          topic: topic,
          subjectId: typeof course === 'string' ? course : undefined,
          title: res.data.title,
          days: res.data.days,
          createdAt: new Date().toISOString(),
          learningMode: 'university' as const
        };
        addRoadmap(newRoadmap);
        // Auto-save on generation
        saveRoadmap(newRoadmap, 'university');
        if (userId) {
          trackEvent('roadmap_generated', {
            user_id: userId,
            learning_mode: learningMode,
            topic,
            title: res.data.title,
            subjectId: course,
            duration_ms: Date.now() - generationStartedAt,
            source: 'university_roadmap',
          });
        }
        setTimeout(() => setShowFeedback(true), 4000);
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
      await saveRoadmap(existingRoadmap, 'university');
      Haptics.notificationAsync('success');
      Alert.alert("Success", "Course roadmap saved to your profile!");
    } catch (err) {
      Alert.alert("Error", "Failed to save course roadmap.");
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
             <Ionicons name="arrow-back" size={24} color="#a855f7" />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-[#a855f7] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">Undergraduate Study Plan</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Roadmap'}</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(university)/[course]/quiz', params: { course, topic } })}
            className="bg-[#a855f7]/10 px-4 py-2 rounded-xl border border-[#a855f7]/20"
          >
            <Text className="text-[#a855f7] font-bold font-syne text-xs">Exams (Quiz)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        {loading ? (
          <View className="flex-1 px-2">
            <View className="items-center justify-center mb-12 mt-10">
              <View className="w-20 h-20 bg-[#a855f7]/10 rounded-full items-center justify-center mb-6">
                 <ActivityIndicator size="large" color="#a855f7" />
              </View>
              <Text className="text-white text-2xl font-bold font-syne text-center mb-2">
                {statusMessages[statusIndex]}
              </Text>
              <Text className="text-[#8a8fa3] text-center font-dmsans">
                Preparing academic plan for "{topic}"
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
              className="bg-[#a855f7] px-8 py-4 rounded-2xl shadow-lg shadow-[#a855f7]/20"
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
      <FeedbackModal 
        isVisible={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        source="roadmap_generation_university" 
        topic={typeof topic === 'string' ? topic : undefined}
        contentType="roadmap"
      />
    </SafeAreaView>
  );
}
