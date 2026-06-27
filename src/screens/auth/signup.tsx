import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
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
import { useToast } from '../../components/toast';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation';
import { API_URL, CGU_URL } from '../../utils/config';

type Step = 1 | 2 | 3;
type Role = 'USAGER' | 'AGENCE_VOYAGE';

type FormStep1 = {
  first_name: string;
  last_name: string;
  username: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | '';
  email: string;
  phone_number: string;
  password: string;
  confirmPassword: string;
  acceptCGU: boolean;
};

type FormStep3 = {
  long_name: string;
  ceo_name: string;
  email: string;
  year_founded: string;
  business_registration_number: string;
  tax_number: string;
};

type Errors1 = Partial<Record<keyof FormStep1, string>>;
type Errors3 = Partial<Record<keyof FormStep3, string>>;

function validateStep1(form: FormStep1, t: any): Errors1 {
  const e: Errors1 = {};
  if (!form.first_name.trim()) e.first_name = t.required;
  if (!form.last_name.trim()) e.last_name = t.required;
  if (!form.username.trim()) e.username = t.required;
  else if (form.username.trim().length < 3) e.username = t.minUsername;
  if (!form.age.trim()) e.age = t.required;
  else if (isNaN(Number(form.age)) || Number(form.age) < 12) e.age = t.minAge;
  if (!form.gender) e.gender = t.required;
  if (!form.email.trim()) e.email = t.required;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = t.invalidEmail;
  if (!form.phone_number.trim()) e.phone_number = t.required;
  else if (!/^(6[5-9]\d{7}|2[23]\d{7})$/.test(form.phone_number.trim()))
    e.phone_number = t.invalidPhone;
  if (!form.password) e.password = t.required;
  else if (form.password.length < 8) e.password = t.minPassword;
  else if (!/[A-Z]/.test(form.password)) e.password = t.passwordUppercase;
  else if (!/[0-9]/.test(form.password)) e.password = t.passwordNumber;
  if (!form.confirmPassword) e.confirmPassword = t.required;
  else if (form.confirmPassword !== form.password)
    e.confirmPassword = t.passwordMismatch;
  if (!form.acceptCGU) e.acceptCGU = t.acceptCGURequired;
  return e;
}

function validateStep3(form: FormStep3, t: any): Errors3 {
  const e: Errors3 = {};
  if (!form.long_name.trim()) e.long_name = t.required;
  if (!form.ceo_name.trim()) e.ceo_name = t.required;
  if (!form.email.trim()) e.email = t.required;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = t.invalidEmail;
  if (!form.year_founded.trim()) e.year_founded = t.required;
  if (!form.business_registration_number.trim())
    e.business_registration_number = t.required;
  if (!form.tax_number.trim()) e.tax_number = t.required;
  return e;
}

