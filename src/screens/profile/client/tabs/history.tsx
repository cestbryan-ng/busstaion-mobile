import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Share,
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
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { MonthPickerModal } from '../../../../components/month-picker-modal';
import { useDebounce } from '../../../../hooks/useDebounce';
import TripPlaceholder from '../../../../assets/placeholders/product.svg';

type Passager = {
  nom: string;
  telephone: string;
  carteID: string;
  age: number;
  genre: string;
  siege: string;
  prixBillet: number;
};

type ReservationApiItem = {
  reservation: {
    idReservation: string;
    nbrPassager: number;
    prixTotal: number;
  };
  voyage: {
    lieuDepart: string;
    lieuArrive: string;
    pointDeDepart?: string;
    pointArrivee?: string;
    heureDepartEffectif?: string;
    heureArrive: string;
    dateDepartPrev: string;
    statusVoyage: string;
    smallImage?: string | null;
  };
  agence: { longName: string };
};

type ReservationDetail = {
  idReservation: string;
  lieuDepart: string;
  lieuArrive: string;
  pointDeDepart?: string;
  pointArrivee?: string;
  heureDepartEffectif?: string;
  heureArrive: string;
  dateDepartPrev: string;
  nomAgence: string;
  statusVoyage: string;
  nbrPassager: number;
  prixTotal: number;
  smallImage?: string | null;
};

type HistoriqueRaw = {
  idHistorique: string;
  statusHistorique: string;
  dateReservation: string;
  dateConfirmation?: string;
  dateAnnulation?: string;
  causeAnnulation?: string;
  origineAnnulation?: string;
  tauxAnnulation?: number;
  compensation?: number;
  idReservation: string;
};

type HistoriqueEnrichi = HistoriqueRaw & {
  reservation: ReservationDetail | null;
};

type TabType = 'reservations' | 'annulations';
type DateFilter = 'all' | 'month' | '3months' | 'year';

