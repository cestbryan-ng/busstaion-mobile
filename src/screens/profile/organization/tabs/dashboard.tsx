import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

type Organization = {
  organization_id: string;
  long_name: string;
  short_name: string;
  logo_url?: string;
  location?: string;
  is_active: boolean;
};

type Agency = {
  agencyId: string;
  longName: string;
  shortName?: string;
  logoUrl?: string;
  location?: string;
  isActive: boolean;
};

type Stats = {
  nombreEmployes: number;
  nombreChauffeurs: number;
  nombreVoyages: number;
  voyagesParStatut: Record<string, number>;
  nombreReservations: number;
  reservationsParStatut: Record<string, number>;
  revenus: number;
  nouveauxUtilisateurs: number;
  tauxOccupation: number;
};

type EvolutionData = {
  date: string;
  valeur: number;
  montant: number;
};

type Evolution = {
  evolutionReservations: EvolutionData[];
  evolutionVoyages: EvolutionData[];
  evolutionRevenus: EvolutionData[];
  evolutionUtilisateurs: EvolutionData[];
};

type Trip = {
  idVoyage: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  nomClasseVoyage?: string;
  nbrPlaceRestante?: number;
  prix: number;
  smallImage?: string;
  statusVoyage: string;
};

type Reservation = {
  reservation: {
    idReservation: string;
    statutReservation: string;
    prixTotal: number;
    dateReservation: string;
    nbrPassager?: number;
  };
  voyage?: { lieuDepart: string; lieuArrive: string };
};

type Tax = {
  montantTotalDu: number;
  taxes: { nomTaxe: string; tauxTaxe: number; montantFixe: number }[];
};

type Alert = {
  idAlerte: string;
  type: 'ALERTE_GENERALE' | 'TAX_REMINDER' | 'SUSPENSION';
  message: string;
  createdAt: string;
  lu: boolean;
};

type OrgDashboardProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
};

const RESERVATION_STATUS: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  CONFIRMER: {
    label: 'CONFIRMÉE',
    labelEn: 'CONFIRMED',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  ANNULER: {
    label: 'ANNULÉE',
    labelEn: 'CANCELLED',
    color: colors.error,
    bg: `${colors.error}15`,
  },
  RESERVER: {
    label: 'EN ATTENTE',
    labelEn: 'PENDING',
    color: '#d97706',
    bg: '#fef3c715',
  },
  VALIDER: {
    label: 'VALIDÉE',
    labelEn: 'VALIDATED',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
};

const TRIP_STATUS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PUBLIE: { label: 'PUBLIÉ', color: '#fff', bg: colors.success },
  EN_COURS: { label: 'EN COURS', color: '#fff', bg: '#d97706' },
  EN_ATTENTE: { label: 'BROUILLON', color: '#fff', bg: '#6b7280' },
  TERMINE: { label: 'TERMINÉ', color: '#fff', bg: '#6b7280' },
  ANNULE: { label: 'ANNULÉ', color: '#fff', bg: colors.error },
};

const ALERT_ICONS: Record<string, { icon: string; color: string; bg: string }> =
  {
    TAX_REMINDER: {
      icon: 'warning-outline',
      color: '#d97706',
      bg: '#fef3c715',
    },
    ALERTE_GENERALE: {
      icon: 'information-circle-outline',
      color: colors.primary,
      bg: `${colors.primary}15`,
    },
    SUSPENSION: {
      icon: 'ban-outline',
      color: colors.error,
      bg: `${colors.error}15`,
    },
  };

const AVATAR_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
];

function formatPrice(price: number, short = false): string {
  if (short) {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return String(price);
  }
  return price.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

function Sparkline({
  data,
  color,
  w,
  h,
}: {
  data: number[];
  color: string;
  w: number;
  h: number;
}) {
  if (data.length < 2) return <View style={{ width: w, height: h }} />;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: h - ((v - min) / range) * h,
  }));

  return (
    <View style={{ width: w, height: h, position: 'relative' }}>
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
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
      {points.map((p, i) => (
        <View
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: p.x - 3,
            top: p.y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      ))}
    </View>
  );
}

