import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
import BuildingPlaceholder from '../../../../assets/placeholders/building.svg';

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  photoUrl?: string;
  services: string[];
  nbreAgence: number | null;
  open: boolean;
};

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-outline',
  CLIMATISATION: 'snow-outline',
  CONSIGNE: 'archive-outline',
  BILLETTERIE_ELECTRONIQUE: 'card-outline',
  MOBILE_MONEY: 'phone-portrait-outline',
  INFIRMERIE: 'medkit-outline',
  BOUTIQUES: 'bag-handle-outline',
};

export default function OrgStations() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [isOffline, setIsOffline] = useState(false);
  const debouncedSearch = useDebounce(search);

  const t = {
    fr: {
      title: 'Gare routière',
      search: 'Rechercher une gare...',
      open: 'OUVERTE',
      closed: 'FERMÉE',
      agencies: 'agences',
      noStations: 'Aucune gare trouvée',
      filterAll: 'Toutes',
      filterOpen: 'Ouvertes',
      filterClosed: 'Fermées',
    },
    en: {
      title: 'Bus stations',
      search: 'Search a station...',
      open: 'OPEN',
      closed: 'CLOSED',
      agencies: 'agencies',
      noStations: 'No stations found',
      filterAll: 'All',
      filterOpen: 'Open',
      filterClosed: 'Closed',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const storedLang = await AsyncStorage.getItem('app_lang');
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const params = debouncedSearch.trim()
        ? `?searchTerm=${encodeURIComponent(debouncedSearch)}&size=50`
        : '?size=50';
      const res = await fetch(`${API_URL}/gare${params}`);
      if (res.ok) {
        const data = await res.json();
        setStations(data.content || data || []);
        setCache('org_stations_0', data.content || data || []);
        setIsOffline(false);
      } else {
        const cached = await getCache('org_stations_0');
        if (cached) {
          setStations(cached);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache('org_stations_0');
      if (cached) {
        setStations(cached);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const FILTERS = [
    { key: 'all' as const, label: t.filterAll },
    { key: 'open' as const, label: t.filterOpen },
    { key: 'closed' as const, label: t.filterClosed },
  ];

  const filtered = useMemo(
    () =>
      stations.filter(s => {
        if (filterStatus === 'open' && !s.open) return false;
        if (filterStatus === 'closed' && s.open) return false;
        return true;
      }),
    [stations, filterStatus],
  );

  if (loading) return <SkeletonListScreen />;

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
            placeholderTextColor={theme.placeholder}
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

      {/* Filter chips */}
      {showFilters && (
        <View style={[styles.filterChips, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          {FILTERS.map(f => {
            const active = filterStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : theme.backgroundAlt,
                    borderColor: active ? colors.primary : theme.border,
                  },
                ]}
                onPress={() => setFilterStatus(f.key)}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
                  {f.label}
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
            message={t.noStations}
            textColor={theme.text}
          />
        ) : (
          filtered.map(station => (
            <TouchableOpacity
              key={station.idGareRoutiere}
              style={[
                styles.stationCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('OrgStationDetail', {
                  stationId: station.idGareRoutiere,
                })
              }
            >
              <View
                style={[
                  styles.stationImage,
                  { backgroundColor: theme.backgroundAlt },
                ]}
              >
                {station.photoUrl ? (
                  <Image
                    source={{ uri: station.photoUrl }}
                    style={styles.stationImageInner}
                    resizeMode="cover"
                  />
                ) : (
                  <BuildingPlaceholder width="70%" height="70%" />
                )}
              </View>
              <View style={styles.stationInfo}>
                <View style={styles.stationNameRow}>
                  <Text
                    style={[styles.stationName, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {station.nomGareRoutiere}
                  </Text>
                  <View
                    style={[
                      styles.openBadge,
                      {
                        backgroundColor: station.open
                          ? `${colors.success}15`
                          : `${colors.error}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.openText,
                        { color: station.open ? colors.success : colors.error },
                      ]}
                    >
                      {station.open ? t.open : t.closed}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={theme.text}
                  />
                  <Text style={[styles.locationText, { color: theme.text }]}>
                    {' '}
                    {station.ville}
                    {station.quartier ? `, ${station.quartier}` : ''}
                  </Text>
                </View>
                <View style={styles.servicesRow}>
                  {station.services.slice(0, 4).map(s => (
                    <View
                      key={s}
                      style={[
                        styles.serviceIcon,
                        { backgroundColor: theme.backgroundAlt },
                      ]}
                    >
                      <Ionicons
                        name={SERVICE_ICONS[s] || 'ellipse-outline'}
                        size={14}
                        color={theme.text}
                      />
                    </View>
                  ))}
                  {station.services.length > 4 && (
                    <Text style={[styles.moreServices, { color: theme.text }]}>
                      +{station.services.length - 4}
                    </Text>
                  )}
                </View>
                <View style={styles.agenciesRow}>
                  <Ionicons
                    name="people-outline"
                    size={12}
                    color={theme.text}
                  />
                  <Text style={[styles.agenciesText, { color: theme.text }]}>
                    {' '}
                    {station.nbreAgence} {t.agencies}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          ))
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
  title: { ...typography.heading, fontSize: typography.sizes.xl },
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  list: { padding: spacing.lg },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stationImage: {
    width: 72,
    height: 60,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stationImageInner: { width: '100%', height: '100%' },
  stationInfo: { flex: 1 },
  stationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stationName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  openBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openText: { ...typography.bodyBold, fontSize: 9 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { ...typography.body, fontSize: typography.sizes.xs },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  serviceIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreServices: { ...typography.body, fontSize: typography.sizes.xs },
  agenciesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  agenciesText: { ...typography.body, fontSize: typography.sizes.xs },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
