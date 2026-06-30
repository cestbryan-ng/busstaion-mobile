import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';

const LEGAL_FORMS_FR = [
  'Entreprise individuelle',
  'Société à responsabilité limitée (SARL)',
  'Société anonyme (SA)',
  'Société en nom collectif (SNC)',
  'Autre',
];

type FormData = {
  long_name: string;
  short_name: string;
  email: string;
  phone: string;
  website_url: string;
  ceo_name: string;
  legal_form: string;
  is_active: boolean;
  facebook: string;
  instagram: string;
  linkedin: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function OrgEditOrganization() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [form, setForm] = useState<FormData>({
    long_name: '',
    short_name: '',
    email: '',
    phone: '',
    website_url: '',
    ceo_name: '',
    legal_form: '',
    is_active: true,
    facebook: '',
    instagram: '',
    linkedin: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showLegalDropdown, setShowLegalDropdown] = useState(false);

  const t = {
    fr: {
      title: "Modifier l'organisation",
      longName: 'Nom long',
      shortName: 'Nom court',
      email: 'Email',
      phone: 'Téléphone',
      website: 'Site web',
      ceo: 'Nom du dirigeant',
      legalForm: 'Forme légale',
      status: 'Statut',
      statusActive: 'Active',
      socialNetworks: 'Réseaux sociaux',
      cancel: 'Annuler',
      save: 'Enregistrer les modifications',
      required: 'Ce champ est requis.',
      errorGeneric: 'Une erreur est survenue.',
      placeholderLegal: 'Sélectionner une forme légale',
    },
    en: {
      title: 'Edit organization',
      longName: 'Long name',
      shortName: 'Short name',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      ceo: 'CEO name',
      legalForm: 'Legal form',
      status: 'Status',
      statusActive: 'Active',
      socialNetworks: 'Social networks',
      cancel: 'Cancel',
      save: 'Save changes',
      required: 'This field is required.',
      errorGeneric: 'An error occurred.',
      placeholderLegal: 'Select a legal form',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      const [orgRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('organization'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      if (orgRaw) {
        const org = JSON.parse(orgRaw);
        // Parse social_network JSON if needed
        let fb = '',
          ig = '',
          li = '';
        if (org.social_network) {
          try {
            const parsed = JSON.parse(org.social_network);
            fb = parsed.facebook || '';
            ig = parsed.instagram || '';
            li = parsed.linkedin || '';
          } catch {
            fb = org.social_network;
          }
        }
        setForm({
          long_name: org.long_name || '',
          short_name: org.short_name || '',
          email: org.email || '',
          phone: (org as any).phone || '',
          website_url: org.website_url || '',
          ceo_name: org.ceo_name || '',
          legal_form: org.legal_form || '',
          is_active: org.is_active ?? true,
          facebook: fb,
          instagram: ig,
          linkedin: li,
        });
      }
    };
    load();
  }, []);

  const update = (key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
    setApiError('');
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.long_name.trim()) e.long_name = t.required;
    if (!form.short_name.trim()) e.short_name = t.required;
    if (!form.email.trim()) e.email = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const [token, orgRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('organization'),
      ]);
      const org = orgRaw ? JSON.parse(orgRaw) : null;
      if (!org?.organization_id) return;

      const socialNetwork = JSON.stringify({
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
      });

      const body = {
        long_name: form.long_name,
        short_name: form.short_name,
        email: form.email,
        website_url: form.website_url,
        ceo_name: form.ceo_name,
        legal_form: form.legal_form,
        is_active: form.is_active,
        social_network: socialNetwork,
      };

      const res = await fetch(
        `${API_URL}/organizations/${org.organization_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (res.ok) {
        const updated = await res.json();
        await AsyncStorage.setItem('organization', JSON.stringify(updated));
        navigation.goBack();
      } else {
        setApiError(t.errorGeneric);
      }
    } catch {
      setApiError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    required,
    keyboardType,
    last,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    keyboardType?: any;
    last?: boolean;
  }) => {
    const errorKey = Object.keys(form).find(k => (form as any)[k] === value) as
      | keyof FormData
      | undefined;
    const error = errorKey ? errors[errorKey] : undefined;
    return (
      <View style={[styles.field, !last && { marginBottom: spacing.md }]}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
        <TextInput
          style={[
            styles.fieldInput,
            {
              borderColor: error ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.text}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={
            keyboardType === 'email-address' ? 'none' : 'sentences'
          }
        />
        {error && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={t.longName}
            value={form.long_name}
            onChangeText={v => update('long_name', v)}
            placeholder="Transport Express Yaoundé SARL"
            required
          />
          <Field
            label={t.shortName}
            value={form.short_name}
            onChangeText={v => update('short_name', v)}
            placeholder="TEY"
            required
          />
          <Field
            label={t.email}
            value={form.email}
            onChangeText={v => update('email', v)}
            placeholder="contact@tey.cm"
            required
            keyboardType="email-address"
          />

          {/* Phone + Website side by side */}
          <View style={styles.rowFields}>
            <View style={[styles.halfField, { marginRight: spacing.sm }]}>
              <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
                {t.phone}
              </Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                    color: theme.textStrong,
                  },
                ]}
                value={form.phone}
                onChangeText={v => update('phone', v)}
                placeholder="+237 691 000 000"
                placeholderTextColor={theme.text}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
                {t.website}
              </Text>
              <View
                style={[
                  styles.websiteInput,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
              >
                <Ionicons name="globe-outline" size={16} color={theme.text} />
                <TextInput
                  style={[styles.websiteTextInput, { color: theme.textStrong }]}
                  value={form.website_url}
                  onChangeText={v => update('website_url', v)}
                  placeholder="www.tey.cm"
                  placeholderTextColor={theme.text}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <View style={{ marginBottom: spacing.md }} />
          <Field
            label={t.ceo}
            value={form.ceo_name}
            onChangeText={v => update('ceo_name', v)}
            placeholder="Paul Atangana"
          />

          {/* Legal form dropdown */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
              {t.legalForm}
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              onPress={() => setShowLegalDropdown(!showLegalDropdown)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  { color: form.legal_form ? theme.textStrong : theme.text },
                ]}
              >
                {form.legal_form || t.placeholderLegal}
              </Text>
              <Ionicons
                name={showLegalDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.text}
              />
            </TouchableOpacity>
            {showLegalDropdown && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                {LEGAL_FORMS_FR.map(lf => (
                  <TouchableOpacity
                    key={lf}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: theme.border },
                    ]}
                    onPress={() => {
                      update('legal_form', lf);
                      setShowLegalDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: theme.textStrong },
                      ]}
                    >
                      {lf}
                    </Text>
                    {form.legal_form === lf && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Status toggle */}
          <View
            style={[
              styles.toggleRow,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.toggleLabel, { color: theme.textStrong }]}>
              {t.status}
            </Text>
            <View style={styles.toggleRight}>
              <Text
                style={[
                  styles.toggleValue,
                  { color: form.is_active ? colors.success : theme.text },
                ]}
              >
                {t.statusActive}
              </Text>
              <Switch
                value={form.is_active}
                onValueChange={v => update('is_active', v)}
                trackColor={{ false: theme.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Social networks */}
          <Text style={[styles.socialTitle, { color: theme.textStrong }]}>
            {t.socialNetworks}
          </Text>
          {[
            {
              key: 'facebook' as keyof FormData,
              icon: 'logo-facebook',
              color: '#1877F2',
              placeholder: 'facebook.com/tey.cm',
            },
            {
              key: 'instagram' as keyof FormData,
              icon: 'logo-instagram',
              color: '#E1306C',
              placeholder: 'instagram.com/tey.cm',
            },
            {
              key: 'linkedin' as keyof FormData,
              icon: 'logo-linkedin',
              color: '#0077B5',
              placeholder: 'linkedin.com/company/tey',
            },
          ].map(s => (
            <View
              key={s.key}
              style={[
                styles.socialInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons name={s.icon} size={20} color={s.color} />
              <TextInput
                style={[styles.socialTextInput, { color: theme.textStrong }]}
                value={form[s.key] as string}
                onChangeText={v => update(s.key, v)}
                placeholder={s.placeholder}
                placeholderTextColor={theme.text}
                autoCapitalize="none"
              />
            </View>
          ))}

          {apiError !== '' && (
            <Text style={[styles.apiError, { color: colors.error }]}>
              {apiError}
            </Text>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: theme.textStrong }]}>
              {t.cancel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: { padding: spacing.lg },
  field: {},
  fieldLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  fieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 3,
  },
  rowFields: { flexDirection: 'row', marginBottom: spacing.md },
  halfField: { flex: 1 },
  websiteInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  websiteTextInput: {
    flex: 1,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  dropdownText: { ...typography.body, fontSize: typography.sizes.sm },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  dropdownItemText: { ...typography.body, fontSize: typography.sizes.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  socialTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  socialInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  socialTextInput: {
    flex: 1,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  apiError: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
