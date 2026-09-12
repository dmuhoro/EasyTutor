import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <View className="flex-1 justify-center items-center bg-[#0d0f12] p-5">
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text className="text-[#8a8fa3] mt-4 font-dmsans text-sm">{message}</Text>
    </View>
  );
};
