import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SUBJECTS } from "../../lib/subjects";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProgressStore } from "../../store/progressStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useAuthStore } from "../../store/authStore";
import { useNetInfo } from "@react-native-community/netinfo";
import { preloadQuizCache } from "../../lib/cache";
import { copyToClipboard } from "../../lib/clipboard";
import * as Haptics from '../../lib/haptics';
import { Alert } from "react-native";
import { getWeakTopics, getWeakTopicWithExplanation } from "../../lib/adaptive";
import { getXPTrend, getMasteryDistribution, getStreak } from "../../lib/dashboard";

export default function HomeTab() {
  const router = useRouter();
  const { updateStreak, studyStreak, topicsStudied, xpTotal, syncPendingProgress, getLevel, lastOpenedDate, pendingProgressSync } = useProgressStore();
  const { roadmaps, getRoadmapProgress, syncQueuedTasks, checkedTasks } = useRoadmapStore();
  const { user } = useAuthStore();
  const { isConnected } = useNetInfo();

  useEffect(() => {
    updateStreak();
    if (isConnected) {
      preloadQuizCache();
      syncQueuedTasks();
      syncPendingProgress();
    }

    // Adaptive Learning: Detect weak topics for Focus Mode (Task 5.1)
    if (user?.id) {
      void (async () => {
        // Upgrade: Now fetches explanation via AI bridge
        const focus = await getWeakTopicWithExplanation(user.id);
        if (focus) {
          console.log('[AI FOCUS] explanation generated', focus.explanation);
          // Future UI can render focus.explanation in a "Tutor Tip" card
        }

        // Performance Dashboard integration
        try {
          const xpTrend = await getXPTrend(user.id);
          const mastery = await getMasteryDistribution(user.id);
          const streak = await getStreak(user.id);
          console.log('[DASHBOARD]', xpTrend, mastery);
          console.log('[STREAK]', streak);
        } catch (e) {
          console.error('[DASHBOARD ERROR]', e);
        }
      })();
    }

    return () => {};
  }, [isConnected]);

  const lastRoadmap = [...roadmaps].sort((a, b) => {
    const timeA = new Date(a.lastOpenedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastOpenedAt || b.createdAt).getTime();
    return timeB - timeA;
  })[0];

  const getNextTask = (roadmap: any) => {
    if (!roadmap) return null;
    const checked = checkedTasks[roadmap.id] || {};
    for (const day of roadmap.days) {
      const dayChecked = checked[day.day] || [];
      const incomplete = day.tasks.find((t: string) => !dayChecked.includes(t));
      if (incomplete) return { day: day.day, task: incomplete };
    }
    return null;
  };

  const nextTask = lastRoadmap ? getNextTask(lastRoadmap) : null;
  const totalTopicsStudied = Object.values(topicsStudied).flat().length;
  const displayName = user?.email?.split('@')[0] ?? 'Student';

  const getGreeting = () => {
    if (!lastOpenedDate) return "Welcome back,";
    
    const lastDate = new Date(lastOpenedDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Welcome back 👋";
    if (diffDays === 1) return "Your learning streak is waiting";
    if (diffDays >= 3) return "Let’s get you back on track";
    return "Ready for your next mission?";
  };

  // Next Best Action Logic (Requirement 1 & 3)
  const incompleteRoadmaps = roadmaps.filter(r => getRoadmapProgress(r.id) < 100);
  const nextActionRoadmap = [...incompleteRoadmaps].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  const nextBestTask = nextActionRoadmap ? getNextTask(nextActionRoadmap) : null;
  
  const handleShare = async () => {
    const message = `I'm studying smarter with EasyTutor 🚀 Just mastered ${totalTopicsStudied} concepts!`;
    await copyToClipboard(message);
    Haptics.impactAsync('medium');
    Alert.alert("Copied to clipboard", "Share your progress with friends!");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="mb-8 mt-2 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-[#8a8fa3] text-lg font-dmsans">{getGreeting()}</Text>
            <Text className="text-white text-4xl font-bold font-syne tracking-tight capitalize">
              {displayName}
            </Text>
          </View>
          <View className="flex-row items-center">
            {pendingProgressSync && (
              <View className="mr-3 flex-row items-center bg-[#f59e0b]/10 px-2 py-1 rounded-lg border border-[#f59e0b]/20">
                <Ionicons name="cloud-upload" size={12} color="#f59e0b" />
                <Text className="text-[#f59e0b] text-[10px] font-bold font-syne ml-1 uppercase">Syncing</Text>
              </View>
            )}
            <TouchableOpacity 
              onPress={() => router.push('/settings')} 
              className="bg-[#161920] p-3 rounded-2xl border border-[#2a2f3d] shadow-sm"
            >
              <Ionicons name="person" size={22} color="#4f7cff" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Next Best Action Hero (Requirement 2) */}
        <View className="mb-10">
          {nextBestTask ? (
            <TouchableOpacity 
              className="bg-[#4f7cff] rounded-[32px] p-8 shadow-2xl shadow-[#4f7cff]/30 relative overflow-hidden"
              onPress={() => router.push(`/roadmaps/${nextActionRoadmap.id}`)}
              activeOpacity={0.9}
            >
              <View className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10" />
              <View className="flex-row items-center mb-4">
                 <View className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                    <Text className="text-white font-bold font-syne text-[10px] uppercase">Next Best Action</Text>
                 </View>
                 <Text className="text-white/80 font-dmsans text-xs ml-3">Day {nextBestTask.day}</Text>
              </View>
              <Text className="text-white text-3xl font-bold font-syne mb-2" numberOfLines={2}>
                {nextBestTask.task}
              </Text>
              <Text className="text-white/80 font-dmsans mb-8">
                Continuing your mission: {nextActionRoadmap.topic}
              </Text>
              
              <View className="bg-white px-8 py-4 rounded-2xl self-start flex-row items-center">
                 <Text className="text-[#4f7cff] font-bold font-syne text-lg mr-2">Continue Learning</Text>
                 <Ionicons name="arrow-forward" size={20} color="#4f7cff" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              className="bg-[#161920] rounded-[32px] p-8 border-2 border-dashed border-[#2a2f3d] items-center"
              onPress={() => router.push('/explore')}
            >
              <View className="w-16 h-16 bg-[#4f7cff]/10 rounded-full items-center justify-center mb-6">
                <Ionicons name="sparkles" size={32} color="#4f7cff" />
              </View>
              <Text className="text-white font-bold font-syne text-2xl text-center mb-2">Welcome to EasyTutor</Text>
              <Text className="text-[#8a8fa3] text-center font-dmsans text-base mb-8 max-w-[280px]">
                Your AI-powered study companion. Start by creating your first roadmap to see the magic happen.
              </Text>
              <View className="bg-[#4f7cff] px-10 py-4 rounded-2xl flex-row items-center">
                 <Text className="text-white font-bold font-syne text-lg mr-2">Start your first study plan in 2 taps</Text>
                 <Ionicons name="add" size={24} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          className="bg-[#161920] rounded-[24px] p-5 mb-8 border border-[#2a2f3d] flex-row items-center justify-between"
          onPress={() => router.push('/(ai_literacy)')}
        >
          <View>
            <Text className="text-[#4f7cff] text-[10px] uppercase font-bold tracking-widest mb-1">Flagship Learning</Text>
            <Text className="text-white text-lg font-bold font-syne">AI Literacy Units 1 & 2</Text>
            <Text className="text-[#8a8fa3] text-xs font-dmsans mt-1">Offline after first load • African examples</Text>
          </View>
          <Ionicons name="sparkles" size={24} color="#4f7cff" />
        </TouchableOpacity>

        {/* Dashboard Stats Card */}
        <View className="bg-[#161920] rounded-[32px] p-6 mb-10 border border-[#2a2f3d] shadow-2xl overflow-hidden">
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-[#4f7cff]/5 rounded-full" />
          
          <View className="flex-row items-center mb-6">
            <View className="bg-[#4f7cff] w-14 h-14 rounded-2xl items-center justify-center mr-4">
               <Ionicons name="trophy" size={28} color="white" />
            </View>
            <View>
              <Text className="text-[#8a8fa3] text-[10px] font-dmsans uppercase tracking-widest">Current Status</Text>
              <Text className="text-white text-2xl font-bold font-syne">{getLevel(xpTotal)}</Text>
            </View>
          </View>

          <View className="flex-row justify-between mb-6">
            <View className="flex-1 bg-[#0d0f12] p-4 rounded-2xl mr-2 border border-[#2a2f3d]/60">
              <Text className="text-[#8a8fa3] text-[10px] font-dmsans uppercase tracking-widest mb-1">Total XP</Text>
              <View className="flex-row items-center">
                <Ionicons name="sparkles" size={16} color="#4f7cff" />
                <Text className="text-white text-xl font-bold font-syne ml-2">{xpTotal}</Text>
              </View>
            </View>
            <View className="flex-1 bg-[#0d0f12] p-4 rounded-2xl ml-2 border border-[#2a2f3d]/60">
              <Text className="text-[#8a8fa3] text-[10px] font-dmsans uppercase tracking-widest mb-1">Learning Streak</Text>
              <View className="flex-row items-center">
                <Ionicons name="flame" size={16} color="#f59e0b" />
                <Text className="text-white text-xl font-bold font-syne ml-2">{studyStreak} Days</Text>
              </View>
            </View>
          </View>

          <View className="w-full h-[1px] bg-[#2a2f3d] mb-6" />

          <View className="flex-row justify-between items-center">
            <View>
               <Text className="text-white font-bold font-syne text-lg">{totalTopicsStudied}</Text>
               <Text className="text-[#8a8fa3] text-[10px] font-dmsans uppercase tracking-tight">Concepts Mastered</Text>
            </View>
            <TouchableOpacity 
              onPress={handleShare}
              className="bg-[#4f7cff]/20 px-4 py-2 rounded-xl flex-row items-center"
            >
               <Ionicons name="share-social" size={16} color="#4f7cff" />
               <Text className="text-[#4f7cff] font-bold font-syne text-[10px] ml-2 uppercase">Share Progress</Text>
            </TouchableOpacity>
            <View className="items-end">
               <Text className="text-white font-bold font-syne text-lg">{roadmaps.length}</Text>
               <Text className="text-[#8a8fa3] text-[10px] font-dmsans uppercase tracking-tight">AI Curriculums</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-[#121823] rounded-[26px] p-5 mb-10 border border-[#35508d] flex-row items-center justify-between"
          onPress={() => router.push('/(shared)/learning-dashboard')}
        >
          <View className="flex-1 mr-4">
            <Text className="text-[#9eb8ff] text-[10px] uppercase font-bold tracking-widest mb-1">Learning Coach</Text>
            <Text className="text-white text-lg font-bold font-syne">Open your learning dashboard</Text>
            <Text className="text-[#cfd6ec] text-sm font-dmsans mt-1">See what you know, what needs work, and what to do next.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
        </TouchableOpacity>


        {/* Roadmaps Section */}
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-2xl font-bold font-syne">My Roadmaps</Text>
            <TouchableOpacity onPress={() => router.push('/roadmaps/create')}>
              <Text className="text-[#4f7cff] font-dmsans font-bold">+ New Roadmap</Text>
            </TouchableOpacity>
          </View>

          {roadmaps.length === 0 ? (
            <TouchableOpacity 
              className="bg-[#161920] rounded-[28px] p-8 border-2 border-dashed border-[#2a2f3d] items-center"
              onPress={() => router.push('/roadmaps/create')}
            >
              <View className="w-12 h-12 bg-[#4f7cff]/10 rounded-full items-center justify-center mb-4">
                <Ionicons name="sparkles" size={24} color="#4f7cff" />
              </View>
              <Text className="text-white font-bold font-syne text-lg">Create your first AI Roadmap</Text>
              <Text className="text-[#8a8fa3] text-sm font-dmsans mt-2 text-center">
                Master any topic with a custom 7-day curriculum.
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              {roadmaps.slice(0, 3).map((roadmap) => (
                <TouchableOpacity 
                   key={roadmap.id}
                   onPress={() => router.push(`/roadmaps/${roadmap.id}`)}
                   className="bg-[#161920] w-64 mr-4 p-6 rounded-[28px] border border-[#2a2f3d]"
                >
                  <View className="flex-row items-center mb-4">
                    <View className="bg-[#4f7cff] w-10 h-10 rounded-xl items-center justify-center mr-3">
                       <Ionicons name="map" size={20} color="white" />
                    </View>
                    <Text className="text-white font-bold font-syne flex-1" numberOfLines={1}>{roadmap.topic}</Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[#8a8fa3] text-xs font-dmsans">7 Day Curriculum</Text>
                    <Text className="text-[#4f7cff] font-bold font-syne text-xs">{getRoadmapProgress(roadmap.id)}%</Text>
                  </View>

                  <View className="w-full bg-[#2a2f3d] h-1.5 rounded-full overflow-hidden mb-4">
                    <View 
                      className="bg-[#4f7cff] h-full rounded-full" 
                      style={{ width: `${getRoadmapProgress(roadmap.id)}%` }} 
                    />
                  </View>

                  <View className="flex-row items-center">
                    <Text className="text-[#4f7cff] font-bold text-sm">Resume Learning</Text>
                    <Ionicons name="arrow-forward" size={14} color="#4f7cff" className="ml-1" />
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => router.push('/roadmaps/create')}
                className="bg-[#4f7cff]/10 w-24 rounded-[28px] border border-dashed border-[#4f7cff]/40 items-center justify-center mr-5"
              >
                <Ionicons name="add" size={32} color="#4f7cff" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Recommended "Next Up" Section */}
        <View className="mb-10">
          <Text className="text-white text-2xl font-bold font-syne mb-5">Recommended Next Up</Text>
          <TouchableOpacity 
            className="bg-[#4f7cff] rounded-[28px] p-6 shadow-xl shadow-[#4f7cff]/30 flex-row items-center justify-between"
            onPress={() => router.push('/quiz')}
            activeOpacity={0.9}
          >
            <View className="flex-1 pr-4">
              <Text className="text-white/70 font-dmsans text-sm uppercase tracking-wider mb-1">Knowledge Check</Text>
              <Text className="text-white text-xl font-bold font-syne mb-2">Automotive Engineering 101</Text>
              <View className="flex-row items-center">
                 <Ionicons name="timer-outline" size={16} color="white" />
                 <Text className="text-white/80 font-dmsans text-xs ml-1">5 min Quick Quiz</Text>
              </View>
            </View>
            <View className="bg-white/20 p-4 rounded-2xl">
              <Ionicons name="play" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Subjects Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-2xl font-bold font-syne">My Learning Path</Text>
          <TouchableOpacity><Text className="text-[#4f7cff] font-dmsans font-bold">View All</Text></TouchableOpacity>
        </View>

        {/* Subjects Grid */}
        <View className="flex-row flex-wrap justify-between">
          {SUBJECTS.map((subject) => {
            const topicCount = subject.topics.length;
            const completedInSubject = (topicsStudied[subject.id] || []).length;
            const progress = topicCount > 0 ? (completedInSubject / topicCount) * 100 : 0;

            return (
              <TouchableOpacity
                key={subject.id}
                className="w-[48%] bg-[#161920] rounded-[28px] p-5 mb-5 border border-[#2a2f3d]/60 shadow-sm"
                onPress={() => router.push({ pathname: '/study', params: { subjectId: subject.id } })}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 bg-[#0d0f12] rounded-2xl items-center justify-center mb-4 border border-[#2a2f3d]">
                  <Text className="text-xl">{subject.icon}</Text>
                </View>
                <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={2}>
                  {subject.name}
                </Text>
                <Text className="text-[#8a8fa3] text-xs font-dmsans mb-4">
                  {completedInSubject}/{topicCount} Topics
                </Text>

                <View className="w-full bg-[#2a2f3d] h-2 rounded-full overflow-hidden">
                  <View 
                    className="bg-[#4f7cff] h-full rounded-full" 
                    style={{ width: `${progress}%` }} 
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
