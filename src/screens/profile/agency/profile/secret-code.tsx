import React, { useState, useEffect } from 'react';
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
import type { RootStackParamList } from '../../../../navigation';

export default function AgencyCodeSecret() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [codeError, setCodeError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const t = {
    fr: {
      title: 'Code de validation',
      subtitle: "Ce code permet de marquer un billet comme utilisé lors de l'embarquement. Par mesure de sécurité, il ne sera plus affiché après enregistrement. Veuillez le conserver en lieu sûr.",
      codeLabel: 'Code secret',
      codePlaceholder: 'Ex: SECRET123',
      confirmLabel: 'Confirmer le code',
      confirmPlaceholder: 'Répétez le code',
      save: 'Enregistrer le code',
      required: 'Ce champ est requis.',
      tooShort: 'Entre 4 et 20 caractères.',
      tooLong: 'Maximum 20 caractères.',
      mismatch: 'Les codes ne correspondent pas.',
      success: 'Code de validation enregistré avec succès.',
      error: 'Une erreur est survenue.',
      infoTitle: 'Comment ça fonctionne ?',
      info1: 'Le passager présente son QR code à l\'embarquement.',
      info2: "L'agent scanne le QR code avec son téléphone.",
      info3: 'Le code secret est demandé pour confirmer et marquer le billet comme utilisé.',
      alreadySet: 'Un code est déjà configuré pour cette agence. Vous pouvez le remplacer.',
    },
    en: {
      title: 'Validation code',
      subtitle: 'This code marks a ticket as used at boarding. For security reasons, it will not be displayed after saving. Please keep it in a safe place.',
      codeLabel: 'Secret code',
      codePlaceholder: 'E.g. SECRET123',
      confirmLabel: 'Confirm code',
      confirmPlaceholder: 'Repeat the code',
      save: 'Save code',
      required: 'This field is required.',
      tooShort: 'Between 4 and 20 characters.',
      tooLong: 'Maximum 20 characters.',
      mismatch: 'Codes do not match.',
      success: 'Validation code saved successfully.',
      error: 'An error occurred.',
      infoTitle: 'How it works?',
      info1: 'The passenger presents their QR code at boarding.',
      info2: 'The agent scans the QR code with their phone.',
      info3: 'The secret code is required to confirm and mark the ticket as used.',
      alreadySet: 'A code is already set for this agency. You can replace it.',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      const storedLang = await AsyncStorage.getItem('app_lang');
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
    };
    load();
  }, []);

  const handleSave = async () => {
    let valid = true;
    setCodeError('');
    setConfirmError('');
    setErrorMsg('');

    if (!code.trim()) {
      setCodeError(t.required);
      valid = false;
    } else if (code.trim().length < 4) {
      setCodeError(t.tooShort);
      valid = false;
    } else if (code.trim().length > 20) {
      setCodeError(t.tooLong);
      valid = false;
    }
    if (!confirm.trim()) {
      setConfirmError(t.required);
      valid = false;
    } else if (confirm !== code) {
      setConfirmError(t.mismatch);
      valid = false;
    }
    if (!valid) return;

    setStatus('loading');
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) { setStatus('error'); setErrorMsg(t.error); return; }

      const headers = { Authorization: `Bearer ${token}` };
      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, { headers });
      if (!agencyRes.ok) { setStatus('error'); setErrorMsg(t.error); return; }
      const agencyData = await agencyRes.json();
      const agencyId = agencyData.id;
      if (!agencyId) { setStatus('error'); setErrorMsg(t.error); return; }

      const res = await fetch(`${API_URL}/agence/${agencyId}/code-secret`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ codeSecret: code.trim() }),
      });

      if (res.ok) {
        setStatus('success');
        setCode('');
        setConfirm('');
      } else {
        setStatus('error');
        setErrorMsg(t.error);
      }
    } catch {
      setStatus('error');
      setErrorMsg(t.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
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
          {/* Info card */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}25` },
            ]}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.primary }]}>
                {t.infoTitle}
              </Text>
              {[t.info1, t.info2, t.info3].map((info, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={[styles.infoStep, { color: colors.primary }]}>{i + 1}.</Text>
                  <Text style={[styles.infoText, { color: theme.text }]}>{info}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Form card */}
          <View
            style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={[styles.cardSubtitle, { color: theme.text }]}>
              {t.subtitle}
            </Text>

            {/* Code field */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
                {t.codeLabel}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    borderColor: codeError ? colors.error : theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={theme.text} />
                <TextInput
                  style={[styles.input, { color: theme.textStrong }]}
                  value={code}
                  onChangeText={v => { setCode(v); setCodeError(''); setStatus('idle'); }}
                  placeholder={t.codePlaceholder}
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showCode}
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <TouchableOpacity onPress={() => setShowCode(v => !v)}>
                  <Ionicons
                    name={showCode ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>
              {!!codeError && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{codeError}</Text>
              )}
            </View>

            {/* Confirm field */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
                {t.confirmLabel}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    borderColor: confirmError ? colors.error : theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={theme.text} />
                <TextInput
                  style={[styles.input, { color: theme.textStrong }]}
                  value={confirm}
                  onChangeText={v => { setConfirm(v); setConfirmError(''); setStatus('idle'); }}
                  placeholder={t.confirmPlaceholder}
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>
              {!!confirmError && (
                <Text style={[styles.fieldError, { color: colors.error }]}>{confirmError}</Text>
              )}
            </View>

            {/* Feedback */}
            {status === 'success' && (
              <View style={[styles.feedback, { backgroundColor: `${colors.success}12` }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={[styles.feedbackText, { color: colors.success }]}>{t.success}</Text>
              </View>
            )}
            {status === 'error' && !!errorMsg && (
              <View style={[styles.feedback, { backgroundColor: `${colors.error}10` }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.feedbackText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: status === 'loading' ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{t.save}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  content: { padding: spacing.lg, gap: spacing.lg },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoContent: { flex: 1, gap: spacing.xs },
  infoTitle: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  infoRow: { flexDirection: 'row', gap: spacing.xs },
  infoStep: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  infoText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardSubtitle: { ...typography.body, fontSize: typography.sizes.sm },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  fieldError: { ...typography.body, fontSize: typography.sizes.xs },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 4,
    padding: spacing.sm,
  },
  feedbackText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 50,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  saveBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md, color: '#fff' },
});
