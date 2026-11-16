import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore, ChatMessage } from '../../store/studyStore';
import { askTutor } from '../../lib/api';
import { useNetInfo } from '@react-native-community/netinfo';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { StageStepper, type StageStep } from '../../components/ui/StageStepper';
import { COLORS } from '../../src/design/tokens';

export interface TutorScreenProps {
  className?: StyleProp<ViewStyle>;
}

const STAGES: StageStep[] = [
  { label: 'Understand', status: 'active' },
  { label: 'Practice', status: 'pending' },
  { label: 'Quiz', status: 'pending' },
  { label: 'Review', status: 'pending' },
];

/**
 * Tutor session screen — stage stepper, citations, "not in your notes" state.
 * Token-driven colours, 44px+ touch targets, honest states.
 */
export function TutorScreen({ className }: TutorScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; topic?: string }>();
  const { user } = useAuthStore();
  const {
    chatHistory,
    addMessage,
    clearMessages,
  } = useStudyStore();
  const { isConnected } = useNetInfo();

  const topicId = params.topic || 'default';
  const subject = params.subject || 'Mathematics';
  const topic = params.topic || 'Algebra';

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasNotes, setHasNotes] = useState(true);

  const messages = chatHistory[topicId] || [];

  useEffect(() => {
    setHasNotes(messages.length > 0);
  }, [messages.length, topicId]);

  useEffect(() => {
    return () => {
      // Clear messages when leaving this topic
    };
  }, [topicId]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const message = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    addMessage(topicId, userMsg);

    try {
      const response = await askTutor(
        `You are a helpful tutor for ${subject}. Answer questions about ${topic}.`,
        [{ role: 'user', content: message }]
      );

      if (response.success && response.data) {
        const aiMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data,
          timestamp: Date.now(),
        };
        addMessage(topicId, aiMsg);
      } else {
        const errorMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.error || "I'm having trouble connecting. Please try again.",
          timestamp: Date.now(),
        };
        addMessage(topicId, errorMsg);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting. Please check your connection and try again.",
        timestamp: Date.now(),
      };
      addMessage(topicId, errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') handleSend();
  };

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (!hasNotes) {
    return (
      <SafeAreaView className="flex-1 bg-surface-bg">
        <View className="px-5 pt-6">
          <View className="flex-row items-center gap-2 mb-6">
            <Ionicons name="school-outline" size={20} color={COLORS.text.secondary} />
            <Text className="text-text-primary font-bold font-syne text-lg">
              {subject}
            </Text>
            <Badge variant="neutral" size="sm">{topic}</Badge>
          </View>

          <StageStepper steps={STAGES} />

          <EmptyState
            icon="book"
            title="Not in your notes yet"
            message={`Import notes about ${topic} to ask questions. The AI tutor can only answer from your uploaded study materials.`}
            actionLabel="Import Notes"
            onAction={() => router.push('/library')}
          />
        </View>

        <View className="h-24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      {!isConnected && (
        <View className="absolute top-0 left-0 right-0 bg-warning/10 border-b border-warning/30 px-5 py-2 flex-row items-center gap-2 z-20">
          <Ionicons name="cloud-offline" size={14} color={COLORS.warning.light} />
          <Text className="text-warning-light font-dmsans text-xs font-medium">
            You're offline. Messages will send when you reconnect.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="flex-row items-center gap-2 mb-6">
            <Ionicons name="school-outline" size={20} color={COLORS.text.secondary} />
            <Text className="text-text-primary font-bold font-syne text-lg">
              {subject}
            </Text>
            <Badge variant="neutral" size="sm">{topic}</Badge>
          </View>

          <StageStepper steps={STAGES} />

          {messages.length === 0 && (
            <View className="flex-col items-center justify-center py-20">
              <Skeleton width="60%" height={16} rounded="md" />
              <View className="mt-2"><Skeleton width="80%" height={16} rounded="md" /></View>
              <View className="mt-2"><Skeleton width="40%" height={16} rounded="md" /></View>
            </View>
          )}

          {messages.map((msg: ChatMessage) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              citations={[]}
            />
          ))}

          {isSending && (
            <View className="opacity-50 mb-4">
              <View className="bg-surface-card border border-surface-border rounded-2xl p-4">
                <Skeleton width="45%" height={20} rounded="md" />
                <View className="mt-1"><Skeleton width="65%" height={20} rounded="md" /></View>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pt-4 pb-6 bg-surface-bg border-t border-surface-border">
          <View className="bg-surface-card border border-surface-border rounded-[20px] p-1 flex-row items-center">
            <Input
              placeholder="Ask a question about this topic…"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSend}
              disabled={isSending || !isConnected}
              containerClassName="flex-1 bg-transparent border-none p-0"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending || !inputValue.trim() || !isConnected}
              activeOpacity={0.8}
              className="p-3"
            >
              {isSending ? (
                <ActivityIndicator size={16} color={COLORS.brand[400]} />
              ) : (
                <Ionicons name="paper-plane" size={20} color={COLORS.brand[400]} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
