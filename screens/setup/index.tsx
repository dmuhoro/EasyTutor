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
import { COLORS } from '../../src/design/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SetupWizardProps {
  className?: StyleProp<ViewStyle>;
}

const STEPS = [
  { label: 'Welcome', status: 'complete' as const },
  { label: 'Choose Subject', status: 'active' as const },
  { label: 'Set Goals', status: 'pending' as const },
  { label: 'Finish', status: 'pending' as const },
];

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: 'logo-angular' },
  { id: 'physics', name: 'Physics', icon: 'atom' },
  { id: 'chemistry', name: 'Chemistry', icon: 'flask' },
  { id: 'biology', name: 'Biology', icon: 'heart' },
  { id: 'computer_science', name: 'Computer Science', icon: 'logo-codepen' },
  { id: 'history', name: 'History', icon: 'library' },
];

/**
 * Setup wizard and onboarding — one clear next action per screen.
 * Token-driven colours, no dark patterns (no guilt streaks, no fake urgency).
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
            Setup
          </Text>
          <Text className="text-text-primary text-3xl font-bold font-syne">
            Let's get you started
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
              Welcome to EasyTutor
            </Text>
            <Text className="text-text-secondary font-dmsans text-base text-center mb-8 max-w-[280px]">
              Your AI-powered study companion. Learn at your own pace, with your own notes.
            </Text>
            <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
              Continue
            </Button>
          </View>
        )}

        {step === 1 && (
          <View className="mt-8">
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">Choose your subject</Text>
            <View className="flex-row flex-wrap gap-3">
              {subjectChips}
            </View>
            <Badge variant="neutral" size="sm">
              {selectedSubject ? 'Selected' : 'Required'}
            </Badge>
          </View>
        )}

        {step === 2 && (
          <View className="mt-8">
            <Text className="text-text-primary font-bold font-syne text-lg mb-4">What's your goal?</Text>
            <Input
              label="Goal (optional)"
              placeholder="e.g. Pass KCSE Mathematics, Learn Python basics"
              value={goal}
              onChangeText={setGoal}
              containerClassName="mb-4"
            />
            <Text className="text-text-muted font-dmsans text-sm">
              This helps the AI tutor personalize your learning path.
            </Text>
          </View>
        )}

        {step === 3 && (
          <View className="mt-8">
            <View className="w-16 h-16 bg-success/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success.light} />
            </View>
            <Text className="text-text-primary text-2xl font-bold font-syne text-center mb-3">
              You're all set!
            </Text>
            <Text className="text-text-secondary font-dmsans text-base text-center mb-8 max-w-[280px]">
              Your learning journey begins now. Start with your first subject.
            </Text>
            <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
              Start Learning
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
              aria-label="Back"
              className="flex-row items-center gap-1"
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.text.secondary} />
              <Text className="text-text-secondary font-dmsans font-medium">Back</Text>
            </TouchableOpacity>
          )}
          {!isLastStep && selectedSubject === null && step === 1 ? (
            <Button variant="ghost" size="lg" disabled>
              Continue
            </Button>
          ) : (
            !isLastStep && (
              <Button variant="primary" size="lg" onPress={handleNext}>
                Continue
              </Button>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