const STATUS_COLORS: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  TERMINE: {
    label: 'Terminé',
    labelEn: 'Completed',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_ATTENTE: {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c715',
  },
  ANNULE: {
    label: 'Annulé',
    labelEn: 'Cancelled',
    color: '#6b7280',
    bg: '#6b728015',
  },
  EN_COURS: {
    label: 'En cours',
    labelEn: 'Ongoing',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  VALIDER: {
    label: 'Validé',
    labelEn: 'Validated',
    color: colors.success,
    bg: `${colors.success}15`,
  },
};

const ORIGINE_LABELS: Record<
  string,
  { fr: string; en: string; color: string }
> = {
  client: { fr: 'Client', en: 'Client', color: colors.error },
  agence: { fr: 'Agence', en: 'Agency', color: '#d97706' },
};

function mapToFlatDetail(item: ReservationApiItem): ReservationDetail {
  return {
    idReservation: item.reservation.idReservation,
    lieuDepart: item.voyage.lieuDepart,
    lieuArrive: item.voyage.lieuArrive,
    pointDeDepart: item.voyage.pointDeDepart,
    pointArrivee: item.voyage.pointArrivee,
    heureDepartEffectif: item.voyage.heureDepartEffectif,
    heureArrive: item.voyage.heureArrive,
    dateDepartPrev: item.voyage.dateDepartPrev,
    nomAgence: item.agence.longName,
    statusVoyage: item.voyage.statusVoyage,
    nbrPassager: item.reservation.nbrPassager,
    prixTotal: item.reservation.prixTotal,
    smallImage: item.voyage.smallImage,
  };
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}h${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

function isInDateRange(dateStr: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (filter === 'month') {
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (filter === '3months') {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    return date >= threeMonthsAgo;
  }
  if (filter === 'year') {
    return date.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function Historique() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [tab, setTab] = useState<TabType>('reservations');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [historiques, setHistoriques] = useState<HistoriqueEnrichi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Historique',
      searchPlaceholder: 'Rechercher un voyage, une agence...',
      tabReservations: 'Réservations',
      tabCancellations: 'Annulations',
      all: 'Tous',
      month: 'Ce mois',
      threeMonths: '3 derniers mois',
      year: 'Cette année',
      passengers: (n: number) => `${n} passager${n > 1 ? 's' : ''}`,
      downloadTicket: 'Partager le billet',
      details: 'Détails',
      noData: 'Aucun historique',
      cancelledBy: 'Annulé par',
      compensation: 'Compensation',
      cancelReason: 'Motif',
      cancelDate: "Date d'annulation",
      calTitle: 'Sélectionner un mois',
      calApply: 'Appliquer',
      calClear: 'Effacer',
    },
    en: {
      title: 'History',
      searchPlaceholder: 'Search a trip, an agency...',
      tabReservations: 'Reservations',
      tabCancellations: 'Cancellations',
      all: 'All',
      month: 'This month',
      threeMonths: 'Last 3 months',
      year: 'This year',
      passengers: (n: number) => `${n} passenger${n > 1 ? 's' : ''}`,
      downloadTicket: 'Share ticket',
      details: 'Details',
      noData: 'No history',
      cancelledBy: 'Cancelled by',
      compensation: 'Compensation',
      cancelReason: 'Reason',
      cancelDate: 'Cancellation date',
      calTitle: 'Select a month',
      calApply: 'Apply',
      calClear: 'Clear',
    },
  }[lang];

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: t.all },
    { key: 'month', label: t.month },
    { key: '3months', label: t.threeMonths },
    { key: 'year', label: t.year },
  ];

  const loadHistorique = useCallback(async () => {
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

      const res = await fetch(`${API_URL}/historique/reservation/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      console.log('Fetched historique data:', data);
      const rawList: HistoriqueRaw[] = data;

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
        reservationMap.set(
          item.reservation.idReservation,
          mapToFlatDetail(item),
        );
      });

      const enriched: HistoriqueEnrichi[] = rawList.map(h => ({
        ...h,
        reservation: reservationMap.get(h.idReservation) || null,
      }));

      setHistoriques(enriched);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistorique();
  }, [loadHistorique]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistorique();
    setRefreshing(false);
  }, [loadHistorique]);

  const filtered = historiques.filter(h => {
    if (tab === 'reservations' && h.statusHistorique === 'ANNULE') return false;
    if (tab === 'annulations' && h.statusHistorique !== 'ANNULE') return false;
    if (!isInDateRange(h.dateReservation, dateFilter)) return false;
    if (calMonth !== null) {
      const d = new Date(h.dateReservation);
      if (d.getMonth() !== calMonth || d.getFullYear() !== calYear)
        return false;
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const r = h.reservation;
      return (
        r?.lieuDepart?.toLowerCase().includes(q) ||
        r?.lieuArrive?.toLowerCase().includes(q) ||
        r?.nomAgence?.toLowerCase().includes(q) ||
        h.idHistorique.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleShare = async (h: HistoriqueEnrichi) => {
    const r = h.reservation;
    if (!r) return;
    const totalPrice = r?.prixTotal || 0;
    try {
      await Share.share({
        message: `
🚌 BUS STATION — ${lang === 'fr' ? 'Billet de voyage' : 'Travel ticket'}
━━━━━━━━━━━━━━━━━━━
📋 #${h.idHistorique}
🗺️ ${r.lieuDepart} → ${r.lieuArrive}
📅 ${formatDate(r.dateDepartPrev, lang)}
🕐 ${r.heureDepartEffectif} - ${r.heureArrive}
🏢 ${r.nomAgence}
👥 ${r.nbrPassager} passager(s)
💰 ${formatPrice(r.prixTotal)}
💰 ${formatPrice(totalPrice)}
        `.trim(),
        title: lang === 'fr' ? 'Billet de voyage' : 'Travel ticket',
      });
    } catch {
      // silent
    }
  };

  const ReservationCard = ({ item }: { item: HistoriqueEnrichi }) => {
    const r = item.reservation;
    const status =
      STATUS_COLORS[item.statusHistorique] || STATUS_COLORS.EN_ATTENTE;
    const totalPrice = r?.prixTotal || 0;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {/* Top */}
        <View style={styles.cardTop}>
          {/* Image */}
          <View
            style={[styles.cardImage, { backgroundColor: theme.backgroundAlt }]}
          >
            {r?.smallImage ? (
              <Image
                source={{ uri: r.smallImage }}
                style={styles.cardImageInner}
                resizeMode="cover"
              />
            ) : (
              <TripPlaceholder width="100%" height="100%" />
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            {/* Agency + status + date */}
            <View style={styles.cardRow}>
              <Text
                style={[styles.agencyName, { color: theme.text }]}
                numberOfLines={1}
              >
                {r?.nomAgence || '—'}
              </Text>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>
                  {lang === 'fr' ? status.label : status.labelEn}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: theme.text }]}>
                {formatDate(r?.dateDepartPrev || item.dateReservation, lang)}
              </Text>
            </View>

            {/* Route */}
            <Text
              style={[styles.route, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {lang === 'fr'
                ? `De ${r?.lieuDepart || '—'} vers ${r?.lieuArrive || '—'}`
                : `From ${r?.lieuDepart || '—'} to ${r?.lieuArrive || '—'}`}
            </Text>

            {/* Time */}
            {r && (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={theme.text} />
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {' '}
                  {formatTime(r.heureDepartEffectif)} -{' '}
                  {formatTime(r.heureArrive)}
                </Text>
              </View>
            )}

            {/* Passengers + price */}
            <View style={styles.cardFooter}>
              <View style={styles.timeRow}>
                <Ionicons name="people-outline" size={12} color={theme.text} />
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {' '}
                  {t.passengers(r?.nbrPassager || 0)}
                </Text>
              </View>
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatPrice(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.actionLeft}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="download-outline" size={15} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>
              {t.downloadTicket}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRight}
            onPress={() =>
              navigation.navigate('BookingDetails', {
                reservationId: item.idReservation,
              })
            }
          >
            <Text style={[styles.actionText, { color: theme.textStrong }]}>
              {t.details}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const CancellationCard = ({ item }: { item: HistoriqueEnrichi }) => {
    const r = item.reservation;
    const status = STATUS_COLORS.ANNULE;
    const totalPrice = r?.prixTotal || 0;
    const origine = item.origineAnnulation
      ? ORIGINE_LABELS[item.origineAnnulation] || null
      : null;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {/* Top */}
        <View style={styles.cardTop}>
          <View
            style={[styles.cardImage, { backgroundColor: theme.backgroundAlt }]}
          >
            {r?.smallImage ? (
              <Image
                source={{ uri: r.smallImage }}
                style={styles.cardImageInner}
                resizeMode="cover"
              />
            ) : (
              <TripPlaceholder width="100%" height="100%" />
            )}
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardRow}>
              <Text
                style={[styles.agencyName, { color: theme.text }]}
                numberOfLines={1}
              >
                {r?.nomAgence || '—'}
              </Text>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.color }]}>
                  {lang === 'fr' ? status.label : status.labelEn}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.route, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {lang === 'fr'
                ? `De ${r?.lieuDepart || '—'} vers ${r?.lieuArrive || '—'}`
                : `From ${r?.lieuDepart || '—'} to ${r?.lieuArrive || '—'}`}
            </Text>

            {r && (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={theme.text} />
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {' '}
                  {formatTime(r.heureDepartEffectif)} -{' '}
                  {formatTime(r.heureArrive)}
                </Text>
              </View>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.timeRow}>
                <Ionicons name="people-outline" size={12} color={theme.text} />
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {' '}
                  {t.passengers(r?.nbrPassager || 0)}
                </Text>
              </View>
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatPrice(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancellation details */}
        <View
          style={[
            styles.cancelDetails,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.backgroundAlt,
            },
          ]}
        >
          {origine && (
            <View style={styles.cancelRow}>
              <Text style={[styles.cancelLabel, { color: theme.text }]}>
                {t.cancelledBy}
              </Text>
              <View
                style={[
                  styles.origineBadge,
                  { backgroundColor: origine.color + '15' },
                ]}
              >
                <Text style={[styles.origineText, { color: origine.color }]}>
                  {lang === 'fr' ? origine.fr : origine.en}
                </Text>
              </View>
            </View>
          )}

          {item.dateAnnulation && (
            <View style={styles.cancelRow}>
              <Text style={[styles.cancelLabel, { color: theme.text }]}>
                {t.cancelDate}
              </Text>
              <Text style={[styles.cancelValue, { color: theme.textStrong }]}>
                {formatDate(item.dateAnnulation, lang)}
              </Text>
            </View>
          )}

          {item.causeAnnulation && (
            <View style={styles.cancelRow}>
              <Text style={[styles.cancelLabel, { color: theme.text }]}>
                {t.cancelReason}
              </Text>
              <Text
                style={[styles.cancelValue, { color: theme.textStrong }]}
                numberOfLines={2}
              >
                {item.causeAnnulation}
              </Text>
            </View>
          )}

          {item.compensation !== undefined && item.compensation > 0 && (
            <View style={styles.cancelRow}>
              <Text style={[styles.cancelLabel, { color: theme.text }]}>
                {t.compensation}
              </Text>
              <Text
                style={[styles.compensationValue, { color: colors.success }]}
              >
                {formatPrice(item.compensation)}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          <View style={styles.actionLeft} />
          <TouchableOpacity
            style={styles.actionRight}
            onPress={() =>
              navigation.navigate('BookingDetails', {
                reservationId: item.idReservation,
              })
            }
          >
            <Text style={[styles.actionText, { color: theme.textStrong }]}>
              {t.details}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={theme.textStrong}
            />
          </TouchableOpacity>
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

        <ScrollView
          ref={scrollRef}
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
            {(['reservations', 'annulations'] as TabType[]).map(t2 => (
              <TouchableOpacity
                key={t2}
                style={[
                  styles.tab,
                  tab === t2 && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setTab(t2)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: tab === t2 ? colors.primary : theme.text },
                  ]}
                >
                  {t2 === 'reservations'
                    ? t.tabReservations
                    : t.tabCancellations}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
                placeholderTextColor={theme.text}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.filterIconBtn,
                {
                  borderColor:
                    dateFilter !== 'all' ? colors.primary : theme.border,
                  backgroundColor:
                    dateFilter !== 'all' ? `${colors.primary}10` : undefined,
                },
              ]}
              onPress={() => setShowFilters(v => !v)}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={dateFilter !== 'all' ? colors.primary : theme.textStrong}
              />
              {dateFilter !== 'all' && <View style={styles.filterBadge} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterIconBtn,
                {
                  borderColor:
                    calMonth !== null ? colors.primary : theme.border,
                  backgroundColor:
                    calMonth !== null ? `${colors.primary}10` : undefined,
                },
              ]}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={calMonth !== null ? colors.primary : theme.textStrong}
              />
              {calMonth !== null && <View style={styles.filterBadge} />}
            </TouchableOpacity>
          </View>

          {/* Date filter chips — toggle */}
          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateFiltersRow}
            >
              {DATE_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.dateChip,
                    {
                      borderColor:
                        dateFilter === f.key ? colors.primary : theme.border,
                      backgroundColor:
                        dateFilter === f.key ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setDateFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      { color: dateFilter === f.key ? '#fff' : theme.text },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <MonthPickerModal
            visible={showCalendar}
            lang={lang}
            selectedYear={calYear}
            selectedMonth={calMonth}
            onApply={(year, month) => {
              setCalYear(year);
              setCalMonth(month);
            }}
            onClose={() => setShowCalendar(false)}
          />

          {/* List */}
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState
                type="calendar"
                message={t.noData}
                textColor={theme.text}
              />
            ) : (
              filtered.map(item =>
                tab === 'reservations' ? (
                  <ReservationCard key={item.idHistorique} item={item} />
                ) : (
                  <CancellationCard key={item.idHistorique} item={item} />
                ),
              )
            )}
          </View>
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
  dateFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dateChipText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
    height: 90,
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
  cardRow: {
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
  dateText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginLeft: 'auto',
  },
  route: {
    ...typography.heading,
    fontSize: typography.sizes.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  price: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },

  // Cancellation
  cancelDetails: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cancelLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  cancelValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    flex: 1,
    textAlign: 'right',
  },
  origineBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  origineText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },
  compensationValue: {
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
  calApplyText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
});
