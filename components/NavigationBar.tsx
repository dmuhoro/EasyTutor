import React from 'react';
import {
  View, Text, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: <Ionicons name="home" size={24} />, route: '/' },
  { label: 'Learn', icon: <Ionicons name="book" size={24} />, route: '/study' },
  { label: 'Practice', icon: <Ionicons name="flash" size={24} />, route: '/quiz' },
  { label: 'Library', icon: <Ionicons name="reader" size={24} />, route: '/roadmap' },
  { label: 'Progress', icon: <Ionicons name="trending-up" size={24} />, route: '/progress' },
  { label: 'Profile', icon: <Ionicons name="person" size={24} />, route: '/profile' },
];

export function NavigationBar() {
  const router = useRouter();
  const activeRoute = usePathname() || '/';
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const isActive = (route: string) => {
    if (route === '/') return activeRoute === '/' || activeRoute === '/index';
    return activeRoute === route || activeRoute.startsWith(route + '/');
  };

  const navItem = (item: NavItem) => {
    const active = isActive(item.route);
    return (
      <TouchableOpacity
        key={item.label}
        onPress={() => router.push(item.route)}
        activeOpacity={0.7}
        accessibilityRole="button"
        aria-label={`Navigate to ${item.label}`}
        aria-current={active ? 'page' : undefined}
        className={`
          flex-1 p-3 rounded-2xl border flex-col items-center justify-center gap-1
          ${active
            ? 'bg-[#4f7cff]/20 border-[#4f7cff]/40'
            : 'bg-[#161920] border-[#2a2f3d]'}
        `}
      >
        <View className={`w-8 h-8 rounded-lg flex-row items-center justify-center mb-1 ${active ? 'bg-[#4f7cff]/20' : 'bg-transparent'}`}>
          {item.icon}
        </View>
        <Text
          className={`text-[10px] font-bold font-syne uppercase tracking-wider leading-tight ${
            active ? 'text-[#4f7cff]' : 'text-[#8a8fa3]'
          }`}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Wide screen: side rail (vertical)
  if (isWide) {
    return (
      <View className="w-24 bg-[#0d0f12] border-r border-[#2a2f3d] flex-col items-center pt-4 pb-4 gap-2">
        {NAV_ITEMS.map(navItem)}
      </View>
    );
  }

  // Narrow screen: bottom tab bar (horizontal)
  return (
    <View className="border-t border-[#2a2f3d] bg-[#0d0f12] p-3 flex-row justify-around items-center pb-2 gap-1">
      {NAV_ITEMS.map(navItem)}
    </View>
  );
}
