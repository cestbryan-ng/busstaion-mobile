import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonDashboard } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import ImagePlaceholder from '../../../../assets/placeholders/image.svg';

const { width } = Dimensions.get('window');

type Agency = {
  id: string;
  longName: string;
  shortName?: string;
  location: string;
  logoUrl?: string;
  description?: string;
  greetingMessage?: string;
  isActive: boolean;
};

type User = {
  first_name: string;
  last_name: string;
  id?: string;
  userId?: string;
};

type Stats = {
  revenus: number;
  nombreReservations: number;
  nombreVoyages: number;
  nouveauxUtilisateurs: number;
  nombreEmployes: number;
  nombreChauffeurs: number;
  tauxOccupation: number;
  voyagesParStatut: Record<string, number>;
  reservationsParStatut: Record<string, number>;
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
  nbrPlaceReservable?: number;
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

type AgencyDashboardProps = {
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
      {segments.map((seg, i) => {
        const ratio = seg.value / total;
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

export default function AgencyDashboard({
  drawerOpen: _drawerOpen,
  setDrawerOpen,
  lang,
  setLang,
}: AgencyDashboardProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [stats, setStats] = useState<Stats | null>(null);
  const [evolution, setEvolution] = useState<Evolution | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greetingIndex] = useState(() => Math.floor(Math.random() * 4));

  const hour = new Date().getHours();

  const GREETINGS = {
    fr: {
      morning: [
        'Bonjour ! Prêt à gérer votre agence ? ☀️',
        'Bonjour ! Une belle journée pour les affaires ☀️',
        'Bonjour ! Que se passe-t-il aujourd\'hui ? ☀️',
        'Bon matin ! Votre tableau de bord vous attend ☀️',
      ],
      afternoon: [
        'Bonne après-midi ! Comment vont les réservations ? 🌤️',
        'Bonne après-midi ! Gardez un œil sur vos voyages 🌤️',
        'Bonne après-midi ! L\'activité bat son plein 🌤️',
        'Bonne après-midi ! Vos voyageurs comptent sur vous 🌤️',
      ],
      evening: [
        'Bonsoir ! Un dernier coup d\'œil au tableau de bord ? 🌙',
        'Bonsoir ! Planifiez sereinement pour demain 🌙',
        'Bonsoir ! Vérifiez les réservations du soir 🌙',
        'Bonsoir ! La journée a été productive ? 🌙',
      ],
      night: [
        'Bonne nuit ! Préparez votre programme de demain 🌙',
        'Bonne nuit ! Vos voyages sont bien planifiés 🌙',
        'Bonne nuit ! À demain pour de nouveaux voyages 🌙',
        'Bonne nuit ! Reposez-vous, demain sera chargé 🌙',
      ],
    },
    en: {
      morning: [
        'Good morning! Ready to manage your agency? ☀️',
        'Good morning! A great day for business ☀️',
        'Good morning! What\'s on the agenda today? ☀️',
        'Good morning! Your dashboard is ready ☀️',
      ],
      afternoon: [
        'Good afternoon! How are the bookings going? 🌤️',
        'Good afternoon! Keep an eye on your trips 🌤️',
        'Good afternoon! Business is in full swing 🌤️',
        'Good afternoon! Your travelers are counting on you 🌤️',
      ],
      evening: [
        'Good evening! One last look at the dashboard? 🌙',
        'Good evening! Plan calmly for tomorrow 🌙',
        'Good evening! Check the evening bookings 🌙',
        'Good evening! Was it a productive day? 🌙',
      ],
      night: [
        'Good night! Prepare your schedule for tomorrow 🌙',
        'Good night! Your trips are well planned 🌙',
        'Good night! See you tomorrow for new journeys 🌙',
        'Good night! Rest up, tomorrow will be busy 🌙',
      ],
    },
  };

  const pickGreeting = (l: 'fr' | 'en') => {
    const set = GREETINGS[l];
    const idx = greetingIndex;
    if (hour >= 5 && hour < 12) return set.morning[idx];
    if (hour >= 12 && hour < 18) return set.afternoon[idx];
    if (hour >= 18 && hour < 22) return set.evening[idx];
    return set.night[idx];
  };

  const t = {
    fr: {
      greeting: pickGreeting('fr'),
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
      newClients: 'Nouveaux clients',
      tripsBreakdown: 'Répartition des voyages',
      reservationsBreakdown: 'Répartition des réservations',
      published: 'Publié',
      ongoing: 'En cours',
      completed: 'Terminés',
      confirmed: 'Confirmées',
      cancelled: 'Annulées',
      evolution: 'Évolution (6 derniers mois)',
      recentTrips: 'Voyages récents',
      seatsLeft: 'places réservées',
      recentReservations: 'Réservations récentes',
      revenueEvolution: 'Évolution des revenus',
      quickActions: 'Actions rapides',
      newTrip: 'Nouveau voyage',
      planning: 'Planning',
      myTrips: 'Mes voyages',
      resources: 'Ressources',
    },
    en: {
      greeting: pickGreeting('en'),
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
      newClients: 'New clients',
      tripsBreakdown: 'Trip breakdown',
      reservationsBreakdown: 'Reservation breakdown',
      published: 'Published',
      ongoing: 'Ongoing',
      completed: 'Completed',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      evolution: 'Evolution (last 6 months)',
      recentTrips: 'Recent trips',
      seatsLeft: 'seats booked',
      recentReservations: 'Recent reservations',
      revenueEvolution: 'Revenue evolution',
      quickActions: 'Quick actions',
      newTrip: 'New trip',
      planning: 'Planning',
      myTrips: 'My trips',
      resources: 'Resources',
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

      const userParsed = userRaw ? JSON.parse(userRaw) : null;
      if (userParsed) setUser(userParsed);
      const chefId = userParsed?.userId || userParsed?.id;
      if (!chefId) return;

      const headers = { Authorization: `Bearer ${token}` };

      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, { headers });
      if (!agencyRes.ok) return;
      const agencyData = await agencyRes.json();
      setAgency(agencyData);

      const agencyId = agencyData.id;

      const [statsRes, evolutionRes, tripsRes, reservationsRes] = await Promise.allSettled([
        fetch(`${API_URL}/statistiques/agence/${agencyId}/general`, { headers }),
        fetch(`${API_URL}/statistiques/agence/${agencyId}/evolution`, { headers }),
        fetch(`${API_URL}/voyage/agence/${agencyId}?page=0&size=6`, { headers }),
        fetch(`${API_URL}/reservation/agence/${agencyId}?page=0&size=5`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setStats(data);
        setCache(`agency_dashboard_${agencyId}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(`agency_dashboard_${agencyId}`);
        if (cached) { setStats(cached); setIsOffline(true); }
      }
      if (evolutionRes.status === 'fulfilled' && evolutionRes.value.ok) {
        const data = await evolutionRes.value.json();
        setEvolution(data);
        setCache(`agency_dashboard_evolution_${agencyId}`, data);
      } else {
        const cached = await getCache(`agency_dashboard_evolution_${agencyId}`);
        if (cached) { setEvolution(cached); setIsOffline(true); }
      }
      if (tripsRes.status === 'fulfilled' && tripsRes.value.ok) {
        const data = await tripsRes.value.json();
        setTrips(data.content || data || []);
        setCache(`agency_dashboard_trips_${agencyId}`, data.content || data || []);
      } else {
        const cached = await getCache(`agency_dashboard_trips_${agencyId}`);
        if (cached) { setTrips(cached); setIsOffline(true); }
      }
      if (reservationsRes.status === 'fulfilled' && reservationsRes.value.ok) {
        const data = await reservationsRes.value.json();
        setReservations(data.content || []);
        setCache(`agency_dashboard_reservations_${agencyId}`, data.content || []);
      } else {
        const cached = await getCache(`agency_dashboard_reservations_${agencyId}`);
        if (cached) { setReservations(cached); setIsOffline(true); }
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
    const chartW = width - spacing.lg * 4 - spacing.md * 2 - 40;
    const chartH = 120;
    const stepX = chartW / (data.length - 1);
    return data.map((d, i) => ({
      x: i * stepX,
      y: chartH - ((d.montant - min) / range) * chartH,
      montant: d.montant,
      date: d.date,
    }));
  }, [evolution]);

  if (loading) return <SkeletonDashboard />;

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
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.headerAvatar, { backgroundColor: theme.backgroundAlt }]}>
            <AvatarPlaceholder width="100%" height="100%" />
          </View>
          <Text style={[styles.headerName, { color: theme.textStrong }]} numberOfLines={1}>
            {user?.first_name ?? '---'}
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

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingText, { color: theme.textStrong }]}>
            {t.greeting}
          </Text>
        </View>

        {/* Agency card */}
        <View
          style={[
            styles.agencyCard,
            { backgroundColor: colors.primary },
          ]}
        >
          <View style={[styles.agencyLogo, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {agency?.logoUrl && agency.logoUrl.startsWith('http') ? (
              <Image source={{ uri: agency.logoUrl }} style={styles.agencyLogoImage} resizeMode="contain" />
            ) : (
              <AgencyPlaceholder width="70%" height="70%" />
            )}
          </View>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName}>{agency?.longName || '—'}</Text>
            {agency?.location ? (
              <View style={styles.agencyLocationRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.agencyLocation}> {agency.location}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.agencyActiveBadge}>
            <Text style={styles.agencyActiveBadgeText}>
              {agency?.isActive ? t.active : t.inactive}
            </Text>
          </View>
        </View>

        {/* Stats grid 2x3 */}
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
              iconBg: '#fef3c715',
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
              iconBg: '#fef3c715',
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
                    <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                    <Text style={[styles.legendLabel, { color: theme.text }]}>{seg.label}</Text>
                    <Text style={[styles.legendValue, { color: theme.textStrong }]}>{seg.value}</Text>
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
                    <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                    <Text style={[styles.legendLabel, { color: theme.text }]}>{seg.label}</Text>
                    <Text style={[styles.legendValue, { color: theme.textStrong }]}>{seg.value}</Text>
                  </View>
                ))}
              </View>
              <DonutChart segments={reservationSegments} size={100} />
            </View>
          </View>
        )}

        {/* Evolution sparklines */}
        {evolution && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.evolution}
            </Text>
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
                  label: t.newClients,
                  value: String(stats?.nouveauxUtilisateurs || 0),
                  data: sparkUsers,
                  color: '#d97706',
                },
              ].map(item => (
                <View
                  key={item.label}
                  style={[styles.sparkCard, { borderColor: theme.border }]}
                >
                  <Text style={[styles.sparkLabel, { color: item.color }]}>{item.label}</Text>
                  <Text
                    style={[styles.sparkValue, { color: theme.textStrong }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {item.value}
                  </Text>
                  <Sparkline data={item.data} color={item.color} w={72} h={36} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent trips */}
        <View style={styles.tripsSection}>
          <Text style={[styles.cardTitle, { color: theme.textStrong, paddingRight: spacing.lg }]}>
            {t.recentTrips}
          </Text>
          {trips.length === 0 ? (
            <EmptyState type="result" message={lang === 'fr' ? 'Aucun voyage récent' : 'No recent trips'} textColor={theme.text} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
            >
              {trips.map(trip => {
                const statusCfg = TRIP_STATUS[trip.statusVoyage] || TRIP_STATUS.PUBLIE;
                return (
                  <View
                    key={trip.idVoyage}
                    style={[
                      styles.tripCard,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <View style={[styles.tripImage, { backgroundColor: theme.backgroundAlt }]}>
                      {trip.smallImage?.startsWith('http') ? (
                        <Image
                          source={{ uri: trip.smallImage }}
                          style={styles.tripImageInner}
                          resizeMode="cover"
                        />
                      ) : (
                        <ImagePlaceholder width="60%" height="60%" />
                      )}
                      <View style={[styles.tripStatusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.tripStatusText, { color: statusCfg.color }]}>
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
                        <Text style={[styles.tripClass, { color: colors.primary }]}>
                          {trip.nomClasseVoyage}
                        </Text>
                      )}
                      {trip.nbrPlaceRestante !== undefined && trip.nbrPlaceReservable !== undefined && (
                        <Text style={[styles.tripSeats, { color: colors.success }]}>
                          {Math.max(0, trip.nbrPlaceRestante - trip.nbrPlaceReservable)} {t.seatsLeft}
                        </Text>
                      )}
                      <Text style={[styles.tripPrice, { color: theme.textStrong }]}>
                        {trip.prix.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Recent reservations */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.recentReservations}
          </Text>
          {reservations.length === 0 ? (
            <EmptyState type="result" message={lang === 'fr' ? 'Aucune réservation récente' : 'No recent reservations'} textColor={theme.text} />
          ) : reservations.map((item, i) => {
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
                <View style={[styles.reservAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.reservAvatarText}>{initials}</Text>
                </View>
                <View style={styles.reservInfo}>
                  <Text
                    style={[styles.reservRoute, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {item.voyage?.lieuDepart || '—'} → {item.voyage?.lieuArrive || '—'}
                  </Text>
                  <Text style={[styles.reservMeta, { color: theme.text }]}>
                    {item.reservation.dateReservation
                      ? new Date(item.reservation.dateReservation).toLocaleDateString(
                          lang === 'fr' ? 'fr-FR' : 'en-GB',
                          { day: 'numeric', month: 'long', year: 'numeric' },
                        )
                      : '—'}
                    {item.reservation.nbrPassager
                      ? ` · ${item.reservation.nbrPassager} place${item.reservation.nbrPassager > 1 ? 's' : ''}`
                      : ''}
                  </Text>
                </View>
                <View style={styles.reservRight}>
                  <View style={[styles.reservBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.reservBadgeText, { color: statusCfg.color }]}>
                      {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                    </Text>
                  </View>
                  <Text style={[styles.reservAmount, { color: theme.textStrong }]}>
                    {item.reservation.prixTotal.toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.text} />
              </View>
            );
          })}
        </View>

        {/* Revenue evolution big chart */}
        {revenuePoints.length > 1 && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.revenueEvolution}
            </Text>
            <View style={[styles.bigChartArea, { height: 140 }]}>
              {[0, 1, 2, 3].map(i => {
                const values = revenuePoints.map(p => p.montant);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const v = max - ((max - min) / 3) * i;
                return (
                  <Text
                    key={i}
                    style={[styles.chartYLabel, { color: theme.text, top: (140 / 3) * i }]}
                  >
                    {formatPrice(v, true)}
                  </Text>
                );
              })}
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
                        transformOrigin: 'left center',
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
                        evolution?.evolutionRevenus?.[evolution.evolutionRevenus.length - 1]?.date || '',
                      ).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.chartTooltipValue}>
                      {formatPrice(revenuePoints[revenuePoints.length - 1].montant)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.chartXRow, { marginLeft: 40 }]}>
                {(evolution?.evolutionRevenus || []).map((d, i) => (
                  <Text key={i} style={[styles.chartXLabel, { color: theme.text }]}>
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

        {/* Quick actions */}
        <View style={styles.quickSection}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.quickActions}
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => navigation.navigate('AgencyNewTrip', {})}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={22} color="#fff" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>{t.newTrip}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => navigation.navigate('AgencyPlanning')}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>{t.planning}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => navigation.navigate('trips' as any)}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: '#fef3c715' }]}>
                <Ionicons name="bus-outline" size={22} color="#d97706" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>{t.myTrips}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => navigation.navigate('resources' as any)}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: '#f5f3ff15' }]}>
                <Ionicons name="people-outline" size={22} color="#7c3aed" />
              </View>
              <Text style={[styles.quickBtnText, { color: theme.textStrong }]}>{t.resources}</Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  headerName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerLogo: { width: 120, height: 48 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  hamburgerBtn: { padding: spacing.xs },

  greetingSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  greetingText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },

  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 4,
    padding: spacing.md,
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
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md, color: '#fff' },
  agencyLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  agencyLocation: { ...typography.body, fontSize: typography.sizes.xs, color: 'rgba(255,255,255,0.8)' },
  agencyActiveBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  agencyActiveBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs, color: '#fff' },

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
  cardTitle: { ...typography.bodyBold, fontSize: typography.sizes.md, marginBottom: spacing.md },

  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  legendCol: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  legendValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },

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
  reservAvatarText: { ...typography.bodyBold, fontSize: typography.sizes.sm, color: '#fff' },
  reservInfo: { flex: 1 },
  reservRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  reservMeta: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  reservRight: { alignItems: 'flex-end', gap: 4 },
  reservBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  reservBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  reservAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  bigChartArea: { position: 'relative', marginTop: spacing.sm },
  bigChartLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 20 },
  chartYLabel: { position: 'absolute', left: 0, ...typography.body, fontSize: 9 },
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
  chartTooltipValue: { ...typography.bodyBold, fontSize: typography.sizes.xs, color: '#fff' },

  quickSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
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
  quickBtnText: { ...typography.body, fontSize: typography.sizes.xs, textAlign: 'center' },
});
