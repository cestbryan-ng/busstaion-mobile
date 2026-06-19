import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import ConfirmModal from '../../../../components/confirm-modal';
import type { RootStackParamList } from '../../../../navigation';

type Booking = {
  reservation: {
    idReservation: string;
    statutReservation: string;
    prixTotal: number;
    dateReservation?: string;
  };
  voyage?: { idVoyage: string; titre?: string };
  passagers?: { nom: string; siege?: string }[];
  customerName?: string;
};

type StatusFilter = 'ALL' | 'CONFIRMER' | 'RESERVER' | 'ANNULER' | 'VALIDER';

const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  CONFIRMER: {
    label: 'CONFIRMÉE',
    labelEn: 'CONFIRMED',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  RESERVER: {
    label: 'EN ATTENTE',
    labelEn: 'PENDING',
    color: '#d97706',
    bg: '#fef3c715',
  },
  ANNULER: {
    label: 'ANNULÉE',
    labelEn: 'CANCELLED',
    color: colors.error,
    bg: `${colors.error}15`,
  },
  VALIDER: {
    label: 'VALIDÉE',
    labelEn: 'VALIDATED',
    color: colors.success,
    bg: `${colors.success}15`,
  },
};

export default function AgencyTripBookings() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyTripBookings'>>();
  const { tripId, tripTitle } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const t = {
    fr: {
      title: 'Réservations',
      search: 'Rechercher par nom, siège ou ID...',
      all: 'Tout',
      confirmed: 'Confirmées',
      pending: 'En attente',
      cancelled: 'Annulées',
      confirmed_stat: 'Confirmées',
      pending_stat: 'En attente',
      cancelled_stat: 'Annulées',
      revenue: 'Revenus',
      exportList: 'Exporter la liste',
      cancelTitle: 'Annuler la réservation',
      cancelMessage: 'Voulez-vous vraiment annuler cette réservation ?',
      confirmCancel: 'Oui, annuler',
      no: 'Non',
      noBookings: 'Aucune réservation',
    },
    en: {
      title: 'Bookings',
      search: 'Search by name, seat or ID...',
      all: 'All',
      confirmed: 'Confirmed',
      pending: 'Pending',
      cancelled: 'Cancelled',
      confirmed_stat: 'Confirmed',
      pending_stat: 'Pending',
      cancelled_stat: 'Cancelled',
      revenue: 'Revenue',
      exportList: 'Export list',
      cancelTitle: 'Cancel booking',
      cancelMessage: 'Are you sure you want to cancel this booking?',
      confirmCancel: 'Yes, cancel',
      no: 'No',
      noBookings: 'No bookings',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
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
        const agencyRes = await fetch(
          `${API_URL}/agence/chef-agence/${chefId}`,
          { headers },
        );
        if (!agencyRes.ok) return;
        const agency = await agencyRes.json();

        const res = await fetch(
          `${API_URL}/reservation/agence/${agency.agencyId}?size=100`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          const all = data.content || data || [];
          // Filter by tripId if provided
          const filtered = tripId
            ? all.filter((b: Booking) => b.voyage?.idVoyage === tripId)
            : all;
          setBookings(filtered);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  const confirmed = bookings.filter(
    b => b.reservation.statutReservation === 'CONFIRMER',
  ).length;
  const pending = bookings.filter(
    b => b.reservation.statutReservation === 'RESERVER',
  ).length;
  const cancelled = bookings.filter(
    b => b.reservation.statutReservation === 'ANNULER',
  ).length;
  const revenue = bookings
    .filter(
      b =>
        b.reservation.statutReservation === 'CONFIRMER' ||
        b.reservation.statutReservation === 'VALIDER',
    )
    .reduce((sum, b) => sum + (b.reservation.prixTotal || 0), 0);

  const filtered = bookings.filter(b => {
    if (
      statusFilter !== 'ALL' &&
      b.reservation.statutReservation !== statusFilter
    )
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = b.customerName || b.passagers?.[0]?.nom || '';
      const id = b.reservation.idReservation;
      const seat = b.passagers?.[0]?.siege || '';
      return (
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        seat.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/reservation/annuler-by-agence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idReservation: selectedId,
          motif:
            'Annulation administrative effectuée depuis le tableau de bord agence.',
        }),
      });
      setBookings(prev =>
        prev.filter(b => b.reservation.idReservation !== selectedId),
      );
      setCancelModal(false);
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  const handleExport = async () => {
    const text = filtered
      .map(b => {
        const name = b.customerName || b.passagers?.[0]?.nom || '—';
        const seat = b.passagers?.map(p => p.siege).join(', ') || '—';
        return `${b.reservation.idReservation} · ${name} · ${seat} · ${b.reservation.prixTotal} FCFA · ${b.reservation.statutReservation}`;
      })
      .join('\n');
    await Share.share({
      message: `${tripTitle || 'Réservations'}\n\n${text}`,
      title: tripTitle,
    });
  };

  const BookingRow = ({ item, index }: { item: Booking; index: number }) => {
    const name = item.customerName || item.passagers?.[0]?.nom || '—';
    const seats = item.passagers?.map(p => p.siege).filter(Boolean) || [];
    const statusCfg =
      STATUS_CONFIG[item.reservation.statutReservation] ||
      STATUS_CONFIG.RESERVER;
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(n => n.charAt(0).toUpperCase())
      .join('');
    const avatarColors = [
      '#4f46e5',
      '#0891b2',
      '#059669',
      '#d97706',
      '#dc2626',
      '#7c3aed',
    ];
    const avatarColor = avatarColors[index % avatarColors.length];
    const date = item.reservation.dateReservation
      ? new Date(item.reservation.dateReservation).toLocaleDateString(
          lang === 'fr' ? 'fr-FR' : 'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' },
        )
      : '—';
    const time = item.reservation.dateReservation
      ? new Date(item.reservation.dateReservation).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <TouchableOpacity
        style={[styles.bookingRow, { borderBottomColor: theme.border }]}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.bookingInfo}>
          <View style={styles.bookingTopRow}>
            <Text style={[styles.customerName, { color: theme.textStrong }]}>
              {name}
            </Text>
            {seats.length > 0 && (
              <View
                style={[
                  styles.seatBadge,
                  { backgroundColor: theme.backgroundAlt },
                ]}
              >
                <Text style={[styles.seatText, { color: theme.text }]}>
                  {seats[0]}
                </Text>
              </View>
            )}
            <View
              style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>
          <Text style={[styles.refText, { color: theme.text }]}>
            Réf: {item.reservation.idReservation}
          </Text>
          <Text style={[styles.dateText, { color: theme.text }]}>
            {date}
            {time ? ` · ${time}` : ''}
          </Text>
          <Text style={[styles.amountText, { color: theme.text }]}>
            {item.reservation.prixTotal?.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        {/* Chevron */}
        <TouchableOpacity
          onPress={() => {
            setSelectedId(item.reservation.idReservation);
            setCancelModal(true);
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: t.all },
    { key: 'CONFIRMER', label: t.confirmed },
    { key: 'RESERVER', label: t.pending },
    { key: 'ANNULER', label: t.cancelled },
  ];

  return (
    <>
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: theme.textStrong }]}>
              {t.title}
            </Text>
            {tripTitle && (
              <Text style={[styles.subtitle, { color: theme.text }]}>
                {tripTitle}
              </Text>
            )}
          </View>
          <TouchableOpacity>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchRow,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
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
              placeholder={t.search}
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

        {/* Stats */}
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {confirmed}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.confirmed_stat}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>
              {pending}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.pending_stat}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {cancelled}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.cancelled_stat}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {revenue >= 1000
                ? `${(revenue / 1000).toFixed(0)}K`
                : revenue.toLocaleString('fr-FR')}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.revenue}
            </Text>
          </View>
        </View>

        {/* Status filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.tabsScroll,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
          contentContainerStyle={styles.tabsContent}
        >
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                statusFilter === tab.key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      statusFilter === tab.key ? colors.primary : theme.text,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Bookings list */}
          <View
            style={[
              styles.list,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="calendar-outline"
                  size={36}
                  color={theme.text}
                />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  {t.noBookings}
                </Text>
              </View>
            ) : (
              filtered.map((item, i) => (
                <BookingRow
                  key={item.reservation.idReservation}
                  item={item}
                  index={i}
                />
              ))
            )}
          </View>

          {/* Export */}
          <TouchableOpacity
            style={[
              styles.exportBtn,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={handleExport}
          >
            <Ionicons
              name="download-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.exportText, { color: colors.primary }]}>
              {t.exportList}
            </Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>

      <ConfirmModal
        visible={cancelModal}
        title={t.cancelTitle}
        message={t.cancelMessage}
        confirmText={cancelling ? '...' : t.confirmCancel}
        cancelText={t.no}
        onConfirm={handleCancel}
        onCancel={() => setCancelModal(false)}
      />
    </>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  subtitle: { ...typography.body, fontSize: typography.sizes.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
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
  searchText: { ...typography.body, flex: 1, fontSize: typography.sizes.sm },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  tabsScroll: { borderBottomWidth: 1, maxHeight: 48 },
  tabsContent: { paddingHorizontal: spacing.lg },
  tabBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  list: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
  bookingInfo: { flex: 1 },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  customerName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  seatBadge: {
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  seatText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  refText: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  dateText: { ...typography.body, fontSize: typography.sizes.xs },
  amountText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    height: 48,
  },
  exportText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
