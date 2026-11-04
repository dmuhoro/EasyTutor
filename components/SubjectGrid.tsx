import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './ui/text';
import { Card } from './ui/Card';
import { cn } from '@/lib/utils';

export interface SubjectData {
  id: string;
  name: string;
  icon: string | null;
  description?: string;
  level: string;
}

interface SubjectGridProps {
  subjects: SubjectData[];
  onPress: (subject: SubjectData) => void;
  containerStyle?: ViewStyle;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ subjects, onPress, containerStyle }) => {
  const safeSubjects = subjects || [];
  
  if (safeSubjects.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20" style={containerStyle}>
        <Ionicons name="library-outline" size={64} color="#2a2f3d" />
        <Text className="text-text-secondary font-syne text-xl mt-4">No subjects available</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap justify-between" style={containerStyle}>
      {safeSubjects.map((subject) => (
        <Card
          key={subject.id}
          onPress={() => onPress(subject)}
          className="w-[48%] mb-5 p-5 border-surface-border/40"
        >
          <View className="w-12 h-12 bg-surface-elevated rounded-2xl items-center justify-center mb-4 border border-surface-border">
            <Text className="text-2xl">{subject.icon || '📚'}</Text>
          </View>
          
          <Text className="text-white text-lg font-bold font-syne mb-1" numberOfLines={2}>
            {subject.name}
          </Text>
          
          {subject.description && (
            <Text className="text-text-muted text-[10px] font-dmsans uppercase tracking-widest mb-4" numberOfLines={1}>
              {subject.description}
            </Text>
          )}

          <View className="flex-row items-center mt-auto">
            <Text className="text-brand-500 font-bold text-xs font-syne">Explore</Text>
            <Ionicons name="arrow-forward" size={14} color="#4f7cff" style={{ marginLeft: 4 }} />
          </View>
        </Card>
      ))}
    </View>
  );
};
