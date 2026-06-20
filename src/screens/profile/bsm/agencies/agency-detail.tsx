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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  bannerUrl?: string;
  location: string;
  description?: string;
  rating?: number;
  numberOfReviews?: number;
  specialties?: string[];
  contact?: { email?: string; phone?: string; website?: string };
  taxStatus?: 'payé' | 'en attente' | 'en retard';
  totalTrips?: number;
  totalPassengers?: number;
  gareCount?: number;
  partnerSince?: number;
};

const TAX_STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  payé: {
    label: 'Taxe payée',
    labelEn: 'Tax paid',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  'en attente': {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c715',
  },
  'en retard': {
    label: 'En retard',
    labelEn: 'Overdue',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

export default function AgencyDetailBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyDetailBsm'>>();
  const { agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  const t = {
    fr: {
      title: 'Détails agence',
      reviews: (n: number) => `(${n} avis)`,
      publishedTrips: 'Voyages publiés',
      passengersTransported: 'Passagers transportés',
      stationsServed: 'Gares desservies',
      partnerSince: 'Partenaire depuis',
      years: 'ans',
      specialties: 'Spécialités',
      seeTrips: "Voir les voyages de l'agence",
    },
    en: {
      title: 'Agency details',
      reviews: (n: number) => `(${n} reviews)`,
      publishedTrips: 'Published trips',
      passengersTransported: 'Passengers transported',
      stationsServed: 'Stations served',
      partnerSince: 'Partner since',
      years: 'years',
      specialties: 'Specialties',
      seeTrips: "View agency's trips",
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

        const res = await fetch(`${API_URL}/agence/${agencyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAgency(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agencyId]);

  const handleShare = async () => {
    if (!agency) return;
    try {
      await Share.share({
        message: `🏢 ${agency.longName}\n📍 ${agency.location}\n📞 ${
          agency.contact?.phone || ''
        }`,
        title: agency.longName,
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

  if (!agency) return null;

  const statusCfg =
    TAX_STATUS_CONFIG[agency.taxStatus || 'payé'] || TAX_STATUS_CONFIG['payé'];

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
          {agency.bannerUrl ? (
            <Image
              source={{ uri: agency.bannerUrl }}
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
              <Ionicons name="bus-outline" size={48} color={colors.primary} />
            </View>
          )}
          {/* Logo overlay */}
          <View
            style={[
              styles.logoOverlay,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {agency.logoUrl ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.logoLetter, { color: colors.primary }]}>
                {agency.longName.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {/* Info */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {agency.longName}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>

          {agency.rating !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={[styles.ratingValue, { color: theme.textStrong }]}>
                {' '}
                {agency.rating.toFixed(1)}
              </Text>
              <Text style={[styles.ratingCount, { color: theme.text }]}>
                {' '}
                {t.reviews(agency.numberOfReviews || 0)}
              </Text>
            </View>
          )}

          {agency.description && (
            <Text style={[styles.description, { color: theme.text }]}>
              {agency.description}
            </Text>
          )}

          {/* Contact actions */}
          <View style={[styles.contactList, { borderTopColor: theme.border }]}>
            {agency.contact?.phone && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: theme.border }]}
                onPress={() => Linking.openURL(`tel:${agency.contact?.phone}`)}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={theme.textStrong}
                />
                <Text style={[styles.contactText, { color: theme.textStrong }]}>
                  {agency.contact.phone}
                </Text>
                <View
                  style={[
                    styles.contactIconBtn,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            )}
            {agency.contact?.email && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: theme.border }]}
                onPress={() =>
                  Linking.openURL(`mailto:${agency.contact?.email}`)
                }
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.textStrong}
                />
                <Text style={[styles.contactText, { color: theme.textStrong }]}>
                  {agency.contact.email}
                </Text>
                <View
                  style={[
                    styles.contactIconBtn,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            )}
            {agency.contact?.website && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() =>
                  Linking.openURL(`https://${agency.contact?.website}`)
                }
              >
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={theme.textStrong}
                />
                <Text style={[styles.contactText, { color: theme.textStrong }]}>
                  {agency.contact.website}
                </Text>
                <View
                  style={[
                    styles.contactIconBtn,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Ionicons
                    name="open-outline"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <View style={[styles.locationRow, { borderTopColor: theme.border }]}>
            <Ionicons name="location-outline" size={16} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {agency.location}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Ionicons name="bag-outline" size={20} color={theme.text} />
            <Text style={[styles.statValue, { color: theme.textStrong }]}>
              {agency.totalTrips ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.publishedTrips}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Ionicons name="people-outline" size={20} color={theme.text} />
            <Text style={[styles.statValue, { color: theme.textStrong }]}>
              {(agency.totalPassengers ?? 0).toLocaleString('fr-FR')}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.passengersTransported}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Ionicons name="globe-outline" size={20} color={theme.text} />
            <Text style={[styles.statValue, { color: theme.textStrong }]}>
              {agency.gareCount ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.stationsServed}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Ionicons name="star-outline" size={20} color={theme.text} />
            <Text style={[styles.statValue, { color: theme.textStrong }]}>
              {agency.partnerSince ?? '—'} {t.years}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.partnerSince}
            </Text>
          </View>
        </View>

        {/* Specialties */}
        {agency.specialties && agency.specialties.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.specialties}
            </Text>
            <View style={styles.specialtiesRow}>
              {agency.specialties.map(s => (
                <View
                  key={s}
                  style={[
                    styles.specialtyChip,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundAlt,
                    },
                  ]}
                >
                  <Text
                    style={[styles.specialtyText, { color: theme.textStrong }]}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.error }]}
            onPress={() =>
              navigation.navigate('AgencyTripsBsm', {
                agencyId: agency.id,
                agencyName: agency.longName,
              })
            }
          >
            <Text style={styles.ctaBtnText}>{t.seeTrips}</Text>
          </TouchableOpacity>
        </View>

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

  banner: { height: 170, position: 'relative' },
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  agencyName: { ...typography.heading, fontSize: typography.sizes.xl, flex: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  ratingCount: { ...typography.body, fontSize: typography.sizes.sm },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  contactList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  contactText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  contactIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  locationText: { ...typography.body, fontSize: typography.sizes.sm },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },

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
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specialtyChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  specialtyText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  ctaContainer: { paddingHorizontal: spacing.lg },
  ctaBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
