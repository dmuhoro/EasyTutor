import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../src/infrastructure/database';

export type LiteracyQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type LiteracySection = {
  heading: string;
  content: string;
};

export type LiteracyUnit = {
  unit_number: number;
  title: string;
  objective: string;
  sections: LiteracySection[];
  quiz: LiteracyQuestion[];
};

export type LiteracyProgress = {
  unit_number: number;
  completed: boolean;
  score: number;
  total_questions: number;
  completed_at?: string | null;
  last_unit?: number | null;
  last_section?: number | null;
  last_opened_at?: string | null;
  first_attempt_score?: number | null;
  best_score?: number | null;
  attempts_count?: number;
  mastered?: boolean;
  weakest_section?: string | null;
  weakest_score?: number | null;
};

export type LiteracyResumeState = {
  last_unit: number;
  last_section: number;
  last_opened_at: string;
};

export type RemediationItem = {
  question: string;
  correct_answer: string;
  explanation: string;
  why_it_matters: string;
};

export type QuizAttemptResult = {
  mastered: boolean;
  newlyMastered: boolean;
  firstAttemptScore: number;
  bestScore: number;
  attemptsCount: number;
  scorePct: number;
  firstAttemptPct: number;
  previousBestPct: number;
};

export type LiteracyOverview = {
  unitsCompleted: number;
  unitsMastered: number;
  totalUnits: number;
  overallProgressPct: number;
  streak: number;
};

export const LITERACY_MASTERY_THRESHOLD = 80;
export const SPACED_REVIEW_HOURS = 48;
export const SPACED_REVIEW_QUESTION_COUNT = 3;

export type WeakestSectionResult = {
  heading: string;
  scorePct: number;
};

export type PortalBridgeRecommendation = {
  mode: 'high_school' | 'university' | 'self_directed';
  title: string;
  route: string;
  message: string;
};

const CONTENT_CACHE_KEY = 'ai_literacy_content_cache_v1';
const PROGRESS_CACHE_KEY_PREFIX = 'ai_literacy_progress_cache_v1';
const RESUME_CACHE_KEY_PREFIX = 'ai_literacy_resume_cache_v1';
const STREAK_CACHE_KEY_PREFIX = 'ai_literacy_streak_v1';

const progressKey = (userId: string) => `${PROGRESS_CACHE_KEY_PREFIX}:${userId}`;
const resumeKey = (userId: string) => `${RESUME_CACHE_KEY_PREFIX}:${userId}`;
const streakKey = (userId: string) => `${STREAK_CACHE_KEY_PREFIX}:${userId}`;

const scorePct = (score: number, total: number): number =>
  total > 0 ? Math.round((score / total) * 100) : 0;

