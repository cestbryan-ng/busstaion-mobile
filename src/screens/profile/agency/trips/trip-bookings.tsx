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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { EmptyState } from '../../../../components/empty-state';
import { useToast } from '../../../../components/toast';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { useDebounce } from '../../../../hooks/useDebounce';

type Booking = {
  reservation: {
    idReservation: string;
    statutReservation: string;
    prixTotal: number;
    montantPaye?: number;
    dateReservation?: string;
    dateConfirmation?: string;
    nbrPassager?: number;
    statutPayement?: string;
    transactionCode?: string | null;
  };
  voyage?: {
    idVoyage: string;
    titre?: string;
    lieuDepart?: string;
    lieuArrive?: string;
    dateDepartPrev?: string;
  };
  agence?: { longName?: string; shortName?: string };
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
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

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
      bookingCancelled: 'Réservation annulée',
      cancelError: "Erreur lors de l'annulation",
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
      bookingCancelled: 'Booking cancelled',
      cancelError: 'Cancellation error',
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
      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers,
      });
      if (!agencyRes.ok) return;
      const agency = await agencyRes.json();
      const res = await fetch(
        `${API_URL}/reservation/agence/${agency.id}?size=100`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        const all = data.content || data || [];
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
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const route = `${b.voyage?.lieuDepart || ''} ${
        b.voyage?.lieuArrive || ''
      }`;
      const titre = b.voyage?.titre || '';
      const id = b.reservation.idReservation;
      return (
        route.toLowerCase().includes(q) ||
        titre.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error(
        lang === 'fr'
          ? 'Aucune réservation à exporter'
          : 'No bookings to export',
      );
      return;
    }
    try {
      const escape = (v: string | number) =>
        `"${String(v).replace(/"/g, '""')}"`;
      const statusLabel = (s: string) =>
        STATUS_CONFIG[s]
          ? lang === 'fr'
            ? STATUS_CONFIG[s].label
            : STATUS_CONFIG[s].labelEn
          : s;

      const headers =
        lang === 'fr'
          ? [
              'ID Réservation',
              'Client',
              'Sièges',
              'Prix (FCFA)',
              'Statut',
              'Date réservation',
            ]
          : [
              'Booking ID',
              'Customer',
              'Seats',
              'Price (FCFA)',
              'Status',
              'Booking date',
            ];

      const rows = filtered.map(b => {
        const route =
          b.voyage?.lieuDepart && b.voyage?.lieuArrive
            ? `${b.voyage.lieuDepart} → ${b.voyage.lieuArrive}`
            : b.voyage?.titre || '';
        const date = b.reservation.dateReservation
          ? new Date(b.reservation.dateReservation).toLocaleDateString(
              lang === 'fr' ? 'fr-FR' : 'en-GB',
            )
          : '';
        return [
          b.reservation.idReservation,
          route,
          b.reservation.nbrPassager || 1,
          b.reservation.prixTotal || 0,
          statusLabel(b.reservation.statutReservation),
          date,
        ]
          .map(escape)
          .join(',');
      });

      const csv = '﻿' + [headers.map(escape).join(','), ...rows].join('\n');
      const title = tripTitle || (lang === 'fr' ? 'Réservations' : 'Bookings');
      const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, csv, 'utf8');
      await RNShare.open({
        url: `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
        failOnCancel: false,
      });
    } catch {
      toast.error(lang === 'fr' ? "Erreur lors de l'export" : 'Export error');
    }
  };

  const BookingRow = ({ item, index }: { item: Booking; index: number }) => {
    const route =
      item.voyage?.lieuDepart && item.voyage?.lieuArrive
        ? `${item.voyage.lieuDepart} → ${item.voyage.lieuArrive}`
        : item.voyage?.titre || '—';
    const statusCfg =
      STATUS_CONFIG[item.reservation.statutReservation] ||
      STATUS_CONFIG.RESERVER;
    const avatarColors = [
      '#4f46e5',
      '#0891b2',
      '#059669',
      '#d97706',
      '#dc2626',
      '#7c3aed',
    ];
    const avatarColor = avatarColors[index % avatarColors.length];
    const initials = `R${index + 1}`;
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
      <View style={[styles.bookingRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.bookingInfo}>
          <View style={styles.bookingTopRow}>
            <Text
              style={[styles.customerName, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {route}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>
          <Text style={[styles.refText, { color: theme.text }]}>
            Réf: {item.reservation.idReservation.slice(0, 8)}…
          </Text>
          <Text style={[styles.dateText, { color: theme.text }]}>
            {date}
            {time ? ` · ${time}` : ''}
            {item.reservation.nbrPassager
              ? ` · ${item.reservation.nbrPassager} place${
                  item.reservation.nbrPassager > 1 ? 's' : ''
                }`
              : ''}
          </Text>
          <Text style={[styles.amountText, { color: theme.textStrong }]}>
            {item.reservation.prixTotal?.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      </View>
    );
  };

  const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: t.all },
    { key: 'CONFIRMER', label: t.confirmed },
    { key: 'RESERVER', label: t.pending },
    { key: 'ANNULER', label: t.cancelled },
  ];

  if (loading) return <SkeletonListScreen />;

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
          <View style={{ width: 24 }} />
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
              placeholderTextColor={theme.placeholder}
              value={search}
              onChangeText={setSearch}
            />
          </View>
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Bookings list */}
          <View
            style={[
              styles.list,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {filtered.length === 0 ? (
              <EmptyState
                type="calendar"
                message={t.noBookings}
                textColor={theme.text}
              />
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
    </KeyboardAvoidingView>
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
  filterPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  filterPanelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    marginBottom: 2,
  },
  filterPanelText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  dotMenuBtn: { padding: spacing.xs },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  menuSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuSheetText: { ...typography.body, fontSize: typography.sizes.md },
  menuSheetDivider: { height: 1, marginHorizontal: spacing.lg },
});
