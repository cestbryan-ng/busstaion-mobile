import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { useDebounce } from '../../../../hooks/useDebounce';

type Line = {
  id_planning: string;
  nom: string;
  description?: string;
  recurrence: string;
  statut: string;
  date_debut: string;
  date_fin?: string;
  nombre_creneaux: number;
  nom_agence?: string;
};

type TabFilter = 'all' | 'ACTIF' | 'INACTIF';

const RECURRENCE_LABELS: Record<string, string> = {
  QUOTIDIEN: 'Quotidien',
  HEBDOMADAIRE: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  ANNUEL: 'Annuel',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ACTIF: { label: 'ACTIVE', color: colors.success, bg: `${colors.success}15` },
  INACTIF: { label: 'INACTIVE', color: colors.error, bg: `${colors.error}15` },
  BROUILLON: { label: 'BROUILLON', color: '#d97706', bg: '#fef3c715' },
  ARCHIVE: { label: 'ARCHIVÉ', color: '#6b7280', bg: '#6b728015' },
};

export default function OrgServiceLines() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgServiceLines'>>();
  const { agencyId, agencyName } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [tab, setTab] = useState<TabFilter>('all');

  const t = {
    fr: {
      title: 'Lignes de service',
      search: 'Rechercher une ligne...',
      all: 'Toutes',
      active: 'Actives',
      inactive: 'Inactives',
      slots: 'Créneaux',
      from: 'Depuis le',
      noLines: 'Aucune ligne',
    },
    en: {
      title: 'Service lines',
      search: 'Search a line...',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      slots: 'Slots',
      from: 'From',
      noLines: 'No lines',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/ligne-service/agence/${agencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLines(data.content || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = useMemo(
    () =>
      lines
        .filter(l => tab === 'all' || l.statut === tab)
        .filter(
          l =>
            !debouncedSearch.trim() ||
            l.nom.toLowerCase().includes(debouncedSearch.toLowerCase()),
        ),
    [lines, tab, debouncedSearch],
  );

  const activeCount = lines.filter(l => l.statut === 'ACTIF').length;
  const inactiveCount = lines.filter(l => l.statut === 'INACTIF').length;

  if (loading) return <SkeletonListScreen />;

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: t.all, count: lines.length },
    { key: 'ACTIF', label: t.active, count: activeCount },
    { key: 'INACTIF', label: t.inactive, count: inactiveCount },
  ];

  return (
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
        <TouchableOpacity>
          <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchInput,
            { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
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
          <Ionicons name="options-outline" size={20} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tabItem => (
          <TouchableOpacity
            key={tabItem.key}
            style={[
              styles.tabChip,
              tab === tabItem.key && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
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
              {tabItem.label} ({tabItem.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="git-branch-outline" size={48} color={theme.text} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t.noLines}
            </Text>
          </View>
        ) : (
          filtered.map(line => {
            const statusCfg =
              STATUS_CONFIG[line.statut] || STATUS_CONFIG.INACTIF;
            return (
              <TouchableOpacity
                key={line.id_planning}
                style={[
                  styles.lineCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('OrgServiceLineDetail', {
                    lineId: line.id_planning,
                    agencyId,
                  })
                }
              >
                <View style={styles.lineCardTop}>
                  <View
                    style={[
                      styles.lineAvatar,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Ionicons
                      name="git-branch-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.lineInfo}>
                    <Text
                      style={[styles.lineName, { color: theme.textStrong }]}
                      numberOfLines={1}
                    >
                      {line.nom}
                    </Text>
                    <Text
                      style={[styles.lineRecurrence, { color: theme.text }]}
                    >
                      {RECURRENCE_LABELS[line.recurrence] || line.recurrence}
                      {' · '}
                      {t.from}{' '}
                      {new Date(line.date_debut).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusCfg.color }]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.text}
                  />
                </View>
                <View
                  style={[styles.lineMeta, { borderTopColor: theme.border }]}
                >
                  <Text style={[styles.lineMetaText, { color: theme.text }]}>
                    {line.nombre_creneaux} {t.slots}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
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
  tabsScroll: { borderBottomWidth: 1, maxHeight: 52 },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabChipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  list: { padding: spacing.lg },
  lineCard: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  lineCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  lineAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineInfo: { flex: 1 },
  lineName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  lineRecurrence: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  lineMeta: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lineMetaText: { ...typography.body, fontSize: typography.sizes.xs },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
