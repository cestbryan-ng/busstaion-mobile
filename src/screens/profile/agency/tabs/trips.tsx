import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
import { useNavigation, useScrollToTop } from '@react-navigation/native';
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
import ImagePlaceholder from '../../../../assets/placeholders/image.svg';

type Trip = {
  idVoyage: string;
  nomAgence?: string;
  titre?: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  dureeVoyage?: string;
  statusVoyage: string;
  prix?: number;
  nomClasseVoyage?: string;
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  smallImage?: string;
  vehiculeNom?: string;
};

type StatusFilter = 'PUBLIE' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE' | 'ANNULE';
type CountByStatus = Record<StatusFilter, number>;

type AgencyTripsProps = {
  drawerOpen?: boolean;
  setDrawerOpen?: (open: boolean) => void;
  lang?: 'fr' | 'en';
  setLang?: (lang: 'fr' | 'en') => void;
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
  'VIP PREMIUM': '#1e3a8a',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  PUBLIE: { label: 'Publié', labelEn: 'Published', color: colors.primary, bg: `${colors.primary}15` },
  EN_COURS: { label: 'En cours', labelEn: 'Ongoing', color: colors.success, bg: `${colors.success}15` },
  EN_ATTENTE: { label: 'Brouillon', labelEn: 'Draft', color: '#d97706', bg: '#fef3c715' },
  TERMINE: { label: 'Terminé', labelEn: 'Completed', color: '#6b7280', bg: '#6b728015' },
  ANNULE: { label: 'Annulé', labelEn: 'Cancelled', color: colors.error, bg: `${colors.error}15` },
};

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

