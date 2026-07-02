import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Share,
  Linking,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ConfirmModal from '../../../../components/confirm-modal';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import type { PolicyOrTax } from '../tabs/taxes';
import { SkeletonTaxDetail } from '../../../../components/skeleton';

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

export default function TaxDetailBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TaxDetailBsm'>>();
  const { itemId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [item, setItem] = useState<PolicyOrTax | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détail taxe',
      tax: 'Taxe',
      policy: 'Politique',
      inForce: 'En vigueur',
      category: 'Catégorie',
      effectiveDate: "Date d'effet",
      amount: 'Montant',
      officialDoc: 'Document officiel',
      noDoc: 'Aucun document',
      viewDoc: 'Voir le document',
      edit: 'Modifier',
      delete: 'Supprimer',
      confirmDelete: 'Supprimer cette taxe ?',
      confirmDeleteMsg: 'Cette action est irréversible.',
      cancel: 'Annuler',
    },
    en: {
      title: 'Tax detail',
      tax: 'Tax',
      policy: 'Policy',
      inForce: 'In force',
      category: 'Category',
      effectiveDate: 'Effective date',
      amount: 'Amount',
      officialDoc: 'Official document',
      noDoc: 'No document',
      viewDoc: 'View document',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Delete this tax?',
      confirmDeleteMsg: 'This action cannot be undone.',
      cancel: 'Cancel',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/politique-et-taxes/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItem(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `${item.nomPolitique}\n${item.description}\n${
          item.montantFixe ? formatPrice(item.montantFixe) : ''
        }`,
        title: item.nomPolitique,
      });
    } catch {
      // silent
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const doDelete = async () => {
    setDeleteModalVisible(false);
    setDeleting(true);
    try {
      const tk = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/politique-et-taxes/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tk ?? ''}` },
      });
      if (res.status === 204 || res.ok) {
        navigation.goBack();
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <SkeletonTaxDetail />;

  if (!item) return null;

  const isTax = item.type === 'TAXE';

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
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TaxFormBsm', { itemId })}
          >
            <Ionicons name="create-outline" size={22} color={theme.textStrong} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={theme.textStrong} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Hero card */}
        <View
          style={[
            styles.hero,
            {
              backgroundColor: `${colors.error}10`,
              borderColor: `${colors.error}20`,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: colors.error }]}>
              <Ionicons name="document-text-outline" size={22} color="#fff" />
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: theme.textStrong }]}>
                {item.nomPolitique}
              </Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: colors.error }]}>
              <Text style={styles.typePillText}>
                {isTax ? t.tax : t.policy}
              </Text>
            </View>
          </View>

          {item.montantFixe !== undefined && (
            <Text style={[styles.heroAmount, { color: colors.error }]}>
              {formatPrice(item.montantFixe)}
            </Text>
          )}

          <Text style={[styles.heroDesc, { color: theme.text }]}>
            {item.description}
          </Text>

          <View
            style={[
              styles.inForceBadge,
              { backgroundColor: `${colors.success}15` },
            ]}
          >
            <Text style={[styles.inForceText, { color: colors.success }]}>
              {t.inForce}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.category}
            </Text>
            <Text style={[styles.infoValue, { color: theme.textStrong }]}>
              {isTax ? t.tax : t.policy}
            </Text>
          </View>
          <View
            style={[
              styles.infoRow,
              { borderTopColor: theme.border, borderTopWidth: 1 },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.effectiveDate}
            </Text>
            <Text style={[styles.infoValue, { color: theme.textStrong }]}>
              {formatDate(item.dateEffet, lang)}
            </Text>
          </View>
          <View
            style={[
              styles.infoRow,
              { borderTopColor: theme.border, borderTopWidth: 1 },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.amount}
            </Text>
            <Text style={[styles.infoValue, { color: theme.textStrong }]}>
              {item.montantFixe
                ? formatPrice(item.montantFixe)
                : item.tauxTaxe
                ? `${item.tauxTaxe}%`
                : '—'}
            </Text>
          </View>
          <View
            style={[
              styles.infoRow,
              { borderTopColor: theme.border, borderTopWidth: 1 },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.officialDoc}
            </Text>
            {item.documentUrl ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(item.documentUrl!)}
              >
                <Text style={[styles.docLink, { color: colors.primary }]}>
                  {t.viewDoc}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {t.noDoc}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.deleteBtn,
            { borderColor: colors.error, marginHorizontal: spacing.lg },
          ]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.8}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                {t.delete}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <ConfirmModal
        visible={deleteModalVisible}
        title={t.confirmDelete}
        message={t.confirmDeleteMsg}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={doDelete}
        onCancel={() => setDeleteModalVisible(false)}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },

  hero: {
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: { flex: 1 },
  heroName: { ...typography.bodyBold, fontSize: typography.sizes.lg },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typePillText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },
  heroAmount: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
    marginTop: spacing.sm,
  },
  heroDesc: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  inForceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  inForceText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  docLink: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  deleteBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
