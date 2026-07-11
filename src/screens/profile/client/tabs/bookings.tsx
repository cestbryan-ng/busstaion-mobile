import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
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
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { useDebounce } from '../../../../hooks/useDebounce';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';

type Reservation = {
  reservation: {
    idReservation: string;
    statutReservation: string;
    statutPayement: string;
    dateReservation: string;
    dateConfirmation: string | null;
    nbrPassager: number;
    prixTotal: number;
    montantPaye: number;
    transactionCode: string | null;
  };
  voyage: {
    idVoyage: string;
    titre: string | null;
    lieuDepart: string;
    lieuArrive: string;
    dateDepartPrev: string;
    heureDepartEffectif: string;
    heureArrive: string;
    dureeVoyage: string | null;
    statusVoyage: string;
    smallImage?: string | null;
  };
  agence: {
    agencyId: string;
    longName: string;
    shortName: string;
    location: string;
  };
};

type TabType = 'avenir' | 'terminees';
type FilterType = 'TOUS' | 'PAID' | 'NO_PAYMENT' | 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';

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

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

export default function Bookings() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isOffline, setIsOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [tab, setTab] = useState<TabType>('avenir');
  const [filter, setFilter] = useState<FilterType>('TOUS');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const t = {
    fr: {
      title: 'Mes réservations',
      tabUpcoming: 'À venir',
      tabDone: 'Terminées',
      searchPlaceholder: 'Rechercher un voyage, une agence...',
      all: 'Tous',
      paid: 'Payé',
      noPayment: 'Cash',
      confirmed: 'Confirmé',
      pending: 'En attente',
      cancelled: 'Annulé',
      passengers: (n: number) => `${n} passager${n > 1 ? 's' : ''}`,
      seeDetails: 'Voir détails',
      pay: 'Payer',
      ticket: 'Billet',
      noReservations: 'Aucune réservation',
      page: 'Page',
    },
    en: {
      title: 'My reservations',
      tabUpcoming: 'Upcoming',
      tabDone: 'Past',
      searchPlaceholder: 'Search a trip, an agency...',
      all: 'All',
      paid: 'Paid',
      noPayment: 'Cash',
      confirmed: 'Confirmed',
      pending: 'Pending',
      cancelled: 'Cancelled',
      passengers: (n: number) => `${n} passenger${n > 1 ? 's' : ''}`,
      seeDetails: 'See details',
      pay: 'Pay',
      ticket: 'Ticket',
      noReservations: 'No reservations',
      page: 'Page',
    },
  }[lang];

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'TOUS', label: t.all },
    { key: 'PAID', label: t.paid },
    { key: 'NO_PAYMENT', label: t.noPayment },
    { key: 'CONFIRMEE', label: t.confirmed },
    { key: 'EN_ATTENTE', label: t.pending },
    { key: 'ANNULEE', label: t.cancelled },
  ];

  const loadReservations = useCallback(async (page = 0, reset = true) => {
    if (!reset) setLoadingMore(true);
    try {
      const [userRaw, token, storedLang] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);

      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const userId = user?.userId || user?.id;
      if (!userId) return;

      const cacheKey = `bookings_${userId}_${page}`;
      const res = await fetch(
        `${API_URL}/reservation/user/${userId}?page=${page}&size=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.ok) {
        const data = await res.json();
        const content = data.content || [];
        setReservations(prev => (reset ? content : [...prev, ...content]));
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
        setCache(cacheKey, { content, totalPages: data.totalPages || 1 });
        if (reset) setIsOffline(false);
      } else {
        const cached = await getCache<{ content: Reservation[]; totalPages: number }>(cacheKey);
        if (cached && reset) {
          setReservations(cached.content);
          setTotalPages(cached.totalPages);
          setCurrentPage(page);
          setIsOffline(true);
        }
      }
    } catch {
      const user2 = await AsyncStorage.getItem('user');
      const userId2 = user2 ? JSON.parse(user2)?.userId || JSON.parse(user2)?.id : null;
      if (userId2 && reset) {
        const cached = await getCache<{ content: Reservation[]; totalPages: number }>(`bookings_${userId2}_0`);
        if (cached) {
          setReservations(cached.content);
          setTotalPages(cached.totalPages);
          setIsOffline(true);
        }
      }
    } finally {
      setLoading(false);
      if (!reset) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReservations(0, true);
    setRefreshing(false);
  }, [loadReservations]);

  const loadMore = useCallback(() => {
    if (loadingMore || currentPage >= totalPages - 1) return;
    loadReservations(currentPage + 1, false);
  }, [loadingMore, currentPage, totalPages, loadReservations]);

  const filtered = reservations.filter(r => {
    const upcoming = isUpcoming(r.voyage.dateDepartPrev);
    if (tab === 'avenir' && !upcoming) return false;
    if (tab === 'terminees' && upcoming) return false;

    if (filter === 'PAID' && r.reservation.statutPayement !== 'PAID')
      return false;
    if (filter === 'NO_PAYMENT' && r.reservation.statutPayement !== 'NO_PAYMENT')
      return false;
    if (
      filter === 'CONFIRMEE' &&
      r.reservation.statutReservation !== 'CONFIRMEE'
    )
      return false;
    if (
      filter === 'EN_ATTENTE' &&
      r.reservation.statutReservation !== 'EN_ATTENTE'
    )
      return false;
    if (filter === 'ANNULEE' && r.reservation.statutReservation !== 'ANNULEE')
      return false;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      return (
        r.voyage.lieuDepart.toLowerCase().includes(q) ||
        r.voyage.lieuArrive.toLowerCase().includes(q) ||
        r.agence.longName.toLowerCase().includes(q) ||
        r.agence.shortName.toLowerCase().includes(q) ||
        (r.voyage.titre?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const ReservationCard = ({ item }: { item: Reservation }) => {
    const statusRes =
      STATUS_RESERVATION[item.reservation.statutReservation] ||
      STATUS_RESERVATION.RESERVER;
    const statusPay =
      STATUS_PAYMENT[item.reservation.statutPayement] ||
      STATUS_PAYMENT.NO_PAYMENT;
    const isCancelled = item.reservation.statutReservation === 'ANNULEE';
    const isCash = item.reservation.statutPayement === 'NO_PAYMENT';

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {/* Card top */}
        <View style={styles.cardTop}>
          {/* Bus image */}
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

          {/* Info */}
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

        {/* Divider */}
        <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

        {/* Card bottom actions */}
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

          {!isCancelled && !isCash && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={() =>
                navigation.navigate('BookingDetails', {
                  reservationId: item.reservation.idReservation,
                })
              }
            >
              <Ionicons name="qr-code-outline" size={14} color={theme.textStrong} />
              <Text style={[styles.actionBtnText, { color: theme.textStrong }]}>
                {t.ticket}
              </Text>
            </TouchableOpacity>
          )}

          {isCash && !isCancelled && (
            <View style={[styles.actionBtn, { borderColor: colors.success, backgroundColor: `${colors.success}0d` }]}>
              <Ionicons name="cash-outline" size={14} color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>
                {lang === 'fr' ? 'À régler' : 'Pay at agency'}
              </Text>
            </View>
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

  if (loading) {
    return <SkeletonListScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
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
        </View>

        {/* Offline banner */}
        {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

        {/* Tabs */}
        <View
          style={[
            styles.tabs,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {(['avenir', 'terminees'] as TabType[]).map(t2 => (
            <TouchableOpacity
              key={t2}
              style={[
                styles.tab,
                tab === t2 && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => {
                setTab(t2);
                setFilter('TOUS');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab === t2 ? colors.primary : theme.text },
                ]}
              >
                {t2 === 'avenir' ? t.tabUpcoming : t.tabDone}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={400}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            if (
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 100
            ) {
              loadMore();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={isOnline ? onRefresh : undefined}
              tintColor={colors.primary}
            />
          }
        >
          {/* Search */}
          <View
            style={[styles.searchRow, { backgroundColor: theme.background }]}
          >
            <View
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.searchText, { color: theme.textStrong }]}
                placeholder={t.searchPlaceholder}
                placeholderTextColor={theme.placeholder}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.filterIconBtn,
                {
                  borderColor: filter !== 'TOUS' ? colors.primary : theme.border,
                  backgroundColor: filter !== 'TOUS' ? `${colors.primary}10` : undefined,
                },
              ]}
              onPress={() => setShowFilters(v => !v)}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={filter !== 'TOUS' ? colors.primary : theme.textStrong}
              />
              {filter !== 'TOUS' && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
          </View>

          {/* Filter chips — visibles seulement si showFilters */}
          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.chip,
                    {
                      borderColor:
                        filter === f.key ? colors.primary : theme.border,
                    },
                    filter === f.key && {
                      backgroundColor: `${colors.primary}10`,
                    },
                  ]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: filter === f.key ? colors.primary : theme.text },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* List */}
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState
                type="calendar"
                message={t.noReservations}
                textColor={theme.text}
              />
            ) : (
              filtered.map(item => (
                <ReservationCard key={item.reservation.idReservation} item={item} />
              ))
            )}
          </View>

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ paddingVertical: spacing.lg }}
            />
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchText: {
    ...typography.body,
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
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
  cardImageInner: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  agencyName: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },
  cardRoute: {
    ...typography.heading,
    fontSize: typography.sizes.md,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  cardDivider: {
    height: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailsBtn: {
    paddingVertical: spacing.xs,
  },
  detailsBtnText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  actionBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: typography.sizes.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
});
