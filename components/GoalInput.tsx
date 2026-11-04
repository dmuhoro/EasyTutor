import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface GoalInputProps {
  onStart: (goal: string) => void;
  isLoading?: boolean;
  containerStyle?: ViewStyle;
}

export const GoalInput: React.FC<GoalInputProps> = ({ onStart, isLoading, containerStyle }) => {
  const [goal, setGoal] = useState('');

  const handlePress = () => {
    if (goal.trim().length > 3) {
      onStart(goal.trim());
    }
  };

  return (
    <View style={containerStyle} className="w-full">
      <View className="bg-[#161920] rounded-[32px] p-8 border border-[#2a2f3d] shadow-2xl relative overflow-hidden">
        {/* Glow Element */}
        <View className="absolute -top-10 -left-10 w-40 h-40 bg-[#22c55e]/5 rounded-full" />
        
        <Text className="text-[#22c55e] font-bold font-syne text-xs uppercase tracking-widest mb-4">Define Your Mission</Text>
        <Text className="text-white text-3xl font-bold font-syne mb-6 leading-10">What are you mastering next?</Text>
        
        <View className="bg-[#0d0f12] rounded-2xl border border-[#2a2f3d] p-5 mb-8">
          <TextInput
            className="text-white text-xl font-dmsans min-h-[120px]"
            placeholder="e.g. Building a React Native app from scratch..."
            placeholderTextColor="#3a3f53"
            multiline
            value={goal}
            onChangeText={setGoal}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handlePress}
          disabled={goal.trim().length <= 3 || isLoading}
          className={`py-5 rounded-2xl flex-row items-center justify-center ${goal.trim().length > 3 && !isLoading ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/30' : 'bg-[#2a2f3d] opacity-50'}`}
        >
          <Text className="text-white font-bold font-syne text-lg mr-2 uppercase tracking-widest">Architect Path</Text>
          <Ionicons name="sparkles" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
