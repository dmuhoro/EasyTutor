import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Keyboard, Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { SUBJECTS } from "../../lib/subjects";
import { useStudyStore, ChatMessage, type ChatCitation } from "../../store/studyStore";
import { citedSources, type CitableSource } from "../../lib/citations";
import { askTutor } from "../../lib/api";
import { buildSystemPrompt } from "../../services/systemPrompts";
import { useProgressStore } from "../../store/progressStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useNetInfo } from "@react-native-community/netinfo";
import { saveResponse, getCachedResponse, getCachedTopicsForSubject } from "../../lib/cache";
import { retrieveRelevantChunks, buildCitation, getAvailableChapters, type ChapterRef } from "../../lib/retrieval";
import { portalFromMode } from "../../store/roadmapStore";
import * as Haptics from '../../lib/haptics';
import Markdown from 'react-native-markdown-display';
import { VoiceState } from "../../lib/voice";
import { startListening } from "../../lib/stt";
import { handleVoiceQuery } from "../../lib/voiceTutor";
import { Sheet } from "../../components/Sheet";
import { COLORS } from "../../src/design/tokens";
import { t } from "../../src/locales";
import { answerSourceLabelKey } from "../../lib/ai/providerLabels";

const markdownStyles = {
  body: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
  },
  strong: {
    color: COLORS.text.primary,
    fontWeight: '700' as const,
    fontFamily: 'DMSans_700Bold',
  },
  link: {
    color: COLORS.primary.DEFAULT,
  },
  bullet_list: {
    marginVertical: 10,
  },
  list_item: {
    marginVertical: 5,
  },
  code_inline: {
    backgroundColor: COLORS.surface.elevated,
    color: COLORS.text.primary,
    padding: 4,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
};

type Mode = 'Explain' | 'Teach & Quiz' | 'Quiz Me' | 'Summary';
const MODES: Mode[] = ['Explain', 'Teach & Quiz', 'Quiz Me', 'Summary'];

