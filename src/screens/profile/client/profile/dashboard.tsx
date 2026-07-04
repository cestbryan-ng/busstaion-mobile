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
import { SkeletonClientDashboard } from '../../../../components/skeleton';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';

type User = {
  first_name: string;
  last_name: string;
  userId?: string;
  id?: string;
};

type Historique = {
  idHistorique: string;
  statusHistorique: string;
  idReservation: string;
  dateReservation: string;
  dateAnnulation?: string;
};

type ReservationApiItem = {
  reservation: { idReservation: string };
  voyage: {
    lieuDepart: string;
    lieuArrive: string;
    dateDepartPrev: string;
    smallImage?: string | null;
  };
  agence: { longName: string };
};

type ReservationDetail = {
  idReservation: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev?: string;
  nomAgence?: string;
  smallImage?: string | null;
};

type EnrichedHistorique = Historique & { detail: ReservationDetail | null };

function mapToDetail(item: ReservationApiItem): ReservationDetail {
  return {
    idReservation: item.reservation.idReservation,
    lieuDepart: item.voyage.lieuDepart,
    lieuArrive: item.voyage.lieuArrive,
    dateDepartPrev: item.voyage.dateDepartPrev,
    nomAgence: item.agence.longName,
    smallImage: item.voyage.smallImage,
  };
}

