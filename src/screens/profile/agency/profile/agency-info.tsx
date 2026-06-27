import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../../../components/toast';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';

type Agency = {
  agencyId: string;
  longName: string;
  location?: string;
  photoUrl?: string;
  greetingMessage?: string;
  contact?: { email?: string; phone?: string };
};

type FormErrors = Partial<
  Record<'longName' | 'email' | 'greetingMessage', string>
>;

export default function AgencyInfo() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [longName, setLongName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');

  const t = {
    fr: {
      title: 'Informations agence',
      logo: "Logo de l'agence",
      changeLogo: 'Changer le logo',
      logoHint: 'JPG, PNG max. 2Mo',
      agencyName: "Nom de l'agence",
      contactEmail: 'Email de contact',
      phone: 'Téléphone',
      location: 'Localisation',
      greeting: "Message d'accueil",
      greetingPlaceholder: 'Bienvenue chez ... !',
      save: 'Enregistrer les modifications',
      success: 'Informations mises à jour avec succès.',
      required: 'Ce champ est requis.',
      invalidEmail: 'Email invalide.',
      errorGeneric: 'Une erreur est survenue, veuillez réessayer.',
      changesSaved: 'Modifications enregistrées',
      saveError: 'Erreur lors de la sauvegarde',
    },
    en: {
      title: 'Agency information',
      logo: 'Agency logo',
      changeLogo: 'Change logo',
      logoHint: 'JPG, PNG max 2MB',
      agencyName: 'Agency name',
      contactEmail: 'Contact email',
      phone: 'Phone',
      location: 'Location',
      greeting: 'Greeting message',
      greetingPlaceholder: 'Welcome to ... !',
      save: 'Save changes',
      success: 'Information updated successfully.',
      required: 'This field is required.',
      invalidEmail: 'Invalid email.',
      errorGeneric: 'An error occurred, please try again.',
      changesSaved: 'Changes saved',
      saveError: 'Save error',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const [token, userRaw, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const user = userRaw ? JSON.parse(userRaw) : null;
        const chefId = user?.userId || user?.id;
        if (!chefId) return;

        const res = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAgency(data);
          setLongName(data.longName || '');
          setEmail(data.contact?.email || '');
          setPhone(data.contact?.phone || '');
          setLocation(data.location || '');
          setGreetingMessage(data.greetingMessage || '');
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!longName.trim()) e.longName = t.required;
    if (!email.trim()) e.email = t.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = t.invalidEmail;
    if (!greetingMessage.trim()) e.greetingMessage = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !agency) return;
    setSubmitting(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/agence/${agency.agencyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          longName,
          location,
          greetingMessage,
          contact: { email, phone },
        }),
      });

      if (res.ok) {
        toast.success(t.changesSaved);
        setSuccessMessage(t.success);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(t.saveError);
        setApiError(data.message || t.errorGeneric);
      }
    } catch {
      toast.error(t.saveError);
      setApiError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.form,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {/* Logo */}
            <Text style={[styles.label, { color: theme.textStrong }]}>
              {t.logo}
            </Text>
            <View style={styles.logoRow}>
              <View
                style={[
                  styles.logoPreview,
                  {
                    backgroundColor: `${colors.primary}15`,
                    borderColor: theme.border,
                  },
                ]}
              >
                {agency?.photoUrl ? (
                  <Image
                    source={{ uri: agency.photoUrl }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.logoLetter, { color: colors.primary }]}>
                    {longName.slice(0, 2).toUpperCase() || 'VP'}
                  </Text>
                )}
              </View>
              <View style={styles.logoTextCol}>
                <Text
                  style={[styles.logoChangeText, { color: theme.textStrong }]}
                >
                  {t.changeLogo}
                </Text>
                <Text style={[styles.logoHint, { color: theme.text }]}>
                  {t.logoHint}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.cameraBtn, { borderColor: theme.border }]}
              >
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={theme.textStrong}
                />
              </TouchableOpacity>
            </View>

            {/* Agency name */}
            <Text
              style={[
                styles.label,
                { color: theme.textStrong, marginTop: spacing.lg },
              ]}
            >
              {t.agencyName} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: errors.longName ? colors.error : theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={longName}
              onChangeText={v => {
                setLongName(v);
                setErrors(p => ({ ...p, longName: undefined }));
              }}
              placeholderTextColor={theme.text}
            />
            {errors.longName && (
              <Text style={[styles.fieldError, { color: colors.error }]}>
                {errors.longName}
              </Text>
            )}

            {/* Email */}
            <Text
              style={[
                styles.label,
                { color: theme.textStrong, marginTop: spacing.lg },
              ]}
            >
              {t.contactEmail} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: errors.email ? colors.error : theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={email}
              onChangeText={v => {
                setEmail(v);
                setErrors(p => ({ ...p, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.text}
            />
            {errors.email && (
              <Text style={[styles.fieldError, { color: colors.error }]}>
                {errors.email}
              </Text>
            )}

            {/* Phone */}
            <Text
              style={[
                styles.label,
                { color: theme.textStrong, marginTop: spacing.lg },
              ]}
            >
              {t.phone}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={theme.text}
            />

            {/* Location */}
            <Text
              style={[
                styles.label,
                { color: theme.textStrong, marginTop: spacing.lg },
              ]}
            >
              {t.location}
            </Text>
            <View
              style={[
                styles.locationInputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons name="location-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.locationInput, { color: theme.textStrong }]}
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={theme.text}
              />
            </View>

            {/* Greeting message */}
            <Text
              style={[
                styles.label,
                { color: theme.textStrong, marginTop: spacing.lg },
              ]}
            >
              {t.greeting} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                {
                  borderColor: errors.greetingMessage
                    ? colors.error
                    : theme.border,
                  backgroundColor: theme.backgroundAlt,
                  color: theme.textStrong,
                },
              ]}
              value={greetingMessage}
              onChangeText={v => {
                setGreetingMessage(v);
                setErrors(p => ({ ...p, greetingMessage: undefined }));
              }}
              placeholder={t.greetingPlaceholder}
              placeholderTextColor={theme.text}
              multiline
            />
            {errors.greetingMessage && (
              <Text style={[styles.fieldError, { color: colors.error }]}>
                {errors.greetingMessage}
              </Text>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t.save}</Text>
              )}
            </TouchableOpacity>

            {/* Feedback */}
            {apiError !== '' && (
              <View
                style={[
                  styles.alert,
                  {
                    backgroundColor: `${colors.error}10`,
                    borderColor: `${colors.error}30`,
                  },
                ]}
              >
                <Ionicons name="close-circle" size={18} color={colors.error} />
                <Text style={[styles.alertText, { color: colors.error }]}>
                  {apiError}
                </Text>
              </View>
            )}
            {successMessage !== '' && (
              <View
                style={[
                  styles.alert,
                  {
                    backgroundColor: `${colors.success}10`,
                    borderColor: `${colors.success}30`,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.success}
                />
                <Text style={[styles.alertText, { color: colors.success }]}>
                  {successMessage}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  form: {
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: { ...typography.heading, fontSize: typography.sizes.xl },
  logoTextCol: { flex: 1 },
  logoChangeText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  logoHint: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: spacing.sm },
  fieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  locationInput: { flex: 1, ...typography.body, fontSize: typography.sizes.sm },
  saveBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  alertText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
});
