import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  StatusBar,
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
import { RootStackParamList } from '../../../../navigation';
import { SkeletonHome } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import {
  DatePickerModal,
  formatDateDisplay,
} from '../../../../components/date-picker-modal';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import StationPlaceholder from '../../../../assets/placeholders/building.svg';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';

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

type Agency = {
  id: string;
  longName: string;
  location?: string;
  logoUrl?: string;
  rating?: number;
};

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  services: string[];
  nbreAgence: number | null;
  photoUrl?: string;
};

type User = {
  first_name: string;
  last_name: string;
  id?: string;
  userId?: string;
};

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
  BOISSONS: 'cafe-outline',
  SNACKS: 'fast-food-outline',
  PRISES: 'flash-outline',
  DIVERTISSEMENT: 'tv-outline',
  COMFORTABLE_SEATS: 'ribbon-outline',
  LUGGAGE_STORAGE: 'briefcase-outline',
  POWER_OUTLETS: 'flash-outline',
  ENTERTAINMENT: 'tv-outline',
};

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-checkmark-outline',
  CLIMATISATION: 'snow-outline',
  CONSIGNE: 'lock-closed-outline',
  MOBILE_MONEY: 'phone-portrait-outline',
  BILLETTERIE_ELECTRONIQUE: 'card-outline',
  INFIRMERIE: 'medkit-outline',
  BOUTIQUES: 'bag-outline',
};

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

type AccueilProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
};

