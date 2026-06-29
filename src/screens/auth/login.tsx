import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, CGU_URL } from '../../utils/config';
import { useToast } from '../../components/toast';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation';

type StatusMessage = {
  text: string;
  type: 'success' | 'error' | null;
};

function validateForm(
  username: string,
  password: string,
  t: any,
): string | null {
  if (!username.trim()) return t.errorUsernameEmpty;
  if (!password.trim()) return t.errorPasswordEmpty;
  if (password.length < 8) return t.errorPasswordLength;
  return null;
}

export default function Login() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({ text: '', type: null });

  const t = {
    fr: {
      title: 'Connexion',
      subtitle: 'Accédez à votre compte utilisateur',
      usernameLabel: "Nom d'utilisateur",
      usernamePlaceholder: "Votre nom d'utilisateur",
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: 'Votre mot de passe',
      loginBtn: 'Connexion',
      noAccount: "Vous n'avez pas de compte ?",
      signUp: "S'inscrire",
      errorUsernameEmpty: "Le nom d'utilisateur est requis.",
      errorPasswordEmpty: 'Le mot de passe est requis.',
      errorPasswordLength:
        'Le mot de passe doit contenir au moins 8 caractères.',
      successMessage: 'Connexion réussie !',
      errorInvalidCredentials: 'Identifiants incorrects, veuillez réessayer !',
      errorUserNotFound: 'Utilisateur non trouvé, veuillez réessayer !',
      errorGeneric:
        'Le serveur est actuellement indisponible. Veuillez réessayer plus tard.',
      hintLang: 'Appuyez pour changer de langue :',
      cguText: 'En vous connectant, vous acceptez nos ',
      cguLink: "conditions générales d'utilisation",
      loginSuccess: 'Connexion réussie !',
      wrongCredentials: 'Identifiants incorrects',
      networkError: 'Erreur réseau, réessayez',
    },
    en: {
      title: 'Login',
      subtitle: 'Access your user account',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Your username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Your password',
      loginBtn: 'Login',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      errorUsernameEmpty: 'Username is required.',
      errorPasswordEmpty: 'Password is required.',
      errorPasswordLength: 'Password must be at least 8 characters.',
      successMessage: 'Login successful!',
      errorInvalidCredentials: 'Invalid credentials, please try again!',
      errorUserNotFound: 'User not found, please try again!',
      errorGeneric:
        'The server is currently unavailable. Please try again later.',
      hintLang: 'Tap to change language :',
      cguText: 'By logging in, you agree to our ',
      cguLink: 'terms and conditions',
      loginSuccess: 'Logged in successfully!',
      wrongCredentials: 'Incorrect credentials',
      networkError: 'Network error, please try again',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  const handleLogin = async () => {
    const validationError = validateForm(username, password, t);
    if (validationError) {
      setStatus({ text: validationError, type: 'error' });
      return;
    }

    setLoading(true);
    setStatus({ text: '', type: null });

    try {
      const response = await fetch(`${API_URL}/utilisateur/connexion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data));
        await AsyncStorage.setItem(
          'session_expires_at',
          expiresAt.toISOString(),
        );

        toast.success(t.loginSuccess);
        setStatus({ text: t.successMessage, type: 'success' });

        setTimeout(async () => {
          const roles: string[] = data.role;
          const flags: Record<string, string> = {};

          if (roles.includes('BUS_STATION_MANAGER')) {
            flags.isAgencyConnected = 'true';
            flags.isOrganizationConnected = 'true';
          } else if (roles.includes('AGENCE_VOYAGE')) {
            flags.isAgencyConnected = 'true';
          } else {
            flags.isCustomerAuthenticated = 'true';
          }

          for (const [key, value] of Object.entries(flags)) {
            await AsyncStorage.setItem(key, value);
          }

          const pinEnabled = await AsyncStorage.getItem('pin_enabled');

          if (pinEnabled === 'true') {
            if (roles.includes('BUS_STATION_MANAGER')) {
              navigation.replace('BsmMain');
            } else if (roles.includes('AGENCE_VOYAGE')) {
              navigation.replace('AgencyMain');
            } else {
              navigation.replace('ClientMain');
            }
          } else {
            navigation.replace('PinSetup', { fromSettings: false });
          }
        }, 800);
      } else {
        if (response.status === 404) {
          toast.error(t.wrongCredentials);
          setStatus({ text: t.errorUserNotFound, type: 'error' });
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t.wrongCredentials);
          setStatus({ text: t.errorInvalidCredentials, type: 'error' });
        } else {
          setStatus({ text: data.message || t.errorGeneric, type: 'error' });
        }
      }
    } catch {
      toast.error(t.networkError);
      setStatus({ text: t.errorGeneric, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    await AsyncStorage.setItem('app_lang', newLang);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
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

        {/* Message */}
        <Text style={[styles.subtitle, { color: theme.textStrong }]}>
          {t.subtitle}
        </Text>

        {/* Status message */}
        {status.type !== null && (
          <View style={styles.statusBox}>
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    status.type === 'success' ? colors.success : colors.error,
                },
              ]}
            >
              {status.text}
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Username */}
          <Text style={[styles.label, { color: theme.textStrong }]}>
            {t.usernameLabel}
          </Text>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textStrong }]}
              placeholder={t.usernamePlaceholder}
              placeholderTextColor={theme.text}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <Text
            style={[
              styles.label,
              { color: theme.textStrong, marginTop: spacing.lg },
            ]}
          >
            {t.passwordLabel}
          </Text>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textStrong }]}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={theme.text}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textStrong}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>{t.loginBtn}</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: theme.textStrong }]}>
              {t.noAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.signupLink, { color: colors.primary }]}>
                {t.signUp}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CGU */}
          <Text style={[styles.cguText, { color: theme.text }]}>
            {t.cguText}
            <Text
              style={[styles.cguLink, { color: colors.primary }]}
              onPress={() =>
                Linking.openURL(
                  `${CGU_URL}`,
                )
              }
            >
              {t.cguLink}
            </Text>
          </Text>

          {/* Separator + Lang */}
          <View style={[styles.separator, { borderTopColor: theme.border }]} />
          <View style={styles.langRow}>
            <Text style={[styles.langHint, { color: theme.text }]}>
              {t.hintLang}
            </Text>
            <TouchableOpacity
              style={[styles.langBtn, { borderColor: colors.primary }]}
              onPress={changeLanguage}
            >
              <Text style={[styles.langText, { color: colors.primary }]}>
                {lang === 'fr' ? 'Français' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 180,
    height: 120,
  },
  subtitle: {
    ...typography.body,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusBox: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    ...typography.body,
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  loginBtn: {
    borderRadius: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  signupLink: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  cguText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cguLink: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    textDecorationLine: 'underline',
  },
  separator: {
    borderTopWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  langBtn: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  langHint: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  langText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.3,
  },
});
