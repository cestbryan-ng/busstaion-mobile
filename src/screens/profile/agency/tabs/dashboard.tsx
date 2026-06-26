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
  RefreshControl,
  Dimensions,
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

const { width } = Dimensions.get('window');

type Agency = {
  agencyId: string;
  longName: string;
  location: string;
  photoUrl?: string;
};

type Stats = {
  revenus: number;
  nombreReservations: number;
  nombreVoyages: number;
  nouveauxUtilisateurs: number;
};

type EvolutionPoint = { date: string; value: number };

type RecentBooking = {
  idReservation: string;
  tripTitle: string;
  customerName: string;
  status: string;
  amount: number;
  date: string;
  photoUrl?: string;
};

type AgencyDashboardProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  CONFIRMED: {
    label: 'CONFIRMÉ',
    labelEn: 'CONFIRMED',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_ATTENTE: {
    label: 'EN ATTENTE',
    labelEn: 'PENDING',
    color: '#d97706',
    bg: '#fef3c715',
  },
  CANCELLED: {
    label: 'ANNULÉ',
    labelEn: 'CANCELLED',
    color: '#6b7280',
    bg: '#6b728015',
  },
  PAID: {
    label: 'PAYÉ',
    labelEn: 'PAID',
    color: colors.success,
    bg: `${colors.success}15`,
  },
};

