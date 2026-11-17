import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SUBJECTS } from "../../lib/subjects";
import { useProgressStore, WrongAnswerRecord, portalFromSubjectId } from "../../store/progressStore";
import { useAuthStore } from "../../store/authStore";
import { useRoadmapStore } from "../../store/roadmapStore";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from '../../lib/haptics';
import { trackEvent } from "../../lib/analytics";
import { FeedbackModal } from "../../components/FeedbackModal";
import { CanonicalQuizRenderer, QuizQuestion } from "../../components/CanonicalQuizRenderer";
import { useQuizQuestionGeneration } from "../../hooks/useOrchestration";
import { safeEval } from "../../lib/safeEval";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  stepByStep?: string;
}

interface CalcVerification {
  ok: boolean;
  expression: string;
  expected: number;
  aiAnswer: number;
}

const DEFAULT_TOTAL_QUESTIONS = 10;

export default function QuizTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topic?: string; subjectId?: string; total?: string; timed?: string }>();
  const totalQuestions = params.total ? Math.max(1, parseInt(params.total, 10)) : (params.topic ? 5 : DEFAULT_TOTAL_QUESTIONS);
  const timedMode = params.timed === 'true';

  const { markTopicDone, addQuizScore, recordWrongAnswer } = useProgressStore();
  const { user } = useAuthStore();
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
  const [missedQuestions, setMissedQuestions] = useState<WrongAnswerRecord[]>([]);
  const [notCovered, setNotCovered] = useState<{ question: string; explanation: string } | null>(null);

  const [currentQuizSubjectName, setCurrentQuizSubjectName] = useState<string>('');
  const [currentQuizSubjectId, setCurrentQuizSubjectId] = useState<string>('');
  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');
  const [currentQuizTopicId, setCurrentQuizTopicId] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(timedMode ? 60 : 0);
  const [timerActive, setTimerActive] = useState(false);
  const [calcVerification, setCalcVerification] = useState<CalcVerification | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { generateQuizQuestion } = useQuizQuestionGeneration();
  const resolveTargetTopic = () => {
    if (params.topic) {
      let matchedSubject = params.subjectId ? SUBJECTS.find(s => s.id === params.subjectId) : undefined;
      if (!matchedSubject) {
        matchedSubject = SUBJECTS.find(s => s.topics.some(t => t.title.toLowerCase() === params.topic?.toLowerCase() || t.id.toLowerCase() === params.topic?.toLowerCase()));
      }
      const subjectId = matchedSubject ? matchedSubject.id : (params.subjectId || 'general');
      const subjectName = matchedSubject ? matchedSubject.name : (params.subjectId ? params.subjectId.toUpperCase() : 'General Studies');
      
      const matchedTopic = matchedSubject?.topics.find(t => t.title.toLowerCase() === params.topic?.toLowerCase() || t.id.toLowerCase() === params.topic?.toLowerCase());
      const topicId = matchedTopic ? matchedTopic.id : params.topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const topicName = matchedTopic ? matchedTopic.title : params.topic;

      return { subjectId, subjectName, topicId, topicName };
    }
    return getRandomTopic();
  };

  const getRandomTopic = () => {
    // Only subjects that actually have topics are eligible. Two catalogued
    // subjects (uni-law, uni-business) have none; indexing into one used to
    // throw `Cannot read properties of undefined (reading 'id')` from the
    // mount effect as an unhandled rejection. Fail closed if none are usable.
    const eligible = SUBJECTS.filter((s) => s.topics && s.topics.length > 0);
    if (eligible.length === 0) {
      throw new Error('No quiz topics are available in the current catalogue.');
    }
    const randomSubject = eligible[Math.floor(Math.random() * eligible.length)];
    const randomTopic = randomSubject.topics[Math.floor(Math.random() * randomSubject.topics.length)];
    return { subjectId: randomSubject.id, subjectName: randomSubject.name, topicId: randomTopic.id, topicName: randomTopic.title };
  };

  const startInitialQuiz = async () => {
    setLoading(true);
    setError('');
    // Topic resolution is synchronous and can throw. Keep it inside a guarded
    // boundary so it surfaces as an error message instead of an unhandled
    // promise rejection that escapes the React error boundary.
    let target: ReturnType<typeof resolveTargetTopic>;
    try {
      target = resolveTargetTopic();
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare the quiz. Please try again.');
      setLoading(false);
      return;
    }
    const { subjectId, subjectName, topicId, topicName } = target;
    setCurrentQuizSubjectId(subjectId);
    setCurrentQuizSubjectName(subjectName);
    setCurrentQuizTopicId(topicId);
    setCurrentQuizTopic(topicName);

    try {
      const result = await generateQuizQuestion({ subject_id: subjectId, topic_id: topicId });
      const output = result?.pipeline?.output as any;
      if (output && output.question && Array.isArray(output.options)) {
        if (output.notCovered === true) {
          setNotCovered({
            question: output.question,
            explanation: output.explanation || 'This topic is not covered in your ingested notes yet.',
          });
          setQuestionData(null);
        } else {
          setNotCovered(null);
          setQuestionData({
            question: output.question,
            options: output.options,
            correct: typeof output.correct === 'number' ? output.correct : (typeof output.correctIndex === 'number' ? output.correctIndex : 0),
            explanation: output.explanation || 'Foundational concept.',
            stepByStep: typeof output.stepByStep === 'string' ? output.stepByStep : undefined,
          });
          if (user?.id) {
            trackEvent('quiz_started', {
              user_id: user.id,
              learning_mode: 'unknown',
              subjectName,
              topicName
            });
          }
          // Start pre-fetching the SECOND question immediately
          preFetchNext(subjectId, topicId);
        }
      } else {
        setError('Failed to generate quiz question.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz question. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setCalcVerification(null);
    }
  };

  useEffect(() => {
    startInitialQuiz();
    if (timedMode) {
      setTimeRemaining(60);
      setTimerActive(true);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [params.topic, params.subjectId, timedMode]);

  // Timed mode countdown
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setTimerActive(false);
          if (questionData && !showExplanation) {
            // Auto-submit current answer as wrong on timeout
            handleSelectOption(-1);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeRemaining, questionData, showExplanation]);

  const preFetchNext = async (subjId?: string, topId?: string) => {
    if (preFetching || questionIndex + 1 >= totalQuestions) return;
    setPreFetching(true);
    const targetSubj = subjId || currentQuizSubjectId;
    const targetTop = topId || currentQuizTopicId;
    try {
      const result = await generateQuizQuestion({ subject_id: targetSubj, topic_id: targetTop });
      const output = result?.pipeline?.output as any;
      if (output && output.question && Array.isArray(output.options)) {
        setNextQuestionData({
          question: output.question,
          options: output.options,
          correct: typeof output.correct === 'number' ? output.correct : (typeof output.correctIndex === 'number' ? output.correctIndex : 0),
          explanation: output.explanation || 'Foundational concept.',
          stepByStep: typeof output.stepByStep === 'string' ? output.stepByStep : undefined,
        });
      }
    } catch {
      // quiet fallback
    }
    setPreFetching(false);
  };

  const handleSelectOption = (index: number) => {
    if (showExplanation || !questionData) return;
    
    // Stop the timer on answer
    setTimerActive(false);

    Haptics.impactAsync('medium');
    setSelectedOption(index);
    setShowExplanation(true);
    
    const isCorrect = index === questionData.correct;
    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      const wrong: WrongAnswerRecord = {
        id: `${Date.now()}_${questionIndex}`,
        question: questionData.question,
        selectedAnswer: index >= 0 ? (questionData.options[index] || `Option ${index + 1}`) : 'No answer (time ran out)',
        correctAnswer: questionData.options[questionData.correct] || `Option ${questionData.correct + 1}`,
        explanation: questionData.explanation,
        topic: currentQuizTopic,
        subjectId: currentQuizSubjectId,
        timestamp: new Date().toISOString(),
      };
      recordWrongAnswer(wrong);
      setMissedQuestions(prev => [...prev, wrong]);
    }

    // Deterministic calculation verification: if the question text looks like
    // a calculation, verify the AI's correct answer with safeEval. Hide or
    // flag on mismatch — never present a wrong answer as fact.
    const calcMatch = questionData.question.match(/([0-9\s+*/().-]+)/);
    if (calcMatch) {
      const expr = calcMatch[1].trim();
      const evaluated = safeEval(expr);
      const aiAnswer = questionData.options[questionData.correct];
      const aiAnswerNum = parseFloat(aiAnswer);
      if (evaluated.ok && !isNaN(aiAnswerNum) && Math.abs(evaluated.value - aiAnswerNum) > 0.001) {
        setCalcVerification({
          ok: false,
          expression: expr,
          expected: evaluated.value,
          aiAnswer: aiAnswerNum,
        });
      } else if (evaluated.ok) {
        setCalcVerification({
          ok: true,
          expression: expr,
          expected: evaluated.value,
          aiAnswer: aiAnswerNum,
        });
      }
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= totalQuestions) {
       const weakPoints = missedQuestions.map(m => `${m.topic}: ${m.question.slice(0, 80)}`);
       addQuizScore(score, totalQuestions, currentQuizTopic, currentQuizSubjectId, currentQuizTopicId, weakPoints);
       if (user?.id) {
         trackEvent('quiz_completed', {
           user_id: user.id,
           learning_mode: 'unknown',
           topic: currentQuizTopic,
           score,
           total: totalQuestions
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
      setCalcVerification(null);
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
    setMissedQuestions([]);
    setIsFinished(false);
    setSelectedOption(null);
    setShowExplanation(false);
    setCalcVerification(null);
    startInitialQuiz();
  };


  if (isFinished) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const feedback = percentage >= 80 ? "Outstanding!" : percentage >= 50 ? "Good Job!" : "Keep Practicing!";
    const accentColor = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-[#161920] w-full rounded-[40px] p-6 border border-[#2a2f3d] items-center relative shadow-2xl overflow-hidden">
            {/* Background Accent */}
            <View 
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" 
              style={{ backgroundColor: accentColor }} 
            />
            
            <View className="w-24 h-24 bg-[#0d0f12] rounded-full items-center justify-center mb-6 border-4" style={{ borderColor: accentColor }}>
               <Text className="text-white text-3xl font-bold font-syne">{percentage}%</Text>
            </View>
            
            <Text className="text-white text-4xl font-bold font-syne mb-2 text-center">{feedback}</Text>
            <Text className="text-[#8a8fa3] text-lg font-dmsans mb-4 text-center max-w-[240px]">
              You answered {score} out of {totalQuestions} questions correctly.
            </Text>

            {/* XP Badge */}
            <View className="bg-[#4f7cff]/10 px-6 py-3 rounded-2xl border border-[#4f7cff]/30 mb-6 flex-row items-center">
               <Ionicons name="sparkles" size={20} color="#4f7cff" />
               <Text className="text-white font-bold font-syne text-xl ml-2">
                 +{percentage >= 80 ? 20 : percentage >= 50 ? 10 : 5} XP
               </Text>
            </View>

            <View className="w-full h-[1px] bg-[#2a2f3d] mb-6" />

            <View className="w-full flex-row justify-between mb-6">
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

            {/* Missed questions review */}
            {missedQuestions.length > 0 && (
              <View className="w-full mt-2 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text className="text-white font-bold font-syne text-base ml-2">
                    Review Missed Concepts ({missedQuestions.length})
                  </Text>
                </View>
                {missedQuestions.map((item, idx) => (
                  <View key={item.id || idx} className="bg-[#0d0f12] p-4 rounded-2xl border border-[#2a2f3d] mb-3">
                    <Text className="text-white font-syne font-semibold text-sm mb-2">{item.question}</Text>
                    <View className="mb-1">
                      <Text className="text-[#8a8fa3] text-xs font-dmsans">Your answer:</Text>
                      <Text className="text-red-400 font-dmsans text-xs">{item.selectedAnswer}</Text>
                    </View>
                    <View className="mb-2">
                      <Text className="text-[#8a8fa3] text-xs font-dmsans">Correct answer:</Text>
                      <Text className="text-emerald-400 font-dmsans text-xs font-semibold">{item.correctAnswer}</Text>
                    </View>
                    <Text className="text-[#8a8fa3] text-xs font-dmsans italic bg-[#161920] p-2 rounded-lg">
                      💡 {item.explanation}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/(tabs)/study',
                    params: {
                      topic: currentQuizTopic,
                      subjectId: currentQuizSubjectId,
                      mode: 'Teach & Quiz'
                    }
                  })}
                  className="bg-[#4f7cff]/20 border border-[#4f7cff]/40 py-3.5 px-4 rounded-xl flex-row items-center justify-center mt-1"
                >
                  <Ionicons name="school-outline" size={18} color="#4f7cff" />
                  <Text className="text-[#4f7cff] font-bold font-syne text-sm ml-2">
                    Review Weak Points with AI Tutor
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="w-full flex-row mt-2">
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
        </ScrollView>
        <FeedbackModal 
          isVisible={showFeedback} 
          onClose={() => setShowFeedback(false)} 
          source="quiz_completion" 
          topic={currentQuizTopic}
          contentType="quiz"
          portalType={portalFromSubjectId(currentQuizSubjectId)}
        />
      </SafeAreaView>
    );
  }


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
            {questionIndex + 1} / {totalQuestions}
          </Text>
          <View className="flex-row items-center gap-2">
            {timedMode && (
              <View className="flex-row items-center gap-2">
                <Ionicons name="timer-outline" size={16} color={timeRemaining <= 10 ? '#ef4444' : '#8a8fa3'} />
                <Text className={`text-[#8a8fa3] font-dmsans font-bold ${timeRemaining <= 10 ? 'text-[#ef4444]' : ''}`}>
                  {Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('timed', timedMode ? 'false' : 'true');
                url.searchParams.set('total', String(totalQuestions));
                router.replace(url.toString());
              }}
              className={`px-4 py-2 rounded-xl border flex-row items-center ${timedMode ? 'bg-[#4f7cff]/20 border-[#4f7cff]/40' : 'bg-[#161920] border-[#2a2f3d]'}`}
            >
              <Ionicons name={timedMode ? 'stopwatch' : 'timer-outline'} size={16} color={timedMode ? '#4f7cff' : '#8a8fa3'} />
              <Text className={`text-[10px] font-bold font-syne ml-2 ${timedMode ? 'text-[#4f7cff]' : 'text-[#8a8fa3]'}`}>
                {timedMode ? 'Timed: On' : 'Timed: Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="w-full bg-[#161920] h-2 rounded-full overflow-hidden border border-[#2a2f3d]">
          <View 
            className="bg-[#4f7cff] h-full rounded-full" 
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} 
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

      ) : notCovered ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="information-circle" size={48} color="#4f7cff" />
          <Text className="text-white mt-4 text-center font-bold text-lg mb-6">
            Not covered in your notes
          </Text>
          <Text className="text-[#8a8fa3] text-center font-dmsans text-lg mb-8 max-w-[260px]">
            {notCovered.explanation}
          </Text>
          <TouchableOpacity onPress={startInitialQuiz} className="bg-[#4f7cff] py-3 px-8 rounded-xl flex-row items-center">
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text className="text-white font-bold ml-2">Try another topic</Text>
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

          {questionData.stepByStep && (
            <View className="bg-[#1d4ed8]/10 border border-[#1d4ed8]/30 rounded-2xl p-5 mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="construct-outline" size={20} color="#3b82f6" />
                <Text className="text-[#3b82f6] font-bold font-syne text-lg ml-2">Step-by-step working</Text>
              </View>
              <Text className="text-[#8a8fa3] text-base font-dmsans leading-6 whitespace-pre-line">
                {questionData.stepByStep}
              </Text>
            </View>
          )}

          {calcVerification && (
            <View className={`p-4 rounded-2xl mb-8 flex-row items-start ${calcVerification.ok ? 'bg-[#22c55e]/10 border-[#22c55e]/30' : 'bg-[#ef4444]/10 border-[#ef4444]/30'}`}>
              <Ionicons name={calcVerification.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={calcVerification.ok ? '#22c55e' : '#ef4444'} className="mt-1" />
              <View className="ml-3">
                <Text className={`text-base font-bold font-syne mb-1 ${calcVerification.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {calcVerification.ok ? 'Calculation verified' : 'Answer mismatch'}
                </Text>
                <Text className="text-[#8a8fa3] text-sm font-dmsans leading-5">
                  {calcVerification.ok
                    ? `Expression "${calcVerification.expression}" = ${calcVerification.expected} matches the answer.`
                    : `Expression "${calcVerification.expression}" = ${calcVerification.expected}, but the answer shows ${calcVerification.aiAnswer}. The question may be unreliable.`}
                </Text>
              </View>
            </View>
          )}

          {showExplanation && (
            <TouchableOpacity 
              onPress={handleNextQuestion}
              className="bg-[#4f7cff] py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-[#4f7cff]/30"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-lg font-syne mr-2">
                {questionIndex + 1 >= totalQuestions ? "Finish Quiz" : "Next Question"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
