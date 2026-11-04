import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { QuizEngine } from "../../../components/QuizEngine";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProgressStore } from "../../../store/progressStore";
import { useAuthStore } from "../../../store/authStore";
import { useRoadmapStore } from "../../../store/roadmapStore";
import { updateTopicProgress } from "../../../data/knowledgeStore";
import { generateStudyRoadmap } from "../../../lib/api";

export default function HighSchoolQuiz() {
  const router = useRouter();
  const { subject, topic, topicId: routeTopicId } = useLocalSearchParams();
  const { addQuizScore } = useProgressStore();
  const { user } = useAuthStore();
  const { topicId, roadmaps, upsertRoadmap, saveRoadmap } = useRoadmapStore();

  const handleFinish = async (score: number, total: number) => {
    if (typeof subject !== 'string') {
      throw new Error('[FATAL] topic_id resolution failed');
    }

    // Standard progress store update (handles XP and streaks)
    await addQuizScore(
      score,
      total,
      typeof topic === 'string' ? topic : 'General Topic',
      subject,
      typeof routeTopicId === 'string' ? routeTopicId : topicId ?? undefined
    );
    
    // Local-first knowledge system update
    if (user?.id && topicId && subject && typeof subject === 'string') {
      const percentage = Math.round((score / total) * 100);
      await updateTopicProgress(user.id, topicId, subject, percentage);

      // Adaptive roadmap: if a roadmap exists for this topic, evolve it in the background.
      const topicName = typeof topic === 'string' ? topic : '';
      const existing = roadmaps.find((r) => r.topic === topicName);
      if (existing && topicName) {
        void (async () => {
          const res = await generateStudyRoadmap(topicName, subject, topicId, user.id, 1, {
            context: 'high_school',
            weakFocus: [topicId], // focus on current topic immediately after quiz
            masteredSkip: [],
          });
          if (res.success && res.data) {
            const updated = {
              ...existing,
              title: res.data.title ?? existing.title,
              days: res.data.days ?? existing.days,
            };
            upsertRoadmap(updated as any);
            void saveRoadmap(updated as any, 'high_school');
          }
        })();
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-[#4f7cff] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">Knowledge Challenge</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Quiz'}</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        <QuizEngine 
          subjectName={typeof subject === 'string' ? subject : 'High School Subject'} 
          topicName={typeof topic === 'string' ? topic : 'General Topic'} 
          totalQuestions={10}
          onFinish={handleFinish}
          onContinue={() => router.back()}
          subjectId={typeof subject === 'string' ? subject : undefined}
          topicId={typeof routeTopicId === 'string' ? routeTopicId : topicId ?? undefined}
        />
      </View>
    </SafeAreaView>
  );
}
