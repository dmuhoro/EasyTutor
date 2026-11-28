import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStudyStore, type ChatMessage } from '../../store/studyStore';
import { useRoadmapStore, portalFromMode } from '../../store/roadmapStore';
import { useSettingsStore } from '../../store/settingsStore';
import { buildCurriculumPrompt } from '../../services/curriculumPrompt';
import { loadMockExam } from '../../services/mockExam';
import { MockExamPanel } from '../../components/exam/MockExamPanel';
import type { MockExam } from '../../src/domain/exam/mockExam';
import { askTutor } from '../../lib/api';
import { retrieveRelevantChunks, buildCitation } from '../../lib/retrieval';
import { citedSources, type CitableSource } from '../../lib/citations';
import { buildSystemPrompt } from '../../services/systemPrompts';
import { useNetInfo } from '@react-native-community/netinfo';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { StageStepper, type StageStep } from '../../components/ui/StageStepper';
import { COLORS } from '../../src/design/tokens';
import { t } from '../../src/locales';

export interface TutorScreenProps {
  className?: StyleProp<ViewStyle>;
}

const STAGES: StageStep[] = [
  { label: t('understand'), status: 'active' },
  { label: t('practice'), status: 'pending' },
  { label: t('quiz'), status: 'pending' },
  { label: t('review'), status: 'pending' },
];

/**
 * Tutor session screen — stage stepper, governed citations, honest
 * "not in your notes" state. Answers are grounded in retrieved private notes;
 * the rail that actually answered is recorded on the message. Token-driven
 * colours, 44px+ touch targets. All user-facing strings via t() locale lookups.
 */
export function TutorScreen({ className }: TutorScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; topic?: string }>();
  const { chatHistory, addMessage } = useStudyStore();
  const { learningMode } = useRoadmapStore();
  const { localeCountry } = useSettingsStore();
  const { isConnected } = useNetInfo();

  const topicId = params.topic || 'default';
  const subject = params.subject || t('mathematics');
  const topic = params.topic || t('algebra');

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [noSources, setNoSources] = useState(false);
  const [mockExam, setMockExam] = useState<MockExam | null>(null);

  useEffect(() => {
    let active = true;
    void loadMockExam(subject, topic, 3)
      .then((loaded) => { if (active) setMockExam(loaded?.exam ?? null); })
      .catch(() => { if (active) setMockExam(null); });
    return () => { active = false; };
  }, [subject, topic]);

  const messages = chatHistory[topicId] || [];
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const message = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setNoSources(false);

    const priorMessages = chatHistory[topicId] || [];
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    addMessage(topicId, userMsg);

    try {
      const contextMessages = [...priorMessages, userMsg].slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const curriculumScope = learningMode === 'high_school'
        ? 'KICD_KCSE'
        : learningMode === 'university' ? 'HEB_UNIV' : 'GLOBAL_OPEN';

      // Governed retrieval: portal + authenticated owner are resolved inside
      // the infrastructure boundary (ADR-006); the subject id scopes notes.
      const chunks = await retrieveRelevantChunks(message, {
        portal_type: portalFromMode(learningMode ?? 'high_school'),
        curriculum_scope: curriculumScope,
        taxonomy_scope: subject,
        mastery_level: 0,
        user_goal: message,
        active_path: [subject],
      }, { maxChunks: 3 });

      const citationSources: CitableSource[] = chunks.flatMap((chunk) => {
        const metadata = chunk.metadata as Record<string, unknown> | undefined;
        const reference = buildCitation(metadata);
        if (!reference) return [];
        return [{
          reference,
          source: String(metadata?.source ?? metadata?.title ?? t('source')),
          chapter: metadata?.chapter_no == null ? undefined : String(metadata.chapter_no),
          page: metadata?.page == null ? undefined : String(metadata.page),
          excerpt: chunk.content,
        }];
      });

      // Fail closed: no retrieved, citable notes means no grounded answer.
      // Never invent a citation, and never answer from the model's memory here.
      if (citationSources.length === 0) {
        setNoSources(true);
        return;
      }

      const ragContext = `\n\nRelevant context from your documents:\n${chunks
        .map((chunk) => `- ${chunk.content} ${buildCitation(chunk.metadata as Record<string, unknown> | undefined)}`)
        .join('\n')}`;
      const systemPrompt = buildSystemPrompt({
        mode: learningMode,
        subject,
        topic,
        isSocratic: false,
        curriculumText: buildCurriculumPrompt(localeCountry, subject),
      }) + ragContext
        + '\nCITE YOUR SOURCES: When you use the document context above, support claims with the source in brackets, e.g. [Bird Ch15 p.171].';

      const response = await askTutor(systemPrompt, contextMessages);

      if (response.success && response.data) {
        addMessage(topicId, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data,
          timestamp: Date.now(),
          source: response.provider,
          // Only exact markers that were actually rendered earn a citation.
          citations: citedSources(response.data, citationSources),
        });
      } else {
        addMessage(topicId, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.error || t('troubleConnecting'),
          timestamp: Date.now(),
          source: response.provider,
        });
      }
    } catch (err) {
      addMessage(topicId, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: t('checkConnectionTryAgain'),
        timestamp: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      {!isConnected && (
        <View className="absolute top-0 left-0 right-0 bg-warning/10 border-b border-warning/30 px-5 py-2 flex-row items-center gap-2 z-20">
          <Ionicons name="cloud-offline" size={14} color={COLORS.warning.light} />
          <Text className="text-warning-light font-dmsans text-xs font-medium">
            {t('offlineMessages')}
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
            {/* The root stack hides native headers; keep the Stitch tutor
                session's back affordance reachable on touch devices. */}
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-surface-border bg-surface-elevated"
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <Ionicons name="school-outline" size={20} color={COLORS.text.secondary} />
            <Text className="text-text-primary font-bold font-syne text-lg">
              {subject}
            </Text>
            <Badge variant="neutral" size="sm">{topic}</Badge>
          </View>

          <StageStepper steps={STAGES} />

          {mockExam && <MockExamPanel exam={mockExam} />}

          {noSources && (
            <EmptyState
              icon="book"
              title={t('notInNotesYet')}
              message={t('notInNotesMessage', { topic })}
              actionLabel={t('importNotes')}
              onAction={() => router.push('/library')}
            />
          )}

          {messages.length === 0 && !noSources && (
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
              source={msg.source}
              citations={msg.citations}
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
              placeholder={t('askQuestion')}
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
