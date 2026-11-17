import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { cn } from '../lib/utils';
import { COLORS } from '../src/design/tokens';

export type NavItem = {
  label: string;
  icon: string;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: 'home', route: '/' },
  { label: 'Learn', icon: 'book', route: '/study' },
  { label: 'Practice', icon: 'flash', route: '/quiz' },
  { label: 'Library', icon: 'reader', route: '/roadmap' },
  { label: 'Progress', icon: 'trending-up', route: '/progress' },
  { label: 'Profile', icon: 'person', route: '/profile' },
];

export interface BottomNavProps {
  className?: StyleProp<ViewStyle>;
}

/**
 * Bottom tab bar for phones (< 768px). 44px+ touch targets, ARIA labels,
 * active state from current pathname.
 */
export function BottomNav({ className }: BottomNavProps) {
  const router = useRouter();
  const activeRoute = usePathname() || '/';

  const isActive = (route: string) => {
    if (route === '/') return activeRoute === '/' || activeRoute === '/index';
    return activeRoute === route || activeRoute.startsWith(route + '/');
  };

  return (
    <View
      className={cn(
        'border-t border-surface-border bg-surface-card p-3 flex-row justify-around items-center pb-2 gap-1',
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.route);
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route)}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label={`Navigate to ${item.label}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex-1 p-2 rounded-xl border flex-col items-center justify-center gap-0.5',
              active
                ? 'bg-brand-500/20 border-brand-500/40'
                : 'bg-transparent border-transparent',
            )}
          >
            <View
              className={cn(
                'w-7 h-7 rounded-lg flex-row items-center justify-center mb-0.5',
                active ? 'bg-brand-500/20' : 'bg-transparent',
              )}
            >
              <Ionicons
                name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={active ? COLORS.brand[400] : COLORS.text.muted}
              />
            </View>
            <Text
              className={cn(
                'text-[10px] font-dmsans font-bold uppercase tracking-tight leading-tight number-lines-1',
                active ? 'text-brand-400' : 'text-text-muted',
              )}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Side rail for wide screens (>= 768px). Vertical navigation on the left.
 */
export interface SideRailProps {
  className?: StyleProp<ViewStyle>;
}

export function SideRail({ className }: SideRailProps) {
  const router = useRouter();
  const activeRoute = usePathname() || '/';

  const isActive = (route: string) => {
    if (route === '/') return activeRoute === '/' || activeRoute === '/index';
    return activeRoute === route || activeRoute.startsWith(route + '/');
  };

  return (
    <View
      className={cn(
        'w-24 bg-surface-card border-r border-surface-border flex-col items-center pt-4 pb-4 gap-1',
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.route);
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route)}
            activeOpacity={0.7}
            accessibilityRole="button"
            aria-label={`Navigate to ${item.label}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'w-full p-3 rounded-xl border flex-col items-center justify-center mb-1',
              active
                ? 'bg-brand-500/20 border-brand-500/40'
                : 'bg-transparent border-transparent',
            )}
          >
            <View
              className={cn(
                'w-7 h-7 rounded-lg flex-row items-center justify-center mb-1',
                active ? 'bg-brand-500/20' : 'bg-transparent',
              )}
            >
              <Ionicons
                name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={active ? COLORS.brand[400] : COLORS.text.muted}
              />
            </View>
            <Text
              className={cn(
                'text-[10px] font-dmsans font-bold uppercase tracking-tight leading-tight number-lines-1',
                active ? 'text-brand-400' : 'text-text-muted',
              )}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Responsive navigation: BottomNav on phones, SideRail on wide screens.
 * Use this instead of rendering BottomNav or SideRail directly.
 */
export function NavigationBar() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  if (isWide) {
    return <SideRail />;
  }
  return <BottomNav />;
}
