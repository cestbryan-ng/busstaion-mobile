import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
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
  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);
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
  const [showFilters, setShowFilters] = useState(false);

  const t = {
    fr: {
      title: 'Lignes de service',
      search: 'Rechercher une ligne...',
      all: 'Toutes',
      active: 'Actives',
      inactive: 'Inactives',
      slots: 'Créneaux',
      from: 'Depuis le',
      noLines: 'Aucune ligne de service',
    },
    en: {
      title: 'Service lines',
      search: 'Search a line...',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      slots: 'Slots',
      from: 'From',
      noLines: 'No service lines',
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
        const result = data.content || data || [];
        setLines(result);
        setCache(`org_service_lines_${agencyId}`, result);
        setIsOffline(false);
      } else {
        const cached = await getCache(`org_service_lines_${agencyId}`);
        if (cached) {
          setLines(cached);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache(`org_service_lines_${agencyId}`);
      if (cached) {
        setLines(cached);
        setIsOffline(true);
      }
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
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}
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
          style={[
            styles.filterBtn,
            {
              borderColor: showFilters ? colors.primary : theme.border,
              backgroundColor: showFilters ? `${colors.primary}15` : 'transparent',
            },
          ]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? colors.primary : theme.textStrong}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View
          style={[
            styles.filterChips,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          {TABS.map(tabItem => {
            const active = tab === tabItem.key;
            return (
              <TouchableOpacity
                key={tabItem.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? colors.primary : theme.background,
                    borderColor: active ? colors.primary : theme.border,
                  },
                ]}
                onPress={() => setTab(tabItem.key)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: active ? '#fff' : theme.text },
                  ]}
                >
                  {tabItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
      >
        {filtered.length === 0 ? (
          <EmptyState
            type="result"
            message={t.noLines}
            textColor={theme.text}
          />
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
        <View style={{ height: 100 }} />
      </ScrollView>

    </View>
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
  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
  },
  tabChip: {
    borderWidth: 1,
    borderRadius: 4,
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
