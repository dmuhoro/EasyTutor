import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TrendWindowSummary } from '../../lib/trendEngine';

const formatResponseSpeed = (milliseconds: number): string => {
  if (milliseconds <= 0) return '0.0s';
  const seconds = milliseconds / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const formatTrendChange = (value: number): string => {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return '0%';
};

const trendWindowTone = (summary?: TrendWindowSummary | null): { border: string; accent: string } => {
  if (!summary) return { border: '#2a2f3d', accent: '#4f7cff' };
  if (summary.stagnation_detected) return { border: '#7c5c15', accent: '#f59e0b' };
  const concern = summary.most_concerning_metric;
  if (summary.metrics[concern].delta_value < 0) return { border: '#5f1f2b', accent: '#ef4444' };
  return { border: '#1f5f3a', accent: '#22c55e' };
};

const trendMetricLabel = (metricKey?: string | null): string => {
  switch (metricKey) {
    case 'confidence_score': return 'Confidence';
    case 'accuracy_score': return 'Accuracy';
    case 'fluency_score': return 'Fluency';
    case 'response_speed_score': return 'Response speed';
    default: return 'Learning progress';
  }
};

export const TrendCard = ({ summary }: { summary: TrendWindowSummary }) => {
  const tone = trendWindowTone(summary);
  const bestMetric = trendMetricLabel(summary.best_performing_metric);
  const improvedMetric = trendMetricLabel(summary.most_improved_metric);
  const concernMetric = trendMetricLabel(summary.most_concerning_metric);

  return (
    <View
      className="rounded-[24px] p-4 mb-3 border"
      style={{ backgroundColor: '#161920', borderColor: tone.border }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Text className="text-white text-[10px] font-bold uppercase tracking-widest">{summary.label}</Text>
        </View>
        <Ionicons name="trending-up" size={16} color={tone.accent} />
      </View>
      <Text className="text-white text-lg font-bold font-syne mb-2">{summary.trend_summary}</Text>
      <Text className="text-white/80 font-dmsans leading-6 mb-3">{summary.reinforcement_message}</Text>
      <View className="flex-row flex-wrap">
        <View className="bg-white/5 rounded-full px-3 py-2 mr-2 mb-2">
          <Text className="text-white text-[10px] uppercase tracking-widest font-bold">
            Best {bestMetric}
          </Text>
        </View>
        <View className="bg-white/5 rounded-full px-3 py-2 mr-2 mb-2">
          <Text className="text-white text-[10px] uppercase tracking-widest font-bold">
            {improvedMetric} {formatTrendChange(summary.metrics[summary.most_improved_metric].delta_value)}
          </Text>
        </View>
        <View className="bg-white/5 rounded-full px-3 py-2 mr-2 mb-2">
          <Text className="text-white text-[10px] uppercase tracking-widest font-bold">
            Watch {concernMetric} {formatTrendChange(summary.metrics[summary.most_concerning_metric].delta_value)}
          </Text>
        </View>
        <View className="bg-white/5 rounded-full px-3 py-2 mb-2">
          <Text className="text-white text-[10px] uppercase tracking-widest font-bold">
            {summary.session_completion_count} sessions
          </Text>
        </View>
      </View>
      <Text className="text-[#8a8fa3] text-xs font-dmsans mt-1">
        Avg speed {formatResponseSpeed(summary.average_response_time_ms)} · {summary.stagnation_detected ? `Streak ${summary.stagnation_streak_days} days` : 'Momentum building'}
      </Text>
    </View>
  );
};
