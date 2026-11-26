import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  if (value >= 80) return { label: t('s92'), color: LEGACY_COLORS.green500 };
  if (value >= 60) return { label: t('s362'), color: LEGACY_COLORS.amberBright };
  return { label: t('s208'), color: LEGACY_COLORS.red500 };
};

const healthTone = (score: number): { label: string; color: string; border: string; bg: string } => {
  if (score >= 90) return { label: t('s59'), color: LEGACY_COLORS.purple400, border: LEGACY_COLORS.purple700, bg: LEGACY_COLORS.purple950 };
  if (score >= 80) return { label: t('s92'), color: LEGACY_COLORS.green500, border: LEGACY_COLORS.green700, bg: LEGACY_COLORS.emerald950 };
  if (score >= 60) return { label: t('s259'), color: LEGACY_COLORS.blue500, border: LEGACY_COLORS.blue700, bg: LEGACY_COLORS.blue950 };
  if (score >= 40) return { label: t('s251'), color: LEGACY_COLORS.amberBright, border: LEGACY_COLORS.amber800, bg: LEGACY_COLORS.amberWash900 };
  return { label: t('s116'), color: LEGACY_COLORS.red500, border: LEGACY_COLORS.red700, bg: LEGACY_COLORS.red950 };
};

const riskTone = (severity: string): { color: string; bg: string; border: string } => {
  switch (severity) {
    case 'CRITICAL': return { color: LEGACY_COLORS.red500, border: LEGACY_COLORS.red900, bg: LEGACY_COLORS.red950 };
    case 'HIGH': return { color: LEGACY_COLORS.orange500, border: LEGACY_COLORS.orange800, bg: LEGACY_COLORS.orange950 };
    case 'MEDIUM': return { color: LEGACY_COLORS.yellow500, border: LEGACY_COLORS.amber700, bg: LEGACY_COLORS.amber950 };
    default: return { color: LEGACY_COLORS.blue500, border: LEGACY_COLORS.blue900, bg: LEGACY_COLORS.blue950 };
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
      setError(t('s317'));
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
        setError(t('s247'));
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
      <SafeAreaView className="flex-1 bg-legacy-night-canvas items-center justify-center">
        <ActivityIndicator size="large" color={LEGACY_COLORS.blueRibbon} />
        <Text className="text-legacy-night-text-muted mt-4 font-dmsans">{t('s113')}</Text>
      </SafeAreaView>
    );
  }

  if (error || !dashboard) {
    return (
      <SafeAreaView className="flex-1 bg-legacy-night-canvas px-5">
        <View className="flex-row items-center justify-between pt-4 pb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={LEGACY_COLORS.blueRibbon} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold font-syne">{t('s7')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-full bg-legacy-blue-ribbon/10 items-center justify-center mb-6">
            <Ionicons name="sparkles" size={36} color={LEGACY_COLORS.blueRibbon} />
          </View>
          <Text className="text-white text-2xl font-bold font-syne text-center mb-2">{t('s324')}</Text>
          <Text className="text-legacy-night-text-muted text-center font-dmsans leading-6 mb-8 max-w-[300px]">
            {error ?? 'Complete a session to generate personal learning insights, strengths, weaknesses, and next steps.'}
          </Text>
          <TouchableOpacity
            className="bg-legacy-blue-ribbon px-6 py-4 rounded-2xl flex-row items-center"
            onPress={() => router.push('/(tabs)/quiz')}
          >
            <Text className="text-white font-bold font-syne mr-2">{t('s383')}</Text>
            <Ionicons name="arrow-forward" size={18} color={LEGACY_COLORS.white} />
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
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-2xl bg-legacy-night-surface border border-legacy-night-border items-center justify-center">
            <Ionicons name="arrow-back" size={20} color={LEGACY_COLORS.blueRibbon} />
          </TouchableOpacity>
          <View className="items-center flex-1 px-3">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-1">{t('s350')}</Text>
            <Text className="text-white text-2xl font-bold font-syne">{t('s7')}</Text>
          </View>
          <TouchableOpacity
            onPress={loadDashboard}
            className="w-10 h-10 rounded-2xl bg-legacy-night-surface border border-legacy-night-border items-center justify-center"
          >
            <Ionicons name="refresh" size={18} color={LEGACY_COLORS.blueRibbon} />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[healthTheme.bg, LEGACY_COLORS.nightCanvas]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-[32px] p-6 mb-6 border"
          style={{ borderColor: healthTheme.border }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <Text className="text-white text-[10px] font-bold uppercase tracking-widest">{t('s191')}</Text>
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
          <View className="flex-1 bg-legacy-night-surface rounded-[24px] p-4 mr-2 border border-legacy-night-border">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-widest mb-2">{t('s301')}</Text>
            <Text className="text-white text-3xl font-bold font-syne mb-1">{dashboard.accuracy_score}%</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: accuracyTone.color }}>{accuracyTone.label}</Text>
          </View>
          <View className="flex-1 bg-legacy-night-surface rounded-[24px] p-4 ml-2 border border-legacy-night-border">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-widest mb-2">{t('s173')}</Text>
            <Text className="text-white text-3xl font-bold font-syne mb-1">{dashboard.confidence_score}%</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: confidenceTone.color }}>{confidenceTone.label}</Text>
          </View>
        </View>

        <View className="flex-row mb-8">
          <View className="flex-1 bg-legacy-night-surface rounded-[24px] p-4 mr-2 border border-legacy-night-border">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-widest mb-2">{t('s368')}</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{dashboard.fluency_level}</Text>
            <Text className="text-white/80 text-xs font-dmsans" style={{ color: fluencyTone.color }}>{fluencyTone.label}</Text>
          </View>
          <View className="flex-1 bg-legacy-night-surface rounded-[24px] p-4 ml-2 border border-legacy-night-border">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-widest mb-2">{t('s269')}</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{formatResponseSpeed(dashboard.average_response_time_ms)}</Text>
            <Text className="text-white/80 text-xs font-dmsans">{t('s367')}</Text>
          </View>
        </View>

        {activePath && activePath.currentNode && (
          <View className="mb-8 bg-legacy-night-surface rounded-[24px] p-5 border border-legacy-blue-ribbon overflow-hidden">
            <View className="absolute right-[-10px] top-[-10px] opacity-10">
              <Ionicons name="git-network" size={100} color={LEGACY_COLORS.blueRibbon} />
            </View>
            <Text className="text-legacy-blue-ribbon text-[10px] uppercase font-bold tracking-widest mb-2">{t('s429')}</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{activePath.path.path_goal}</Text>
            <Text className="text-white/80 font-dmsans leading-6 mb-4">{t('s249')}</Text>
            
            <View className="bg-legacy-night-canvas rounded-2xl p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted text-xs font-bold uppercase tracking-widest mb-2">{t('s399')}</Text>
              <Text className="text-white text-lg font-bold font-syne">{activePath.currentNode.title}</Text>
              <Text className="text-white/80 font-dmsans text-sm mt-1">{activePath.currentNode.description}</Text>
              {activePath.currentNode.prerequisites.length > 0 && (
                <View className="mt-3 flex-row items-center">
                  <Ionicons name="link" size={14} color={LEGACY_COLORS.amberBright} />
                  <Text className="text-legacy-amber-bright font-dmsans text-xs ml-1 font-bold">{t('s51')}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {dashboard.adaptive_learning_path && (
          <View className="mb-8 bg-legacy-night-surface rounded-[24px] p-5 border border-legacy-green500 overflow-hidden">
            <View className="absolute right-[-10px] top-[-10px] opacity-10">
              <Ionicons name="compass" size={100} color={LEGACY_COLORS.green500} />
            </View>
            <Text className="text-legacy-green500 text-[10px] uppercase font-bold tracking-widest mb-2">{t('s372')}</Text>
            <Text className="text-white text-2xl font-bold font-syne mb-1">{t('s243')} {dashboard.adaptive_learning_path.destination.title}</Text>
            <Text className="text-white/80 font-dmsans leading-6 mb-4">{dashboard.adaptive_learning_path.explanation}</Text>
            
            <View className="bg-legacy-night-canvas rounded-2xl p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted text-xs font-bold uppercase tracking-widest mb-2">{t('s415')}</Text>
              {dashboard.adaptive_learning_path.recommended_path.slice(0, 3).map((node, i) => (
                <View key={node.id} className="flex-row items-center mt-2">
                  <View className="w-6 h-6 rounded-full bg-legacy-green500/20 items-center justify-center mr-3">
                    <Text className="text-legacy-green500 text-xs font-bold">{i + 1}</Text>
                  </View>
                  <Text className="text-white font-dmsans flex-1">{node.title}</Text>
                </View>
              ))}
              {dashboard.adaptive_learning_path.recommended_path.length > 3 && (
                <Text className="text-legacy-night-text-muted text-xs mt-3 italic">+ {dashboard.adaptive_learning_path.recommended_path.length - 3} {t('s127')}</Text>
              )}
            </View>
          </View>
        )}

        {nextAction && (
          <View className="mb-8">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s201')}</Text>
            <TouchableOpacity
              onPress={() => handleRecommendationPress({ subject: nextAction.subjectId, topic: nextAction.topicId } as any)}
              className="bg-legacy-indigo950 rounded-[24px] p-5 border border-legacy-indigo800"
              activeOpacity={0.85}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="bg-legacy-indigo600 px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-bold uppercase tracking-widest">{t('s397')}</Text>
                </View>
                <Ionicons name="flash" size={16} color={LEGACY_COLORS.indigo400} />
              </View>
              <Text className="text-legacy-indigo400 text-[10px] uppercase tracking-widest font-bold mb-1">{nextAction.subjectId} • {nextAction.topicId}</Text>
              <Text className="text-white text-2xl font-bold font-syne mb-2">
                {nextAction.type.replace('_', ' ')}
              </Text>
              <Text className="text-white/80 font-dmsans leading-6 mb-3">{nextAction.rationale}</Text>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color={LEGACY_COLORS.indigo400} />
                <Text className="text-legacy-indigo400 text-xs font-dmsans ml-1 mr-3">{t('s32')} {Math.max(10, Math.round(nextAction.estimatedImprovement * 0.5))} {t('s31')}</Text>
                <Ionicons name="trending-up-outline" size={14} color={LEGACY_COLORS.indigo400} />
                <Text className="text-legacy-indigo400 text-xs font-dmsans ml-1">+{Math.round(nextAction.estimatedImprovement)}{t('s331')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {risks.length > 0 && (
          <View className="mb-8">
            <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s396')}</Text>
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
            <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s325')}</Text>
            {dailyTasks.map((task, idx) => (
              <View key={`${task.topicId}-${idx}`} className="bg-legacy-night-surface rounded-[24px] p-4 mb-3 border border-legacy-night-border flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-legacy-night-surface-slate items-center justify-center mr-4">
                  <Text className="text-legacy-night-text-muted font-bold">{idx + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold font-syne text-base">{task.topicId}</Text>
                  <Text className="text-legacy-night-text-muted font-dmsans text-xs capitalize">{task.action}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-bold font-syne">{task.estimatedDurationMins}m</Text>
                  <Text className="text-legacy-night-text-muted text-[10px] uppercase">{t('s393')} {Math.round(task.priorityScore)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="mb-8">
          <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s96')}</Text>
          {trendCards.length > 0 ? trendCards.map((summary) => {
            if (!summary) return null;
            return <TrendCard key={`${summary.window}-${summary.period_start}`} summary={summary} />;
          }) : (
            <View className="bg-legacy-night-surface rounded-[24px] p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted font-dmsans">
                {t('s265')}
              </Text>
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s428')}</Text>
          {dashboard.strengths.length > 0 ? (
            dashboard.strengths.map((item) => (
              <View key={`strength-${item.subject}-${item.topic}`} className="bg-legacy-teal-wash900 rounded-[24px] p-4 mb-3 border border-legacy-green800">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-legacy-green400 text-[10px] uppercase tracking-widest font-bold mb-1">{item.subject}</Text>
                    <Text className="text-white text-lg font-bold font-syne">{item.topic}</Text>
                  </View>
                  <View className="bg-legacy-green500/10 px-3 py-1 rounded-full">
                    <Text className="text-legacy-green500 text-[10px] font-bold uppercase">{item.fluency_level}</Text>
                  </View>
                </View>
                <Text className="text-white/80 font-dmsans leading-6">{item.insight}</Text>
              </View>
            ))
          ) : (
            <View className="bg-legacy-night-surface rounded-[24px] p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted font-dmsans">{t('s104')}</Text>
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s171')}</Text>
          {dashboard.weaknesses.length > 0 ? (
            dashboard.weaknesses.map((item) => (
              <View key={`weakness-${item.subject}-${item.topic}`} className="bg-legacy-rose-wash950 rounded-[24px] p-4 mb-3 border border-legacy-rose-wash900">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <Text className="text-legacy-rose300 text-[10px] uppercase tracking-widest font-bold mb-1">{item.subject}</Text>
                    <Text className="text-white text-lg font-bold font-syne">{item.topic}</Text>
                  </View>
                  <Text className="text-legacy-red400 font-bold font-syne">{item.accuracy_score}%</Text>
                </View>
                <Text className="text-white/85 font-dmsans leading-6 mb-2">{item.insight}</Text>
                <Text className="text-legacy-rose300 text-xs font-dmsans">
                  {t('s301')} {item.accuracy_score}{t('s235')} {item.confidence_score}{t('s252')} {formatResponseSpeed(item.average_response_time_ms)}
                </Text>
              </View>
            ))
          ) : (
            <View className="bg-legacy-night-surface rounded-[24px] p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted font-dmsans">{t('s17')}</Text>
            </View>
          )}
        </View>

        <View className="mb-10">
          <Text className="text-legacy-night-text-muted text-[10px] uppercase tracking-[4px] font-bold mb-3 ml-1">{t('s402')}</Text>
          {dashboard.recommendations.length > 0 ? (
            dashboard.recommendations.map((recommendation) => (
              <TouchableOpacity
                key={recommendation.recommendation_key}
                onPress={() => handleRecommendationPress(recommendation)}
                className="bg-legacy-night-surface rounded-[24px] p-4 mb-3 border border-legacy-night-border"
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-4">
                    <Text className="text-white text-lg font-bold font-syne mb-1">{recommendation.title}</Text>
                    <Text className="text-legacy-night-text-muted text-xs uppercase font-bold tracking-widest">{recommendation.action_label}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={LEGACY_COLORS.blueRibbon} />
                </View>
                <Text className="text-white/85 font-dmsans leading-6">{recommendation.reason}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-legacy-night-surface rounded-[24px] p-4 border border-legacy-night-border">
              <Text className="text-legacy-night-text-muted font-dmsans">{t('s3')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/quiz')}
          className="bg-legacy-blue-ribbon rounded-[24px] p-5 items-center flex-row justify-center mb-10"
        >
          <Text className="text-white font-bold font-syne text-base mr-2">{t('s211')}</Text>
          <Ionicons name="arrow-forward" size={18} color={LEGACY_COLORS.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
