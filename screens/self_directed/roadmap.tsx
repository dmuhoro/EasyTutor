import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoadmapView } from "../../components/RoadmapView";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore, portalFromMode } from "../../store/roadmapStore";
import { generateStudyRoadmap } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { logError } from "../../lib/logEvent";
import { FeedbackModal } from "../../components/FeedbackModal";
import * as Haptics from '../../lib/haptics';
import { stableHashId } from "../../lib/stableId";

export default function SelfDirectedRoadmap() {
  const router = useRouter();
  const { topic } = useLocalSearchParams();
  const { roadmaps, addRoadmap, checkedTasks, toggleTask, saveRoadmap, userId, learningMode } = useRoadmapStore();
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const statusMessages = ["Analyzing your goal...", "Building learning path...", "Structuring roadmap..."];
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statusMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (userId) {
        trackEvent('time_spent', {
          user_id: userId,
          learning_mode: learningMode,
          screen: 'roadmap',
          duration,
          topic
        });
      }
    };
  }, []);

  // Check if we already have a roadmap for this topic
  const existingRoadmap = roadmaps.find(r => r.topic === topic);

  const performGeneration = async () => {
    if (!topic || typeof topic !== 'string') return;
    
    setLoading(true);
    setError(null);
    const generationStartedAt = Date.now();
    try {
      const res = await generateStudyRoadmap(topic);
      if (res.data) {
        if (res.provider === 'local_ollama') {
          setNote('Generated on this device via Ollama — no cloud needed.');
        } else if (res.provider === 'cache') {
          setNote('Loaded from the offline cache.');
        } else if (res.provider === 'placeholder') {
          setNote('Ollama was unreachable, so this is a general starter plan. Start Ollama for a personalized roadmap.');
        } else {
          setNote(null);
        }
        const newRoadmap = {
          id: stableHashId(topic),
          topic: topic,
          title: res.data.title,
          days: res.data.days,
          createdAt: new Date().toISOString(),
          learningMode: 'self_directed' as const
        };
        addRoadmap(newRoadmap);
        // Auto-save on generation — never leave an unhandled rejection.
        // Free-form topics save to the cloud as learning-goal identities; if
        // the save fails the roadmap stays on this device (no silent drop).
        saveRoadmap(newRoadmap, 'self_directed').catch((err) => {
          logError('ROADMAP_cloud_save_failed', err);
          setError(t('s151'));
        });
        if (userId) {
          trackEvent('roadmap_generated', {
            user_id: userId,
            learning_mode: learningMode,
            topic,
            title: res.data.title,
            duration_ms: Date.now() - generationStartedAt,
            source: 'self_directed_roadmap',
          });
        }

        // Celebratory feedback only for a real (non-placeholder) generation —
        // an offline starter plan is honest, but it is not "built".
        if (res.success) {
          Haptics.notificationAsync('success');
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
          setTimeout(() => setShowFeedback(true), 4000);
        }
      } else {
        setError(res.error || "Failed to generate roadmap.");
      }
    } catch (err: any) {
      console.error('Generation Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!existingRoadmap && topic) {
      performGeneration();
    }
  }, [topic]);

  const handleSave = async () => {
    if (!existingRoadmap) return;
    setSaving(true);
    try {
      await saveRoadmap(existingRoadmap, 'self_directed');
      Haptics.notificationAsync('success');
      Alert.alert(t('s359'), t('s360'));
    } catch (err) {
      logError('ROADMAP_manual_save_failed', err);
      Alert.alert(
        t('s280'),
        t('s445')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (day: number, task: string) => {
    if (!existingRoadmap) return;
    Haptics.impactAsync('light');
    toggleTask(existingRoadmap.id, day, task);
  };

  const handleTeachTask = (task: string) => {
    Haptics.impactAsync('medium');
    router.push({
      pathname: '/self-directed/quiz',
      params: { 
        topic: task,
        context: `This is part of my roadmap for: ${topic}` 
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <View className="px-5 py-6 border-b border-legacy-night-border flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
             <Ionicons name="arrow-back" size={24} color={LEGACY_COLORS.green500} />
          </TouchableOpacity>
          <View className="flex-1">
             <Text className="text-legacy-green500 font-bold font-syne text-[10px] uppercase tracking-widest mb-1">{t('s56')}</Text>
             <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>{topic || 'Goal'}</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/self-directed/quiz', params: { topic } })}
            className="bg-legacy-green500/10 px-4 py-2 rounded-xl border border-legacy-green500/20"
          >
            <Text className="text-legacy-green500 font-bold font-syne text-xs">{t('s274')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-5 pt-8">
        {loading ? (
          <View className="flex-1 px-2">
            <View className="items-center justify-center mb-12 mt-10">
              <View className="w-20 h-20 bg-legacy-green500/10 rounded-full items-center justify-center mb-6">
                 <ActivityIndicator size="large" color={LEGACY_COLORS.green500} />
              </View>
              <Text className="text-white text-2xl font-bold font-syne text-center mb-2">
                {statusMessages[statusIndex]}
              </Text>
              <Text className="text-legacy-night-text-muted text-center font-dmsans">
                {t('s275')}{topic}"
              </Text>
            </View>

            {/* Skeleton blocks */}
            {[1, 2, 3].map(i => (
              <View key={i} className="bg-legacy-night-surface rounded-[28px] p-6 mb-4 border border-legacy-night-border opacity-50">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-legacy-night-border rounded-xl mr-3" />
                  <View className="h-6 bg-legacy-night-border rounded-lg w-1/2" />
                </View>
                <View className="h-4 bg-legacy-night-border rounded w-full mb-3" />
                <View className="h-4 bg-legacy-night-border rounded w-3/4" />
              </View>
            ))}
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-10">
            <View className="w-20 h-20 bg-legacy-red500/10 rounded-full items-center justify-center mb-6">
               <Ionicons name="alert-circle" size={40} color={LEGACY_COLORS.red500} />
            </View>
            <Text className="text-white text-xl font-bold font-syne text-center mb-2">{t('s205')}</Text>
            <Text className="text-legacy-night-text-muted text-center font-dmsans mb-8">
              {t('s338')}
            </Text>
            <TouchableOpacity 
              onPress={() => performGeneration()}
              className="bg-legacy-green500 px-8 py-4 rounded-2xl shadow-lg shadow-legacy-green500/20"
            >
              <Text className="text-white font-bold font-syne">{t('s413')}</Text>
            </TouchableOpacity>
          </View>
        ) : existingRoadmap ? (
          <>
            {note && (
              <View className="bg-legacy-night-surface border border-legacy-night-border/60 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-legacy-night-text-muted text-sm font-dmsans">
                  {note}
                </Text>
              </View>
            )}
            <RoadmapView 
              roadmap={existingRoadmap} 
              checkedTasks={checkedTasks[existingRoadmap.id] || {}} 
              onToggleTask={handleToggle}
              onTeachTask={handleTeachTask}
            />
            {showCelebration && (
              <View className="absolute inset-0 items-center justify-center pointer-events-none">
                 <View className="bg-legacy-green500/90 p-6 rounded-[32px] items-center shadow-2xl">
                    <Ionicons name="sparkles" size={48} color="white" />
                    <Text className="text-white font-bold font-syne text-xl mt-2">{t('s86')}</Text>
                 </View>
              </View>
            )}
          </>
        ) : null}
      </View>
      <FeedbackModal
        isVisible={showFeedback}
        onClose={() => setShowFeedback(false)}
        source="roadmap_generation"
        topic={typeof topic === 'string' ? topic : undefined}
        contentType="roadmap"
        portalType={portalFromMode(learningMode || 'self_directed')}
      />
    </SafeAreaView>
  );
}
