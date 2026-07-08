import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { SkeletonCalendarScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';

type Trip = {
  idVoyage: string;
  titre?: string;
  nomAgence?: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  dureeVoyage?: string;
  statusVoyage: string;
  prix: number;
  nomClasseVoyage?: string;
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  smallImage?: string | null;
};

const STATUS_DOT: Record<string, string> = {
  PUBLIE: colors.success,
  EN_COURS: colors.primary,
  EN_ATTENTE: '#d97706',
  ANNULE: colors.error,
  TERMINE: '#6b7280',
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
  'VIP PREMIUM': '#1e3a8a',
};

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Monday = 0
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatPrice(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(2)}M FCFA`;
  if (price >= 1000) return `${(price / 1000).toFixed(0)} 000 FCFA`;
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

function getTripHour(trip: Trip): string {
  const t = trip.dateDepartPrev;
  if (!t?.includes('T')) return '00:00';
  return t.split('T')[1]?.slice(0, 5) || '00:00';
}

export default function AgencyCalendar() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const today = new Date();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isOffline, setIsOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const t = {
    fr: {
      title: 'Calendrier',
      monthOverview: 'Aperçu du mois',
      trips: 'Voyages',
      occupation: 'Occupation',
      seatsAvail: 'Places dispo.',
      revenue: 'Revenus (FCFA)',
      published: 'Publié',
      pending: 'En attente',
      ongoing: 'En cours',
      cancelled: 'Annulé',
      upcoming: 'Prochains départs',
      seeAll: 'Voir tout',
      seatsReserved: 'places réservées',
      months: MONTHS_FR,
      days: DAYS_FR,
    },
    en: {
      title: 'Calendar',
      monthOverview: 'Month overview',
      trips: 'Trips',
      occupation: 'Occupancy',
      seatsAvail: 'Seats avail.',
      revenue: 'Revenue (FCFA)',
      published: 'Published',
      pending: 'Pending',
      ongoing: 'Ongoing',
      cancelled: 'Cancelled',
      upcoming: 'Upcoming departures',
      seeAll: 'See all',
      seatsReserved: 'seats reserved',
      months: MONTHS_EN,
      days: DAYS_EN,
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
      const agency = await agencyRes.json();

      const tripsRes = await fetch(
        `${API_URL}/voyage/agence/${agency.id}?size=200`,
        { headers },
      );
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        const tripsData = data.content || data || [];
        setTrips(tripsData);
        setCache(`agency_calendar_${agency.id}`, tripsData);
        setIsOffline(false);
      } else {
        const cached = await getCache(`agency_calendar_${agency.id}`);
        if (cached) {
          setTrips(cached);
          setIsOffline(true);
        }
      }
    } catch {
      // Try to load from cache using stored agency info
      try {
        const userRaw = await AsyncStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const chefId = user?.userId || user?.id;
        if (chefId) {
          const token = await AsyncStorage.getItem('token');
          const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (agencyRes.ok) {
            const agency = await agencyRes.json();
            const cached = await getCache(`agency_calendar_${agency.id}`);
            if (cached) {
              setTrips(cached);
              setIsOffline(true);
            }
          }
        }
      } catch {
        // silent
      }
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

  const monthTrips = useMemo(
    () =>
      trips.filter(t => {
        const d = new Date(t.dateDepartPrev);
        return d.getMonth() === calMonth && d.getFullYear() === calYear;
      }),
    [trips, calMonth, calYear],
  );

  const totalSeats = monthTrips.reduce((s, t) => s + t.nbrPlaceReservable, 0);
  const soldSeats = monthTrips.reduce(
    (s, t) => s + Math.max(0, t.nbrPlaceRestante - t.nbrPlaceReservable),
    0,
  );
  const occupation =
    totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;
  const totalAvail = monthTrips.reduce((s, t) => s + t.nbrPlaceRestante, 0);
  const totalRev = monthTrips
    .filter(
      t =>
        t.statusVoyage === 'PUBLIE' ||
        t.statusVoyage === 'TERMINE' ||
        t.statusVoyage === 'EN_COURS',
    )
    .reduce(
      (s, t) => s + t.prix * Math.max(0, t.nbrPlaceRestante - t.nbrPlaceReservable),
      0,
    );

  const eventsByDate = useMemo(() => {
    const map: Record<string, Trip[]> = {};
    trips.forEach(trip => {
      const key = trip.dateDepartPrev.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(trip);
    });
    return map;
  }, [trips]);

  // Trips for selected date
  const selectedDateTrips = useMemo(() => {
    const key = toDateKey(selectedDate);
    return (eventsByDate[key] || []).sort((a, b) =>
      getTripHour(a).localeCompare(getTripHour(b)),
    );
  }, [eventsByDate, selectedDate]);

  // Upcoming trips (from today)
  const upcomingTrips = useMemo(
    () =>
      trips
        .filter(t => new Date(t.dateDepartPrev) >= new Date(toDateKey(today)))
        .sort(
          (a, b) =>
            new Date(a.dateDepartPrev).getTime() -
            new Date(b.dateDepartPrev).getTime(),
        )
        .slice(0, 5),
    [trips, today],
  );

  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else setCalMonth(m => m + 1);
  };

  const StatCard = ({
    icon,
    iconColor,
    iconBg,
    value,
    label,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    value: string;
    label: string;
  }) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: theme.textStrong }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.text }]}>{label}</Text>
    </View>
  );

  const UpcomingTripRow = ({ trip }: { trip: Trip }) => {
    const hour = getTripHour(trip);
    const sold = Math.max(0, trip.nbrPlaceRestante - trip.nbrPlaceReservable);
    const classLabel = trip.nomClasseVoyage || 'Standard';
    const classColor =
      CLASS_COLORS[classLabel.toUpperCase().replace(' ', '_')] ||
      colors.primary;
    const dotColor = STATUS_DOT[trip.statusVoyage] || '#6b7280';

    return (
      <TouchableOpacity
        style={[styles.upcomingRow, { borderBottomColor: theme.border }]}
        onPress={() =>
          navigation.navigate('AgencyCalendarDay', {
            dateStr: trip.dateDepartPrev.split('T')[0],
            trips: selectedDateTrips,
          })
        }
        activeOpacity={0.7}
      >
        <Text style={[styles.upcomingHour, { color: theme.text }]}>{hour}</Text>
        <View style={[styles.upcomingDot, { backgroundColor: dotColor }]} />
        <View style={styles.upcomingInfo}>
          <View style={styles.upcomingRouteRow}>
            <Text
              style={[styles.upcomingRoute, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {trip.lieuDepart} → {trip.lieuArrive}
            </Text>
            <View
              style={[styles.classPill, { backgroundColor: `${classColor}20` }]}
            >
              <Text style={[styles.classPillText, { color: classColor }]}>
                {classLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.upcomingMeta, { color: theme.text }]}>
            {new Date(trip.dateDepartPrev).toLocaleDateString(
              lang === 'fr' ? 'fr-FR' : 'en-GB',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              },
            )}
          </Text>
          <Text style={[styles.upcomingSeats, { color: dotColor }]}>
            {sold} / {trip.nbrPlaceReservable} {t.seatsReserved}
          </Text>
        </View>
        <Text style={[styles.upcomingPrice, { color: colors.primary }]}>
          {trip.prix.toLocaleString('fr-FR')} FCFA
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) { return <SkeletonCalendarScreen />; }

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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
      </View>
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
        {/* Month stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.monthOverview}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="calendar-outline"
              iconColor={colors.primary}
              iconBg={`${colors.primary}15`}
              value={String(monthTrips.length)}
              label={t.trips}
            />
            <StatCard
              icon="people-outline"
              iconColor={colors.success}
              iconBg={`${colors.success}15`}
              value={`${occupation}%`}
              label={t.occupation}
            />
            <StatCard
              icon="briefcase-outline"
              iconColor="#d97706"
              iconBg="#fef3c715"
              value={String(totalAvail)}
              label={t.seatsAvail}
            />
            <StatCard
              icon="gift-outline"
              iconColor="#7c3aed"
              iconBg="#f5f3ff15"
              value={formatPrice(totalRev)}
              label={t.revenue}
            />
          </View>
        </View>

        {/* Calendar */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {/* Month navigation */}
          <View style={styles.calNavRow}>
            <TouchableOpacity onPress={prevMonth}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={theme.textStrong}
              />
            </TouchableOpacity>
            <Text style={[styles.calMonthLabel, { color: theme.textStrong }]}>
              {t.months[calMonth]} {calYear}
            </Text>
            <TouchableOpacity onPress={nextMonth}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={theme.textStrong}
              />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.calDayHeaders}>
            {t.days.map(d => (
              <Text
                key={d}
                style={[styles.calDayHeader, { color: theme.text }]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar cells */}
          {Array.from({ length: calendarCells.length / 7 }, (_, rowI) => (
            <View key={rowI} style={styles.calRow}>
              {calendarCells.slice(rowI * 7, rowI * 7 + 7).map((day, colI) => {
                if (!day) return <View key={colI} style={styles.calCell} />;

                const cellDate = new Date(calYear, calMonth, day);
                const dateKey = toDateKey(cellDate);
                const dayTrips = eventsByDate[dateKey] || [];
                const isToday = toDateKey(cellDate) === toDateKey(today);
                const isSelected =
                  toDateKey(cellDate) === toDateKey(selectedDate);
                const isPast = cellDate < new Date(toDateKey(today));

                // Up to 3 status dots
                const dots = dayTrips
                  .slice(0, 3)
                  .map(t => STATUS_DOT[t.statusVoyage] || '#6b7280');

                return (
                  <TouchableOpacity
                    key={colI}
                    style={[
                      styles.calCell,
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                      },
                      isToday &&
                        !isSelected && {
                          borderWidth: 1,
                          borderColor: colors.primary,
                          borderRadius: 4,
                        },
                    ]}
                    onPress={() => {
                      setSelectedDate(cellDate);
                      if (dayTrips.length > 0) {
                        navigation.navigate('AgencyCalendarDay', {
                          dateStr: dateKey,
                          trips: dayTrips,
                        });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.calDayNum,
                        {
                          color: isPast
                            ? theme.border
                            : isSelected
                            ? '#fff'
                            : theme.textStrong,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                    {dots.length > 0 && (
                      <View style={styles.dotsRow}>
                        {dots.map((color, di) => (
                          <View
                            key={di}
                            style={[
                              styles.dot,
                              {
                                backgroundColor: isSelected
                                  ? 'rgba(255,255,255,0.7)'
                                  : color,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={[styles.legend, { borderTopColor: theme.border }]}>
            {[
              { color: colors.success, label: t.published },
              { color: '#d97706', label: t.pending },
              { color: colors.primary, label: t.ongoing },
              { color: colors.error, label: t.cancelled },
            ].map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming departures */}
        <View
          style={[
            styles.upcomingSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.upcomingHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.upcoming}
            </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('trips')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>
          {upcomingTrips.length === 0 ? (
            <EmptyState
              type="result"
              message={lang === 'fr' ? 'Aucun départ à venir' : 'No upcoming departures'}
              textColor={theme.text}
            />
          ) : (
            upcomingTrips.map(trip => (
              <UpcomingTripRow key={trip.idVoyage} trip={trip} />
            ))
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },

  statsSection: { padding: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },

  calendarCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  calMonthLabel: { ...typography.bodyBold, fontSize: typography.sizes.md },
  calDayHeaders: { flexDirection: 'row', marginBottom: spacing.xs },
  calDayHeader: {
    flex: 1,
    textAlign: 'center',
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },
  calRow: { flexDirection: 'row' },
  calCell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calDayNum: { ...typography.body, fontSize: typography.sizes.sm },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { ...typography.body, fontSize: typography.sizes.xs },

  upcomingSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  upcomingHour: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    width: 44,
    marginTop: 2,
  },
  upcomingDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  upcomingInfo: { flex: 1 },
  upcomingRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  upcomingRoute: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  classPill: {
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  classPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  upcomingMeta: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  upcomingSeats: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  upcomingPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
});
