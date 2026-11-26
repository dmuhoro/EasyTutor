import { t } from '../../../src/locales';
import { LEGACY_COLORS } from '../../../src/design/legacyPalette';
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { QuizEngine } from "../../../components/QuizEngine";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProgressStore } from "../../../store/progressStore";

export default function UniversityQuiz() {
  const router = useRouter();
  const { course, topic } = useLocalSearchParams();
  const { addQuizScore } = useProgressStore();

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <View className="px-5 py-6 border-b border-legacy-night-border flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color={LEGACY_COLORS.purple500Bright} />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-legacy-purple500-bright font-bold font-syne text-[10px] uppercase tracking-widest mb-1">{t('fk')}</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Quiz'}</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        <QuizEngine 
          subjectName={typeof course === 'string' ? course : 'University Course'} 
          topicName={typeof topic === 'string' ? topic : t('ac')}
          totalQuestions={15} // University level gets more questions
          onFinish={async (score, total) => {
            if (typeof course !== 'string') {
              throw new Error('[FATAL] topic_id resolution failed');
            }
            await addQuizScore(score, total, typeof topic === 'string' ? topic : 'Academic Module', course);
          }}
          onContinue={() => router.back()}
          subjectId={typeof course === 'string' ? course : undefined}
        />
      </View>
    </SafeAreaView>
  );
}