export default function SignUp() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>('USAGER');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form1, setForm1] = useState<FormStep1>({
    first_name: '',
    last_name: '',
    username: '',
    age: '',
    gender: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    acceptCGU: false,
  });

  const [form3, setForm3] = useState<FormStep3>({
    long_name: '',
    ceo_name: '',
    email: '',
    year_founded: '',
    business_registration_number: '',
    tax_number: '',
  });

  const [errors1, setErrors1] = useState<Errors1>({});
  const [errors3, setErrors3] = useState<Errors3>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  const translations = {
    fr: {
      titleStep1: 'Créer un compte',
      titleStep3: 'Créer une agence',
      subtitleStep1: 'Rejoignez la plateforme',
      subtitleStep3: 'Complétez les informations de votre agence',
      sectionPersonal: 'Informations personnelles',
      sectionAccountType: 'Type de compte',
      sectionAgency: "Détails de l'agence",
      chooseType: 'Choisissez le type de compte qui vous correspond',
      firstName: 'Prénom',
      firstNamePlaceholder: 'Votre prénom',
      lastName: 'Nom',
      lastNamePlaceholder: 'Votre nom',
      username: "Nom d'utilisateur",
      usernamePlaceholder: "Votre nom d'utilisateur",
      age: 'Âge',
      agePlaceholder: 'Votre âge',
      gender: 'Sexe',
      email: 'Email',
      emailPlaceholder: 'Votre adresse mail',
      phone: 'Téléphone',
      phonePlaceholder: 'Votre numéro de téléphone',
      password: 'Mot de passe',
      passwordPlaceholder: 'Votre mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      confirmPasswordPlaceholder: 'Confirmez votre mot de passe',
      male: 'Homme',
      female: 'Femme',
      client: 'Client',
      clientDesc: 'Compte simple pour voyager facilement sur la plateforme.',
      agency: 'Agence de voyage',
      agencyDesc: 'Compte pour gérer une agence de voyage et vos activités.',
      longName: "Nom complet de l'agence",
      ceoName: 'Nom du directeur général',
      agencyEmail: 'Email professionnel',
      yearFounded: 'Année de création',
      regNumber: "Numéro d'immatriculation",
      taxNumber: 'Numéro fiscal',
      continueBtn: 'Continuer',
      backBtn: 'Retour',
      createAgencyBtn: 'Créer Agence',
      alreadyAccount: 'Déjà un compte ?',
      login: 'Se connecter',
      acceptCGU: "J'accepte les ",
      cguLink: "conditions générales d'utilisation",
      secureData: 'Vos données sont sécurisées et protégées',
      required: 'Ce champ est requis.',
      minUsername: 'Minimum 3 caractères.',
      minAge: 'Âge minimum : 12 ans.',
      invalidEmail: 'Email invalide.',
      invalidPhone: 'Numéro de téléphone invalide.',
      minPassword: 'Minimum 8 caractères.',
      passwordUppercase: 'Au moins une majuscule requise.',
      passwordNumber: 'Au moins un chiffre requis.',
      passwordMismatch: 'Les mots de passe ne correspondent pas.',
      acceptCGURequired: 'Vous devez accepter les conditions.',
      errorGeneric:
        'Le serveur est actuellement indisponible. Veuillez réessayer plus tard.',
      errorConflict: "Email ou nom d'utilisateur déjà utilisé.",
      accountCreated: 'Compte créé avec succès',
      emailInUse: 'Email déjà utilisé',
      error: 'Une erreur est survenue',
    },
    en: {
      titleStep1: 'Create account',
      titleStep3: 'Create agency',
      subtitleStep1: 'Join the platform',
      subtitleStep3: 'Complete your agency information',
      sectionPersonal: 'Personal information',
      sectionAccountType: 'Account type',
      sectionAgency: 'Agency details',
      chooseType: 'Choose the account type that suits you',
      firstName: 'First name',
      firstNamePlaceholder: 'Your first name',
      lastName: 'Last name',
      lastNamePlaceholder: 'Your last name',
      username: 'Username',
      usernamePlaceholder: 'Your username',
      age: 'Age',
      agePlaceholder: 'Your age',
      gender: 'Gender',
      email: 'Email',
      emailPlaceholder: 'Your email',
      phone: 'Phone',
      phonePlaceholder: 'Your phone number',
      password: 'Password',
      passwordPlaceholder: 'Your password',
      confirmPassword: 'Confirm password',
      confirmPasswordPlaceholder: 'Confirm your password',
      male: 'Male',
      female: 'Female',
      client: 'Client',
      clientDesc: 'Simple account to travel easily on the platform.',
      agency: 'Travel agency',
      agencyDesc: 'Account to manage a travel agency and your activities.',
      longName: 'Agency full name',
      ceoName: 'CEO name',
      agencyEmail: 'Professional email',
      yearFounded: 'Year founded',
      regNumber: 'Business registration number',
      taxNumber: 'Tax number',
      continueBtn: 'Continue',
      backBtn: 'Back',
      createAgencyBtn: 'Create Agency',
      alreadyAccount: 'Already have an account?',
      login: 'Log in',
      acceptCGU: 'I accept the ',
      cguLink: 'terms and conditions',
      secureData: 'Your data is secure and protected',
      required: 'This field is required.',
      minUsername: 'Minimum 3 characters.',
      minAge: 'Minimum age: 12.',
      invalidEmail: 'Invalid email.',
      invalidPhone: 'Invalid phone number.',
      minPassword: 'Minimum 8 characters.',
      passwordUppercase: 'At least one uppercase letter required.',
      passwordNumber: 'At least one number required.',
      passwordMismatch: 'Passwords do not match.',
      acceptCGURequired: 'You must accept the terms.',
      errorGeneric:
        'The server is currently unavailable. Please try again later.',
      errorConflict: 'Email or username already in use.',
      accountCreated: 'Account created successfully',
      emailInUse: 'Email already in use',
      error: 'An error occurred',
    },
  }[lang];

  const t = translations;

  // ─── Step 1 Submit ──────────────────────────────────────────────────────────

  const handleStep1 = async () => {
    const e = validateStep1(form1, t);
    setErrors1(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch(`${API_URL}/utilisateur/inscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form1.first_name,
          last_name: form1.last_name,
          username: form1.username,
          email: form1.email,
          phone_number: form1.phone_number,
          age: Number(form1.age),
          gender: form1.gender,
          password: form1.password,
          role: ['USAGER'],
        }),
      });

      const data = await response.json();

      if (response.ok || response.status === 201 || response.status === 200) {
        // Auto-login pour récupérer le token (nécessaire pour POST /organizations)
        const loginRes = await fetch(`${API_URL}/utilisateur/connexion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form1.email,
            password: form1.password,
          }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) setToken(loginData.token);
        toast.success(t.accountCreated);
        setStep(2);
      } else if (response.status === 409) {
        toast.error(t.emailInUse);
        setServerError(t.errorConflict);
      } else {
        setServerError(data.message || t.errorGeneric);
      }
    } catch {
      toast.error(t.error);
      navigation.replace('SignUpError');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2 Submit ──────────────────────────────────────────────────────────

  const handleStep2 = () => {
    if (role === 'USAGER') {
      navigation.replace('SignUpSuccess');
    } else {
      setStep(3);
    }
  };

  // ─── Step 3 Submit ──────────────────────────────────────────────────────────

  const handleStep3 = async () => {
    const e = validateStep3(form3, t);
    setErrors3(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form3),
      });

      const data = await response.json();

      if (response.ok || response.status === 201) {
        toast.success(t.accountCreated);
        navigation.replace('SignUpSuccess');
      } else if (response.status === 409) {
        toast.error(t.emailInUse);
        setServerError(t.errorConflict);
      } else {
        setServerError(data.message || t.errorGeneric);
      }
    } catch {
      toast.error(t.error);
      navigation.replace('SignUpError');
    } finally {
      setLoading(false);
    }
  };

  const update1 = (key: keyof FormStep1, value: any) => {
    setForm1(prev => ({ ...prev, [key]: value }));
    setErrors1(prev => ({ ...prev, [key]: undefined }));
  };

  const update3 = (key: keyof FormStep3, value: string) => {
    setForm3(prev => ({ ...prev, [key]: value }));
    setErrors3(prev => ({ ...prev, [key]: undefined }));
  };

  const totalSteps = role === 'AGENCE_VOYAGE' ? 3 : 2;

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
          <TouchableOpacity
            onPress={() =>
              step === 1
                ? navigation.goBack()
                : setStep(prev => (prev - 1) as Step)
            }
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
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {step === 3 ? t.titleStep3 : t.titleStep1}
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
          {step === 3 ? t.subtitleStep3 : t.subtitleStep1}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3].slice(0, totalSteps).map((s, i) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: step >= s ? colors.primary : 'transparent',
                    borderColor: step >= s ? colors.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressDotText,
                    { color: step >= s ? '#fff' : theme.textStrong },
                  ]}
                >
                  {s}
                </Text>
              </View>
              {i < totalSteps - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    {
                      backgroundColor: step > s ? colors.primary : theme.border,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Server error */}
        {serverError !== '' && (
          <Text style={[styles.serverError, { color: colors.error }]}>
            {serverError}
          </Text>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t.sectionPersonal}
            </Text>
            <View
              style={[styles.sectionLine, { backgroundColor: colors.primary }]}
            />

            {/* Prénom */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.firstName}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.first_name ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.firstNamePlaceholder}
                placeholderTextColor={theme.text}
                value={form1.first_name}
                onChangeText={v => update1('first_name', v)}
              />
            </View>
            {errors1.first_name && (
              <Text style={styles.fieldError}>{errors1.first_name}</Text>
            )}

            {/* Nom */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.lastName}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.last_name ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.lastNamePlaceholder}
                placeholderTextColor={theme.text}
                value={form1.last_name}
                onChangeText={v => update1('last_name', v)}
              />
            </View>
            {errors1.last_name && (
              <Text style={styles.fieldError}>{errors1.last_name}</Text>
            )}

            {/* Username */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.username}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.username ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.usernamePlaceholder}
                placeholderTextColor={theme.text}
                value={form1.username}
                onChangeText={v => update1('username', v)}
                autoCapitalize="none"
              />
            </View>
            {errors1.username && (
              <Text style={styles.fieldError}>{errors1.username}</Text>
            )}

            {/* Âge */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.age}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.age ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.agePlaceholder}
                placeholderTextColor={theme.text}
                value={form1.age}
                onChangeText={v => update1('age', v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            {errors1.age && (
              <Text style={styles.fieldError}>{errors1.age}</Text>
            )}

            {/* Genre */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.gender}
            </Text>
            <View style={styles.genderRow}>
              {(['MALE', 'FEMALE'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    {
                      borderColor:
                        form1.gender === g ? colors.primary : theme.border,
                      backgroundColor:
                        form1.gender === g ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => update1('gender', g)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      { color: form1.gender === g ? '#fff' : theme.text },
                    ]}
                  >
                    {g === 'MALE' ? t.male : t.female}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors1.gender && (
              <Text style={styles.fieldError}>{errors1.gender}</Text>
            )}

            {/* Email */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.email}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.email ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.emailPlaceholder}
                placeholderTextColor={theme.text}
                value={form1.email}
                onChangeText={v => update1('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors1.email && (
              <Text style={styles.fieldError}>{errors1.email}</Text>
            )}

            {/* Téléphone */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.phone}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.phone_number
                    ? colors.error
                    : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <View style={styles.phonePrefix}>
                <Text style={styles.phoneFlag}>🇨🇲</Text>
                <Text
                  style={[styles.phonePrefixText, { color: theme.textStrong }]}
                >
                  +237
                </Text>
              </View>
              <View
                style={[styles.phoneDivider, { backgroundColor: theme.border }]}
              />
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.phonePlaceholder}
                placeholderTextColor={theme.text}
                value={form1.phone_number}
                onChangeText={v =>
                  update1('phone_number', v.replace(/[^0-9]/g, ''))
                }
                keyboardType="phone-pad"
                maxLength={9}
              />
            </View>
            {errors1.phone_number && (
              <Text style={styles.fieldError}>{errors1.phone_number}</Text>
            )}

            {/* Mot de passe */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.password}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.password ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={theme.text}
                value={form1.password}
                onChangeText={v => update1('password', v)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
            {errors1.password && (
              <Text style={styles.fieldError}>{errors1.password}</Text>
            )}

            {/* Confirmer mot de passe */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.confirmPassword}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors1.confirmPassword
                    ? colors.error
                    : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder={t.confirmPasswordPlaceholder}
                placeholderTextColor={theme.text}
                value={form1.confirmPassword}
                onChangeText={v => update1('confirmPassword', v)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
            {errors1.confirmPassword && (
              <Text style={styles.fieldError}>{errors1.confirmPassword}</Text>
            )}

            {/* CGU Checkbox */}
            <TouchableOpacity
              style={styles.cguRow}
              onPress={() => update1('acceptCGU', !form1.acceptCGU)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: errors1.acceptCGU
                      ? colors.error
                      : theme.border,
                    backgroundColor: form1.acceptCGU
                      ? colors.primary
                      : 'transparent',
                  },
                ]}
              >
                {form1.acceptCGU && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              <Text style={[styles.cguText, { color: theme.text }]}>
                {t.acceptCGU}
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
            </TouchableOpacity>
            {errors1.acceptCGU && (
              <Text style={styles.fieldError}>{errors1.acceptCGU}</Text>
            )}

            {/* Bouton continuer */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleStep1}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {t.continueBtn.toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>

            {/* Déjà un compte */}
            <View style={styles.loginRow}>
              <Text style={[styles.loginText, { color: theme.text }]}>
                {t.alreadyAccount}{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  {t.login}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t.sectionAccountType}
            </Text>
            <View
              style={[styles.sectionLine, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.chooseText, { color: theme.text }]}>
              {t.chooseType}
            </Text>

            {/* Client */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                {
                  borderColor:
                    role === 'USAGER' ? colors.primary : theme.border,
                  backgroundColor:
                    role === 'USAGER'
                      ? `${colors.primary}10`
                      : theme.background,
                },
              ]}
              onPress={() => setRole('USAGER')}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor:
                      role === 'USAGER' ? colors.primary : theme.border,
                  },
                ]}
              >
                {role === 'USAGER' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={styles.roleCardContent}>
                <Ionicons
                  name="person-outline"
                  size={28}
                  color={role === 'USAGER' ? colors.primary : theme.text}
                  style={styles.roleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleTitle, { color: theme.textStrong }]}>
                    {t.client}
                  </Text>
                  <Text style={[styles.roleDesc, { color: theme.text }]}>
                    {t.clientDesc}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Agence */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                {
                  borderColor:
                    role === 'AGENCE_VOYAGE' ? colors.primary : theme.border,
                  backgroundColor:
                    role === 'AGENCE_VOYAGE'
                      ? `${colors.primary}10`
                      : theme.background,
                },
              ]}
              onPress={() => setRole('AGENCE_VOYAGE')}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor:
                      role === 'AGENCE_VOYAGE' ? colors.primary : theme.border,
                  },
                ]}
              >
                {role === 'AGENCE_VOYAGE' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={styles.roleCardContent}>
                <Ionicons
                  name="briefcase-outline"
                  size={28}
                  color={role === 'AGENCE_VOYAGE' ? colors.primary : theme.text}
                  style={styles.roleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleTitle, { color: theme.textStrong }]}>
                    {t.agency}
                  </Text>
                  <Text style={[styles.roleDesc, { color: theme.text }]}>
                    {t.agencyDesc}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Boutons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => setStep(1)}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: colors.primary }]}
                >
                  {t.backBtn.toUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.btnFlex,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleStep2}
              >
                <Text style={styles.primaryBtnText}>
                  {t.continueBtn.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t.sectionAgency}
            </Text>
            <View
              style={[styles.sectionLine, { backgroundColor: colors.primary }]}
            />

            {/* Nom agence */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.longName}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.long_name ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="General Voyages"
                placeholderTextColor={theme.text}
                value={form3.long_name}
                onChangeText={v => update3('long_name', v)}
              />
            </View>
            {errors3.long_name && (
              <Text style={styles.fieldError}>{errors3.long_name}</Text>
            )}

            {/* CEO */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.ceoName}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.ceo_name ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="KENFACK Adam"
                placeholderTextColor={theme.text}
                value={form3.ceo_name}
                onChangeText={v => update3('ceo_name', v)}
              />
            </View>
            {errors3.ceo_name && (
              <Text style={styles.fieldError}>{errors3.ceo_name}</Text>
            )}

            {/* Email agence */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.agencyEmail}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.email ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="contact@voyages.com"
                placeholderTextColor={theme.text}
                value={form3.email}
                onChangeText={v => update3('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors3.email && (
              <Text style={styles.fieldError}>{errors3.email}</Text>
            )}

            {/* Année */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.yearFounded}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.year_founded
                    ? colors.error
                    : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="2025"
                placeholderTextColor={theme.text}
                value={form3.year_founded}
                onChangeText={v => update3('year_founded', v)}
                keyboardType="numeric"
              />
            </View>
            {errors3.year_founded && (
              <Text style={styles.fieldError}>{errors3.year_founded}</Text>
            )}

            {/* Numéro immatriculation */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.regNumber}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.business_registration_number
                    ? colors.error
                    : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="IM075123456"
                placeholderTextColor={theme.text}
                value={form3.business_registration_number}
                onChangeText={v => update3('business_registration_number', v)}
                autoCapitalize="characters"
              />
            </View>
            {errors3.business_registration_number && (
              <Text style={styles.fieldError}>
                {errors3.business_registration_number}
              </Text>
            )}

            {/* Numéro fiscal */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.taxNumber}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: errors3.tax_number ? colors.error : theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.textStrong }]}
                placeholder="FR12345678901"
                placeholderTextColor={theme.text}
                value={form3.tax_number}
                onChangeText={v => update3('tax_number', v)}
                autoCapitalize="characters"
              />
            </View>
            {errors3.tax_number && (
              <Text style={styles.fieldError}>{errors3.tax_number}</Text>
            )}

            {/* Boutons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => setStep(2)}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: colors.primary }]}
                >
                  {t.backBtn.toUpperCase()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.btnFlex,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleStep3}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t.createAgencyBtn.toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sécurité */}
            <View style={styles.secureRow}>
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={theme.text}
              />
              <Text style={[styles.secureText, { color: theme.text }]}>
                {t.secureData}
              </Text>
            </View>
          </View>
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  logoContainer: {
    alignItems: 'center',
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    maxWidth: 48,
    marginHorizontal: spacing.xs,
  },
  serverError: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  form: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  sectionLine: {
    height: 2,
    width: 32,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    ...typography.body,
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  phoneFlag: {
    fontSize: 18,
  },
  phonePrefixText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    marginRight: spacing.sm,
  },
  fieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    color: '#dc2626',
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cguText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  cguLink: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    borderRadius: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  loginLink: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  chooseText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  roleCard: {
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  roleIcon: {
    marginRight: spacing.md,
  },
  roleTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  roleDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.8,
  },
  btnFlex: {
    flex: 2,
    marginTop: 0,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  secureText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
});