export default function AgencyTrips({
  lang: propLang,
  setLang: propSetLang,
}: AgencyTripsProps = {}) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);

  const [lang, setLang] = useState<'fr' | 'en'>(propLang || 'fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('PUBLIE');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [agencyId, setAgencyId] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showChips, setShowChips] = useState(true);

  const t = {
    fr: {
      title: 'Mes voyages',
      published: 'Publié',
      ongoing: 'En cours',
      drafts: 'Brouillons',
      completed: 'Terminés',
      search: 'Rechercher un voyage...',
      soldSeats: 'places vendues',
      newTrip: 'Nouveau voyage',
      noTrips: 'Aucun voyage',
    },
    en: {
      title: 'My trips',
      published: 'Published',
      ongoing: 'Ongoing',
      drafts: 'Drafts',
      completed: 'Completed',
      search: 'Search a trip...',
      soldSeats: 'seats sold',
      newTrip: 'New trip',
      noTrips: 'No trips',
    },
  }[lang];

  const loadTrips = useCallback(async (pageNum = 0, existingAgencyId = '') => {
    if (pageNum === 0) setLoading(true);
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') {
        setLang(storedLang);
        propSetLang?.(storedLang);
      }

      const userParsed = userRaw ? JSON.parse(userRaw) : null;

      const headers = { Authorization: `Bearer ${token}` };
      let currentAgencyId = existingAgencyId;

      if (!currentAgencyId) {
        const chefId = userParsed?.userId || userParsed?.id;
        if (!chefId) return;
        const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, { headers });
        if (!agencyRes.ok) return;
        const agencyData = await agencyRes.json();
        currentAgencyId = agencyData.id;
        setAgencyId(currentAgencyId);
      }

      const cacheKey = `agency_trips_list_${pageNum}`;
      const tripsRes = await fetch(
        `${API_URL}/voyage/agence/${currentAgencyId}?page=${pageNum}&size=20`,
        { headers },
      );
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        const items: Trip[] = data.content || data || [];
        setTrips(prev => (pageNum === 0 ? items : [...prev, ...items]));
        setTotalPages(data.totalPages ?? 1);
        setPage(pageNum);
        await setCache(cacheKey, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(cacheKey);
        if (cached) {
          const items: Trip[] = cached.content || cached || [];
          setTrips(prev => (pageNum === 0 ? items : [...prev, ...items]));
          setTotalPages(cached.totalPages ?? 1);
          setPage(pageNum);
          setIsOffline(true);
        }
      }
    } catch {
      const cacheKey = `agency_trips_list_${pageNum}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        const items: Trip[] = cached.content || cached || [];
        setTrips(prev => (pageNum === 0 ? items : [...prev, ...items]));
        setTotalPages(cached.totalPages ?? 1);
        setPage(pageNum);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadTrips(0);
  }, [loadTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips(0);
    setRefreshing(false);
  }, [loadTrips]);

  const handleScroll = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        layoutMeasurement: { height: number };
        contentSize: { height: number };
      };
    }) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const nearBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 200;
      if (!nearBottom || loadingMore || page + 1 >= totalPages) return;
      setLoadingMore(true);
      loadTrips(page + 1, agencyId);
    },
    [loadingMore, page, totalPages, agencyId, loadTrips],
  );

  const counts = useMemo<CountByStatus>(
    () => ({
      PUBLIE: trips.filter(t => t.statusVoyage === 'PUBLIE').length,
      EN_COURS: trips.filter(t => t.statusVoyage === 'EN_COURS').length,
      EN_ATTENTE: trips.filter(t => t.statusVoyage === 'EN_ATTENTE').length,
      TERMINE: trips.filter(t => t.statusVoyage === 'TERMINE').length,
      ANNULE: trips.filter(t => t.statusVoyage === 'ANNULE').length,
    }),
    [trips],
  );

  const filtered = useMemo(
    () =>
      trips
        .filter(t => t.statusVoyage === activeFilter)
        .filter(t => {
          if (!debouncedSearch.trim()) return true;
          const q = debouncedSearch.toLowerCase();
          return (
            t.lieuDepart.toLowerCase().includes(q) ||
            t.lieuArrive.toLowerCase().includes(q) ||
            t.titre?.toLowerCase().includes(q)
          );
        }),
    [trips, activeFilter, debouncedSearch],
  );

  const FILTER_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'PUBLIE', label: t.published, count: counts.PUBLIE },
    { key: 'EN_COURS', label: t.ongoing, count: counts.EN_COURS },
    { key: 'EN_ATTENTE', label: t.drafts, count: counts.EN_ATTENTE },
    { key: 'TERMINE', label: t.completed, count: counts.TERMINE },
  ];

  const SeatProgress = ({ trip }: { trip: Trip }) => {
    const sold = Math.max(0, trip.nbrPlaceRestante - trip.nbrPlaceReservable);
    const ratio = trip.nbrPlaceReservable > 0 ? sold / trip.nbrPlaceReservable : 0;
    const barColor = ratio > 0.8 ? colors.error : ratio > 0.5 ? '#d97706' : colors.success;
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
        </View>
        <View style={styles.progressLabel}>
          <Text style={[styles.progressText, { color: barColor }]}>
            {sold} / {trip.nbrPlaceReservable} {t.soldSeats}
          </Text>
          {trip.prix != null && (
            <Text style={[styles.priceText, { color: colors.primary }]}>
              {trip.prix.toLocaleString('fr-FR')} FCFA
            </Text>
          )}
        </View>
      </View>
    );
  };

  const TripCard = ({ item }: { item: Trip }) => {
    const classLabel = item.nomClasseVoyage || 'Standard';
    const classColor = CLASS_COLORS[classLabel.toUpperCase()] || colors.primary;
    const statusCfg = STATUS_CONFIG[item.statusVoyage] || STATUS_CONFIG.PUBLIE;

    return (
      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: theme.background, borderColor: theme.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AgencyTripDetail', { tripId: item.idVoyage })}
      >
        {/* Image */}
        <View style={[styles.tripImage, { backgroundColor: theme.backgroundAlt }]}>
          {item.smallImage && item.smallImage.startsWith('http') ? (
            <Image source={{ uri: item.smallImage }} style={styles.tripImageInner} resizeMode="cover" />
          ) : (
            <ImagePlaceholder width="90%" height="90%" />
          )}
          {item.statusVoyage !== 'PUBLIE' && (
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, position: 'absolute', top: spacing.sm, left: spacing.sm }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          )}
          <View style={[styles.classPill, { backgroundColor: `${classColor}dd`, position: 'absolute', top: spacing.sm, right: spacing.sm }]}>
            <Text style={[styles.classPillText, { color: '#fff' }]}>{classLabel}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripHeader}>
            <Text style={[styles.tripRoute, { color: theme.textStrong }]} numberOfLines={1}>
              {item.lieuDepart} → {item.lieuArrive}
            </Text>
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => navigation.navigate('AgencyTripDetail', { tripId: item.idVoyage })}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tripMeta}>
            <Ionicons name="calendar-outline" size={12} color={theme.text} />
            <Text style={[styles.tripMetaText, { color: theme.text }]}>
              {' '}{formatDate(item.dateDepartPrev, lang)}
            </Text>
          </View>

          {item.vehiculeNom && (
            <View style={styles.tripMeta}>
              <Ionicons name="bus-outline" size={12} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}Bus: {item.vehiculeNom}
              </Text>
            </View>
          )}

          <SeatProgress trip={item} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <SkeletonListScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>{t.title}</Text>
      </View>

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      {/* Search + filtre */}
      <View
        style={[
          styles.searchRow,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
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
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              borderColor: showChips ? colors.primary : theme.border,
              backgroundColor: showChips ? `${colors.primary}15` : 'transparent',
            },
          ]}
          onPress={() => setShowChips(v => !v)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showChips ? colors.primary : theme.textStrong}
          />
        </TouchableOpacity>
      </View>

      {/* Chips filtres */}
      {showChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsScroll, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
          contentContainerStyle={styles.chipsContent}
        >
          {FILTER_TABS.map(tab => {
            const active = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: theme.border },
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        onScroll={handleScroll}
        scrollEventThrottle={300}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState type="result" message={t.noTrips} textColor={theme.text} />
        ) : (
          filtered.map(item => <TripCard key={item.idVoyage} item={item} />)
        )}
        {loadingMore && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB coin bas droit */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AgencyNewTrip', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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

  chipsScroll: { borderBottomWidth: 1, maxHeight: 56 },
  chipsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  list: { padding: spacing.lg, gap: spacing.md },

  tripCard: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  tripImage: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripImageInner: { width: '100%', height: '100%' },
  tripInfo: { padding: spacing.md, gap: spacing.xs },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripTitleRow: { flex: 1, gap: spacing.xs },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.md },
  classPill: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  classPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  moreBtn: { padding: spacing.xs },
  tripMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  tripMetaText: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  progressContainer: { marginTop: spacing.sm, gap: 4 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...typography.body, fontSize: typography.sizes.xs },
  priceText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
