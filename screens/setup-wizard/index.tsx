import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from "../../store/authStore";
import { useRoadmapStore, LearningMode } from "../../store/roadmapStore";
import { useSettingsStore } from "../../store/settingsStore";
import * as Haptics from '../../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { track } from '../../lib/analytics';
import { Database } from '../../src/infrastructure/database';
import { portalFromMode } from "../../store/roadmapStore";

type SetupStep =
  | 'country'
  | 'level'
  | 'track'
  | 'goal'
  | 'schedule'
  | 'preferences'
  | 'review'
  | 'done';

interface SetupFormData {
  country: string;
  level: LearningMode | 'tvet' | '';
  track: string;
  goal: string;
  examDate: string;
  dailyMinutes: number;
  language: string;
  dataMode: 'standard' | 'low';
}

const LEVELS: { id: LearningMode | 'tvet'; title: string; subtitle: string; icon: string; color: string }[] = [
  { id: 'high_school', title: t('nl'), subtitle: t('qf'), icon: 'school-outline', color: LEGACY_COLORS.blueRibbon },
  { id: 'tvet', title: t('ji'), subtitle: t('ie'), icon: 'build-outline', color: LEGACY_COLORS.purple500Bright },
  { id: 'university', title: t('university'), subtitle: t('hs'), icon: 'library-outline', color: LEGACY_COLORS.green500 },
  { id: 'self_directed', title: t('ov'), subtitle: t('qc'), icon: 'compass-outline', color: LEGACY_COLORS.amberBright },
];

const TRACKS: { id: string; title: string; subtitle: string }[] = [
  { id: 'kcse', title: t('cd'), subtitle: t('pl') },
  { id: 'cbc', title: t('aj'), subtitle: t('nx') },
  { id: 'waec', title: t('qe'), subtitle: t('ob') },
  { id: 'igcse', title: t('jt'), subtitle: t('jm') },
  { id: 'ib', title: t('gy'), subtitle: t('cm') },
  { id: 'custom', title: t('fq'), subtitle: t('cl') },
];

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other' },
];

const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'fr', name: 'Français' },
];

const STEP_LABELS: Record<SetupStep, string> = {
  country: '1 · Your country',
  level: '2 · Your level',
  track: '3 · Curriculum track',
  goal: '4 · Goal & exam date',
  schedule: '5 · Daily study time',
  preferences: '6 · Language & data',
  review: '7 · Review',
  done: 'Complete',
};

const STEP_ORDER: SetupStep[] = ['country', 'level', 'track', 'goal', 'schedule', 'preferences', 'review', 'done'];

