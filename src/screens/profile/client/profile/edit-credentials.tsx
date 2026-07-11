import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';

type InfoForm = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  gender: string;
};

type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const fStyles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderRadius: 4,
    height: 48,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.xs,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  error: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 3,
  },
});

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  prefix,
  rightEl,
  error,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  prefix?: React.ReactNode;
  rightEl?: React.ReactNode;
  error?: string;
  theme: any;
}) {
  return (
    <View style={fStyles.field}>
      <Text style={[fStyles.label, { color: theme.textStrong }]}>{label}</Text>
      <View
        style={[
          fStyles.inputRow,
          {
            borderColor: error ? colors.error : theme.border,
            backgroundColor: theme.backgroundAlt,
          },
        ]}
      >
        {prefix}
        <TextInput
          style={[fStyles.input, { color: theme.textStrong }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          secureTextEntry={secureTextEntry}
        />
        {rightEl}
      </View>
      {error ? (
        <Text style={[fStyles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

export default function ClientEditCredentials() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const originalUsername = useRef('');

  const [info, setInfo] = useState<InfoForm>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    gender: '',
  });
  const [infoErrors, setInfoErrors] = useState<
    Partial<Record<keyof InfoForm, string>>
  >({});
  const [infoStatus, setInfoStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [logoutPending, setLogoutPending] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const [pwd, setPwd] = useState<PasswordForm>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdErrors, setPwdErrors] = useState<
    Partial<Record<keyof PasswordForm, string>>
  >({});
  const [pwdStatus, setPwdStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const t = {
    fr: {
      title: 'Mes identifiants',
      personalInfo: 'Informations personnelles',
      firstName: 'Prénom',
      lastName: 'Nom',
      username: "Nom d'utilisateur",
      email: 'Adresse e-mail',
      phone: 'Numéro de téléphone',
      gender: 'Genre',
      genderMale: 'Homme',
      genderFemale: 'Femme',
      genderPlaceholder: 'Sélectionner un genre',
      saveInfo: 'Enregistrer les informations',
      changePassword: 'Changer le mot de passe',
      oldPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le nouveau mot de passe',
      savePassword: 'Changer le mot de passe',
      required: 'Ce champ est requis.',
      passwordMismatch: 'Les mots de passe ne correspondent pas.',
      passwordTooShort: 'Minimum 8 caractères.',
      successInfo: 'Informations mises à jour avec succès.',
      successInfoLogout: "Nom d'utilisateur modifié. Déconnexion en cours...",
      successPassword: 'Mot de passe modifié avec succès.',
      errorGeneric: 'Une erreur est survenue.',
      errorPassword: 'Mot de passe actuel incorrect.',
    },
    en: {
      title: 'My credentials',
      personalInfo: 'Personal information',
      firstName: 'First name',
      lastName: 'Last name',
      username: 'Username',
      email: 'Email address',
      phone: 'Phone number',
      gender: 'Gender',
      genderMale: 'Male',
      genderFemale: 'Female',
      genderPlaceholder: 'Select a gender',
      saveInfo: 'Save information',
      changePassword: 'Change password',
      oldPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      savePassword: 'Change password',
      required: 'This field is required.',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Minimum 8 characters.',
      successInfo: 'Information updated successfully.',
      successInfoLogout: 'Username changed. Logging out...',
      successPassword: 'Password changed successfully.',
      errorGeneric: 'An error occurred.',
      errorPassword: 'Current password is incorrect.',
    },
  }[lang];

  const GENDER_OPTIONS = [
    { value: 'MALE', label: t.genderMale },
    { value: 'FEMALE', label: t.genderFemale },
  ];

  useEffect(() => {
    const load = async () => {
      const [userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      if (userRaw) {
        const user = JSON.parse(userRaw);
        originalUsername.current = user.username || '';
        setInfo({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username || '',
          email: user.email || '',
          phone_number: user.phone_number || '',
          gender: user.gender || '',
        });
      }
    };
    load();
  }, []);

  const updateInfo = (key: keyof InfoForm, value: string) => {
    setInfo(prev => ({ ...prev, [key]: value }));
    setInfoErrors(prev => ({ ...prev, [key]: undefined }));
    setInfoStatus('idle');
  };

  const handleSaveInfo = async () => {
    const e: Partial<Record<keyof InfoForm, string>> = {};
    if (!info.email.trim()) e.email = t.required;
    setInfoErrors(e);
    if (Object.keys(e).length > 0) return;

    setInfoStatus('loading');
    try {
      const token = await AsyncStorage.getItem('token');
      const body: Record<string, string> = {};
      if (info.first_name.trim()) body.first_name = info.first_name.trim();
      if (info.last_name.trim()) body.last_name = info.last_name.trim();
      if (info.username.trim()) body.username = info.username.trim();
      if (info.email.trim()) body.email = info.email.trim();
      if (info.phone_number.trim()) body.phone_number = info.phone_number.trim();
      if (info.gender) body.gender = info.gender;

      const usernameChanged =
        !!body.username && body.username !== originalUsername.current;

      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        await AsyncStorage.setItem('user', JSON.stringify(updated));

        if (usernameChanged) {
          setLogoutPending(true);
          setInfoStatus('success');
          setTimeout(() => logout(navigation), 2500);
        } else {
          originalUsername.current = updated.username || info.username;
          setInfoStatus('success');
        }
      } else {
        setInfoStatus('error');
      }
    } catch {
      setInfoStatus('error');
    }
  };

  const updatePwd = (key: keyof PasswordForm, value: string) => {
    setPwd(prev => ({ ...prev, [key]: value }));
    setPwdErrors(prev => ({ ...prev, [key]: undefined }));
    setPwdStatus('idle');
  };

  const handleSavePassword = async () => {
    const e: Partial<Record<keyof PasswordForm, string>> = {};
    if (!pwd.oldPassword.trim()) e.oldPassword = t.required;
    if (!pwd.newPassword.trim()) e.newPassword = t.required;
    else if (pwd.newPassword.length < 8) e.newPassword = t.passwordTooShort;
    if (!pwd.confirmPassword.trim()) e.confirmPassword = t.required;
    else if (pwd.confirmPassword !== pwd.newPassword)
      e.confirmPassword = t.passwordMismatch;
    setPwdErrors(e);
    if (Object.keys(e).length > 0) return;

    setPwdStatus('loading');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: pwd.oldPassword,
          newPassword: pwd.newPassword,
        }),
      });

      if (res.ok) {
        setPwdStatus('success');
        setPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else if (res.status === 400 || res.status === 401) {
        setPwdErrors({ oldPassword: t.errorPassword });
        setPwdStatus('error');
      } else {
        setPwdStatus('error');
      }
    } catch {
      setPwdStatus('error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
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
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.personalInfo}
            </Text>

            <View style={styles.rowFields}>
              <View style={[styles.halfField, { marginRight: spacing.sm }]}>
                <Field
                  label={t.firstName}
                  value={info.first_name}
                  onChangeText={v => updateInfo('first_name', v)}
                  placeholder="Jean"
                  autoCapitalize="words"
                  theme={theme}
                />
              </View>
              <View style={styles.halfField}>
                <Field
                  label={t.lastName}
                  value={info.last_name}
                  onChangeText={v => updateInfo('last_name', v)}
                  placeholder="Dupont"
                  autoCapitalize="words"
                  theme={theme}
                />
              </View>
            </View>

            <Field
              label={t.username}
              value={info.username}
              onChangeText={v => updateInfo('username', v)}
              placeholder="jean.dupont"
              autoCapitalize="none"
              theme={theme}
            />

            <Field
              label={t.email}
              value={info.email}
              onChangeText={v => updateInfo('email', v)}
              placeholder="jean@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={infoErrors.email}
              theme={theme}
            />

            <Field
              label={t.phone}
              value={info.phone_number}
              onChangeText={v => updateInfo('phone_number', v)}
              placeholder="6XX XXX XXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              theme={theme}
              prefix={
                <View style={styles.phonePrefixBox}>
                  <Text style={styles.phoneFlag}>🇨🇲</Text>
                  <Text
                    style={[
                      styles.phoneCode,
                      {
                        color: theme.textStrong,
                        borderRightColor: theme.border,
                      },
                    ]}
                  >
                    +237
                  </Text>
                </View>
              }
            />

            <View style={styles.fieldWrap}>
              <Text style={[fStyles.label, { color: theme.textStrong }]}>
                {t.gender}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                onPress={() => setShowGenderPicker(v => !v)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color: info.gender ? theme.textStrong : theme.placeholder,
                    },
                  ]}
                >
                  {info.gender
                    ? GENDER_OPTIONS.find(g => g.value === info.gender)?.label
                    : t.genderPlaceholder}
                </Text>
                <Ionicons
                  name={showGenderPicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.text}
                />
              </TouchableOpacity>
              {showGenderPicker && (
                <View
                  style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {GENDER_OPTIONS.map(g => (
                    <TouchableOpacity
                      key={g.value}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: theme.border },
                      ]}
                      onPress={() => {
                        updateInfo('gender', g.value);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: theme.textStrong },
                        ]}
                      >
                        {g.label}
                      </Text>
                      {info.gender === g.value && (
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

            {infoStatus === 'success' && (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: `${colors.success}12` },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.success}
                />
                <Text style={[styles.feedbackText, { color: colors.success }]}>
                  {logoutPending ? t.successInfoLogout : t.successInfo}
                </Text>
              </View>
            )}
            {infoStatus === 'error' && (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: `${colors.error}10` },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.error}
                />
                <Text style={[styles.feedbackText, { color: colors.error }]}>
                  {t.errorGeneric}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: infoStatus === 'loading' ? 0.7 : 1,
                },
              ]}
              onPress={handleSaveInfo}
              disabled={infoStatus === 'loading'}
            >
              {infoStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t.saveInfo}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.changePassword}
            </Text>

            <Field
              label={t.oldPassword}
              value={pwd.oldPassword}
              onChangeText={v => updatePwd('oldPassword', v)}
              secureTextEntry={!showOld}
              autoCapitalize="none"
              error={pwdErrors.oldPassword}
              theme={theme}
              rightEl={
                <TouchableOpacity onPress={() => setShowOld(v => !v)}>
                  <Ionicons
                    name={showOld ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.text}
                  />
                </TouchableOpacity>
              }
            />

            <Field
              label={t.newPassword}
              value={pwd.newPassword}
              onChangeText={v => updatePwd('newPassword', v)}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              error={pwdErrors.newPassword}
              theme={theme}
              rightEl={
                <TouchableOpacity onPress={() => setShowNew(v => !v)}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.text}
                  />
                </TouchableOpacity>
              }
            />

            <Field
              label={t.confirmPassword}
              value={pwd.confirmPassword}
              onChangeText={v => updatePwd('confirmPassword', v)}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              error={pwdErrors.confirmPassword}
              theme={theme}
              rightEl={
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.text}
                  />
                </TouchableOpacity>
              }
            />

            {pwdStatus === 'success' && (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: `${colors.success}12` },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.success}
                />
                <Text style={[styles.feedbackText, { color: colors.success }]}>
                  {t.successPassword}
                </Text>
              </View>
            )}
            {pwdStatus === 'error' && !pwdErrors.oldPassword && (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: `${colors.error}10` },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.error}
                />
                <Text style={[styles.feedbackText, { color: colors.error }]}>
                  {t.errorGeneric}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pwdStatus === 'loading' ? 0.7 : 1,
                },
              ]}
              onPress={handleSavePassword}
              disabled={pwdStatus === 'loading'}
            >
              {pwdStatus === 'loading' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t.savePassword}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
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
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  rowFields: { flexDirection: 'row' },
  halfField: { flex: 1 },
  fieldWrap: { marginBottom: spacing.md },
  phonePrefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  phoneFlag: { fontSize: 18 },
  phoneCode: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    paddingRight: spacing.xs,
    borderRightWidth: 1,
    marginRight: spacing.xs,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  dropdownText: { ...typography.body, fontSize: typography.sizes.sm },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 4,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  feedbackText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  saveBtn: {
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
