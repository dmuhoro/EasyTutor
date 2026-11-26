import { LEGACY_COLORS } from '../src/design/legacyPalette';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import * as Haptics from '../lib/haptics';
import { Database } from '../src/infrastructure/database';
import { portalFromMode } from '../src/domain/learning/portal';
import { getActiveLearningMode } from '../src/infrastructure/portalContext';
import { trackEvent } from '../lib/analytics';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
  source: string;
  topic?: string;
  contentType?: 'roadmap' | 'quiz';
  portalType?: 'high_school' | 'university' | 'knowledge_explorer';
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isVisible, onClose, source, topic, contentType, portalType }) => {
  const { user } = useAuthStore();
  const [rating, setRating] = useState<'positive' | 'negative' | 'good' | 'okay' | 'bad' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isAIQualityCheck = contentType === 'roadmap' || contentType === 'quiz';

  // Resolve the portal from the active infrastructure context (the same
  // source every other governed write uses). Fail closed to the
  // conservative learner portal rather than guessing.
  const activeMode = getActiveLearningMode();
  const resolvedPortal = portalType ?? (activeMode ? portalFromMode(activeMode) : 'high_school');

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
      if (isAIQualityCheck) {
        await Database.governedWrite('ai_feedback', {
          content_type: contentType,
          rating: rating === 'positive' ? 'positive' : 'negative',
          feedback_text: comment || undefined,
          topic: topic || 'General',
        }, {
          portalType: resolvedPortal,
        });
      } else {
        await Database.governedWrite('user_feedback', {
          rating,
          comment: comment || undefined,
          source,
        }, {
          portalType: resolvedPortal,
        });
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
        <View className="bg-legacy-night-surface w-full rounded-[40px] p-8 border border-legacy-night-border shadow-2xl">
          {!submitted ? (
            <>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-2xl font-bold font-syne">
                  {isAIQualityCheck ? 'Was this helpful?' : 'How was it?'}
                </Text>
                <TouchableOpacity onPress={() => { onClose(); resetState(); }}>
                  <Ionicons name="close" size={24} color={LEGACY_COLORS.nightTextMuted} />
                </TouchableOpacity>
              </View>

              <Text className="text-legacy-night-text-muted font-dmsans mb-8 text-lg">
                {isAIQualityCheck
                  ? 'Did this actually help you understand the topic?'
                  : 'Your feedback helps us build the perfect study tool.'}
              </Text>

              <View className="flex-row justify-around mb-8">
                {isAIQualityCheck ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setRating('negative')}
                      className={`items-center p-6 rounded-3xl border-2 ${rating === 'negative' ? 'bg-legacy-red500/10 border-legacy-red500' : 'border-transparent bg-legacy-night-canvas'}`}
                    >
                      <Ionicons name="thumbs-down" size={40} color={rating === 'negative' ? LEGACY_COLORS.red500 : LEGACY_COLORS.nightTextMuted} />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === 'negative' ? 'text-legacy-red500' : 'text-legacy-night-text-muted'}`}>
                        Not Helpful
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setRating('positive')}
                      className={`items-center p-6 rounded-3xl border-2 ${rating === 'positive' ? 'bg-legacy-green500/10 border-legacy-green500' : 'border-transparent bg-legacy-night-canvas'}`}
                    >
                      <Ionicons name="thumbs-up" size={40} color={rating === 'positive' ? LEGACY_COLORS.green500 : LEGACY_COLORS.nightTextMuted} />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === 'positive' ? 'text-legacy-green500' : 'text-legacy-night-text-muted'}`}>
                        Helpful
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  [
                    { id: 'bad', icon: 'sad-outline', label: 'Needs work', color: LEGACY_COLORS.red500 },
                    { id: 'okay', icon: 'happy-outline', label: 'Okay', color: LEGACY_COLORS.amberBright },
                    { id: 'good', icon: 'heart-outline', label: 'Great!', color: LEGACY_COLORS.green500 },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setRating(item.id as any)}
                      className={`items-center p-4 rounded-3xl border-2 transition-all ${rating === item.id ? 'bg-legacy-night-surface border-legacy-blue-ribbon' : 'border-transparent bg-legacy-night-canvas'}`}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={32}
                        color={rating === item.id ? LEGACY_COLORS.blueRibbon : item.color}
                      />
                      <Text className={`text-[10px] mt-2 font-bold font-syne uppercase tracking-widest ${rating === item.id ? 'text-legacy-blue-ribbon' : 'text-legacy-night-text-muted'}`}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <TextInput
                placeholder={isAIQualityCheck ? "Optional: What was confusing or wrong?" : "Optional: Tell us more..."}
                placeholderTextColor={LEGACY_COLORS.nightTextSecondary}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                className="bg-legacy-night-canvas text-white p-5 rounded-2xl border border-legacy-night-border font-dmsans text-base mb-8 text-start"
                style={{ height: 100, textAlignVertical: 'top' }}
              />

              {error && (
                <Text className="text-legacy-red500 font-dmsans text-base mb-4 text-center">
                  {error}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!rating || submitting}
                className={`py-5 rounded-2xl flex-row items-center justify-center ${rating && !submitting ? 'bg-legacy-blue-ribbon shadow-lg shadow-legacy-blue-ribbon/30' : 'bg-legacy-night-border opacity-50'}`}
              >
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold font-syne text-lg">Send Feedback</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center py-10">
              <View className="bg-legacy-green500/10 w-20 h-20 rounded-full items-center justify-center mb-6">
                 <Ionicons name="checkmark-circle" size={48} color={LEGACY_COLORS.green500} />
              </View>
              <Text className="text-white text-3xl font-bold font-syne mb-2">Thank you!</Text>
              <Text className="text-legacy-night-text-muted font-dmsans text-center text-lg">
                We're listening.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
