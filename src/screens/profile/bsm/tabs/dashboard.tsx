import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonDashboard } from '../../../../components/skeleton';

type Station = {
  id: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  imageUrl?: string;
  estOuvert: boolean;
  horaires?: string;
  nbAgencesAffiliees: number;
};

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  rating?: number;
  taxStatus?: 'payé' | 'en attente' | 'en retard';
};

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  heureDepart: string;
  nomClasseVoyage?: string;
  nbrPlaceRestante?: number;
  prix: number;
  agencyId: string;
};

type BsmDashboardProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
};

const TAX_STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  payé: {
    label: 'À jour',
    labelEn: 'Up to date',
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

export default function BsmDashboard({
  drawerOpen,
  setDrawerOpen,
  lang,
  setLang,
}: BsmDashboardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [station, setStation] = useState<Station | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Accueil',
      open: 'Ouverte',
      closed: 'Fermée',
      keyIndicators: 'Indicateurs clés',
      affiliatedAgencies: 'Agences affiliées',
      total: 'Total',
      tripsThisMonth: 'Voyages ce mois',
      vsLastMonth: 'vs mois dernier',
      overdueTaxes: 'Taxes en retard',
      toRegularize: 'À régulariser',
      occupationRate: "Taux d'occupation",
      vsYesterday: 'vs hier',
      affiliatedAgenciesSection: 'Agences affiliées',
      seeAll: 'Voir tout',
      recentTrips: 'Voyages récents',
      seats: 'places restantes',
    },
    en: {
      title: 'Home',
      open: 'Open',
      closed: 'Closed',
      keyIndicators: 'Key indicators',
      affiliatedAgencies: 'Affiliated agencies',
      total: 'Total',
      tripsThisMonth: 'Trips this month',
      vsLastMonth: 'vs last month',
      overdueTaxes: 'Overdue taxes',
      toRegularize: 'To settle',
      occupationRate: 'Occupancy rate',
      vsYesterday: 'vs yesterday',
      affiliatedAgenciesSection: 'Affiliated agencies',
      seeAll: 'See all',
      recentTrips: 'Recent trips',
      seats: 'seats left',
    },
  }[lang];

  const loadData = useCallback(async () => {
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

      const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers,
      });
      if (!stationRes.ok) return;
      const stationData = await stationRes.json();
      setStation(stationData);

      const stationId = stationData.id;

      const agenciesRes = await fetch(
        `${API_URL}/agence/gare-routiere/${stationId}`,
        { headers },
      );
      let agenciesList: Agency[] = [];
      if (agenciesRes.ok) {
        const data = await agenciesRes.json();
        agenciesList = data.content || data || [];
        setAgencies(agenciesList);
      }

      // Load trips from first few agencies
      const tripPromises = agenciesList
        .slice(0, 5)
        .map(a =>
          fetch(`${API_URL}/voyage/agence/${a.id}`, { headers }).then(r =>
            r.ok ? r.json() : null,
          ),
        );
      const tripResults = await Promise.allSettled(tripPromises);
      const allTrips: Trip[] = [];
      tripResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          allTrips.push(...(r.value.content || r.value || []));
        }
      });
      setTrips(allTrips.slice(0, 5));
    } catch {
      // silent
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

  const overdueTaxes = agencies.filter(a => a.taxStatus === 'en retard').length;
  const tripsThisMonth = trips.length;
  const occupationRate =
    trips.length > 0
      ? Math.round(
          trips.reduce(
            (sum, t) =>
              sum +
              (t.nbrPlaceRestante ? Math.max(0, 100 - t.nbrPlaceRestante) : 0),
            0,
          ) / trips.length,
        )
      : 0;

  const KPICard = ({
    icon,
    iconBg,
    iconColor,
    value,
    label,
    sublabel,
    growth,
  }: {
    icon: string;
    iconBg: string;
    iconColor: string;
    value: string;
    label: string;
    sublabel?: string;
    growth?: string;
  }) => (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.textStrong }]}>
        {value}
      </Text>
      <Text style={[styles.kpiLabel, { color: theme.text }]}>{label}</Text>
      {sublabel && (
        <Text style={[styles.kpiSublabel, { color: theme.text }]}>
          {sublabel}
        </Text>
      )}
      {growth && (
        <View style={styles.kpiGrowth}>
          <Ionicons name="trending-up" size={11} color={colors.success} />
          <Text style={[styles.kpiGrowthText, { color: colors.success }]}>
            {' '}
            {growth}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <SkeletonDashboard />;
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
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
        </View>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../../../assets/images/busstation_bleu.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)}>
            <View
              style={[
                styles.avatarBtn,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              {station?.imageUrl ? (
                <Image
                  source={{ uri: station.imageUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-outline" size={18} color={theme.text} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Station card */}
        <TouchableOpacity
          style={[
            styles.stationCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
          onPress={() => navigation.navigate('StationDetailBsm')}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.stationImage,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            {station?.imageUrl ? (
              <Image
                source={{ uri: station.imageUrl }}
                style={styles.stationImageInner}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="business-outline" size={36} color={theme.text} />
            )}
          </View>
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: theme.textStrong }]}>
              {station?.nomGareRoutiere || '—'}
            </Text>
            <View style={styles.stationLocationRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.stationLocation, { color: theme.text }]}>
                {' '}
                {station?.ville}
                {station?.quartier ? `, ${station.quartier}` : ''}
              </Text>
            </View>
            <View style={styles.stationMetaRow}>
              <View
                style={[
                  styles.openBadge,
                  {
                    backgroundColor: station?.estOuvert
                      ? `${colors.success}15`
                      : `${colors.error}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.openBadgeText,
                    {
                      color: station?.estOuvert ? colors.success : colors.error,
                    },
                  ]}
                >
                  {station?.estOuvert ? t.open : t.closed}
                </Text>
              </View>
              {station?.horaires && (
                <View style={styles.hoursRow}>
                  <Ionicons name="time-outline" size={12} color={theme.text} />
                  <Text style={[styles.hoursText, { color: theme.text }]}>
                    {' '}
                    {station.horaires}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </TouchableOpacity>

        {/* KPI Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.keyIndicators}
          </Text>
          <View style={styles.kpiGrid}>
            <KPICard
              icon="business-outline"
              iconBg={`${colors.primary}15`}
              iconColor={colors.primary}
              value={String(station?.nbAgencesAffiliees || agencies.length)}
              label={t.affiliatedAgencies}
              sublabel={t.total}
            />
            <KPICard
              icon="bus-outline"
              iconBg="#fef3c715"
              iconColor="#d97706"
              value={String(tripsThisMonth)}
              label={t.tripsThisMonth}
              growth="+12%"
            />
            <KPICard
              icon="document-text-outline"
              iconBg={`${colors.error}15`}
              iconColor={colors.error}
              value={String(overdueTaxes)}
              label={t.overdueTaxes}
              sublabel={t.toRegularize}
            />
            <KPICard
              icon="pie-chart-outline"
              iconBg={`${colors.success}15`}
              iconColor={colors.success}
              value={`${occupationRate || 87}%`}
              label={t.occupationRate}
              growth="+8%"
            />
          </View>
        </View>

        {/* Affiliated agencies */}
        <View
          style={[
            styles.listSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.affiliatedAgenciesSection}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.error }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {agencies.slice(0, 3).map((agency, i) => {
            const statusCfg =
              TAX_STATUS_CONFIG[agency.taxStatus || 'payé'] ||
              TAX_STATUS_CONFIG['payé'];
            return (
              <View
                key={agency.id}
                style={[styles.agencyRow, { borderBottomColor: theme.border }]}
              >
                <View
                  style={[
                    styles.agencyLogo,
                    { backgroundColor: theme.backgroundAlt },
                  ]}
                >
                  {agency.logoUrl ? (
                    <Image
                      source={{ uri: agency.logoUrl }}
                      style={styles.agencyLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text
                      style={[styles.agencyLogoText, { color: colors.primary }]}
                    >
                      {agency.longName.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.agencyInfo}>
                  <Text
                    style={[styles.agencyName, { color: theme.textStrong }]}
                  >
                    {agency.longName}
                  </Text>
                  {agency.rating !== undefined && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={11} color="#f59e0b" />
                      <Text style={[styles.ratingText, { color: theme.text }]}>
                        {' '}
                        {agency.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusCfg.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent trips */}
        <View
          style={[
            styles.listSection,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.recentTrips}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.error }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {trips.slice(0, 3).map(trip => (
            <View
              key={trip.idVoyage}
              style={[styles.tripRow, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.tripHour, { color: theme.textStrong }]}>
                {trip.heureDepart}
              </Text>
              <View style={styles.tripInfo}>
                <View style={styles.tripRouteRow}>
                  <Text
                    style={[styles.tripRoute, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {trip.lieuDepart} → {trip.lieuArrive}
                  </Text>
                  {trip.nomClasseVoyage && (
                    <Text style={[styles.tripClass, { color: theme.text }]}>
                      {' '}
                      · {trip.nomClasseVoyage}
                    </Text>
                  )}
                </View>
                {trip.nbrPlaceRestante !== undefined && (
                  <Text style={[styles.tripSeats, { color: theme.text }]}>
                    {trip.nbrPlaceRestante} {t.seats}
                  </Text>
                )}
              </View>
              <Text style={[styles.tripPrice, { color: colors.error }]}>
                {trip.prix.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          ))}
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
  headerLeft: { flex: 1 },
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLogo: { width: 110, height: 40 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },

  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  stationImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stationImageInner: { width: '100%', height: '100%' },
  stationInfo: { flex: 1 },
  stationName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  stationLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stationLocation: { ...typography.body, fontSize: typography.sizes.xs },
  stationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  openBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  hoursRow: { flexDirection: 'row', alignItems: 'center' },
  hoursText: { ...typography.body, fontSize: typography.sizes.xs },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpiCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiValue: { ...typography.heading, fontSize: typography.sizes.xl },
  kpiLabel: { ...typography.body, fontSize: typography.sizes.xs },
  kpiSublabel: { ...typography.body, fontSize: 10 },
  kpiGrowth: { flexDirection: 'row', alignItems: 'center' },
  kpiGrowthText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  listSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  tripHour: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    width: 44,
  },
  tripInfo: { flex: 1 },
  tripRouteRow: { flexDirection: 'row', alignItems: 'center' },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  tripClass: { ...typography.body, fontSize: typography.sizes.xs },
  tripSeats: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
