import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMathJourneyStore } from '../store/mathJourneyStore';

export default function MathJourneyScreen() {
  const router = useRouter();
  const s = useMathJourneyStore();
  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <ScrollView className="px-5 py-6">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4"><Text className="text-[#4f7cff]">Back</Text></TouchableOpacity>
          <Text className="text-white text-2xl font-bold font-syne">Mathematics Journey</Text>
        </View>
        <Text className="text-[#8a8fa3] mb-4">Choose a starting point. The diagnostic checks fractions, then equations.</Text>
        <TouchableOpacity className="bg-[#4f7cff] rounded-2xl p-4 mb-3" onPress={() => s.recordDiagnostic('learner','fractions',[{skillId:'fractions',correct:false,independent:false}])}>
          <Text className="text-white font-bold">Start diagnostic (fractions)</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-[#161920] border border-[#2a2f3d] rounded-2xl p-4 mb-3" onPress={() => s.recordPractice({dimension:'application',weight:0.7,independent:true,hints:0})}>
          <Text className="text-white">Record independent application evidence</Text>
        </TouchableOpacity>
        <View className="bg-[#161920] border border-[#2a2f3d] rounded-2xl p-4">
          <Text className="text-[#8a8fa3]">Target: {s.targetSkill ?? 'not set'}</Text>
          <Text className="text-[#8a8fa3]">Recommendation: {s.recommendation ?? '—'}</Text>
          <Text className="text-[#8a8fa3]">Mastery confidence: {s.masteryConfidence.toFixed(2)}</Text>
          <Text className="text-[#8a8fa3]">Review due: {s.reviewDue ? 'yes' : 'no'}</Text>
          <Text className="text-[#8a8fa3]">Evidence records: {s.evidence.length}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
