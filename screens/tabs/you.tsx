import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ProgressTab from './progress';
import ProfileTab from './profile';
import { COLORS } from '../../src/design/tokens';

/**
 * "You" — the merged Progress + Profile tab (sprint 21, L2).
 *
 * Five tabs is the phone limit; Progress and Profile keep their own screens and
 * deep links (`/progress`, `/profile`) and are composed here behind a segment
 * control so nothing is lost in the merge.
 */
export default function YouTab() {
  const [section, setSection] = useState<'progress' | 'profile'>('progress');

  const segments = [
    { key: 'progress' as const, label: 'Progress' },
    { key: 'profile' as const, label: 'Profile' },
  ];

  return (
    <View className="flex-1 bg-surface-bg">
      <View
        className="mx-5 mt-4 mb-2 flex-row rounded-lg border border-surface-border bg-surface-card p-1"
        accessibilityRole="tablist"
      >
        {segments.map((segment) => {
          const selected = section === segment.key;
          return (
            <TouchableOpacity
              key={segment.key}
              onPress={() => setSection(segment.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={segment.label}
              activeOpacity={0.8}
              className={`flex-1 items-center justify-center rounded-md ${
                selected ? 'bg-primary' : 'bg-transparent'
              }`}
              style={{ minHeight: 48 }}
            >
              <Text
                className={`text-sm font-dmsans-semibold ${
                  selected ? 'text-text-inverse' : 'text-text-secondary'
                }`}
                style={{ color: selected ? COLORS.text.inverse : COLORS.text.secondary }}
              >
                {segment.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {section === 'progress' ? <ProgressTab /> : <ProfileTab />}
    </View>
  );
}
