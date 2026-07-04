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
import { EmptyState } from '../../../../components/empty-state';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';
import StationPlaceholder from '../../../../assets/placeholders/building.svg';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';

type User = {
  first_name: string;
  last_name: string;
  userId?: string;
  id?: string;
};

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  photoUrl?: string;
  horaires?: string;
  services?: string[];
  nbreAgence: number | null;
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
  heureDepartEffectif?: string;
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

const GREETINGS = {
  fr: {
    morning: [
      'Bonjour ! Bonne journée de gestion ☀️',
      'Bonjour ! La gare vous attend ☀️',
      'Bonjour ! Prêt à gérer votre gare ? ☀️',
      'Bon matin ! Tout est sous contrôle ☀️',
    ],
    afternoon: [
      "Bonne après-midi ! Comment avance la gare ? 🌤️",
      "Bonne après-midi ! Gardez l'œil sur les voyages 🌤️",
      "Bonne après-midi ! Les agences comptent sur vous 🌤️",
      "Bonne après-midi ! Excellent travail jusqu'ici 🌤️",
    ],
    evening: [
      'Bonsoir ! Une bonne journée de gestion ? 🌙',
      'Bonsoir ! La gare tourne bien ce soir 🌙',
      'Bonsoir ! Encore quelques voyages à surveiller 🌙',
      'Bonsoir ! Merci pour votre travail 🌙',
    ],
    night: [
      'Bonne nuit ! Reposez-vous bien 🌙',
      'Bonne nuit ! La gare sera là demain 🌙',
      'Bonne nuit ! Préparez-vous pour demain 🌙',
      'Bonne nuit ! Excellent travail aujourd\'hui 🌙',
    ],
  },
  en: {
    morning: [
      'Good morning! Have a great day managing your station ☀️',
      'Good morning! The station is waiting for you ☀️',
      'Good morning! Ready to manage your station? ☀️',
      'Good morning! Everything is under control ☀️',
    ],
    afternoon: [
      'Good afternoon! How is the station doing? 🌤️',
      'Good afternoon! Keep an eye on the trips 🌤️',
      'Good afternoon! Agencies are counting on you 🌤️',
      'Good afternoon! Excellent work so far 🌤️',
    ],
    evening: [
      'Good evening! A good day of management? 🌙',
      'Good evening! The station is running well tonight 🌙',
      'Good evening! A few more trips to monitor 🌙',
      'Good evening! Thank you for your work 🌙',
    ],
    night: [
      'Good night! Rest well 🌙',
      'Good night! The station will be there tomorrow 🌙',
      'Good night! Get ready for tomorrow 🌙',
      'Good night! Excellent work today 🌙',
    ],
  },
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

  const [user, setUser] = useState<User | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const [greetingIndex] = useState(() => Math.floor(Math.random() * 4));
  const greeting = (() => {
    const set = GREETINGS[lang];
    const idx = greetingIndex;
    if (hour >= 5 && hour < 12) return set.morning[idx];
    if (hour >= 12 && hour < 18) return set.afternoon[idx];
    if (hour >= 18 && hour < 22) return set.evening[idx];
    return set.night[idx];
  })();

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
      noAgencies: 'Aucune agence affiliée',
      noTrips: 'Aucun voyage récent',
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
      noAgencies: 'No affiliated agencies',
      noTrips: 'No recent trips',
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

      const parsed = userRaw ? JSON.parse(userRaw) : null;
      if (parsed) setUser(parsed);
      const managerId = parsed?.userId || parsed?.id;
      if (!managerId) return;

      const headers = { Authorization: `Bearer ${token}` };

      const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers,
      });
      if (!stationRes.ok) return;
      const stationData = await stationRes.json();
      setStation(stationData);

      const stationId = stationData.idGareRoutiere;

      const agenciesRes = await fetch(
        `${API_URL}/gare/${stationId}/agences`,
        { headers },
      );
      let agenciesList: Agency[] = [];
      if (agenciesRes.ok) {
        const data = await agenciesRes.json();
        agenciesList = data.content || data || [];
        setAgencies(agenciesList);
      }

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
          <View style={[styles.headerAvatar, { backgroundColor: theme.backgroundAlt }]}>
            <AvatarPlaceholder width="100%" height="100%" />
          </View>
          <Text style={[styles.userName, { color: theme.textStrong }]} numberOfLines={1}>
            {user ? user.first_name : '---'}
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
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.hamburgerBtn}>
            <Ionicons name="menu-outline" size={26} color={theme.textStrong} />
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
        {/* Greeting */}
        <View style={styles.greetingBanner}>
          <Text style={[styles.greetingBannerText, { color: theme.textStrong }]}>
            {greeting}
          </Text>
        </View>

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
            {station?.photoUrl ? (
              <Image
                source={{ uri: station.photoUrl }}
                style={styles.stationImageInner}
                resizeMode="cover"
              />
            ) : (
              <StationPlaceholder width="100%" height="100%" />
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
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Text style={[styles.openBadgeText, { color: colors.success }]}>
                  {t.open}
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
            {station?.services && station.services.length > 0 && (
              <View style={styles.stationServicesRow}>
                {station.services.slice(0, 5).map(s => (
                  <Ionicons
                    key={s}
                    name={SERVICE_ICONS[s] || 'ellipse-outline'}
                    size={13}
                    color={theme.text}
                    style={{ marginRight: 4 }}
                  />
                ))}
              </View>
            )}
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
              value={String(station?.nbreAgence ?? agencies.length)}
              label={t.affiliatedAgencies}
              sublabel={t.total}
            />
            <KPICard
              icon="bus-outline"
              iconBg="#fef3c715"
              iconColor="#d97706"
              value={String(tripsThisMonth)}
              label={t.tripsThisMonth}
            />
            <KPICard
              icon="document-text-outline"
              iconBg={`${colors.error}15`}
              iconColor={colors.error}
              value={String(overdueTaxes)}
              label={t.overdueTaxes}
              sublabel={overdueTaxes > 0 ? t.toRegularize : undefined}
            />
            <KPICard
              icon="pie-chart-outline"
              iconBg={`${colors.success}15`}
              iconColor={colors.success}
              value={occupationRate > 0 ? `${occupationRate}%` : '—'}
              label={t.occupationRate}
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
            <TouchableOpacity onPress={() => navigation.navigate('agencies' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {agencies.length === 0 && (
            <EmptyState type="result" message={t.noAgencies} textColor={theme.text} />
          )}
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
                  {agency.logoUrl && !agency.logoUrl.toLowerCase().includes('placeholder') ? (
                    <Image
                      source={{ uri: agency.logoUrl }}
                      style={styles.agencyLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <AgencyPlaceholder width={40} height={40} />
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
            <TouchableOpacity onPress={() => navigation.navigate('agencies' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {trips.length === 0 && (
            <EmptyState type="result" message={t.noTrips} textColor={theme.text} />
          )}
          {trips.slice(0, 3).map(trip => (
            <View
              key={trip.idVoyage}
              style={[styles.tripRow, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.tripHour, { color: theme.textStrong }]}>
                {trip.heureDepartEffectif || ''}
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
  userName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerLogo: { width: 120, height: 48 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  hamburgerBtn: { padding: spacing.xs },
  greetingBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  greetingBannerText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },

  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
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
  stationServicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
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