export async function fetchLiteracyContent(): Promise<LiteracyUnit[]> {
  const db = Database.getClient();
  try {
    const { data, error } = await db
      .from('ai_literacy_content')
      .select('unit_number, title, objective, sections, quiz')
      .eq('portal_type', 'ai_literacy')
      .order('unit_number', { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as LiteracyUnit[];
    if (rows.length > 0) {
      await AsyncStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(rows));
      return rows;
    }
  } catch {
    // fallback below
  }

  const cached = await AsyncStorage.getItem(CONTENT_CACHE_KEY);
  return cached ? (JSON.parse(cached) as LiteracyUnit[]) : [];
}

const PROGRESS_SELECT =
  'unit_number, completed, score, total_questions, completed_at, last_unit, last_section, last_opened_at, first_attempt_score, best_score, attempts_count, mastered, weakest_section, weakest_score';

export async function fetchLiteracyProgress(userId: string): Promise<LiteracyProgress[]> {
  const db = Database.getClient();
  try {
    const { data, error } = await db
      .from('ai_literacy_progress')
      .select(PROGRESS_SELECT)
      .eq('user_id', userId)
      .eq('portal_type', 'ai_literacy')
      .order('unit_number', { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as LiteracyProgress[];
    await AsyncStorage.setItem(progressKey(userId), JSON.stringify(rows));
    return rows;
  } catch {
    const cached = await AsyncStorage.getItem(progressKey(userId));
    return cached ? (JSON.parse(cached) as LiteracyProgress[]) : [];
  }
}

export async function clearLiteracyResumeState(userId: string): Promise<void> {
  await AsyncStorage.removeItem(resumeKey(userId));
}

const upsertProgressLocally = async (userId: string, record: LiteracyProgress): Promise<void> => {
  const existing = await fetchLiteracyProgress(userId);
  const next = [
    ...existing.filter((item) => item.unit_number !== record.unit_number),
    record,
  ].sort((a, b) => a.unit_number - b.unit_number);
  await AsyncStorage.setItem(progressKey(userId), JSON.stringify(next));
};

const syncProgressToCloud = async (userId: string, record: LiteracyProgress): Promise<void> => {
  const db = Database.getClient();
  const now = new Date().toISOString();
  try {
    const { error } = await db
      .from('ai_literacy_progress')
      .upsert({
        user_id: userId,
        unit_number: record.unit_number,
        score: record.best_score ?? record.score,
        total_questions: record.total_questions,
        completed: record.completed,
        completed_at: record.completed_at ?? null,
        portal_type: 'ai_literacy',
        updated_at: now,
        first_attempt_score: record.first_attempt_score ?? null,
        best_score: record.best_score ?? null,
        attempts_count: record.attempts_count ?? 0,
        mastered: record.mastered ?? false,
        weakest_section: record.weakest_section ?? null,
        weakest_score: record.weakest_score ?? null,
        last_unit: record.last_unit ?? null,
        last_section: record.last_section ?? null,
        last_opened_at: record.last_opened_at ?? null,
      }, {
        onConflict: 'user_id,unit_number',
      });
    if (error) throw error;
  } catch {
    // Offline-first: local cache already updated.
  }
};

export function computeWeakestSection(
  unit: LiteracyUnit,
  questions: LiteracyQuestion[],
  selectedAnswers: number[],
): WeakestSectionResult {
  const sectionStats = new Map<string, { correct: number; total: number }>();
  const sectionsPerQuestion = Math.max(1, unit.sections.length / Math.max(questions.length, 1));

  questions.forEach((q, index) => {
    const sectionIdx = Math.min(
      Math.floor(index * sectionsPerQuestion),
      unit.sections.length - 1,
    );
    const heading = unit.sections[sectionIdx]?.heading ?? 'Core concepts';
    const stat = sectionStats.get(heading) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (selectedAnswers[index] === q.correct) stat.correct += 1;
    sectionStats.set(heading, stat);
  });

  let heading = unit.sections[0]?.heading ?? 'Core concepts';
  let worstRate = 2;
  let worstPct = 0;

  for (const [sectionHeading, stat] of sectionStats) {
    const rate = stat.total > 0 ? stat.correct / stat.total : 0;
    const pct = stat.total > 0 ? Math.round(rate * 100) : 0;
    if (rate < worstRate) {
      worstRate = rate;
      heading = sectionHeading;
      worstPct = pct;
    }
  }

  return { heading, scorePct: worstPct };
}

export async function recordLiteracyQuizAttempt(
  userId: string,
  unitNumber: number,
  score: number,
  totalQuestions: number,
  quizContext?: {
    unit: LiteracyUnit;
    questions: LiteracyQuestion[];
    selectedAnswers: number[];
  },
): Promise<QuizAttemptResult> {
  const existingList = await fetchLiteracyProgress(userId);
  const existing = existingList.find((item) => item.unit_number === unitNumber);
  const pct = scorePct(score, totalQuestions);

  const attemptsCount = (existing?.attempts_count ?? 0) + 1;
  const firstAttemptScore = existing?.first_attempt_score ?? score;
  const previousBest = existing?.best_score ?? 0;
  const bestScore = Math.max(previousBest, score);
  const bestPct = scorePct(bestScore, totalQuestions);
  const wasMastered = existing?.mastered === true;
  const mastered = bestPct >= LITERACY_MASTERY_THRESHOLD;
  const newlyMastered = mastered && !wasMastered;
  const now = new Date().toISOString();

  let weakestSection: string | null = existing?.weakest_section ?? null;
  let weakestScore: number | null = existing?.weakest_score ?? null;
  if (quizContext) {
    const weakest = computeWeakestSection(
      quizContext.unit,
      quizContext.questions,
      quizContext.selectedAnswers,
    );
    weakestSection = weakest.heading;
    weakestScore = weakest.scorePct;
  }

  const record: LiteracyProgress = {
    unit_number: unitNumber,
    completed: attemptsCount > 0,
    score: bestScore,
    total_questions: totalQuestions,
    first_attempt_score: firstAttemptScore,
    best_score: bestScore,
    attempts_count: attemptsCount,
    mastered,
    weakest_section: weakestSection,
    weakest_score: weakestScore,
    completed_at: newlyMastered ? now : (existing?.completed_at ?? null),
  };

  await upsertProgressLocally(userId, record);
  if (mastered) {
    await clearLiteracyResumeState(userId);
  }
  await syncProgressToCloud(userId, record);
  await touchLiteracyStreak(userId);

  return {
    mastered,
    newlyMastered,
    firstAttemptScore,
    bestScore,
    attemptsCount,
    scorePct: pct,
    firstAttemptPct: scorePct(firstAttemptScore, totalQuestions),
    previousBestPct: scorePct(previousBest, totalQuestions),
  };
}

export async function saveLiteracyProgress(
  userId: string,
  unitNumber: number,
  score: number,
  totalQuestions: number,
): Promise<void> {
  await recordLiteracyQuizAttempt(userId, unitNumber, score, totalQuestions);
}

export async function saveLiteracyResumeState(
  userId: string,
  lastUnit: number,
  lastSection: number,
): Promise<void> {
  const state: LiteracyResumeState = {
    last_unit: lastUnit,
    last_section: lastSection,
    last_opened_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(resumeKey(userId), JSON.stringify(state));

  const db = Database.getClient();
  try {
    await db
      .from('ai_literacy_progress')
      .upsert({
        user_id: userId,
        unit_number: lastUnit,
        portal_type: 'ai_literacy',
        completed: false,
        score: 0,
        total_questions: 0,
        updated_at: new Date().toISOString(),
        ...state,
      }, {
        onConflict: 'user_id,unit_number',
      });
  } catch {
    // Offline-first: local cache already updated.
  }
}

export async function getLiteracyResumeState(userId: string): Promise<LiteracyResumeState | null> {
  const progress = await fetchLiteracyProgress(userId);
  const masteredUnits = new Set(
    progress.filter((item) => item.mastered).map((item) => item.unit_number),
  );

  const cached = await AsyncStorage.getItem(resumeKey(userId));
  if (cached) {
    const state = JSON.parse(cached) as LiteracyResumeState;
    if (masteredUnits.has(state.last_unit)) {
      await clearLiteracyResumeState(userId);
      return null;
    }
    return state;
  }

  const candidate = [...progress]
    .filter((item) => !item.mastered && item.last_unit && item.last_opened_at)
    .sort((a, b) => new Date(b.last_opened_at ?? 0).getTime() - new Date(a.last_opened_at ?? 0).getTime())[0];

  if (!candidate || !candidate.last_unit) return null;
  if (masteredUnits.has(candidate.last_unit)) return null;

  const state: LiteracyResumeState = {
    last_unit: candidate.last_unit,
    last_section: candidate.last_section ?? 0,
    last_opened_at: candidate.last_opened_at ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(resumeKey(userId), JSON.stringify(state));
  return state;
}

type StreakState = { count: number; lastDate: string };

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const yesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export async function touchLiteracyStreak(userId: string): Promise<number> {
  const key = streakKey(userId);
  const today = todayKey();
  const raw = await AsyncStorage.getItem(key);
  const state: StreakState = raw ? JSON.parse(raw) : { count: 0, lastDate: '' };

  if (state.lastDate === today) {
    return state.count;
  }

  if (state.lastDate === yesterdayKey()) {
    state.count = Math.max(1, state.count) + 1;
  } else {
    state.count = 1;
  }
  state.lastDate = today;
  await AsyncStorage.setItem(key, JSON.stringify(state));
  return state.count;
}

export async function getLiteracyStreak(userId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(streakKey(userId));
  if (!raw) return 0;
  const state = JSON.parse(raw) as StreakState;
  if (state.lastDate !== todayKey() && state.lastDate !== yesterdayKey()) {
    return 0;
  }
  return state.count;
}

export function isUnitUnlocked(unitNumber: number, progress: LiteracyProgress[]): boolean {
  if (unitNumber <= 1) return true;
  const prev = progress.find((item) => item.unit_number === unitNumber - 1);
  return prev?.mastered === true;
}

export function getNextRecommendedUnit(
  units: LiteracyUnit[],
  progress: LiteracyProgress[],
): LiteracyUnit | null {
  const sorted = [...units].sort((a, b) => a.unit_number - b.unit_number);
  for (const unit of sorted) {
    if (!isUnitUnlocked(unit.unit_number, progress)) continue;
    const unitProgress = progress.find((item) => item.unit_number === unit.unit_number);
    if (!unitProgress?.mastered) return unit;
  }
  return null;
}

export function computeLiteracyOverview(
  units: LiteracyUnit[],
  progress: LiteracyProgress[],
  streak: number,
): LiteracyOverview {
  const totalUnits = units.length;
  const unitsCompleted = progress.filter((item) => (item.attempts_count ?? 0) > 0).length;
  const unitsMastered = progress.filter((item) => item.mastered === true).length;
  const overallProgressPct = totalUnits > 0
    ? Math.round((unitsMastered / totalUnits) * 100)
    : 0;

  return {
    unitsCompleted,
    unitsMastered,
    totalUnits,
    overallProgressPct,
    streak,
  };
}

const whyItMatters = (question: string): string => {
  const lower = question.toLowerCase();
  if (lower.includes('prompt')) {
    return 'Clear prompts save revision time in KCSE prep and reduce confusing AI outputs.';
  }
  if (lower.includes('hallucination')) {
    return 'Spotting hallucinations prevents costly biashara decisions based on false information.';
  }
  if (lower.includes('m-pesa') || lower.includes('fraud')) {
    return 'Understanding pattern detection helps you trust AI where it is strong, like fraud alerts.';
  }
  if (lower.includes('privacy') || lower.includes('consent')) {
    return 'Protecting learner data builds trust in schools and community programs across Kenya.';
  }
  return 'This concept helps you combine AI speed with human judgment in real Kenyan learning and work contexts.';
};

export function buildRemediationFromAnswers(
  questions: LiteracyQuestion[],
  selectedAnswers: number[],
): RemediationItem[] {
  const items: RemediationItem[] = [];
  questions.forEach((q, index) => {
    const selected = selectedAnswers[index];
    if (selected !== q.correct) {
      items.push({
        question: q.question,
        correct_answer: q.options[q.correct] ?? 'N/A',
        explanation: q.explanation,
        why_it_matters: whyItMatters(q.question),
      });
    }
  });
  return items;
}

export function buildMissedQuestionsForReview(
  questions: LiteracyQuestion[],
  selectedAnswers: number[],
): LiteracyQuestion[] {
  return questions.filter((q, index) => selectedAnswers[index] !== q.correct);
}

export function isSpacedReviewDue(
  completedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!completedAt) return false;
  const elapsedMs = nowMs - new Date(completedAt).getTime();
  return elapsedMs >= SPACED_REVIEW_HOURS * 60 * 60 * 1000;
}

export function getSpacedReviewCandidates(
  units: LiteracyUnit[],
  progress: LiteracyProgress[],
  nowMs: number = Date.now(),
): Array<{ unit: LiteracyUnit; progress: LiteracyProgress }> {
  return units
    .map((unit) => {
      const unitProgress = progress.find((item) => item.unit_number === unit.unit_number);
      if (!unitProgress?.mastered || !unitProgress.completed_at) return null;
      if (!isSpacedReviewDue(unitProgress.completed_at, nowMs)) return null;
      return { unit, progress: unitProgress };
    })
    .filter((item): item is { unit: LiteracyUnit; progress: LiteracyProgress } => item !== null);
}

export function buildSpacedReviewQuestions(
  unit: LiteracyUnit,
  unitProgress: LiteracyProgress,
  count: number = SPACED_REVIEW_QUESTION_COUNT,
): LiteracyQuestion[] {
  const targetSection = unitProgress.weakest_section;
  const sectionsPerQuestion = Math.max(1, unit.sections.length / Math.max(unit.quiz.length, 1));

  const sectionQuestions = unit.quiz.filter((_, index) => {
    const sectionIdx = Math.min(
      Math.floor(index * sectionsPerQuestion),
      unit.sections.length - 1,
    );
    const heading = unit.sections[sectionIdx]?.heading ?? 'Core concepts';
    return !targetSection || heading === targetSection;
  });

  const pool = sectionQuestions.length > 0 ? sectionQuestions : unit.quiz;
  return pool.slice(0, Math.min(count, pool.length));
}

export function getPortalBridgeRecommendation(
  learningMode: 'high_school' | 'university' | 'self_directed' | null,
): PortalBridgeRecommendation {
  const mode = learningMode ?? 'high_school';
  if (mode === 'university') {
    return {
      mode,
      title: 'University Portal',
      route: '/university',
      message: 'Apply your AI skills in real learning.',
    };
  }
  if (mode === 'self_directed') {
    return {
      mode,
      title: 'Self-Directed Portal',
      route: '/self-directed',
      message: 'Apply your AI skills in real learning.',
    };
  }
  return {
    mode: 'high_school',
    title: 'High School Portal',
    route: '/high-school',
    message: 'Apply your AI skills in real learning.',
  };
}

export function hasUnit3Mastery(progress: LiteracyProgress[]): boolean {
  return progress.some((item) => item.unit_number === 3 && item.mastered === true);
}
