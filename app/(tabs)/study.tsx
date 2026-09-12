import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SUBJECTS } from "../../lib/subjects";
import { useStudyStore, ChatMessage } from "../../store/studyStore";
import { askTutor } from "../../lib/api";
import { buildSystemPrompt } from "../../services/systemPrompts";
import { useProgressStore } from "../../store/progressStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useNetInfo } from "@react-native-community/netinfo";
import { saveResponse, getCachedResponse, getCachedTopicsForSubject } from "../../lib/cache";
import { retrieveRelevantChunks } from "../../lib/retrieval";
import { portalFromMode } from "../../store/roadmapStore";
import * as Haptics from '../../lib/haptics';
import Markdown from 'react-native-markdown-display';
import { VoiceState } from "../../lib/voice";
import { startListening } from "../../lib/stt";
import { handleVoiceQuery } from "../../lib/voiceTutor";

const markdownStyles = {
  body: {
    color: '#e2e8f0',
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
  },
  strong: {
    color: '#ffffff',
    fontWeight: '700' as const,
    fontFamily: 'DMSans_700Bold',
  },
  link: {
    color: '#4f7cff',
  },
  bullet_list: {
    marginVertical: 10,
  },
  list_item: {
    marginVertical: 5,
  },
  code_inline: {
    backgroundColor: '#2a2f3d',
    color: '#ffffff',
    padding: 4,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
};

type Mode = 'Explain' | 'Quiz Me' | 'Summary';
const MODES: Mode[] = ['Explain', 'Quiz Me', 'Summary'];

export default function StudyTab() {
  const params = useLocalSearchParams<{ subjectId?: string; topic?: string }>();
  
  const { 
    selectedSubjectId, 
    selectedTopic, 
    chatHistory, 
    setSelectedSubject, 
    setSelectedTopic, 
    addMessage, 
    clearMessages 
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

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('Explain');
  const [loading, setLoading] = useState(false);
  const [ragActive, setRagActive] = useState(false);
  const [offlineCachedTopics, setOfflineCachedTopics] = useState<string[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

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
    if (isConnected === false && currentSubject) {
      getCachedTopicsForSubject(currentSubject.id).then(setOfflineCachedTopics);
    }
  }, [isConnected, currentSubject?.id]);

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
        timestamp: Date.now()
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
    let ragContext = '';
    setRagActive(true);
    try {
      const chunks = await retrieveRelevantChunks(userMsg.content, {
        portal_type: portalFromMode(learningMode ?? 'high_school'),
        curriculum_scope: currentSubject.name,
        taxonomy_scope: selectedTopic,
        mastery_level: 0,
        user_goal: userMsg.content,
        active_path: [currentSubject.id],
      }, { maxChunks: 3 });
      if (chunks.length > 0) {
        ragContext = `\n\nRelevant context from your documents:\n${chunks
          .map(c => `- ${c.content}`)
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
      isQuiz: mode === 'Quiz Me'
    }) + ragContext;

    const res = await askTutor(sysPrompt, contextMessages);

    setLoading(false);

    if (res.success && res.data) {
      await saveResponse(currentSubject.id, selectedTopic, mode, res.data);
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data,
        timestamp: Date.now()
      });
    } else {
      addMessage(selectedTopic, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the network.",
        timestamp: Date.now()
      });
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View className="w-full mb-6">
        <View className={`w-full flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
          <View className={`max-w-[88%] p-5 rounded-3xl ${isUser ? 'bg-[#4f7cff] rounded-tr-sm shadow-lg shadow-[#4f7cff]/20' : 'bg-[#161920] border border-[#2a2f3d] rounded-tl-sm'}`}>
            {isUser ? (
              <Text className="text-base font-dmsans leading-6 text-white font-medium">
                {item.content}
              </Text>
            ) : (
              <Markdown style={markdownStyles}>
                {item.content}
              </Markdown>
            )}
            
            {item.isCached && (
              <View className="bg-[#f59e0b]/10 px-2 py-1 rounded-lg mt-3 self-start border border-[#f59e0b]/20 flex-row items-center">
                 <Ionicons name="flash" size={12} color="#f59e0b" />
                 <Text className="text-[#f59e0b] text-[10px] font-bold font-syne ml-1 uppercase">Cached for efficiency</Text>
              </View>
            )}
          </View>
        </View>
        {!isUser && selectedSubjectId && selectedTopic && (
          <View className="flex-row mt-3">
            <TouchableOpacity 
              onPress={() => {
                if (currentTopicObj) {
                  Haptics.notificationAsync('success');
                  markTopicDone(selectedSubjectId, currentTopicObj.id, currentTopicObj.title);
                }
              }}
              className="px-4 py-2 bg-[#22c55e]/10 rounded-full border border-[#22c55e]/30 flex-row items-center ml-2"
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={14} color="#22c55e" />
              <Text className="text-[#22c55e] text-xs font-bold font-syne ml-1.5 uppercase tracking-wider">Concept Mastered</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };



  const displayedTopics = isConnected === false 
    ? currentSubject.topics.filter(t => offlineCachedTopics.includes(t.title))
    : currentSubject.topics;

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      {/* Header and Topic Pill List */}
      <View className="pt-4 pb-2 border-b border-[#2a2f3d] bg-[#0d0f12] z-10">
        <View className="px-4 mb-3">
          <Text className="text-white text-2xl font-bold font-syne mb-1">
            {headerTitle}
          </Text>
          {isConnected === false && (
            <Text className="text-[#f59e0b] font-dmsans text-sm flex-wrap">
              You're offline. Study from cached topics below.
            </Text>
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
                className={`mr-3 px-4 py-2 rounded-full border ${isSelected ? 'bg-[#4f7cff] border-[#4f7cff]' : 'bg-[#161920] border-[#2a2f3d]'}`}
              >
                <Text className={`font-semibold font-dmsans ${isSelected ? 'text-white' : 'text-[#8a8fa3]'}`}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            isConnected === false ? (
              <Text className="text-[#8a8fa3] italic px-4 font-dmsans mt-2">No cached topics found for this subject.</Text>
            ) : null
          }
        />
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
              <View className="max-w-[75%] p-4 rounded-2xl bg-[#161920] border border-[#2a2f3d] rounded-tl-sm w-48">
                <View className="h-3 bg-[#2a2f3d] rounded mb-3 w-3/4" />
                <View className="h-3 bg-[#2a2f3d] rounded mb-3 w-full" />
                <View className="h-3 bg-[#2a2f3d] rounded w-5/6" />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Bottom Input Area */}
        <View className="p-4 border-t border-[#2a2f3d] bg-[#0d0f12]">
          {ragActive && (
            <View className="flex-row justify-end mb-2">
              <View className="bg-[#4f7cff]/10 border border-[#4f7cff]/20 rounded-full px-3 py-1 flex-row items-center">
                <Text className="text-[#4f7cff] text-xs font-dmsans font-bold">
                  📚 Retrieving from your docs…
                </Text>
              </View>
            </View>
          )}
          <View className="flex-row mb-3">
            {MODES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                className={`py-1.5 px-3 rounded-full mr-2 ${mode === m ? 'bg-[#4f7cff]/20' : 'bg-transparent'}`}
              >
                <Text className={`text-sm font-bold font-dmsans ${mode === m ? 'text-[#4f7cff]' : 'text-[#8a8fa3]'}`}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row items-center bg-[#161920] rounded-3xl p-1 border border-[#2a2f3d]">
            <TouchableOpacity 
              className={`w-10 h-10 rounded-full items-center justify-center ml-1 ${voiceState !== 'idle' ? 'bg-[#f59e0b]' : 'bg-[#2a2f3d]'}`}
              onPress={handleVoice}
            >
              <Ionicons 
                name={voiceState === 'listening' ? "mic" : voiceState === 'processing' ? "hourglass" : voiceState === 'speaking' ? "volume-high" : "mic-outline"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
            <TextInput
              className="flex-1 text-white text-base font-dmsans px-3 py-3 min-h-[48px] max-h-[120px]"
              placeholder="Ask a question..."
              placeholderTextColor="#8a8fa3"
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity 
              className={`w-10 h-10 rounded-full items-center justify-center mr-1 ${input.trim() ? 'bg-[#4f7cff]' : 'bg-[#2a2f3d]'}`}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="send" size={16} color={input.trim() ? "white" : "#8a8fa3"} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
