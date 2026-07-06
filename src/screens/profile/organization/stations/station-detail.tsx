import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  Linking,
  RefreshControl,
  Share,
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
import { SkeletonStationDetail } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import BuildingPlaceholder from '../../../../assets/placeholders/building.svg';

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  description?: string;
  services: string[];
  horaires?: string;
  photoUrl?: string;
  nomPresident?: string;
  managerId?: string;
  nbreAgence: number | null;
  open?: boolean;
  localisation?: { latitude: number; longitude: number };
};

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-outline',
  CONSIGNE: 'lock-closed-outline',
  BILLETTERIE_ELECTRONIQUE: 'card-outline',
  MOBILE_MONEY: 'phone-portrait-outline',
  CLIMATISATION: 'snow-outline',
  INFIRMERIE: 'medkit-outline',
  BOUTIQUES: 'bag-outline',
};

const SERVICE_LABELS_FR: Record<string, string> = {
  WIFI: 'WiFi',
  PARKING: 'Parking',
  RESTAURATION: 'Restauration',
  SALLE_ATTENTE: "Salle d'attente",
  TOILETTES: 'Toilettes',
  SECURITE: 'Sécurité',
  CONSIGNE: 'Consigne',
  BILLETTERIE_ELECTRONIQUE: 'Billetterie',
  MOBILE_MONEY: 'Mobile Money',
  CLIMATISATION: 'Climatisation',
  INFIRMERIE: 'Infirmerie',
  BOUTIQUES: 'Boutiques',
};

export default function OrgStationDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgStationDetail'>>();
  const { stationId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const storedLang = await AsyncStorage.getItem('app_lang');
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      const res = await fetch(`${API_URL}/gare/${stationId}`);
      if (res.ok) setStation(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [stationId]);

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
  if (!station) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
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
          {lang === 'fr' ? 'Détails de la gare' : 'Station details'}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
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
              <BuildingPlaceholder width="40%" height="70%" />
            </View>
          )}
        </View>

        {/* Info card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stationName, { color: theme.textStrong }]}>
            {station.nomGareRoutiere}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {station.ville}
              {station.quartier ? `, ${station.quartier}` : ''}
            </Text>
          </View>

          {[
            { label: 'Ville', value: station.ville },
            { label: 'Quartier', value: station.quartier },
            { label: 'Adresse', value: station.adresse },
            { label: 'Description', value: station.description },
            { label: 'Président', value: station.nomPresident },
            { label: 'Manager', value: station.managerId ? 'Assigné' : '—' },
            {
              label: 'Localisation',
              value: station.localisation
                ? `${station.localisation.latitude.toFixed(
                    4,
                  )}°N, ${station.localisation.longitude.toFixed(4)}°E`
                : undefined,
            },
            { label: 'Horaires', value: station.horaires },
          ]
            .filter(r => r.value)
            .map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  {
                    borderTopColor: theme.border,
                    borderTopWidth: i === 0 ? 1 : 1,
                    marginTop: i === 0 ? spacing.md : 0,
                  },
                ]}
              >
                <Text style={[styles.infoLabel, { color: theme.text }]}>
                  {row.label}
                </Text>
                <Text style={[styles.infoValue, { color: theme.textStrong }]}>
                  {row.value}
                </Text>
              </View>
            ))}
        </View>

        {/* Services */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {lang === 'fr' ? 'Services disponibles' : 'Available services'}
          </Text>
          {station.services.length === 0 ? (
            <EmptyState
              type="result"
              message={lang === 'fr' ? 'Aucun service renseigné' : 'No services listed'}
              textColor={theme.text}
            />
          ) : (
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
                  <Text style={[styles.serviceLabel, { color: theme.textStrong }]}>
                    {SERVICE_LABELS_FR[s] || s}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Affiliated agencies count */}
        <View
          style={[
            styles.affiliatedRow,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.affiliatedText, { color: theme.textStrong }]}>
            {lang === 'fr' ? 'Agences affiliées' : 'Affiliated agencies'}
          </Text>
          <Text style={[styles.affiliatedCount, { color: colors.primary }]}>
            {station.nbreAgence ?? '—'}
          </Text>
        </View>

        {/* Map link */}
        {station.localisation && (
          <TouchableOpacity
            style={[styles.mapBtn, { borderColor: theme.border }]}
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${station.localisation!.latitude},${
                  station.localisation!.longitude
                }`,
              )
            }
          >
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={[styles.mapBtnText, { color: colors.primary }]}>
              {lang === 'fr' ? 'Voir sur la carte' : 'View on map'}
            </Text>
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  banner: { height: 180 },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  stationName: { ...typography.heading, fontSize: typography.sizes.xl },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  locationText: { ...typography.body, fontSize: typography.sizes.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  infoValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  serviceItem: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    gap: 4,
  },
  serviceLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  affiliatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  affiliatedText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  affiliatedCount: { ...typography.heading, fontSize: typography.sizes.xl },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  mapBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
