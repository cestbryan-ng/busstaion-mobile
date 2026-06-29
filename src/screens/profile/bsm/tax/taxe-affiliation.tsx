import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../../../components/toast';
import ConfirmModal from '../../../../components/confirm-modal';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';

type TaxeAffiliation = {
  idTaxe: string;
  gareRoutiereId: string;
  nomTaxe: string;
  description?: string;
  tauxTaxe?: number;
  montantFixe?: number;
  dateEffet?: string;
  documentUrl?: string;
};

type ModalForm = {
  nomTaxe: string;
  description: string;
  amountKind: 'FIXE' | 'TAUX';
  montantFixe: string;
  tauxTaxe: string;
  dateEffet: string;
};

function formatAmount(item: TaxeAffiliation): string {
  if (item.montantFixe) return item.montantFixe.toLocaleString('fr-FR') + ' FCFA';
  if (item.tauxTaxe) return `${item.tauxTaxe}%`;
  return '—';
}

export default function TaxeAffiliationBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [token, setToken] = useState('');
  const [gareId, setGareId] = useState('');
  const [items, setItems] = useState<TaxeAffiliation[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxeAffiliation | null>(
    null,
  );
  const [form, setForm] = useState<ModalForm>({
    nomTaxe: '',
    description: '',
    amountKind: 'FIXE',
    montantFixe: '',
    tauxTaxe: '',
    dateEffet: '',
  });

  const t = {
    fr: {
      title: "Taxes d'affiliation",
      subtitle: 'Taxes appliquées aux agences affiliées',
      noItems: "Aucune taxe d'affiliation",
      add: 'Nouvelle taxe',
      edit: 'Modifier',
      delete: 'Supprimer',
      confirmDelete: 'Supprimer cette taxe ?',
      confirmDeleteMsg: 'Cette action est irréversible.',
      cancel: 'Annuler',
      nom: 'Nom *',
      nomPh: "Ex : Taxe d'enregistrement",
      description: 'Description',
      descPh: 'Description de la taxe...',
      amountKind: 'Type de montant',
      fixe: 'Montant fixe (FCFA)',
      taux: 'Taux (%)',
      montantFixePh: 'Ex : 5000',
      tauxPh: 'Ex : 5.0',
      dateEffet: "Date d'effet (AAAA-MM-JJ)",
      datePh: 'Ex : 2025-01-01',
      save: 'Enregistrer',
      required: 'Le nom est requis',
      error: 'Une erreur est survenue',
      taxSaved: 'Taxe enregistrée',
      taxDeleted: 'Taxe supprimée',
    },
    en: {
      title: 'Affiliation taxes',
      subtitle: 'Taxes applied to affiliated agencies',
      noItems: 'No affiliation taxes',
      add: 'New tax',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Delete this tax?',
      confirmDeleteMsg: 'This action cannot be undone.',
      cancel: 'Cancel',
      nom: 'Name *',
      nomPh: 'E.g. Registration tax',
      description: 'Description',
      descPh: 'Tax description...',
      amountKind: 'Amount type',
      fixe: 'Fixed amount (FCFA)',
      taux: 'Rate (%)',
      montantFixePh: 'E.g. 5000',
      tauxPh: 'E.g. 5.0',
      dateEffet: 'Effective date (YYYY-MM-DD)',
      datePh: 'E.g. 2025-01-01',
      save: 'Save',
      required: 'Name is required',
      error: 'An error occurred',
      taxSaved: 'Tax saved',
      taxDeleted: 'Tax deleted',
    },
  }[lang];

  const loadData = useCallback(async () => {
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
      if (!managerId) return;

      const stRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!stRes.ok) return;
      const station = await stRes.json();
      setGareId(station.idGareRoutiere);

      const res = await fetch(
        `${API_URL}/taxe-affiliation/gare/${station.idGareRoutiere}`,
        { headers: { Authorization: `Bearer ${tk}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ nomTaxe: '', description: '', amountKind: 'FIXE', montantFixe: '', tauxTaxe: '', dateEffet: '' });
    setModalVisible(true);
  };

  const openEdit = (item: TaxeAffiliation) => {
    setEditingId(item.idTaxe);
    setForm({
      nomTaxe: item.nomTaxe,
      description: item.description ?? '',
      amountKind: item.montantFixe ? 'FIXE' : 'TAUX',
      montantFixe: item.montantFixe?.toString() ?? '',
      tauxTaxe: item.tauxTaxe?.toString() ?? '',
      dateEffet: item.dateEffet ?? '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.nomTaxe.trim()) {
      toast.warning(t.required);
      return;
    }
    setSaving(true);
    try {
      const body = {
        gareRoutiereId: gareId,
        nomTaxe: form.nomTaxe.trim(),
        description: form.description.trim() || undefined,
        montantFixe: form.amountKind === 'FIXE' ? parseFloat(form.montantFixe) || 0 : 0,
        tauxTaxe: form.amountKind === 'TAUX' ? parseFloat(form.tauxTaxe) || 0 : 0,
        dateEffet: form.dateEffet.trim() || undefined,
      };

      const url = editingId
        ? `${API_URL}/taxe-affiliation/${editingId}`
        : `${API_URL}/taxe-affiliation`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 201) {
        const saved: TaxeAffiliation = await res.json();
        if (editingId) {
          setItems(prev => prev.map(i => (i.idTaxe === saved.idTaxe ? saved : i)));
        } else {
          setItems(prev => [saved, ...prev]);
        }
        toast.success(t.taxSaved);
        setModalVisible(false);
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: TaxeAffiliation) => {
    setDeleteTarget(item);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(item.idTaxe);
    try {
      const res = await fetch(`${API_URL}/taxe-affiliation/${item.idTaxe}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204 || res.ok) {
        toast.success(t.taxDeleted);
        setItems(prev => prev.filter(i => i.idTaxe !== item.idTaxe));
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setDeletingId(null);
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
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
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
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text }]}>
            {t.subtitle}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {items.length === 0 ? (
            <EmptyState
              type="docs"
              message={t.noItems}
              textColor={theme.text}
            />
          ) : (
            items.map(item => (
              <View
                key={item.idTaxe}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text
                    style={[styles.itemName, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {item.nomTaxe}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text
                      style={[styles.itemAmount, { color: colors.primary }]}
                    >
                      {formatAmount(item)}
                    </Text>
                    {item.dateEffet && (
                      <Text style={[styles.typeBadgeText, { color: theme.text }]}>
                        {item.dateEffet}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {deletingId === item.idTaxe ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: `${colors.error}15` },
                      ]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openCreate}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal create/edit */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
              {editingId ? t.edit : t.add}
            </Text>

            {/* Nom */}
            <Text style={[styles.label, { color: theme.text }]}>{t.nom}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.textStrong,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              placeholder={t.nomPh}
              placeholderTextColor={theme.text}
              value={form.nomTaxe}
              onChangeText={v => setForm(f => ({ ...f, nomTaxe: v }))}
            />

            {/* Description */}
            <Text style={[styles.label, { color: theme.text, marginTop: spacing.md }]}>
              {t.description}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.textStrong,
                  backgroundColor: theme.backgroundAlt,
                  height: 72,
                  paddingTop: spacing.sm,
                },
              ]}
              placeholder={t.descPh}
              placeholderTextColor={theme.text}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              multiline
              textAlignVertical="top"
            />

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
                    form.amountKind === opt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setForm(f => ({ ...f, amountKind: opt }))}
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
                placeholder={t.montantFixePh}
                placeholderTextColor={theme.text}
                value={form.montantFixe}
                onChangeText={v => setForm(f => ({ ...f, montantFixe: v }))}
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
                onChangeText={v => setForm(f => ({ ...f, tauxTaxe: v }))}
                keyboardType="decimal-pad"
              />
            )}

            {/* Date d'effet */}
            <Text style={[styles.label, { color: theme.text, marginTop: spacing.md }]}>
              {t.dateEffet}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.textStrong,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              placeholder={t.datePh}
              placeholderTextColor={theme.text}
              value={form.dateEffet}
              onChangeText={v => setForm(f => ({ ...f, dateEffet: v }))}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  { backgroundColor: saving ? theme.border : colors.primary },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>{t.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title={t.confirmDelete}
        message={t.confirmDeleteMsg}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },
  headerSubtitle: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },

  list: { padding: spacing.lg },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  itemAmount: { ...typography.heading, fontSize: typography.sizes.md },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
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
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
