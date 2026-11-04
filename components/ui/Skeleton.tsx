import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const RADIUS_CLASS: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Dependency-free shimmer block. Uses the RN Animated driver on native and a
 * static block on web (no JSAnimation warning, no extra bundle).
 */
export function Skeleton({ width = '100%', height = 16, rounded = 'md', className }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, opacity: Platform.OS === 'web' ? 0.7 : opacity }}
      className={cn('bg-surface-elevated', RADIUS_CLASS[rounded], className)}
    />
  );
}