export default function Dashboard() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [historiques, setHistoriques] = useState<EnrichedHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Tableau de bord',
      greeting: (name: string) => `Bonjour, ${name} 👋`,
      subtitle: 'Voici un aperçu de vos activités',
      stats: 'Statistiques',
      successTrips: 'Voyages réussis',
      cancellations: 'Annulations',
      totalReservations: 'Réservations totales',
      destinations: 'Destinations visitées',
      recentReservations: 'Réservations récentes',
      recentCancellations: 'Annulations récentes',
      seeAll: 'Voir tout',
      completed: 'TERMINÉ',
      cancelled: 'ANNULÉ',
      pending: 'EN ATTENTE',
    },
    en: {
      title: 'Dashboard',
      greeting: (name: string) => `Hello, ${name} 👋`,
      subtitle: 'Here is an overview of your activities',
      stats: 'Statistics',
      successTrips: 'Successful trips',
      cancellations: 'Cancellations',
      totalReservations: 'Total reservations',
      destinations: 'Visited destinations',
      recentReservations: 'Recent reservations',
      recentCancellations: 'Recent cancellations',
      seeAll: 'See all',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
      pending: 'PENDING',
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

      const userData = userRaw ? JSON.parse(userRaw) : null;
      setUser(userData);
      const userId = userData?.userId || userData?.id;
      if (!userId) return;

      const histRes = await fetch(
        `${API_URL}/historique/reservation/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!histRes.ok) return;

      const data = await histRes.json();
      const histList: Historique[] = data;

      // Récupère la liste complète des réservations en un seul appel
      const resListRes = await fetch(
        `${API_URL}/reservation/user/${userId}?page=0&size=100`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const resListData = resListRes.ok
        ? await resListRes.json()
        : { content: [] };
      const reservationItems: ReservationApiItem[] = resListData.content || [];

      const reservationMap = new Map<string, ReservationDetail>();
      reservationItems.forEach(item => {
        reservationMap.set(item.reservation.idReservation, mapToDetail(item));
      });

      const enriched: EnrichedHistorique[] = histList.map(h => ({
        ...h,
        detail: reservationMap.get(h.idReservation) || null,
      }));

      setHistoriques(enriched);

      setHistoriques(enriched);
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

  const completed = historiques.filter(h => h.statusHistorique === 'TERMINE');
  const cancelled = historiques.filter(h => h.statusHistorique === 'ANNULE');
  const destinations = new Set(
    historiques.filter(h => h.detail).map(h => h.detail?.lieuArrive),
  ).size;

  const recentCompleted = completed.slice(0, 3);
  const recentCancelled = cancelled.slice(0, 1);

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      VALIDER: {
        label: t.completed,
        color: colors.primary,
        bg: `${colors.primary}15`,
      },
      TERMINE: {
        label: t.completed,
        color: colors.primary,
        bg: `${colors.primary}15`,
      },
      ANNULE: {
        label: t.cancelled,
        color: colors.error,
        bg: `${colors.error}15`,
      },
      EN_ATTENTE: { label: t.pending, color: '#d97706', bg: '#fef3c715' },
    }[status] || { label: status, color: theme.text, bg: theme.backgroundAlt };

    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const HistoriqueCard = ({ item }: { item: EnrichedHistorique }) => (
    <TouchableOpacity
      style={[
        styles.histCard,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('BookingDetails', {
          reservationId: item.idReservation,
        })
      }
    >
      <View
        style={[styles.histImage, { backgroundColor: theme.backgroundAlt }]}
      >
        {item.detail?.smallImage ? (
          <Image
            source={{ uri: item.detail.smallImage }}
            style={styles.histImageInner}
            resizeMode="cover"
          />
        ) : (
          <TripPlaceholder width="100%" height="100%" />
        )}
      </View>
      <View style={styles.histInfo}>
        <Text
          style={[styles.histRoute, { color: theme.textStrong }]}
          numberOfLines={1}
        >
          {item.detail?.lieuDepart || '—'} → {item.detail?.lieuArrive || '—'}
        </Text>
        <Text style={[styles.histMeta, { color: theme.text }]}>
          {item.detail?.dateDepartPrev
            ? new Date(item.detail.dateDepartPrev).toLocaleDateString(
                lang === 'fr' ? 'fr-FR' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )
            : '—'}
        </Text>
        <Text style={[styles.histAgency, { color: theme.text }]}>
          {item.detail?.nomAgence || '—'}
        </Text>
      </View>
      <StatusBadge status={item.statusHistorique} />
    </TouchableOpacity>
  );

  if (loading) return <SkeletonClientDashboard />;

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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ width: 24 }} />
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
        {/* Welcome Banner */}
        <View
          style={[
            styles.welcomeBanner,
            {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}20`,
            },
          ]}
        >
          <View style={styles.welcomeText}>
            <Text style={[styles.welcomeGreeting, { color: theme.textStrong }]}>
              {t.greeting(user?.first_name || '')}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.text }]}>
              {t.subtitle}
            </Text>
          </View>
          <View
            style={[
              styles.welcomeIllustration,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Ionicons name="bus" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.stats}
          </Text>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {completed.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.successTrips}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.error}10` },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={colors.error}
                />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {cancelled.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.cancellations}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: '#f0fdf415' }]}>
                <Ionicons name="bag-outline" size={22} color={colors.success} />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {historiques.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.totalReservations}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: '#fef9c310' }]}>
                <Ionicons name="location-outline" size={22} color="#f59e0b" />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {destinations}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.destinations}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Reservations */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.recentReservations}
            </Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>
          {recentCompleted.map(item => (
            <HistoriqueCard key={item.idHistorique} item={item} />
          ))}
        </View>

        {/* Recent Cancellations */}
        {recentCancelled.length > 0 && (
          <View style={[styles.listSection, { paddingBottom: spacing.xl }]}>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.recentCancellations}
              </Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  {t.seeAll}
                </Text>
              </TouchableOpacity>
            </View>
            {recentCancelled.map(item => (
              <HistoriqueCard key={item.idHistorique} item={item} />
            ))}
          </View>
        )}
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
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  welcomeText: { flex: 1 },
  welcomeGreeting: { ...typography.heading, fontSize: typography.sizes.lg },
  welcomeSubtitle: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  welcomeIllustration: {
    width: 72,
    height: 72,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.xl },
  statLabel: { ...typography.body, fontSize: typography.sizes.sm },
  listSection: { paddingHorizontal: spacing.lg },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  histCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  histImage: {
    width: 64,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  histImageInner: { width: '100%', height: '100%' },
  histInfo: { flex: 1 },
  histRoute: { ...typography.bodyBold, fontSize: typography.sizes.md },
  histMeta: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  histAgency: { ...typography.body, fontSize: typography.sizes.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 4 },
  badgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
});
