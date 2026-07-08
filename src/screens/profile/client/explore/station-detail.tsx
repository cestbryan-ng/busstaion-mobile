import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Linking,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL, MAPS_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonStationDetail } from '../../../../components/skeleton';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import BannerPlaceholder from '../../../../assets/placeholders/building.svg';

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  services: string[];
  nbreAgence: number | null;
  horaires?: string | null;
  contact?: { phone?: string; email?: string };
  localisation?: { latitude: number; longitude: number } | null;
};

type Agency = {
  idAgenceVoyage: string;
  longName: string;
  shortName?: string;
  location: string;
};

type Trip = {
  idVoyage: string;
  lieuDepart: string | null;
  lieuArrive: string | null;
  dateDepartPrev: string | null;
  nomClasseVoyage: string | null;
  dureeVoyage: string | number;
  amenities: string[];
  prix: number;
  nbrPlaceRestante: number;
  nomAgence?: string | null;
  smallImage?: string | null;
  statusVoyage?: string;
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

const SERVICE_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  PARKING: { fr: 'Parking', en: 'Parking' },
  RESTAURATION: { fr: 'Restauration', en: 'Dining' },
  SALLE_ATTENTE: { fr: 'Salle attente', en: 'Waiting' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  SECURITE: { fr: 'Sécurité', en: 'Security' },
  CLIMATISATION: { fr: 'Climatisation', en: 'A/C' },
  CONSIGNE: { fr: 'Consigne', en: 'Luggage' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  BILLETTERIE_ELECTRONIQUE: { fr: 'Billetterie', en: 'E-Ticketing' },
  INFIRMERIE: { fr: 'Infirmerie', en: 'Medical' },
  BOUTIQUES: { fr: 'Boutiques', en: 'Shops' },
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};

function getClassColor(nomClasse: string | null): string {
  if (!nomClasse) return colors.primary;
  const upper = nomClasse.toUpperCase();
  if (upper.includes('VIP')) return CLASS_COLORS.VIP;
  if (upper.includes('PREMIUM')) return CLASS_COLORS.PREMIUM;
  if (upper.includes('STANDARD') || upper.includes('CLASSIQUE')) return CLASS_COLORS.STANDARD;
  return CLASS_COLORS.ECONOMY;
}

function parseDuration(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const m = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0');
}

function formatDuration(raw: string | number): string {
  const mins = parseDuration(raw);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function StationDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StationDetail'>>();
  const { stationId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [gare, setGare] = useState<Gare | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agencies' | 'trips'>('agencies');
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détails gare',
      reviews: (n: number) => `${n} avis`,
      agencies: (n: number) =>
        `${n} agence${n > 1 ? 's' : ''} affiliée${n > 1 ? 's' : ''}`,
      servicesTitle: 'Services disponibles',
      schedulesTitle: "Horaires d'ouverture",
      tabAgencies: 'Agences affiliées',
      tabTrips: 'Départs',
      seeOnMap: 'Voir sur la carte',
      noAgencies: 'Aucune agence',
      noTrips: 'Aucun départ',
      seats: (n: number) => `${n} siège${n > 1 ? 's' : ''}`,
    },
    en: {
      title: 'Station details',
      reviews: (n: number) => `${n} review${n > 1 ? 's' : ''}`,
      agencies: (n: number) => `${n} affiliated agenc${n > 1 ? 'ies' : 'y'}`,
      servicesTitle: 'Available services',
      schedulesTitle: 'Opening hours',
      tabAgencies: 'Affiliated agencies',
      tabTrips: 'Departures',
      seeOnMap: 'View on map',
      noAgencies: 'No agencies',
      noTrips: 'No departures',
      seats: (n: number) => `${n} seat${n > 1 ? 's' : ''}`,
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const [gareRes, agenciesRes, tripsRes] = await Promise.all([
        fetch(`${API_URL}/gare/${stationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/agence/gare-routiere/${stationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/voyage/gare/${stationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (gareRes.ok) {
        const data = await gareRes.json();
        setGare(data);
        setCache(`station_detail_${stationId}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(`station_detail_${stationId}`);
        if (cached) { setGare(cached); setIsOffline(true); }
      }
      if (agenciesRes.ok) {
        const data = await agenciesRes.json();
        setAgencies(data.content || data || []);
        setCache(`station_agencies_${stationId}`, data.content || data || []);
        setIsOffline(false);
      } else {
        const cached = await getCache(`station_agencies_${stationId}`);
        if (cached) { setAgencies(cached); setIsOffline(true); }
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        const now = new Date();
        const filtered = (data.content || data || []).filter((t: Trip) => t.statusVoyage === 'PUBLIE' && t.dateDepartPrev && new Date(t.dateDepartPrev) > now);
        setTrips(filtered);
        setCache(`station_trips_${stationId}`, filtered);
        setIsOffline(false);
      } else {
        const cached = await getCache(`station_trips_${stationId}`);
        if (cached) { setTrips(cached); setIsOffline(true); }
      }
    } catch {
      const [cachedGare, cachedAgencies, cachedTrips] = await Promise.all([
        getCache(`station_detail_${stationId}`),
        getCache(`station_agencies_${stationId}`),
        getCache(`station_trips_${stationId}`),
      ]);
      if (cachedGare) { setGare(cachedGare); setIsOffline(true); }
      if (cachedAgencies) { setAgencies(cachedAgencies); setIsOffline(true); }
      if (cachedTrips) { setTrips(cachedTrips); setIsOffline(true); }
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) return <SkeletonStationDetail />;

  if (!gare) return null;

  // horaires is a plain string from backend e.g. "Lun–Dim : 04h00–23h00"

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
        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? colors.error : theme.textStrong}
          />
        </TouchableOpacity>
      </View>
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={isOnline ? onRefresh : undefined} tintColor={colors.primary} />}>
        {/* Banner Image */}
        <View style={[styles.banner, { backgroundColor: theme.backgroundAlt }]}>
          {gare.photoUrl && !gare.photoUrl.toLowerCase().includes('placeholder')
            ? <Image source={{ uri: gare.photoUrl }} style={styles.bannerImage} resizeMode="cover" />
            : <View style={[styles.bannerPlaceholder, { backgroundColor: theme.backgroundAlt }]}>
                <BannerPlaceholder width="100%" height="100%" />
              </View>
          }
        </View>

        {/* Gare Info */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.gareName, { color: theme.textStrong }]}>
            {gare.nomGareRoutiere}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {gare.ville}
              {gare.quartier ? `, ${gare.quartier}` : ''}
            </Text>
          </View>

          {gare.nbreAgence != null && gare.nbreAgence > 0 && (
            <View style={styles.ratingRow}>
              <Text style={[styles.affiliatedText, { color: theme.text }]}>
                {t.agencies(gare.nbreAgence)}
              </Text>
            </View>
          )}

          {gare.description && (
            <Text style={[styles.description, { color: theme.text }]}>
              {gare.description}
            </Text>
          )}
        </View>

        {/* Services */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.servicesTitle}
          </Text>
          <View style={styles.servicesGrid}>
            {gare.services.map(s => (
              <View
                key={s}
                style={[
                  styles.serviceItem,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}30`,
                  },
                ]}
              >
                <Ionicons
                  name={SERVICE_ICONS[s] || 'ellipse-outline'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.serviceLabel, { color: colors.primary }]}>
                  {lang === 'fr'
                    ? SERVICE_LABELS[s]?.fr
                    : SERVICE_LABELS[s]?.en}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Schedules */}
        {!!gare.horaires && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.schedulesTitle}
            </Text>
            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={16} color={theme.text} />
              <Text style={[styles.scheduleHours, { color: theme.text }]}>
                {' '}{gare.horaires}
              </Text>
            </View>
          </View>
        )}

        {/* Tabs: Agencies / Trips */}
        <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'agencies' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('agencies')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'agencies' ? colors.primary : theme.text,
                },
              ]}
            >
              {t.tabAgencies}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'trips' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('trips')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'trips' ? colors.primary : theme.text },
              ]}
            >
              {t.tabTrips}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'agencies' ? (
            agencies.length === 0 ? (
              <EmptyState
                type="result"
                message={t.noAgencies}
                textColor={theme.text}
              />
            ) : (
              agencies.map(a => (
                <TouchableOpacity
                  key={a.idAgenceVoyage}
                  style={[
                    styles.agencyCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('AgencyDetail', {
                      agencyId: a.idAgenceVoyage,
                    })
                  }
                >
                  <View style={[styles.agencyLogo, { backgroundColor: theme.backgroundAlt }]}>
                    <AgencyPlaceholder width="100%" height="100%" />
                  </View>
                  <View style={styles.agencyInfo}>
                    <Text
                      style={[styles.agencyName, { color: theme.textStrong }]}
                      numberOfLines={1}
                    >
                      {a.longName}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={theme.text}
                      />
                      <Text
                        style={[styles.locationText, { color: theme.text }]}
                      >
                        {a.location}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.text}
                  />
                </TouchableOpacity>
              ))
            )
          ) : trips.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          ) : (
            trips.map(trip => {
              const classColor = getClassColor(trip.nomClasseVoyage);
              return (
                <TouchableOpacity
                  key={trip.idVoyage}
                  style={[styles.tripCard, { backgroundColor: theme.background, borderColor: theme.border }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.idVoyage })}
                >
                  <View style={styles.tripRow}>
                    <Text style={[styles.tripRoute, { color: theme.textStrong }]} numberOfLines={1}>
                      {trip.lieuDepart && trip.lieuArrive
                        ? lang === 'fr'
                          ? `De ${trip.lieuDepart} vers ${trip.lieuArrive}`
                          : `From ${trip.lieuDepart} to ${trip.lieuArrive}`
                        : '—'}
                    </Text>
                    {trip.nomClasseVoyage && (
                      <View style={[styles.classBadge, { backgroundColor: classColor }]}>
                        <Text style={styles.classBadgeText}>{trip.nomClasseVoyage}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.tripMeta}>
                    {trip.dateDepartPrev && (
                      <>
                        <Ionicons name="calendar-outline" size={12} color={theme.text} />
                        <Text style={[styles.tripMetaText, { color: theme.text }]}>
                          {' '}{new Date(trip.dateDepartPrev).toLocaleDateString(
                            lang === 'fr' ? 'fr-FR' : 'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          )}
                        </Text>
                        <Text style={[styles.tripMetaText, { color: theme.text }]}> · </Text>
                      </>
                    )}
                    <Ionicons name="time-outline" size={12} color={theme.text} />
                    <Text style={[styles.tripMetaText, { color: theme.text }]}>
                      {' '}{formatDuration(trip.dureeVoyage)}
                    </Text>
                  </View>
                  <View style={[styles.tripFooter, { borderTopColor: theme.border }]}>
                    <Text style={[styles.seatsText, { color: colors.primary }]}>
                      {t.seats(trip.nbrPlaceRestante)}
                    </Text>
                    {trip.prix > 0 && (
                      <Text style={[styles.tripPrice, { color: colors.primary }]}>
                        {trip.prix.toLocaleString('fr-FR')} FCFA
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Map button */}
        <View style={styles.mapBtnContainer}>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              const query = gare.localisation
                ? `${gare.localisation.latitude},${gare.localisation.longitude}`
                : encodeURIComponent(`${gare.nomGareRoutiere} ${gare.ville}`);
              Linking.openURL(`${MAPS_URL}?q=${query}`);
            }}
          >
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={styles.mapBtnText}>{t.seeOnMap}</Text>
          </TouchableOpacity>
        </View>
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

  banner: { height: 200 },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  gareName: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationText: { ...typography.body, fontSize: typography.sizes.sm },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  separator: { ...typography.body, fontSize: typography.sizes.sm },
  affiliatedText: { ...typography.body, fontSize: typography.sizes.sm },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceItem: {
    width: '22%',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    gap: spacing.xs,
  },
  serviceLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scheduleDay: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  scheduleHours: { ...typography.body, fontSize: typography.sizes.sm },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: spacing.lg,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  agencyLogo: {
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoLetter: { ...typography.heading, fontSize: typography.sizes.xl },
  agencyInfo: { flex: 1 },
  agencyName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: 2,
  },
  agencyDesc: { ...typography.body, fontSize: typography.sizes.xs },

  tripCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  classBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },
  tripMeta: { flexDirection: 'row', alignItems: 'center' },
  tripMetaText: { ...typography.body, fontSize: typography.sizes.xs },
  tripAgency: { ...typography.body, fontSize: typography.sizes.xs },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  seatsText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.md },

  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },

  mapBtnContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  mapBtn: {
    height: 52,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