export default function Home({
  drawerOpen,
  setDrawerOpen,
  lang,
  setLang,
}: AccueilProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<User | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [gares, setGares] = useState<Gare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [searchHistory, setSearchHistory] = useState<
    { departure: string; arrival: string; date: string }[]
  >([]);

  const hour = new Date().getHours();

  const GREETINGS = {
    fr: {
      morning: [
        'Bonjour ! Prêt pour votre prochain voyage ? ☀️',
        'Bonjour ! Une belle journée pour voyager ☀️',
        'Bonjour ! Où partez-vous aujourd\'hui ? ☀️',
        'Bon matin ! Votre prochaine destination vous attend ☀️',
      ],
      afternoon: [
        'Bonne après-midi ! Où vous emmène-t-on aujourd\'hui ? 🌤️',
        'Bonne après-midi ! Prêt à prendre la route ? 🌤️',
        'Bonne après-midi ! Un voyage vous attend 🌤️',
        'Bonne après-midi ! Trouvez votre prochain trajet 🌤️',
      ],
      evening: [
        'Bonsoir ! Un trajet de prévu ce soir ? 🌙',
        'Bonsoir ! Planifiez votre voyage en toute tranquillité 🌙',
        'Bonsoir ! Prêt pour une aventure nocturne ? 🌙',
        'Bonsoir ! Réservez votre place avant qu\'il ne soit trop tard 🌙',
      ],
      night: [
        'Bonne nuit ! Planifiez votre voyage pour demain 🌙',
        'Bonne nuit ! Préparez votre prochaine escapade 🌙',
        'Bonne nuit ! Votre prochain voyage commence ici 🌙',
        'Bonne nuit ! Réservez maintenant, voyagez demain 🌙',
      ],
    },
    en: {
      morning: [
        'Good morning! Ready for your next trip? ☀️',
        'Good morning! A great day to travel 🌅',
        'Good morning! Where are you headed today? ☀️',
        'Good morning! Your next destination awaits 🚌',
      ],
      afternoon: [
        'Good afternoon! Where are we taking you today? 🌤️',
        'Good afternoon! Ready to hit the road? 🌤️',
        'Good afternoon! A trip is waiting for you 🚍',
        'Good afternoon! Find your next journey 🎒',
      ],
      evening: [
        'Good evening! Got a ride planned tonight? 🌆',
        'Good evening! Plan your trip in peace 🌆',
        'Good evening! Ready for a night adventure? 🌙',
        'Good evening! Book your seat before it\'s too late 🎫',
      ],
      night: [
        'Good night! Plan your journey for tomorrow 🌙',
        'Good night! Prepare your next getaway 🌟',
        'Good night! Your next trip starts here 🌙',
        'Good night! Book now, travel tomorrow 🌠',
      ],
    },
  };

  const [greetingIndex] = useState(() => Math.floor(Math.random() * 4));

  const pickGreeting = (lang: 'fr' | 'en') => {
    const set = GREETINGS[lang];
    const idx = greetingIndex;
    if (hour >= 5 && hour < 12) return set.morning[idx];
    if (hour >= 12 && hour < 18) return set.afternoon[idx];
    if (hour >= 18 && hour < 22) return set.evening[idx];
    return set.night[idx];
  };

  const t = {
    fr: {
      greeting: pickGreeting('fr'),
      routeLabel: (from: string, to: string) => `De ${from} vers ${to}`,
      historyRoute: (from: string, to: string) => `De ${from} vers ${to}`,
      tagline: 'Voyagez en toute confiance',
      searchTitle: 'Rechercher un voyage',
      departurePlaceholder: 'Départ',
      arrivalPlaceholder: 'Arrivée',
      datePlaceholder: 'Date de départ',
      passengersLabel: (n: number) => `${n} passager${n > 1 ? 's' : ''}`,
      searchBtn: 'Rechercher',
      popularTrips: 'Voyages populaires',
      partnerAgencies: 'Agences partenaires',
      nearbyStations: 'Gares à proximité',
      promotions: 'Promotions du moment',
      seeAll: 'Voir tout',
      seeAllFemale: 'Voir toutes',
      seats: (n: number) => `${n} siège${n > 1 ? 's' : ''}`,
      agenciesCount: (n: number) => `${n} agence${n > 1 ? 's' : ''}`,
      recentSearches: 'Recherches récentes',
      clearHistory: 'Effacer',
      noTrips: 'Aucun voyage disponible',
      noAgencies: 'Aucune agence disponible',
      noGares: 'Aucune gare disponible',
      promoTitle: '-20% sur vos voyages',
      promoDesc: 'Utilisez le code',
      promoValidity: "Valable jusqu'au 30 août 2026",
    },
    en: {
      greeting: pickGreeting('en'),
      routeLabel: (from: string, to: string) => `From ${from} to ${to}`,
      historyRoute: (from: string, to: string) => `From ${from} to ${to}`,
      tagline: 'Travel with confidence',
      searchTitle: 'Search a trip',
      departurePlaceholder: 'Departure',
      arrivalPlaceholder: 'Arrival',
      datePlaceholder: 'Departure date',
      passengersLabel: (n: number) => `${n} passenger${n > 1 ? 's' : ''}`,
      searchBtn: 'Search',
      popularTrips: 'Popular trips',
      partnerAgencies: 'Partner agencies',
      nearbyStations: 'Nearby stations',
      promotions: 'Current promotions',
      seeAll: 'See all',
      seeAllFemale: 'See all',
      seats: (n: number) => `${n} seat${n > 1 ? 's' : ''}`,
      agenciesCount: (n: number) => `${n} agenc${n > 1 ? 'ies' : 'y'}`,
      recentSearches: 'Recent searches',
      clearHistory: 'Clear',
      noTrips: 'No trips available',
      noAgencies: 'No agencies available',
      noGares: 'No stations available',
      promoTitle: '20% off your trips',
      promoDesc: 'Use the code',
      promoValidity: 'Valid until August 30, 2026',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [userRaw, tokenRaw, storedLang, historyRaw] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('search_history_trips'),
      ]);

      if (historyRaw) setSearchHistory(JSON.parse(historyRaw));

      if (userRaw) setUser(JSON.parse(userRaw));
      if (storedLang === 'en' || storedLang === 'fr') setLang(storedLang);

      const token = tokenRaw || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [tripsRes, agenciesRes, garesRes] = await Promise.allSettled([
        fetch(`${API_URL}/voyage?page=0&size=6`, { headers }),
        fetch(`${API_URL}/agence`, { headers }),
        fetch(`${API_URL}/gare`, { headers }),
      ]);

      if (tripsRes.status === 'fulfilled' && tripsRes.value.ok) {
        const data = await tripsRes.value.json();
        const now = new Date();
        setTrips(
          (data.content || [])
            .filter((t: Trip) => t.statusVoyage === 'PUBLIE' && new Date(t.dateDepartPrev) > now)
            .slice(0, 6),
        );
      }
      if (agenciesRes.status === 'fulfilled' && agenciesRes.value.ok) {
        const data = await agenciesRes.value.json();
        setAgencies((data.content || data || []).slice(0, 5));
      }
      if (garesRes.status === 'fulfilled' && garesRes.value.ok) {
        const data = await garesRes.value.json(); 
        setGares((data.content || data || []).slice(0, 4));
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const swapLocations = () => {
    setDeparture(arrival);
    setArrival(departure);
  };

  const saveSearch = async () => {
    if (!departure.trim() && !arrival.trim()) return;
    const entry = { departure, arrival, date };
    const updated = [
      entry,
      ...searchHistory.filter(
        h => h.departure !== departure || h.arrival !== arrival,
      ),
    ].slice(0, 5);
    setSearchHistory(updated);
    await AsyncStorage.setItem('search_history_trips', JSON.stringify(updated));
  };

  const clearHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem('search_history_trips');
  };

  const applyHistoryEntry = (entry: {
    departure: string;
    arrival: string;
    date: string;
  }) => {
    setDeparture(entry.departure);
    setArrival(entry.arrival);
    setDate(entry.date);
  };

  const SectionHeader = ({
    title,
    onPress,
    feminine = false,
  }: {
    title: string;
    onPress?: () => void;
    feminine?: boolean;
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
        {title}
      </Text>
      <TouchableOpacity onPress={onPress} style={styles.seeAllBtn}>
        <Text style={[styles.seeAllText, { color: colors.primary }]}>
          {feminine ? t.seeAllFemale : t.seeAll}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const TripCard = ({ item }: { item: Trip }) => {
    const classColor = CLASS_COLORS[item.nomClasseVoyage] || colors.primary;
    const visibleAmenities = item.amenities?.slice(0, 4) || [];
    const extraCount = Math.max(0, (item.amenities?.length || 0) - 4);

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TripDetail', { tripId: item.idVoyage })}
      >
        {/* Image */}
        <View
          style={[
            styles.tripImageContainer,
            { backgroundColor: classColor + '18' },
          ]}
        >
          {item.smallImage
            ? <Image source={{ uri: item.smallImage }} style={styles.tripImage} resizeMode="cover" />
            : <TripPlaceholder width="100%" height="100%" />}
          <View style={[styles.classBadge, { backgroundColor: classColor }]}>
            <Text style={styles.classBadgeText}>{item.nomClasseVoyage}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.tripContent}>
          <Text
            style={[styles.tripRoute, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {t.routeLabel(item.lieuDepart, item.lieuArrive)}
          </Text>

          <View style={styles.tripMeta}>
            <View style={styles.tripMetaItem}>
              <Ionicons name="calendar-outline" size={11} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}
                {new Date(item.dateDepartPrev).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <View style={styles.tripMetaItem}>
              <Ionicons name="time-outline" size={11} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}
                {formatDuration(item.dureeVoyage)}
              </Text>
            </View>
          </View>
          <View style={[styles.tripMetaItem, { marginBottom: spacing.sm }]}>
            <Ionicons name="people-outline" size={11} color={theme.text} />
            <Text style={[styles.tripMetaText, { color: theme.text }]}>
              {' '}
              {t.seats(item.nbrPlaceRestante)}
            </Text>
          </View>

          <View style={styles.amenitiesRow}>
            {visibleAmenities.map(a => (
              <Ionicons
                key={a}
                name={AMENITY_ICONS[a] || 'ellipse-outline'}
                size={13}
                color={theme.text}
                style={{ marginRight: 4 }}
              />
            ))}
            {extraCount > 0 && (
              <Text style={[styles.extraCount, { color: theme.text }]}>
                +{extraCount}
              </Text>
            )}
          </View>

          <View style={[styles.tripFooter, { borderTopColor: theme.border }]}>
            <Text
              style={[styles.agencyName, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.nomAgence || '—'}
            </Text>
            <Text style={[styles.tripPrice, { color: colors.primary }]}>
              {formatPrice(item.prix)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const AgencyCard = ({ item }: { item: Agency }) => {
    return (
      <TouchableOpacity
        style={[
          styles.agencyCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AgencyDetail', { agencyId: item.id })}
      >
        <View
          style={[
            styles.agencyLogoContainer,
            { backgroundColor: theme.backgroundAlt },
          ]}
        >
          {item.logoUrl && !item.logoUrl.toLowerCase().includes('placeholder')
            ? <Image source={{ uri: item.logoUrl }} style={{ width: 64, height: 64 }} resizeMode="cover" />
            : <AgencyPlaceholder width={64} height={64} />}
        </View>
        <Text
          style={[styles.agencyCardName, { color: theme.textStrong }]}
          numberOfLines={2}
        >
          {item.longName}
        </Text>
        {!!item.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={[styles.ratingText, { color: theme.text }]}>
              {' '}
              {item.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const GareCard = ({ item }: { item: Gare }) => {
    const visibleServices = item.services?.slice(0, 4) || [];

    return (
      <TouchableOpacity
        style={[
          styles.gareCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StationDetail', { stationId: item.idGareRoutiere })}
      >
        <View
          style={[
            styles.gareImageContainer,
            { backgroundColor: theme.backgroundAlt },
          ]}
        >
          {item.photoUrl
            ? <Image source={{ uri: item.photoUrl }} style={styles.gareImage} resizeMode="cover" />
            : <StationPlaceholder width="100%" height="100%" />}
        </View>
        <View style={styles.gareContent}>
          <Text
            style={[styles.gareName, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {item.nomGareRoutiere}
          </Text>
          <View style={styles.gareLocationRow}>
            <Ionicons name="location-outline" size={11} color={theme.text} />
            <Text
              style={[styles.gareLocation, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.ville}
              {item.quartier ? `, ${item.quartier}` : ''}
            </Text>
          </View>
          <View style={styles.gareServicesRow}>
            {visibleServices.map(s => (
              <Ionicons
                key={s}
                name={SERVICE_ICONS[s] || 'ellipse-outline'}
                size={12}
                color={theme.text}
                style={{ marginRight: 4 }}
              />
            ))}
          </View>
          {item.nbreAgence != null && item.nbreAgence > 0 && (
            <View
              style={[
                styles.gareBadge,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Text style={[styles.gareBadgeText, { color: colors.primary }]}>
                {t.agenciesCount(item.nbreAgence)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <SkeletonHome />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.backgroundAlt }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {/* Avatar + Name */}
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: theme.backgroundAlt }]}>
              <AvatarPlaceholder width="100%" height="100%" />
            </View>
            <Text
              style={[styles.userName, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {user ? user.first_name : '---'}
            </Text>
          </View>

          {/* Logo */}
          <View style={styles.headerCenter}>
            <Image
              source={require('../../../../assets/images/busstation_bleu.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          {/* Hamburger */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.hamburgerBtn}
            >
              <Ionicons
                name="menu-outline"
                size={26}
                color={theme.textStrong}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greetingBanner}>
          <Text style={[styles.greetingBannerText, { color: theme.textStrong }]}>
            {t.greeting}
          </Text>
        </View>

        {/* ── Search Card ── */}
        <View
          style={[
            styles.searchCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.searchCardTitle, { color: theme.textStrong }]}>
            {t.searchTitle}
          </Text>

          {/* Departure + Arrival */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchField,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  flex: 1,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.primary}
              />
              <TextInput
                style={[styles.searchFieldText, { color: theme.textStrong }]}
                placeholder={t.departurePlaceholder}
                placeholderTextColor={theme.text}
                value={departure}
                onChangeText={setDeparture}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.swapBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              onPress={swapLocations}
            >
              <Ionicons
                name="swap-vertical-outline"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.searchField,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  flex: 1,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.primary}
              />
              <TextInput
                style={[styles.searchFieldText, { color: theme.textStrong }]}
                placeholder={t.arrivalPlaceholder}
                placeholderTextColor={theme.text}
                value={arrival}
                onChangeText={setArrival}
              />
            </View>
          </View>

          {/* Date + Passengers */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={[
                styles.searchField,
                {
                  borderColor: date ? colors.primary : theme.border,
                  backgroundColor: theme.backgroundAlt,
                  flex: 1,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color={date ? colors.primary : colors.primary}
              />
              <Text
                style={[
                  styles.searchFieldText,
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

            <View
              style={[
                styles.searchField,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                  flex: 1,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={15}
                color={colors.primary}
              />
              <TouchableOpacity
                onPress={() => setPassengers(Math.max(1, passengers - 1))}
              >
                <Ionicons name="remove-outline" size={15} color={theme.text} />
              </TouchableOpacity>
              <Text
                style={[styles.passengersText, { color: theme.textStrong }]}
              >
                {t.passengersLabel(passengers)}
              </Text>
              <TouchableOpacity onPress={() => setPassengers(passengers + 1)}>
                <Ionicons name="add-outline" size={15} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search button */}
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              saveSearch();
              navigation.navigate('TripsList', {
                filters: {
                  departure,
                  arrival,
                  date,
                  classes: [],
                  amenities: [],
                },
              });
            }}
          >
            <Text style={styles.searchBtnText}>{t.searchBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search History ── */}
        {searchHistory.length > 0 && (
          <View
            style={[
              styles.historyCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderLeft}>
                <Ionicons name="time-outline" size={15} color={theme.text} />
                <Text
                  style={[styles.historyTitle, { color: theme.textStrong }]}
                >
                  {t.recentSearches}
                </Text>
              </View>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={[styles.historyClear, { color: colors.primary }]}>
                  {t.clearHistory}
                </Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((entry, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.historyItem,
                  { borderTopColor: theme.border },
                  index === 0 && { borderTopWidth: 0 },
                ]}
                onPress={() => applyHistoryEntry(entry)}
              >
                <Ionicons
                  name="search-outline"
                  size={14}
                  color={theme.text}
                  style={{ marginRight: spacing.sm }}
                />
                <Text
                  style={[styles.historyItemText, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {t.historyRoute(entry.departure || '—', entry.arrival || '—')}
                  {entry.date ? ` · ${entry.date}` : ''}
                </Text>
                <Ionicons
                  name="arrow-up-outline"
                  size={14}
                  color={theme.text}
                  style={{ transform: [{ rotate: '45deg' }] }}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Popular Trips ── */}
        <SectionHeader
          title={t.popularTrips}
          onPress={() => navigation.navigate('TripsList', {})}
        />
        <FlatList
          horizontal
          data={trips}
          keyExtractor={item => item.idVoyage}
          renderItem={({ item }) => <TripCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          }
        />

        {/* ── Partner Agencies ── */}
        <SectionHeader title={t.partnerAgencies} />
        <FlatList
          horizontal
          data={agencies}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AgencyCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={
            <EmptyState
              type="result"
              message={t.noAgencies}
              textColor={theme.text}
            />
          }
        />

        {/* ── Nearby Stations ── */}
        <SectionHeader title={t.nearbyStations} feminine />
        <FlatList
          horizontal
          data={gares}
          keyExtractor={item => item.idGareRoutiere}
          renderItem={({ item }) => <GareCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={
            <EmptyState
              type="result"
              message={t.noGares}
              textColor={theme.text}
            />
          }
        />

        {/* ── Promotions ── */}
        <SectionHeader title={t.promotions} feminine />
        <View
          style={[
            styles.promoCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <View
            style={[
              styles.promoBadge,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Ionicons
              name="pricetag-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.promoContent}>
            <Text style={[styles.promoTitle, { color: colors.primary }]}>
              {t.promoTitle}
            </Text>
            <Text style={[styles.promoDesc, { color: theme.text }]}>
              {t.promoDesc}{' '}
              <Text
                style={[
                  styles.promoCode,
                  { color: colors.primary, borderColor: colors.primary },
                ]}
              >
                SUMMER20
              </Text>
            </Text>
            <Text style={[styles.promoValidity, { color: theme.text }]}>
              {t.promoValidity}
            </Text>
          </View>
          <Ionicons name="bus" size={52} color={`${colors.primary}20`} />
        </View>
      </ScrollView>

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
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  greetingText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  greetingBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  greetingBannerText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  greetingTagline: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  greetingLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  greetingName: {
    ...typography.heading,
    fontSize: 28,
    letterSpacing: 0.3,
  },
  userName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 120,
    height: 48,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hamburgerBtn: {
    padding: spacing.xs,
  },
  appName: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    letterSpacing: 0.5,
  },
  appTagline: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  notifBtn: {
    flex: 1,
    alignItems: 'flex-end',
    position: 'relative',
  },
  notifBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
    right: 0,
  },

  // Search Card
  searchCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  searchCardTitle: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  searchFieldText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengersText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginHorizontal: spacing.xs,
  },
  searchBtn: {
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  searchBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: typography.sizes.md,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.lg,
  },

  // Trip Card
  tripCard: {
    width: 185,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tripImageContainer: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tripImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  classBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tripContent: {
    padding: spacing.sm,
  },
  tripRoute: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tripMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripMetaText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  extraCount: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  agencyName: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  tripPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },

  // Agency Card
  agencyCard: {
    width: 110,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    alignItems: 'center',
  },
  agencyLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  agencyLogo: {
    width: '100%',
    height: '100%',
  },
  agencyInitial: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },
  agencyCardName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },

  // Gare Card
  gareCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gareImageContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gareImage: {
    width: '100%',
    height: '100%',
  },
  gareContent: {
    padding: spacing.sm,
  },
  gareName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  gareLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: 2,
  },
  gareLocation: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  gareServicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gareBadge: {
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  gareBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },

  // Search History
  historyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  historyClear: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  historyItemText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },

  // Promo Card
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  promoBadge: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  promoTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  promoDesc: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  promoCode: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
  },
  promoValidity: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
});
