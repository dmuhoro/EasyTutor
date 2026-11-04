import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from "../../store/roadmapStore";
import { useAuthStore } from "../../store/authStore";
import { RoadmapView } from "../../components/RoadmapView";
import * as Haptics from '../../lib/haptics';
import { safeTrackEvent } from '../../lib/analytics';

export default function RoadmapTab() {
  const router = useRouter();
  const { roadmaps, checkedTasks, toggleTask, removeRoadmap } = useRoadmapStore();
  const { user } = useAuthStore();
  
  // Show the most recent roadmap by default
  const activeRoadmap = roadmaps[0];
  
  const handleToggle = (day: number, task: string) => {
    if (!activeRoadmap) return;
    Haptics.impactAsync('light');
    toggleTask(activeRoadmap.id, day, task);
    if (user?.id) {
      void safeTrackEvent('task_completed', {
        user_id: user.id,
        topic: activeRoadmap.topic,
        day,
        task,
      });
    }
  };

  const handleDelete = () => {
    if (!activeRoadmap) return;
    Alert.alert(
      "Remove Plan",
      "Are you sure you want to delete this study path?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeRoadmap(activeRoadmap.id);
            if (user?.id) {
              void safeTrackEvent('roadmap_abandoned', {
                user_id: user.id,
                topic: activeRoadmap.topic,
              });
            }
          },
        },
      ]
    );
  };

  if (!activeRoadmap) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] items-center justify-center px-8">
        <View className="bg-[#161920] w-24 h-24 rounded-[32px] items-center justify-center mb-8 border border-[#2a2f3d] shadow-2xl shadow-black/50">
          <Ionicons name="map-outline" size={48} color="#4f7cff" />
        </View>
        <Text className="text-white text-3xl font-bold font-syne text-center mb-4">No Active Mission</Text>
        <Text className="text-[#8a8fa3] text-lg font-dmsans text-center mb-10 leading-7">
          Architect a personalized 7-day study curriculum for any topic. Our AI will structure your journey to mastery in seconds.
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/explore')}
          className="bg-[#4f7cff] py-5 px-12 rounded-2xl shadow-lg shadow-[#4f7cff]/40 flex-row items-center"
        >
          <Ionicons name="sparkles" size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold font-syne text-lg uppercase tracking-widest">Start First Mission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      {/* Dynamic Header */}
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row justify-between items-end">
        <View className="flex-1 mr-4">
          <Text className="text-[#4f7cff] font-bold font-syne text-xs uppercase tracking-widest mb-1">Active Study Path</Text>
          <Text className="text-white text-3xl font-bold font-syne uppercase tracking-tight" numberOfLines={1}>
            {activeRoadmap.topic}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} className="p-2">
          <Ionicons name="trash-outline" size={22} color="#f87171" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-5 pt-8">
        <RoadmapView 
          roadmap={activeRoadmap}
          checkedTasks={checkedTasks[activeRoadmap.id] || {}}
          onToggleTask={handleToggle}
        />
      </View>
    </SafeAreaView>
  );
}
