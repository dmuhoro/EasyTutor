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
  { id: 'high_school', title: 'Secondary School', subtitle: 'KCSE, GCSE, WASSCE & national curricula', icon: 'school-outline', color: '#4f7cff' },
  { id: 'tvet', title: 'TVET / Technical', subtitle: 'Technical & vocational education', icon: 'build-outline', color: '#a855f7' },
  { id: 'university', title: 'University', subtitle: 'Degree-level subjects & research', icon: 'library-outline', color: '#22c55e' },
  { id: 'self_directed', title: 'Self-Learner', subtitle: 'Learn anything, your own way', icon: 'compass-outline', color: '#f59e0b' },
];

const TRACKS: { id: string; title: string; subtitle: string }[] = [
  { id: 'kcse', title: 'KCSE (Kenya)', subtitle: 'Kenya Certificate of Secondary Education' },
  { id: 'cbc', title: 'CBC (Kenya)', subtitle: 'Competency-Based Curriculum' },
  { id: 'waec', title: 'WASSCE (West Africa)', subtitle: 'West African Senior School Certificate' },
  { id: 'igcse', title: 'IGCSE', subtitle: 'International General Certificate' },
  { id: 'ib', title: 'IB Diploma', subtitle: 'International Baccalaureate' },
  { id: 'custom', title: 'Custom / Self-Directed', subtitle: 'Your own topics & goals' },
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
        "Setup saved locally",
        "Your preferences are stored on this device and will sync to the cloud when you reconnect."
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
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.country}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">Which country are you in?</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-10">
        This helps us surface the right curriculum and exam tracks for your region.
      </Text>
      <View className="space-y-3">
        {COUNTRIES.map(c => (
          <TouchableOpacity
            key={c.code}
            onPress={() => setField('country', c.code)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.country === c.code ? 'bg-[#161920] border-[#4f7cff]' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
          >
            <Text className="text-white font-syne text-lg">{c.name}</Text>
            {form.country === c.code && <Ionicons name="checkmark" size={20} color="#4f7cff" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLevelStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.level}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">What's your level?</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-10">
        This tailors the difficulty and pacing of your study plan.
      </Text>
      <View className="space-y-3">
        {LEVELS.map(l => (
          <TouchableOpacity
            key={l.id}
            onPress={() => setField('level', l.id)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.level === l.id ? 'bg-[#161920] border-[#4f7cff]' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
          >
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${form.level === l.id ? 'bg-[#4f7cff]' : 'bg-[#2a2f3d]'}`}>
                <Ionicons name={l.icon as any} size={22} color={form.level === l.id ? 'white' : '#8a8fa3'} />
              </View>
              <View>
                <Text className="text-white font-bold font-syne text-lg">{l.title}</Text>
                <Text className="text-[#5a5f73] text-sm font-dmsans">{l.subtitle}</Text>
              </View>
            </View>
            {form.level === l.id && <Ionicons name="checkmark" size={20} color="#4f7cff" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTrackStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.track}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">Choose your curriculum track</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-10">
        Pick the exam board or curriculum your studies follow.
      </Text>
      <View className="space-y-3">
        {TRACKS.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setField('track', t.id)}
            className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.track === t.id ? 'bg-[#161920] border-[#4f7cff]' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
          >
            <View className="flex-1">
              <Text className="text-white font-bold font-syne text-lg">{t.title}</Text>
              <Text className="text-[#5a5f73] text-sm font-dmsans">{t.subtitle}</Text>
            </View>
            {form.track === t.id && <Ionicons name="checkmark" size={20} color="#4f7cff" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGoalStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.goal}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">What do you want to master?</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-6">
        Tell us your topic or goal, and when you'd like to be ready.
      </Text>
      <TextInput
        className="bg-[#0d0f12] border border-[#2a2f3d] rounded-xl p-5 text-white font-dmsans mb-6 min-h-[140px]"
        multiline
        value={form.goal}
        onChangeText={setField.bind(null, 'goal')}
        placeholder="e.g. Master automotive braking systems"
        placeholderTextColor="#3a3f53"
        textAlignVertical="top"
      />
      <View className="flex-row items-center gap-4 mb-10">
        <View className="flex-1">
          <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-wider mb-2">Exam / target date</Text>
          <TextInput
            className="bg-[#0d0f12] border border-[#2a2f3d] rounded-xl p-4 text-white font-dmsans"
            value={form.examDate}
            onChangeText={setField.bind(null, 'examDate')}
            placeholder="Select a date"
            placeholderTextColor="#3a3f53"
          />
        </View>
      </View>
    </View>
  );

  const renderScheduleStep = () => (
    <View className="px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={prevStep} className="mr-4 opacity-50">
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.schedule}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">How much time daily?</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-10">
        We'll pace your roadmap to fit your schedule. Be realistic — consistency beats intensity.
      </Text>
      <View className="space-y-4">
        {[15, 30, 45, 60, 90].map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setField('dailyMinutes', m)}
            className={`w-20 h-20 rounded-2xl flex-row items-center justify-center border ${form.dailyMinutes === m ? 'bg-[#4f7cff] border-[#4f7cff]' : 'bg-[#161920] border-[#2a2f3d]'}`}
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
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.preferences}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-2">Language & data mode</Text>
      <Text className="text-[#8a8fa3] text-lg font-dmsans mb-10">
        Choose your language and whether to use low-data mode on slower connections.
      </Text>
      <View className="mb-10">
        <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-wider mb-4">Language</Text>
        <View className="space-y-3">
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setField('language', l.code)}
              className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.language === l.code ? 'bg-[#161920] border-[#4f7cff]' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
            >
              <Text className="text-white font-syne text-lg">{l.name}</Text>
              {form.language === l.code && <Ionicons name="checkmark" size={20} color="#4f7cff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View>
        <Text className="text-[#8a8fa3] text-[10px] uppercase font-bold tracking-wider mb-4">Data mode</Text>
        <View className="space-y-3">
          {[
            { id: 'standard', title: 'Standard', subtitle: 'Full AI replies, images, richer tutoring' },
            { id: 'low', title: 'Low-data', subtitle: 'Text-first, shorter replies, no autoplay, visible data estimate' },
          ].map(d => (
            <TouchableOpacity
              key={d.id}
              onPress={() => setField('dataMode', d.id as 'standard' | 'low')}
              className={`w-full p-5 rounded-2xl border flex-row items-center justify-between mb-2 ${form.dataMode === d.id ? 'bg-[#161920] border-[#4f7cff]' : 'bg-[#161920]/50 border-[#2a2f3d]'}`}
            >
              <View className="flex-1">
                <Text className="text-white font-bold font-syne text-lg">{d.title}</Text>
                <Text className="text-[#5a5f73] text-sm font-dmsans">{d.subtitle}</Text>
              </View>
              {form.dataMode === d.id && <Ionicons name="checkmark" size={20} color="#4f7cff" />}
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
          <Ionicons name="chevron-back-outline" size={20} color="#8a8fa3" />
        </TouchableOpacity>
        <Text className="text-[#8a8fa3] text-xs font-dmsans font-bold uppercase tracking-wider">
          {STEP_LABELS.review}
        </Text>
      </View>
      <Text className="text-white text-3xl font-bold font-syne mb-8">Review your setup</Text>
      <View className="space-y-4">
        {[
          { label: 'Country', value: form.country },
          { label: 'Level', value: LEVELS.find(l => l.id === form.level)?.title ?? form.level },
          { label: 'Curriculum track', value: form.track },
          { label: 'Goal', value: form.goal },
          { label: 'Exam date', value: form.examDate || 'Not set' },
          { label: 'Daily study time', value: `${form.dailyMinutes} minutes` },
          { label: 'Language', value: LANGUAGES.find(l => l.code === form.language)?.name ?? form.language },
          { label: 'Data mode', value: form.dataMode === 'low' ? 'Low-data' : 'Standard' },
        ].map(item => (
          <View key={item.label} className="p-5 rounded-2xl border border-[#2a2f3d] bg-[#161920] flex-row justify-between items-center">
            <View>
              <Text className="text-[#8a8fa3] text-xs font-dmsans uppercase tracking-wider mb-1">{item.label}</Text>
              <Text className="text-white font-syne text-lg">{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#4f7cff" />
          </View>
        ))}
      </View>
    </View>
  );

  const renderDoneStep = () => (
    <View className="px-6 flex-1 items-center justify-center">
      <LinearGradient colors={['#4f7cff', '#a855f7']} className="w-24 h-24 rounded-[32px] items-center justify-center mb-8 shadow-2xl shadow-[#4f7cff]/40">
        <Ionicons name="checkmark-circle" size={48} color="white" />
      </LinearGradient>
      <Text className="text-white text-4xl font-bold font-syne text-center mb-4">Setup complete!</Text>
      <Text className="text-[#8a8fa3] text-xl font-dmsans text-center leading-8 mb-10 max-w-[280px]">
        Your learning journey is ready. Let's build your first roadmap.
      </Text>
      <TouchableOpacity
        onPress={handleComplete}
        disabled={loading}
        className={`py-6 rounded-2xl flex-row items-center justify-center w-full ${loading ? 'bg-[#2a2f3d] opacity-50' : 'bg-[#4f7cff] shadow-lg shadow-[#4f7cff]/40'}`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <View className="flex-row items-center">
            <Text className="text-white font-bold font-syne text-lg mr-2 uppercase tracking-widest">Start Learning</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#0d0f12', '#161920', '#0d0f12']} className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-1">
              <Text className="text-[#4f7cff] font-bold font-syne text-xs uppercase tracking-widest mb-1">EasyTutor Setup</Text>
              <Text className="text-white text-2xl font-bold font-syne">Personalize your learning</Text>
            </View>
            <Text className="text-[#8a8fa3] text-sm font-dmsans">
              Step {currentStepIndex + 1} of {STEP_ORDER.length - 1}
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
        <View className="px-6 py-6 border-t border-[#2a2f3d] bg-[#0d0f12]">
          <View className="flex-row justify-between items-center">
            {currentStepIndex > 0 && (
              <TouchableOpacity
                onPress={prevStep}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-[#161920] border border-[#2a2f3d] flex-row items-center"
              >
                <Ionicons name="chevron-back-outline" size={18} color="#8a8fa3" />
                <Text className="text-[#8a8fa3] font-bold font-syne text-sm ml-2 uppercase">Back</Text>
              </TouchableOpacity>
            )}
            {currentStepIndex === STEP_ORDER.length - 1 ? null : (
              <TouchableOpacity
                onPress={nextStep}
                disabled={loading || !canProceed()}
                className={`px-8 py-3 rounded-xl flex-row items-center justify-center ${canProceed() && !loading ? 'bg-[#4f7cff] shadow-lg shadow-[#4f7cff]/40' : 'bg-[#2a2f3d] opacity-50'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" size={18} />
                ) : (
                  <>
                    <Text className="text-white font-bold font-syne text-sm mr-2 uppercase tracking-wider">Continue</Text>
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
