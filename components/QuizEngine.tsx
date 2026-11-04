import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, ViewStyle } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { getQuizBatch, preloadNextBatch } from "../lib/quizProvider";
import { getDifficultyLevel } from "../lib/difficulty";
import { adjustDifficulty, getBatchSize } from "../lib/sessionIntelligence";
import { generateExplanation } from "../lib/ai";
import { updateStreak } from "../lib/habits";
import { Card, CardTitle, CardDescription } from "./ui/Card";
import * as Haptics from '../lib/haptics';
import { recordProgress } from '../lib/progress';
import { awardXP } from '../lib/xp';
import { useAuthStore } from '../store/authStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { ProgressRing } from './ui/ProgressRing';
import { GlassView } from './ui/GlassView';
import { track } from '../lib/analytics';
import {
  buildPerformanceSessionSummary,
  recordPerformanceSession,
  PerformanceSessionSummary,
} from '../lib/performanceEngine';
import type { LearningTrendOverview } from '../lib/trendEngine';

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface QuizEngineProps {
  subjectName: string;
  topicName: string;
  totalQuestions?: number;
  onFinish?: (score: number, total: number) => void;
  onContinue?: () => void;
  containerStyle?: ViewStyle;
  userId?: string;
  subjectId?: string;
  topicId?: string;
  customQuestions?: Question[];
  onFinishDetailed?: (payload: {
    score: number;
    total: number;
    selectedAnswers: number[];
    questions: Question[];
  }) => void;
  onPerformanceComputed?: (summary: PerformanceSessionSummary) => void;
  onTrendComputed?: (overview: LearningTrendOverview | null) => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ 
  subjectName, 
  topicName, 
  totalQuestions = 5,
  onFinish,
  onContinue,
  containerStyle,
  userId: propUserId,
  subjectId: propSubjectId,
  topicId: propTopicId
  ,customQuestions
  ,onFinishDetailed
  ,onPerformanceComputed
  ,onTrendComputed
}) => {
  const { user } = useAuthStore();
  const { subjectId: storeSubjectId, topicId: storeTopicId } = useRoadmapStore();
  
  const userId = propUserId || user?.id;
  const subjectId = propSubjectId || storeSubjectId;
  const topicId = propTopicId || storeTopicId;
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsBatch, setQuestionsBatch] = useState<Question[]>([]);
  const [questionData, setQuestionData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [masteryLevel, setMasteryLevel] = useState(50); // Default to intermediate
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState<string>('');
  const [interventionText, setInterventionText] = useState<string>('');
  const [quizStartedAt, setQuizStartedAt] = useState<number>(Date.now());
  const [hasTrackedQuizStart, setHasTrackedQuizStart] = useState(false);
  const [hasTrackedQuizEnd, setHasTrackedQuizEnd] = useState(false);
  const selectedAnswersRef = useRef<number[]>([]);
  const responseTimesRef = useRef<number[]>([]);
  const questionStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (userId) {
      updateStreak(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!currentDifficulty) return;
    const newDifficulty = adjustDifficulty({
      correctStreak,
      wrongStreak,
      currentDifficulty
    });

    if (newDifficulty !== currentDifficulty) {
      console.log('[SESSION ADAPT] Shifting difficulty to', newDifficulty);
      setCurrentDifficulty(newDifficulty);
    }
  }, [correctStreak, wrongStreak]);

  useEffect(() => {
    startQuiz();
  }, [subjectName, topicName]);

  const startQuiz = async () => {
    setLoading(true);
    setError('');
    setCorrectStreak(0);
    setWrongStreak(0);
    setInterventionText('');
    setQuizStartedAt(Date.now());
    setHasTrackedQuizStart(false);
    setHasTrackedQuizEnd(false);
    selectedAnswersRef.current = [];
    responseTimesRef.current = [];
    questionStartedAtRef.current = Date.now();
    
    try {
      if (customQuestions && customQuestions.length > 0) {
        const normalized = customQuestions.slice(0, totalQuestions);
        setQuestionsBatch(normalized);
        setQuestionData(normalized[0]);
        questionStartedAtRef.current = Date.now();
        setQuestionIndex(0);
        setScore(0);
        if (userId && !hasTrackedQuizStart) {
          track('quiz_started', {
            user_id: userId,
            learning_mode: useRoadmapStore.getState().learningMode ?? 'unknown',
            subject_id: subjectId,
            subject_name: subjectName,
            topic_id: topicId,
            topic_name: topicName,
            total_questions: totalQuestions,
            difficulty: 'custom',
          });
          setHasTrackedQuizStart(true);
        }
        setLoading(false);
        return;
      }

      const difficulty = currentDifficulty || getDifficultyLevel(masteryLevel);
      if (!currentDifficulty) {
        setCurrentDifficulty(difficulty);
      }
      
      const batchSize = getBatchSize(0);
      const batch = await getQuizBatch({
        topicId: topicId!,
        topicTitle: topicName,
        subjectId: subjectId!,
        difficulty,
        count: batchSize
      });
      
      if (batch && batch.length > 0) {
        const mappedBatch = batch.map(q => ({
          question: q.question,
          options: q.options,
          correct: q.correctIndex,
          explanation: q.explanation
        }));
        
        setQuestionsBatch(mappedBatch);
        setQuestionData(mappedBatch[0]);
        questionStartedAtRef.current = Date.now();
        setQuestionIndex(0);
        setScore(0);
        if (userId && !hasTrackedQuizStart) {
          track('quiz_started', {
            user_id: userId,
            learning_mode: useRoadmapStore.getState().learningMode ?? 'unknown',
            subject_id: subjectId,
            subject_name: subjectName,
            topic_id: topicId,
            topic_name: topicName,
            total_questions: totalQuestions,
            difficulty,
          });
          setHasTrackedQuizStart(true);
        }
        
        preloadNextBatch({
          topicId: topicId!,
          topicTitle: topicName,
          subjectId: subjectId!,
          difficulty,
          count: batchSize
        });
      } else {
        setError('Failed to start quiz. Please try again.');
      }
    } catch (err) {
      setError('Failed to start quiz. Please try again.');
    }
    
    setLoading(false);
  };

  const handleSelectOption = async (index: number) => {
    if (showExplanation || !questionData) return;
    
    Haptics.impactAsync('medium');
    setSelectedOption(index);
    setShowExplanation(true);
    const responseTimeMs = Math.max(0, Date.now() - questionStartedAtRef.current);
    responseTimesRef.current = [...responseTimesRef.current, responseTimeMs];
    
    const isCorrect = index === questionData.correct;
    selectedAnswersRef.current = [...selectedAnswersRef.current];
    selectedAnswersRef.current[questionIndex] = index;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setCorrectStreak(prev => prev + 1);
      setWrongStreak(0);
    } else {
      const newWrongStreak = wrongStreak + 1;
      setWrongStreak(newWrongStreak);
      setCorrectStreak(0);
      
      if (newWrongStreak >= 3 && !interventionText) {
        console.log('[INTERVENTION] Trigger explanation');
        generateExplanation({
          topicTitle: topicName,
          masteryLevel,
          subjectId: subjectId!
        }).then(res => {
          if (res) {
            setInterventionText(res);
          }
        }).catch(() => {});
      }
      
      if (newWrongStreak >= 5) {
        console.log('[FATIGUE] Suggest break');
      }
    }

    // Task 1.1 & 1.2: Record progress and award XP in real-time
    if (!customQuestions && userId && topicId && subjectId) {
      void recordProgress({
        userId,
        topicId,
        subjectId,
        isCorrect
      });

      if (isCorrect) {
        void awardXP(userId, 10);
      }
    }
  };

  const handleNextQuestion = async () => {
    const finalizeQuizSession = async (finalScore: number): Promise<void> => {
      const performanceSummary = buildPerformanceSessionSummary({
        subject: subjectId ?? subjectName,
        topic: topicId ?? topicName,
        totalQuestions,
        correctAnswers: finalScore,
        responseTimesMs: responseTimesRef.current.slice(0, totalQuestions),
      });

      try {
        const recordedPerformance = await recordPerformanceSession({
          userId,
          subject: subjectId ?? subjectName,
          topic: topicId ?? topicName,
          totalQuestions,
          correctAnswers: finalScore,
          responseTimesMs: responseTimesRef.current.slice(0, totalQuestions),
        });

        if (onTrendComputed) {
          onTrendComputed(recordedPerformance.trendOverview);
        }
      } catch {
        if (onTrendComputed) {
          onTrendComputed(null);
        }
      }

      if (onPerformanceComputed) {
        onPerformanceComputed(performanceSummary);
      }

      if (userId && !hasTrackedQuizEnd) {
        const durationMs = Date.now() - quizStartedAt;
        track('quiz_completed', {
          user_id: userId,
          learning_mode: useRoadmapStore.getState().learningMode ?? 'unknown',
          subject_id: subjectId,
          subject_name: subjectName,
          topic_id: topicId,
          topic_name: topicName,
          score: finalScore,
          total_questions: totalQuestions,
          duration_ms: durationMs,
        });
        track('quiz_score_recorded', {
          user_id: userId,
          learning_mode: useRoadmapStore.getState().learningMode ?? 'unknown',
          subject_id: subjectId,
          topic_id: topicId,
          score: finalScore,
          total_questions: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0,
        });
        setHasTrackedQuizEnd(true);
      }

      if (onFinish) {
        onFinish(finalScore, totalQuestions);
      }
      if (onFinishDetailed) {
        onFinishDetailed({
          score: finalScore,
          total: totalQuestions,
          selectedAnswers: selectedAnswersRef.current.slice(0, totalQuestions),
          questions: questionsBatch.slice(0, totalQuestions),
        });
      }
    };

    if (questionIndex + 1 >= totalQuestions) {
       setIsFinished(true);
       void finalizeQuizSession(score);
       return;
    }

    if (questionIndex + 1 < questionsBatch.length) {
      setQuestionData(questionsBatch[questionIndex + 1]);
      questionStartedAtRef.current = Date.now();
      setQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setInterventionText('');
    } else {
      if (customQuestions) {
        setIsFinished(true);
        void finalizeQuizSession(score);
        setLoading(false);
        return;
      }
      setLoading(true);
      
      const batchSize = getBatchSize(wrongStreak);
      const batch = await getQuizBatch({
        topicId: topicId!,
        topicTitle: topicName,
        subjectId: subjectId!,
        difficulty: currentDifficulty,
        count: batchSize
      });
      
      if (batch && batch.length > 0) {
        const mappedBatch = batch.map(q => ({
          question: q.question,
          options: q.options,
          correct: q.correctIndex,
          explanation: q.explanation
        }));
        
        setQuestionsBatch(prev => [...prev, ...mappedBatch]);
        setQuestionData(mappedBatch[0]);
        questionStartedAtRef.current = Date.now();
        setQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowExplanation(false);
        setInterventionText('');
        
        preloadNextBatch({
          topicId: topicId!,
          topicTitle: topicName,
          subjectId: subjectId!,
          difficulty: currentDifficulty,
          count: batchSize
        });
      } else {
        setIsFinished(true);
        void finalizeQuizSession(score);
      }
      
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsFinished(false);
    startQuiz();
  };

  if (isFinished) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const feedback = percentage >= 80 ? "Excellent mastery" : percentage >= 50 ? "Good progress" : "Keep practicing";
    const accentColor = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";
    const earnedXP = percentage >= 80 ? 20 : percentage >= 50 ? 10 : 5;

    return (
      <View className="flex-1 items-center justify-center" style={containerStyle}>
        <Card elevated className="w-full p-8 items-center overflow-hidden relative">
          <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ backgroundColor: accentColor }} />
          
          <ProgressRing 
            progress={percentage} 
            size={120} 
            strokeWidth={10} 
            color={accentColor} 
            className="mb-6" 
          />

          <CardTitle className="text-4xl mb-2 text-center">{feedback}</CardTitle>
          <CardDescription className="text-lg mb-4 text-center">
            You answered {score} out of {totalQuestions} correctly.
          </CardDescription>

          {/* XP Badge */}
          <View className="bg-brand-500/10 px-6 py-3 rounded-2xl border border-brand-500/30 mb-8 flex-row items-center">
             <Ionicons name="sparkles" size={20} color="#4f7cff" />
             <Text className="text-white font-bold font-syne text-xl ml-2">
               +{earnedXP} XP
             </Text>
          </View>

          <View className="w-full flex-row">
            <TouchableOpacity 
              className="bg-surface-elevated flex-1 py-5 rounded-2xl flex-row items-center justify-center mr-3"
              onPress={handleTryAgain}
            >
              <Ionicons name="refresh" size={18} color="#8a8fa3" />
              <Text className="text-text-muted font-bold font-syne text-lg ml-2">Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="bg-brand-500 flex-2 py-5 rounded-3xl flex-row items-center justify-center shadow-lg shadow-brand-500/30"
              style={{ flex: 2 }}
              onPress={() => onContinue ? onContinue() : handleTryAgain()}
            >
              <Text className="text-white font-bold font-syne text-lg mr-2">Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1" style={containerStyle}>
      {/* Progress Header */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[#8a8fa3] font-dmsans font-bold">
            Question {questionIndex + 1} of {totalQuestions}
          </Text>
          <View className="bg-[#4f7cff]/10 px-3 py-1 rounded-full">
            <Text className="text-[#4f7cff] font-bold font-syne text-[10px] uppercase">{subjectName}</Text>
          </View>
        </View>
        <View className="w-full bg-[#161920] h-1.5 rounded-full overflow-hidden border border-[#2a2f3d]">
          <View 
            className="bg-[#4f7cff] h-full rounded-full" 
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} 
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f7cff" />
          <Text className="text-[#8a8fa3] mt-4 text-center font-dmsans">
            Designing a challenging question for you...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text className="text-white mt-4 text-center font-bold text-lg mb-6">{error}</Text>
          <TouchableOpacity onPress={startQuiz} className="bg-[#4f7cff] py-3 px-8 rounded-xl flex-row items-center">
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text className="text-white font-bold ml-2">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : questionData && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="text-white text-2xl font-bold font-syne mb-8 leading-9">
            {questionData.question}
          </Text>

          <View className="mb-6">
            {questionData.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = showExplanation && idx === questionData.correct;
              const isWrong = showExplanation && isSelected && !isCorrect;
              
              const borderColor = isCorrect ? 'border-green-500' : isWrong ? 'border-red-500' : isSelected ? 'border-[#4f7cff]' : 'border-[#2a2f3d]';
              const bgColor = isCorrect ? 'bg-green-500/10' : isWrong ? 'bg-red-500/10' : isSelected ? 'bg-[#4f7cff]/10' : 'bg-[#161920]';

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
                  {showExplanation && isCorrect && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
                  {showExplanation && isWrong && <Ionicons name="close-circle" size={24} color="#ef4444" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {showExplanation && (
            <Card className="mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color="#4f7cff" />
                <CardTitle className="text-lg ml-2">Explanation</CardTitle>
              </View>
              <CardDescription className="text-base leading-6">
                {questionData.explanation}
              </CardDescription>
            </Card>
          )}

          {showExplanation && interventionText && (
            <GlassView className="mb-8" borderColor="#f59e0b">
              <View className="flex-row items-center mb-2">
                <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
                <Text className="text-lg ml-2 text-[#f59e0b] font-syne font-bold">Tutor Intervention</Text>
              </View>
              <Text className="text-base leading-6 text-white/90 font-dmsans">
                {interventionText}
              </Text>
            </GlassView>
          )}

          {showExplanation && wrongStreak >= 5 && (
            <Text className="text-[#f59e0b] text-center font-bold mb-4 font-dmsans">
              It seems you are struggling. Taking a short break might help!
            </Text>
          )}

          {showExplanation && (
            <TouchableOpacity 
              onPress={handleNextQuestion}
              className="bg-[#4f7cff] py-4 rounded-2xl flex-row items-center justify-center mb-10 shadow-lg shadow-[#4f7cff]/30"
            >
              <Text className="text-white font-bold text-lg font-syne mr-2">
                {questionIndex + 1 >= totalQuestions ? "Finish Quiz" : "Next Question"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};
