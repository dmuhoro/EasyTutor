import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TopicList, TopicData } from "../../../components/TopicList";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoadmapStore } from "../../../store/roadmapStore";
import * as Haptics from '../../../lib/haptics';
import { getLocalTopics, getAllProgress } from "../../../data/knowledgeStore";
import { SyncIndicator } from "../../../components/SyncIndicator";
import { Text } from "@/components/ui/text";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

export default function SubjectTopics() {
  const router = useRouter();
  const { subject, name } = useLocalSearchParams();
  const { setTopicId } = useRoadmapStore();
  
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = async () => {
    if (!subject || typeof subject !== 'string') {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const [localTopics, allProgress] = await Promise.all([
        getLocalTopics(subject),
        getAllProgress()
      ]);
      
      const mappedTopics: TopicData[] = localTopics.map((t, index) => {
        const progress = allProgress[t.id];
        return {
          id: t.id,
          subject_id: subject,
          title: t.name,
          sort_order: index,
          form_level: 'KCSE Syllabus',
          mastery: progress ? (progress.score || (progress.mastered ? 100 : 0)) : 0,
          lastSeen: progress?.lastSeen
        };
      });

      setTopics(mappedTopics);
    } catch (error) {
      console.error('[SAFE_ERROR] [TOPICS] fetching HS topics failed', error);
      setError('Could not load topics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [subject]);

  const handleTopicPress = (topic: TopicData) => {
    Haptics.impactAsync('light');
    setTopicId(topic.id);
    router.push({
      pathname: '/(high_school)/[subject]/roadmap',
      params: { subject, topic: topic.title, topicId: topic.id }
    });
  };

  const nextBestTopic = topics.find(t => (t.mastery || 0) < 80 && (t.mastery || 0) > 0) || topics.find(t => (t.mastery || 0) === 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      <View className="px-5 py-6 border-b border-surface-border flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 bg-surface-elevated rounded-full items-center justify-center border border-surface-border">
            <Ionicons name="arrow-back" size={20} color="#4f7cff" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold font-syne" numberOfLines={1}>{name || 'Topics'}</Text>
            <Text className="text-text-secondary text-[10px] font-syne uppercase tracking-widest mt-0.5">Syllabus Guide</Text>
          </View>
        </View>
        <SyncIndicator />
      </View>

      <ScrollView 
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTopics(); }} tintColor="#4f7cff" />
        }
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#4f7cff" />
          </View>
        ) : error ? (
          <View className="items-center justify-center py-20">
             <Card variant="error" className="items-center w-full">
              <Ionicons name="alert-circle" size={40} color="#ef4444" />
              <Text className="text-white font-bold font-syne text-lg mt-4">Failed to load topics</Text>
              <TouchableOpacity onPress={fetchTopics} className="bg-brand-500 px-8 py-3 rounded-xl mt-6">
                <Text className="text-white font-bold font-syne">Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : topics.length === 0 ? (
          <View className="items-center justify-center py-20">
             <Ionicons name="documents-outline" size={64} color="#2a2f3d" />
             <Text className="text-white font-bold font-syne text-lg mt-4">No topics found</Text>
             <Text className="text-text-secondary text-center mt-2 font-dmsans">Syllabus content is being updated.</Text>
          </View>
        ) : (
          <>
            {nextBestTopic && (
               <Section title="Continue Learning">
                 <Card variant="highlight" onPress={() => handleTopicPress(nextBestTopic)} className="flex-row items-center">
                    <View className="w-12 h-12 bg-brand-500 rounded-xl items-center justify-center mr-4">
                      <Ionicons name="play" size={24} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-brand-400 font-bold font-syne text-[10px] uppercase tracking-widest mb-0.5">Recommended Next</Text>
                      <Text className="text-white text-lg font-bold font-syne" numberOfLines={1}>{nextBestTopic.title}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
                 </Card>
               </Section>
            )}

            <Section title="All Topics">
              <TopicList topics={topics} onPress={handleTopicPress} />
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
