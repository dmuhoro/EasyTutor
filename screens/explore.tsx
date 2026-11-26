import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React, { useState, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
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
      className="bg-legacy-night-surface rounded-[28px] p-6 mb-4 border border-legacy-night-border flex-row items-center"
      activeOpacity={0.7}
    >
      <View className="w-14 h-14 bg-legacy-night-canvas rounded-2xl items-center justify-center mr-4 border border-legacy-night-border">
        <Text className="text-2xl">{item.icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white text-lg font-bold font-syne mb-1">{item.name}</Text>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans uppercase tracking-widest">{item.topics.length} Expert Modules</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={LEGACY_COLORS.blueRibbon} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-legacy-night-canvas" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
           <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
           </TouchableOpacity>
           <Text className="text-white text-3xl font-bold font-syne">Library</Text>
        </View>
        <View className="bg-legacy-blue-ribbon/10 px-3 py-1 rounded-full border border-legacy-blue-ribbon/20">
           <Text className="text-legacy-blue-ribbon font-bold font-syne text-xs">{SUBJECTS.length} Catalogued</Text>
        </View>
      </View>

      <View className="px-5 mb-3">
        <TouchableOpacity onPress={() => router.push('/math-journey')} className="bg-legacy-blue-ribbon/15 border border-legacy-blue-ribbon/30 rounded-2xl p-4">
          <Text className="text-legacy-blue-ribbon font-bold font-syne">Mathematics journey →</Text>
          <Text className="text-legacy-night-text-muted text-xs mt-1">Diagnostic, practice, mastery and review</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center bg-legacy-night-surface rounded-2xl border border-legacy-night-border px-4 py-1">
          <Ionicons name="search" size={20} color={LEGACY_COLORS.nightTextSecondary} />
          <TextInput
            className="flex-1 text-white py-3 ml-3 font-dmsans text-base"
            placeholder="Search math, physics, engines..."
            placeholderTextColor={LEGACY_COLORS.nightTextSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={LEGACY_COLORS.nightTextSecondary} />
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
          className="bg-legacy-blue-ribbon/10 border border-legacy-blue-ribbon/30 rounded-2xl flex-row items-center justify-center p-4"
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={LEGACY_COLORS.blueRibbon} />
          <Text className="text-legacy-blue-ribbon font-bold font-syne ml-2" numberOfLines={1}>
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
            <Ionicons name="search-outline" size={64} color={LEGACY_COLORS.nightBorder} />
            <Text className="text-legacy-night-text-muted font-syne text-xl mt-4">Module not found</Text>
            <Text className="text-legacy-night-text-secondary font-dmsans mt-2 text-center px-10">Try searching for a broad category or check for typos.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
