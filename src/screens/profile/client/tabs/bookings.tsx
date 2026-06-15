import React, { useState, useEffect, useCallback } from 'react';
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

type Passager = {
  idPassager: string;
  nom: string;
  telephone: string;
  carteID: string;
  age: number;
  genre: string;
  siege: string;
  prixBillet: number;
};

type Reservation = {
  idReservation: string;
  reservation: {
    idReservation: string;
    statutReservation: string;
    statutPayement: string;
    dateReservation: string;
    dateConfirmation: string;
  };
  voyage: {
    idVoyage: string;
    titre: string;
    lieuDepart: string;
    lieuArrive: string;
    dateDepartPrev: string;
    heureDepart: string;
    heureArrive: string;
    statusVoyage: string;
    prixTotal: number;
    photoUrl?: string;
  };
  agence: {
    agencyId: string;
    longName: string;
    location: string;
  };
  passagers: Passager[];
  nombrePassagers: number;
};

type TabType = 'avenir' | 'terminees';
type FilterType = 'TOUS' | 'PAID' | 'CONFIRMEE' | 'EN_ATTENTE' | 'ANNULEE';

const STATUS_RESERVATION: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
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
  PAIEMENT: { label: 'Paiement', labelEn: 'Payment', color: '#d97706' },
  ANNULEE: { label: 'Annulé', labelEn: 'Cancelled', color: '#6b7280' },
};

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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [tab, setTab] = useState<TabType>('avenir');
  const [filter, setFilter] = useState<FilterType>('TOUS');
  const [search, setSearch] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const t = {
    fr: {
      title: 'Mes réservations',
      tabUpcoming: 'À venir',
      tabDone: 'Terminées',
      searchPlaceholder: 'Rechercher un voyage, une agence...',
      all: 'Tous',
      paid: 'Payé',
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
    { key: 'CONFIRMEE', label: t.confirmed },
    { key: 'EN_ATTENTE', label: t.pending },
    { key: 'ANNULEE', label: t.cancelled },
  ];

  const loadReservations = useCallback(async (page = 0) => {
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

      const res = await fetch(
        `${API_URL}/reservation/user/${userId}?page=${page}&size=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.ok) {
        const data = await res.json();
        setReservations(data.content || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReservations(0);
    setRefreshing(false);
  }, [loadReservations]);

  const filtered = reservations.filter(r => {
    const upcoming = isUpcoming(r.voyage.dateDepartPrev);
    if (tab === 'avenir' && !upcoming) return false;
    if (tab === 'terminees' && upcoming) return false;

    if (filter === 'PAID' && r.reservation.statutPayement !== 'PAID')
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

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.voyage.lieuDepart.toLowerCase().includes(q) ||
        r.voyage.lieuArrive.toLowerCase().includes(q) ||
        r.agence.longName.toLowerCase().includes(q) ||
        r.voyage.titre?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ReservationCard = ({ item }: { item: Reservation }) => {
    const statusRes =
      STATUS_RESERVATION[item.reservation.statutReservation] ||
      STATUS_RESERVATION.EN_ATTENTE;
    const statusPay =
      STATUS_PAYMENT[item.reservation.statutPayement] ||
      STATUS_PAYMENT.PAIEMENT;
    const isPending = item.reservation.statutReservation === 'EN_ATTENTE';
    const isCancelled = item.reservation.statutReservation === 'ANNULEE';

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
            {item.voyage.photoUrl ? (
              <Image
                source={{ uri: item.voyage.photoUrl }}
                style={styles.cardImageInner}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="bus-outline" size={28} color={theme.text} />
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
              {item.voyage.lieuDepart} → {item.voyage.lieuArrive}
            </Text>

            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={12} color={theme.text} />
              <Text style={[styles.cardMetaText, { color: theme.text }]}>
                {' '}
                {formatDate(item.voyage.dateDepartPrev, lang)} •{' '}
                {item.voyage.heureDepart}
              </Text>
            </View>

            <View style={styles.cardFooterRow}>
              <View style={styles.cardMetaItem}>
                <Ionicons name="person-outline" size={12} color={theme.text} />
                <Text style={[styles.cardMetaText, { color: theme.text }]}>
                  {' '}
                  {t.passengers(item.nombrePassagers)}
                </Text>
              </View>
              <Text style={[styles.cardPrice, { color: colors.primary }]}>
                {formatPrice(item.voyage.prixTotal * item.nombrePassagers)}
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
                reservationId: item.idReservation,
              })
            }
          >
            <Text style={[styles.detailsBtnText, { color: theme.text }]}>
              {t.seeDetails}
            </Text>
          </TouchableOpacity>

          {!isCancelled &&
            (isPending ? (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#d97706' }]}
              >
                <Ionicons name="card-outline" size={14} color="#d97706" />
                <Text style={[styles.actionBtnText, { color: '#d97706' }]}>
                  {t.pay}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.border }]}
                onPress={() =>
                  navigation.navigate('BookingDetails', {
                    reservationId: item.idReservation,
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
            ))}

          {isCancelled && (
            <TouchableOpacity style={styles.detailsBtn}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i);

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[
            styles.pageBtn,
            { borderColor: theme.border, opacity: currentPage === 0 ? 0.4 : 1 },
          ]}
          onPress={() => currentPage > 0 && loadReservations(currentPage - 1)}
          disabled={currentPage === 0}
        >
          <Ionicons name="chevron-back" size={16} color={theme.textStrong} />
        </TouchableOpacity>

        {pages.map(p => (
          <TouchableOpacity
            key={p}
            style={[
              styles.pageBtn,
              { borderColor: theme.border },
              currentPage === p && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => loadReservations(p)}
          >
            <Text
              style={[
                styles.pageBtnText,
                { color: currentPage === p ? '#fff' : theme.textStrong },
              ]}
            >
              {p + 1}
            </Text>
          </TouchableOpacity>
        ))}

        {totalPages > 5 && (
          <Text
            style={[
              styles.pageBtnText,
              { color: theme.text, paddingHorizontal: spacing.xs },
            ]}
          >
            ...
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.pageBtn,
            {
              borderColor: theme.border,
              opacity: currentPage === totalPages - 1 ? 0.4 : 1,
            },
          ]}
          onPress={() =>
            currentPage < totalPages - 1 && loadReservations(currentPage + 1)
          }
          disabled={currentPage === totalPages - 1}
        >
          <Ionicons name="chevron-forward" size={16} color={theme.textStrong} />
        </TouchableOpacity>
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
      </View>

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: theme.background }]}>
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
              placeholderTextColor={theme.text}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterIconBtn, { borderColor: theme.border }]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
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
                  borderColor: filter === f.key ? colors.primary : theme.border,
                },
                filter === f.key && { backgroundColor: `${colors.primary}10` },
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

        {/* List */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.text} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {t.noReservations}
              </Text>
            </View>
          ) : (
            filtered.map(item => (
              <ReservationCard key={item.idReservation} item={item} />
            ))
          )}
        </View>

        <Pagination />
      </ScrollView>
    </View>
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
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
