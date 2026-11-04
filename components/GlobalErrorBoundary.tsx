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
        <SafeAreaView className="flex-1 bg-[#0d0f12]">
          <LinearGradient
            colors={['#0d0f12', '#161920']}
            className="flex-1 px-8 items-center justify-center"
          >
            <View className="w-24 h-24 bg-[#ef4444]/10 rounded-[32px] items-center justify-center mb-10 shadow-2xl shadow-[#ef4444]/20">
              <Ionicons name="bug" size={48} color="#ef4444" />
            </View>

            <Text className="text-white text-4xl font-bold font-syne text-center mb-4">
              Something went wrong
            </Text>
            
            <Text className="text-[#8a8fa3] text-lg font-dmsans text-center mb-12 leading-7">
              We encountered an unexpected error. Don't worry, your progress is saved locally.
            </Text>

            <View className="w-full bg-[#161920] p-6 rounded-3xl border border-[#2a2f3d] mb-12">
               <Text className="text-[#ef4444] font-bold font-syne text-[10px] uppercase tracking-widest mb-2">Technical Info</Text>
               <ScrollView style={{ maxHeight: 100 }}>
                 <Text className="text-[#8a8fa3] font-mono text-xs">
                   {this.state.error?.message || 'Unknown error'}
                 </Text>
               </ScrollView>
            </View>

            <TouchableOpacity
              onPress={this.handleReset}
              className="bg-[#4f7cff] w-full py-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-[#4f7cff]/30"
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
