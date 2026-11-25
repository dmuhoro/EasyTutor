import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { cn } from '../lib/utils';
import { COLORS } from '../src/design/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}

/**
 * Bottom sheet — slide-up panel with overlay backdrop. Dismisses on
 * backdrop tap or drag-down gesture. Token-driven colours.
 */
export function Sheet({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
}: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const pan = new Animated.ValueXY();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        setDragY(gestureState.dy);
        pan.setValue({ x: 0, y: gestureState.dy });
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        setDragY(0);
        Animated.timing(pan, {
          toValue: { x: 0, y: 0 },
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const sheetStyle = {
    transform: [{ translateY: isOpen ? Math.max(dragY, 0) : SCREEN_HEIGHT }],
  } as any;

  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [isOpen, pan]);

  return (
    <View className="flex-1">
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.9}
            className={cn('absolute inset-0 z-40 bg-black/50', overlayClassName)}
          />
          {/* Sheet content */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: COLORS.surface.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 8,
                minHeight: 200,
                maxHeight: SCREEN_HEIGHT * 0.9,
              },
              sheetStyle,
            ] as any}
            className={cn(className)}
          >
            {/* Grab handle */}
            <View className="flex-row justify-center py-3">
              <View className="w-10 h-1 rounded-full bg-[#5a5f6d]/30" />
            </View>
            {children}
          </Animated.View>
        </>
      )}
    </View>
  );
}