function formatPrice(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M FCFA`;
  if (price >= 1000) return `${(price / 1000).toFixed(0)}K FCFA`;
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

function MiniLineChart({
  data,
  color,
  width: w,
  height: h,
}: {
  data: EvolutionPoint[];
  color: string;
  width: number;
  height: number;
}) {
  if (!data.length) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartW = w - spacing.lg * 2;
  const chartH = h - 40;
  const stepX = chartW / (data.length - 1 || 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - ((d.value - min) / range) * chartH,
    value: d.value,
    date: d.date,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  // Y axis labels
  const yLabels = [max, (max + min) / 2, min].map(v =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`,
  );

  return (
    <View style={{ width: w, height: h }}>
      {/* Y axis */}
      <View style={StyleSheet.absoluteFill}>
        {yLabels.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.chartYLabel,
              { top: (chartH / 2) * i, color: '#9ca3af' },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* SVG-like lines using Views */}
      <View style={[styles.chartArea, { marginLeft: 36 }]}>
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={[
                styles.chartLine,
                {
                  left: prev.x,
                  top: prev.y,
                  width: len,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        {/* Dots */}
        {points.map((p, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.chartDot,
              {
                left: p.x - 4,
                top: p.y - 4,
                backgroundColor: color,
                borderColor: '#fff',
              },
            ]}
          />
        ))}
        {/* Last point tooltip */}
        {points.length > 0 && (
          <View
            style={[
              styles.chartTooltip,
              {
                left: points[points.length - 1].x - 40,
                top: points[points.length - 1].y - 36,
              },
            ]}
          >
            <Text style={styles.chartTooltipText}>
              {formatPrice(points[points.length - 1].value)}
            </Text>
            <Text style={styles.chartTooltipDate}>
              {new Date(data[data.length - 1].date).toLocaleDateString(
                'fr-FR',
                { day: 'numeric', month: 'short' },
              )}
            </Text>
          </View>
        )}
      </View>

      {/* X axis dates */}
      <View style={[styles.chartXAxis, { marginLeft: 36 }]}>
        {[data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
          .filter(Boolean)
          .map((d, i) => (
            <Text key={i} style={[styles.chartXLabel, { color: '#9ca3af' }]}>
              {new Date(d.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          ))}
      </View>
    </View>
  );
}

export default function AgencyDashboard({
  drawerOpen,
  setDrawerOpen,
  lang,
  setLang,
}: AgencyDashboardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evolutionPeriod, setEvolutionPeriod] = useState<'7' | '30' | '90'>(
    '7',
  );
  const [showAgencyMenu, setShowAgencyMenu] = useState(false);

  const t = {
    fr: {
      title: 'Dashboard',
      activityOverview: "Aperçu de l'activité",
      revenue: 'Revenus (mois)',
      reservations: 'Réservations',
      trips: 'Voyages publiés',
      newClients: 'Nouveaux clients',
      revenueEvolution: 'Évolution des revenus',
      last7: '7 derniers jours',
      last30: '30 derniers jours',
      last90: '90 derniers jours',
      recentBookings: 'Réservations récentes',
      seeAll: 'Voir tout',
      quickActions: 'Actions rapides',
      newTrip: 'Nouveau voyage',
      planning: 'Planning',
      myTrips: 'Mes voyages',
      resources: 'Ressources',
      newAgency: 'Nouvelle agence',
    },
    en: {
      title: 'Dashboard',
      activityOverview: 'Activity overview',
      revenue: 'Revenue (month)',
      reservations: 'Reservations',
      trips: 'Published trips',
      newClients: 'New clients',
      revenueEvolution: 'Revenue evolution',
      last7: 'Last 7 days',
      last30: 'Last 30 days',
      last90: 'Last 90 days',
      recentBookings: 'Recent bookings',
      seeAll: 'See all',
      quickActions: 'Quick actions',
      newTrip: 'New trip',
      planning: 'Planning',
      myTrips: 'My trips',
      resources: 'Resources',
      newAgency: 'New agency',
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
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const headers = { Authorization: `Bearer ${token}` };

      // Get agency first
      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers,
      });
      if (!agencyRes.ok) return;
      const agencyData = await agencyRes.json();
      setAgency(agencyData);

      const agencyId = agencyData.agencyId;

      // Parallel requests
      const [statsRes, evolutionRes, bookingsRes] = await Promise.allSettled([
        fetch(`${API_URL}/statistiques/agence/${agencyId}/general`, {
          headers,
        }),
        fetch(`${API_URL}/statistiques/agence/${agencyId}/evolution`, {
          headers,
        }),
        fetch(`${API_URL}/reservation/agence/${agencyId}`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
      if (evolutionRes.status === 'fulfilled' && evolutionRes.value.ok) {
        const data = await evolutionRes.value.json();
        setEvolution(data.data || []);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
        const data = await bookingsRes.value.json();
        setBookings((data.content || []).slice(0, 5));
      }
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

  const KPICard = ({
    icon,
    iconBg,
    iconColor,
    label,
    value,
    growth,
    growthPositive,
  }: {
    icon: string;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    growth?: string;
    growthPositive?: boolean;
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
      <Text style={[styles.kpiLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: theme.textStrong }]}>
        {value}
      </Text>
      {growth && (
        <View style={styles.kpiGrowth}>
          <Ionicons
            name={growthPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={growthPositive ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.kpiGrowthText,
              { color: growthPositive ? colors.success : colors.error },
            ]}
          >
            {' '}
            {growth}
          </Text>
        </View>
      )}
    </View>
  );

  const BookingCard = ({ item }: { item: RecentBooking }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.EN_ATTENTE;
    return (
      <View style={[styles.bookingCard, { borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.bookingAvatar,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.bookingAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.bookingAvatarText, { color: colors.primary }]}>
              {item.customerName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.bookingInfo}>
          <Text
            style={[styles.bookingTitle, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {item.tripTitle}
          </Text>
          <Text style={[styles.bookingCustomer, { color: theme.text }]}>
            {item.customerName}
          </Text>
          <Text style={[styles.bookingDate, { color: theme.text }]}>
            {formatDate(item.date, lang)} ·{' '}
            {item.date.includes('T') ? item.date.split('T')[1].slice(0, 5) : ''}
          </Text>
        </View>
        <View style={styles.bookingRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
            </Text>
          </View>
          <Text style={[styles.bookingAmount, { color: colors.primary }]}>
            {item.amount.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={() => setDrawerOpen(true)}>
          <View
            style={[styles.avatarBtn, { backgroundColor: theme.backgroundAlt }]}
          >
            {agency?.photoUrl ? (
              <Image
                source={{ uri: agency.photoUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person-outline" size={18} color={theme.text} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Agency selector */}
        <TouchableOpacity
          style={[
            styles.agencySelector,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
          onPress={() => setShowAgencyMenu(!showAgencyMenu)}
        >
          <View
            style={[
              styles.agencyLogo,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            {agency?.photoUrl ? (
              <Image
                source={{ uri: agency.photoUrl }}
                style={styles.agencyLogoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.agencyLogoText, { color: colors.primary }]}>
                {agency?.longName.slice(0, 2).toUpperCase() || 'VP'}
              </Text>
            )}
          </View>
          <View style={styles.agencyInfo}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {agency?.longName || '—'}
            </Text>
            <View style={styles.agencyLocationRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.agencyLocation, { color: theme.text }]}>
                {' '}
                {agency?.location || '—'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.text} />
        </TouchableOpacity>

        {/* KPI Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.activityOverview}
          </Text>
          <View style={styles.kpiGrid}>
            <KPICard
              icon="cash-outline"
              iconBg={`${colors.success}15`}
              iconColor={colors.success}
              label={t.revenue}
              value={formatPrice(stats?.revenus || 0)}
              growth="+12%"
              growthPositive
            />
            <KPICard
              icon="calendar-outline"
              iconBg={`${colors.primary}15`}
              iconColor={colors.primary}
              label={t.reservations}
              value={String(stats?.nombreReservations || 0)}
              growth="+8%"
              growthPositive
            />
            <KPICard
              icon="bus-outline"
              iconBg="#fef3c715"
              iconColor="#d97706"
              label={t.trips}
              value={String(stats?.nombreVoyages || 0)}
              growth="+5%"
              growthPositive
            />
            <KPICard
              icon="people-outline"
              iconBg="#f5f3ff15"
              iconColor="#7c3aed"
              label={t.newClients}
              value={String(stats?.nouveauxUtilisateurs || 0)}
              growth="+15%"
              growthPositive
            />
          </View>
        </View>

        {/* Evolution Chart */}
        <View
          style={[
            styles.chartSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.revenueEvolution}
            </Text>
            <TouchableOpacity
              style={[styles.periodBtn, { borderColor: theme.border }]}
              onPress={() => {
                const opts: ('7' | '30' | '90')[] = ['7', '30', '90'];
                const idx = opts.indexOf(evolutionPeriod);
                setEvolutionPeriod(opts[(idx + 1) % 3]);
              }}
            >
              <Text style={[styles.periodText, { color: theme.text }]}>
                {evolutionPeriod === '7'
                  ? t.last7
                  : evolutionPeriod === '30'
                  ? t.last30
                  : t.last90}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.text} />
            </TouchableOpacity>
          </View>

          {evolution.length > 0 ? (
            <MiniLineChart
              data={evolution}
              color={colors.primary}
              width={width - spacing.lg * 2 - spacing.md * 2}
              height={160}
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Ionicons name="analytics-outline" size={36} color={theme.text} />
            </View>
          )}
        </View>

        {/* Recent Bookings */}
        <View
          style={[
            styles.bookingsSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.bookingsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.recentBookings}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>
          {bookings.length === 0 ? (
            <View style={styles.emptyBookings}>
              <Ionicons name="calendar-outline" size={36} color={theme.text} />
            </View>
          ) : (
            bookings.map(b => <BookingCard key={b.idReservation} item={b} />)
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.quickActions}
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate('CreateAgency')}
            >
              <View
                style={[
                  styles.quickBtnIcon,
                  { backgroundColor: `${colors.error}15` },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={22}
                  color={colors.error}
                />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>
                {t.newAgency}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate('AgencyNewTrip', {})}
            >
              <View
                style={[
                  styles.quickBtnIcon,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>
                {t.newTrip}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate('AgencyPlanning')}
            >
              <View
                style={[
                  styles.quickBtnIcon,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>
                {t.planning}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.quickBtnIcon, { backgroundColor: '#fef3c715' }]}
              >
                <Ionicons name="bus-outline" size={22} color="#d97706" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>
                {t.myTrips}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.quickBtnIcon, { backgroundColor: '#f5f3ff15' }]}
              >
                <Ionicons name="people-outline" size={22} color="#7c3aed" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>
                {t.resources}
              </Text>
            </TouchableOpacity>
          </View>
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
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },

  agencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.md },
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  agencyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  agencyLocation: { ...typography.body, fontSize: typography.sizes.xs },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },

  // KPI
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
  kpiLabel: { ...typography.body, fontSize: typography.sizes.xs },
  kpiValue: { ...typography.heading, fontSize: typography.sizes.xl },
  kpiGrowth: { flexDirection: 'row', alignItems: 'center' },
  kpiGrowthText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  // Chart
  chartSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  periodText: { ...typography.body, fontSize: typography.sizes.xs },
  chartArea: { position: 'relative', height: 120 },
  chartLine: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  chartTooltip: {
    position: 'absolute',
    backgroundColor: '#1f2937',
    borderRadius: 4,
    padding: spacing.xs,
    alignItems: 'center',
  },
  chartTooltipText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },
  chartTooltipDate: { ...typography.body, fontSize: 9, color: '#9ca3af' },
  chartYLabel: {
    ...typography.body,
    fontSize: 9,
    position: 'absolute',
    left: 0,
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  chartXLabel: { ...typography.body, fontSize: 9 },
  chartEmpty: { height: 120, justifyContent: 'center', alignItems: 'center' },

  // Bookings
  bookingsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bookingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  bookingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bookingAvatarImage: { width: '100%', height: '100%' },
  bookingAvatarText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  bookingInfo: { flex: 1 },
  bookingTitle: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  bookingCustomer: { ...typography.body, fontSize: typography.sizes.xs },
  bookingDate: { ...typography.body, fontSize: typography.sizes.xs },
  bookingRight: { alignItems: 'flex-end', gap: spacing.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  bookingAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  emptyBookings: { height: 80, justifyContent: 'center', alignItems: 'center' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.md,
  },
  quickBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBtnText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
});
