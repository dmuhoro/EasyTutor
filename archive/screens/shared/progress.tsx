import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProgressStore, getLevel } from "../../store/progressStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useAuthStore } from "../../store/authStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from "expo-router";
import { getAllProgress, getWeakTopics, getLocalSubjects } from "../../data/knowledgeStore";
import { SyncIndicator } from "../../components/SyncIndicator";
import { logEvent } from "../../lib/logEvent";

export default function ProgressDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { studyStreak, xpTotal, streakFreezes, quizScores } = useProgressStore();
  const { roadmaps, checkedTasks } = useRoadmapStore();
  
  const [loading, setLoading] = useState(true);
  const [masteryCount, setMasteryCount] = useState(0);
  const [weakAreas, setWeakAreas] = useState<any[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [masteryTrend, setMasteryTrend] = useState<number | null>(null);

  useEffect(() => {
    fetchLiveStats();
  }, [user]);

  const fetchLiveStats = async () => {
    if (!user?.id) {
      console.warn('[AUTH] [PROGRESS] fetchLiveStats skipped: missing user');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Local-first: compute dashboard stats from local stores/knowledge.
      const [progress, weakIds, subjects] = await Promise.all([
        getAllProgress(),
        getWeakTopics(),
        getLocalSubjects(),
      ]);

      const mastered = Object.values(progress).filter((p) => p.mastered).length;
      setMasteryCount(mastered);

      const idToSubjectName: Record<string, string> = {};
      const idToTopicName: Record<string, string> = {};
      for (const s of subjects) {
        idToSubjectName[s.id] = s.name;
        for (const t of s.topics) {
          idToTopicName[t.id] = t.name;
        }
      }

      const weakMapped = weakIds.slice(0, 10).map((topicId) => ({
        topicId,
        topicName: idToTopicName[topicId] ?? topicId,
        subjectName: (() => {
          const p = progress[topicId];
          return p ? (idToSubjectName[p.subjectId] ?? p.subjectId) : 'Subject';
        })(),
        masteryScore: progress[topicId]?.score ?? 0,
        attempts: progress[topicId]?.attempts ?? 0,
      }));
      setWeakAreas(weakMapped);

      if (quizScores.length > 0) {
        const totalPct = quizScores.reduce((acc, q) => acc + (q.score / q.total), 0);
        setAvgScore(Math.round((totalPct / quizScores.length) * 100));
      } else {
        setAvgScore(0);
      }

      // Mastery trend (last 7 days): compare average masteryScore now vs 7 days ago snapshot from events
      try {
        const events = useProgressStore.getState().xpEvents;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const before = events.filter((e) => new Date(e.timestamp).getTime() <= sevenDaysAgo);
        const after = events.filter((e) => new Date(e.timestamp).getTime() > sevenDaysAgo);
        const avg = (arr: any[]) => {
          if (arr.length === 0) return null;
          return arr.reduce((a, b) => a + (b.value || 0), 0) / arr.length;
        };
        const beforeAvg = avg(before);
        const afterAvg = avg(after);
        if (beforeAvg !== null && afterAvg !== null) {
          setMasteryTrend(Math.round((afterAvg - beforeAvg) * 10) / 10);
        } else {
          setMasteryTrend(null);
        }
      } catch {
        setMasteryTrend(null);
      }
    } catch (err) {
      console.error('[SAFE_ERROR] [PROGRESS] fetchLiveStats failed', err);
      setError('Could not load progress insights. Your local progress is still safe.');
      void logEvent('ERROR', 'progress_dashboard_failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const level = getLevel(xpTotal);
  
  const getMotivationalMessage = (lvl: string) => {
    switch (lvl) {
      case 'Explorer': return 'You are building momentum. Keep going.';
      case 'Scholar': return 'You are ahead of most. Push further.';
      case 'Advanced': return 'You are in rare company. Stay consistent.';
      case 'Expert': return 'You have mastered the system. Now go build something.';
      default: return 'Every expert was once a beginner. Start today.';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4f7cff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold font-syne">My Success</Text>
        <View className="flex-row items-center">
          <View className="mr-3">
            <SyncIndicator />
          </View>
          <TouchableOpacity onPress={fetchLiveStats} disabled={loading}>
            <Ionicons name="refresh" size={20} color={loading ? "#3a3f53" : "#4f7cff"} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f7cff" />
          <Text className="text-[#8a8fa3] font-dmsans mt-4">Syncing Scholarly Progress...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-20 h-20 bg-[#ef4444]/10 rounded-full items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={40} color="#ef4444" />
          </View>
          <Text className="text-white text-xl font-bold font-syne text-center mb-2">Progress unavailable</Text>
          <Text className="text-[#8a8fa3] text-center font-dmsans mb-8">{error}</Text>
          <TouchableOpacity onPress={fetchLiveStats} className="bg-[#4f7cff] px-8 py-4 rounded-2xl">
            <Text className="text-white font-bold font-syne">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-8" showsVerticalScrollIndicator={false}>
          {/* Learning Insights */}
          <View className="bg-[#161920] rounded-[32px] p-6 mb-8 border border-[#2a2f3d]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-lg font-bold font-syne">Learning Insights</Text>
              <Text className="text-[#8a8fa3] text-[10px] font-bold uppercase tracking-widest">Local-first</Text>
            </View>
            <Text className="text-[#8a8fa3] font-dmsans text-sm leading-6">
              {masteryTrend === null
                ? 'Keep practicing to unlock personalized trends.'
                : masteryTrend >= 0
                  ? `Your mastery trend is up by ${masteryTrend} points this week.`
                  : `Your mastery trend is down by ${Math.abs(masteryTrend)} points this week — revisit weak areas.`}
            </Text>
          </View>

          {/* XP & Level Section */}
          <View className="bg-[#161920] rounded-[32px] p-6 mb-8 border border-[#2a2f3d]">
            <View className="flex-row items-center justify-between mb-4">
               <View className="flex-row items-center">
                 <View className="bg-[#fbbf24]/10 w-14 h-14 rounded-2xl items-center justify-center mr-4 border border-[#fbbf24]/20">
                   <Ionicons name="shield-checkmark" size={28} color="#fbbf24" />
                 </View>
                 <View>
                   <Text className="text-[#8a8fa3] text-[10px] font-bold uppercase tracking-[2px] mb-1">Current Level</Text>
                   <Text className="text-white text-2xl font-bold font-syne uppercase">{level}</Text>
                 </View>
               </View>
               <View className="items-end">
                 <Text className="text-[#fbbf24] text-xl font-bold font-syne">{xpTotal}</Text>
                 <Text className="text-[#5a5f73] text-[9px] font-bold uppercase tracking-widest">Total XP</Text>
               </View>
            </View>
            <View className="bg-[#0d0f12] p-4 rounded-2xl border border-[#2a2f3d]/50">
               <Text className="text-[#8a8fa3] text-xs font-dmsans italic text-center">
                 "{getMotivationalMessage(level)}"
               </Text>
            </View>
          </View>

          {/* Main Stats */}
          <View className="flex-row justify-between mb-10">
            <View className="bg-[#161920] w-[31%] p-5 rounded-[28px] border border-[#2a2f3d] items-center">
               <Ionicons name="flame" size={24} color="#f59e0b" />
               <View className="flex-row items-center mt-2">
                 <Text className="text-white text-xl font-bold font-syne">{studyStreak}</Text>
                 {streakFreezes > 0 && (
                   <View className="ml-1 bg-[#4f7cff]/20 px-1 rounded-sm flex-row items-center">
                      <Ionicons name="snow" size={8} color="#4f7cff" />
                      <Text className="text-[#4f7cff] text-[8px] font-bold"> {streakFreezes}</Text>
                   </View>
                 )}
               </View>
               <Text className="text-[#8a8fa3] text-[9px] uppercase font-bold text-center mt-1">Streak</Text>
            </View>
            <View className="bg-[#161920] w-[31%] p-5 rounded-[28px] border border-[#2a2f3d] items-center">
               <Ionicons name="trophy" size={24} color="#4f7cff" />
               <Text className="text-white text-xl font-bold font-syne mt-2">{masteryCount}</Text>
               <Text className="text-[#8a8fa3] text-[9px] uppercase font-bold text-center mt-1">Mastered</Text>
            </View>
            <View className="bg-[#161920] w-[31%] p-5 rounded-[28px] border border-[#2a2f3d] items-center">
               <Ionicons name="analytics" size={24} color="#22c55e" />
               <Text className="text-white text-xl font-bold font-syne mt-2">{avgScore}%</Text>
               <Text className="text-[#8a8fa3] text-[9px] uppercase font-bold text-center mt-1">Avg Score</Text>
            </View>
          </View>

          {/* Weak Areas Section */}
          {weakAreas.length > 0 && (
            <View className="mb-10">
              <Text className="text-[#8a8fa3] font-bold uppercase text-[10px] mb-4 ml-2 tracking-widest">Target for Focus (Weak Areas)</Text>
              {weakAreas.map((item, idx) => (
                <View key={idx} className="bg-[#ef4444]/5 rounded-[24px] p-5 mb-3 border border-[#ef4444]/10 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[#ef4444] font-bold font-syne text-[8px] uppercase tracking-widest mb-1">
                      {item.subjectName || 'Subject'}
                    </Text>
                    <Text className="text-white font-bold font-syne" numberOfLines={1}>
                      {item.topicName || 'Topic'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[#ef4444] font-bold font-syne">{Math.round(item.masteryScore || 0)}%</Text>
                    <Text className="text-[#5a5f73] text-[8px] font-bold uppercase">{item.attempts || 0} attempts</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Active Roadmaps */}
          <Text className="text-[#8a8fa3] font-bold uppercase text-[10px] mb-6 ml-2 tracking-widest">Active Roadmap Progress</Text>
          {roadmaps.length === 0 ? (
            <View className="bg-[#161920] rounded-[32px] p-8 border-2 border-dashed border-[#2a2f3d] items-center mb-10">
              <Ionicons name="map-outline" size={32} color="#3a3f53" />
              <Text className="text-[#8a8fa3] text-center font-dmsans mt-4">No active missions tracked.</Text>
            </View>
          ) : (
            roadmaps.slice(0, 3).map((roadmap) => {
              const totalTasks = roadmap.days.reduce((acc, day) => acc + day.tasks.length, 0);
              const roadmapChecked = checkedTasks[roadmap.id] || {};
              const completedTasks = Object.values(roadmapChecked).reduce((acc, dayTasks) => acc + (Array.isArray(dayTasks) ? dayTasks.length : 0), 0);
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

              return (
                <View key={roadmap.id} className="bg-[#161920] rounded-[32px] p-6 mb-5 border border-[#2a2f3d]">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-bold font-syne flex-1 mr-4" numberOfLines={1}>{roadmap.topic}</Text>
                    <Text className="text-[#4f7cff] font-bold font-syne text-xs">{Math.round(progress)}%</Text>
                  </View>
                  <View className="w-full bg-[#0d0f12] h-2 rounded-full overflow-hidden border border-[#2a2f3d]">
                    <View 
                      className="bg-[#4f7cff] h-full rounded-full" 
                      style={{ width: `${progress}%` }} 
                    />
                  </View>
                </View>
              );
            })
          )}

          <View className="h-20" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
