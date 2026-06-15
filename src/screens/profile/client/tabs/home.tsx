import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { RootStackParamList } from '../../../../navigation';

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  statusVoyage: string;
  class: string;
  amenities: string[];
  prix: number;
  durationHours: number;
  seatsAvailable: number;
  photoUrl?: string;
  nomAgence?: string;
};

type Agency = {
  agencyId: string;
  longName: string;
  location?: string;
  photoUrl?: string;
  ratingAverage?: number;
};

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  services: string[];
  nbreAgence: number;
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
};

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-checkmark-outline',
};

function formatDuration(hours: number): string {
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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [gares, setGares] = useState<Gare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);

  const t = {
    fr: {
      greeting: 'Bonjour',
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
      noTrips: 'Aucun voyage disponible',
      noAgencies: 'Aucune agence disponible',
      noGares: 'Aucune gare disponible',
    },
    en: {
      greeting: 'Hello',
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
      noTrips: 'No trips available',
      noAgencies: 'No agencies available',
      noGares: 'No stations available',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [userRaw, tokenRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);

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
        setTrips(
          (data.content || [])
            .filter((t: Trip) => t.statusVoyage === 'PUBLIE')
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
    const classColor = CLASS_COLORS[item.class] || colors.primary;
    const visibleAmenities = item.amenities?.slice(0, 4) || [];
    const extraCount = Math.max(0, (item.amenities?.length || 0) - 4);

    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
      >
        {/* Image */}
        <View
          style={[
            styles.tripImageContainer,
            { backgroundColor: classColor + '18' },
          ]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.tripImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="bus-outline" size={36} color={classColor} />
          )}
          <View style={[styles.classBadge, { backgroundColor: classColor }]}>
            <Text style={styles.classBadgeText}>{item.class}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.tripContent}>
          <Text
            style={[styles.tripRoute, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {item.lieuDepart} → {item.lieuArrive}
          </Text>

          <View style={styles.tripMeta}>
            <View style={styles.tripMetaItem}>
              <Ionicons name="time-outline" size={11} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}
                {formatDuration(item.durationHours)}
              </Text>
            </View>
            <View style={styles.tripMetaItem}>
              <Ionicons name="people-outline" size={11} color={theme.text} />
              <Text style={[styles.tripMetaText, { color: theme.text }]}>
                {' '}
                {t.seats(item.seatsAvailable)}
              </Text>
            </View>
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

  const AgencyCard = ({ item }: { item: Agency }) => (
    <TouchableOpacity
      style={[
        styles.agencyCard,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.agencyLogoContainer,
          { backgroundColor: theme.backgroundAlt },
        ]}
      >
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.agencyLogo}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.agencyInitial, { color: colors.primary }]}>
            {item.longName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text
        style={[styles.agencyCardName, { color: theme.textStrong }]}
        numberOfLines={2}
      >
        {item.longName}
      </Text>
      {item.ratingAverage !== undefined && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color="#f59e0b" />
          <Text style={[styles.ratingText, { color: theme.text }]}>
            {' '}
            {item.ratingAverage.toFixed(1)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const GareCard = ({ item }: { item: Gare }) => {
    const visibleServices = item.services?.slice(0, 4) || [];

    return (
      <TouchableOpacity
        style={[
          styles.gareCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.gareImageContainer,
            { backgroundColor: theme.backgroundAlt },
          ]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.gareImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="business-outline" size={28} color={theme.text} />
          )}
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
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={{ backgroundColor: theme.backgroundAlt }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          {/* Greeting */}
          <View style={styles.headerLeft}>
            <Text style={[styles.greetingText, { color: theme.text }]}>
              {t.greeting}
            </Text>
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
              source={require('../../../assets/images/busstation_bleu.png')}
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
                name="calendar-outline"
                size={15}
                color={colors.primary}
              />
              <TextInput
                style={[styles.searchFieldText, { color: theme.textStrong }]}
                placeholder={t.datePlaceholder}
                placeholderTextColor={theme.text}
                value={date}
                onChangeText={setDate}
              />
            </View>

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
            onPress={() =>
              navigation.navigate('TripsList', {
                filters: {
                  departure,
                  arrival,
                  date,
                  classes: [],
                  amenities: [],
                },
              })
            }
          >
            <Text style={styles.searchBtnText}>{t.searchBtn}</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t.noTrips}
            </Text>
          }
        />

        {/* ── Partner Agencies ── */}
        <SectionHeader title={t.partnerAgencies} />
        <FlatList
          horizontal
          data={agencies}
          keyExtractor={item => item.agencyId}
          renderItem={({ item }) => <AgencyCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t.noAgencies}
            </Text>
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
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t.noGares}
            </Text>
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
              -20% sur vos voyages
            </Text>
            <Text style={[styles.promoDesc, { color: theme.text }]}>
              Utilisez le code{' '}
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
              Valable jusqu'au 30 juin 2026
            </Text>
          </View>
          <Ionicons name="bus" size={52} color={`${colors.primary}20`} />
        </View>
      </ScrollView>
    </>
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
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
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
