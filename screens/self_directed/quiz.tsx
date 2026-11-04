import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { QuizEngine } from "../../components/QuizEngine";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProgressStore } from "../../store/progressStore";

export default function SelfDirectedQuiz() {
  const router = useRouter();
  const { topic } = useLocalSearchParams();
  const { addQuizScore } = useProgressStore();

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color="#22c55e" />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-[#22c55e] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">Knowledge Review</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Quiz'}</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        <QuizEngine 
          subjectName="Self-Directed Study" 
          topicName={typeof topic === 'string' ? topic : 'General Interest'} 
          totalQuestions={5} 
          onFinish={async (score, total) => {
            await addQuizScore(score, total, typeof topic === 'string' ? topic : 'General Interest', 'self_directed');
          }}
          onContinue={() => router.back()}
          subjectId="self_directed"
        />
      </View>
    </SafeAreaView>
  );
}
