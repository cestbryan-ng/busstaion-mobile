import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
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
import { EmptyState } from '../../../../components/empty-state';

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepartEffectif?: string;
  nomClasseVoyage?: string;
  amenities?: string[];
  prix: number;
  nbrPlaceRestante?: number;
};

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  location?: string;
  rating?: number;
};

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week';

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};

const AMENITY_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  AC: 'snow-outline',
  USB: 'phone-portrait-outline',
  SNACKS: 'fast-food-outline',
  BOISSONS: 'cafe-outline',
  PRISES: 'flash-outline',
};

const TAX_STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  payé: {
    label: 'Taxe payée',
    labelEn: 'Tax paid',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  'en attente': {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c715',
  },
  'en retard': {
    label: 'En retard',
    labelEn: 'Overdue',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function isWithinWeek(d: Date, today: Date): boolean {
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  return d >= today && d <= weekFromNow;
}

export default function AgencyTripsBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyTripsBsm'>>();
  const { agencyId, agencyName } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const t = {
    fr: {
      title: "Voyages de l'agence",
      all: 'Tous',
      today: "Aujourd'hui",
      tomorrow: 'Demain',
      week: 'Cette semaine',
      seats: 'places',
      noTrips: 'Aucun voyage',
    },
    en: {
      title: "Agency's trips",
      all: 'All',
      today: 'Today',
      tomorrow: 'Tomorrow',
      week: 'This week',
      seats: 'seats',
      noTrips: 'No trips',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const [token, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const headers = { Authorization: `Bearer ${token}` };

        const [agencyRes, tripsRes] = await Promise.all([
          fetch(`${API_URL}/agence/${agencyId}`, { headers }),
          fetch(`${API_URL}/voyage/agence/${agencyId}`, { headers }),
        ]);

        if (agencyRes.ok) setAgency(await agencyRes.json());
        if (tripsRes.ok) {
          const data = await tripsRes.json();
          setTrips(data.content || data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agencyId]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayCount = trips.filter(t =>
    isSameDay(new Date(t.dateDepartPrev), today),
  ).length;
  const tomorrowCount = trips.filter(t =>
    isSameDay(new Date(t.dateDepartPrev), tomorrow),
  ).length;
  const weekCount = trips.filter(t =>
    isWithinWeek(new Date(t.dateDepartPrev), today),
  ).length;

  const filtered = useMemo(() => {
    if (dateFilter === 'today')
      return trips.filter(t => isSameDay(new Date(t.dateDepartPrev), today));
    if (dateFilter === 'tomorrow')
      return trips.filter(t => isSameDay(new Date(t.dateDepartPrev), tomorrow));
    if (dateFilter === 'week')
      return trips.filter(t => isWithinWeek(new Date(t.dateDepartPrev), today));
    return trips;
  }, [trips, dateFilter]);

  const TripCard = ({ trip }: { trip: Trip }) => {
    const classLabel = trip.nomClasseVoyage || 'Standard';
    const classColor = CLASS_COLORS[classLabel.toUpperCase()] || colors.primary;
    const visibleAmenities = trip.amenities?.slice(0, 3) || [];

    return (
      <View
        style={[
          styles.tripCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View style={styles.tripLeft}>
          <Text style={[styles.tripHour, { color: colors.error }]}>
            {trip.heureDepartEffectif || ''}
          </Text>
          <Text style={[styles.tripDate, { color: theme.text }]}>
            {new Date(trip.dateDepartPrev).toLocaleDateString(
              lang === 'fr' ? 'fr-FR' : 'en-GB',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              },
            )}
          </Text>
        </View>

        <View style={styles.tripMiddle}>
          <Text
            style={[styles.tripRoute, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {trip.lieuDepart} → {trip.lieuArrive}
          </Text>
          <Text style={[styles.tripClass, { color: classColor }]}>
            {classLabel}
          </Text>
          <View style={styles.amenitiesRow}>
            {visibleAmenities.map(a => (
              <Ionicons
                key={a}
                name={AMENITY_ICONS[a] || 'ellipse-outline'}
                size={13}
                color={theme.text}
                style={{ marginRight: 6 }}
              />
            ))}
          </View>
        </View>

        <View style={styles.tripRight}>
          <View style={[styles.seatsBadge, { backgroundColor: '#fef3c715' }]}>
            <Text style={[styles.seatsText, { color: '#d97706' }]}>
              {trip.nbrPlaceRestante ?? 0} {t.seats}
            </Text>
          </View>
          <Text style={[styles.tripPrice, { color: colors.error }]}>
            {trip.prix.toLocaleString('fr-FR')} FCFA
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusCfg = agency
    ? TAX_STATUS_CONFIG['payé']
    : null;

  const FILTERS: { key: DateFilter; label: string; count: number }[] = [
    { key: 'all', label: `${t.all} (${trips.length})`, count: trips.length },
    { key: 'today', label: `${t.today} (${todayCount})`, count: todayCount },
    {
      key: 'tomorrow',
      label: `${t.tomorrow} (${tomorrowCount})`,
      count: tomorrowCount,
    },
    { key: 'week', label: `${t.week} (${weekCount})`, count: weekCount },
  ];

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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Agency summary */}
        {agency && (
          <View
            style={[
              styles.agencySummary,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.agencyLogo,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              {agency.logoUrl ? (
                <Image
                  source={{ uri: agency.logoUrl }}
                  style={styles.agencyLogoImage}
                  resizeMode="contain"
                />
              ) : (
                <Text
                  style={[styles.agencyLogoText, { color: colors.primary }]}
                >
                  {agency.longName.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.agencyInfo}>
              <Text style={[styles.agencyName, { color: theme.textStrong }]}>
                {agency.longName}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={theme.text}
                />
                <Text style={[styles.locationText, { color: theme.text }]}>
                  {' '}
                  {agency.location}
                </Text>
              </View>
            </View>
            <View style={styles.agencyRight}>
              {statusCfg && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusCfg.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                  </Text>
                </View>
              )}
              {agency.rating !== undefined && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={[styles.ratingText, { color: theme.text }]}>
                    {' '}
                    {agency.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Date filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                dateFilter === f.key && {
                  backgroundColor: colors.error,
                  borderColor: colors.error,
                },
                dateFilter !== f.key && { borderColor: theme.border },
              ]}
              onPress={() => setDateFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: dateFilter === f.key ? '#fff' : theme.text },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trips list */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          ) : (
            filtered.map(trip => <TripCard key={trip.idVoyage} trip={trip} />)
          )}
        </View>

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
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },

  agencySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.md },
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { ...typography.body, fontSize: typography.sizes.xs },
  agencyRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { ...typography.body, fontSize: typography.sizes.xs },

  filtersRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tripLeft: { width: 64 },
  tripHour: { ...typography.bodyBold, fontSize: typography.sizes.md },
  tripDate: { ...typography.body, fontSize: 10, marginTop: 2 },
  tripMiddle: { flex: 1, gap: 3 },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.md },
  tripClass: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  amenitiesRow: { flexDirection: 'row', alignItems: 'center' },
  tripRight: { alignItems: 'flex-end', gap: 4 },
  seatsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seatsText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
