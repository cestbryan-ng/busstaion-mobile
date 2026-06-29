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
  Share,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  description?: string;
  photoUrl?: string;
  services: string[];
  horaires?: Record<string, string>;
  nbreAgence: number;
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

export default function StationDetailBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);

  const t = {
    fr: {
      title: 'Détails de la gare',
      about: 'À propos',
      services: 'Services disponibles',
      affiliatedAgencies: 'Agences affiliées',
      operationalDocks: 'Quais opérationnels',
      activeCounters: 'Guichets actifs',
      parkingSpots: 'Places de parking',
      occupationRate: "Taux d'occupation",
      open: 'Ouverte',
      closed: 'Fermée',
    },
    en: {
      title: 'Station details',
      about: 'About',
      services: 'Available services',
      affiliatedAgencies: 'Affiliated agencies',
      operationalDocks: 'Operational docks',
      activeCounters: 'Active counters',
      parkingSpots: 'Parking spots',
      occupationRate: 'Occupancy rate',
      open: 'Open',
      closed: 'Closed',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const [token, userRaw, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const user = userRaw ? JSON.parse(userRaw) : null;
        const managerId = user?.userId || user?.id;
        if (!managerId) return;

        const headers = { Authorization: `Bearer ${token}` };
        const managerRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
          headers,
        });
        if (!managerRes.ok) return;
        const stationBasic = await managerRes.json();

        const res = await fetch(`${API_URL}/gare/${stationBasic.idGareRoutiere}`, {
          headers,
        });
        if (res.ok) setStation(await res.json());
        else setStation(stationBasic);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleShare = async () => {
    if (!station) return;
    try {
      await Share.share({
        message: `🚌 ${station.nomGareRoutiere}\n📍 ${station.ville}${
          station.quartier ? `, ${station.quartier}` : ''
        }\n🕐 ${station.horaires || ''}`,
        title: station.nomGareRoutiere,
      });
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!station) return null;

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
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: theme.backgroundAlt }]}>
          {station.photoUrl ? (
            <Image
              source={{ uri: station.photoUrl }}
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

        {/* Info */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stationName, { color: theme.textStrong }]}>
            {station.nomGareRoutiere}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {station.ville}
              {station.quartier ? `, ${station.quartier}` : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.openBadge,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <Text
                style={[styles.openBadgeText, { color: colors.success }]}
              >
                {t.open}
              </Text>
            </View>
            {station.horaires && Object.keys(station.horaires).length > 0 && (
              <View style={styles.hoursRow}>
                <Ionicons name="time-outline" size={13} color={theme.text} />
                <Text style={[styles.hoursText, { color: theme.text }]}>
                  {' '}
                  {Object.entries(station.horaires)[0]?.join(': ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* About */}
        {station.description && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.about}
            </Text>
            <Text style={[styles.description, { color: theme.text }]}>
              {station.description}
            </Text>
          </View>
        )}

        {/* Services */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.services}
          </Text>
          <View style={styles.servicesGrid}>
            {station.services.map(s => (
              <View
                key={s}
                style={[
                  styles.serviceItem,
                  {
                    backgroundColor: theme.backgroundAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={SERVICE_ICONS[s] || 'ellipse-outline'}
                  size={22}
                  color={theme.textStrong}
                />
                <Text
                  style={[styles.serviceLabel, { color: theme.textStrong }]}
                >
                  {lang === 'fr'
                    ? SERVICE_LABELS[s]?.fr
                    : SERVICE_LABELS[s]?.en}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Infrastructure stats */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              marginBottom: spacing.md,
            },
          ]}
        >
          {[
            { label: t.affiliatedAgencies, value: station.nbreAgence },
            { label: t.operationalDocks, value: 12 },
            { label: t.activeCounters, value: 8 },
            { label: t.parkingSpots, value: 120 },
            { label: t.occupationRate, value: '87%' },
          ].map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.statRow,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Address */}
        {station.adresse && (
          <TouchableOpacity
            style={[
              styles.addressRow,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(
                  `${station.nomGareRoutiere} ${station.adresse}`,
                )}`,
              )
            }
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.primary}
            />
            <View style={styles.addressInfo}>
              <Text style={[styles.addressText, { color: theme.textStrong }]}>
                {station.adresse}
              </Text>
              <Text style={[styles.addressCity, { color: theme.text }]}>
                {station.ville}, Cameroun
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        )}

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
  stationName: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationText: { ...typography.body, fontSize: typography.sizes.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  openBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  openBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  hoursRow: { flexDirection: 'row', alignItems: 'center' },
  hoursText: { ...typography.body, fontSize: typography.sizes.sm },

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
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceItem: {
    width: '30%',
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

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statLabel: { ...typography.body, fontSize: typography.sizes.sm },
  statValue: { ...typography.bodyBold, fontSize: typography.sizes.md },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  addressInfo: { flex: 1 },
  addressText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  addressCity: { ...typography.body, fontSize: typography.sizes.xs },
});
