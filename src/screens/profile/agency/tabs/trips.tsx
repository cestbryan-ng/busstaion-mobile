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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';

type Trip = {
  idVoyage: string;
  titre?: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepart?: string;
  statusVoyage: string;
  prix: number;
  nomClasseVoyage?: string;
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  photoUrl?: string;
  vehiculeNom?: string;
};

type StatusFilter = 'PUBLIE' | 'EN_COURS' | 'EN_ATTENTE' | 'TERMINE' | 'ANNULE';
type CountByStatus = Record<StatusFilter, number>;

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
  PUBLIE: {
    label: 'Publié',
    labelEn: 'Published',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_COURS: {
    label: 'En cours',
    labelEn: 'Ongoing',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_ATTENTE: {
    label: 'Brouillon',
    labelEn: 'Draft',
    color: '#d97706',
    bg: '#fef3c715',
  },
  TERMINE: {
    label: 'Terminé',
    labelEn: 'Completed',
    color: '#6b7280',
    bg: '#6b728015',
  },
  ANNULE: {
    label: 'Annulé',
    labelEn: 'Cancelled',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

export default function AgencyTrips() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('PUBLIE');
  const [search, setSearch] = useState('');
  const [agencyId, setAgencyId] = useState('');

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

  const loadTrips = useCallback(async () => {
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const headers = { Authorization: `Bearer ${token}` };
      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers,
      });
      if (!agencyRes.ok) return;
      const agencyData = await agencyRes.json();
      setAgencyId(agencyData.agencyId);

      const tripsRes = await fetch(
        `${API_URL}/voyage/agence/${agencyData.agencyId}/public?size=100`,
        { headers },
      );
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips(data.content || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

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
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            t.lieuDepart.toLowerCase().includes(q) ||
            t.lieuArrive.toLowerCase().includes(q) ||
            t.titre?.toLowerCase().includes(q)
          );
        }),
    [trips, activeFilter, search],
  );

  const SeatProgress = ({ trip }: { trip: Trip }) => {
    const sold = trip.nbrPlaceReservable - trip.nbrPlaceRestante;
    const ratio =
      trip.nbrPlaceReservable > 0 ? sold / trip.nbrPlaceReservable : 0;
    const barColor =
      ratio > 0.8 ? colors.error : ratio > 0.5 ? '#d97706' : colors.success;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${ratio * 100}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <View style={styles.progressLabel}>
          <Text style={[styles.progressText, { color: barColor }]}>
            {sold} / {trip.nbrPlaceReservable} {t.soldSeats}
          </Text>
          <Text style={[styles.priceText, { color: colors.primary }]}>
            {trip.prix.toLocaleString('fr-FR')} FCFA
          </Text>
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
        style={[
          styles.tripCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AgencyTripDetail', { tripId: item.idVoyage })
        }
      >
        {/* Image */}
        <View
          style={[styles.tripImage, { backgroundColor: theme.backgroundAlt }]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.tripImageInner}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="bus-outline" size={28} color={theme.text} />
          )}
        </View>

        {/* Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripHeader}>
            <View style={styles.tripTitleRow}>
              <Text
                style={[styles.tripRoute, { color: theme.textStrong }]}
                numberOfLines={1}
              >
                {item.lieuDepart} → {item.lieuArrive}
              </Text>
              <View
                style={[
                  styles.classPill,
                  { backgroundColor: `${classColor}20` },
                ]}
              >
                <Text style={[styles.classPillText, { color: classColor }]}>
                  {classLabel}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() =>
                navigation.navigate('AgencyTripDetail', {
                  tripId: item.idVoyage,
                })
              }
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tripMeta}>
            <Ionicons name="calendar-outline" size={12} color={theme.text} />
            <Text style={[styles.tripMetaText, { color: theme.text }]}>
              {' '}
              {formatDate(item.dateDepartPrev, lang)}
              {item.heureDepart ? ` · ${item.heureDepart}` : ''}
            </Text>
          </View>

          {item.vehiculeNom && (
            <View style={styles.tripMeta}>
              <Ionicons name="bus-outline" size={12} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}
                Bus: {item.vehiculeNom}
              </Text>
            </View>
          )}

          {/* Status badge for non-published */}
          {item.statusVoyage === 'EN_COURS' && (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusCfg.bg,
                  alignSelf: 'flex-start',
                  marginTop: spacing.xs,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          )}

          <SeatProgress trip={item} />
        </View>
      </TouchableOpacity>
    );
  };

  const FILTER_TABS: { key: StatusFilter; label: string; count: number }[] = [
    {
      key: 'PUBLIE',
      label: `${t.published} ${counts.PUBLIE}`,
      count: counts.PUBLIE,
    },
    {
      key: 'EN_COURS',
      label: `${t.ongoing} ${counts.EN_COURS}`,
      count: counts.EN_COURS,
    },
    {
      key: 'EN_ATTENTE',
      label: `${t.drafts} ${counts.EN_ATTENTE}`,
      count: counts.EN_ATTENTE,
    },
    {
      key: 'TERMINE',
      label: `${t.completed} ${counts.TERMINE}`,
      count: counts.TERMINE,
    },
  ];

  if (loading) {
    return <SkeletonListScreen />;
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
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity onPress={() => {}}>
            <View
              style={[
                styles.avatarBtn,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              <Ionicons name="person-outline" size={18} color={theme.text} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Status filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.filtersScroll,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                activeFilter === tab.key && { backgroundColor: colors.primary },
                activeFilter !== tab.key && {
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: activeFilter === tab.key ? '#fff' : theme.text },
                ]}
              >
                {tab.key === 'PUBLIE' ? `${t.published} ` : ''}
                {tab.key === 'EN_COURS' ? `${t.ongoing} ` : ''}
                {tab.key === 'EN_ATTENTE' ? `${t.drafts} ` : ''}
                {tab.key === 'TERMINE' ? `${t.completed} ` : ''}
                <Text
                  style={[
                    styles.filterCount,
                    {
                      color: activeFilter === tab.key ? '#fff' : colors.primary,
                    },
                  ]}
                >
                  {tab.count}
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
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
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
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
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={theme.text} />
              </TouchableOpacity>
            )}
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

        {/* List */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          ) : (
            filtered.map(item => <TripCard key={item.idVoyage} item={item} />)
          )}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AgencyNewTrip', {})}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>{t.newTrip}</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersScroll: { borderBottomWidth: 1, maxHeight: 56 },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterTabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  filterCount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
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
  list: { padding: spacing.lg, gap: spacing.md },
  tripCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  tripImage: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripImageInner: { width: '100%', height: '100%' },
  tripInfo: { flex: 1, padding: spacing.md },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  progressContainer: { marginTop: spacing.sm, gap: 4 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...typography.body, fontSize: typography.sizes.xs },
  priceText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 4,
    gap: spacing.sm,
  },
  fabText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
