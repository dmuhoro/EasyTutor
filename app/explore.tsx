import React, { useState, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SUBJECTS, Subject } from "../lib/subjects";
import * as Haptics from '../lib/haptics';

export default function ExploreLibrary() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  
  const filteredSubjects = useMemo(() => {
    if (!query.trim()) return SUBJECTS;
    const lower = query.toLowerCase();
    return SUBJECTS.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      s.topics.some(t => t.title.toLowerCase().includes(lower))
    );
  }, [query]);

  const renderSubject = ({ item }: { item: Subject }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync('light');
        router.push({ pathname: '/study', params: { subjectId: item.id } });
      }}
      className="bg-[#161920] rounded-[28px] p-6 mb-4 border border-[#2a2f3d] flex-row items-center"
      activeOpacity={0.7}
    >
      <View className="w-14 h-14 bg-[#0d0f12] rounded-2xl items-center justify-center mr-4 border border-[#2a2f3d]">
        <Text className="text-2xl">{item.icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white text-lg font-bold font-syne mb-1">{item.name}</Text>
        <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-widest">{item.topics.length} Expert Modules</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#4f7cff" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
           <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
           </TouchableOpacity>
           <Text className="text-white text-3xl font-bold font-syne">Library</Text>
        </View>
        <View className="bg-[#4f7cff]/10 px-3 py-1 rounded-full border border-[#4f7cff]/20">
           <Text className="text-[#4f7cff] font-bold font-syne text-xs">{SUBJECTS.length} Catalogued</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center bg-[#161920] rounded-2xl border border-[#2a2f3d] px-4 py-1">
          <Ionicons name="search" size={20} color="#5a5f73" />
          <TextInput
            className="flex-1 text-white py-3 ml-3 font-dmsans text-base"
            placeholder="Search math, physics, engines..."
            placeholderTextColor="#5a5f73"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color="#5a5f73" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Ask AI Tutor: pre-loads the search query (or a free-form learning goal) into the tutor chat */}
      <View className="px-5 mb-6">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync('light');
            const topic = query.trim();
            router.push(topic ? { pathname: '/study', params: { topic } } : '/study');
          }}
          className="bg-[#4f7cff]/10 border border-[#4f7cff]/30 rounded-2xl flex-row items-center justify-center p-4"
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4f7cff" />
          <Text className="text-[#4f7cff] font-bold font-syne ml-2" numberOfLines={1}>
            {query.trim() ? `Ask AI Tutor about "${query.trim()}"` : 'Ask AI Tutor'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id}
        renderItem={renderSubject}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Ionicons name="search-outline" size={64} color="#2a2f3d" />
            <Text className="text-[#8a8fa3] font-syne text-xl mt-4">Module not found</Text>
            <Text className="text-[#5a5f73] font-dmsans mt-2 text-center px-10">Try searching for a broad category or check for typos.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
