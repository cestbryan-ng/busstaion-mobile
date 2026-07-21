import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/config';
import { CityPickerModal } from '../../components/city-picker-modal';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { RootStackParamList } from '../../navigation';

type BsmForm = {
  prenom: string;
  nom: string;
  email: string;
  telNumber: string;
  nomGare: string;
  ville: string;
  adresse: string;
  isPublic: boolean;
};

const EMPTY_FORM: BsmForm = {
  prenom: '',
  nom: '',
  email: '',
  telNumber: '',
  nomGare: '',
  ville: '',
  adresse: '',
  isPublic: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  prefix,
  theme,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  prefix?: React.ReactNode;
  theme: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: theme.textStrong }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { borderColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        {prefix}
        <TextInput
          style={[styles.input, { color: theme.textStrong }]}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
        />
      </View>
    </View>
  );
}

export default function BsmRequest() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [form, setForm] = useState<BsmForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = {
    fr: {
      title: 'Demande de compte BSM',
      subtitle:
        'Gérez votre gare routière avec BusStation Manager. Nous étudierons votre demande et vous enverrons vos identifiants par email.',
      prenom: 'Prénom',
      prenomPlaceholder: 'Votre prénom',
      nom: 'Nom',
      nomPlaceholder: 'Votre nom',
      email: 'Email',
      emailPlaceholder: 'Votre adresse email',
      tel: 'Téléphone',
      telPlaceholder: 'Votre numéro de téléphone',
      nomGare: 'Nom de la gare',
      nomGarePlaceholder: 'Nom de votre gare routière',
      ville: 'Ville',
      villePlaceholder: 'Ville de la gare',
      adresse: 'Adresse',
      adressePlaceholder: 'Adresse complète de la gare',
      submit: 'Envoyer la demande',
      back: 'Retour',
      errorPrenom: 'Le prénom est requis.',
      errorNom: 'Le nom est requis.',
      errorEmail: "L'email est requis.",
      errorEmailInvalid: "L'adresse email n'est pas valide.",
      errorTel: 'Le numéro de téléphone est requis.',
      errorNomGare: 'Le nom de la gare est requis.',
      errorVille: 'La ville est requise.',
      errorAdresse: "L'adresse est requise.",
      isPublicLabel: 'Type de gare',
      isPublicDesc:
        "Une gare publique appartient à l'État. Une gare privée appartient à un propriétaire particulier.",
      isPublicOn: 'Publique',
      isPublicOff: 'Privée',
      errorNetwork: 'Erreur réseau, veuillez réessayer.',
      errorServer: 'Une erreur est survenue, veuillez réessayer.',
    },
    en: {
      title: 'BSM Account Request',
      subtitle:
        'Manage your bus station with BusStation Manager. We will review your request and send your credentials by email.',
      prenom: 'First name',
      prenomPlaceholder: 'Your first name',
      nom: 'Last name',
      nomPlaceholder: 'Your last name',
      email: 'Email',
      emailPlaceholder: 'Your email address',
      tel: 'Phone',
      telPlaceholder: 'Your phone number',
      nomGare: 'Station name',
      nomGarePlaceholder: 'Name of your bus station',
      ville: 'City',
      villePlaceholder: 'City of the station',
      adresse: 'Address',
      adressePlaceholder: 'Full address of the station',
      submit: 'Submit request',
      back: 'Back',
      errorPrenom: 'First name is required.',
      errorNom: 'Last name is required.',
      errorEmail: 'Email is required.',
      errorEmailInvalid: 'Email address is not valid.',
      errorTel: 'Phone number is required.',
      errorNomGare: 'Station name is required.',
      errorVille: 'City is required.',
      errorAdresse: 'Address is required.',
      isPublicLabel: 'Station type',
      isPublicDesc:
        'A public station is state-owned. A private station is owned by an individual.',
      isPublicOn: 'Public',
      isPublicOff: 'Private',
      errorNetwork: 'Network error, please try again.',
      errorServer: 'An error occurred, please try again.',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'en' || l === 'fr') setLang(l);
    });
  }, []);

  const validate = (): string | null => {
    if (!form.prenom.trim()) return t.errorPrenom;
    if (!form.nom.trim()) return t.errorNom;
    if (!form.email.trim()) return t.errorEmail;
    if (!EMAIL_REGEX.test(form.email.trim())) return t.errorEmailInvalid;
    if (!form.telNumber.trim()) return t.errorTel;
    if (!form.nomGare.trim()) return t.errorNomGare;
    if (!form.ville.trim()) return t.errorVille;
    if (!form.adresse.trim()) return t.errorAdresse;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/registration-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          email: form.email.trim(),
          telNumber: form.telNumber.trim(),
          nomGare: form.nomGare.trim(),
          ville: form.ville.trim(),
          adresse: form.adresse.trim(),
          isPublic: form.isPublic,
        }),
      });

      if (response.ok) {
        navigation.replace('BsmRequestSuccess');
      } else {
        const rawText = await response.text();
        const data = rawText ? JSON.parse(rawText) : {};
        navigation.replace('BsmRequestError', {
          message: data.message || t.errorServer,
        });
      }
    } catch {
      navigation.replace('BsmRequestError', { message: t.errorNetwork });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: theme.text }]}>
          {t.subtitle}
        </Text>

        {error !== '' && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}

        <Field
          label={t.prenom}
          placeholder={t.prenomPlaceholder}
          value={form.prenom}
          onChangeText={v => setForm(f => ({ ...f, prenom: v }))}
          autoCapitalize="words"
          theme={theme}
        />
        <Field
          label={t.nom}
          placeholder={t.nomPlaceholder}
          value={form.nom}
          onChangeText={v => setForm(f => ({ ...f, nom: v }))}
          autoCapitalize="words"
          theme={theme}
        />
        <Field
          label={t.email}
          placeholder={t.emailPlaceholder}
          value={form.email}
          onChangeText={v => setForm(f => ({ ...f, email: v }))}
          keyboardType="email-address"
          autoCapitalize="none"
          theme={theme}
        />
        <Field
          label={t.tel}
          placeholder={t.telPlaceholder}
          value={form.telNumber}
          onChangeText={v => setForm(f => ({ ...f, telNumber: v }))}
          keyboardType="phone-pad"
          autoCapitalize="none"
          theme={theme}
          prefix={
            <Text
              style={[
                styles.phonePrefix,
                { color: theme.textStrong, borderRightColor: theme.border },
              ]}
            >
              🇨🇲 +237
            </Text>
          }
        />
        <Field
          label={t.nomGare}
          placeholder={t.nomGarePlaceholder}
          value={form.nomGare}
          onChangeText={v => setForm(f => ({ ...f, nomGare: v }))}
          autoCapitalize="words"
          theme={theme}
        />
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: theme.textStrong }]}>
            {t.ville}
          </Text>
          <CityPickerModal
            value={form.ville}
            onSelect={v => setForm(f => ({ ...f, ville: v }))}
            placeholder={t.villePlaceholder}
            label={t.ville}
            theme={theme}
            containerStyle={[
              styles.pickerBtn,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          />
        </View>
        <Field
          label={t.adresse}
          placeholder={t.adressePlaceholder}
          value={form.adresse}
          onChangeText={v => setForm(f => ({ ...f, adresse: v }))}
          autoCapitalize="sentences"
          theme={theme}
        />

        {/* isPublic toggle */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: theme.textStrong }]}>
            {t.isPublicLabel}
          </Text>
          <Text style={[styles.toggleDesc, { color: theme.text }]}>
            {t.isPublicDesc}
          </Text>
          <View
            style={[
              styles.toggleRow,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.toggleOption,
                form.isPublic && { backgroundColor: `${colors.primary}15` },
                { borderRightColor: theme.border },
              ]}
              onPress={() => setForm(f => ({ ...f, isPublic: true }))}
            >
              <Ionicons
                name="globe-outline"
                size={16}
                color={form.isPublic ? colors.primary : theme.text}
              />
              <Text
                style={[
                  styles.toggleOptionText,
                  { color: form.isPublic ? colors.primary : theme.text },
                ]}
              >
                {t.isPublicOn}
              </Text>
              {form.isPublic && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                { borderRightWidth: 0 },
                !form.isPublic && { backgroundColor: `${colors.error}10` },
              ]}
              onPress={() => setForm(f => ({ ...f, isPublic: false }))}
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={!form.isPublic ? colors.error : theme.text}
              />
              <Text
                style={[
                  styles.toggleOptionText,
                  { color: !form.isPublic ? colors.error : theme.text },
                ]}
              >
                {t.isPublicOff}
              </Text>
              {!form.isPublic && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.error}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitText}>{t.submit}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  phonePrefix: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 4,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  pickerBtnText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  toggleDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRightWidth: 1,
  },
  toggleOptionText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
});
