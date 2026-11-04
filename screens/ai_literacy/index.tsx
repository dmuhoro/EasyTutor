import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { QuizEngine } from '../../components/QuizEngine';
import {
  buildMissedQuestionsForReview,
  buildRemediationFromAnswers,
  buildSpacedReviewQuestions,
  computeLiteracyOverview,
  computeWeakestSection,
  fetchLiteracyContent,
  fetchLiteracyProgress,
  getLiteracyResumeState,
  getLiteracyStreak,
  getNextRecommendedUnit,
  getPortalBridgeRecommendation,
  getSpacedReviewCandidates,
  hasUnit3Mastery,
  isUnitUnlocked,
  LiteracyOverview,
  LiteracyProgress,
  LiteracyQuestion,
  LiteracyResumeState,
  LiteracyUnit,
  recordLiteracyQuizAttempt,
  RemediationItem,
  saveLiteracyResumeState,
  touchLiteracyStreak,
} from '../../lib/aiLiteracy';
import { track } from '../../lib/analytics';

type QuizPayload = {
  selectedAnswers: number[];
  questions: LiteracyQuestion[];
  score: number;
  total: number;
};

export default function AILiteracyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { learningMode } = useRoadmapStore();
  const [units, setUnits] = useState<LiteracyUnit[]>([]);
  const [progress, setProgress] = useState<LiteracyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<LiteracyUnit | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [spacedReviewMode, setSpacedReviewMode] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<LiteracyQuestion[]>([]);
  const [spacedReviewUnit, setSpacedReviewUnit] = useState<LiteracyUnit | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [resumeState, setResumeState] = useState<LiteracyResumeState | null>(null);
  const [hasTrackedResume, setHasTrackedResume] = useState(false);
  const [remediation, setRemediation] = useState<RemediationItem[]>([]);
  const [lastQuizPayload, setLastQuizPayload] = useState<QuizPayload | null>(null);
  const [overview, setOverview] = useState<LiteracyOverview | null>(null);
  const [masteryCelebration, setMasteryCelebration] = useState<{
    firstAttemptPct: number;
    bestPct: number;
    nextUnitTitle: string | null;
    weakestSection: string | null;
    weakestScore: number | null;
    showPortalBridge: boolean;
  } | null>(null);
  const [completionInsight, setCompletionInsight] = useState<{
    scorePct: number;
    strongest: string;
    weakest: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [content, saved, resume, streak] = await Promise.all([
        fetchLiteracyContent(),
        user?.id ? fetchLiteracyProgress(user.id) : Promise.resolve([]),
        user?.id ? getLiteracyResumeState(user.id) : Promise.resolve(null),
        user?.id ? getLiteracyStreak(user.id) : Promise.resolve(0),
      ]);
      setUnits(content);
      setProgress(saved);
      setResumeState(resume);
      setOverview(computeLiteracyOverview(content, saved, streak));
      setLoading(false);
    })();
  }, [user?.id]);

  const progressMap = useMemo(() => {
    const map = new Map<number, LiteracyProgress>();
    for (const item of progress) map.set(item.unit_number, item);
    return map;
  }, [progress]);

  const spacedReviewCandidates = useMemo(
    () => getSpacedReviewCandidates(units, progress),
    [units, progress],
  );

  const portalBridge = useMemo(
    () => (hasUnit3Mastery(progress) ? getPortalBridgeRecommendation(learningMode) : null),
    [progress, learningMode],
  );

  const calcScorePct = (score: number, total: number) =>
    total > 0 ? Math.round((score / total) * 100) : 0;

  const refreshOverview = async (nextProgress: LiteracyProgress[]) => {
    if (!user?.id) return;
    const streak = await getLiteracyStreak(user.id);
    setOverview(computeLiteracyOverview(units, nextProgress, streak));
  };

  const handleStartUnit = (unit: LiteracyUnit) => {
    if (!isUnitUnlocked(unit.unit_number, progress)) return;
    setSelectedUnit(unit);
    setQuizMode(false);
    setReviewMode(false);
    setRemediation([]);
    setMasteryCelebration(null);
    setCompletionInsight(null);
    setLastQuizPayload(null);
    const resumeSection = resumeState?.last_unit === unit.unit_number ? resumeState.last_section : 0;
    setCurrentSection(resumeSection ?? 0);
    if (user?.id) {
      track('ai_literacy_started', {
        user_id: user.id,
        unit_number: unit.unit_number,
        portal: 'ai_literacy',
      });
      void saveLiteracyResumeState(user.id, unit.unit_number, resumeSection ?? 0);
      void touchLiteracyStreak(user.id).then(() => refreshOverview(progress));
    }
  };

  const handleCompleteUnit = async (_score: number, _total: number) => {
    setQuizMode(false);
  };

  const applyQuizCompletion = async (payload: QuizPayload) => {
    if (!selectedUnit || !user?.id) return;
    const quizContext = {
      unit: selectedUnit,
      questions: payload.questions,
      selectedAnswers: payload.selectedAnswers,
    };
    const result = await recordLiteracyQuizAttempt(
      user.id,
      selectedUnit.unit_number,
      payload.score,
      payload.total,
      quizContext,
    );
    const next = await fetchLiteracyProgress(user.id);
    setProgress(next);
    await refreshOverview(next);

    track('ai_literacy_unit_completed', {
      user_id: user.id,
      unit_number: selectedUnit.unit_number,
      score: payload.score,
      total_questions: payload.total,
      portal: 'ai_literacy',
    });

    const unitProgress = next.find((item) => item.unit_number === selectedUnit.unit_number);
    const weakestFromQuiz = computeWeakestSection(
      selectedUnit,
      payload.questions,
      payload.selectedAnswers,
    );

    if (result.newlyMastered) {
      track('ai_literacy_mastered', {
        user_id: user.id,
        unit_number: selectedUnit.unit_number,
        best_score: result.bestScore,
        attempts_count: result.attemptsCount,
        portal: 'ai_literacy',
      });
      const nextUnit = getNextRecommendedUnit(units, next);
      setMasteryCelebration({
        firstAttemptPct: result.firstAttemptPct,
        bestPct: calcScorePct(result.bestScore, payload.total),
        nextUnitTitle: nextUnit?.title ?? null,
        weakestSection: unitProgress?.weakest_section ?? weakestFromQuiz.heading,
        weakestScore: unitProgress?.weakest_score ?? weakestFromQuiz.scorePct,
        showPortalBridge: selectedUnit.unit_number === 3,
      });
    }

    const strongest = selectedUnit.sections[0]?.heading ?? 'Core concepts';
    const weakest = unitProgress?.weakest_section ?? weakestFromQuiz.heading;
    setCompletionInsight({
      scorePct: result.scorePct,
      strongest,
      weakest,
      message: result.mastered
        ? 'Great work. You are thinking critically with AI, not just consuming outputs.'
        : 'You are building strong foundations. Review missed concepts and try again confidently.',
    });
  };

  const handleFinishDetailed = (payload: QuizPayload) => {
    setLastQuizPayload(payload);
    void applyQuizCompletion(payload);
    const pct = calcScorePct(payload.score, payload.total);
    if (!selectedUnit || pct >= 80) {
      setRemediation([]);
      return;
    }
    const rem = buildRemediationFromAnswers(payload.questions, payload.selectedAnswers);
    setRemediation(rem);
    if (user?.id) {
      track('ai_literacy_remediation_viewed', {
        user_id: user.id,
        unit_number: selectedUnit.unit_number,
        score: payload.score,
        total_questions: payload.total,
        portal: 'ai_literacy',
      });
    }
  };

  const handleStartSpacedReview = (unit: LiteracyUnit, unitProgress: LiteracyProgress) => {
    const questions = buildSpacedReviewQuestions(unit, unitProgress);
    if (questions.length === 0 || !user?.id) return;
    track('ai_literacy_spaced_review_started', {
      user_id: user.id,
      unit_number: unit.unit_number,
      weakest_section: unitProgress.weakest_section ?? 'unknown',
      question_count: questions.length,
      portal: 'ai_literacy',
    });
    setSpacedReviewUnit(unit);
    setReviewQuestions(questions);
    setSpacedReviewMode(true);
  };

  const handleStartReview = () => {
    if (!lastQuizPayload || !selectedUnit || !user?.id) return;
    const missed = buildMissedQuestionsForReview(
      lastQuizPayload.questions,
      lastQuizPayload.selectedAnswers,
    );
    if (missed.length === 0) return;
    track('ai_literacy_review_started', {
      user_id: user.id,
      unit_number: selectedUnit.unit_number,
      missed_count: missed.length,
      portal: 'ai_literacy',
    });
    setReviewQuestions(missed);
    setReviewMode(true);
  };

  const continueUnit = () => {
    if (!resumeState) return;
    const unit = units.find((u) => u.unit_number === resumeState.last_unit);
    if (!unit || !isUnitUnlocked(unit.unit_number, progress)) return;
    setSelectedUnit(unit);
    setCurrentSection(resumeState.last_section ?? 0);
    setQuizMode(false);
    setReviewMode(false);
    if (user?.id && !hasTrackedResume) {
      track('ai_literacy_resumed', {
        user_id: user.id,
        unit_number: unit.unit_number,
        section: resumeState.last_section ?? 0,
        portal: 'ai_literacy',
      });
      setHasTrackedResume(true);
    }
  };

  const moveSection = (delta: number) => {
    if (!selectedUnit) return;
    const next = Math.max(0, Math.min(selectedUnit.sections.length - 1, currentSection + delta));
    setCurrentSection(next);
    if (user?.id) {
      void saveLiteracyResumeState(user.id, selectedUnit.unit_number, next);
      setResumeState({
        last_unit: selectedUnit.unit_number,
        last_section: next,
        last_opened_at: new Date().toISOString(),
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12] items-center justify-center">
        <ActivityIndicator size="large" color="#4f7cff" />
        <Text className="text-[#8a8fa3] mt-4 font-dmsans">Loading AI Literacy...</Text>
      </SafeAreaView>
    );
  }

  if (spacedReviewMode && spacedReviewUnit && reviewQuestions.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
        <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setSpacedReviewMode(false)} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold font-syne flex-1" numberOfLines={1}>
            Quick Review — {spacedReviewUnit.title}
          </Text>
        </View>
        <View className="flex-1 px-5 pt-6">
          <QuizEngine
            subjectName="AI Literacy"
            topicName={`${spacedReviewUnit.title} Spaced Review`}
            totalQuestions={reviewQuestions.length}
            subjectId="ai_literacy"
            topicId={`ai_literacy_unit_${spacedReviewUnit.unit_number}_spaced`}
            customQuestions={reviewQuestions}
            onContinue={() => setSpacedReviewMode(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedUnit && reviewMode && reviewQuestions.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
        <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setReviewMode(false)} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold font-syne flex-1" numberOfLines={1}>
            Review Missed — {selectedUnit.title}
          </Text>
        </View>
        <View className="flex-1 px-5 pt-6">
          <QuizEngine
            subjectName="AI Literacy"
            topicName={`${selectedUnit.title} Review`}
            totalQuestions={reviewQuestions.length}
            subjectId="ai_literacy"
            topicId={`ai_literacy_unit_${selectedUnit.unit_number}_review`}
            customQuestions={reviewQuestions}
            onContinue={() => setReviewMode(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedUnit && quizMode) {
    return (
      <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
        <View className="px-5 py-6 border-b border-[#2a2f3d] flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setQuizMode(false)} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold font-syne flex-1" numberOfLines={1}>{selectedUnit.title} Quiz</Text>
        </View>
        <View className="flex-1 px-5 pt-6">
          <QuizEngine
            subjectName="AI Literacy"
            topicName={selectedUnit.title}
            totalQuestions={selectedUnit.quiz.length}
            subjectId="ai_literacy"
            topicId={`ai_literacy_unit_${selectedUnit.unit_number}`}
            customQuestions={selectedUnit.quiz}
            onFinish={handleCompleteUnit}
            onFinishDetailed={handleFinishDetailed}
            onContinue={() => setQuizMode(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0d0f12]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#4f7cff" />
          </TouchableOpacity>
          <View>
            <Text className="text-[#4f7cff] font-bold font-syne text-[10px] uppercase tracking-widest mb-1">Flagship Module</Text>
            <Text className="text-white text-2xl font-bold font-syne">AI Literacy</Text>
          </View>
        </View>

        {overview ? (
          <View className="mb-6">
            <View className="flex-row mb-3">
              <View className="flex-1 bg-[#161920] rounded-2xl p-4 mr-2 border border-[#2a2f3d]">
                <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold mb-1">Completed</Text>
                <Text className="text-white text-xl font-bold font-syne">{overview.unitsCompleted}/{overview.totalUnits}</Text>
              </View>
              <View className="flex-1 bg-[#161920] rounded-2xl p-4 ml-2 border border-[#2a2f3d]">
                <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold mb-1">Mastered</Text>
                <Text className="text-[#22c55e] text-xl font-bold font-syne">{overview.unitsMastered}/{overview.totalUnits}</Text>
              </View>
            </View>
            <View className="flex-row">
              <View className="flex-1 bg-[#161920] rounded-2xl p-4 mr-2 border border-[#2a2f3d]">
                <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold mb-1">Streak</Text>
                <Text className="text-white text-xl font-bold font-syne">{overview.streak} day{overview.streak === 1 ? '' : 's'}</Text>
              </View>
              <View className="flex-1 bg-[#161920] rounded-2xl p-4 ml-2 border border-[#2a2f3d]">
                <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold mb-1">Progress</Text>
                <Text className="text-[#4f7cff] text-xl font-bold font-syne">{overview.overallProgressPct}%</Text>
              </View>
            </View>
          </View>
        ) : null}

        {portalBridge ? (
          <View className="bg-[#121823] rounded-[20px] p-4 mb-6 border border-[#35508d]">
            <Text className="text-[#9eb8ff] text-[10px] uppercase tracking-widest font-bold mb-1">Next Step</Text>
            <Text className="text-white font-syne font-bold mb-2">{portalBridge.message}</Text>
            <Text className="text-[#cfd6ec] font-dmsans mb-3">
              Continue in {portalBridge.title} and use AI responsibly in your real learning path.
            </Text>
            <TouchableOpacity
              className="bg-[#4f7cff] py-2.5 rounded-xl items-center"
              onPress={() => router.push(portalBridge.route as any)}
            >
              <Text className="text-white font-bold font-syne">Go to {portalBridge.title}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {spacedReviewCandidates.map(({ unit, progress: unitProgress }) => (
          <View key={`spaced-${unit.unit_number}`} className="bg-[#1a1520] rounded-[20px] p-4 mb-6 border border-[#5c4a2b]">
            <Text className="text-[#f5b26b] text-[10px] uppercase tracking-widest font-bold mb-1">Spaced Review</Text>
            <Text className="text-white font-syne font-bold mb-2">Time for a quick review.</Text>
            <Text className="text-[#d9d2c9] font-dmsans mb-1">{unit.title}</Text>
            {unitProgress.weakest_section ? (
              <Text className="text-[#f3c08b] font-dmsans text-sm mb-3">
                Focus: {unitProgress.weakest_section} ({unitProgress.weakest_score ?? 0}% last time)
              </Text>
            ) : null}
            <TouchableOpacity
              className="bg-[#f59e0b] py-2.5 rounded-xl items-center"
              onPress={() => handleStartSpacedReview(unit, unitProgress)}
            >
              <Text className="text-white font-bold font-syne">Start 3-Question Review</Text>
            </TouchableOpacity>
          </View>
        ))}

        {resumeState ? (
          <View className="bg-[#1b2335] rounded-[20px] p-4 mb-6 border border-[#35508d]">
            <Text className="text-[#9eb8ff] text-[10px] uppercase tracking-widest font-bold mb-1">Continue Learning</Text>
            <Text className="text-white font-syne font-bold mb-3">
              Continue Unit {resumeState.last_unit} from section {resumeState.last_section + 1}
            </Text>
            <TouchableOpacity className="bg-[#4f7cff] py-2.5 rounded-xl items-center" onPress={continueUnit}>
              <Text className="text-white font-bold font-syne">Resume</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {units.map((unit) => {
          const unitProgress = progressMap.get(unit.unit_number);
          const unlocked = isUnitUnlocked(unit.unit_number, progress);
          const mastered = Boolean(unitProgress?.mastered);
          const attempted = (unitProgress?.attempts_count ?? 0) > 0;

          return (
            <View
              key={unit.unit_number}
              className={`rounded-[28px] p-6 mb-5 border ${unlocked ? 'bg-[#161920] border-[#2a2f3d]' : 'bg-[#12141a] border-[#1f2430] opacity-80'}`}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`text-lg font-bold font-syne ${unlocked ? 'text-white' : 'text-[#6b7280]'}`}>{unit.title}</Text>
                {!unlocked ? (
                  <View className="bg-[#374151]/30 px-3 py-1 rounded-full flex-row items-center">
                    <Ionicons name="lock-closed" size={10} color="#9ca3af" />
                    <Text className="text-[#9ca3af] text-[10px] uppercase font-bold ml-1">Locked</Text>
                  </View>
                ) : mastered ? (
                  <View className="bg-[#22c55e]/20 px-3 py-1 rounded-full">
                    <Text className="text-[#22c55e] text-[10px] uppercase font-bold">Mastered</Text>
                  </View>
                ) : attempted ? (
                  <View className="bg-[#4f7cff]/20 px-3 py-1 rounded-full">
                    <Text className="text-[#9eb8ff] text-[10px] uppercase font-bold">In Progress</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-[#8a8fa3] font-dmsans mb-4">{unit.objective}</Text>
              {!unlocked ? (
                <Text className="text-[#6b7280] font-dmsans text-sm mb-2">
                  Complete Unit {unit.unit_number - 1} with 80%+ mastery to unlock.
                </Text>
              ) : null}
              {mastered && unitProgress?.weakest_section ? (
                <Text className="text-[#9fd7a7] font-dmsans text-sm mb-3">
                  Weakest area: {unitProgress.weakest_section} ({unitProgress.weakest_score ?? 0}%)
                </Text>
              ) : null}
              <TouchableOpacity
                className={`py-3 rounded-xl items-center ${unlocked ? 'bg-[#4f7cff]' : 'bg-[#2a2f3d]'}`}
                disabled={!unlocked}
                onPress={() => handleStartUnit(unit)}
              >
                <Text className={`font-bold font-syne ${unlocked ? 'text-white' : 'text-[#6b7280]'}`}>
                  {!unlocked ? 'Locked' : mastered ? 'Review Unit' : attempted ? 'Continue Unit' : 'Start Unit'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {selectedUnit ? (
          <View className="bg-[#161920] rounded-[28px] p-6 mb-10 border border-[#2a2f3d]">
            <Text className="text-white text-xl font-bold font-syne mb-2">{selectedUnit.title}</Text>
            <View className="mb-4">
              <View className="w-full bg-[#2a2f3d] h-2 rounded-full overflow-hidden">
                <View className="bg-[#4f7cff] h-full" style={{ width: `${((currentSection + 1) / selectedUnit.sections.length) * 100}%` }} />
              </View>
              <Text className="text-[#8a8fa3] text-xs mt-2 font-dmsans">Section {currentSection + 1} of {selectedUnit.sections.length}</Text>
            </View>
            <View className="mb-5">
              <Text className="text-[#4f7cff] font-bold font-syne text-lg mb-2">{selectedUnit.sections[currentSection]?.heading}</Text>
              <Text className="text-[#d8dded] font-dmsans leading-7">{selectedUnit.sections[currentSection]?.content}</Text>
            </View>
            <View className="flex-row mb-4">
              <TouchableOpacity
                disabled={currentSection === 0}
                className={`flex-1 py-3 rounded-xl items-center mr-2 ${currentSection === 0 ? 'bg-[#2a2f3d]' : 'bg-[#22314f]'}`}
                onPress={() => moveSection(-1)}
              >
                <Text className="text-white font-bold">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={currentSection >= selectedUnit.sections.length - 1}
                className={`flex-1 py-3 rounded-xl items-center ml-2 ${currentSection >= selectedUnit.sections.length - 1 ? 'bg-[#2a2f3d]' : 'bg-[#4f7cff]'}`}
                onPress={() => moveSection(1)}
              >
                <Text className="text-white font-bold">Next Section</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="bg-[#22c55e] py-3 rounded-xl items-center mt-2"
              onPress={() => setQuizMode(true)}
            >
              <Text className="text-white font-bold font-syne">Take {selectedUnit.quiz.length}-Question Quiz</Text>
            </TouchableOpacity>

            {masteryCelebration ? (
              <View className="mt-6 p-4 rounded-2xl bg-[#0f1f14] border border-[#2d6b3f]">
                <Text className="text-[#22c55e] font-syne font-bold text-lg mb-2">Mastery Achieved</Text>
                <Text className="text-[#cfd6ec] font-dmsans mb-1">
                  Score improved from {masteryCelebration.firstAttemptPct}% to {masteryCelebration.bestPct}%
                </Text>
                {masteryCelebration.weakestSection ? (
                  <Text className="text-[#cfd6ec] font-dmsans mb-1">
                    Weakest area: {masteryCelebration.weakestSection} ({masteryCelebration.weakestScore ?? 0}%)
                  </Text>
                ) : null}
                {masteryCelebration.nextUnitTitle ? (
                  <Text className="text-[#9fd7a7] font-dmsans">
                    Next recommended: {masteryCelebration.nextUnitTitle}
                  </Text>
                ) : (
                  <Text className="text-[#9fd7a7] font-dmsans">You have completed all available units. Excellent work.</Text>
                )}
                {masteryCelebration.showPortalBridge && portalBridge ? (
                  <TouchableOpacity
                    className="bg-[#4f7cff] py-3 rounded-xl items-center mt-4"
                    onPress={() => router.push(portalBridge.route as any)}
                  >
                    <Text className="text-white font-bold font-syne">{portalBridge.message}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {completionInsight ? (
              <View className="mt-6 p-4 rounded-2xl bg-[#121823] border border-[#2b3f6b]">
                <Text className="text-white font-syne font-bold mb-2">Completion Insight</Text>
                <Text className="text-[#9eb8ff] font-dmsans mb-1">Score: {completionInsight.scorePct}%</Text>
                <Text className="text-[#cfd6ec] font-dmsans mb-1">Strongest topic: {completionInsight.strongest}</Text>
                <Text className="text-[#cfd6ec] font-dmsans mb-2">Weakest topic: {completionInsight.weakest}</Text>
                <Text className="text-[#9fd7a7] font-dmsans">{completionInsight.message}</Text>
              </View>
            ) : null}

            {remediation.length > 0 ? (
              <View className="mt-6 p-4 rounded-2xl bg-[#1c1510] border border-[#6b4a2b]">
                <Text className="text-[#f5b26b] font-syne font-bold mb-3">Review What You Missed</Text>
                {remediation.map((item, idx) => (
                  <View key={`${item.question}-${idx}`} className="mb-4">
                    <Text className="text-white font-dmsans mb-1">{item.question}</Text>
                    <Text className="text-[#9fd7a7] font-dmsans text-sm mb-1">Correct answer: {item.correct_answer}</Text>
                    <Text className="text-[#d9d2c9] font-dmsans text-sm mb-1">{item.explanation}</Text>
                    <Text className="text-[#f3c08b] font-dmsans text-sm">{item.why_it_matters}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  className="bg-[#f59e0b] py-3 rounded-xl items-center mt-2"
                  onPress={handleStartReview}
                >
                  <Text className="text-white font-bold font-syne">Review Missed Questions</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
