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
  id: string;
  nom: string;
  montant: number;
  type: 'FIXE' | 'POURCENTAGE';
  gareId: string;
};

type ModalForm = {
  nom: string;
  montant: string;
  type: 'FIXE' | 'POURCENTAGE';
};

function formatAmount(item: TaxeAffiliation): string {
  return item.type === 'FIXE'
    ? item.montant.toLocaleString('fr-FR') + ' FCFA'
    : `${item.montant}%`;
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
    nom: '',
    montant: '',
    type: 'FIXE',
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
      montant: 'Montant *',
      montantPh: 'Ex : 5000',
      type: 'Type',
      fixe: 'Montant fixe (FCFA)',
      pourcentage: 'Pourcentage (%)',
      save: 'Enregistrer',
      required: 'Nom et montant requis',
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
      montant: 'Amount *',
      montantPh: 'E.g. 5000',
      type: 'Type',
      fixe: 'Fixed amount (FCFA)',
      pourcentage: 'Percentage (%)',
      save: 'Save',
      required: 'Name and amount are required',
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
      setGareId(station.id);

      const res = await fetch(
        `${API_URL}/taxe-affiliation/gare/${station.id}`,
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
    setForm({ nom: '', montant: '', type: 'FIXE' });
    setModalVisible(true);
  };

  const openEdit = (item: TaxeAffiliation) => {
    setEditingId(item.id);
    setForm({
      nom: item.nom,
      montant: item.montant.toString(),
      type: item.type,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.montant.trim()) {
      toast.warning(t.required);
      return;
    }
    setSaving(true);
    try {
      const body = {
        nom: form.nom.trim(),
        montant: parseFloat(form.montant) || 0,
        type: form.type,
        gareId,
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
          setItems(prev => prev.map(i => (i.id === saved.id ? saved : i)));
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
    setDeletingId(item.id);
    try {
      const res = await fetch(`${API_URL}/taxe-affiliation/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204 || res.ok) {
        toast.success(t.taxDeleted);
        setItems(prev => prev.filter(i => i.id !== item.id));
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
                key={item.id}
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
                    {item.nom}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text
                      style={[styles.itemAmount, { color: colors.primary }]}
                    >
                      {formatAmount(item)}
                    </Text>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: colors.primary },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
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
                  {deletingId === item.id ? (
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
              value={form.nom}
              onChangeText={v => setForm(f => ({ ...f, nom: v }))}
            />

            {/* Montant */}
            <Text
              style={[
                styles.label,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.montant}
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
              placeholder={t.montantPh}
              placeholderTextColor={theme.text}
              value={form.montant}
              onChangeText={v => setForm(f => ({ ...f, montant: v }))}
              keyboardType="decimal-pad"
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
              {(['FIXE', 'POURCENTAGE'] as const).map(opt => (
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
                  onPress={() => setForm(f => ({ ...f, type: opt }))}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: form.type === opt ? '#fff' : theme.text },
                    ]}
                  >
                    {opt === 'FIXE' ? t.fixe : t.pourcentage}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
