import { LEGACY_COLORS } from '../../src/design/legacyPalette';
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
      <SafeAreaView className="flex-1 bg-legacy-night-canvas items-center justify-center px-6">
        <Ionicons name="warning-outline" size={64} color={LEGACY_COLORS.red500} />
        <Text className="text-white text-2xl font-bold font-syne mt-4">Roadmap Not Found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-legacy-blue-ribbon py-3 px-8 rounded-xl mt-8">
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
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      {/* Header Section */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-legacy-night-border">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{roadmap.title}</Text>
            <Text className="text-legacy-night-text-muted text-xs font-dmsans uppercase tracking-widest">{roadmap.topic}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} className="p-2 ml-4">
          <Ionicons name="trash-outline" size={20} color={LEGACY_COLORS.red500} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Progress Dashboard */}
        <View className="bg-legacy-night-surface rounded-[32px] p-6 mb-10 border border-legacy-night-border shadow-sm relative overflow-hidden">
          <View className="flex-row justify-between items-center mb-6">
             <View>
                <Text className="text-legacy-night-text-muted text-sm font-dmsans uppercase mb-1">Mastery Progress</Text>
                <Text className="text-white text-3xl font-bold font-syne">{progressPercent}%</Text>
             </View>
             <View className="bg-legacy-blue-ribbon/10 p-4 rounded-3xl border border-legacy-blue-ribbon/20">
               <Text className="text-legacy-blue-ribbon font-bold font-syne">{completedTasks} / {totalTasks}</Text>
             </View>
          </View>

          <View className="w-full bg-legacy-night-canvas h-3 rounded-full overflow-hidden border border-legacy-night-border">
            <View
              className="bg-legacy-blue-ribbon h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {/* Days List */}
        {roadmap.days.map((day) => (
          <View key={day.day} className="mb-10 w-full">
            <View className="flex-row items-center mb-4 ml-2">
              <View className="w-10 h-10 bg-legacy-blue-ribbon rounded-2xl items-center justify-center mr-3 shadow-lg shadow-legacy-blue-ribbon/30">
                <Text className="text-white font-bold font-syne">D{day.day}</Text>
              </View>
              <Text className="text-white text-xl font-bold font-syne">{day.title}</Text>
            </View>

            <View className="bg-legacy-night-surface rounded-[28px] border border-legacy-night-border p-2">
              {day.tasks.map((task, idx) => {
                const isChecked = (currentProgress[day.day] || []).includes(task);
                return (
                  <View
                    key={idx}
                    className="flex-row items-center p-4 border-b border-legacy-night-border/40 last:border-b-0 justify-between"
                  >
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync('light');
                        toggleTask(roadmap.id, day.day, task);
                      }}
                      activeOpacity={0.7}
                      className="flex-row items-center flex-1 mr-3"
                    >
                      <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-4 ${isChecked ? 'bg-legacy-green500 border-legacy-green500' : 'border-legacy-night-border'}`}>
                        {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                      <Text className={`flex-1 font-dmsans text-base leading-6 ${isChecked ? 'text-legacy-night-text-secondary line-through' : 'text-white'}`}>
                        {task}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync('medium');
                        router.push({
                          pathname: '/study',
                          params: { topic: task }
                        });
                      }}
                      className="p-2 rounded-xl bg-legacy-blue-ribbon/10 border border-legacy-blue-ribbon/20 flex-row items-center"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="school-outline" size={16} color={LEGACY_COLORS.blueRibbon} />
                    </TouchableOpacity>
                  </View>
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
