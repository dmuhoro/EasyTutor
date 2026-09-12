import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackUI?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackUI) {
        return this.props.fallbackUI;
      }
      return (
        <View className="flex-1 justify-center items-center bg-[#0d0f12] p-5">
          <Text className="text-white text-xl font-bold mb-4 font-syne text-center">
            Something went wrong.
          </Text>
          <Text className="text-[#8a8fa3] text-sm mb-6 font-dmsans text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            className="bg-[#3b82f6] px-6 py-3 rounded-full"
            onPress={this.handleRetry}
          >
            <Text className="text-white font-bold font-syne">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
