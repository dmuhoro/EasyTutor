import { LEGACY_COLORS } from '../src/design/legacyPalette';
/**
 * Age Gate Component (Constitution Article II - Data Protection)
 *
 * Age-appropriate handling for under-18 learners. When a user is under 18,
 * additional protections apply: no marketing data collection, enhanced
 * privacy messaging, and parental consent recommendation.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { recordAgeVerification } from '../lib/privacy/consent';

export const AgeGate = ({ onComplete }: { onComplete: (age: number) => void }) => {
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      setError('Please enter a valid age.');
      return;
    }

    setSubmitting(true);
    try {
      await recordAgeVerification(ageNum);
      onComplete(ageNum);
    } catch (err) {
      setError('Failed to save age. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: LEGACY_COLORS.nightCanvas }}>
      <View style={{ padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: LEGACY_COLORS.nightSurface, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="person-circle" size={40} color={LEGACY_COLORS.blueRibbon} />
        </View>

        <Text style={{ color: LEGACY_COLORS.whiteShort, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
          How old are you?
        </Text>

        <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          We ask your age to provide age-appropriate content and protections.
        </Text>

        <View style={{ width: '80%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: LEGACY_COLORS.nightBorder, borderRadius: 12, paddingHorizontal: 12 }}>
            <Ionicons name="calendar" size={20} color={LEGACY_COLORS.nightTextMuted} />
            <TextInput
              style={{ flex: 1, color: LEGACY_COLORS.whiteShort, fontSize: 16, paddingVertical: 14 }}
              keyboardType="numeric"
              maxLength={3}
              value={age}
              onChangeText={setAge}
              placeholder="Age"
              placeholderTextColor={LEGACY_COLORS.nightTextSecondary}
            />
          </View>
        </View>

        {error && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: LEGACY_COLORS.red500, fontSize: 14, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !age}
          style={{
            backgroundColor: LEGACY_COLORS.blueRibbon,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 24,
            opacity: submitting || !age ? 0.5 : 1,
          }}
        >
          <ActivityIndicator size="small" color={LEGACY_COLORS.whiteShort} />
          <Text style={{ color: LEGACY_COLORS.whiteShort, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
            Continue
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: LEGACY_COLORS.nightTextMuted, fontSize: 12, textAlign: 'center' }}>
            We use your age to apply appropriate privacy protections. Under-18
            users get enhanced privacy safeguards.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AgeGate;