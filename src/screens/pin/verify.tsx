import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Vibration,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { logout } from '../../utils/logout';
import { getHomeRoute } from '../../utils/home-routing';
import type { RootStackParamList } from '../../navigation';
import { resetPin } from '../../utils/reset-pin';

const PIN_LENGTH = 4;

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinVerify() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const t = {
    fr: {
      title: 'Saisissez votre code PIN',
      errorIncorrect: (remaining: number) =>
        `Code PIN incorrect. ${remaining} tentative(s) restante(s).`,
      forgot: 'Code PIN oublié ?',
    },
    en: {
      title: 'Enter your PIN code',
      errorIncorrect: (remaining: number) =>
        `Incorrect PIN. ${remaining} attempt(s) remaining.`,
      forgot: 'Forgot PIN?',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setPin(prev => prev.slice(0, -1));
      setError('');
      return;
    }
    if (key === '') return;
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => handlePinComplete(newPin), 150);
    }
  };

  const handlePinComplete = async (enteredPin: string) => {
    const storedPin = await AsyncStorage.getItem('pin_code');

    if (enteredPin === storedPin) {
      const userRaw = await AsyncStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const roles: string[] = user?.role ?? [];
      navigation.replace(getHomeRoute(roles));
    } else {
      Vibration.vibrate(400);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= 5) {
        await logout(navigation);
        return;
      }

      setError(
        t.errorIncorrect(5 - newAttempts)
      );
    }
  };

  const dots = Array(PIN_LENGTH)
    .fill(0)
    .map((_, i) => ({
      filled: i < pin.length,
    }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/busstation_bleu.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                borderColor: colors.primary,
                backgroundColor: dot.filled ? colors.primary : 'transparent',
              },
            ]}
          />
        ))}
      </View>

      {/* Error */}
      {error !== '' && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYPAD.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyRow}>
            {row.map((key, keyIndex) => (
              <TouchableOpacity
                key={keyIndex}
                style={[styles.key, key === '' && { opacity: 0 }]}
                onPress={() => handleKey(key)}
                disabled={key === ''}
              >
                <Text
                  style={[
                    styles.keyText,
                    { color: theme.textStrong },
                    key === '⌫' && { fontSize: typography.sizes.lg },
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* PIN oublié */}
      <View style={[styles.separator, { borderTopColor: theme.border }]} />
      <TouchableOpacity onPress={() => resetPin(navigation)}>
        <Text style={[styles.forgotText, { color: colors.primary }]}>
          {t.forgot}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 180,
    height: 120,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  error: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  keypad: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  key: {
    flex: 1,
    height: 72,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
  },
  separator: {
    width: '100%',
    borderTopWidth: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
});
