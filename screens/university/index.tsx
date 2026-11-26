import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SubjectGrid, SubjectData } from "../../components/SubjectGrid";
import { useRoadmapStore } from "../../store/roadmapStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import { CANONICAL_CURRICULUM } from "../../src/knowledge/taxonomies/curriculum";
import { PortalHeader } from "../../components/PortalHeader";

export default function UniversityFaculties() {
  const router = useRouter();
  const { setSubjectId, roadmaps, fetchSavedRoadmaps } = useRoadmapStore();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchools = async () => {
    try {
      // Use Canonical Curriculum for University Realism
      const data = CANONICAL_CURRICULUM.UNIVERSITY.schools.map(s => ({
        id: s.id,
        name: s.title,
        icon: '🎓',
        description: `${s.departments.length} Departments`
      }));
      setSchools(data);
    } catch (error) {
      console.error('[SAFE_ERROR] [SCHOOLS] fetching university schools failed', error);
      setSchools([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchSavedRoadmaps();
  }, []);

  const handleSchoolPress = (school: any) => {
    router.push({
      pathname: '/university/school-details',
      params: { schoolId: school.id, title: school.name }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      <PortalHeader />
      <ScrollView 
        className="flex-1 px-5 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSchools(); }} tintColor={LEGACY_COLORS.purple500Bright} />
        }
      >
        <View className="mb-10">
          <Text className="text-legacy-purple500-bright font-bold font-syne text-sm uppercase tracking-widest mb-2">{t('mq')}</Text>
          <Text className="text-white text-4xl font-bold font-syne mb-4">{t('no')}</Text>
          <Text className="text-legacy-night-text-muted text-lg font-dmsans leading-7">
            {t('df')}
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={LEGACY_COLORS.purple500Bright} />
          </View>
        ) : (
          <View>
             <Text className="text-white text-2xl font-bold font-syne mb-6">{t('eb')}</Text>
             <SubjectGrid subjects={schools} onPress={handleSchoolPress} />
          </View>
        )}

        {/* Saved Courses Section */}
        {roadmaps.filter(r => r.learningMode === 'university').length > 0 && (
          <View className="mt-12 mb-20">
            <Text className="text-white text-2xl font-bold font-syne mb-6">{t('ke')}</Text>
            {roadmaps.filter(r => r.learningMode === 'university').slice(0, 5).map((roadmap) => (
              <TouchableOpacity
                key={roadmap.id}
                onPress={() => router.push({ 
                  pathname: '/university/[course]/roadmap',
                  params: { course: roadmap.subjectId || roadmap.topic, topic: roadmap.topic } 
                })}
                className="bg-legacy-night-surface p-6 rounded-[28px] border border-legacy-night-border mb-4 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-4">
                   <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={1}>{roadmap.topic}</Text>
                   <Text className="text-legacy-night-text-muted text-xs font-dmsans">{t('jz')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={LEGACY_COLORS.purple500Bright} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
