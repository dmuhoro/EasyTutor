import React, { useState, useEffect } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SUBJECTS } from "../../lib/subjects";
import { useProgressStore } from "../../store/progressStore";
import { useAuthStore } from "../../store/authStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useNetInfo } from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import * as Haptics from '../../lib/haptics';
import { trackEvent } from "../../lib/analytics";
import { FeedbackModal } from "../../components/FeedbackModal";
import { CanonicalQuizRenderer, QuizQuestion } from "../../components/CanonicalQuizRenderer";
import { useQuizQuestionGeneration } from "../../hooks/useOrchestration";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const TOTAL_QUESTIONS = 10;

export default function QuizTab() {
  const router = useRouter();
  const { markTopicDone, addQuizScore } = useProgressStore();
  const { user } = useAuthStore();
  const { isConnected } = useNetInfo();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [nextQuestionData, setNextQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [preFetching, setPreFetching] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [currentQuizSubjectName, setCurrentQuizSubjectName] = useState<string>('');
  const [currentQuizSubjectId, setCurrentQuizSubjectId] = useState<string>('');
  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');
  const [currentQuizTopicId, setCurrentQuizTopicId] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const { generateQuizQuestion } = useQuizQuestionGeneration();

  useEffect(() => {
    startInitialQuiz();
    return () => {};
  }, []);

  const getRandomTopic = () => {
    const randomSubject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    const randomTopic = randomSubject.topics[Math.floor(Math.random() * randomSubject.topics.length)];
    return { subjectId: randomSubject.id, subjectName: randomSubject.name, topicId: randomTopic.id, topicName: randomTopic.title };
  };

  const startInitialQuiz = async () => {
    setLoading(true);
    const { subjectId, subjectName, topicId, topicName } = getRandomTopic();
    setCurrentQuizSubjectId(subjectId);
    setCurrentQuizSubjectName(subjectName);
    setCurrentQuizTopicId(topicId);
    setCurrentQuizTopic(topicName);

    const result = await generateQuizQuestion({ subject_id: subjectId, topic_id: topicId });
    if (result?.pipeline?.output) {
      setQuestionData(result.pipeline.output as Question);
      if (user?.id) {
        trackEvent('quiz_started', {
          user_id: user.id,
          learning_mode: 'unknown',
          subjectName,
          topicName
        });
      }
      // Start pre-fetching the SECOND question immediately
      preFetchNext();
    } else {
      setError('Failed to start quiz.');
    }
    setLoading(false);
  };

  const preFetchNext = async () => {
    if (preFetching || questionIndex + 1 >= TOTAL_QUESTIONS) return;
    setPreFetching(true);
    const { subjectName, topicName } = getRandomTopic();
    const result = await generateQuizQuestion({ subject_id: currentQuizSubjectId, topic_id: currentQuizTopicId });
    if (result?.pipeline?.output) {
      setNextQuestionData(result.pipeline.output as Question);
    }
    setPreFetching(false);
  };

  const handleSelectOption = (index: number) => {
    if (showExplanation || !questionData) return;
    
    Haptics.impactAsync('medium');
    setSelectedOption(index);
    setShowExplanation(true);
    
    // We already pre-fetched!
    
    if (index === questionData.correct) {
      setScore(prev => prev + 2); // Double points for streaks? No, just keep it simple
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
       addQuizScore(score, TOTAL_QUESTIONS, currentQuizTopic, currentQuizSubjectId, currentQuizTopicId);
       if (user?.id) {
         trackEvent('quiz_completed', {
           user_id: user.id,
           learning_mode: 'unknown',
           topic: currentQuizTopic,
           score,
           total: TOTAL_QUESTIONS
         });
       }
       setIsFinished(true);
       setTimeout(() => setShowFeedback(true), 1500);
       return;
    }

    if (nextQuestionData) {
      setQuestionData(nextQuestionData);
      setNextQuestionData(null);
      setQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      // Pre-fetch the one AFTER this
      preFetchNext();
    } else {
      // Fallback if network was slow
      setLoading(true);
      startInitialQuiz();
    }
  };

  const handleTryAgain = () => {
    setQuestionIndex(0);
    setScore(0);
    setIsFinished(false);
    startInitialQuiz();
  };


  if (isFinished) {
    const percentage = Math.round((score / TOTAL_QUESTIONS) * 100);
    const feedback = percentage >= 80 ? "Outstanding!" : percentage >= 50 ? "Good Job!" : "Keep Practicing!";
    const accentColor = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] px-6 py-10" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <View className="bg-[#161920] w-full rounded-[40px] p-8 border border-[#2a2f3d] items-center relative shadow-2xl overflow-hidden">
            {/* Background Accent */}
            <View 
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" 
              style={{ backgroundColor: accentColor }} 
            />
            
            <View className="w-24 h-24 bg-[#0d0f12] rounded-full items-center justify-center mb-6 border-4" style={{ borderColor: accentColor }}>
               <Text className="text-white text-3xl font-bold font-syne">{percentage}%</Text>
            </View>
            
            <Text className="text-white text-4xl font-bold font-syne mb-2 text-center">{feedback}</Text>
            <Text className="text-[#8a8fa3] text-lg font-dmsans mb-4 text-center max-w-[200px]">
              You answered {score} out of {TOTAL_QUESTIONS} questions correctly.
            </Text>

            {/* XP Badge */}
            <View className="bg-[#4f7cff]/10 px-6 py-3 rounded-2xl border border-[#4f7cff]/30 mb-8 flex-row items-center">
               <Ionicons name="sparkles" size={20} color="#4f7cff" />
               <Text className="text-white font-bold font-syne text-xl ml-2">
                 +{percentage >= 80 ? 20 : percentage >= 50 ? 10 : 5} XP
               </Text>
            </View>

            <View className="w-full h-[1px] bg-[#2a2f3d] mb-8" />

            <View className="w-full flex-row justify-between mb-8">
                <View className="items-center flex-1">
                   <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase mb-1">Time spent</Text>
                   <Text className="text-white font-bold font-syne text-lg">
                     {Math.floor((Date.now() - startTime) / 60000)}:{(Math.floor((Date.now() - startTime) / 1000) % 60).toString().padStart(2, '0')}m
                   </Text>
                </View>
               <View className="w-[1px] h-10 bg-[#2a2f3d]" />
               <View className="items-center flex-1">
                  <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase mb-1">Status</Text>
                  <View className="flex-row items-center">
                     <Ionicons name="cloud-done" size={16} color="#4f7cff" />
                     <Text className="text-white font-bold font-syne text-lg ml-1">Synced</Text>
                  </View>
               </View>
            </View>

            <View className="w-full flex-row">
              <TouchableOpacity 
                className="bg-[#161920] flex-1 py-5 rounded-2xl flex-row items-center justify-center border border-[#2a2f3d] mr-3"
                onPress={handleTryAgain}
              >
                <Ionicons name="refresh" size={18} color="#8a8fa3" />
                <Text className="text-[#8a8fa3] font-bold font-syne text-lg ml-2">Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-[#4f7cff] flex-2 py-5 rounded-3xl flex-row items-center justify-center shadow-lg shadow-[#4f7cff]/30"
                style={{ flex: 2 }}
                onPress={() => router.push('/(shared)/learning-dashboard')}
              >
                <Text className="text-white font-bold font-syne text-lg mr-2">Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          
        </View>
        <FeedbackModal 
          isVisible={showFeedback} 
          onClose={() => setShowFeedback(false)} 
          source="quiz_completion" 
          topic={currentQuizTopic}
          contentType="quiz"
        />
      </SafeAreaView>
    );
  }


  const progressPercentage = (questionIndex / TOTAL_QUESTIONS) * 100;

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      {/* Header with Progress Bar */}
      <View className="px-5 py-4 border-b border-[#2a2f3d]">
        <View className="flex-row justify-between items-end mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-white text-3xl font-bold font-syne mb-1">Quick Quiz</Text>
            <View className="flex-row items-center">
              <View className="bg-[#4f7cff]/10 px-2 py-0.5 rounded-md border border-[#4f7cff]/20">
                <Text className="text-[#4f7cff] font-bold font-syne text-[10px] uppercase">{currentQuizSubjectName}</Text>
              </View>
              <Text className="text-[#8a8fa3] text-xs font-dmsans ml-2" numberOfLines={1}>• {currentQuizTopic}</Text>
            </View>
          </View>
          <Text className="text-[#8a8fa3] font-dmsans font-bold mb-1">
            {questionIndex + 1} / {TOTAL_QUESTIONS}
          </Text>
        </View>
        <View className="w-full bg-[#161920] h-2 rounded-full overflow-hidden border border-[#2a2f3d]">
          <View 
            className="bg-[#4f7cff] h-full rounded-full" 
            style={{ width: `${((questionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }} 
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#4f7cff" />
          <Text className="text-[#8a8fa3] mt-4 text-center font-dmsans">
            Designing a challenging question for you...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text className="text-white mt-4 text-center font-bold text-lg mb-6">{error}</Text>
          <TouchableOpacity onPress={startInitialQuiz} className="bg-[#4f7cff] py-3 px-8 rounded-xl flex-row items-center">
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text className="text-white font-bold ml-2">Retry</Text>
          </TouchableOpacity>
        </View>

      ) : questionData && (
        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          <Text className="text-white text-2xl font-bold font-syne mb-8 leading-9">
            {questionData.question}
          </Text>

          <View className="mb-6">
            {questionData.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = showExplanation && idx === questionData.correct;
              const isWrong = showExplanation && isSelected && !isCorrect;
              
              let borderColor = 'border-[#2a2f3d]';
              let bgColor = 'bg-[#161920]';
              let icon = null;

              if (showExplanation) {
                if (isCorrect) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-500/10';
                  icon = <Ionicons name="checkmark-circle" size={24} color="#22c55e" />;
                } else if (isWrong) {
                  borderColor = 'border-red-500';
                  bgColor = 'bg-red-500/10';
                  icon = <Ionicons name="close-circle" size={24} color="#ef4444" />;
                }
              } else if (isSelected) {
                borderColor = 'border-[#4f7cff]';
                bgColor = 'bg-[#4f7cff]/10';
              }

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectOption(idx)}
                  activeOpacity={0.7}
                  disabled={showExplanation}
                  className={`p-5 rounded-2xl mb-4 border-2 flex-row items-center justify-between ${borderColor} ${bgColor}`}
                >
                  <Text className={`text-base font-dmsans flex-1 pr-4 leading-6 ${showExplanation && (isCorrect || isWrong) ? 'text-white' : 'text-[#e2e8f0]'}`}>
                    {option}
                  </Text>
                  {icon}
                </TouchableOpacity>
              );
            })}
          </View>

          {showExplanation && (
            <View className="bg-[#161920] p-5 rounded-2xl border border-[#2a2f3d] mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color="#4f7cff" />
                <Text className="text-white font-bold font-syne text-lg ml-2">Explanation</Text>
              </View>
              <Text className="text-[#8a8fa3] text-base font-dmsans leading-6">
                {questionData.explanation}
              </Text>
            </View>
          )}

          {showExplanation && (
            <TouchableOpacity 
              onPress={handleNextQuestion}
              className="bg-[#4f7cff] py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-[#4f7cff]/30"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-lg font-syne mr-2">
                {questionIndex + 1 >= TOTAL_QUESTIONS ? "Finish Quiz" : "Next Question"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
