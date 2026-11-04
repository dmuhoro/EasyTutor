import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoadmapStore, CustomRoadmap, RoadmapDay } from "../../store/roadmapStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from '../../lib/haptics';

export default function ViewRoadmap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { roadmaps, checkedTasks, toggleTask, removeRoadmap, getRoadmapProgress, markRoadmapOpened } = useRoadmapStore();

  useEffect(() => {
    if (id) {
      markRoadmapOpened(id);
    }
  }, [id]);

  const roadmap = roadmaps.find(r => r.id === id);

  if (!roadmap) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] items-center justify-center px-6">
        <Ionicons name="warning-outline" size={64} color="#ef4444" />
        <Text className="text-white text-2xl font-bold font-syne mt-4">Roadmap Not Found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-[#4f7cff] py-3 px-8 rounded-xl mt-8">
          <Text className="text-white font-bold ml-2">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Roadmap?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          removeRoadmap(roadmap.id);
          router.back();
        }}
      ]
    );
  };

  const currentProgress = checkedTasks[roadmap.id] || {};
  const progressPercent = getRoadmapProgress(roadmap.id);
  
  const totalTasks = roadmap.days.reduce((acc, day) => acc + day.tasks.length, 0);
  const completedTasks = Object.values(currentProgress).reduce((acc, dayTasks) => acc + dayTasks.length, 0);

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      {/* Header Section */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-[#2a2f3d]">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{roadmap.title}</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-widest">{roadmap.topic}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} className="p-2 ml-4">
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Progress Dashboard */}
        <View className="bg-[#161920] rounded-[32px] p-6 mb-10 border border-[#2a2f3d] shadow-sm relative overflow-hidden">
          <View className="flex-row justify-between items-center mb-6">
             <View>
                <Text className="text-[#8a8fa3] text-sm font-dmsans uppercase mb-1">Mastery Progress</Text>
                <Text className="text-white text-3xl font-bold font-syne">{progressPercent}%</Text>
             </View>
             <View className="bg-[#4f7cff]/10 p-4 rounded-3xl border border-[#4f7cff]/20">
               <Text className="text-[#4f7cff] font-bold font-syne">{completedTasks} / {totalTasks}</Text>
             </View>
          </View>

          <View className="w-full bg-[#0d0f12] h-3 rounded-full overflow-hidden border border-[#2a2f3d]">
            <View 
              className="bg-[#4f7cff] h-full rounded-full" 
              style={{ width: `${progressPercent}%` }} 
            />
          </View>
        </View>

        {/* Days List */}
        {roadmap.days.map((day) => (
          <View key={day.day} className="mb-10 w-full">
            <View className="flex-row items-center mb-4 ml-2">
              <View className="w-10 h-10 bg-[#4f7cff] rounded-2xl items-center justify-center mr-3 shadow-lg shadow-[#4f7cff]/30">
                <Text className="text-white font-bold font-syne">D{day.day}</Text>
              </View>
              <Text className="text-white text-xl font-bold font-syne">{day.title}</Text>
            </View>

            <View className="bg-[#161920] rounded-[28px] border border-[#2a2f3d] p-2">
              {day.tasks.map((task, idx) => {
                const isChecked = (currentProgress[day.day] || []).includes(task);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      Haptics.impactAsync('light');
                      toggleTask(roadmap.id, day.day, task);
                    }}
                    activeOpacity={0.7}
                    className="flex-row items-center p-4 border-b border-[#2a2f3d]/40 last:border-b-0"
                  >
                    <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-4 ${isChecked ? 'bg-[#22c55e] border-[#22c55e]' : 'border-[#2a2f3d]'}`}>
                      {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <Text className={`flex-1 font-dmsans text-base leading-6 ${isChecked ? 'text-[#5a5f73] line-through' : 'text-white'}`}>
                      {task}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
