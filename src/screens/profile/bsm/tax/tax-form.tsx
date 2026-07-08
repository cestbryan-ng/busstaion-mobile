import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../../../components/toast';
import { SkeletonTaxDetail } from '../../../../components/skeleton';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import type { PolicyOrTax } from '../tabs/taxes';
import { DatePickerModal, formatDateDisplay } from '../../../../components/date-picker-modal';

type FormState = {
  nomPolitique: string;
  description: string;
  type: 'TAXE' | 'POLITIQUE';
  amountKind: 'FIXE' | 'TAUX';
  montantFixe: string;
  tauxTaxe: string;
  dateEffet: string;
};

export default function TaxFormBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TaxFormBsm'>>();
  const itemId = route.params?.itemId;
  const isEdit = !!itemId;
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [token, setToken] = useState('');
  const [stationId, setStationId] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState<FormState>({
    nomPolitique: '',
    description: '',
    type: 'TAXE',
    amountKind: 'FIXE',
    montantFixe: '',
    tauxTaxe: '',
    dateEffet: '',
  });

  const t = {
    fr: {
      createTitle: 'Nouvelle taxe / politique',
      editTitle: 'Modifier',
      name: 'Nom *',
      namePh: 'Ex : Taxe de stationnement',
      description: 'Description',
      descPh: 'Description de la taxe ou politique...',
      type: 'Catégorie',
      taxe: 'Taxe',
      politique: 'Politique',
      amountKind: 'Type de montant',
      fixe: 'Montant fixe (FCFA)',
      taux: 'Taux (%)',
      fixePh: 'Ex : 5000',
      tauxPh: 'Ex : 5.0',
      dateEffet: "Date d'effet *",
      datePh: 'Sélectionner une date',
      save: 'Enregistrer',
      required: "Nom et date d'effet requis",
      error: 'Une erreur est survenue',
      savedSuccess: 'Enregistré avec succès',
      saveError: "Erreur lors de l'enregistrement",
    },
    en: {
      createTitle: 'New tax / policy',
      editTitle: 'Edit',
      name: 'Name *',
      namePh: 'E.g. Parking tax',
      description: 'Description',
      descPh: 'Description of the tax or policy...',
      type: 'Category',
      taxe: 'Tax',
      politique: 'Policy',
      amountKind: 'Amount type',
      fixe: 'Fixed amount (FCFA)',
      taux: 'Rate (%)',
      fixePh: 'E.g. 5000',
      tauxPh: 'E.g. 5.0',
      dateEffet: 'Effective date *',
      datePh: 'Select a date',
      save: 'Save',
      required: 'Name and effective date are required',
      error: 'An error occurred',
      savedSuccess: 'Saved successfully',
      saveError: 'Save error',
    },
  }[lang];

  const load = useCallback(async () => {
    try {
      const [tk, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setToken(tk ?? '');

      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (managerId) {
        const stRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (stRes.ok) {
          const station = await stRes.json();
          setStationId(station.idGareRoutiere);
        }
      }

      if (isEdit && itemId) {
        const res = await fetch(`${API_URL}/politique-et-taxes/${itemId}`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (res.ok) {
          const item: PolicyOrTax = await res.json();
          setForm({
            nomPolitique: item.nomPolitique,
            description: item.description,
            type: item.type,
            amountKind: item.montantFixe ? 'FIXE' : 'TAUX',
            montantFixe: item.montantFixe?.toString() ?? '',
            tauxTaxe: item.tauxTaxe?.toString() ?? '',
            dateEffet: item.dateEffet ?? '',
          });
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isEdit, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.nomPolitique.trim() || !form.dateEffet.trim()) {
      toast.warning(t.required);
      return;
    }
    setSaving(true);
    try {
      const politique = {
        gareRoutiereId: stationId,
        nomPolitique: form.nomPolitique.trim(),
        description: form.description.trim(),
        tauxTaxe:
          form.amountKind === 'TAUX' ? parseFloat(form.tauxTaxe) || 0 : 0,
        montantFixe:
          form.amountKind === 'FIXE' ? parseFloat(form.montantFixe) || 0 : 0,
        dateEffet: form.dateEffet.trim(),
        type: form.type,
      };

      const formData = new FormData();
      formData.append('politique', {
        string: JSON.stringify(politique),
        type: 'application/json',
        name: 'politique.json',
      } as any);

      const url = isEdit
        ? `${API_URL}/politique-et-taxes/${itemId}`
        : `${API_URL}/politique-et-taxes/add`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok || res.status === 201) {
        toast.success(t.savedSuccess);
        navigation.goBack();
      } else {
        toast.error(t.saveError);
      }
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <SkeletonTaxDetail />;

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
          <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
            {isEdit ? t.editTitle : t.createTitle}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {/* Nom */}
            <Text style={[styles.label, { color: theme.text }]}>{t.name}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.textStrong,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              placeholder={t.namePh}
              placeholderTextColor={theme.text}
              value={form.nomPolitique}
              onChangeText={v => setField('nomPolitique', v)}
            />

            {/* Description */}
            <Text
              style={[
                styles.label,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.description}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.inputMulti,
                {
                  borderColor: theme.border,
                  color: theme.textStrong,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              placeholder={t.descPh}
              placeholderTextColor={theme.text}
              value={form.description}
              onChangeText={v => setField('description', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Type */}
            <Text
              style={[
                styles.label,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.type}
            </Text>
            <View style={styles.toggleRow}>
              {(['TAXE', 'POLITIQUE'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.toggleBtn,
                    {
                      borderColor:
                        form.type === opt ? colors.primary : theme.border,
                    },
                    form.type === opt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setField('type', opt)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: form.type === opt ? '#fff' : theme.text },
                    ]}
                  >
                    {opt === 'TAXE' ? t.taxe : t.politique}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Type de montant */}
            <Text
              style={[
                styles.label,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.amountKind}
            </Text>
            <View style={styles.toggleRow}>
              {(['FIXE', 'TAUX'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.toggleBtn,
                    {
                      borderColor:
                        form.amountKind === opt ? colors.primary : theme.border,
                    },
                    form.amountKind === opt && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setField('amountKind', opt)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: form.amountKind === opt ? '#fff' : theme.text },
                    ]}
                  >
                    {opt === 'FIXE' ? t.fixe : t.taux}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.amountKind === 'FIXE' ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.textStrong,
                    backgroundColor: theme.backgroundAlt,
                    marginTop: spacing.sm,
                  },
                ]}
                placeholder={t.fixePh}
                placeholderTextColor={theme.text}
                value={form.montantFixe}
                onChangeText={v => setField('montantFixe', v)}
                keyboardType="decimal-pad"
              />
            ) : (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.textStrong,
                    backgroundColor: theme.backgroundAlt,
                    marginTop: spacing.sm,
                  },
                ]}
                placeholder={t.tauxPh}
                placeholderTextColor={theme.text}
                value={form.tauxTaxe}
                onChangeText={v => setField('tauxTaxe', v)}
                keyboardType="decimal-pad"
              />
            )}

            {/* Date d'effet */}
            <Text
              style={[
                styles.label,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.dateEffet}
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.dateRow,
                { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: form.dateEffet ? theme.textStrong : theme.text },
                ]}
              >
                {form.dateEffet
                  ? formatDateDisplay(form.dateEffet, lang)
                  : t.datePh}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Bouton save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: saving ? theme.border : colors.primary },
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t.save}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        lang={lang}
        selectedDate={form.dateEffet || null}
        onApply={d => { setField('dateEffet', d ?? ''); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />
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
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },
  section: {
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 44,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  inputMulti: {
    height: 96,
    paddingTop: spacing.sm,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { ...typography.body, fontSize: typography.sizes.sm },
  saveBtn: {
    marginHorizontal: spacing.lg,
    height: 52,
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
