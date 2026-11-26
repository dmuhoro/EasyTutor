import { t } from '../../src/locales';
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../src/design/tokens';

export default function HighSchoolLayout() {
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
          title: t('s53'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      {/* Nested subject routes have no `_layout` of their own, so Expo Router
          hoists them to this navigator. Declare each real child explicitly:
          `name="[subject]"` is a phantom entry that never matches a route. */}
      <Tabs.Screen name="[subject]/topics" options={{ href: null }} />
      <Tabs.Screen name="[subject]/roadmap" options={{ href: null }} />
      <Tabs.Screen name="[subject]/quiz" options={{ href: null }} />
    </Tabs>
  );
}
