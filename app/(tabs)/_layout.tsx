import type { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettingsStore } from '../../store/settingsStore';
import { SyncIndicator } from '../../components/SyncIndicator';
import { View, Text } from 'react-native';
import { isSupabaseAvailable } from '../../lib/supabase';
import { useWindowDimensions } from 'react-native';
import { COLORS, COLORS_DARK, LAYOUT } from '../../src/design/tokens';

export default function TabLayout() {
  const { theme } = useSettingsStore();
  const { width } = useWindowDimensions();
  const isWide = width >= LAYOUT.breakpointWide;
  const isDesktop = width >= LAYOUT.breakpointDesktop;

  // Chrome follows the explicit dark selection; screens themselves are
  // light-first until their dark variants land (sprint 21, L3).
  const isDark = theme === 'dark';
  const chrome = isDark ? COLORS_DARK : COLORS;
  const backgroundColor = chrome.surface.bg;
  const unselectedColor = chrome.text.muted;
  const tintColor = chrome.primary.DEFAULT;
  const borderColor = chrome.surface.border;

  const offlineMode = !isSupabaseAvailable();

  // Centre the learning surface in the space left by the rail. Below the
  // desktop breakpoint a fixed gutter is enough; above it the content is
  // capped at the design-system max width so text stays readable on 1280+.
  // `screenLayout` wraps each scene (header included) but not the rail, so
  // the absolute-positioned tab bar keeps its own geometry.
  const sideGutter = isDesktop
    ? Math.max(LAYOUT.gutter, (width - LAYOUT.railWidth - LAYOUT.contentMaxWidth) / 2)
    : LAYOUT.gutter;
  const screenLayout = isWide
    ? ({ children }: { children: ReactNode }) => (
        <View
          style={{
            flex: 1,
            backgroundColor,
            paddingLeft: LAYOUT.railWidth + sideGutter,
            paddingRight: sideGutter,
          }}
        >
          {children}
        </View>
      )
    : undefined;

  const tabBarStyle = isWide
    ? {
        backgroundColor,
        borderRightColor: borderColor,
        borderRightWidth: 1,
        paddingBottom: 0,
        paddingTop: 0,
        width: LAYOUT.railWidth,
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
      }
    : {
        backgroundColor,
        borderTopColor: borderColor,
        // 72px leaves room for a 28px icon + 12px label + item padding.
        // 60px squashed the label box to 9px and clipped it at the viewport edge.
        height: 72,
        paddingBottom: 8,
        paddingTop: 6,
      };

  return (
    <>
    {offlineMode && (
      <View className="bg-warning/20 px-4 py-2 flex-row justify-center items-center">
        <Ionicons name="warning" size={16} color={chrome.warning.DEFAULT} />
        <Text className="text-warning font-dmsans text-sm ml-2 font-bold">Using Offline Mode</Text>
      </View>
    )}
    <Tabs
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: backgroundColor,
          borderBottomColor: borderColor,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: chrome.text.primary,
          fontFamily: 'syne',
          fontWeight: 'bold',
        },
        headerRight: () => (
          <View style={{ marginRight: 20 }}>
            <SyncIndicator />
          </View>
        ),
        tabBarStyle,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: unselectedColor,
        // Pin the label metrics so flex layout cannot compress them.
        tabBarLabelStyle: { fontSize: 11, lineHeight: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          // Home draws its own "Today" header (Stitch `today/`); keeping the
          // native header would stack two titles on the same screen.
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Learn',
          tabBarLabel: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Practice',
          tabBarLabel: 'Practice',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="reader" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarLabel: 'You',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Merged into "You" (sprint 21, L2). Kept as hidden routes so existing
          deep links (/progress, /profile) still resolve to their screens. */}
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="roadmap" options={{ href: null }} />
    </Tabs>
    </>
  );
}