export default function StudyTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectId?: string; topic?: string }>();
  
  const { 
    selectedSubjectId, 
    selectedTopic, 
    chatHistory, 
    setSelectedSubject, 
    setSelectedTopic, 
    addMessage, 
    clearMessages,
    pendingAIRequests,
    enqueueAIRequest,
    dequeueAIRequest,
    clearPendingAIRequests,
  } = useStudyStore();

  const { learningMode } = useRoadmapStore();

  const currentSubject = SUBJECTS.find(s => s.id === selectedSubjectId) || SUBJECTS[0];

  // Find the actual Topic object from the selectedTopic name/state
  const currentTopicObj = currentSubject.topics.find(t => t.title === selectedTopic);

  // A topic that matches no curriculum entry is a free-form learning goal
  // (pre-loaded via ?topic=). Surfaces the goal as the header, not a fake subject.
  const isFreeFormTopic = !!selectedTopic && !currentTopicObj;
  const headerTitle = isFreeFormTopic ? selectedTopic : currentSubject.name;

  const { markTopicDone } = useProgressStore();
  const { isConnected } = useNetInfo();
  const { lowDataMode, localeCountry, localeExamples } = useSettingsStore();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('Explain');
  const [loading, setLoading] = useState(false);
  const [ragActive, setRagActive] = useState(false);
  const [offlineCachedTopics, setOfflineCachedTopics] = useState<string[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [chapters, setChapters] = useState<ChapterRef[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterRef | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      fadeAnim.setValue(0.3);
    }
  }, [loading]);

  useEffect(() => {
    if (params.topic) {
      // A free-form learning goal (e.g. "Ask AI Tutor" from a search/learning goal)
      // pre-loads as the active topic. handleSelectTopic accepts a string for this.
      if (!selectedTopic || selectedTopic !== params.topic) {
        handleSelectTopic(params.topic);
      }
    } else if (params.subjectId) {
      setSelectedSubject(params.subjectId);
      const subject = SUBJECTS.find(s => s.id === params.subjectId);
      if (subject && subject.topics.length > 0) {
        if (!selectedTopic || !subject.topics.find(t => t.title === selectedTopic)) {
           handleSelectTopic(subject.topics[0]);
        }
      }
    } else if (!selectedSubjectId) {
      setSelectedSubject(SUBJECTS[0].id);
      handleSelectTopic(SUBJECTS[0].topics[0]);
    }
  }, [params.subjectId, params.topic]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const scope = currentSubject ? currentSubject.id : null;
      try {
        const found = await getAvailableChapters(scope);
        if (mounted) setChapters(found);
      } catch (err) {
        // Governance can refuse an unauthenticated/unresolved portal. Fail
        // closed to an empty chapter picker without an unhandled rejection.
        if (__DEV__) console.warn('[CHAPTERS] Governed chapter read refused:', err);
        if (mounted) setChapters([]);
      } finally {
        if (mounted) setSelectedChapter(null);
      }
    })();
    return () => { mounted = false; };
  }, [selectedSubjectId]);

  useEffect(() => {
    if (isConnected === false && currentSubject) {
      getCachedTopicsForSubject(currentSubject.id).then(setOfflineCachedTopics);
    }
  }, [isConnected, currentSubject?.id]);

  // Process pending AI requests when the connection is restored.
  useEffect(() => {
    if (!isConnected || pendingAIRequests.length === 0) return;

    const processQueue = async () => {
      const requests = [...pendingAIRequests];
      for (const req of requests) {
        try {
          const contextMessages = [...req.messages].slice(-8).map(m => ({
            role: m.role,
            content: m.content
          }));
          const res = await askTutor(req.systemPrompt, contextMessages);

          if (res.success && res.data) {
            await saveResponse(req.subjectId, req.topicId, 'Explain', res.data);
            addMessage(req.topicId, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: res.data,
              timestamp: Date.now(),
              source: res.provider,
            });
            dequeueAIRequest(req.id);
          }
        } catch (err) {
          // Keep the request in the queue; retry next reconnect.
          console.error('[AI QUEUE] Retry failed for request', req.id, err);
        }
      }
    };

    void processQueue();
  }, [isConnected, pendingAIRequests]);

  const messages = selectedTopic ? (chatHistory[selectedTopic] || []) : [];

  const handleSelectTopic = (topic: any) => {
    const topicTitle = typeof topic === 'string' ? topic : topic.title;
    setSelectedTopic(topicTitle);
    if (!chatHistory[topicTitle] || chatHistory[topicTitle].length === 0) {
      clearMessages(topicTitle);
      addMessage(topicTitle, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm your tutor. Let's master **${topicTitle}**. What would you like to know?`,
        timestamp: Date.now()
      });
    }
  };

  const handleVoice = async () => {
    if (voiceState !== 'idle' || !selectedTopic) return;

    setVoiceState('listening');
    const transcript = await startListening();

    if (!transcript) {
      setVoiceState('idle');
      return;
    }

    addMessage(selectedTopic, {
      id: Date.now().toString(),
      role: 'user',
      content: `🎤 ${transcript}`,
      timestamp: Date.now()
    });

    setVoiceState('processing');

    const response = await handleVoiceQuery({
      transcript,
      subjectId: currentSubject.id
    });

    if (response) {
      setVoiceState('speaking');
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });
    }

    setTimeout(() => {
      setVoiceState('idle');
    }, 4000);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedTopic || !currentSubject) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    Haptics.impactAsync('light');

    addMessage(selectedTopic, userMsg);
    setInput('');
    setLoading(true);
    Keyboard.dismiss();

    const cached = await getCachedResponse(currentSubject.id, selectedTopic, mode);
    if (cached) {
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cached,
        timestamp: Date.now(),
        source: 'cache',
        isCached: true
      });
      setLoading(false);
      return;
    }

    if (isConnected === false) {
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, you are offline and there's no cached explanation for this mode yet. Please try another subject or reconnect.",
        timestamp: Date.now(),
        source: 'offline'
      });
      setLoading(false);
      return;
    }

    const contextMessages = [...messages, userMsg].slice(-8).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Real RAG: embed the user's question with the embedding-role model, run
    // match_document_chunks, and inject the top 3 hits as document context.
    // Fail-open on retrieval (log + continue): a retrieval hiccup must never
    // block the chat.
    // Scope contract: taxonomy_scope = subject ID, curriculum_scope =
    // curriculum name (KICD_KCSE / HEB_UNIV / GLOBAL_OPEN). Must match the
    // values stamped on import in lib/knowledge.ts.
    const curriculumScope = learningMode === 'high_school'
      ? 'KICD_KCSE'
      : learningMode === 'university'
        ? 'HEB_UNIV'
        : 'GLOBAL_OPEN';
    let ragContext = '';
    let citationSources: CitableSource[] = [];
    setRagActive(true);
    try {
      const chunks = await retrieveRelevantChunks(userMsg.content, {
        portal_type: portalFromMode(learningMode ?? 'high_school'),
        curriculum_scope: curriculumScope,
        taxonomy_scope: currentSubject.id,
        mastery_level: 0,
        user_goal: userMsg.content,
        active_path: [currentSubject.id],
      }, { maxChunks: 3 });
      if (chunks.length > 0) {
        // Chapter picker scopes retrieval: only surface chunks from the chosen
        // chapter when one is selected.
        const scoped = selectedChapter
          ? chunks.filter((c) => String((c.metadata as any)?.chapter_no) === String(selectedChapter.chapter_no))
          : chunks;
        citationSources = scoped.flatMap((chunk) => {
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
        ragContext = `\n\nRelevant context from your documents:\n${scoped
          .map((c) => {
            const citation = buildCitation(c.metadata as Record<string, unknown> | undefined);
            return `- ${c.content} ${citation}`;
          })
          .join('\n')}`;
      }
    } catch (err) {
      console.warn('[RAG] Retrieval failed; continuing without document context.', err);
    } finally {
      setRagActive(false);
    }

    const sysPrompt = buildSystemPrompt({
      mode: learningMode,
      subject: currentSubject.name,
      topic: selectedTopic,
      isQuiz: mode === 'Quiz Me',
      isSocratic: mode === 'Teach & Quiz',
      localeCountry,
      localeExamples,
    }) + ragContext + (ragContext ? '\nCITE YOUR SOURCES: When you use the document context above, support claims with the source in brackets, e.g. [Bird Ch15 p.171].' : '') + (lowDataMode ? '\nLOW-DATA MODE: Keep your answer concise and text-first. Give the shortest useful answer — no long explanations, no fluff, no markdown tables. One short paragraph maximum.' : '');

    const res = await askTutor(sysPrompt, contextMessages);

    setLoading(false);

    if (res.success && res.data) {
      await saveResponse(currentSubject.id, selectedTopic, mode, res.data);
      const citations = citedSources(res.data, citationSources);
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data,
        timestamp: Date.now(),
        source: res.provider,
        citations,
      });
    } else {
      // Queue the AI request for retry when the connection is restored.
      enqueueAIRequest({
        topicId: selectedTopic,
        subjectId: currentSubject.id,
        systemPrompt: sysPrompt,
        messages: contextMessages,
      });
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I've saved your question and will answer it as soon as you're back online.",
        timestamp: Date.now(),
        source: 'offline'
      });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View className="w-full mb-6">
        <View className={`w-full flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
          <View className={`max-w-[88%] p-5 rounded-3xl ${isUser ? 'bg-primary rounded-tr-sm' : 'bg-surface-card border border-surface-border rounded-tl-sm'}`}>
            {isUser ? (
              <Text className="text-base font-dmsans leading-6 text-text-inverse font-medium">
                {item.content}
              </Text>
            ) : (
              <Markdown style={markdownStyles}>
                {item.content}
              </Markdown>
            )}

            {!isUser && (
              <View
                className="flex-row items-center gap-1 mt-3"
                accessibilityRole="text"
                accessibilityLabel={t(answerSourceLabelKey(item.source))}
              >
                <Ionicons name="information-circle-outline" size={12} color={COLORS.text.secondary} />
                <Text className="text-[10px] font-dmsans-medium text-text-secondary">
                  {t(answerSourceLabelKey(item.source))}
                </Text>
              </View>
            )}

            {item.isCached && (
              <View className="bg-warning-container px-2 py-1 rounded-lg mt-3 self-start border border-warning/20 flex-row items-center">
                 <Ionicons name="flash" size={12} color={COLORS.warning.DEFAULT} />
                 <Text className="text-warning text-[10px] font-bold font-syne ml-1 uppercase">{t('mh')}</Text>
              </View>
            )}
          </View>
        </View>
        {!isUser && item.citations && item.citations.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2 ml-2">
            {item.citations.map((citation, index) => (
              <TouchableOpacity
                key={`${citation.source}-${citation.chapter ?? ''}-${citation.page ?? ''}-${index}`}
                onPress={() => setSelectedCitation(citation)}
                accessibilityRole="button"
                accessibilityLabel={`${t('source')}: ${citation.source}`}
                className="min-h-[48px] flex-row items-center gap-2 rounded-full bg-surface-elevated px-4 py-2"
              >
                <Ionicons name="reader-outline" size={16} color={COLORS.primary.DEFAULT} />
                <Text className="text-xs font-dmsans-medium text-text-primary">
                  {[citation.source, citation.chapter ? `Ch${citation.chapter}` : '', citation.page ? `p.${citation.page}` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!isUser && selectedTopic && (
          <View className="flex-row flex-wrap mt-3 gap-2 ml-2">
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync('medium');
                router.push({
                  pathname: '/(tabs)/quiz',
                  params: {
                    topic: selectedTopic,
                    subjectId: currentSubject.id
                  }
                });
              }}
              className="min-h-[48px] px-4 py-2 bg-primary/10 rounded-full border border-primary/30 flex-row items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={14} color={COLORS.primary.DEFAULT} />
              <Text className="text-primary text-xs font-bold font-syne ml-1.5 uppercase tracking-wider">{t('as')}</Text>
            </TouchableOpacity>

            {selectedSubjectId && currentTopicObj && (
              <TouchableOpacity 
                onPress={() => {
                  Haptics.notificationAsync('success');
                  markTopicDone(selectedSubjectId, currentTopicObj.id, currentTopicObj.title);
                }}
                className="min-h-[48px] px-4 py-2 bg-success/10 rounded-full border border-success/30 flex-row items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={14} color={COLORS.success.DEFAULT} />
                <Text className="text-success text-xs font-bold font-syne ml-1.5 uppercase tracking-wider">{t('ex')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };



  const displayedTopics = isConnected === false 
    ? currentSubject.topics.filter(t => offlineCachedTopics.includes(t.title))
    : currentSubject.topics;

  return (
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      {/* Header and Topic Pill List */}
      <View className="pt-4 pb-2 border-b border-surface-border bg-surface-bg z-10">
        <View className="px-4 mb-3">
          <Text className="text-text-primary text-2xl font-bold font-syne mb-1">
            {headerTitle}
          </Text>
          {isConnected === false && (
            <Text className="text-warning font-dmsans text-sm flex-wrap">
              {t('qs')}
            </Text>
          )}
          {pendingAIRequests.length > 0 && (
            <View className="mx-2 my-2 flex-row items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-4 py-2">
              <Ionicons name="cloud-upload" size={16} color={COLORS.warning.DEFAULT} />
              <Text className="text-warning text-xs font-bold font-syne uppercase">
                {pendingAIRequests.length} {t('bj')}{pendingAIRequests.length > 1 ? 's' : ''} {t('gc')}
              </Text>
              <TouchableOpacity onPress={() => clearPendingAIRequests()} className="px-2">
                <Ionicons name="close-outline" size={14} color={COLORS.warning.DEFAULT} />
              </TouchableOpacity>
            </View>
          )}
          {mode !== 'Quiz Me' && (
            <View className="mx-2 my-2 flex-row items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2">
              <Ionicons name="school-outline" size={16} color={COLORS.primary.DEFAULT} />
              <Text className="text-primary text-xs font-bold font-syne uppercase">
                {t('cz')} {mode === 'Teach & Quiz' ? t('bc') : mode === 'Explain' ? t('na') : t('iu')}
              </Text>
            </View>
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={displayedTopics}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          renderItem={({ item }) => {
            const isSelected = item.title === selectedTopic;
            return (
              <TouchableOpacity
                onPress={() => handleSelectTopic(item)}
                className={`mr-3 min-h-[48px] px-4 py-3 rounded-full border ${isSelected ? 'bg-primary border-primary' : 'bg-surface-card border-surface-border'}`}
              >
                <Text className={`font-semibold font-dmsans ${isSelected ? 'text-text-inverse' : 'text-text-secondary'}`}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            isConnected === false ? (
              <Text className="text-text-muted italic px-4 font-dmsans mt-2">{t('gg')}</Text>
            ) : null
          }
        />
        {chapters.length > 0 && (
          <View className="px-4 mb-3">
            <Text className="text-text-muted text-xs font-dmsans uppercase tracking-widest mb-2">
              {t('eo')}
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={chapters}
              keyExtractor={(item) => `${item.chapter_no}|${item.chapter_title}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
              renderItem={({ item }) => {
                const isSelected = selectedChapter
                  && item.chapter_no === selectedChapter.chapter_no
                  && item.chapter_title === selectedChapter.chapter_title;
                return (
                  <TouchableOpacity
                    onPress={() =>
                      isSelected ? setSelectedChapter(null) : setSelectedChapter(item)
                    }
                    className={`mr-3 min-h-[48px] px-3 py-3 rounded-full border ${isSelected ? 'bg-primary border-primary' : 'bg-surface-card border-surface-border'}`}
                  >
                    <Text className={`text-xs font-semibold font-dmsans ${isSelected ? 'text-text-inverse' : 'text-text-secondary'}`}>
                      {`${item.chapter_no} · ${item.chapter_title}`}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            {selectedChapter && (
              <TouchableOpacity
                onPress={() => setSelectedChapter(null)}
                className="mt-2 min-h-[48px] px-3 py-2 rounded-full border border-error bg-surface-card"
              >
                <Text className="text-xs font-semibold font-dmsans text-error">
                  {t('ny')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          className="flex-1 px-4 pt-4"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />

        {loading && (
          <Animated.View style={{ opacity: fadeAnim }} className="px-4 pb-4">
            <View className="w-full flex-row justify-start">
              <View className="max-w-[75%] p-4 rounded-2xl bg-surface-card border border-surface-border rounded-tl-sm w-48">
                <View className="h-3 bg-surface-elevated rounded mb-3 w-3/4" />
                <View className="h-3 bg-surface-elevated rounded mb-3 w-full" />
                <View className="h-3 bg-surface-elevated rounded w-5/6" />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Bottom Input Area */}
        <View className="p-4 border-t border-surface-border bg-surface-bg">
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-xs text-text-secondary">
              {t('sourcesShownWhenAvailable')}
            </Text>
            {lowDataMode && (
              <View className="min-h-[36px] flex-row items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-2">
                <Ionicons name="cellular-outline" size={14} color={COLORS.text.secondary} />
                <Text className="text-xs font-dmsans-medium text-text-secondary">{t('shortAnswers')}</Text>
              </View>
            )}
          </View>
          {ragActive && (
            <View className="flex-row justify-end mb-2">
              <View className="bg-primary/10 border border-primary/20 rounded-full px-3 py-2 flex-row items-center gap-2">
                <Ionicons name="reader-outline" size={14} color={COLORS.primary.DEFAULT} />
                <Text className="text-primary text-xs font-dmsans font-bold">
                  {t('retrievingFromNotes')}
                </Text>
              </View>
            </View>
          )}
          <View className="flex-row mb-3">
            {MODES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                className={`min-h-[48px] justify-center py-1.5 px-3 rounded-full mr-2 ${mode === m ? 'bg-primary/10' : 'bg-transparent'}`}
              >
                <Text className={`text-sm font-bold font-dmsans ${mode === m ? 'text-primary' : 'text-text-secondary'}`}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row items-center bg-surface-card rounded-3xl p-1 border border-surface-border">
            <TouchableOpacity 
              className={`w-12 h-12 rounded-full items-center justify-center ml-1 ${voiceState !== 'idle' ? 'bg-warning-light' : 'bg-surface-elevated'}`}
              accessibilityRole="button"
              accessibilityLabel={t('voiceInput')}
              onPress={handleVoice}
            >
              <Ionicons 
                name={voiceState === 'listening' ? "mic" : voiceState === 'processing' ? "hourglass" : voiceState === 'speaking' ? "volume-high" : "mic-outline"} 
                size={20} 
                color={COLORS.text.primary}
              />
            </TouchableOpacity>
            <TextInput
              className="flex-1 text-text-primary text-base font-dmsans px-3 py-3 min-h-[48px] max-h-[120px]"
              placeholder={t('askQuestion')}
              placeholderTextColor={COLORS.text.muted}
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity 
              className={`w-12 h-12 rounded-full items-center justify-center mr-1 ${input.trim() ? 'bg-primary' : 'bg-surface-elevated'}`}
              accessibilityRole="button"
              accessibilityLabel={t('send')}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="send" size={16} color={input.trim() ? COLORS.text.inverse : COLORS.text.muted} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {selectedCitation && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Sheet
          isOpen
          onClose={() => setSelectedCitation(null)}
        >
            <View className="gap-4 px-5 pb-8">
              <View>
                <Text className="text-xl font-dmsans-semibold text-text-primary">
                  {selectedCitation.source}
                </Text>
                <Text className="mt-1 text-sm text-text-secondary">
                  {[
                    selectedCitation.chapter ? `Chapter ${selectedCitation.chapter}` : '',
                    selectedCitation.page ? `page ${selectedCitation.page}` : '',
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View className="rounded-lg bg-surface-subtle p-4">
                <Text className="text-base leading-6 text-text-primary">
                  “{selectedCitation.excerpt}”
                </Text>
              </View>
              <View className="self-start rounded-full bg-primary/10 px-3 py-2">
                <Text className="text-sm font-dmsans-medium text-primary">
                  {t('fromPrivateNotes')}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCitation(null);
                    router.push('/(tabs)/library');
                  }}
                  accessibilityRole="button"
                  className="min-h-[48px] flex-1 items-center justify-center rounded-md border border-surface-border bg-surface-card px-4"
                >
                  <Text className="text-sm font-dmsans-semibold text-text-primary">
                    {t('openInLibrary')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedCitation(null)}
                  accessibilityRole="button"
                  className="min-h-[48px] flex-1 items-center justify-center rounded-md bg-primary px-4"
                >
                  <Text className="text-sm font-dmsans-semibold text-text-inverse">
                    {t('close')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
        </Sheet>
        </View>
      )}
    </SafeAreaView>
  );
}
