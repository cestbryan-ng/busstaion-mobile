// screens/client/trips/trips-list.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
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
import type { TripFilters } from './trips-filter';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonListScreen } from '../../../../components/skeleton';
import {
  DatePickerModal,
  formatDateDisplay,
} from '../../../../components/date-picker-modal';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';
import { CityPickerModal } from '../../../../components/city-picker-modal';

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  statusVoyage: string;
  nomClasseVoyage: string;
  amenities: string[];
  prix: number;
  dureeVoyage: string | number;
  nbrPlaceRestante: number;
  smallImage?: string;
  nomAgence?: string;
};

type ViewMode = 'grid' | 'list';
type SortType = 'price_asc' | 'price_desc' | 'duration_asc' | 'seats_desc';

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
  TOILETTES: 'water-outline',
  DIVERTISSEMENT: 'tv-outline',
  ENTERTAINMENT: 'tv-outline',
  BOISSONS: 'cafe-outline',
  COMFORTABLE_SEATS: 'ribbon-outline',
  LUGGAGE_STORAGE: 'briefcase-outline',
  POWER_OUTLETS: 'flash-outline',
  PRISES: 'flash-outline',
};

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseDuration(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0', 10) + parseInt(match[2] || '0', 10) / 60;
}

function formatDuration(raw: string | number): string {
  const hours = parseDuration(raw);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h 00m`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

export default function TripsList() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TripsList'>>();
  const initialFilters = route.params?.filters;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortType>('price_asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search state (editable in this page)
  const [departure, setDeparture] = useState(initialFilters?.departure || '');
  const [arrival, setArrival] = useState(initialFilters?.arrival || '');
  const [date, setDate] = useState(initialFilters?.date || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Active filters from filter page
  const [activeFilters, setActiveFilters] = useState<TripFilters>(
    initialFilters || {
      departure: '',
      arrival: '',
      date: null,
      classes: [],
      amenities: [],
    },
  );

  const t = {
    fr: {
      title: 'Voyages disponibles',
      departurePlaceholder: 'Lieu de départ',
      arrivalPlaceholder: "Lieu d'arrivée",
      datePlaceholder: 'Date de départ',
      searchBtn: 'Rechercher',
      allDepartures: 'Tous les départs',
      allArrivals: 'Toutes les arrivées',
      sortBy: 'Trier par',
      grid: 'Grille',
      list: 'Liste',
      seats: (n: number) =>
        `${n} siège${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
      routeLabel: (from: string, to: string) => `De ${from} vers ${to}`,
      filters: 'Filtres',
      noTrips: 'Aucun voyage trouvé',
      sortOptions: {
        price_asc: 'Prix croissant',
        price_desc: 'Prix décroissant',
        duration_asc: 'Durée croissante',
        seats_desc: 'Sièges disponibles',
      },
    },
    en: {
      title: 'Available trips',
      departurePlaceholder: 'Departure',
      arrivalPlaceholder: 'Arrival',
      datePlaceholder: 'Departure date',
      searchBtn: 'Search',
      allDepartures: 'All departures',
      allArrivals: 'All arrivals',
      sortBy: 'Sort by',
      grid: 'Grid',
      list: 'List',
      seats: (n: number) => `${n} seat${n > 1 ? 's' : ''} available`,
      routeLabel: (from: string, to: string) => `From ${from} to ${to}`,
      filters: 'Filters',
      noTrips: 'No trips found',
      sortOptions: {
        price_asc: 'Price: low to high',
        price_desc: 'Price: high to low',
        duration_asc: 'Shortest duration',
        seats_desc: 'Most seats',
      },
    },
  }[lang];

  // Keep filters in sync with route params (filter page result)
  useEffect(() => {
    if (route.params?.filters) {
      const f = route.params.filters;
      setActiveFilters(f);
      if (f.departure) setDeparture(f.departure);
      if (f.arrival) setArrival(f.arrival);
      if (f.date) setDate(f.date);
    }
  }, [route.params?.filters]);

  const loadTrips = useCallback(async (page = 0, reset = true) => {
    if (!reset) setLoadingMore(true);
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/voyage?page=${page}&size=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const now = new Date();
        const published = (data.content || []).filter(
          (t: Trip) =>
            t.statusVoyage === 'PUBLIE' && new Date(t.dateDepartPrev) > now,
        );
        setTrips(prev => (reset ? published : [...prev, ...published]));
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
        await setCache(`client_trips_list_${page}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(`client_trips_list_${page}`);
        if (cached) {
          const now = new Date();
          const published = (cached.content || []).filter(
            (t: Trip) =>
              t.statusVoyage === 'PUBLIE' && new Date(t.dateDepartPrev) > now,
          );
          setTrips(prev => (reset ? published : [...prev, ...published]));
          setTotalPages(cached.totalPages || 1);
          setCurrentPage(page);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache(`client_trips_list_${page}`);
      if (cached) {
        const now = new Date();
        const published = (cached.content || []).filter(
          (t: Trip) =>
            t.statusVoyage === 'PUBLIE' && new Date(t.dateDepartPrev) > now,
        );
        setTrips(prev => (reset ? published : [...prev, ...published]));
        setTotalPages(cached.totalPages || 1);
        setCurrentPage(page);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      if (!reset) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips(0, true);
    setRefreshing(false);
  }, [loadTrips]);

  const loadMore = useCallback(() => {
    if (loadingMore || currentPage >= totalPages - 1) return;
    loadTrips(currentPage + 1, false);
  }, [loadingMore, currentPage, totalPages, loadTrips]);

  const filtered = trips
    .filter(trip => {
      if (
        departure &&
        !trip.lieuDepart.toLowerCase().includes(departure.toLowerCase())
      )
        return false;
      if (
        arrival &&
        !trip.lieuArrive.toLowerCase().includes(arrival.toLowerCase())
      )
        return false;
      if (date && !trip.dateDepartPrev.startsWith(date)) return false;
      if (
        activeFilters.classes.length > 0 &&
        !activeFilters.classes.includes(trip.nomClasseVoyage)
      )
        return false;
      if (activeFilters.amenities.length > 0) {
        const hasAmenity = activeFilters.amenities.some(a =>
          trip.amenities?.includes(a),
        );
        if (!hasAmenity) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.prix - b.prix;
      if (sortBy === 'price_desc') return b.prix - a.prix;
      if (sortBy === 'duration_asc')
        return parseDuration(a.dureeVoyage) - parseDuration(b.dureeVoyage);
      if (sortBy === 'seats_desc')
        return b.nbrPlaceRestante - a.nbrPlaceRestante;
      return 0;
    });

  const ListCard = ({ item }: { item: Trip }) => {
    const classColor = CLASS_COLORS[item.nomClasseVoyage] || colors.primary;
    const visibleAmenities = item.amenities?.slice(0, 5) || [];
    const extraCount = Math.max(0, (item.amenities?.length || 0) - 5);

    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('TripDetail', { tripId: item.idVoyage })
        }
      >
        {/* Top row */}
        <View style={styles.listCardTop}>
          {/* Image */}
          <View
            style={[
              styles.listCardImage,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            {item.smallImage?.startsWith('http') ? (
              <Image
                source={{ uri: item.smallImage }}
                style={styles.listCardImageInner}
                resizeMode="cover"
              />
            ) : (
              <TripPlaceholder width="100%" height="100%" />
            )}
          </View>

          {/* Info */}
          <View style={styles.listCardInfo}>
            {/* Class + Route */}
            <View style={styles.listCardRouteRow}>
              <View
                style={[styles.classBadge, { backgroundColor: classColor }]}
              >
                <Text style={styles.classBadgeText}>
                  {item.nomClasseVoyage}
                </Text>
              </View>
              <Text
                style={[styles.listCardRoute, { color: theme.textStrong }]}
                numberOfLines={1}
              >
                {t.routeLabel(item.lieuDepart, item.lieuArrive)}
              </Text>
            </View>

            {/* Date + Hour */}
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={theme.text} />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {' '}
                {formatDate(item.dateDepartPrev, lang)}
              </Text>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.text}
                style={{ marginLeft: 8 }}
              />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {' '}
                {formatTime(item.dateDepartPrev)}
              </Text>
            </View>

            {/* Duration + Price */}
            <View style={styles.listCardPriceRow}>
              <View style={styles.metaRow}>
                <Ionicons
                  name="hourglass-outline"
                  size={12}
                  color={theme.text}
                />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {' '}
                  {formatDuration(item.dureeVoyage)}
                </Text>
              </View>
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatPrice(item.prix)}
              </Text>
            </View>

            {/* Agency */}
            {item.nomAgence && (
              <Text style={[styles.agencyName, { color: theme.text }]}>
                {item.nomAgence}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom: amenities + seats */}
        <View style={[styles.listCardBottom, { borderTopColor: theme.border }]}>
          <View style={styles.amenitiesRow}>
            {visibleAmenities.map(a => (
              <Ionicons
                key={a}
                name={AMENITY_ICONS[a] || 'ellipse-outline'}
                size={14}
                color={theme.text}
                style={{ marginRight: spacing.xs }}
              />
            ))}
            {extraCount > 0 && (
              <Text style={[styles.extraCount, { color: theme.text }]}>
                +{extraCount}
              </Text>
            )}
          </View>
          <Text style={[styles.seatsText, { color: colors.primary }]}>
            {t.seats(item.nbrPlaceRestante)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const GridCard = ({ item }: { item: Trip }) => {
    const classColor = CLASS_COLORS[item.nomClasseVoyage] || colors.primary;
    const visibleAmenities = item.amenities?.slice(0, 4) || [];
    const extraCount = Math.max(0, (item.amenities?.length || 0) - 4);

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('TripDetail', { tripId: item.idVoyage })
        }
      >
        {/* Image */}
        <View
          style={[
            styles.gridCardImage,
            { backgroundColor: theme.backgroundAlt },
          ]}
        >
          {item.smallImage?.startsWith('http') ? (
            <Image
              source={{ uri: item.smallImage }}
              style={styles.gridCardImageInner}
              resizeMode="cover"
            />
          ) : (
            <TripPlaceholder width="100%" height="100%" />
          )}
          <View
            style={[
              styles.classBadge,
              styles.classBadgeAbsolute,
              { backgroundColor: classColor },
            ]}
          >
            <Text style={styles.classBadgeText}>{item.nomClasseVoyage}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.gridCardContent}>
          <Text
            style={[styles.gridCardRoute, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {t.routeLabel(item.lieuDepart, item.lieuArrive)}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={theme.text} />
            <Text
              style={[styles.metaText, { color: theme.text }]}
              numberOfLines={1}
            >
              {' '}
              {new Date(item.dateDepartPrev).toLocaleDateString(
                lang === 'fr' ? 'fr-FR' : 'en-GB',
                { day: 'numeric', month: 'short' },
              )}
            </Text>
            <Ionicons
              name="time-outline"
              size={11}
              color={theme.text}
              style={{ marginLeft: 6 }}
            />
            <Text style={[styles.metaText, { color: theme.text }]}>
              {' '}
              {formatTime(item.dateDepartPrev)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="hourglass-outline" size={11} color={theme.text} />
            <Text style={[styles.metaText, { color: theme.text }]}>
              {' '}
              {formatDuration(item.dureeVoyage)}
            </Text>
          </View>

          <View style={styles.amenitiesRow}>
            {visibleAmenities.map(a => (
              <Ionicons
                key={a}
                name={AMENITY_ICONS[a] || 'ellipse-outline'}
                size={12}
                color={theme.text}
                style={{ marginRight: 3 }}
              />
            ))}
            {extraCount > 0 && (
              <Text style={[styles.extraCount, { color: theme.text }]}>
                +{extraCount}
              </Text>
            )}
          </View>

          <Text style={[styles.gridCardPrice, { color: colors.primary }]}>
            {formatPrice(item.prix)}
          </Text>

          <View style={styles.gridCardFooter}>
            {item.nomAgence && (
              <Text
                style={[styles.agencyName, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.nomAgence}
              </Text>
            )}
            <Text style={[styles.seatsText, { color: colors.primary }]}>
              {t.seats(item.nbrPlaceRestante)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <SkeletonListScreen />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
        {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

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
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={400}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 100
            ) {
              loadMore();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={isOnline ? onRefresh : undefined}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Search Card ── */}
          <View
            style={[
              styles.searchCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {/* Departure + Arrival */}
            <View style={styles.searchRow}>
              <CityPickerModal
                value={departure}
                onSelect={setDeparture}
                placeholder={t.departurePlaceholder}
                label={t.departurePlaceholder}
                theme={theme}
                containerStyle={[
                  styles.searchField,
                  {
                    borderColor: departure ? colors.primary : theme.border,
                    backgroundColor: theme.backgroundAlt,
                    flex: 1,
                  },
                ]}
              />
              <CityPickerModal
                value={arrival}
                onSelect={setArrival}
                placeholder={t.arrivalPlaceholder}
                label={t.arrivalPlaceholder}
                theme={theme}
                containerStyle={[
                  styles.searchField,
                  {
                    borderColor: arrival ? colors.primary : theme.border,
                    backgroundColor: theme.backgroundAlt,
                    flex: 1,
                  },
                ]}
              />
            </View>

            {/* Date */}
            <TouchableOpacity
              style={[
                styles.searchField,
                styles.searchFieldFull,
                {
                  borderColor: date ? colors.primary : theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.searchFieldLabel,
                  { color: date ? theme.textStrong : theme.text, flex: 1 },
                ]}
                numberOfLines={1}
              >
                {date ? formatDateDisplay(date, lang) : t.datePlaceholder}
              </Text>
              {date ? (
                <TouchableOpacity onPress={() => setDate('')}>
                  <Ionicons name="close-circle" size={15} color={theme.text} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            {/* Search button */}
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={() => loadTrips(0)}
            >
              <Text style={styles.searchBtnText}>{t.searchBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Filter + Sort + View mode ── */}
          {(() => {
            const activeCount =
              (activeFilters.classes?.length || 0) +
              (activeFilters.amenities?.length || 0) +
              (activeFilters.departure ? 1 : 0) +
              (activeFilters.arrival ? 1 : 0);
            return (
              <View
                style={[
                  styles.sortBar,
                  {
                    backgroundColor: theme.background,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                {/* Filter */}
                <TouchableOpacity
                  style={[
                    styles.filterBtn,
                    {
                      borderColor:
                        activeCount > 0 ? colors.primary : theme.border,
                      backgroundColor:
                        activeCount > 0
                          ? `${colors.primary}10`
                          : theme.backgroundAlt,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate('TripsFilter', {
                      filters: activeFilters,
                    })
                  }
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color={activeCount > 0 ? colors.primary : theme.textStrong}
                  />
                  <Text
                    style={[
                      styles.filterBtnText,
                      {
                        color:
                          activeCount > 0 ? colors.primary : theme.textStrong,
                      },
                    ]}
                  >
                    {t.filters}
                  </Text>
                  {activeCount > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.filterBadgeText}>{activeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Sort */}
                <TouchableOpacity
                  style={styles.sortBtn}
                  onPress={() => setShowSortMenu(!showSortMenu)}
                >
                  <Text style={[styles.sortLabel, { color: theme.text }]}>
                    {t.sortBy}
                  </Text>
                  <Ionicons
                    name="swap-vertical-outline"
                    size={16}
                    color={theme.textStrong}
                  />
                </TouchableOpacity>

                {/* View toggle */}
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.viewBtn,
                      { borderColor: theme.border },
                      viewMode === 'grid' && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={14}
                      color={viewMode === 'grid' ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.viewBtnText,
                        { color: viewMode === 'grid' ? '#fff' : theme.text },
                      ]}
                    >
                      {t.grid}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewBtn,
                      { borderColor: theme.border },
                      viewMode === 'list' && styles.viewBtnActive,
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons
                      name="list-outline"
                      size={14}
                      color={viewMode === 'list' ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.viewBtnText,
                        { color: viewMode === 'list' ? '#fff' : theme.text },
                      ]}
                    >
                      {t.list}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

          {/* Sort menu */}
          {showSortMenu && (
            <View
              style={[
                styles.sortMenu,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              {(Object.keys(t.sortOptions) as SortType[]).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sortMenuItem,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => {
                    setSortBy(key);
                    setShowSortMenu(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortMenuText,
                      {
                        color:
                          sortBy === key ? colors.primary : theme.textStrong,
                      },
                    ]}
                  >
                    {t.sortOptions[key]}
                  </Text>
                  {sortBy === key && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── List ── */}
          {filtered.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          ) : viewMode === 'list' ? (
            <View style={styles.listContainer}>
              {filtered.map(item => (
                <ListCard key={item.idVoyage} item={item} />
              ))}
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filtered.map(item => (
                <GridCard key={item.idVoyage} item={item} />
              ))}
            </View>
          )}

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ paddingVertical: spacing.lg }}
            />
          )}
        </ScrollView>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        lang={lang}
        selectedDate={date || null}
        onApply={d => setDate(d ?? '')}
        onClose={() => setShowDatePicker(false)}
      />
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
  title: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },

  // Search
  searchCard: {
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    height: 44,
    gap: spacing.xs,
  },
  searchFieldFull: {
    flex: 1,
  },
  searchFieldLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  searchBtn: {
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
  },
  filterBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },

  // Sort bar
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sortLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  viewBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  viewBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },

  // Sort menu
  sortMenu: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  sortMenuText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },

  resultsCount: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // List
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  listCardTop: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  listCardImage: {
    width: 90,
    height: 90,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listCardImageInner: {
    width: '100%',
    height: '100%',
  },
  listCardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  listCardRouteRow: {
    gap: spacing.xs,
  },
  listCardRoute: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  listCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  gridCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gridCardImage: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  gridCardImageInner: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gridCardContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  gridCardRoute: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  gridCardPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  gridCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  // Shared
  classBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  classBadgeAbsolute: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  classBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  price: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  agencyName: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  extraCount: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  seatsText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: typography.sizes.md,
  },
});
