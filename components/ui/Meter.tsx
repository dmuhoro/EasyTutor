import React from 'react';
import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';

/**
 * Lightweight progress meter (View-only). Use this on eagerly-loaded screens;
 * the animated SVG `ProgressRing`/`LinearProgress` stay in lazy route chunks.
 */
export function Meter({
  progress,
  color = COLORS.brand[500],
  trackClassName = 'bg-white/5',
  className,
}: {
  progress: number;
  color?: string;
  trackClassName?: string;
  className?: string;
}) {
  const safe = Math.min(Math.max(progress, 0), 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
      className={cn('h-1.5 w-full overflow-hidden rounded-full', trackClassName, className)}
    >
      <View className="h-full rounded-full" style={{ width: `${safe}%`, backgroundColor: color }} />
    </View>
  );
}
