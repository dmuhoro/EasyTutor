import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text } from 'react-native';

export default function HighSchoolLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0f12',
          borderTopColor: '#2a2f3d',
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#4f7cff',
        tabBarInactiveTintColor: '#5a5f73',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Syllabus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="[subject]"
        options={{
          href: null, // Hidden from tab bar, accessed via navigation
        }}
      />
    </Tabs>
  );
}
