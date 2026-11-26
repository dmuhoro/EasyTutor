import { t } from '../../src/locales';
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../src/design/tokens';

export default function UniversityLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface.bg,
          borderTopColor: COLORS.surface.border,
          height: 72,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary.DEFAULT,
        tabBarInactiveTintColor: COLORS.text.muted,
        tabBarLabelStyle: { fontSize: 11, lineHeight: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('if'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      {/* See app/high-school/_layout.tsx: nested routes are hoisted here and
          must each be declared, or they leak into the tab bar. */}
      <Tabs.Screen name="school-details" options={{ href: null }} />
      <Tabs.Screen name="[course]/roadmap" options={{ href: null }} />
      <Tabs.Screen name="[course]/quiz" options={{ href: null }} />
    </Tabs>
  );
}
