import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/utils';
import { Card, CardTitle, CardDescription } from './Card';
import { GlassView } from './GlassView';
import { COLORS } from '../../lib/theme';
import { AIProvider } from '../../lib/ai/reliability';

interface AIFeedbackProps {
  state: 'loading' | 'error' | 'success';
  feature?: 'explanation' | 'quiz' | 'roadmap';
  provider?: AIProvider;
  latencyMs?: number;
  estimatedCostUsd?: number;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

const LOCALIZED_LOADERS = [
  'Consulting with KCSE curriculum experts...',
  'Structuring step-by-step masterclass notes...',
  'Preparing local offline study modules...',
  'Calculating your personalized mastery levels...',
  'Designing challenging syllabus test questions...',
  'Optimizing study sequence under weak network limits...',
];

export function AIFeedback({
  state,
  feature = 'explanation',
  provider,
  latencyMs,
  estimatedCostUsd,
  errorMessage,
  onRetry,
  className,
}: AIFeedbackProps) {
  const [loaderText, setLoaderText] = useState(LOCALIZED_LOADERS[0]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Cycle through localized progress texts during loading state
  useEffect(() => {
    if (state !== 'loading') return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOCALIZED_LOADERS.length;
      setLoaderText(LOCALIZED_LOADERS[index]);
    }, 3500);

    return () => clearInterval(interval);
  }, [state]);

  if (state === 'loading') {
    return (
      <Card elevated variant="highlight" className={cn('p-6 items-center justify-center border-brand-500/20 bg-brand-900/5', className)}>
        <View className="mb-4 bg-brand-500/10 p-4 rounded-full border border-brand-500/30">
          <ActivityIndicator size="large" color={COLORS.brand[500]} />
        </View>
        <CardTitle className="text-xl text-center mb-2 font-syne font-bold text-white">
          Generating explanation...
        </CardTitle>
        <CardDescription className="text-center font-dmsans text-text-secondary max-w-xs leading-5">
          {loaderText}
        </CardDescription>
        
        {/* Subtle running micro-label */}
        <View className="mt-4 bg-surface-elevated px-3 py-1 rounded-full border border-surface-border">
          <Text className="text-[10px] text-text-muted font-bold font-syne uppercase tracking-wider">
            Resilience engine active
          </Text>
        </View>
      </Card>
    );
  }

  if (state === 'error') {
    const isNetworkError = errorMessage?.toLowerCase().includes('network') || errorMessage?.toLowerCase().includes('fetch');
    const displayMessage = isNetworkError 
      ? 'It seems your connection is too slow or offline. We tried switching providers, but everything failed.'
      : errorMessage || 'An error occurred during tutor generation.';

    return (
      <Card elevated variant="error" className={cn('p-6 border-red-500/30 bg-red-950/5', className)}>
        <View className="flex-row items-center mb-4">
          <View className="bg-red-500/15 p-2 rounded-xl border border-red-500/30 mr-3">
            <Ionicons name="cloud-offline" size={24} color={COLORS.error.DEFAULT} />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg font-syne font-bold text-white">
              {isNetworkError ? 'Flaky Internet Connection' : 'AI Service Interrupted'}
            </CardTitle>
            <CardDescription className="text-sm font-dmsans text-text-secondary mt-0.5">
              African network adaptive recovery failed.
            </CardDescription>
          </View>
        </View>

        <Text className="text-sm text-text-primary/95 leading-5 mb-6 font-dmsans">
          {displayMessage}
        </Text>

        <View className="flex-row items-center">
          {onRetry && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onRetry}
              className="bg-brand-500 py-3.5 px-6 rounded-2xl flex-row items-center justify-center mr-3"
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text className="text-white font-bold font-syne text-sm ml-2">Try Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDiagnostics(!showDiagnostics)}
            className="bg-surface-elevated py-3.5 px-4 rounded-2xl border border-surface-border flex-row items-center"
          >
            <Ionicons name="construct-outline" size={16} color={COLORS.text.secondary} />
            <Text className="text-text-secondary font-bold font-syne text-sm ml-2">Diagnostics</Text>
          </TouchableOpacity>
        </View>

        {showDiagnostics && (
          <GlassView className="mt-4 border-surface-border bg-surface-elevated/45 p-4 rounded-xl">
            <Text className="text-xs font-bold text-white font-syne mb-2 uppercase">Diagnostic Logs</Text>
            <View className="space-y-1.5">
              <Text className="text-[11px] font-dmsans text-text-secondary">
                <Text className="font-bold text-text-muted">Feature Context:</Text> {feature}
              </Text>
              <Text className="text-[11px] font-dmsans text-text-secondary">
                <Text className="font-bold text-text-muted">Attempts Made:</Text> Max retries exhausted
              </Text>
              {errorMessage && (
                <Text className="text-[10px] font-mono text-red-400 bg-black/20 p-2 rounded mt-2">
                  {errorMessage}
                </Text>
              )}
            </View>
          </GlassView>
        )}
      </Card>
    );
  }

  // Success State (Used as diagnostic overlay or details card in debug view)
  if (state === 'success' && provider) {
    const isOffline = provider === 'local_ollama' || provider === 'cache' || provider === 'placeholder';
    const providerColors = {
      hosted_claude: { text: '#a78bfa', bg: 'bg-[#a78bfa]/10', border: 'border-[#a78bfa]/20', icon: 'sparkles' },
      hosted_groq: { text: '#fbbf24', bg: 'bg-warning/10', border: 'border-warning/20', icon: 'flash' },
      local_ollama: { text: '#60a5fa', bg: 'bg-primary/10', border: 'border-primary/20', icon: 'phone-portrait' },
      cache: { text: '#34d399', bg: 'bg-success/10', border: 'border-success/20', icon: 'file-tray-full' },
      placeholder: { text: '#94a3b8', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'alert-circle' }
    };
    const style = providerColors[provider];

    return (
      <View className={cn('bg-[#161920]/40 p-4 border border-[#2a2f3d]/60 rounded-2xl flex-row items-center justify-between', className)}>
        <View className="flex-row items-center flex-1 pr-3">
          <View className={cn('p-2 rounded-xl flex-row items-center justify-center mr-3', style.bg, style.border)}>
            <Ionicons name={style.icon as any} size={16} color={style.text} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white font-bold font-syne text-sm capitalize">
                {provider.replace('_', ' ')}
              </Text>
              {isOffline && (
                <View className="bg-success/15 border border-success/30 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-success text-[8px] font-bold font-syne uppercase">Offline OK</Text>
                </View>
              )}
            </View>
            <Text className="text-text-muted text-[10px] font-dmsans mt-0.5">
              {latencyMs ? `${latencyMs}ms latency` : 'Near instant'} • Cost: {estimatedCostUsd !== undefined ? `$${estimatedCostUsd.toFixed(5)}` : '$0.00'}
            </Text>
          </View>
        </View>

        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success.DEFAULT} />
      </View>
    );
  }

  return null;
}
