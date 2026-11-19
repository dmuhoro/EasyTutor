import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS } from '../../src/design/tokens';
import { t } from '../../src/locales';
import { answerSourceLabelKey } from '../../lib/ai/providerLabels';
import type { AIProvider } from '../../lib/ai/reliability';

export interface Citation {
  source: string;
  chapter?: number | string;
  page?: number | string;
  /** Retrieved passage shown on tap. Absent => the chip is not interactive. */
  excerpt?: string;
}

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  /** Rail that actually answered; undefined fails closed to "source unavailable". */
  source?: AIProvider;
  citations?: Citation[];
  className?: StyleProp<ViewStyle>;
  textClassName?: StyleProp<TextStyle>;
}

/**
 * AI chat message bubble. User messages right-aligned (brand tint),
 * assistant messages left-aligned with optional citation chips below. Tapping a
 * chip that carries a retrieved excerpt expands that passage inline; chips with
 * no excerpt stay inert instead of offering a dead tap target.
 * Token-driven colours, no hard-coded hex.
 */
export function ChatBubble({
  role,
  content,
  source,
  citations = [],
  className,
  textClassName,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const sourceLabel = t(answerSourceLabelKey(source));
  const [expandedCitationIndex, setExpandedCitationIndex] = useState<number | null>(null);
  const expandedCitation = expandedCitationIndex === null
    ? undefined
    : citations[expandedCitationIndex];
  // Fail closed: never render an excerpt panel for a citation that has none.
  const visibleExcerpt = expandedCitation?.excerpt?.trim() ? expandedCitation.excerpt : undefined;

  return (
    <View
      className={cn(
        'flex-row items-start gap-3 mb-4',
        isUser ? 'flex-row-reverse' : '',
        className,
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-brand-500/20 flex-row items-center justify-center shrink-0">
          <Ionicons name="school" size={16} color={COLORS.brand[400]} />
        </View>
      )}

      {/* Message content */}
      <View
        className={cn(
          'max-w-[85%] rounded-2xl p-4 flex-1',
          isUser
            ? 'bg-brand-500 text-text-inverse self-end'
            : 'bg-surface-card border border-surface-border text-text-primary self-start',
        )}
      >
        <Text
          className={cn(
            'font-dmsans text-base leading-7',
            isUser ? 'text-text-inverse' : 'text-text-primary',
            textClassName,
          )}
        >
          {content}
        </Text>

        {!isUser && (
          <View
            className="flex-row items-center gap-1 mt-2"
            accessibilityRole="text"
            accessibilityLabel={sourceLabel}
          >
            <Ionicons name="information-circle-outline" size={12} color={COLORS.text.secondary} />
            <Text className="text-[10px] font-dmsans-medium text-text-secondary">
              {sourceLabel}
            </Text>
          </View>
        )}

        {citations.length > 0 && !isUser && (
          <View className="mt-3">
            <View className="flex-row flex-wrap gap-1.5">
              {citations.map((citation, i) => {
                const chipLabel = `${t('source')}: ${citation.source}${citation.chapter ? ` • Ch. ${citation.chapter}` : ''}`;
                const chipContent = (
                  <>
                    <Ionicons
                      name={'quote' as unknown as React.ComponentProps<typeof Ionicons>['name']}
                      size={10}
                      color={COLORS.text.secondary}
                    />
                    <Text className="text-[10px] font-dmsans font-medium text-text-secondary">
                      {citation.source}
                      {citation.chapter && ` • Ch. ${citation.chapter}`}
                    </Text>
                  </>
                );

                // A chip with no retrieved excerpt must not advertise a tap it cannot honour.
                if (!citation.excerpt?.trim()) {
                  return (
                    <View
                      key={i}
                      accessibilityRole="text"
                      accessibilityLabel={chipLabel}
                      className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-surface-elevated border border-surface-border"
                    >
                      {chipContent}
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={chipLabel}
                    aria-label={chipLabel}
                    accessibilityState={{ expanded: expandedCitationIndex === i }}
                    onPress={() => setExpandedCitationIndex((prev) => (prev === i ? null : i))}
                    className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-surface-elevated border border-surface-border"
                  >
                    {chipContent}
                  </TouchableOpacity>
                );
              })}
            </View>
            {visibleExcerpt && (
              <View accessibilityRole="text" className="mt-2 rounded-lg bg-surface-subtle p-3">
                <Text className="text-xs leading-5 text-text-primary">“{visibleExcerpt}”</Text>
                <Text className="mt-1 text-[10px] font-dmsans-medium text-text-secondary">
                  {t('fromPrivateNotes')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {isUser && (
        <View className="w-8 h-8 rounded-full bg-surface-card border border-surface-border flex-row items-center justify-center shrink-0">
          <Ionicons name="person" size={16} color={COLORS.text.secondary} />
        </View>
      )}
    </View>
  );
}
