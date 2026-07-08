import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
import { EmptyState } from '../../../../components/empty-state';
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

type Reservation = {
  reservation: {
    idReservation: string;
    statutReservation: string;
    statutPayement: string;
    nbrPassager: number;
    prixTotal: number;
  };
  voyage: {
    lieuDepart: string;
    lieuArrive: string;
    dateDepartPrev: string;
    heureDepartEffectif: string;
    smallImage?: string | null;
  };
  agence: {
    longName: string;
    shortName: string;
  };
};

const STATUS_RESERVATION: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  RESERVER: {
    label: 'Réservé',
    labelEn: 'Reserved',
    color: '#d97706',
    bg: '#fef3c720',
  },
  CONFIRMEE: {
    label: 'Confirmée',
    labelEn: 'Confirmed',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_ATTENTE: {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c720',
  },
  ANNULEE: {
    label: 'Annulée',
    labelEn: 'Cancelled',
    color: '#6b7280',
    bg: '#6b728015',
  },
};

const STATUS_PAYMENT: Record<
  string,
  { label: string; labelEn: string; color: string }
> = {
  PAID: { label: 'Payé', labelEn: 'Paid', color: colors.success },
  NO_PAYMENT: { label: 'Non payé', labelEn: 'Unpaid', color: '#ef4444' },
  PAIEMENT: { label: 'Paiement', labelEn: 'Payment', color: '#d97706' },
  ANNULEE: { label: 'Annulé', labelEn: 'Cancelled', color: '#6b7280' },
};

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

