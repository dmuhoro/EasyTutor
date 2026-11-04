import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { useRoadmapStore, LearningMode } from '../../store/roadmapStore';
import { useAuthStore } from '../../store/authStore';
import { updateLearningMode } from '../../lib/profileOps';
import { track } from '../../lib/analytics';
import { GlassView } from './GlassView';
import { COLORS } from '../../lib/theme';

export function PortalSwitcher() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { learningMode, setLearningMode } = useRoadmapStore();

  const portals: { id: LearningMode; name: string; icon: ComponentProps<typeof Ionicons>['name']; description: string }[] = [
    { 
      id: 'high_school', 
      name: 'High School', 
      icon: 'school-outline', 
      description: 'KCSE focused curriculum and revision.' 
    },
    { 
      id: 'university', 
      name: 'University', 
      icon: 'book-outline', 
      description: 'Advanced academic topics and research.' 
    },
    { 
      id: 'self_directed', 
      name: 'Self-Directed', 
      icon: 'rocket-outline', 
      description: 'General skills and independent study.' 
    },
  ];

  const handleSwitch = async (mode: LearningMode) => {
    if (mode === learningMode) return;
    if (!user) return;

    try {
      const { success } = await updateLearningMode(user.id, mode);
      
      if (success) {
        setLearningMode(mode);
        track('portal_selected', {
          user_id: user.id,
          learning_mode: mode,
          selected_mode: mode,
          source: 'portal_switcher',
        });
        // Redirect to the new portal
        if (mode === 'high_school') router.replace('/(high_school)');
        else if (mode === 'university') router.replace('/(university)');
        else if (mode === 'self_directed') router.replace('/(self_directed)');
      } else {
        Alert.alert('Error', 'Failed to switch portal. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  return (
    <View className="w-full mt-6">
      <Text className="text-white font-syne font-bold text-lg mb-4 ml-1">Switch Portal</Text>
      {portals.map((portal) => {
        const isActive = learningMode === portal.id;
        
        return (
          <TouchableOpacity
            key={portal.id}
            onPress={() => handleSwitch(portal.id)}
            activeOpacity={0.7}
            className="mb-4"
          >
            <GlassView 
              borderColor={isActive ? COLORS.brand[500] : COLORS.surface.border}
              className={isActive ? 'bg-brand-500/5' : ''}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${isActive ? 'bg-brand-500' : 'bg-surface-elevated'}`}>
                  <Ionicons 
                    name={portal.icon} 
                    size={24} 
                    color={isActive ? '#ffffff' : '#8a8fa3'} 
                  />
                </View>
                
                <View className="flex-1 ml-4">
                  <Text className={`font-syne font-bold text-base ${isActive ? 'text-white' : 'text-text-muted'}`}>
                    {portal.name}
                  </Text>
                  <Text className="text-text-muted text-xs font-dmsans mt-0.5">
                    {portal.description}
                  </Text>
                </View>

                {isActive && (
                  <View className="bg-brand-500/20 px-3 py-1.5 rounded-full">
                    <Text className="text-brand-500 font-bold font-syne text-[10px] uppercase">Active</Text>
                  </View>
                )}
              </View>
            </GlassView>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
