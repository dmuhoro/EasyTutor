import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRoadmapStore } from '../../store/roadmapStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StageStepper } from '../../components/ui/StageStepper';
import { Input } from '../../components/ui/Input';
import { t } from '../../src/locales';
import { COLORS } from '../../src/design/tokens';

export interface SetupWizardProps {
  className?: StyleProp<ViewStyle>;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const STEPS = [
  { label: t('understand'), status: 'complete' as const },
  { label: t('practice'), status: 'active' as const },
  { label: t('quiz'), status: 'pending' as const },
  { label: t('review'), status: 'pending' as const },
];

const SUBJECTS = [
  { id: 'math', name: t('subjects.math'), icon: 'logo-angular' },
  { id: 'physics', name: t('subjects.physics'), icon: 'atom' },
  { id: 'chemistry', name: t('subjects.chemistry'), icon: 'flask' },
  { id: 'biology', name: t('subjects.biology'), icon: 'heart' },
  { id: 'computer_science', name: t('subjects.computer_science'), icon: 'logo-codepen' },
  { id: 'history', name: t('subjects.history'), icon: 'library' },
];

/**
 * Setup wizard and onboarding — one clear next action per screen.
 * Token-driven colours, no dark patterns (no guilt streaks, no fake urgency).
 * All user-facing strings via t() locale lookups.
 */
export function SetupWizard({ className }: SetupWizardProps) {
  const router = useRouter();
  const { setOnboardingComplete } = useRoadmapStore();

  const [step, setStep] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [goal, setGoal] = useState('');

  const isLastStep = step === STEPS.length - 1;

  const subjectChips = SUBJECTS.map((s) => {
    const isSelected = selectedSubject === s.id;
    return (
      <TouchableOpacity
        key={s.id}
        onPress={() => setSelectedSubject(s.id)}
        activeOpacity={0.8}
        className={`w-[44%] h-20 rounded-xl border flex-row items-center justify-center gap-2 ${
          isSelected
            ? 'bg-brand-500/20 border-brand-500/40'
            : 'bg-surface-card border-surface-border'
        }`}
      >
        <Ionicons name={s.icon as IconName} size={16} color={isSelected ? COLORS.brand[400] : COLORS.text.secondary} />
        <Text className="font-dmsans text-sm font-medium text-text-primary">
          {s.name}
        </Text>
      </TouchableOpacity>
    );
  });

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      setOnboardingComplete(true);
      router.push('/(tabs)/index');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(step - 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-bg">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-text-secondary font-dmsans text-lg uppercase tracking-wider">
            {t('setup')}
          </Text>
          <Text className="text-text-primary text-3xl font-bold font-syne">
            {t('welcome')}
          </Text>
        </View>

        {/* Stepper */}
        <StageStepper steps={STEPS} />

        {/* Step content */}
        {step === 0 && (
          <View className="mt-8">
            <View className="w-16 h-16 bg-brand-500/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="school-outline" size={32} color={COLORS.brand[400]} />
            </View>
            <Text className="text-text-primary text-2xl font-bold font-syne text-center mb-3">
              {t('welcome')}
            </Text>
            <Text className="text-text-secondary font-dmsans text-base text-center mb-8 max-w-[280px]">
              {t('welcomeSubtitle')}
            </Text>
            <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
              {t('continue')}
            </Button>
          </View>
        )}

        {step === 1 && (
          <View className="mt-8">
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">
              {t('chooseSubject')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {subjectChips}
            </View>
            <View className="mt-4">
              <Badge variant="neutral" size="sm">
                {selectedSubject ? t('selected') : t('required')}
              </Badge>
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="mt-8">
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">
              {t('whatsYourGoal')}
            </Text>
            <Input
              label={t('goal')}
              placeholder={t('goalPlaceholder')}
              value={goal}
              onChangeText={setGoal}
              containerClassName="mb-4"
            />
            <Text className="text-text-muted font-dmsans text-sm">
              {t('goalHelps')}
            </Text>
          </View>
        )}

        {step === 3 && (
          <View className="mt-8">
            <View className="w-16 h-16 bg-success/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success.light} />
            </View>
            <Text className="text-text-primary text-2xl font-bold font-syne text-center mb-3">
              {t('youreAllSet')}
            </Text>
            <Text className="text-text-secondary font-dmsans text-base text-center mb-8 max-w-[280px]">
              {t('learningJourneyBegins')}
            </Text>
            <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
              {t('startLearning')}
            </Button>
          </View>
        )}

        {/* Footer */}
        <View className="mt-8 flex-row justify-between items-center">
          {!isLastStep && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.8}
              accessibilityRole="button"
              aria-label={t('back')}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.text.secondary} />
              <Text className="text-text-secondary font-dmsans font-medium">{t('back')}</Text>
            </TouchableOpacity>
          )}
          {!isLastStep && selectedSubject === null && step === 1 ? (
            <Button variant="ghost" size="lg" disabled>
              {t('continue')}
            </Button>
          ) : (
            !isLastStep && (
              <Button variant="primary" size="lg" onPress={handleNext}>
                {t('continue')}
              </Button>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
