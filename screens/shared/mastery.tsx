import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getSubjectMastery, getWeakTopics, MasteryRecord } from '../../lib/mastery';
import { useAuthStore } from '../../store/authStore';

export default function MasteryDashboardScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subjectMastery, setSubjectMastery] = useState<MasteryRecord[]>([]);
  const [weakTopics, setWeakTopics] = useState<MasteryRecord[]>([]);
  const [strongTopics, setStrongTopics] = useState<MasteryRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // For simplicity, let's just query a default set of subjects or query all available
    // Here we query 'Mathematics', 'Biology', 'Physics', 'Chemistry'
    const subjects = ['Mathematics', 'Biology', 'Physics', 'Chemistry'];
    let allMastery: MasteryRecord[] = [];
    
    for (const sub of subjects) {
      const records = await getSubjectMastery(user?.id, sub);
      allMastery = [...allMastery, ...records];
    }
    
    setSubjectMastery(allMastery);
    
    const weak = allMastery.filter(r => r.mastery_percent < 50 && r.attempts >= 2);
    const strong = allMastery.filter(r => r.mastery_percent >= 80);
    
    setWeakTopics(weak);
    setStrongTopics(strong);
    
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // Group by Subject for Subject %
  const subjectAverages: Record<string, number> = {};
  subjectMastery.forEach(m => {
    if (!subjectAverages[m.subject]) {
      const subjectRecords = subjectMastery.filter(x => x.subject === m.subject);
      const totalPercent = subjectRecords.reduce((acc, curr) => acc + curr.mastery_percent, 0);
      subjectAverages[m.subject] = Math.round(totalPercent / subjectRecords.length);
    }
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mastery Dashboard</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Subject Mastery</Text>
        {Object.entries(subjectAverages).length === 0 ? (
          <Text style={styles.emptyText}>No data yet. Complete some practice sessions!</Text>
        ) : (
          Object.entries(subjectAverages).map(([subj, percent]) => (
            <View key={subj} style={styles.card}>
              <Text style={styles.cardTitle}>{subj}</Text>
              <Text style={styles.cardValue}>{percent}%</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strong Topics (≥ 80%)</Text>
        {strongTopics.length === 0 ? (
          <Text style={styles.emptyText}>Keep practicing to build strong topics!</Text>
        ) : (
          strongTopics.map((m, idx) => (
            <View key={idx} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{m.topic}</Text>
                <Text style={styles.cardSubTitle}>{m.subject}</Text>
              </View>
              <Text style={[styles.cardValue, { color: '#059669' }]}>{m.mastery_percent}%</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weak Topics (&lt; 50%)</Text>
        {weakTopics.length === 0 ? (
          <Text style={styles.emptyText}>You're doing great! No weak topics detected.</Text>
        ) : (
          weakTopics.map((m, idx) => (
            <View key={idx} style={styles.card}>
              <View>
                <Text style={styles.cardTitle}>{m.topic}</Text>
                <Text style={styles.cardSubTitle}>{m.subject}</Text>
              </View>
              <Text style={[styles.cardValue, { color: '#DC2626' }]}>{m.mastery_percent}%</Text>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
  }
});
