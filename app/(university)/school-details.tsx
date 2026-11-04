import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CANONICAL_CURRICULUM } from '../../src/knowledge/taxonomies/curriculum';
import { PortalHeader } from '../../components/PortalHeader';
import { BlurView } from 'expo-blur';

export default function SchoolDetailsScreen() {
  const { schoolId, title } = useLocalSearchParams();
  const router = useRouter();

  const school = CANONICAL_CURRICULUM.UNIVERSITY.schools.find(s => s.id === schoolId);

  if (!school) {
    return (
      <View className="flex-1 bg-[#0d0f12] items-center justify-center">
        <Text className="text-white">School not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <PortalHeader />
      <ScrollView className="flex-1 px-6 pt-6">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <Ionicons name="arrow-back" size={20} color="#a855f7" />
          <Text className="text-[#a855f7] font-bold font-syne ml-2 uppercase text-xs">Back to Faculties</Text>
        </TouchableOpacity>

        <View className="mb-10">
          <Text className="text-white text-3xl font-bold font-syne mb-2">{title}</Text>
          <Text className="text-[#8a8fa3] font-dmsans">Select a department to view degree programs.</Text>
        </View>

        {school.departments.map((dept) => (
          <View key={dept.id} className="mb-8">
            <Text className="text-[#a855f7] font-bold font-syne text-xs uppercase tracking-widest mb-4">{dept.title}</Text>
            
            {dept.programs.map((prog) => (
              <BlurView key={prog.id} intensity={10} tint="dark" className="rounded-[32px] border border-white/5 overflow-hidden mb-4">
                <View className="p-6">
                  <Text className="text-white font-bold font-syne text-xl mb-4">{prog.title}</Text>
                  
                  {prog.courses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      onPress={() => router.push({
                        pathname: '/(university)/[course]/roadmap',
                        params: { course: course.id, topic: course.title }
                      })}
                      className="bg-white/5 p-4 rounded-2xl flex-row items-center justify-between mb-2"
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="w-8 h-8 rounded-lg bg-[#a855f7]/20 items-center justify-center mr-3">
                          <Ionicons name="book" size={14} color="#a855f7" />
                        </View>
                        <Text className="text-[#e2e8f0] font-dmsans font-bold flex-1">{course.title}</Text>
                      </View>
                      <Ionicons name="play-circle" size={24} color="#a855f7" />
                    </TouchableOpacity>
                  ))}
                </View>
              </BlurView>
            ))}
          </View>
        ))}
        
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
