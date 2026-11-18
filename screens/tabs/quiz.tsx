import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SUBJECTS } from "../../lib/subjects";
import { useProgressStore, WrongAnswerRecord, portalFromSubjectId } from "../../store/progressStore";
import { useAuthStore } from "../../store/authStore";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from '../../lib/haptics';
import { trackEvent } from "../../lib/analytics";
import { FeedbackModal } from "../../components/FeedbackModal";
import { useQuizQuestionGeneration } from "../../hooks/useOrchestration";
import { safeEval } from "../../lib/safeEval";
import { COLORS } from "../../src/design/tokens";
import { QuizOption } from "../../components/ui/QuizOption";
import { Timer } from "../../components/ui/Timer";

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

  const { addQuizScore, recordWrongAnswer } = useProgressStore();
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
    const accentColor = percentage >= 80
      ? COLORS.success.DEFAULT
      : percentage >= 50
        ? COLORS.warning.DEFAULT
        : COLORS.error.DEFAULT;

    return (
      <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-surface-card w-full rounded-[32px] p-6 border border-surface-border items-center relative overflow-hidden">
            {/* Background Accent */}
            <View 
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" 
              style={{ backgroundColor: accentColor }} 
            />
            
            <View className="w-24 h-24 bg-surface-bg rounded-full items-center justify-center mb-6 border-4" style={{ borderColor: accentColor }}>
               <Text className="text-text-primary text-3xl font-bold font-syne">{percentage}%</Text>
            </View>
            
            <Text className="text-text-primary text-4xl font-bold font-syne mb-2 text-center">{feedback}</Text>
            <Text className="text-text-secondary text-lg font-dmsans mb-4 text-center max-w-[240px]">
              You answered {score} out of {totalQuestions} questions correctly.
            </Text>

            {/* XP Badge */}
            <View className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/30 mb-6 flex-row items-center">
               <Ionicons name="sparkles" size={20} color={COLORS.primary.DEFAULT} />
               <Text className="text-text-primary font-bold font-syne text-xl ml-2">
                 +{percentage >= 80 ? 20 : percentage >= 50 ? 10 : 5} XP
               </Text>
            </View>

            <View className="w-full h-[1px] bg-surface-border mb-6" />

            <View className="w-full flex-row justify-between mb-6">
                <View className="items-center flex-1">
                   <Text className="text-text-muted text-xs font-dmsans uppercase mb-1">Time spent</Text>
                   <Text className="text-text-primary font-bold font-syne text-lg">
                     {Math.floor((Date.now() - startTime) / 60000)}:{(Math.floor((Date.now() - startTime) / 1000) % 60).toString().padStart(2, '0')}m
                   </Text>
                </View>
               <View className="w-[1px] h-10 bg-surface-border" />
               <View className="items-center flex-1">
                  <Text className="text-text-muted text-xs font-dmsans uppercase mb-1">Progress</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary.DEFAULT} />
                    <Text className="text-text-primary font-bold font-syne text-sm ml-1">Saved on this device</Text>
                  </View>
               </View>
            </View>

            {/* Missed questions review */}
            {missedQuestions.length > 0 && (
              <View className="w-full mt-2 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="alert-circle" size={18} color={COLORS.error.DEFAULT} />
                  <Text className="text-text-primary font-bold font-syne text-base ml-2">
                    Review Missed Concepts ({missedQuestions.length})
                  </Text>
                </View>
                {missedQuestions.map((item, idx) => (
                  <View key={item.id || idx} className="bg-surface-bg p-4 rounded-2xl border border-surface-border mb-3">
                    <Text className="text-text-primary font-syne font-semibold text-sm mb-2">{item.question}</Text>
                    <View className="mb-1">
                      <Text className="text-text-muted text-xs font-dmsans">Your answer:</Text>
                      <Text className="text-error font-dmsans text-xs">{item.selectedAnswer}</Text>
                    </View>
                    <View className="mb-2">
                      <Text className="text-text-muted text-xs font-dmsans">Correct answer:</Text>
                      <Text className="text-success font-dmsans text-xs font-semibold">{item.correctAnswer}</Text>
                    </View>
                    <Text className="text-text-secondary text-xs font-dmsans italic bg-surface-card p-2 rounded-lg">
                      {item.explanation}
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
                  className="min-h-[48px] bg-primary/10 border border-primary/30 py-3.5 px-4 rounded-xl flex-row items-center justify-center mt-1"
                >
                  <Ionicons name="school-outline" size={18} color={COLORS.primary.DEFAULT} />
                  <Text className="text-primary font-bold font-syne text-sm ml-2">
                    Review Weak Points with AI Tutor
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="w-full flex-row mt-2">
              <TouchableOpacity 
                className="bg-surface-card flex-1 min-h-[48px] py-5 rounded-2xl flex-row items-center justify-center border border-surface-border mr-3"
                onPress={handleTryAgain}
              >
                <Ionicons name="refresh" size={18} color={COLORS.text.secondary} />
                <Text className="text-text-secondary font-bold font-syne text-lg ml-2">Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-primary flex-2 min-h-[48px] py-5 rounded-3xl flex-row items-center justify-center"
                style={{ flex: 2 }}
                onPress={() => router.push('/(shared)/learning-dashboard')}
              >
                <Text className="text-text-inverse font-bold font-syne text-lg mr-2">Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.text.inverse} />
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
    <SafeAreaView className="flex-1 bg-surface-bg" edges={['top']}>
      {/* Header with Progress Bar */}
      <View className="px-5 py-4 border-b border-surface-border">
        <View className="flex-row justify-between items-end mb-3">
          <View className="flex-1 mr-4">
            <Text className="text-text-primary text-3xl font-bold font-syne mb-1">Quick Quiz</Text>
            <View className="flex-row items-center">
              <View className="bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                <Text className="text-primary font-bold font-syne text-[10px] uppercase">{currentQuizSubjectName}</Text>
              </View>
              <Text className="text-text-secondary text-xs font-dmsans ml-2" numberOfLines={1}>• {currentQuizTopic}</Text>
            </View>
          </View>
          <Text className="text-text-secondary font-dmsans font-bold mb-1">
            Question {questionIndex + 1} of {totalQuestions}
          </Text>
          <View className="flex-row items-center gap-2">
            {timedMode && (
              <Timer seconds={timeRemaining} warningAt={10} />
            )}
            <TouchableOpacity
              onPress={() => {
                router.replace({
                  pathname: '/(tabs)/quiz',
                  params: {
                    ...(params.topic ? { topic: params.topic } : {}),
                    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
                    timed: String(!timedMode),
                    total: String(totalQuestions),
                  },
                });
              }}
              className={`min-h-[48px] px-4 py-2 rounded-xl border flex-row items-center ${timedMode ? 'bg-primary/10 border-primary/30' : 'bg-surface-card border-surface-border'}`}
            >
              <Ionicons name={timedMode ? 'stopwatch' : 'timer-outline'} size={16} color={timedMode ? COLORS.primary.DEFAULT : COLORS.text.secondary} />
              <Text className={`text-[10px] font-bold font-syne ml-2 ${timedMode ? 'text-primary' : 'text-text-secondary'}`}>
                {timedMode ? 'Timed: On' : 'Timed: Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-surface-border">
          <View 
            className="bg-primary h-full rounded-full" 
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} 
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color={COLORS.primary.DEFAULT} />
          <Text className="text-text-secondary mt-4 text-center font-dmsans">
            Designing a challenging question for you...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="warning-outline" size={48} color={COLORS.error.DEFAULT} />
          <Text className="text-text-primary mt-4 text-center font-bold text-lg mb-6">{error}</Text>
          <TouchableOpacity onPress={startInitialQuiz} className="min-h-[48px] bg-primary py-3 px-8 rounded-xl flex-row items-center">
            <Ionicons name="refresh" size={18} color={COLORS.text.inverse} />
            <Text className="text-text-inverse font-bold ml-2">Retry</Text>
          </TouchableOpacity>
        </View>

      ) : notCovered ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="information-circle" size={48} color={COLORS.primary.DEFAULT} />
          <Text className="text-text-primary mt-4 text-center font-bold text-lg mb-6">
            Not covered in your notes
          </Text>
          <Text className="text-text-secondary text-center font-dmsans text-lg mb-8 max-w-[260px]">
            {notCovered.explanation}
          </Text>
          <TouchableOpacity onPress={startInitialQuiz} className="min-h-[48px] bg-primary py-3 px-8 rounded-xl flex-row items-center">
            <Ionicons name="refresh" size={18} color={COLORS.text.inverse} />
            <Text className="text-text-inverse font-bold ml-2">Try another topic</Text>
          </TouchableOpacity>
        </View>

      ) : questionData && (
        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          <Text className="text-text-primary text-2xl font-bold font-syne mb-8 leading-9">
            {questionData.question}
          </Text>

          <View className="mb-6">
            {questionData.options.map((option, idx) => {
              const value = String(idx);
              return (
                <QuizOption
                  key={idx}
                  label={`${String.fromCharCode(65 + idx)}.  ${option}`}
                  value={value}
                  selectedValue={selectedOption === null ? null : String(selectedOption)}
                  correctValue={showExplanation ? String(questionData.correct) : null}
                  onSelect={(selected) => handleSelectOption(Number(selected))}
                  disabled={showExplanation}
                  className={{ minHeight: 64, marginBottom: 16, paddingHorizontal: 20 }}
                />
              );
            })}
          </View>

          {showExplanation && (
            <View className="bg-surface-card p-5 rounded-2xl border border-surface-border mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color={COLORS.primary.DEFAULT} />
                <Text className="text-text-primary font-bold font-syne text-lg ml-2">Explanation</Text>
              </View>
              <Text className="text-text-secondary text-base font-dmsans leading-6">
                {questionData.explanation}
              </Text>
            </View>
          )}

          {questionData.stepByStep && (
            <View className="bg-primary/10 border border-primary/30 rounded-2xl p-5 mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="construct-outline" size={20} color={COLORS.primary.DEFAULT} />
                <Text className="text-primary font-bold font-syne text-lg ml-2">Step-by-step working</Text>
              </View>
              <Text className="text-text-secondary text-base font-dmsans leading-6 whitespace-pre-line">
                {questionData.stepByStep}
              </Text>
            </View>
          )}

          {calcVerification && (
            <View className={`p-4 rounded-2xl mb-8 flex-row items-start ${calcVerification.ok ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'}`}>
              <Ionicons name={calcVerification.ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={calcVerification.ok ? COLORS.success.DEFAULT : COLORS.error.DEFAULT} className="mt-1" />
              <View className="ml-3">
                <Text className={`text-base font-bold font-syne mb-1 ${calcVerification.ok ? 'text-success' : 'text-error'}`}>
                  {calcVerification.ok ? 'Calculation verified' : 'Answer mismatch'}
                </Text>
                <Text className="text-text-secondary text-sm font-dmsans leading-5">
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
              className="min-h-[48px] bg-primary py-4 rounded-2xl flex-row items-center justify-center mb-10"
              activeOpacity={0.8}
            >
              <Text className="text-text-inverse font-bold text-lg font-syne mr-2">
                {questionIndex + 1 >= totalQuestions ? "Finish Quiz" : "Next Question"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.text.inverse} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
