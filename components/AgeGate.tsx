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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0f12' }}>
      <View style={{ padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#161920', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="person-circle" size={40} color="#4f7cff" />
        </View>

        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
          How old are you?
        </Text>

        <Text style={{ color: '#8a8fa3', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          We ask your age to provide age-appropriate content and protections.
        </Text>

        <View style={{ width: '80%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#2a2f3d', borderRadius: 12, paddingHorizontal: 12 }}>
            <Ionicons name="calendar" size={20} color="#8a8fa3" />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 }}
              keyboardType="numeric"
              maxLength={3}
              value={age}
              onChangeText={setAge}
              placeholder="Age"
              placeholderTextColor="#5a5f73"
            />
          </View>
        </View>

        {error && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !age}
          style={{
            backgroundColor: '#4f7cff',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 24,
            opacity: submitting || !age ? 0.5 : 1,
          }}
        >
          <ActivityIndicator size="small" color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
            Continue
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: '#8a8fa3', fontSize: 12, textAlign: 'center' }}>
            We use your age to apply appropriate privacy protections. Under-18
            users get enhanced privacy safeguards.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AgeGate;