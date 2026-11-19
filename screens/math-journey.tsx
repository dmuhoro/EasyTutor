import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS_DARK } from '../src/design/tokens';
import { MATH_DIAGNOSTIC_BANK } from '../src/domain/mathematics/diagnosticBank';
import { useAuthStore } from '../store/authStore';
import { useMathJourneyStore } from '../store/mathJourneyStore';

const TARGET_SKILL = 'fractions';
const palette = COLORS_DARK;

export default function MathJourneyScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const journey = useMathJourneyStore();
  const [answer, setAnswer] = useState('');
  const [hints, setHints] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user?.id) journey.activateLearner(user.id);
  }, [journey.activateLearner, user?.id]);

  const activeLearner = Boolean(user?.id && journey.learnerId === user.id);
  const item = MATH_DIAGNOSTIC_BANK.find((candidate) => candidate.skillId === journey.targetSkill);
  const submitted = Boolean(item && journey.diagnostic.some((response) => response.itemId === item.id));
  const evidenceRecord = item && journey.outbox.find((record) => record.itemId === item.id);

  const submitAnswer = async () => {
    if (!journey.submitAnswer(answer, hints)) return;
    setSyncing(true);
    try {
      await journey.syncPending();
    } finally {
      setSyncing(false);
    }
  };

  if (!user?.id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background.DEFAULT, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: palette.text.primary, fontSize: 22, fontWeight: '700' }}>Sign in to study Mathematics</Text>
        <Text style={{ color: palette.text.secondary, marginTop: 8 }}>Your answers and progress are saved to your learner account.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: palette.primary.DEFAULT }}>
          <Text style={{ color: palette.text.inverse, fontWeight: '700', textAlign: 'center' }}>Go to sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!activeLearner) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background.DEFAULT, justifyContent: 'center', padding: 24 }}>
        <Text accessibilityRole="text" style={{ color: palette.text.secondary }}>Loading your Mathematics progress…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background.DEFAULT }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()}>
            <Text style={{ color: palette.primary.DEFAULT }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: palette.text.primary, fontSize: 24, fontWeight: '700' }}>Mathematics Journey</Text>
        </View>

        <Text style={{ color: palette.text.secondary }}>
          Answer a diagnostic question. Your result determines the next learning step.
        </Text>

        {!journey.targetSkill ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setAnswer('');
              setHints(0);
              journey.beginDiagnostic(TARGET_SKILL);
            }}
            style={{ backgroundColor: palette.primary.DEFAULT, borderRadius: 16, padding: 16 }}
          >
            <Text style={{ color: palette.text.inverse, fontWeight: '700' }}>Start fractions diagnostic</Text>
          </TouchableOpacity>
        ) : null}

        {item && !submitted ? (
          <View style={{ backgroundColor: palette.surface.card, borderColor: palette.surface.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ color: palette.text.primary, fontSize: 18, fontWeight: '600' }}>{item.prompt}</Text>
            <TextInput
              accessibilityLabel="Your answer"
              value={answer}
              onChangeText={setAnswer}
              placeholder="Type your answer"
              placeholderTextColor={palette.text.muted}
              autoCapitalize="none"
              style={{ color: palette.text.primary, borderColor: palette.surface.border, borderWidth: 1, borderRadius: 12, padding: 12 }}
            />
            <TouchableOpacity accessibilityRole="button" onPress={() => setHints((count) => count + 1)}>
              <Text style={{ color: palette.primary.DEFAULT }}>Use a hint ({hints} used)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!answer.trim()}
              onPress={() => void submitAnswer()}
              style={{ backgroundColor: palette.primary.DEFAULT, borderRadius: 12, padding: 14, opacity: answer.trim() ? 1 : 0.5 }}
            >
              <Text style={{ color: palette.text.inverse, fontWeight: '700', textAlign: 'center' }}>Submit answer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {submitted ? (
          <View style={{ backgroundColor: palette.surface.card, borderColor: palette.surface.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 }}>
            <Text style={{ color: palette.text.primary, fontSize: 18, fontWeight: '700' }}>
              {evidenceRecord?.score === 1 ? 'Correct answer' : 'Answer recorded'}
            </Text>
            <Text style={{ color: palette.text.secondary }}>Next step: {journey.canonical?.recommendationAction}</Text>
            <Text style={{ color: palette.text.secondary }}>{journey.canonical?.recommendationReason}</Text>
            <Text style={{ color: palette.text.secondary }}>
              Progress sync: {syncing ? 'syncing' : evidenceRecord?.syncState ?? 'pending'}
            </Text>
            {evidenceRecord?.syncState !== 'synced' ? (
              <TouchableOpacity accessibilityRole="button" onPress={() => void journey.syncPending()}>
                <Text style={{ color: palette.primary.DEFAULT }}>Retry sync</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {journey.canonical ? (
          <View style={{ backgroundColor: palette.surface.card, borderColor: palette.surface.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 }}>
            <Text style={{ color: palette.text.primary, fontWeight: '700' }}>Your progress</Text>
            <Text style={{ color: palette.text.secondary }}>Mastery confidence: {Math.round(journey.canonical.masteryConfidence * 100)}%</Text>
            <Text style={{ color: palette.text.secondary }}>Evidence records: {journey.canonical.evidenceCount}</Text>
            {journey.canonical.missingPrerequisites.length > 0 ? (
              <Text style={{ color: palette.text.secondary }}>Prerequisites to revisit: {journey.canonical.missingPrerequisites.join(', ')}</Text>
            ) : null}
          </View>
        ) : null}

        {journey.lastError ? (
          <Text accessibilityRole="alert" style={{ color: palette.error.DEFAULT }}>{journey.lastError}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
