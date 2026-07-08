import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Share,
  Linking,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonStationDetail } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import BannerPlaceholder from '../../../../assets/placeholders/building.svg';

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  description?: string;
  photoUrl?: string | null;
  services: string[];
  horaires?: string | null;
  nbreAgence: number | null;
  nomPresident?: string | null;
  localisation?: string | null;
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
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const t = {
    fr: {
      title: 'Détails de la gare',
      about: 'À propos',
      services: 'Services disponibles',
      noServices: 'Aucun service renseigné',
      affiliatedAgencies: 'Agences affiliées',
      president: 'Président',
      open: 'Ouverte',
      errorTitle: 'Impossible de charger la gare',
      errorSub: 'Vérifiez votre connexion et réessayez.',
      retry: 'Réessayer',
    },
    en: {
      title: 'Station details',
      about: 'About',
      services: 'Available services',
      noServices: 'No services listed',
      affiliatedAgencies: 'Affiliated agencies',
      president: 'President',
      open: 'Open',
      errorTitle: 'Unable to load station',
      errorSub: 'Check your connection and try again.',
      retry: 'Retry',
    },
  }[lang];

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (!managerId) { setError(true); return; }

      const headers = { Authorization: `Bearer ${token}` };
      let stationBasic: Station | null = null;

      const managerRes = await fetch(`${API_URL}/gare/manager/${managerId}`, { headers });
      if (managerRes.ok) {
        stationBasic = await managerRes.json();
      } else {
        const cached = await getCache(`bsm_station_detail_${managerId}`);
        if (cached) {
          setStation(cached);
          setIsOffline(true);
          return;
        }
        setError(true);
        return;
      }

      if (!stationBasic) { setError(true); return; }

      const stationId = stationBasic.idGareRoutiere;
      const detailRes = await fetch(`${API_URL}/gare/${stationId}`, { headers });
      if (detailRes.ok) {
        const detail: Station = await detailRes.json();
        console.log('Station detail:', detail);
        await setCache(`bsm_station_detail_${stationId}`, detail);
        setStation(detail);
        setIsOffline(false);
      } else {
        const cached = await getCache(`bsm_station_detail_${stationId}`);
        if (cached) {
          setStation(cached);
          setIsOffline(true);
        } else {
          setStation(stationBasic);
        }
      }
    } catch {
      const userRaw = await AsyncStorage.getItem('user').catch(() => null);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (managerId) {
        const cached = await getCache(`bsm_station_detail_${managerId}`);
        if (cached) {
          setStation(cached);
          setIsOffline(true);
          return;
        }
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleShare = async () => {
    if (!station) return;
    try {
      await Share.share({
        message: `🚌 ${station.nomGareRoutiere}\n📍 ${station.ville}${
          station.quartier ? `, ${station.quartier}` : ''
        }${station.horaires ? `\n🕐 ${station.horaires}` : ''}`,
        title: station.nomGareRoutiere,
      });
    } catch {
      // silent
    }
  };

  if (loading) return <SkeletonStationDetail />;

  /* ── Error / empty state ── */
  if (error || !station) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <EmptyState type="result" message={t.errorTitle} textColor={theme.text} />
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); loadData(); }}
          >
            <Text style={styles.retryText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
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

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
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
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              <BannerPlaceholder width="100%" height="100%" />
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
              {' '}{station.ville}
              {station.quartier ? `, ${station.quartier}` : ''}
            </Text>
          </View>

          {station.nomPresident && (
            <View style={styles.locationRow}>
              <Ionicons name="person-outline" size={14} color={theme.text} />
              <Text style={[styles.locationText, { color: theme.text }]}>
                {' '}{t.president} : {station.nomPresident}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.openBadge, { backgroundColor: `${colors.success}15` }]}>
              <Text style={[styles.openBadgeText, { color: colors.success }]}>
                {t.open}
              </Text>
            </View>
            {station.horaires ? (
              <View style={styles.hoursRow}>
                <Ionicons name="time-outline" size={13} color={theme.text} />
                <Text style={[styles.hoursText, { color: theme.text }]}>
                  {' '}{station.horaires}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* About */}
        {station.description ? (
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
        ) : null}

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
          {station.services.length === 0 ? (
            <View style={styles.emptyServices}>
              <Ionicons name="apps-outline" size={32} color={theme.border} />
              <Text style={[styles.emptyServicesText, { color: theme.text }]}>
                {t.noServices}
              </Text>
            </View>
          ) : (
            <View style={styles.servicesGrid}>
              {station.services.map(s => (
                <View
                  key={s}
                  style={[
                    styles.serviceItem,
                    { backgroundColor: theme.backgroundAlt, borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name={SERVICE_ICONS[s] || 'ellipse-outline'}
                    size={22}
                    color={theme.textStrong}
                  />
                  <Text style={[styles.serviceLabel, { color: theme.textStrong }]}>
                    {lang === 'fr' ? SERVICE_LABELS[s]?.fr : SERVICE_LABELS[s]?.en}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Address */}
        {station.adresse ? (
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
            <Ionicons name="location-outline" size={18} color={colors.primary} />
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
        ) : null}

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
    marginBottom: spacing.xs,
  },
  locationText: { ...typography.body, fontSize: typography.sizes.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  openBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
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
  description: { ...typography.body, fontSize: typography.sizes.sm, lineHeight: 22 },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceItem: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    gap: spacing.xs,
  },
  serviceLabel: { ...typography.body, fontSize: typography.sizes.xs, textAlign: 'center' },

  emptyServices: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyServicesText: { ...typography.body, fontSize: typography.sizes.sm },

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

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  retryText: { ...typography.bodyBold, fontSize: typography.sizes.md, color: '#fff' },
});
