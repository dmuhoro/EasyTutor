import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function UniversityLayout() {
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
        tabBarActiveTintColor: '#a855f7', // Purple theme for University
        tabBarInactiveTintColor: '#5a5f73',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Faculties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="[course]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
