import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React, { ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-legacy-night-canvas">
          <LinearGradient
            colors={[LEGACY_COLORS.nightCanvas, LEGACY_COLORS.nightSurface]}
            className="flex-1 px-8 items-center justify-center"
          >
            <View className="w-24 h-24 bg-legacy-red500/10 rounded-[32px] items-center justify-center mb-10 shadow-2xl shadow-legacy-red500/20">
              <Ionicons name="bug" size={48} color={LEGACY_COLORS.red500} />
            </View>

            <Text className="text-white text-4xl font-bold font-syne text-center mb-4">
              Something went wrong
            </Text>
            
            <Text className="text-legacy-night-text-muted text-lg font-dmsans text-center mb-12 leading-7">
              We encountered an unexpected error. Don't worry, your progress is saved locally.
            </Text>

            <View className="w-full bg-legacy-night-surface p-6 rounded-3xl border border-legacy-night-border mb-12">
               <Text className="text-legacy-red500 font-bold font-syne text-[10px] uppercase tracking-widest mb-2">Technical Info</Text>
               <ScrollView style={{ maxHeight: 100 }}>
                 <Text className="text-legacy-night-text-muted font-mono text-xs">
                   {this.state.error?.message || 'Unknown error'}
                 </Text>
               </ScrollView>
            </View>

            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-legacy-blue-ribbon w-full py-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-legacy-blue-ribbon/30"
            >
              <Ionicons name="refresh" size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold font-syne text-lg uppercase tracking-widest">
                Restart Session
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
