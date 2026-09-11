import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import {
  buildStudentLearningDashboard,
  loadCachedLearningDashboard,
  LearningRecommendation,
  StudentLearningDashboard,
} from '../../lib/recommendations';
import { TrendCard } from '../../components/ui/TrendCard';

const formatResponseSpeed = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0.0s';
  const seconds = milliseconds / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const metricTone = (value: number): { label: string; color: string } => {
  if (value >= 80) return { label: 'Strong', color: '#22c55e' };
  if (value >= 60) return { label: 'Good', color: '#f59e0b' };
  return { label: 'Needs work', color: '#ef4444' };
};

const healthTone = (score: number): { label: string; color: string; border: string; bg: string } => {
  if (score >= 90) return { label: 'Elite', color: '#c084fc', border: '#7e22ce', bg: '#3b0764' };
  if (score >= 80) return { label: 'Strong', color: '#22c55e', border: '#15803d', bg: '#052e16' };
  if (score >= 60) return { label: 'Stable', color: '#3b82f6', border: '#1d4ed8', bg: '#172554' };
  if (score >= 40) return { label: 'Weak', color: '#f59e0b', border: '#b45309', bg: '#451a03' };
  return { label: 'Critical', color: '#ef4444', border: '#b91c1c', bg: '#450a0a' };
};

const riskTone = (severity: string): { color: string; bg: string; border: string } => {
  switch (severity) {
    case 'CRITICAL': return { color: '#ef4444', border: '#7f1d1d', bg: '#450a0a' };
    case 'HIGH': return { color: '#f97316', border: '#9a3412', bg: '#431407' };
    case 'MEDIUM': return { color: '#eab308', border: '#854d0e', bg: '#422006' };
    default: return { color: '#3b82f6', border: '#1e3a8a', bg: '#172554' };
  }
};



const getDefaultSummary = (dashboard: StudentLearningDashboard): string => {
  const strongest = dashboard.strengths[0];
  const weakest = dashboard.weaknesses[0];
  const trend = dashboard.trend_overview?.weekly?.trend_summary ?? dashboard.trend_overview?.trend_summary;
  const reinforcement = dashboard.trend_overview?.weekly?.reinforcement_message ?? dashboard.trend_overview?.reinforcement_message;

  if (strongest && weakest) {
    const base = `You know ${strongest.topic} well, but ${weakest.topic} needs more guided practice because ${weakest.insight.toLowerCase()}`;
    return [base, trend, reinforcement].filter(Boolean).join(' ');
  }

  if (strongest) {
    const base = `You are building strength in ${strongest.topic}. Keep reinforcing it while you widen your practice.`;
    return [base, trend, reinforcement].filter(Boolean).join(' ');
  }

  if (weakest) {
    const base = `You need a focused reset on ${weakest.topic} because ${weakest.insight.toLowerCase()}`;
    return [base, trend, reinforcement].filter(Boolean).join(' ');
  }

  return [trend ?? 'Complete a practice session to unlock your first learning profile.', reinforcement].filter(Boolean).join(' ');
};

