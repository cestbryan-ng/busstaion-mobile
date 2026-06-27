import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL, MAPS_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  description?: string;
  photoUrl?: string;
  services: string[];
  nbreAgence: number;
  ratingAverage?: number;
  numberOfReviews?: number;
  horaires?: Record<string, string>;
  contact?: { phone?: string; email?: string };
};

type Agency = {
  agencyId: string;
  longName: string;
  location: string;
  photoUrl?: string;
  ratingAverage?: number;
  numberOfReviews?: number;
  description?: string;
};

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepart: string;
  class: string;
  amenities: string[];
  prix: number;
  seatsAvailable: number;
  agencyName?: string;
};

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-checkmark-outline',
};

const SERVICE_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  PARKING: { fr: 'Parking', en: 'Parking' },
  RESTAURATION: { fr: 'Restauration', en: 'Dining' },
  SALLE_ATTENTE: { fr: 'Salle attente', en: 'Waiting' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  SECURITE: { fr: 'Sécurité', en: 'Security' },
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};

const DAY_LABELS: Record<string, { fr: string; en: string }> = {
  lundi: { fr: 'Lundi - Vendredi', en: 'Mon - Fri' },
  samedi: { fr: 'Samedi', en: 'Saturday' },
  dimanche: { fr: 'Dimanche', en: 'Sunday' },
};

export default function StationDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
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

  useEffect(() => {
    const load = async () => {
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

        if (gareRes.ok) setGare(await gareRes.json());
        if (agenciesRes.ok) {
          const data = await agenciesRes.json();
          setAgencies(data.content || data || []);
        }
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
  }, [stationId]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!gare) return null;

  // Build schedules (deduplicate)
  const scheduleGroups: { label: string; hours: string }[] = [];
  if (gare.horaires) {
    const h = gare.horaires;
    // Weekdays
    if (h.lundi)
      scheduleGroups.push({
        label: lang === 'fr' ? 'Lundi - Vendredi' : 'Mon - Fri',
        hours: h.lundi,
      });
    if (h.samedi)
      scheduleGroups.push({
        label: lang === 'fr' ? 'Samedi' : 'Saturday',
        hours: h.samedi,
      });
    if (h.dimanche)
      scheduleGroups.push({
        label: lang === 'fr' ? 'Dimanche' : 'Sunday',
        hours: h.dimanche,
      });
  }

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <View style={[styles.banner, { backgroundColor: theme.backgroundAlt }]}>
          {gare.photoUrl ? (
            <Image
              source={{ uri: gare.photoUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.bannerPlaceholder,
                { backgroundColor: `${colors.primary}10` },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={56}
                color={colors.primary}
              />
            </View>
          )}
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

          {gare.ratingAverage !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={[styles.ratingText, { color: theme.textStrong }]}>
                {' '}
                {gare.ratingAverage.toFixed(1)} (
                {t.reviews(gare.numberOfReviews || 0)})
              </Text>
              <Text style={[styles.separator, { color: theme.text }]}> | </Text>
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
        {scheduleGroups.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.schedulesTitle}
            </Text>
            {scheduleGroups.map((sg, i) => (
              <View
                key={i}
                style={[
                  styles.scheduleRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                ]}
              >
                <Text style={[styles.scheduleDay, { color: theme.textStrong }]}>
                  {sg.label}
                </Text>
                <Text style={[styles.scheduleHours, { color: theme.text }]}>
                  {sg.hours.replace('-', ' - ')}
                </Text>
              </View>
            ))}
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
                  key={a.agencyId}
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
                      agencyId: a.agencyId,
                    })
                  }
                >
                  <View
                    style={[
                      styles.agencyLogo,
                      { backgroundColor: theme.backgroundAlt },
                    ]}
                  >
                    {a.photoUrl ? (
                      <Image
                        source={{ uri: a.photoUrl }}
                        style={styles.agencyLogoImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.agencyLogoLetter,
                          { color: colors.primary },
                        ]}
                      >
                        {a.longName.charAt(0).toUpperCase()}
                      </Text>
                    )}
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
                    {a.ratingAverage !== undefined && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={11} color="#f59e0b" />
                        <Text
                          style={[styles.ratingText, { color: theme.text }]}
                        >
                          {' '}
                          {a.ratingAverage.toFixed(1)} (
                          {t.reviews(a.numberOfReviews || 0)})
                        </Text>
                      </View>
                    )}
                    {a.description && (
                      <Text
                        style={[styles.agencyDesc, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {a.description}
                      </Text>
                    )}
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
              const classColor = CLASS_COLORS[trip.class] || colors.primary;
              return (
                <TouchableOpacity
                  key={trip.idVoyage}
                  style={[
                    styles.tripCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('TripDetail', { tripId: trip.idVoyage })
                  }
                >
                  <View style={styles.tripRow}>
                    <Text
                      style={[styles.tripRoute, { color: theme.textStrong }]}
                      numberOfLines={1}
                    >
                      {trip.lieuDepart} → {trip.lieuArrive}
                    </Text>
                    <View
                      style={[
                        styles.classBadge,
                        { backgroundColor: classColor },
                      ]}
                    >
                      <Text style={styles.classBadgeText}>{trip.class}</Text>
                    </View>
                  </View>
                  <View style={styles.tripMeta}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={theme.text}
                    />
                    <Text style={[styles.tripMetaText, { color: theme.text }]}>
                      {' '}
                      {new Date(trip.dateDepartPrev).toLocaleDateString(
                        lang === 'fr' ? 'fr-FR' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}{' '}
                      · {trip.heureDepart}
                    </Text>
                  </View>
                  {trip.agencyName && (
                    <Text style={[styles.tripAgency, { color: theme.text }]}>
                      {trip.agencyName}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.tripFooter,
                      { borderTopColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.seatsText, { color: colors.primary }]}>
                      {t.seats(trip.seatsAvailable)}
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

        {/* Map button */}
        <View style={styles.mapBtnContainer}>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (gare.adresse) {
                Linking.openURL(
                  `${MAPS_URL}?q=${encodeURIComponent(
                    `${gare.nomGareRoutiere} ${gare.adresse}`,
                  )}`,
                );
              }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
