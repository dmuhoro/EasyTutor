import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from './ui/text';
import { Card } from './ui/Card';
import { cn } from '@/lib/utils';
import { LinearProgress } from './ui/ProgressRing';

export interface TopicData {
  id: string;
  subject_id?: string;
  title: string;
  form_level?: string;
  sort_order?: number;
  mastery?: number; // 0-100
  lastSeen?: string;
}

interface TopicListProps {
  topics: TopicData[];
  onPress: (topic: TopicData) => void;
  containerStyle?: ViewStyle;
}

export const TopicList: React.FC<TopicListProps> = ({ topics, onPress, containerStyle }) => {
  const safeTopics = topics || [];
  
  if (safeTopics.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20" style={containerStyle}>
        <Ionicons name="document-text-outline" size={64} color="#2a2f3d" />
        <Text className="text-text-secondary font-syne text-xl mt-4">No topics available</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {safeTopics.map((topic, index) => {
        const isMastered = (topic.mastery || 0) >= 80;
        const hasStarted = (topic.mastery || 0) > 0;

        return (
          <Card
            key={topic.id}
            onPress={() => onPress(topic)}
            className="mb-4 overflow-hidden border-surface-border/40"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 mr-4">
                {topic.form_level && (
                  <Text className="text-brand-400 font-bold font-syne text-[10px] uppercase tracking-widest mb-1">
                    {topic.form_level}
                  </Text>
                )}
                <Text className="text-white text-lg font-bold font-syne" numberOfLines={1}>
                  {topic.title}
                </Text>
              </View>
              
              <View className={cn(
                "w-10 h-10 rounded-full items-center justify-center border",
                isMastered ? "bg-success/10 border-success/20" : "bg-surface-elevated border-surface-border"
              )}>
                <Ionicons 
                  name={isMastered ? "checkmark-circle" : "chevron-forward"} 
                  size={20} 
                  color={isMastered ? "#22c55e" : "#4f7cff"} 
                />
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text-muted text-xs font-dmsans">
                {isMastered ? 'Mastery achieved' : hasStarted ? 'Keep going' : 'Not started'}
              </Text>
              <Text className="text-white text-xs font-bold font-syne">
                {Math.round(topic.mastery || 0)}%
              </Text>
            </View>
            
            <LinearProgress 
              progress={topic.mastery || 0} 
              height={6} 
              backgroundColor="#1c2029"
            />

            {topic.lastSeen && (
              <Text className="text-text-muted text-[10px] font-dmsans mt-3 italic">
                Last activity: {new Date(topic.lastSeen).toLocaleDateString()}
              </Text>
            )}
          </Card>
        );
      })}
    </View>
  );
};
