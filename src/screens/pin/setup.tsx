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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHomeRoute } from '../../utils/home-routing';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation';

const PIN_LENGTH = 4;

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinSetup() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PinSetup'>>();
  const fromSettings = route.params?.fromSettings ?? false;
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = step === 'create' ? setPin : setConfirmPin;
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const t = {
    fr: {
      titleCreate: 'Créer votre code PIN',
      titleConfirm: 'Confirmez votre code PIN',
      errorMismatch: 'Les codes PIN ne correspondent pas. Réessayez.',
      skip: "Ignorer pour l'instant",
    },
    en: {
      titleCreate: 'Create your PIN code',
      titleConfirm: 'Confirm your PIN code',
      errorMismatch: 'PIN codes do not match. Please try again.',
      skip: 'Skip for now',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setCurrentPin(prev => prev.slice(0, -1));
      setError('');
      return;
    }
    if (key === '') return;
    if (currentPin.length >= PIN_LENGTH) return;

    const newPin = currentPin + key;
    setCurrentPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => handlePinComplete(newPin), 150);
    }
  };

  const handlePinComplete = async (newPin: string) => {
    if (step === 'create') {
      setStep('confirm');
    } else {
      if (newPin !== pin) {
        Vibration.vibrate(400);
        setError(t.errorMismatch);
        setConfirmPin('');
        setPin('');
        setStep('create');
        return;
      }
      await AsyncStorage.setItem('pin_code', newPin);
      await AsyncStorage.setItem('pin_enabled', 'true');

      const userRaw = await AsyncStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const roles: string[] = user?.role ?? [];
      navigation.replace(getHomeRoute(roles));
    }
  };

  const dots = Array(PIN_LENGTH)
    .fill(0)
    .map((_, i) => ({
      filled: i < currentPin.length,
    }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Retour */}
      {fromSettings && (
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={
              isDark
                ? require('../../assets/images/arrowback_light.png')
                : require('../../assets/images/arrowback_dark.png')
            }
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {step === 'create' ? t.titleCreate : t.titleConfirm}
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
                style={[
                  styles.key,
                  key === '' && { opacity: 0 },
                  key === '⌫' && styles.keyBackspace,
                ]}
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

      {/* Skip */}
      {!fromSettings && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={async () => {
            await AsyncStorage.setItem('pin_enabled', 'false');
            const userRaw = await AsyncStorage.getItem('user');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const roles: string[] = user?.role ?? [];
            navigation.replace(getHomeRoute(roles));
          }}
        >
          <Text style={[styles.skipText, { color: theme.text }]}>
            {t.skip}
          </Text>
        </TouchableOpacity>
      )}
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
  back: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.lg,
    zIndex: 10,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
  keyBackspace: {
    opacity: 0.7,
  },
  keyText: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
  },
  skipBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body,
    fontSize: typography.sizes.lg,
    textDecorationLine: 'underline',
  },
});
