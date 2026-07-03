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
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonAgencyDetail } from '../../../../components/skeleton';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import BannerPlaceholder from '../../../../assets/placeholders/image.svg';

type Agency = {
  id: string;
  longName: string;
  location: string;
  logoUrl?: string;
  description?: string;
  rating?: number;
  contact?: { phone?: string; email?: string; website?: string };
};

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  dureeVoyage: string | number;
  nomClasseVoyage: string;
  amenities: string[];
  prix: number;
  nbrPlaceRestante: number;
  smallImage?: string;
  statusVoyage?: string;
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};

function getClassColor(nomClasse: string): string {
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

const AMENITY_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  AC: 'snow-outline',
  USB: 'phone-portrait-outline',
  COMFORTABLE_SEATS: 'ribbon-outline',
  LUGGAGE_STORAGE: 'briefcase-outline',
  POWER_OUTLETS: 'flash-outline',
  ENTERTAINMENT: 'tv-outline',
  MEAL_SERVICE: 'restaurant-outline',
  PRISES: 'flash-outline',
  SNACKS: 'fast-food-outline',
  BOISSONS: 'cafe-outline',
  BEVERAGES: 'cafe-outline',
};

export default function AgencyDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyDetail'>>();
  const { agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détails agence',
      call: 'Appeler',
      email: 'Email',
      website: 'Site web',
      itinerary: 'Itinéraire',
      tripsTitle: 'Voyages disponibles',
      seats: (n: number) =>
        `${n} siège${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
      reviews: (n: number) => `${n} avis`,
      affiliatedGares: (n: number) => `${n} gares affiliées`,
      totalTrips: (n: number) => `${n}+\nVoyages publiés`,
      rating: 'Note moyenne',
      clients: (n: number) => `${n}+\nClients satisfaits`,
      noTrips: 'Aucun voyage disponible',
    },
    en: {
      title: 'Agency details',
      call: 'Call',
      email: 'Email',
      website: 'Website',
      itinerary: 'Itinerary',
      tripsTitle: 'Available trips',
      seats: (n: number) => `${n} seat${n > 1 ? 's' : ''} available`,
      reviews: (n: number) => `${n} reviews`,
      affiliatedGares: (n: number) => `${n} affiliated stations`,
      totalTrips: (n: number) => `${n}+\nPublished trips`,
      rating: 'Average rating',
      clients: (n: number) => `${n}+\nSatisfied clients`,
      noTrips: 'No trips available',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const [agencyRes, tripsRes] = await Promise.all([
        fetch(`${API_URL}/agence/${agencyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/voyage/agence/${agencyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (agencyRes.ok) {
        const agencyData = await agencyRes.json();
        setAgency(agencyData);
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips((data.content || data || []).filter((t: Trip) => t.statusVoyage === 'PUBLIE'));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) return <SkeletonAgencyDetail />;

  if (!agency) return null;

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

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: theme.backgroundAlt }]}>
          <View
            style={[
              styles.bannerPlaceholder,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            <BannerPlaceholder width="100%" height="100%" />
          </View>
          {/* Logo overlay */}
          <View
            style={[
              styles.logoOverlay,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {agency.logoUrl && !agency.logoUrl.toLowerCase().includes('placeholder') ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <AgencyPlaceholder width="100%" height="100%" />
            )}
          </View>
        </View>

        {/* Agency Info */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.agencyName, { color: theme.textStrong }]}>
            {agency.longName}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {agency.location}
            </Text>
          </View>

          {!!agency.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={[styles.ratingText, { color: theme.textStrong }]}>
                {' '}{agency.rating.toFixed(1)}
              </Text>
            </View>
          )}

          {agency.description && (
            <Text style={[styles.description, { color: theme.text }]}>
              {agency.description}
            </Text>
          )}

          {/* Action buttons */}
          <View style={[styles.actionButtons, { borderTopColor: theme.border }]}>
            {agency.contact?.phone && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border }]}
                onPress={() => Linking.openURL(`tel:${agency.contact?.phone}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: theme.textStrong }]}>{t.call}</Text>
              </TouchableOpacity>
            )}
            {agency.contact?.email && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border }]}
                onPress={() => Linking.openURL(`mailto:${agency.contact?.email}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: theme.textStrong }]}>{t.email}</Text>
              </TouchableOpacity>
            )}
            {agency.contact?.website && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border }]}
                onPress={() => Linking.openURL(`https://${agency.contact?.website}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: theme.textStrong }]}>{t.website}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(agency.location)}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: theme.textStrong }]}>{t.itinerary}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {!!agency.rating && (
          <View
            style={[
              styles.statsRow,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={[styles.statItem, { backgroundColor: '#fef9c308' }]}>
              <Ionicons name="star" size={22} color="#f59e0b" />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {agency.rating?.toFixed(1) || '—'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.rating}
              </Text>
            </View>
          </View>
        )}

        {/* Trips */}
        <View style={styles.tripsSection}>
          <Text style={[styles.tripsTitle, { color: theme.textStrong }]}>
            {t.tripsTitle}
          </Text>

          {trips.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noTrips}
              textColor={theme.text}
            />
          ) : (
            trips.map(trip => {
              const visibleAmenities = trip.amenities?.slice(0, 4) || [];
              const extra = Math.max(0, (trip.amenities?.length || 0) - 4);

              const cardClassColor = getClassColor(trip.nomClasseVoyage);
              return (
                <TouchableOpacity
                  key={trip.idVoyage}
                  style={[
                    styles.tripCard,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.idVoyage })}
                >
                  {/* Image + badge */}
                  <View style={[styles.tripImageContainer, { backgroundColor: theme.backgroundAlt }]}>
                    {trip.smallImage
                      ? <Image source={{ uri: trip.smallImage }} style={styles.tripImage} resizeMode="cover" />
                      : <TripPlaceholder width="100%" height="100%" />}
                    <View style={[styles.classBadge, { backgroundColor: cardClassColor }]}>
                      <Text style={styles.classBadgeText}>{trip.nomClasseVoyage}</Text>
                    </View>
                  </View>

                  {/* Route */}
                  <Text style={[styles.tripRoute, { color: theme.textStrong }]}>
                    {lang === 'fr'
                      ? `De ${trip.lieuDepart} vers ${trip.lieuArrive}`
                      : `From ${trip.lieuDepart} to ${trip.lieuArrive}`}
                  </Text>

                  {/* Meta : date · durée */}
                  <View style={styles.tripMeta}>
                    <Ionicons name="calendar-outline" size={12} color={theme.text} />
                    <Text style={[styles.tripMetaText, { color: theme.text }]}>
                      {' '}{new Date(trip.dateDepartPrev).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </Text>
                    <Text style={[styles.tripMetaText, { color: theme.text }]}> · </Text>
                    <Ionicons name="time-outline" size={12} color={theme.text} />
                    <Text style={[styles.tripMetaText, { color: theme.text }]}>
                      {' '}{formatDuration(trip.dureeVoyage)}
                    </Text>
                  </View>

                  {/* Amenities */}
                  <View style={styles.amenitiesRow}>
                    {visibleAmenities.map(a => (
                      <Ionicons
                        key={a}
                        name={AMENITY_ICONS[a] || 'ellipse-outline'}
                        size={14}
                        color={theme.text}
                        style={{ marginRight: 4 }}
                      />
                    ))}
                    {extra > 0 && (
                      <Text style={[styles.extraText, { color: theme.text }]}>+{extra}</Text>
                    )}
                  </View>

                  {/* Footer */}
                  <View style={[styles.tripFooter, { borderTopColor: theme.border }]}>
                    <Text style={[styles.seatsText, { color: theme.text }]}>
                      {t.seats(trip.nbrPlaceRestante)}
                    </Text>
                    <Text style={[styles.tripPrice, { color: colors.primary }]}>
                      {trip.prix.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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

  banner: { height: 180, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: -28,
    left: spacing.lg,
    width: 72,
    height: 72,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: { ...typography.heading, fontSize: typography.sizes.xxl },

  infoSection: {
    marginTop: 36,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  agencyName: {
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
    marginBottom: spacing.md,
  },
  ratingText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  separator: { ...typography.body, fontSize: typography.sizes.sm },
  affiliatedText: { ...typography.body, fontSize: typography.sizes.sm },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionBtnText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  statDivider: { width: 1 },
  statValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },

  tripsSection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  tripsTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  tripCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tripTop: {
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
  amenitiesRow: { flexDirection: 'row', alignItems: 'center' },
  extraText: { ...typography.body, fontSize: typography.sizes.xs },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  seatsText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.md },
  tripImageContainer: { height: 120, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs },
  tripImage: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
