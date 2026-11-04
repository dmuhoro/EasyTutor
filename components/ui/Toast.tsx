import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cn } from '../../lib/utils';
import { COLORS, DURATION, Z_INDEX } from '../../src/design/tokens';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  message?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  id: number;
  message?: string;
}

interface ToastApi {
  show: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const CONTAINER: Record<ToastVariant, string> = {
  info: 'border-brand-500/40 bg-brand-500/15',
  success: 'border-success/40 bg-success/15',
  warning: 'border-warning/40 bg-warning/15',
  error: 'border-error/40 bg-error/15',
};

const ICON: Record<ToastVariant, React.ComponentProps<typeof Ionicons>['name']> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'alert-circle',
};

const ICON_COLOR: Record<ToastVariant, string> = {
  info: COLORS.brand[400],
  success: COLORS.success.light,
  warning: COLORS.warning.light,
  error: COLORS.error.light,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        title: options.title,
        message: options.message,
        variant: options.variant ?? 'info',
      };
      // Keep at most three visible toasts; dismiss the oldest.
      setItems((prev) => {
        const next = [...prev, item];
        const overflow = next.slice(0, Math.max(0, next.length - 3));
        overflow.forEach((old) => {
          const timer = timers.current.get(old.id);
          if (timer) {
            clearTimeout(timer);
            timers.current.delete(old.id);
          }
        });
        return next.slice(-3);
      });
      const duration = options.duration ?? DURATION.slow + 3000;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {items.length > 0 && (
        <View
          pointerEvents="box-none"
          style={{ zIndex: Z_INDEX.toast }}
          className="absolute left-0 right-0 top-0 px-4 pt-14"
        >
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="alert"
              activeOpacity={0.9}
              onPress={() => dismiss(item.id)}
              className={cn(
                'mb-2 flex-row items-start rounded-2xl border px-4 py-3',
                CONTAINER[item.variant],
              )}
            >
              <Ionicons
                name={ICON[item.variant]}
                size={18}
                color={ICON_COLOR[item.variant]}
                style={{ marginTop: 1 }}
              />
              <View className="ml-3 flex-1">
                <Text className="font-syne text-sm font-bold text-text-primary">{item.title}</Text>
                {item.message ? (
                  <Text className="mt-0.5 font-dmsans text-xs text-text-secondary">{item.message}</Text>
                ) : null}
              </View>
              <Ionicons name="close" size={14} color={COLORS.text.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }
  return context;
}