function DonutChart({
  segments,
  size,
}: {
  segments: { color: string; value: number; label: string }[];
  size: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stroke = size * 0.16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Build arc segments using border trick
  let cumulative = 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: '#e5e7eb',
        }}
      />
      {/* Colored segments via conic-like overlapping arcs — approximated with Views */}
      {segments.map((seg, i) => {
        const ratio = seg.value / total;
        const angle = ratio * 360;
        const startAngle = cumulative * 360;
        cumulative += ratio;
        if (ratio === 0) return null;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: stroke,
              borderColor: seg.color,
              borderTopColor: startAngle > 90 ? 'transparent' : seg.color,
              borderRightColor: startAngle > 180 ? 'transparent' : seg.color,
              borderBottomColor: startAngle > 270 ? 'transparent' : seg.color,
              transform: [{ rotate: `${startAngle}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}

export default function OrgDashboard({
  drawerOpen,
  setDrawerOpen,
  lang,
  setLang,
}: OrgDashboardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [org, setOrg] = useState<Organization | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [taxes, setTaxes] = useState<Tax | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Accueil',
      greeting: (name: string) => `Bonjour, ${name} 👋`,
      subtitle: "Voici un aperçu de l'activité de votre organisation.",
      active: 'Active',
      inactive: 'Inactive',
      employees: 'Employés',
      drivers: 'Chauffeurs',
      trips: 'Voyages',
      reservations: 'Réservations',
      revenue: 'Revenus',
      occupation: 'Occupation',
      total: 'Total',
      rate: 'Taux',
      tripsBreakdown: 'Répartition des voyages',
      reservationsBreakdown: 'Répartition des réservations',
      published: 'Publié',
      ongoing: 'En cours',
      completed: 'Terminés',
      confirmed: 'Confirmées',
      cancelled: 'Annulées',
      evolution: 'Évolution (6 derniers mois)',
      seeAll: 'Voir tout',
      recentTrips: 'Voyages récents',
      seatsLeft: 'places restantes',
      recentReservations: 'Réservations récentes',
      seeAll2: 'Voir toutes',
      revenueEvolution: 'Évolution des revenus',
      affiliationTaxes: "Taxes d'affiliation",
      totalDue: 'Montant total dû',
      seeDetail: 'Voir le détail et télécharger le document',
      recentAlerts: 'Alertes récentes',
      seeAllAlerts: 'Voir toutes',
      newUsers: 'Nouveaux utilisateurs',
    },
    en: {
      title: 'Home',
      greeting: (name: string) => `Hello, ${name} 👋`,
      subtitle: "Here's an overview of your organization's activity.",
      active: 'Active',
      inactive: 'Inactive',
      employees: 'Employees',
      drivers: 'Drivers',
      trips: 'Trips',
      reservations: 'Reservations',
      revenue: 'Revenue',
      occupation: 'Occupancy',
      total: 'Total',
      rate: 'Rate',
      tripsBreakdown: 'Trip breakdown',
      reservationsBreakdown: 'Reservation breakdown',
      published: 'Published',
      ongoing: 'Ongoing',
      completed: 'Completed',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      evolution: 'Evolution (last 6 months)',
      seeAll: 'See all',
      recentTrips: 'Recent trips',
      seatsLeft: 'seats left',
      recentReservations: 'Recent reservations',
      seeAll2: 'See all',
      revenueEvolution: 'Revenue evolution',
      affiliationTaxes: 'Affiliation taxes',
      totalDue: 'Total amount due',
      seeDetail: 'View detail and download document',
      recentAlerts: 'Recent alerts',
      seeAllAlerts: 'See all',
      newUsers: 'New users',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, userRaw, orgRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('organization'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      if (orgRaw) setOrg(JSON.parse(orgRaw));

      const user = userRaw ? JSON.parse(userRaw) : null;
      const orgData = orgRaw ? JSON.parse(orgRaw) : null;
      const orgId =
        user?.organisationId ||
        user?.organization_id ||
        orgData?.organization_id;
      if (!orgId) return;

      const headers = { Authorization: `Bearer ${token}` };

      // Load org + agencies
      const [orgRes, agenciesRes] = await Promise.allSettled([
        fetch(`${API_URL}/organizations/${orgId}`, { headers }),
        fetch(`${API_URL}/organizations/agencies/${orgId}`, { headers }),
      ]);

      let agencyId = '';
      if (orgRes.status === 'fulfilled' && orgRes.value.ok) {
        const data = await orgRes.value.json();
        setOrg(data);
        await AsyncStorage.setItem('organization', JSON.stringify(data));
      }
      if (agenciesRes.status === 'fulfilled' && agenciesRes.value.ok) {
        const data = await agenciesRes.value.json();
        const list: Agency[] = data.content || data || [];
        setAgencies(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedAgency(first);
          agencyId = first.agencyId;
        }
      }

      if (!agencyId) return;

      // Load agency-level data in parallel
      const [
        statsRes,
        evolutionRes,
        tripsRes,
        reservationsRes,
        taxesRes,
        alertsRes,
      ] = await Promise.allSettled([
        fetch(`${API_URL}/statistiques/agence/${agencyId}/general`, {
          headers,
        }),
        fetch(`${API_URL}/statistiques/agence/${agencyId}/evolution`, {
          headers,
        }),
        fetch(`${API_URL}/voyage/agence/${agencyId}?page=0&size=6`, {
          headers,
        }),
        fetch(`${API_URL}/reservation/agence/${agencyId}?page=0&size=5`, {
          headers,
        }),
        fetch(`${API_URL}/taxe-affiliation/agence/${agencyId}`, { headers }),
        fetch(`${API_URL}/alerte/agence/${agencyId}`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok)
        setStats(await statsRes.value.json());
      if (evolutionRes.status === 'fulfilled' && evolutionRes.value.ok)
        setEvolution(await evolutionRes.value.json());
      if (tripsRes.status === 'fulfilled' && tripsRes.value.ok) {
        const data = await tripsRes.value.json();
        setTrips(data.content || data || []);
      }
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value.ok) {
        const data = await reservationsRes.value.json();
        setReservations(data.content || []);
      }
      if (taxesRes.status === 'fulfilled' && taxesRes.value.ok)
        setTaxes(await taxesRes.value.json());
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const data: Alert[] = await alertsRes.value.json();
        setAlerts(data);
        setUnreadAlerts(data.filter(a => !a.lu).length);
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

  const markAlertRead = async (alertId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/alerte/${alertId}/lu`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(prev =>
        prev.map(a => (a.idAlerte === alertId ? { ...a, lu: true } : a)),
      );
      setUnreadAlerts(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const sparkReservations = useMemo(
    () => evolution?.evolutionReservations?.map(d => d.valeur) || [],
    [evolution],
  );
  const sparkRevenues = useMemo(
    () => evolution?.evolutionRevenus?.map(d => d.montant) || [],
    [evolution],
  );
  const sparkVoyages = useMemo(
    () => evolution?.evolutionVoyages?.map(d => d.valeur) || [],
    [evolution],
  );
  const sparkUsers = useMemo(
    () => evolution?.evolutionUtilisateurs?.map(d => d.valeur) || [],
    [evolution],
  );

  const revenuePoints = useMemo(() => {
    const data = evolution?.evolutionRevenus || [];
    if (data.length < 2) return [];
    const values = data.map(d => d.montant);
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;
    const range = max - min || 1;
    const chartW = width - spacing.lg * 4 - spacing.md * 2;
    const chartH = 120;
    const stepX = chartW / (data.length - 1);
    return data.map((d, i) => ({
      x: i * stepX,
      y: chartH - ((d.montant - min) / range) * chartH,
      montant: d.montant,
      date: d.date,
    }));
  }, [evolution]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const userRaw = null; // user name from AsyncStorage loaded at top
  const userName = selectedAgency?.longName.split(' ')[0] || 'Paul';

  // Donut segments
  const tripSegments = [
    {
      color: colors.primary,
      value: stats?.voyagesParStatut?.PUBLIE || 0,
      label: t.published,
    },
    {
      color: '#d97706',
      value: stats?.voyagesParStatut?.EN_COURS || 0,
      label: t.ongoing,
    },
    {
      color: colors.success,
      value: stats?.voyagesParStatut?.TERMINE || 0,
      label: t.completed,
    },
  ];
  const reservationSegments = [
    {
      color: colors.success,
      value: stats?.reservationsParStatut?.CONFIRMER || 0,
      label: t.confirmed,
    },
    {
      color: colors.error,
      value: stats?.reservationsParStatut?.ANNULER || 0,
      label: t.cancelled,
    },
  ];

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
        <TouchableOpacity onPress={() => setDrawerOpen(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity style={styles.bellContainer}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.textStrong}
          />
          {unreadAlerts > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.bellBadgeText}>{unreadAlerts}</Text>
            </View>
          )}
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
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingText, { color: theme.textStrong }]}>
            {t.greeting(userName)}
          </Text>
          <Text style={[styles.greetingSubtitle, { color: theme.text }]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Org card */}
        <View style={[styles.orgCard, { backgroundColor: colors.primary }]}>
          <View
            style={[
              styles.orgLogo,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}
          >
            {org?.logo_url ? (
              <Image
                source={{ uri: org.logo_url }}
                style={styles.orgLogoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.orgLogoText}>
                {(org?.short_name || org?.long_name || 'ORG')
                  .slice(0, 3)
                  .toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>
              {org?.long_name || selectedAgency?.longName || '—'}
            </Text>
            {(org as any)?.location || selectedAgency?.location ? (
              <View style={styles.orgLocationRow}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.orgLocation}>
                  {' '}
                  {(org as any)?.location || selectedAgency?.location}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.orgActiveBadge}>
            <Text style={styles.orgActiveBadgeText}>
              {org?.is_active ? t.active : t.inactive}
            </Text>
          </View>
        </View>

        {/* Stats grid 6 cells */}
        <View
          style={[
            styles.statsSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {[
            {
              icon: 'people-outline',
              iconColor: '#7c3aed',
              iconBg: '#f5f3ff',
              value: String(stats?.nombreEmployes || 0),
              label: t.employees,
              sub: t.total,
            },
            {
              icon: 'car-outline',
              iconColor: colors.success,
              iconBg: `${colors.success}15`,
              value: String(stats?.nombreChauffeurs || 0),
              label: t.drivers,
              sub: t.total,
            },
            {
              icon: 'bus-outline',
              iconColor: colors.primary,
              iconBg: `${colors.primary}15`,
              value: String(stats?.nombreVoyages || 0),
              label: t.trips,
              sub: t.total,
            },
            {
              icon: 'calendar-outline',
              iconColor: '#d97706',
              iconBg: '#fef3c715',
              value: String(stats?.nombreReservations || 0),
              label: t.reservations,
              sub: t.total,
            },
            {
              icon: 'cash-outline',
              iconColor: colors.success,
              iconBg: `${colors.success}15`,
              value: formatPrice(stats?.revenus || 0),
              label: t.revenue,
              sub: '',
            },
            {
              icon: 'pie-chart-outline',
              iconColor: '#7c3aed',
              iconBg: '#f5f3ff',
              value: `${Math.round((stats?.tauxOccupation || 0) * 100)}%`,
              label: t.occupation,
              sub: t.rate,
            },
          ].map((item, i) => (
            <View
              key={item.label}
              style={[
                styles.statCell,
                {
                  borderRightColor: theme.border,
                  borderBottomColor: theme.border,
                },
                i % 3 === 2 && { borderRightWidth: 0 },
                i >= 3 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={18} color={item.iconColor} />
              </View>
              <Text
                style={[styles.statValue, { color: theme.textStrong }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {item.label}
              </Text>
              {item.sub ? (
                <Text style={[styles.statSub, { color: theme.text }]}>
                  {item.sub}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Trip breakdown */}
        {stats && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.tripsBreakdown}
            </Text>
            <View style={styles.donutRow}>
              <View style={styles.legendCol}>
                {tripSegments.map(seg => (
                  <View key={seg.label} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: seg.color }]}
                    />
                    <Text style={[styles.legendLabel, { color: theme.text }]}>
                      {seg.label}
                    </Text>
                    <Text
                      style={[styles.legendValue, { color: theme.textStrong }]}
                    >
                      {seg.value}
                    </Text>
                  </View>
                ))}
              </View>
              <DonutChart segments={tripSegments} size={100} />
            </View>
          </View>
        )}

        {/* Reservation breakdown */}
        {stats && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.reservationsBreakdown}
            </Text>
            <View style={styles.donutRow}>
              <View style={styles.legendCol}>
                {reservationSegments.map(seg => (
                  <View key={seg.label} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: seg.color }]}
                    />
                    <Text style={[styles.legendLabel, { color: theme.text }]}>
                      {seg.label}
                    </Text>
                    <Text
                      style={[styles.legendValue, { color: theme.textStrong }]}
                    >
                      {seg.value}
                    </Text>
                  </View>
                ))}
              </View>
              <DonutChart segments={reservationSegments} size={100} />
            </View>
          </View>
        )}

        {/* Evolution mini sparklines */}
        {evolution && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.evolution}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAll}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sparkGrid}>
              {[
                {
                  label: t.reservations,
                  value: String(stats?.nombreReservations || 0),
                  data: sparkReservations,
                  color: colors.primary,
                },
                {
                  label: t.revenue,
                  value: formatPrice(stats?.revenus || 0),
                  data: sparkRevenues,
                  color: colors.success,
                },
                {
                  label: t.trips,
                  value: String(stats?.nombreVoyages || 0),
                  data: sparkVoyages,
                  color: '#7c3aed',
                },
                {
                  label: t.newUsers,
                  value: String(stats?.nouveauxUtilisateurs || 0),
                  data: sparkUsers,
                  color: '#d97706',
                },
              ].map(item => (
                <View
                  key={item.label}
                  style={[styles.sparkCard, { borderColor: theme.border }]}
                >
                  <Text style={[styles.sparkLabel, { color: item.color }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.sparkValue, { color: theme.textStrong }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {item.value}
                  </Text>
                  <Sparkline
                    data={item.data}
                    color={item.color}
                    w={72}
                    h={36}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent trips */}
        {trips.length > 0 && (
          <View style={styles.tripsSection}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.recentTrips}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAll}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.md }}
            >
              {trips.map(trip => {
                const statusCfg =
                  TRIP_STATUS[trip.statusVoyage] || TRIP_STATUS.PUBLIE;
                return (
                  <View
                    key={trip.idVoyage}
                    style={[
                      styles.tripCard,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {/* Image */}
                    <View
                      style={[
                        styles.tripImage,
                        { backgroundColor: theme.backgroundAlt },
                      ]}
                    >
                      {trip.smallImage ? (
                        <Image
                          source={{ uri: trip.smallImage }}
                          style={styles.tripImageInner}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="bus-outline"
                          size={28}
                          color={theme.text}
                        />
                      )}
                      <View
                        style={[
                          styles.tripStatusBadge,
                          { backgroundColor: statusCfg.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tripStatusText,
                            { color: statusCfg.color },
                          ]}
                        >
                          {statusCfg.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tripInfo}>
                      <Text
                        style={[styles.tripRoute, { color: theme.textStrong }]}
                        numberOfLines={1}
                      >
                        {trip.lieuDepart} → {trip.lieuArrive}
                      </Text>
                      <Text style={[styles.tripDate, { color: theme.text }]}>
                        {new Date(trip.dateDepartPrev).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' },
                        )}
                      </Text>
                      {trip.nomClasseVoyage && (
                        <Text
                          style={[styles.tripClass, { color: colors.primary }]}
                        >
                          {trip.nomClasseVoyage}
                        </Text>
                      )}
                      {trip.nbrPlaceRestante !== undefined && (
                        <Text
                          style={[styles.tripSeats, { color: colors.success }]}
                        >
                          {trip.nbrPlaceRestante} {t.seatsLeft}
                        </Text>
                      )}
                      <Text
                        style={[styles.tripPrice, { color: theme.textStrong }]}
                      >
                        {trip.prix.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Recent reservations */}
        {reservations.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.recentReservations}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAll2}
                </Text>
              </TouchableOpacity>
            </View>
            {reservations.map((item, i) => {
              const statusCfg =
                RESERVATION_STATUS[item.reservation.statutReservation] ||
                RESERVATION_STATUS.RESERVER;
              const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const initials = `P${i + 1}`;
              return (
                <View
                  key={item.reservation.idReservation}
                  style={[
                    styles.reservRow,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: i < reservations.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.reservAvatar,
                      { backgroundColor: avatarColor },
                    ]}
                  >
                    <Text style={styles.reservAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.reservInfo}>
                    <Text
                      style={[styles.reservRoute, { color: theme.textStrong }]}
                      numberOfLines={1}
                    >
                      {item.voyage?.lieuDepart || '—'} →{' '}
                      {item.voyage?.lieuArrive || '—'}
                    </Text>
                    <Text style={[styles.reservMeta, { color: theme.text }]}>
                      {item.reservation.dateReservation
                        ? new Date(
                            item.reservation.dateReservation,
                          ).toLocaleDateString(
                            lang === 'fr' ? 'fr-FR' : 'en-GB',
                            { day: 'numeric', month: 'long', year: 'numeric' },
                          )
                        : '—'}
                      {item.reservation.nbrPassager
                        ? ` · ${item.reservation.nbrPassager} place${
                            item.reservation.nbrPassager > 1 ? 's' : ''
                          }`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.reservRight}>
                    <View
                      style={[
                        styles.reservBadge,
                        { backgroundColor: statusCfg.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reservBadgeText,
                          { color: statusCfg.color },
                        ]}
                      >
                        {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                      </Text>
                    </View>
                    <Text
                      style={[styles.reservAmount, { color: theme.textStrong }]}
                    >
                      {item.reservation.prixTotal.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.text}
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* Revenue evolution (big chart) */}
        {revenuePoints.length > 1 && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.revenueEvolution}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAll}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.bigChartArea, { height: 140 }]}>
              {/* Y labels */}
              {[0, 1, 2, 3].map(i => {
                const values = revenuePoints.map(p => p.montant);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const v = max - ((max - min) / 3) * i;
                return (
                  <Text
                    key={i}
                    style={[
                      styles.chartYLabel,
                      { color: theme.text, top: (140 / 3) * i },
                    ]}
                  >
                    {formatPrice(v, true)}
                  </Text>
                );
              })}
              {/* Lines + dots */}
              <View style={[styles.bigChartLines, { marginLeft: 40 }]}>
                {revenuePoints.map((p, i) => {
                  if (i === 0) return null;
                  const prev = revenuePoints[i - 1];
                  const dx = p.x - prev.x;
                  const dy = p.y - prev.y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: prev.x,
                        top: prev.y,
                        width: len,
                        height: 2,
                        backgroundColor: colors.success,
                        transform: [{ rotate: `${angle}deg` }],
                      }}
                    />
                  );
                })}
                {revenuePoints.map((p, i) => (
                  <View
                    key={`d${i}`}
                    style={{
                      position: 'absolute',
                      left: p.x - 5,
                      top: p.y - 5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.success,
                      borderWidth: 2,
                      borderColor: '#fff',
                    }}
                  />
                ))}
                {/* Last point tooltip */}
                {revenuePoints.length > 0 && (
                  <View
                    style={[
                      styles.chartTooltip,
                      {
                        left: revenuePoints[revenuePoints.length - 1].x - 44,
                        top: revenuePoints[revenuePoints.length - 1].y - 44,
                      },
                    ]}
                  >
                    <Text style={styles.chartTooltipDate}>
                      {new Date(
                        evolution?.evolutionRevenus?.[
                          evolution.evolutionRevenus.length - 1
                        ]?.date || '',
                      ).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.chartTooltipValue}>
                      {formatPrice(
                        revenuePoints[revenuePoints.length - 1].montant,
                      )}
                    </Text>
                  </View>
                )}
              </View>
              {/* X labels */}
              <View style={[styles.chartXRow, { marginLeft: 40 }]}>
                {(evolution?.evolutionRevenus || []).map((d, i) => (
                  <Text
                    key={i}
                    style={[styles.chartXLabel, { color: theme.text }]}
                  >
                    {new Date(d.date).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-GB',
                      { month: 'short' },
                    )}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Affiliation taxes */}
        {taxes && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.affiliationTaxes}
            </Text>

            <View
              style={[
                styles.taxTotalBox,
                {
                  backgroundColor: `${colors.error}08`,
                  borderColor: `${colors.error}20`,
                },
              ]}
            >
              <Text style={[styles.taxTotalLabel, { color: theme.text }]}>
                {t.totalDue}
              </Text>
              <Text style={[styles.taxTotalValue, { color: colors.error }]}>
                {formatPrice(taxes.montantTotalDu)}
              </Text>
            </View>

            {taxes.taxes.map((tax, i) => (
              <View
                key={tax.nomTaxe}
                style={[
                  styles.taxRow,
                  {
                    borderTopColor: theme.border,
                    borderTopWidth: i === 0 ? 0 : 1,
                  },
                ]}
              >
                <Text style={[styles.taxName, { color: theme.textStrong }]}>
                  {tax.nomTaxe}
                </Text>
                <Text style={[styles.taxRate, { color: theme.text }]}>
                  {tax.tauxTaxe * 100}%
                </Text>
                <Text style={[styles.taxAmount, { color: colors.error }]}>
                  {formatPrice(tax.montantFixe)}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.taxLink, { borderTopColor: theme.border }]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.taxLinkText, { color: colors.primary }]}>
                {t.seeDetail}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.recentAlerts}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAllAlerts}
                </Text>
              </TouchableOpacity>
            </View>
            {alerts.slice(0, 3).map((alert, i) => {
              const cfg =
                ALERT_ICONS[alert.type] || ALERT_ICONS.ALERTE_GENERALE;
              return (
                <TouchableOpacity
                  key={alert.idAlerte}
                  style={[
                    styles.alertRow,
                    {
                      borderTopColor: theme.border,
                      borderTopWidth: i === 0 ? 0 : 1,
                    },
                  ]}
                  onPress={() => markAlertRead(alert.idAlerte)}
                >
                  <View style={[styles.alertIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text
                      style={[styles.alertMessage, { color: theme.textStrong }]}
                      numberOfLines={2}
                    >
                      {alert.message}
                    </Text>
                    <Text style={[styles.alertDate, { color: theme.text }]}>
                      {formatDate(alert.createdAt, lang)}
                    </Text>
                  </View>
                  {!alert.lu && (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.error },
                      ]}
                    />
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.text}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
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
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  bellContainer: { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: { ...typography.bodyBold, fontSize: 10, color: '#fff' },

  greetingSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greetingText: { ...typography.heading, fontSize: typography.sizes.lg },
  greetingSubtitle: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 3,
  },

  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 4,
    padding: spacing.md,
  },
  orgLogo: {
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orgLogoImage: { width: '100%', height: '100%' },
  orgLogoText: {
    ...typography.heading,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  orgInfo: { flex: 1 },
  orgName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  orgLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  orgLocation: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  orgActiveBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  orgActiveBadgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },

  // Stats grid 2x3
  statsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '33.33%',
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.md },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },
  statSub: { ...typography.body, fontSize: 9 },

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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // Donut
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendCol: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  legendValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // Sparklines
  sparkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sparkCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    gap: 4,
  },
  sparkLabel: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  sparkValue: { ...typography.heading, fontSize: typography.sizes.md },

  // Recent trips horizontal
  tripsSection: { paddingLeft: spacing.lg, marginBottom: spacing.md },
  tripCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  tripImage: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tripImageInner: { width: '100%', height: '100%', position: 'absolute' },
  tripStatusBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tripStatusText: { ...typography.bodyBold, fontSize: 9 },
  tripInfo: { padding: spacing.sm, gap: 3 },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  tripDate: { ...typography.body, fontSize: typography.sizes.xs },
  tripClass: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripSeats: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // Reservations
  reservRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  reservAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reservAvatarText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
  reservInfo: { flex: 1 },
  reservRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  reservMeta: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  reservRight: { alignItems: 'flex-end', gap: 4 },
  reservBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reservBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  reservAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // Big revenue chart
  bigChartArea: { position: 'relative', marginTop: spacing.sm },
  bigChartLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  },
  chartYLabel: {
    position: 'absolute',
    left: 0,
    ...typography.body,
    fontSize: 9,
  },
  chartXRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartXLabel: { ...typography.body, fontSize: 9 },
  chartTooltip: {
    position: 'absolute',
    backgroundColor: '#1f2937',
    borderRadius: 4,
    padding: spacing.xs,
    alignItems: 'center',
    minWidth: 88,
  },
  chartTooltipDate: { ...typography.body, fontSize: 9, color: '#9ca3af' },
  chartTooltipValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },

  // Taxes
  taxTotalBox: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taxTotalLabel: { ...typography.body, fontSize: typography.sizes.sm },
  taxTotalValue: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
    marginTop: 4,
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  taxName: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  taxRate: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginRight: spacing.md,
  },
  taxAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  taxLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  taxLinkText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
  },

  // Alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: { flex: 1 },
  alertMessage: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  alertDate: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
