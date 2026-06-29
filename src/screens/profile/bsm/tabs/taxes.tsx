import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation,
  useFocusEffect,
  useScrollToTop,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';

export type PolicyOrTax = {
  idPolitique: string;
  gareRoutiereId: string;
  nomPolitique: string;
  description: string;
  tauxTaxe?: number;
  montantFixe?: number;
  dateEffet: string;
  documentUrl?: string;
  type: 'POLITIQUE' | 'TAXE';
};

type TabFilter = 'ALL' | 'TAXE' | 'POLITIQUE';

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

export default function BsmTaxes() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [items, setItems] = useState<PolicyOrTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('ALL');

  // Stats (hardcoded — no dedicated endpoint available)
  const collected = 1250000;
  const pending = 250000;
  const overdue = 150000;
  const recoveryRate = 89;

  const t = {
    fr: {
      title: 'Taxes & Politiques',
      subtitle: 'Règles et taxes de la gare',
      search: 'Rechercher une taxe ou politique...',
      collected: 'Collectés ce mois',
      pending: 'En attente',
      overdue: 'En retard',
      recoveryRate: 'Taux de recouvrement',
      all: 'Toutes',
      taxes: 'Taxes',
      policies: 'Politiques',
      taxesSection: 'Taxes',
      policiesSection: 'Politiques',
      effective: 'Effective le',
      inForce: 'En vigueur',
      noItems: 'Aucun élément',
      affiliationTaxes: "Taxes d'affiliation",
      affiliationDesc: "Gérer les taxes d'affiliation des agences",
    },
    en: {
      title: 'Taxes & Policies',
      subtitle: 'Station rules and taxes',
      search: 'Search a tax or policy...',
      collected: 'Collected this month',
      pending: 'Pending',
      overdue: 'Overdue',
      recoveryRate: 'Recovery rate',
      all: 'All',
      taxes: 'Taxes',
      policies: 'Policies',
      taxesSection: 'Taxes',
      policiesSection: 'Policies',
      effective: 'Effective on',
      inForce: 'In force',
      noItems: 'No items',
      affiliationTaxes: 'Affiliation taxes',
      affiliationDesc: 'Manage agency affiliation taxes',
    },
  }[lang];

  const loadItems = useCallback(async () => {
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (!managerId) return;

      const headers = { Authorization: `Bearer ${token}` };
      const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers,
      });
      if (!stationRes.ok) return;
      const station = await stationRes.json();

      const res = await fetch(
        `${API_URL}/politique-et-taxes/gare-routiere/${station.idGareRoutiere}`,
        { headers },
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
      loadItems();
    }, [loadItems]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  const filtered = useMemo(
    () =>
      items
        .filter(i => tab === 'ALL' || i.type === tab)
        .filter(
          i =>
            !search.trim() ||
            i.nomPolitique.toLowerCase().includes(search.toLowerCase()),
        ),
    [items, tab, search],
  );

  const taxItems = filtered.filter(i => i.type === 'TAXE');
  const policyItems = filtered.filter(i => i.type === 'POLITIQUE');

  const ItemCard = ({ item }: { item: PolicyOrTax }) => {
    const isTax = item.type === 'TAXE';
    const amount =
      item.montantFixe ?? (item.tauxTaxe ? `${item.tauxTaxe}%` : null);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('TaxDetailBsm', { itemId: item.idPolitique })
        }
      >
        <View
          style={[
            styles.itemIcon,
            {
              backgroundColor: isTax
                ? `${colors.error}15`
                : `${colors.primary}15`,
            },
          ]}
        >
          <Ionicons
            name={isTax ? 'document-text-outline' : 'shield-checkmark-outline'}
            size={22}
            color={isTax ? colors.error : colors.primary}
          />
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.itemTopRow}>
            <Text
              style={[styles.itemName, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {item.nomPolitique}
            </Text>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isTax
                    ? `${colors.error}15`
                    : `${colors.primary}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isTax ? colors.error : colors.primary },
                ]}
              >
                {isTax ? t.taxes.replace('s', '') : t.policies.replace('s', '')}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.itemDesc, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          {amount !== null && (
            <Text
              style={[
                styles.itemAmount,
                { color: isTax ? colors.error : theme.textStrong },
              ]}
            >
              {typeof amount === 'number' ? formatPrice(amount) : amount}
            </Text>
          )}

          <View style={styles.itemFooterRow}>
            <Text style={[styles.itemEffective, { color: theme.text }]}>
              {t.effective} {formatDate(item.dateEffet, lang)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <Text style={[styles.statusText, { color: colors.success }]}>
                {t.inForce}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <SkeletonListScreen hasStats subtitle />;
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
          <View>
            <Text style={[styles.title, { color: theme.textStrong }]}>
              {t.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t.subtitle}
            </Text>
          </View>
          <View
            style={[styles.avatarBtn, { backgroundColor: theme.backgroundAlt }]}
          >
            <Ionicons name="person-outline" size={18} color={theme.text} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Search */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.searchText, { color: theme.textStrong }]}
                placeholder={t.search}
                placeholderTextColor={theme.text}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, { borderColor: theme.border }]}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={theme.textStrong}
              />
            </TouchableOpacity>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.error}
              />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {formatPrice(collected)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.collected}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="sync-outline" size={18} color="#d97706" />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {formatPrice(pending)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.pending}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={18} color={colors.error} />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {formatPrice(overdue)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.overdue}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="trending-up-outline"
                size={18}
                color={colors.success}
              />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {recoveryRate}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.recoveryRate}
              </Text>
            </View>
          </View>

          {/* Taxes d'affiliation */}
          <TouchableOpacity
            style={[
              styles.affiliationCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={() => navigation.navigate('TaxeAffiliationBsm')}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.affiliationIcon,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.affiliationInfo}>
              <Text
                style={[styles.affiliationTitle, { color: theme.textStrong }]}
              >
                {t.affiliationTaxes}
              </Text>
              <Text style={[styles.affiliationDesc, { color: theme.text }]}>
                {t.affiliationDesc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {(
              [
                { key: 'ALL', label: `${t.all} (${items.length})` },
                {
                  key: 'TAXE',
                  label: `${t.taxes} (${
                    items.filter(i => i.type === 'TAXE').length
                  })`,
                },
                {
                  key: 'POLITIQUE',
                  label: `${t.policies} (${
                    items.filter(i => i.type === 'POLITIQUE').length
                  })`,
                },
              ] as { key: TabFilter; label: string }[]
            ).map(tabItem => (
              <TouchableOpacity
                key={tabItem.key}
                style={[
                  styles.tabChip,
                  tab === tabItem.key && {
                    backgroundColor: colors.error,
                    borderColor: colors.error,
                  },
                  tab !== tabItem.key && { borderColor: theme.border },
                ]}
                onPress={() => setTab(tabItem.key)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: tab === tabItem.key ? '#fff' : theme.text },
                  ]}
                >
                  {tabItem.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState
                type="docs"
                message={t.noItems}
                textColor={theme.text}
              />
            ) : (
              <>
                {(tab === 'ALL' || tab === 'TAXE') && taxItems.length > 0 && (
                  <>
                    <Text
                      style={[
                        styles.listSectionTitle,
                        { color: theme.textStrong },
                      ]}
                    >
                      {t.taxesSection}
                    </Text>
                    {taxItems.map(item => (
                      <ItemCard key={item.idPolitique} item={item} />
                    ))}
                  </>
                )}
                {(tab === 'ALL' || tab === 'POLITIQUE') &&
                  policyItems.length > 0 && (
                    <>
                      <Text
                        style={[
                          styles.listSectionTitle,
                          {
                            color: theme.textStrong,
                            marginTop: tab === 'ALL' ? spacing.md : 0,
                          },
                        ]}
                      >
                        {t.policiesSection}
                      </Text>
                      {policyItems.map(item => (
                        <ItemCard key={item.idPolitique} item={item} />
                      ))}
                    </>
                  )}
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.error }]}
          onPress={() => navigation.navigate('TaxFormBsm', {})}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  subtitle: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchText: { ...typography.body, flex: 1, fontSize: typography.sizes.sm },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.md },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },

  affiliationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  affiliationIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  affiliationInfo: { flex: 1 },
  affiliationTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  affiliationDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },

  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tabChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabChipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  list: { paddingHorizontal: spacing.lg },
  listSectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
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
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  itemDesc: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  itemAmount: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.xs,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  itemEffective: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },

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
});
