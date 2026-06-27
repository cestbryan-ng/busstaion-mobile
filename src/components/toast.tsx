import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastAPI = {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
};

const CONFIGS: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success },
  error: { icon: 'close-circle', color: colors.error },
  info: { icon: 'information-circle', color: colors.primary },
  warning: { icon: 'warning', color: '#f59e0b' },
};

const ToastContext = createContext<ToastAPI>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export function useToast(): ToastAPI {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [translateY, opacity]);

  const show = useCallback(
    (msg: string, t: ToastType = 'success', duration = 3000) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      translateY.setValue(-120);
      opacity.setValue(0);
      setMessage(msg);
      setType(t);
      setVisible(true);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(hide, duration);
    },
    [translateY, opacity, hide],
  );

  const api: ToastAPI = {
    show,
    success: (msg, dur) => show(msg, 'success', dur),
    error: (msg, dur) => show(msg, 'error', dur),
    info: (msg, dur) => show(msg, 'info', dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
  };

  const conf = CONFIGS[type];

  return (
    <ToastContext.Provider value={api}>
      <View style={{ flex: 1 }}>
        {children}
        {visible && (
          <Animated.View
            style={[
              s.toast,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderLeftColor: conf.color,
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <Ionicons name={conf.icon} size={20} color={conf.color} />
            <Text
              style={[s.message, { color: theme.textStrong }]}
              numberOfLines={2}
            >
              {message}
            </Text>
            <TouchableOpacity
              onPress={hide}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={theme.text} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 4,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  message: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
});
