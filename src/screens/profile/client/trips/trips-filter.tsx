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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import type { RootStackParamList } from '../../../../navigation';
import { CITIES } from '../../../../components/city-picker-modal';

export type TripFilters = {
  departure: string;
  arrival: string;
  date: string | null;
  classes: string[];
  amenities: string[];
};

const CLASSES = ['VIP', 'PREMIUM', 'STANDARD', 'ECONOMY'];
const AMENITIES = [
  'WIFI',
  'AC',
  'USB',
  'SNACKS',
  'TOILETTES',
  'DIVERTISSEMENT',
  'BOISSONS',
];

const AMENITY_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  AC: 'snow-outline',
  USB: 'phone-portrait-outline',
  SNACKS: 'fast-food-outline',
  TOILETTES: 'water-outline',
  DIVERTISSEMENT: 'tv-outline',
  BOISSONS: 'cafe-outline',
};

const AMENITY_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  AC: { fr: 'Climatisation', en: 'A/C' },
  USB: { fr: 'Prises USB', en: 'USB Ports' },
  SNACKS: { fr: 'Collations', en: 'Snacks' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  DIVERTISSEMENT: { fr: 'Divertissement', en: 'Entertainment' },
  BOISSONS: { fr: 'Boissons', en: 'Drinks' },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function TripsFilter() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TripsFilter'>>();
  const initialFilters = route.params?.filters;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [departure, setDeparture] = useState(
    initialFilters?.departure || 'Tous',
  );
  const [arrival, setArrival] = useState(initialFilters?.arrival || 'Tous');
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialFilters?.date || null,
  );
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    initialFilters?.classes || ['VIP', 'PREMIUM', 'STANDARD'],
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialFilters?.amenities || AMENITIES,
  );
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'fr' || l === 'en') setLang(l);
    });
  }, []);

  const t = {
    fr: {
      title: 'Filtres',
      reset: 'Réinitialiser',
      departure: 'Lieu de départ',
      arrival: "Lieu d'arrivée",
      date: 'Date de départ',
      travelClass: 'Classe de voyage',
      amenities: 'Équipements',
      amenitiesHint: '(au moins un)',
      all: 'Tous',
      showResults: () => `Afficher les voyages`,
      days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      months: [
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
      ],
    },
    en: {
      title: 'Filters',
      reset: 'Reset',
      departure: 'Departure',
      arrival: 'Arrival',
      date: 'Departure date',
      travelClass: 'Travel class',
      amenities: 'Amenities',
      amenitiesHint: '(at least one)',
      all: 'All',
      showResults: () => `Show trips`,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      months: [
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
      ],
    },
  }[lang];

  const toggleClass = (c: string) => {
    setSelectedClasses(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c],
    );
  };

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a],
    );
  };

  const handleReset = () => {
    setDeparture('Tous');
    setArrival('Tous');
    setSelectedDate(null);
    setSelectedClasses(['VIP', 'PREMIUM', 'STANDARD']);
    setSelectedAmenities(AMENITIES);
  };

  const handleApply = () => {
    const filters: TripFilters = {
      departure: departure === 'Tous' ? '' : departure,
      arrival: arrival === 'Tous' ? '' : arrival,
      date: selectedDate,
      classes: selectedClasses,
      amenities: selectedAmenities,
    };
    navigation.navigate('TripsList', { filters });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = (getFirstDayOfMonth(calendarYear, calendarMonth) + 6) % 7; // Monday first
    const today = new Date();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return (
      <View style={styles.calendar}>
        {/* Days header */}
        <View style={styles.calendarDays}>
          {t.days.map(d => (
            <Text
              key={d}
              style={[styles.calendarDayLabel, { color: theme.text }]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calendarRow}>
            {row.map((day, di) => {
              if (!day) return <View key={di} style={styles.calendarCell} />;
              const dateStr = `${calendarYear}-${String(
                calendarMonth + 1,
              ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isPast = new Date(dateStr) < new Date(today.toDateString());
              const isToday =
                today.getDate() === day &&
                today.getMonth() === calendarMonth &&
                today.getFullYear() === calendarYear;

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarCell,
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
                  onPress={() =>
                    !isPast && setSelectedDate(isSelected ? null : dateStr)
                  }
                  disabled={isPast}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
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
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Month navigation */}
        <View style={[styles.monthNav, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(y => y - 1);
              } else setCalendarMonth(m => m - 1);
            }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.textStrong }]}>
            {t.months[calendarMonth]} {calendarYear}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(y => y + 1);
              } else setCalendarMonth(m => m + 1);
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const Chip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : theme.border,
          backgroundColor: selected ? colors.primary : 'transparent',
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#fff' : theme.textStrong },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={[styles.resetText, { color: colors.primary }]}>
            {t.reset}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Departure ── */}
        <Text style={[styles.sectionLabel, { color: theme.textStrong }]}>
          {t.departure}
        </Text>
        <View style={styles.chipsWrap}>
          <Chip
            label={t.all}
            selected={departure === 'Tous'}
            onPress={() => setDeparture('Tous')}
          />
          {CITIES.map(c => (
            <Chip
              key={c}
              label={c}
              selected={departure === c}
              onPress={() => setDeparture(c)}
            />
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* ── Arrival ── */}
        <Text style={[styles.sectionLabel, { color: theme.textStrong }]}>
          {t.arrival}
        </Text>
        <View style={styles.chipsWrap}>
          <Chip
            label={t.all}
            selected={arrival === 'Tous'}
            onPress={() => setArrival('Tous')}
          />
          {CITIES.map(c => (
            <Chip
              key={c}
              label={c}
              selected={arrival === c}
              onPress={() => setArrival(c)}
            />
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* ── Date ── */}
        <Text style={[styles.sectionLabel, { color: theme.textStrong }]}>
          {t.date}
        </Text>
        {renderCalendar()}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* ── Travel Class ── */}
        <Text style={[styles.sectionLabel, { color: theme.textStrong }]}>
          {t.travelClass}
        </Text>
        <View style={styles.checkGrid}>
          {CLASSES.map(c => {
            const checked = selectedClasses.includes(c);
            return (
              <TouchableOpacity
                key={c}
                style={styles.checkItem}
                onPress={() => toggleClass(c)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: checked ? colors.primary : theme.border,
                      backgroundColor: checked ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {checked && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={[styles.checkLabel, { color: theme.textStrong }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* ── Amenities ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: theme.textStrong }]}>
            {t.amenities}
          </Text>
          <Text style={[styles.sectionHint, { color: theme.text }]}>
            {t.amenitiesHint}
          </Text>
        </View>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map(a => {
            const checked = selectedAmenities.includes(a);
            return (
              <TouchableOpacity
                key={a}
                style={[
                  styles.amenityItem,
                  {
                    borderColor: checked ? colors.primary : theme.border,
                    backgroundColor: checked
                      ? `${colors.primary}10`
                      : theme.backgroundAlt,
                  },
                ]}
                onPress={() => toggleAmenity(a)}
              >
                <View
                  style={[
                    styles.amenityCheckbox,
                    {
                      borderColor: checked ? colors.primary : theme.border,
                      backgroundColor: checked ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {checked && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>
                <Ionicons
                  name={AMENITY_ICONS[a] || 'ellipse-outline'}
                  size={22}
                  color={checked ? colors.primary : theme.text}
                />
                <Text
                  style={[
                    styles.amenityLabel,
                    { color: checked ? colors.primary : theme.text },
                  ]}
                >
                  {lang === 'fr' ? AMENITY_LABELS[a].fr : AMENITY_LABELS[a].en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Apply button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={handleApply}
        >
          <Text style={styles.applyBtnText}>{t.showResults()}</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: typography.sizes.lg,
  },
  resetText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHint: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },

  // Calendar
  calendar: {
    gap: spacing.sm,
  },
  calendarDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  calendarDayLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    width: 36,
    textAlign: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  monthLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },

  // Checkboxes
  checkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '45%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityItem: {
    width: '22%',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    gap: spacing.xs,
    position: 'relative',
  },
  amenityCheckbox: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
