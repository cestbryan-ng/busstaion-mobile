import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';

type Trip = {
  idVoyage: string;
  titre?: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepart?: string;
  heureDepartEffectif?: string;
  heureArrive?: string;
  statusVoyage: string;
  prix: number;
  nomClasseVoyage?: string;
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  vehiculeNom?: string;
  pointDeDepart?: string;
  pointArrivee?: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  PUBLIE: {
    label: 'PUBLIÉ',
    labelEn: 'PUBLISHED',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_COURS: {
    label: 'EN COURS',
    labelEn: 'ONGOING',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_ATTENTE: {
    label: 'BROUILLON',
    labelEn: 'DRAFT',
    color: '#d97706',
    bg: '#fef3c715',
  },
  TERMINE: {
    label: 'TERMINÉ',
    labelEn: 'COMPLETED',
    color: '#6b7280',
    bg: '#6b728015',
  },
  ANNULE: {
    label: 'ANNULÉ',
    labelEn: 'CANCELLED',
    color: colors.error,
    bg: `${colors.error}15`,
  },
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
const DAYS_FR_FULL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_EN_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTripHour(trip: Trip): string {
  return trip.heureDepart || trip.heureDepartEffectif || '00:00';
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

// Build week around a date (Mon-Sun)
function getWeekDays(date: Date): Date[] {
  const day = (date.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function AgencyCalendarDay() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyCalendarDay'>>();

  const { dateStr, trips: routeTrips } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(dateStr));
  const [trips, setTrips] = useState<Trip[]>(routeTrips || []);

  const today = new Date();
  const weekDays = getWeekDays(selectedDate);

  const t = {
    fr: {
      title: (d: Date) =>
        `Voyages du ${d.getDate()} ${
          MONTHS_FR[d.getMonth()]
        } ${d.getFullYear()}`,
      bus: 'Bus :',
      departure: 'Départ :',
      arrival: 'Arrivée :',
      totalSeats: 'places',
      reserved: 'réservées',
      noTrips: 'Aucun voyage ce jour',
      createTrip: 'Créer un nouveau voyage',
      days: DAYS_FR_FULL,
      months: MONTHS_FR,
    },
    en: {
      title: (d: Date) =>
        `Trips on ${
          MONTHS_EN[d.getMonth()]
        } ${d.getDate()}, ${d.getFullYear()}`,
      bus: 'Bus:',
      departure: 'Departure:',
      arrival: 'Arrival:',
      totalSeats: 'seats',
      reserved: 'reserved',
      noTrips: 'No trips this day',
      createTrip: 'Create a new trip',
      days: DAYS_EN_FULL,
      months: MONTHS_EN,
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'fr' || l === 'en') setLang(l);
    });
  }, []);

  // Update trips when date changes (from routeTrips already filtered)
  // In real app you'd refetch, here we use what was passed
  const dayTrips = trips
    .filter(trip => trip.dateDepartPrev.startsWith(toDateKey(selectedDate)))
    .sort((a, b) => getTripHour(a).localeCompare(getTripHour(b)));

  const TripCard = ({ trip }: { trip: Trip }) => {
    const hour = getTripHour(trip);
    const sold = trip.nbrPlaceReservable - trip.nbrPlaceRestante;
    const classLabel = trip.nomClasseVoyage || 'Standard';
    const classColor =
      CLASS_COLORS[classLabel.toUpperCase().replace(' ', '_')] ||
      colors.primary;
    const statusCfg = STATUS_CONFIG[trip.statusVoyage] || STATUS_CONFIG.PUBLIE;
    const dotColor = STATUS_DOT[trip.statusVoyage] || '#6b7280';

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AgencyTripDetail', { tripId: trip.idVoyage })
        }
      >
        {/* Timeline dot + line */}
        <View style={styles.timeline}>
          <Text style={[styles.timelineHour, { color: theme.textStrong }]}>
            {hour}
          </Text>
          <View style={styles.timelineDotCol}>
            <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
            <View
              style={[styles.timelineLine, { backgroundColor: theme.border }]}
            />
          </View>
        </View>

        {/* Card content */}
        <View
          style={[
            styles.cardBody,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {/* Route + class */}
          <View style={styles.cardHeader}>
            <Text
              style={[styles.cardRoute, { color: theme.textStrong }]}
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

          {/* Bus */}
          {trip.vehiculeNom && (
            <View style={styles.cardRow}>
              <Text style={[styles.cardRowLabel, { color: theme.text }]}>
                {t.bus}
              </Text>
              <Text style={[styles.cardRowValue, { color: theme.textStrong }]}>
                {trip.vehiculeNom}
              </Text>
            </View>
          )}

          {/* Departure */}
          {(trip.pointDeDepart || trip.lieuDepart) && (
            <View
              style={[styles.cardDividerRow, { borderTopColor: theme.border }]}
            >
              <View style={styles.cardRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={theme.text}
                />
                <Text style={[styles.cardRowLabel, { color: theme.text }]}>
                  {t.departure}
                </Text>
                <Text
                  style={[styles.cardRowValue, { color: theme.textStrong }]}
                >
                  {trip.pointDeDepart || trip.lieuDepart}
                </Text>
              </View>
              {trip.heureDepart && (
                <Text style={[styles.cardRowTime, { color: theme.text }]}>
                  {trip.heureDepart}
                </Text>
              )}
            </View>
          )}

          {/* Arrival */}
          {(trip.pointArrivee || trip.lieuArrive) && (
            <View style={styles.cardRow}>
              <Ionicons name="location-outline" size={13} color={theme.text} />
              <Text style={[styles.cardRowLabel, { color: theme.text }]}>
                {t.arrival}
              </Text>
              <Text style={[styles.cardRowValue, { color: theme.textStrong }]}>
                {trip.pointArrivee || trip.lieuArrive}
              </Text>
              {trip.heureArrive && (
                <Text style={[styles.cardRowTime, { color: theme.text }]}>
                  {trip.heureArrive}
                </Text>
              )}
            </View>
          )}

          {/* Seats + Status */}
          <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
            <View style={styles.cardSeats}>
              <Ionicons name="people-outline" size={13} color={theme.text} />
              <Text style={[styles.seatsTotal, { color: theme.text }]}>
                {' '}
                {trip.nbrPlaceReservable} {t.totalSeats}
              </Text>
              <Text style={[styles.seatsReserved, { color: dotColor }]}>
                {'  '}
                {sold} {t.reserved}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text
          style={[styles.title, { color: theme.textStrong }]}
          numberOfLines={1}
        >
          {t.title(selectedDate)}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Week strip */}
      <View
        style={[
          styles.weekStrip,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {weekDays.map((day, i) => {
          const isSelected = toDateKey(day) === toDateKey(selectedDate);
          const isToday = toDateKey(day) === toDateKey(today);
          const dayKey = toDateKey(day);
          const hasDayTrips = (routeTrips || []).some(t =>
            t.dateDepartPrev.startsWith(dayKey),
          );

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.weekDay,
                isSelected && {
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                },
              ]}
              onPress={() => setSelectedDate(new Date(day))}
            >
              <Text
                style={[
                  styles.weekDayLabel,
                  { color: isSelected ? '#fff' : theme.text },
                ]}
              >
                {t.days[i]}
              </Text>
              <Text
                style={[
                  styles.weekDayNum,
                  {
                    color: isSelected
                      ? '#fff'
                      : isToday
                      ? colors.primary
                      : theme.textStrong,
                    fontWeight: isToday || isSelected ? '700' : '400',
                  },
                ]}
              >
                {day.getDate()}
              </Text>
              {hasDayTrips && (
                <View
                  style={[
                    styles.weekDot,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.7)'
                        : colors.primary,
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {dayTrips.length === 0 ? (
          <>
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('AgencyNewTrip', {})}
            >
              <Text style={[styles.createLink, { color: colors.primary }]}>
                {t.createTrip}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          dayTrips.map(trip => <TripCard key={trip.idVoyage} trip={trip} />)
        )}
        <View style={{ height: spacing.xl }} />
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
  title: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    flex: 1,
    textAlign: 'center',
  },

  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  weekDayLabel: { ...typography.body, fontSize: typography.sizes.xs },
  weekDayNum: { ...typography.body, fontSize: typography.sizes.md },
  weekDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },

  content: { padding: spacing.lg },

  // Trip card with timeline
  tripCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  timeline: {
    alignItems: 'center',
    marginRight: spacing.sm,
    paddingTop: spacing.sm,
  },
  timelineHour: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    width: 44,
    textAlign: 'right',
  },
  timelineDotCol: { alignItems: 'center', marginLeft: spacing.sm },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, minHeight: 60 },

  cardBody: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardChevron: {
    justifyContent: 'center',
    paddingLeft: spacing.xs,
    paddingTop: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardRoute: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  classPill: {
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  classPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cardDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
  },
  cardRowLabel: { ...typography.body, fontSize: typography.sizes.xs },
  cardRowValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  cardRowTime: { ...typography.body, fontSize: typography.sizes.xs },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  cardSeats: { flexDirection: 'row', alignItems: 'center' },
  seatsTotal: { ...typography.body, fontSize: typography.sizes.xs },
  seatsReserved: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  // Empty
  emptyDay: {
    borderWidth: 1,
    borderRadius: 4,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
  createLink: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
