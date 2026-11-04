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
      pathname: '/(university)/school-details',
      params: { schoolId: school.id, title: school.name }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <PortalHeader />
      <ScrollView 
        className="flex-1 px-5 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSchools(); }} tintColor="#a855f7" />
        }
      >
        <View className="mb-10">
          <Text className="text-[#a855f7] font-bold font-syne text-sm uppercase tracking-widest mb-2">Academic Excellence</Text>
          <Text className="text-white text-4xl font-bold font-syne mb-4">University Master</Text>
          <Text className="text-[#8a8fa3] text-lg font-dmsans leading-7">
            Navigate through Schools and Departments to access degree-level academic rigour.
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        ) : (
          <View>
             <Text className="text-white text-2xl font-bold font-syne mb-6">Select Your School</Text>
             <SubjectGrid subjects={schools} onPress={handleSchoolPress} />
          </View>
        )}

        {/* Saved Courses Section */}
        {roadmaps.filter(r => r.learningMode === 'university').length > 0 && (
          <View className="mt-12 mb-20">
            <Text className="text-white text-2xl font-bold font-syne mb-6">Your Saved Courses</Text>
            {roadmaps.filter(r => r.learningMode === 'university').slice(0, 5).map((roadmap) => (
              <TouchableOpacity
                key={roadmap.id}
                onPress={() => router.push({ 
                  pathname: '/(university)/[course]/roadmap', 
                  params: { course: roadmap.subjectId || roadmap.topic, topic: roadmap.topic } 
                })}
                className="bg-[#161920] p-6 rounded-[28px] border border-[#2a2f3d] mb-4 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-4">
                   <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={1}>{roadmap.topic}</Text>
                   <Text className="text-[#8a8fa3] text-xs font-dmsans">Degree Level Roadmap</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#a855f7" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
