import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import * as Haptics from '../lib/haptics';
import { getAuthenticatedUser, getSupabaseClient, logSupabaseError } from '../lib/supabaseOps';
import { trackEvent } from '../lib/analytics';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  source: string;
  topic?: string;
  contentType?: 'roadmap' | 'quiz';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isVisible, onClose, source, topic, contentType }) => {
  const { user } = useAuthStore();
  const [rating, setRating] = useState<'positive' | 'negative' | 'good' | 'okay' | 'bad' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isAIQualityCheck = contentType === 'roadmap' || contentType === 'quiz';

  const resetState = () => {
    setSubmitted(false);
    setError(null);
    setRating(null);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!rating || !user) return;
    
    setSubmitting(true);
    setError(null);
    Haptics.notificationAsync('success');

    try {
      const client = getSupabaseClient();
      const authUser = await getAuthenticatedUser();

      if (isAIQualityCheck) {
        const { error } = await client.from('ai_feedback').insert({
          user_id: authUser.id,
          content_type: contentType,
          rating: rating === 'positive' ? 'positive' : 'negative',
          feedback_text: comment,
          topic: topic || 'General',
          created_at: new Date().toISOString(),
        });
        if (error) {
          logSupabaseError('ai_feedback', 'insert', error);
          throw error;
        }
      } else {
        const { error } = await client.from('user_feedback').insert({
          user_id: authUser.id,
          rating,
          comment,
          source,
          created_at: new Date().toISOString(),
        });
        if (error) {
          logSupabaseError('user_feedback', 'insert', error);
          throw error;
        }
      }
      
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    } catch (err) {
      setError('Your feedback could not be sent. Please try again.');
      trackEvent('feedback_submitted_failed', {
        user_id: user?.id ?? 'unknown',
        source,
        contentType,
      });
      console.error('[ERROR] [FEEDBACK] submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-[#161920] w-full rounded-[40px] p-8 border border-[#2a2f3d] shadow-2xl">
          {!submitted ? (
            <>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-2xl font-bold font-syne">
                  {isAIQualityCheck ? 'Was this helpful?' : 'How was it?'}
                </Text>
                <TouchableOpacity onPress={() => { onClose(); resetState(); }}>
                  <Ionicons name="close" size={24} color="#8a8fa3" />
                </TouchableOpacity>
              </View>

              <Text className="text-[#8a8fa3] font-dmsans mb-8 text-lg">
                {isAIQualityCheck 
                  ? 'Did this actually help you understand the topic?'
                  : 'Your feedback helps us build the perfect study tool.'}
              </Text>

              <View className="flex-row justify-around mb-8">
                {isAIQualityCheck ? (
                  <>
                    <TouchableOpacity 
                      onPress={() => setRating('negative')}
                      className={`items-center p-6 rounded-3xl border-2 ${rating === 'negative' ? 'bg-[#ef4444]/10 border-[#ef4444]' : 'border-transparent bg-[#0d0f12]'}`}
                    >
                      <Ionicons name="thumbs-down" size={40} color={rating === 'negative' ? '#ef4444' : '#8a8fa3'} />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === 'negative' ? 'text-[#ef4444]' : 'text-[#8a8fa3]'}`}>
                        Not Helpful
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setRating('positive')}
                      className={`items-center p-6 rounded-3xl border-2 ${rating === 'positive' ? 'bg-[#22c55e]/10 border-[#22c55e]' : 'border-transparent bg-[#0d0f12]'}`}
                    >
                      <Ionicons name="thumbs-up" size={40} color={rating === 'positive' ? '#22c55e' : '#8a8fa3'} />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === 'positive' ? 'text-[#22c55e]' : 'text-[#8a8fa3]'}`}>
                        Helpful
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  [
                    { id: 'bad', icon: 'sad-outline', label: 'Needs work', color: '#ef4444' },
                    { id: 'okay', icon: 'happy-outline', label: 'Okay', color: '#f59e0b' },
                    { id: 'good', icon: 'heart-outline', label: 'Great!', color: '#22c55e' },
                  ].map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      onPress={() => setRating(item.id as any)}
                      className={`items-center p-4 rounded-3xl border-2 transition-all ${rating === item.id ? 'bg-[#161920] border-[#4f7cff]' : 'border-transparent bg-[#0d0f12]'}`}
                    >
                      <Ionicons 
                        name={item.icon as any} 
                        size={32} 
                        color={rating === item.id ? '#4f7cff' : item.color} 
                      />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === item.id ? 'text-[#4f7cff]' : 'text-[#8a8fa3]'}`}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <TextInput
                placeholder={isAIQualityCheck ? "Optional: What was confusing or wrong?" : "Optional: Tell us more..."}
                placeholderTextColor="#5a5f73"
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                className="bg-[#0d0f12] text-white p-5 rounded-2xl border border-[#2a2f3d] font-dmsans text-base mb-8 text-start"
                style={{ height: 100, textAlignVertical: 'top' }}
              />

              {error && (
                <Text className="text-[#ef4444] font-dmsans text-base mb-4 text-center">
                  {error}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!rating || submitting}
                className={`py-5 rounded-2xl flex-row items-center justify-center ${rating && !submitting ? 'bg-[#4f7cff] shadow-lg shadow-[#4f7cff]/30' : 'bg-[#2a2f3d] opacity-50'}`}
              >
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold font-syne text-lg">Send Feedback</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center py-10">
              <View className="bg-[#22c55e]/10 w-20 h-20 rounded-full items-center justify-center mb-6">
                 <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              </View>
              <Text className="text-white text-3xl font-bold font-syne mb-2">Thank you!</Text>
              <Text className="text-[#8a8fa3] font-dmsans text-center text-lg">
                We're listening.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