export default function SetupWizard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string }>();
  const { user } = useAuthStore();
  const { setLearningMode, setOnboardingComplete } = useRoadmapStore();
  const { setLowDataMode } = useSettingsStore();

  const [step, setStep] = useState<SetupStep>('country');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SetupFormData>({
    country: '',
    level: '',
    track: '',
    goal: '',
    examDate: '',
    dailyMinutes: 30,
    language: 'en',
    dataMode: 'standard',
  });

  // Pre-select the level carried over from onboarding mode selection.
  useEffect(() => {
    if (params.level && !form.level) {
      const levelVal = Array.isArray(params.level) ? params.level[0] : params.level;
      setField('level', levelVal as LearningMode | 'tvet');
    }
  }, [params.level]);

  const currentStepIndex = STEP_ORDER.indexOf(step);

  const nextStep = () => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setStep(STEP_ORDER[currentStepIndex - 1]);
    }
  };

  const setField = (key: keyof SetupFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 'country': return !!form.country;
      case 'level': return !!form.level;
      case 'track': return !!form.track;
      case 'goal': return !!form.goal.trim() && !!form.examDate;
      case 'schedule': return form.dailyMinutes > 0;
      case 'preferences': return !!form.language && !!form.dataMode;
      default: return true;
    }
  }, [step, form]);

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    Haptics.notificationAsync('success');

    try {
      // Persist setup privately via governed write (user's private scope).
      const authUser = await Database.getAuthenticatedUser();
      await Database.governedWrite('profiles', {
        id: authUser.id,
        email: authUser.email,
        learning_mode: (form.level === 'self_directed' ? 'self_directed' : form.level as LearningMode),
        onboarding_complete: true,
        country: form.country,
        curriculum_track: form.track,
        learning_goal: form.goal,
        exam_date: form.examDate,
        daily_minutes: form.dailyMinutes,
        language: form.language,
        data_mode: form.dataMode,
      }, {
        portalType: portalFromMode(form.level === 'self_directed' ? 'self_directed' : form.level as LearningMode),
      });
    } catch (err: any) {
      console.error('[ERROR] [SETUP] profile write failed', err);
      // Never silently drop: complete locally, sync on reconnect (Article II).
      Alert.alert(
        t('dl'),
        t('la')
      );
    }

    // Apply preferences immediately (local-first).
    setLowDataMode(form.dataMode === 'low');
    setLearningMode(form.level === 'self_directed' ? 'self_directed' : form.level as LearningMode);
    setOnboardingComplete(true);

    track('setup_wizard_completed', {
      user_id: user.id,
      country: form.country,
      level: form.level,
      track: form.track,
      daily_minutes: form.dailyMinutes,
      language: form.language,
      data_mode: form.dataMode,
    });

    setStep('done');
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 'country': return renderCountryStep();
      case 'level': return renderLevelStep();
      case 'track': return renderTrackStep();
      case 'goal': return renderGoalStep();
      case 'schedule': return renderScheduleStep();
      case 'preferences': return renderPreferencesStep();
      case 'review': return renderReviewStep();
      case 'done': return renderDoneStep();
      default: return null;
    }
  };

  const renderCountryStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} disabled={currentStepIndex === 0} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.country}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('pq')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-10">
        {t('dk')}
      </Text>
      <View className="space-y-3">
        {COUNTRIES.map(c => (
          <TouchableOpacity
            key={c.code}
            onPress={() => setField('country', c.code)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.country === c.code ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
          >
            <Text className="text-white font-syne text-lg">{c.name}</Text>
            {form.country === c.code && <Ionicons name="checkmark" size={20} color={LEGACY_COLORS.blueRibbon} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLevelStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.level}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('aw')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-10">
        {t('jv')}
      </Text>
      <View className="space-y-3">
        {LEVELS.map(l => (
          <TouchableOpacity
            key={l.id}
            onPress={() => setField('level', l.id)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.level === l.id ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${form.level === l.id ? 'bg-legacy-blue-ribbon' : 'bg-legacy-night-border'}`}>
                <Ionicons name={l.icon as any} size={22} color={form.level === l.id ? 'white' : LEGACY_COLORS.nightTextMuted} />
              </View>
              <View>
                <Text className="text-white font-bold font-syne text-lg">{l.title}</Text>
                <Text className="text-legacy-night-text-secondary text-sm font-dmsans">{l.subtitle}</Text>
              </View>
            </View>
            {form.level === l.id && <Ionicons name="checkmark" size={20} color={LEGACY_COLORS.blueRibbon} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTrackStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.track}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('iy')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-10">
        {t('kn')}
      </Text>
      <View className="space-y-3">
        {TRACKS.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setField('track', t.id)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.track === t.id ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
          >
            <View className="flex-1">
              <Text className="text-white font-bold font-syne text-lg">{t.title}</Text>
              <Text className="text-legacy-night-text-secondary text-sm font-dmsans">{t.subtitle}</Text>
            </View>
            {form.track === t.id && <Ionicons name="checkmark" size={20} color={LEGACY_COLORS.blueRibbon} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGoalStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.goal}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('jd')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-6">
        {t('lc')}
      </Text>
      <TextInput
        className="bg-legacy-night-canvas border border-legacy-night-border rounded-xl p-5 text-white font-dmsans mb-6 min-h-[140px]"
        multiline
        value={form.goal}
        onChangeText={setField.bind(null, 'goal')}
        placeholder={t('lg')}
        placeholderTextColor={LEGACY_COLORS.nightBorderStrong}
        textAlignVertical="top"
      />
      <View className="flex-row items-center gap-4 mb-10">
        <View className="flex-1">
          <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-wider mb-2">{t('pe')}</Text>
          <TextInput
            className="bg-legacy-night-canvas border border-legacy-night-border rounded-xl p-4 text-white font-dmsans"
            value={form.examDate}
            onChangeText={setField.bind(null, 'examDate')}
            placeholder={t('dq')}
            placeholderTextColor={LEGACY_COLORS.nightBorderStrong}
          />
        </View>
      </View>
    </View>
  );

  const renderScheduleStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.schedule}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('li')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-10">
        {t('bl')}
      </Text>
      <View className="space-y-4">
        {[15, 30, 45, 60, 90].map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setField('dailyMinutes', m)}
            className={`w-20 h-20 rounded-2xl flex-row items-center justify-center border ${form.dailyMinutes === m ? 'bg-legacy-blue-ribbon border-legacy-blue-ribbon' : 'bg-legacy-night-surface border-legacy-night-border'}`}
          >
            <Text className={`text-white font-bold font-syne text-lg ${form.dailyMinutes === m ? '' : 'opacity-60'}`}>{m}m</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPreferencesStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.preferences}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">{t('hf')}</Text>
      <Text className="text-legacy-night-text-muted text-lg font-dmsans mb-10">
        {t('jb')}
      </Text>
      <View className="mb-10">
        <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-wider mb-4">{t('language')}</Text>
        <View className="space-y-3">
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setField('language', l.code)}
              className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.language === l.code ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
            >
              <Text className="text-white font-syne text-lg">{l.name}</Text>
              {form.language === l.code && <Ionicons name="checkmark" size={20} color={LEGACY_COLORS.blueRibbon} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View>
        <Text className="text-legacy-night-text-muted text-[10px] uppercase font-bold tracking-wider mb-4">{t('ey')}</Text>
        <View className="space-y-3">
          {[
            { id: 'standard', title: t('pw'), subtitle: t('qi') },
            { id: 'low', title: t('ng'), subtitle: t('en') },
          ].map(d => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setField('dataMode', d.id as 'standard' | 'low')}
              className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.dataMode === d.id ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'bg-legacy-night-surface/50 border-legacy-night-border'}`}
            >
              <View className="flex-1">
                <Text className="text-white font-bold font-syne text-lg">{d.title}</Text>
                <Text className="text-legacy-night-text-secondary text-sm font-dmsans">{d.subtitle}</Text>
              </View>
              {form.dataMode === d.id && <Ionicons name="checkmark" size={20} color={LEGACY_COLORS.blueRibbon} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color={LEGACY_COLORS.nightTextMuted} />
        </TouchableOpacity>
        <Text className="text-legacy-night-text-muted text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.review}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-8">{t('ae')}</Text>
      <View className="space-y-4">
        {[
          { label: t('gn'), value: form.country },
          { label: t('level'), value: LEVELS.find(l => l.id === form.level)?.title ?? form.level },
          { label: t('hz'), value: form.track },
          { label: t('nj'), value: form.goal },
          { label: t('i'), value: form.examDate || 'Not set' },
          { label: t('pd'), value: `${form.dailyMinutes} minutes` },
          { label: t('language'), value: LANGUAGES.find(l => l.code === form.language)?.name ?? form.language },
          { label: t('ey'), value: form.dataMode === 'low' ? 'Low-data' : 'Standard' },
        ].map(item => (
          <View key={item.label} className="p-5 rounded-2xl border border-legacy-night-border bg-legacy-night-surface flex-row justify-between items-center">
            <View>
              <Text className="text-legacy-night-text-muted text-xs font-dmsans uppercase tracking-wider mb-1">{item.label}</Text>
              <Text className="text-white font-syne text-lg">{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color={LEGACY_COLORS.blueRibbon} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderDoneStep = () => (
    <View className="px-6 flex-1 items-center justify-center">
      <LinearGradient colors={[LEGACY_COLORS.blueRibbon, LEGACY_COLORS.purple500Bright]} className="w-24 h-24 rounded-[32px] items-center justify-center mb-8 shadow-2xl shadow-legacy-blue-ribbon/40">
        <Ionicons name="checkmark-circle" size={48} color="white" />
      </LinearGradient>
      <Text className="text-white text-4xl font-bold font-syne text-center mb-4">{t('lj')}</Text>
      <Text className="text-legacy-night-text-muted text-xl font-dmsans text-center leading-8 mb-10 max-w-[280px]">
        {t('n')}
      </Text>
      <TouchableOpacity
        onPress={handleComplete}
        disabled={loading}
        className={`py-6 rounded-2xl flex-row items-center justify-center w-full ${loading ? 'bg-legacy-night-border opacity-50' : 'bg-legacy-blue-ribbon shadow-lg shadow-legacy-blue-ribbon/40'}`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <View className="flex-row items-center">
            <Text className="text-white font-bold font-syne text-lg mr-2 uppercase tracking-widest">{t('startLearning')}</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={[LEGACY_COLORS.nightCanvas, LEGACY_COLORS.nightSurface, LEGACY_COLORS.nightCanvas]} className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-1">
              <Text className="text-legacy-blue-ribbon font-bold font-syne text-xs uppercase tracking-widest mb-1">{t('ig')}</Text>
              <Text className="text-white text-2xl font-bold font-syne">{t('hh')}</Text>
            </View>
            <Text className="text-legacy-night-text-muted text-sm font-dmsans">
              {t('it')} {currentStepIndex + 1} {t('ca')} {STEP_ORDER.length - 1}
            </Text>
          </View>
        </View>
        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {renderStep()}
        </ScrollView>
        <View className="px-6 py-6 border-t border-legacy-night-border bg-legacy-night-canvas">
          <View className="flex-row justify-between items-center">
            {currentStepIndex > 0 && (
              <TouchableOpacity
                onPress={prevStep}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-legacy-night-surface border border-legacy-night-border flex-row items-center"
              >
                <Ionicons name="chevron-back-outline" size={18} color={LEGACY_COLORS.nightTextMuted} />
                <Text className="text-legacy-night-text-muted font-bold font-syne text-sm ml-2 uppercase">{t('back')}</Text>
              </TouchableOpacity>
            )}
            {currentStepIndex === STEP_ORDER.length - 1 ? null : (
              <TouchableOpacity
                onPress={nextStep}
                disabled={loading || !canProceed()}
                className={`px-8 py-3 rounded-xl flex-row items-center justify-center ${canProceed() && !loading ? 'bg-legacy-blue-ribbon shadow-lg shadow-legacy-blue-ribbon/40' : 'bg-legacy-night-border opacity-50'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" size={18} />
                ) : (
                  <>
                    <Text className="text-white font-bold font-syne text-sm mr-2 uppercase tracking-wider">{t('continue')}</Text>
                    <Ionicons name="chevron-forward-outline" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
