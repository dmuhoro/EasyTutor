import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Card, CardTitle, CardDescription } from './ui/Card';
import { GlassView } from './ui/GlassView';

export interface LessonSection {
  title: string;
  content: string;
  type?: 'text' | 'code' | 'example' | 'remediation';
}

export interface CanonicalLessonRendererProps {
  title: string;
  sections: LessonSection[];
  loading?: boolean;
  onComplete?: () => void;
  accentColor?: string;
}

export const CanonicalLessonRenderer: React.FC<CanonicalLessonRendererProps> = ({
  title,
  sections,
  loading,
  onComplete,
  accentColor = '#4f7cff'
}) => {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={accentColor} />
        <Text className="text-[#8a8fa3] mt-4 text-center font-dmsans">
          Assembling your personalized lesson...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4">
      <Text className="text-white text-3xl font-bold font-syne mb-6 mt-4">
        {title}
      </Text>

      {sections.map((section, index) => (
        <View key={index} className="mb-8">
          {section.type === 'remediation' ? (
            <GlassView borderColor="#f59e0b" className="p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text className="text-[#f59e0b] font-bold font-syne ml-2 text-lg">
                  {section.title}
                </Text>
              </View>
              <Markdown style={markdownStyles}>
                {section.content}
              </Markdown>
            </GlassView>
          ) : (
            <View>
              {section.title && (
                <Text className="text-[#4f7cff] font-bold font-syne mb-2 text-xl">
                  {section.title}
                </Text>
              )}
              <Markdown style={markdownStyles}>
                {section.content}
              </Markdown>
            </View>
          )}
        </View>
      ))}

      {onComplete && (
        <TouchableOpacity 
          onPress={onComplete}
          className="py-5 rounded-3xl flex-row items-center justify-center mb-12 shadow-lg"
          style={{ backgroundColor: accentColor, shadowColor: accentColor, shadowOpacity: 0.3 }}
        >
          <Text className="text-white font-bold text-xl font-syne mr-2">
            Mark as Completed
          </Text>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const markdownStyles = {
  body: {
    color: '#e2e8f0',
    fontFamily: 'dm-sans',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: '#ffffff',
    fontFamily: 'syne',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  code_inline: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    padding: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
};
