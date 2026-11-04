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
      <Text style={styles.title}>Practice Session</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Subject</Text>
        {renderChips(SUBJECTS, selectedSubject, setSelectedSubject)}
      </View>

      {selectedSubject ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Topic</Text>
          {loadingTopics ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            renderChips(['all', ...availableTopics], selectedTopic, setSelectedTopic)
          )}
        </View>
      ) : null}

      {selectedSubject ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Select Difficulty</Text>
          {renderChips(DIFFICULTIES, selectedDifficulty, setSelectedDifficulty)}
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.startButton, !selectedSubject && styles.startButtonDisabled]}
        onPress={startPractice}
        disabled={!selectedSubject}
      >
        <Text style={styles.startButtonText}>Start Practice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.momentumLink}
        onPress={() => router.push('/(shared)/momentum')}
      >
        <Text style={styles.momentumLinkText}>View Learning Momentum</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  momentumLink: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4F46E5',
    marginBottom: 24,
  },
  momentumLinkText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '600',
  },
});
