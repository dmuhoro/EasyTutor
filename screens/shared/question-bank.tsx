import { t } from '../../src/locales';
import { LEGACY_COLORS } from '../../src/design/legacyPalette';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { track } from '../../lib/analytics';
import { getQuestionsBySubject } from '../../lib/questionBank';

const SUBJECTS = ['Mathematics', 'Biology', 'Physics', 'Chemistry'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'all'];

export default function QuestionBankScreen() {
  const router = useRouter();
  
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    track('practice_started', { source: 'question_bank_screen' });
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadTopics(selectedSubject);
    } else {
      setAvailableTopics([]);
      setSelectedTopic('all');
    }
  }, [selectedSubject]);

  const loadTopics = async (subject: string) => {
    setLoadingTopics(true);
    const questions = await getQuestionsBySubject(subject);
    const topics = Array.from(new Set(questions.map(q => q.topic))).filter(Boolean);
    setAvailableTopics(topics);
    setSelectedTopic('all');
    setLoadingTopics(false);
  };

  const startPractice = () => {
    if (!selectedSubject) return;
    
    // Track the final practice configuration
    track('practice_started', {
      subject: selectedSubject,
      topic: selectedTopic,
      difficulty: selectedDifficulty
    });
    
    router.push({
      pathname: '/(shared)/practice-session',
      params: { 
        subject: selectedSubject, 
        topic: selectedTopic,
        difficulty: selectedDifficulty
      }
    });
  };

  const renderChips = (options: string[], selected: string, onSelect: (val: string) => void) => (
    <View style={styles.chipContainer}>
      {options.map(opt => (
        <TouchableOpacity 
          key={opt}
          style={[styles.chip, selected === opt && styles.chipSelected]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.chipText, selected === opt && styles.chipTextSelected]}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('s236')}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('s355')}</Text>
        {renderChips(SUBJECTS, selectedSubject, setSelectedSubject)}
      </View>

      {selectedSubject ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('s452')}</Text>
          {loadingTopics ? (
            <ActivityIndicator size="small" color={LEGACY_COLORS.indigo600} />
          ) : (
            renderChips(['all', ...availableTopics], selectedTopic, setSelectedTopic)
          )}
        </View>
      ) : null}

      {selectedSubject ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('s64')}</Text>
          {renderChips(DIFFICULTIES, selectedDifficulty, setSelectedDifficulty)}
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.startButton, !selectedSubject && styles.startButtonDisabled]}
        onPress={startPractice}
        disabled={!selectedSubject}
      >
        <Text style={styles.startButtonText}>{t('s383')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.momentumLink}
        onPress={() => router.push('/(shared)/momentum')}
      >
        <Text style={styles.momentumLinkText}>{t('s10')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: LEGACY_COLORS.slate50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: LEGACY_COLORS.slate900,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: LEGACY_COLORS.slate700,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: LEGACY_COLORS.slate100,
    borderWidth: 1,
    borderColor: LEGACY_COLORS.slate300,
  },
  chipSelected: {
    backgroundColor: LEGACY_COLORS.indigo50,
    borderColor: LEGACY_COLORS.indigo600,
  },
  chipText: {
    color: LEGACY_COLORS.slate600,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: LEGACY_COLORS.indigo600,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: LEGACY_COLORS.indigo600,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  startButtonDisabled: {
    backgroundColor: LEGACY_COLORS.slate400,
  },
  startButtonText: {
    color: LEGACY_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  momentumLink: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LEGACY_COLORS.indigo600,
    marginBottom: 24,
  },
  momentumLinkText: {
    color: LEGACY_COLORS.indigo600,
    fontSize: 15,
    fontWeight: '600',
  },
});