export default function Dashboard() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [historiques, setHistoriques] = useState<Historique[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
      seeAll: 'Voir tout',
      noReservations: 'Aucune réservation récente',
      passengers: (n: number) => `${n} passager${n > 1 ? 's' : ''}`,
      seeDetails: 'Voir détails',
      ticket: 'Billet',
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
      seeAll: 'See all',
      noReservations: 'No recent reservations',
      passengers: (n: number) => `${n} passenger${n > 1 ? 's' : ''}`,
      seeDetails: 'See details',
      ticket: 'Ticket',
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

      const [histRes, resListRes] = await Promise.all([
        fetch(`${API_URL}/historique/reservation/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/reservation/user/${userId}?page=0&size=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (histRes.ok) {
        const histData: Historique[] = await histRes.json();
        setHistoriques(histData);
      }

      if (resListRes.ok) {
        const resData = await resListRes.json();
        setReservations(resData.content || []);
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

  const completed = historiques.filter(h => h.statusHistorique === 'TERMINE');
  const cancelled = historiques.filter(h => h.statusHistorique === 'ANNULE');
  const destinations = new Set(
    reservations.map(r => r.voyage.lieuArrive),
  ).size;

  const paidReservations = reservations.filter(
    r => r.reservation.statutPayement === 'PAID',
  );
  const upcoming = paidReservations.filter(
    r => new Date(r.voyage.dateDepartPrev) > new Date(),
  );
  const recentReservations = (upcoming.length > 0 ? upcoming : paidReservations).slice(0, 3);

  const ReservationCard = ({ item }: { item: Reservation }) => {
    const statusRes =
      STATUS_RESERVATION[item.reservation.statutReservation] ||
      STATUS_RESERVATION.RESERVER;
    const statusPay =
      STATUS_PAYMENT[item.reservation.statutPayement] ||
      STATUS_PAYMENT.NO_PAYMENT;
    const isCancelled = item.reservation.statutReservation === 'ANNULEE';

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardTop}>
          <View
            style={[styles.cardImage, { backgroundColor: theme.backgroundAlt }]}
          >
            {item.voyage.smallImage?.startsWith('http') ? (
              <Image
                source={{ uri: item.voyage.smallImage }}
                style={styles.cardImageInner}
                resizeMode="cover"
              />
            ) : (
              <TripPlaceholder width="100%" height="100%" />
            )}
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardBadges}>
              <Text style={[styles.agencyName, { color: theme.text }]}>
                {item.agence.longName}
              </Text>
              <View style={[styles.badge, { backgroundColor: statusRes.bg }]}>
                <Text style={[styles.badgeText, { color: statusRes.color }]}>
                  {lang === 'fr' ? statusRes.label : statusRes.labelEn}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <View
                  style={[styles.dot, { backgroundColor: statusPay.color }]}
                />
                <Text style={[styles.paymentText, { color: statusPay.color }]}>
                  {lang === 'fr' ? statusPay.label : statusPay.labelEn}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardRoute, { color: theme.textStrong }]}>
              {lang === 'fr'
                ? `De ${item.voyage.lieuDepart} vers ${item.voyage.lieuArrive}`
                : `from ${item.voyage.lieuDepart} to ${item.voyage.lieuArrive}`}
            </Text>

            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={12} color={theme.text} />
              <Text style={[styles.cardMetaText, { color: theme.text }]}>
                {' '}
                {formatDate(item.voyage.dateDepartPrev, lang)}
                {item.voyage.heureDepartEffectif
                  ? ` · ${formatTime(item.voyage.heureDepartEffectif)}`
                  : ''}
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <View style={styles.cardMetaItem}>
                <Ionicons name="person-outline" size={12} color={theme.text} />
                <Text style={[styles.cardMetaText, { color: theme.text }]}>
                  {' '}
                  {t.passengers(item.reservation.nbrPassager)}
                </Text>
              </View>
              <Text style={[styles.cardPrice, { color: colors.primary }]}>
                {formatPrice(item.reservation.prixTotal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() =>
              navigation.navigate('BookingDetails', {
                reservationId: item.reservation.idReservation,
              })
            }
          >
            <Text style={[styles.detailsBtnText, { color: theme.text }]}>
              {t.seeDetails}
            </Text>
          </TouchableOpacity>

          {!isCancelled && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={() =>
                navigation.navigate('BookingDetails', {
                  reservationId: item.reservation.idReservation,
                })
              }
            >
              <Ionicons
                name="qr-code-outline"
                size={14}
                color={theme.textStrong}
              />
              <Text
                style={[styles.actionBtnText, { color: theme.textStrong }]}
              >
                {t.ticket}
              </Text>
            </TouchableOpacity>
          )}

          {isCancelled && (
            <TouchableOpacity style={styles.detailsBtn}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <View
                style={[styles.statIcon, { backgroundColor: `${colors.primary}10` }]}
              >
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
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
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <View
                style={[styles.statIcon, { backgroundColor: `${colors.error}10` }]}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
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
                { backgroundColor: theme.background, borderColor: theme.border },
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
                { backgroundColor: theme.background, borderColor: theme.border },
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
        <View style={[styles.listSection, { paddingBottom: spacing.xl }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.recentReservations}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ClientMain', { screen: 'bookings' })
              }
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>
          {recentReservations.length === 0 ? (
            <EmptyState
              type="result"
              message={t.noReservations}
              textColor={theme.text}
            />
          ) : (
            recentReservations.map(item => (
              <ReservationCard
                key={item.reservation.idReservation}
                item={item}
              />
            ))
          )}
        </View>
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
  card: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImageInner: { width: '100%', height: '100%' },
  cardInfo: { flex: 1, gap: spacing.xs },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  agencyName: { ...typography.body, fontSize: typography.sizes.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  paymentText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  cardRoute: { ...typography.heading, fontSize: typography.sizes.md },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { ...typography.body, fontSize: typography.sizes.xs },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center' },
  cardPrice: { ...typography.bodyBold, fontSize: typography.sizes.md },
  cardDivider: { height: 1 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailsBtn: { paddingVertical: spacing.xs },
  detailsBtnText: { ...typography.body, fontSize: typography.sizes.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  actionBtnText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