export default function LearningDashboardScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<StudentLearningDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, [user?.id]);

  const loadDashboard = async (): Promise<void> => {
    if (!user?.id) {
      setLoading(false);
      setError('Sign in to view your personal learning dashboard.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await buildStudentLearningDashboard(user.id);
      setDashboard(result);
    } catch {
      const cached = await loadCachedLearningDashboard(user.id);
      if (cached) {
        setDashboard(cached);
      } else {
        setError('Your dashboard is not ready yet. Finish a practice session to generate your first coach insights.');
      }
    } finally {
      setLoading(false);
    }
  };

  const coachSummary = useMemo(() => (dashboard ? getDefaultSummary(dashboard) : ''), [dashboard]);

  const handleRecommendationPress = (recommendation: LearningRecommendation): void => {
    router.push({
      pathname: '/(shared)/practice-session',
      params: {
        subject: recommendation.subject,
        topic: recommendation.topic,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] items-center justify-center">
        <ActivityIndicator size="large" color="#4f7cff" />
        <Text className="text-[#8a8fa3] mt-4 font-dmsans">Preparing your learning coach...</Text>
      </SafeAreaView>
    );
  }

  if (error || !dashboard) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] px-5">
        <View className="flex-row items-center justify-between pt-4 pb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold font-syne">Learning Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-full bg-[#4f7cff]/10 items-center justify-center mb-6">
            <Ionicons name="sparkles" size={36} color="#4f7cff" />
          </View>
          <Text className="text-white text-2xl font-bold font-syne text-center mb-2">Your coach is waiting</Text>
          <Text className="text-[#8a8fa3] text-center font-dmsans leading-6 mb-8 max-w-[300px]">
            {error ?? 'Complete a session to generate personal learning insights, strengths, weaknesses, and next steps.'}
          </Text>
          <TouchableOpacity
            className="bg-[#4f7cff] px-6 py-4 rounded-2xl flex-row items-center"
            onPress={() => router.push('/(tabs)/quiz')}
          >
            <Text className="text-white font-bold font-syne mr-2">Start Practice</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const accuracyTone = metricTone(dashboard.accuracy_score);
  const confidenceTone = metricTone(dashboard.confidence_score);
  const fluencyTone = metricTone(dashboard.fluency_score);
  const healthTheme = healthTone(dashboard.learning_health_score ?? 0);
  const weeklyTrend = dashboard.trend_overview?.weekly;
  const dailyTrend = dashboard.trend_overview?.daily;
  const monthlyTrend = dashboard.trend_overview?.monthly;
  const trendCards = [weeklyTrend, dailyTrend, monthlyTrend].filter(Boolean);

  const risks = dashboard.learning_risks || [];
  const nextAction = dashboard.next_best_action;
  const dailyTasks = dashboard.learning_plan?.dailyTasks || [];
  const activePath = dashboard.active_knowledge_path;

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-2xl bg-[#161920] border border-[#2a2f3d] items-center justify-center">
            <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          </TouchableOpacity>
          <View className="items-center flex-1 px-3">
            <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-1">Personal Learning Coach</Text>
            <Text className="text-white text-2xl font-bold font-syne">Learning Dashboard</Text>
          </View>
          <TouchableOpacity
            onPress={loadDashboard}
            className="w-10 h-10 rounded-2xl bg-[#161920] border border-[#2a2f3d] items-center justify-center"
          >
            <Ionicons name="refresh" size={18} color="#4f7cff" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[healthTheme.bg, '#0d0f12']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[32px] p-6 mb-6 border"
          style={{ borderColor: healthTheme.border }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Learning Health</Text>
            </View>
            <Text className="text-white/80 text-xs font-dmsans">{new Date(dashboard.generated_at).toLocaleDateString()}</Text>
          </View>
          <View className="flex-row items-end mb-3">
            <Text className="text-white text-5xl font-bold font-syne leading-10 mr-2">
              {dashboard.learning_health_score ?? 0}
            </Text>
            <Text style={{ color: healthTheme.color }} className="text-lg font-bold font-syne uppercase tracking-wider mb-1">
              {healthTheme.label}
            </Text>
          </View>
          <Text className="text-white/85 font-dmsans text-base leading-7">
            {coachSummary}
          </Text>
        </LinearGradient>

        <View className="flex-row mb-6">
          <View className="flex-1 bg-[#161920] rounded-[24px] p-4 mr-2 border border-[#2a2f3d]">
            <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-widest mb-2">Accuracy</Text>
            <Text className="text-white text-3xl font-bold font-syne mb-1">{dashboard.accuracy_score}%</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: accuracyTone.color }}>{accuracyTone.label}</Text>
          </View>
          <View className="flex-1 bg-[#161920] rounded-[24px] p-4 ml-2 border border-[#2a2f3d]">
            <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-widest mb-2">Confidence</Text>
            <Text className="text-white text-3xl font-bold font-syne mb-1">{dashboard.confidence_score}%</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: confidenceTone.color }}>{confidenceTone.label}</Text>
          </View>
        </View>

        <View className="flex-row mb-8">
          <View className="flex-1 bg-[#161920] rounded-[24px] p-4 mr-2 border border-[#2a2f3d]">
            <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-widest mb-2">Fluency</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{dashboard.fluency_level}</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: fluencyTone.color }}>{fluencyTone.label}</Text>
          </View>
          <View className="flex-1 bg-[#161920] rounded-[24px] p-4 ml-2 border border-[#2a2f3d]">
            <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-widest mb-2">Avg Speed</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{formatResponseSpeed(dashboard.average_response_time_ms)}</Text>
            <Text className="text-white/80 text-xs font-dmsans">Per question</Text>
          </View>
        </View>

        {activePath && activePath.currentNode && (
          <View className="mb-8 bg-[#161920] rounded-[24px] p-5 border border-[#4f7cff] overflow-hidden">
            <View className="absolute right-[-10px] top-[-10px] opacity-10">
              <Ionicons name="git-network" size={100} color="#4f7cff" />
            </View>
            <Text className="text-[#4f7cff] text-[10px] uppercase font-bold tracking-widest mb-2">Current Learning Path</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{activePath.path.path_goal}</Text>
            <Text className="text-white/80 font-dmsans leading-6 mb-4">You are progressing towards your target goals.</Text>
            
            <View className="bg-[#0d0f12] rounded-2xl p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] text-xs font-bold uppercase tracking-widest mb-2">Next Concept</Text>
              <Text className="text-white text-lg font-bold font-syne">{activePath.currentNode.title}</Text>
              <Text className="text-white/80 font-dmsans text-sm mt-1">{activePath.currentNode.description}</Text>
              {activePath.currentNode.prerequisites.length > 0 && (
                <View className="mt-3 flex-row items-center">
                  <Ionicons name="link" size={14} color="#f59e0b" />
                  <Text className="text-[#f59e0b] font-dmsans text-xs ml-1 font-bold">Has Prerequisites</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {dashboard.adaptive_learning_path && (
          <View className="mb-8 bg-[#161920] rounded-[24px] p-5 border border-[#22c55e] overflow-hidden">
            <View className="absolute right-[-10px] top-[-10px] opacity-10">
              <Ionicons name="compass" size={100} color="#22c55e" />
            </View>
            <Text className="text-[#22c55e] text-[10px] uppercase font-bold tracking-widest mb-2">Adaptive Curriculum Path</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">Target: {dashboard.adaptive_learning_path.destination.title}</Text>
            <Text className="text-white/80 font-dmsans leading-6 mb-4">{dashboard.adaptive_learning_path.explanation}</Text>
            
            <View className="bg-[#0d0f12] rounded-2xl p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] text-xs font-bold uppercase tracking-widest mb-2">Recommended Sequence</Text>
              {dashboard.adaptive_learning_path.recommended_path.slice(0, 3).map((node, i) => (
                <View key={node.id} className="flex-row items-center mt-2">
                  <View className="w-6 h-6 rounded-full bg-[#22c55e]/20 items-center justify-center mr-3">
                    <Text className="text-[#22c55e] text-xs font-bold">{i + 1}</Text>
                  </View>
                  <Text className="text-white font-dmsans flex-1">{node.title}</Text>
                </View>
              ))}
              {dashboard.adaptive_learning_path.recommended_path.length > 3 && (
                <Text className="text-[#8a8fa3] text-xs mt-3 italic">+ {dashboard.adaptive_learning_path.recommended_path.length - 3} more concepts</Text>
              )}
            </View>
          </View>
        )}

        {nextAction && (
          <View className="mb-8">
            <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">Next Best Action</Text>
            <TouchableOpacity
              onPress={() => handleRecommendationPress({ subject: nextAction.subjectId, topic: nextAction.topicId } as any)}
              className="bg-[#1e1b4b] rounded-[24px] p-5 border border-[#3730a3]"
              activeOpacity={0.85}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="bg-[#4f46e5] px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Recommended</Text>
                </View>
                <Ionicons name="flash" size={16} color="#818cf8" />
              </View>
              <Text className="text-[#818cf8] text-[10px] uppercase tracking-widest font-bold mb-1">{nextAction.subjectId} • {nextAction.topicId}</Text>
              <Text className="text-white text-2xl font-bold font-syne mb-2">
                {nextAction.type.replace('_', ' ')}
              </Text>
              <Text className="text-white/80 font-dmsans leading-6 mb-3">{nextAction.rationale}</Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#818cf8" />
                <Text className="text-[#818cf8] text-xs font-dmsans ml-1 mr-3">Est. {Math.max(10, Math.round(nextAction.estimatedImprovement * 0.5))} mins</Text>
                <Ionicons name="trending-up-outline" size={14} color="#818cf8" />
                <Text className="text-[#818cf8] text-xs font-dmsans ml-1">+{Math.round(nextAction.estimatedImprovement)}% expected</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {risks.length > 0 && (
          <View className="mb-8">
            <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">Learning Risks</Text>
            {risks.slice(0, 3).map((risk) => {
              const theme = riskTone(risk.severity);
              return (
                <View key={risk.topicId} className="rounded-[24px] p-4 mb-3 border" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1">
                      <Text style={{ color: theme.color }} className="text-[10px] uppercase tracking-widest font-bold mb-1">{risk.subjectId}</Text>
                      <Text className="text-white text-lg font-bold font-syne">{risk.topicId}</Text>
                    </View>
                    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.color + '20' }}>
                      <Text style={{ color: theme.color }} className="text-[10px] font-bold uppercase">{risk.severity}</Text>
                    </View>
                  </View>
                  <Text className="text-white/80 font-dmsans text-sm leading-5 mb-2">{risk.reason}</Text>
                  <Text style={{ color: theme.color }} className="text-xs font-dmsans font-bold">{risk.intervention}</Text>
                </View>
              );
            })}
          </View>
        )}

        {dailyTasks.length > 0 && (
          <View className="mb-8">
            <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">Today's Study Plan</Text>
            {dailyTasks.map((task, idx) => (
              <View key={`${task.topicId}-${idx}`} className="bg-[#161920] rounded-[24px] p-4 mb-3 border border-[#2a2f3d] flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1e2330] items-center justify-center mr-4">
                  <Text className="text-[#8a8fa3] font-bold">{idx + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold font-syne text-base">{task.topicId}</Text>
                  <Text className="text-[#8a8fa3] font-dmsans text-xs capitalize">{task.action}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-bold font-syne">{task.estimatedDurationMins}m</Text>
                  <Text className="text-[#8a8fa3] text-[10px] uppercase">Priority {Math.round(task.priorityScore)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="mb-8">
          <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">Progress Over Time</Text>
          {trendCards.length > 0 ? trendCards.map((summary) => {
            if (!summary) return null;
            return <TrendCard key={`${summary.window}-${summary.period_start}`} summary={summary} />;
          }) : (
            <View className="bg-[#161920] rounded-[24px] p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] font-dmsans">
                Keep practicing to unlock daily, weekly, and monthly trend stories.
              </Text>
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">What You Know</Text>
          {dashboard.strengths.length > 0 ? (
            dashboard.strengths.map((item) => (
              <View key={`strength-${item.subject}-${item.topic}`} className="bg-[#0f1f17] rounded-[24px] p-4 mb-3 border border-[#1f5f3a]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-[#4ade80] text-[10px] uppercase tracking-widest font-bold mb-1">{item.subject}</Text>
                    <Text className="text-white text-lg font-bold font-syne">{item.topic}</Text>
                  </View>
                  <View className="bg-[#22c55e]/10 px-3 py-1 rounded-full">
                    <Text className="text-[#22c55e] text-[10px] font-bold uppercase">{item.fluency_level}</Text>
                  </View>
                </View>
                <Text className="text-white/80 font-dmsans leading-6">{item.insight}</Text>
              </View>
            ))
          ) : (
            <View className="bg-[#161920] rounded-[24px] p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] font-dmsans">Complete more practice sessions to identify your strongest topics.</Text>
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">What Needs Work</Text>
          {dashboard.weaknesses.length > 0 ? (
            dashboard.weaknesses.map((item) => (
              <View key={`weakness-${item.subject}-${item.topic}`} className="bg-[#211016] rounded-[24px] p-4 mb-3 border border-[#5f1f2b]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-[#fda4af] text-[10px] uppercase tracking-widest font-bold mb-1">{item.subject}</Text>
                    <Text className="text-white text-lg font-bold font-syne">{item.topic}</Text>
                  </View>
                  <Text className="text-[#f87171] font-bold font-syne">{item.accuracy_score}%</Text>
                </View>
                <Text className="text-white/85 font-dmsans leading-6 mb-2">{item.insight}</Text>
                <Text className="text-[#fda4af] text-xs font-dmsans">
                  Accuracy {item.accuracy_score}% · Confidence {item.confidence_score}% · Speed {formatResponseSpeed(item.average_response_time_ms)}
                </Text>
              </View>
            ))
          ) : (
            <View className="bg-[#161920] rounded-[24px] p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] font-dmsans">No clear weaknesses yet. Keep practicing to sharpen your signals.</Text>
            </View>
          )}
        </View>

        <View className="mb-10">
          <Text className="text-[#8a8fa3] text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">What To Do Next</Text>
          {dashboard.recommendations.length > 0 ? (
            dashboard.recommendations.map((recommendation) => (
              <TouchableOpacity
                key={recommendation.recommendation_key}
                onPress={() => handleRecommendationPress(recommendation)}
                className="bg-[#161920] rounded-[24px] p-4 mb-3 border border-[#2a2f3d]"
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-4">
                    <Text className="text-white text-lg font-bold font-syne mb-1">{recommendation.title}</Text>
                    <Text className="text-[#8a8fa3] text-xs uppercase font-bold tracking-widest">{recommendation.action_label}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#4f7cff" />
                </View>
                <Text className="text-white/85 font-dmsans leading-6">{recommendation.reason}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-[#161920] rounded-[24px] p-4 border border-[#2a2f3d]">
              <Text className="text-[#8a8fa3] font-dmsans">No recommendations yet. Finish another session to build your next plan.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/quiz')}
          className="bg-[#4f7cff] rounded-[24px] p-5 items-center flex-row justify-center mb-10"
        >
          <Text className="text-white font-bold font-syne text-base mr-2">Practice Again</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
