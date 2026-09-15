import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SubjectGrid, SubjectData } from "../../components/SubjectGrid";
import { Ionicons } from "@expo/vector-icons";
import { useRoadmapStore } from "../../store/roadmapStore";
import { getLocalSubjects, getRecommendedTopic, getWeakTopics } from "../../data/knowledgeStore";
import { useAuthStore } from "../../store/authStore";
import { useProgressStore } from "../../store/progressStore";
import { SyncIndicator } from "../../components/SyncIndicator";
import { PortalHeader } from "../../components/PortalHeader";
import { Section } from "@/components/ui/Section";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Text } from "@/components/ui/text";

export default function HighSchoolSyllabus() {
  const router = useRouter();
  const { setSubjectId, setTopicId, roadmaps, fetchSavedRoadmaps } = useRoadmapStore();
  const { user } = useAuthStore();
  const { studyStreak } = useProgressStore();
  
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [recommendation, setRecommendation] = useState<{ subjectId: string; topicId: string; reason: string } | null>(null);
  const [weakTopicIds, setWeakTopicIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      setError(null);
      const [localSubjects, rec, weak] = await Promise.all([
        getLocalSubjects(),
        getRecommendedTopic(),
        getWeakTopics()
      ]);
      
      const mappedSubjects: SubjectData[] = localSubjects.map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        level: 'high_school',
        description: `${s.topics.length} Topics`
      }));

      setSubjects(mappedSubjects);
      setRecommendation(rec);
      setWeakTopicIds(weak);
    } catch (error) {
      console.error('[SAFE_ERROR] [SUBJECTS] fetching HS subjects failed', error);
      setError('Could not load subjects. Please try again.');
      setSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchSavedRoadmaps();
  }, []);

  const savedRoadmaps = roadmaps.filter(r => r.learningMode === 'high_school');

  const handleSubjectPress = (subject: SubjectData) => {
    setSubjectId(subject.id);
    router.push({
      pathname: '/(high_school)/[subject]/topics',
      params: { subject: subject.id, name: subject.name }
    });
  };

  const handleRecommendationPress = () => {
    if (!recommendation) return;
    setSubjectId(recommendation.subjectId);
    setTopicId(recommendation.topicId);
    
    router.push({
      pathname: '/(high_school)/[subject]/roadmap',
      params: { subject: recommendation.subjectId, topic: recommendation.topicId }
    });
  };

  const formatTopicName = (id: string) => {
    return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      <PortalHeader />
      <ScrollView 
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubjects(); }} tintColor="#4f7cff" />
        }
      >
        <Section className="mb-8">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-brand-500 font-bold font-syne text-xs uppercase tracking-widest mb-1">My Learning Portal</Text>
              <Text className="text-white text-4xl font-bold font-syne mb-3">KCSE Syllabus</Text>
              <Text className="text-text-secondary text-lg font-dmsans leading-6">
                Explore the KICD curriculum. Choose a subject to begin.
              </Text>
            </View>
            <SyncIndicator />
          </View>
        </Section>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#4f7cff" />
          </View>
        ) : error ? (
          <View className="items-center justify-center py-20 px-10">
            <Card variant="error" className="items-center w-full">
              <Ionicons name="alert-circle" size={40} color="#ef4444" />
              <CardTitle className="mt-4">Subjects unavailable</CardTitle>
              <CardDescription className="text-center mt-2">{error}</CardDescription>
              <TouchableOpacity onPress={fetchSubjects} className="bg-brand-500 px-8 py-3 rounded-xl mt-6">
                <Text className="text-white font-bold font-syne">Retry</Text>
              </TouchableOpacity>
            </Card>
          </View>
        ) : (
          <>
            {recommendation && (
              <Section title="Next Best Action">
                <Card variant="highlight" onPress={handleRecommendationPress} className="flex-row items-center">
                  <View className="w-14 h-14 bg-brand-500 rounded-2xl items-center justify-center mr-4 shadow-lg shadow-brand-500/40">
                    <Ionicons name="flash" size={28} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-brand-400 font-bold font-syne text-[10px] uppercase tracking-widest mb-1">
                      {recommendation.reason}
                    </Text>
                    <Text className="text-white text-xl font-bold font-syne" numberOfLines={1}>
                      {formatTopicName(recommendation.topicId)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={24} color="#4f7cff" />
                </Card>
              </Section>
            )}

            {weakTopicIds.length > 0 && (
              <Section 
                title="Priority Focus" 
                description="Reviewing these will boost your mastery score"
                headerAction={
                  <View className="bg-error/10 px-3 py-1 rounded-full border border-error/20">
                    <Text className="text-error font-bold font-syne text-[10px] uppercase">Review Needed</Text>
                  </View>
                }
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                  {weakTopicIds.map((topicId) => (
                    <Card key={topicId} className="mr-4 w-64 p-4">
                      <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 bg-error/10 rounded-lg items-center justify-center mr-3">
                          <Ionicons name="trending-down" size={16} color="#ef4444" />
                        </View>
                        <Text className="text-white text-base font-bold font-syne flex-1" numberOfLines={1}>
                          {formatTopicName(topicId)}
                        </Text>
                      </View>
                      <Text className="text-text-muted text-xs font-dmsans">
                        Targeted review recommended.
                      </Text>
                    </Card>
                  ))}
                </ScrollView>
              </Section>
            )}

            {savedRoadmaps.length > 0 && (
              <Section title="Active Missions">
                {savedRoadmaps.slice(0, 3).map((roadmap) => (
                  <Card 
                    key={roadmap.id} 
                    onPress={() => router.push({ 
                      pathname: '/(high_school)/[subject]/roadmap', 
                      params: { subject: roadmap.subjectId || roadmap.topic, topic: roadmap.topic } 
                    })}
                    className="mb-4 flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-4">
                      <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={1}>{roadmap.topic}</Text>
                      <Text className="text-text-secondary text-xs font-dmsans uppercase">Resume Syllabus Guide</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
                  </Card>
                ))}
              </Section>
            )}

            <Section title="Explore Subjects">
              <SubjectGrid subjects={subjects} onPress={handleSubjectPress} />
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
