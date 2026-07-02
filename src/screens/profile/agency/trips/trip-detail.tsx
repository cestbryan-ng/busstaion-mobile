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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import ConfirmModal from '../../../../components/confirm-modal';
import { SkeletonAgencyTripDetail } from '../../../../components/skeleton';
import type { RootStackParamList } from '../../../../navigation';

type TripDetail = {
  idVoyage: string;
  titre?: string;
  lieuDepart: string;
  lieuArrive: string;
  pointDeDepart?: string;
  pointArrivee?: string;
  dateDepartPrev: string;
  heureDepartEffectif?: string;
  heureArrive?: string;
  dureeVoyage?: string;
  statusVoyage: string;
  prix: number;
  nomClasseVoyage?: string;
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  smallImage?: string;
  vehicule?: { nom?: string; modele?: string; nbrPlaces?: number };
  chauffeur?: { nom?: string; prenom?: string };
  nombreReservations?: number;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PUBLIE: { label: 'PUBLIÉ', color: colors.primary, bg: `${colors.primary}15` },
  EN_COURS: {
    label: 'EN COURS',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_ATTENTE: { label: 'BROUILLON', color: '#d97706', bg: '#fef3c715' },
  TERMINE: { label: 'TERMINÉ', color: '#6b7280', bg: '#6b728015' },
  ANNULE: { label: 'ANNULÉ', color: colors.error, bg: `${colors.error}15` },
};

export default function AgencyTripDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyTripDetail'>>();
  const { tripId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détail du voyage',
      soldSeats: 'Places vendues',
      seatsLeft: 'Places restantes',
      pricePerPerson: 'Prix par personne',
      departure: 'Départ',
      arrival: 'Arrivée',
      duration: 'Durée',
      bus: 'Bus',
      driver: 'Chauffeur',
      class: 'Classe',
      viewBookings: 'Voir les réservations',
      editTrip: 'Modifier le voyage',
      duplicateTrip: 'Dupliquer le voyage',
      cancelTrip: 'Annuler / Supprimer le voyage',
      cancelTitle: 'Annuler le voyage',
      cancelMessage:
        'Voulez-vous vraiment annuler ce voyage ? Les passagers seront notifiés.',
      confirm: 'Oui, annuler',
      no: 'Non',
    },
    en: {
      title: 'Trip detail',
      soldSeats: 'Seats sold',
      seatsLeft: 'Seats left',
      pricePerPerson: 'Price per person',
      departure: 'Departure',
      arrival: 'Arrival',
      duration: 'Duration',
      bus: 'Bus',
      driver: 'Driver',
      class: 'Class',
      viewBookings: 'View bookings',
      editTrip: 'Edit trip',
      duplicateTrip: 'Duplicate trip',
      cancelTrip: 'Cancel / Delete trip',
      cancelTitle: 'Cancel trip',
      cancelMessage:
        'Are you sure you want to cancel this trip? Passengers will be notified.',
      confirm: 'Yes, cancel',
      no: 'No',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/voyage/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTrip(await res.json());
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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_URL}/voyage/${tripId}/annuler`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCancelModal(false);
      navigation.goBack();
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <SkeletonAgencyTripDetail />;

  if (!trip) return null;

  const sold = trip.nbrPlaceReservable - trip.nbrPlaceRestante;
  const statusCfg = STATUS_CONFIG[trip.statusVoyage] || STATUS_CONFIG.PUBLIE;
  const classColor =
    { VIP: '#1e3a8a', PREMIUM: '#7c3aed', STANDARD: '#16a34a' }[
      (trip.nomClasseVoyage || '').toUpperCase().split(' ')[0]
    ] || colors.primary;

  const ACTIONS = [
    {
      icon: 'calendar-outline',
      label: t.viewBookings,
      danger: false,
      onPress: () =>
        navigation.navigate('AgencyTripBookings', {
          tripId,
          tripTitle: `${trip.lieuDepart} → ${trip.lieuArrive}`,
        }),
    },
    {
      icon: 'create-outline',
      label: t.editTrip,
      danger: false,
      onPress: () =>
        navigation.navigate('AgencyNewTrip', { editTripId: tripId }),
    },
    {
      icon: 'copy-outline',
      label: t.duplicateTrip,
      danger: false,
      onPress: () => {},
    },
    {
      icon: 'trash-outline',
      label: t.cancelTrip,
      danger: true,
      onPress: () => setCancelModal(true),
    },
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
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
          {/* Image + Status */}
          <View
            style={[
              styles.imageContainer,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            {trip.smallImage ? (
              <Image
                source={{ uri: trip.smallImage }}
                style={styles.tripImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.imagePlaceholder,
                  { backgroundColor: theme.backgroundAlt },
                ]}
              >
                <Ionicons name="bus-outline" size={56} color={theme.text} />
              </View>
            )}
            <View
              style={[styles.statusOverlay, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          {/* Main info */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.routeRow}>
              <Text style={[styles.routeText, { color: theme.textStrong }]}>
                {trip.lieuDepart} → {trip.lieuArrive}
              </Text>
              {trip.nomClasseVoyage && (
                <View
                  style={[
                    styles.classPill,
                    { backgroundColor: `${classColor}20` },
                  ]}
                >
                  <Text style={[styles.classPillText, { color: classColor }]}>
                    {trip.nomClasseVoyage}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={theme.text} />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {' '}
                {new Date(trip.dateDepartPrev).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-GB',
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )}{' '}
                · {trip.heureDepartEffectif || ''} · Voyage ID: TRP-{tripId.slice(-3)}
              </Text>
            </View>

            {/* Stats row */}
            <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {sold} / {trip.nbrPlaceReservable}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  {t.soldSeats}
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: theme.border }]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#d97706' }]}>
                  {trip.nbrPlaceRestante}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  {t.seatsLeft}
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: theme.border }]}
              />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {trip.prix.toLocaleString('fr-FR')} FCFA
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  {t.pricePerPerson}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {[
              {
                icon: 'location-outline',
                label: t.departure,
                value: `${trip.pointDeDepart || trip.lieuDepart}`,
                time: trip.heureDepartEffectif,
              },
              {
                icon: 'location-outline',
                label: t.arrival,
                value: `${trip.pointArrivee || trip.lieuArrive}`,
                time: trip.heureArrive,
              },
              {
                icon: 'time-outline',
                label: t.duration,
                value: trip.dureeVoyage || '—',
              },
              {
                icon: 'bus-outline',
                label: t.bus,
                value: trip.vehicule
                  ? `${trip.vehicule.nom || ''} ${
                      trip.vehicule.modele || ''
                    } (${trip.vehicule.nbrPlaces || '—'} places)`
                  : '—',
              },
              {
                icon: 'person-outline',
                label: t.driver,
                value: trip.chauffeur
                  ? `${trip.chauffeur.prenom || ''} ${
                      trip.chauffeur.nom || ''
                    }`.trim() || '—'
                  : '—',
              },
              {
                icon: 'star-outline',
                label: t.class,
                value: trip.nomClasseVoyage || '—',
              },
            ].map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.detailRow,
                  {
                    borderTopColor: theme.border,
                    borderTopWidth: i === 0 ? 0 : 1,
                  },
                ]}
              >
                <View style={styles.detailLeft}>
                  <Ionicons name={row.icon} size={16} color={theme.text} />
                  <Text style={[styles.detailLabel, { color: theme.text }]}>
                    {row.label}
                  </Text>
                </View>
                <View style={styles.detailRight}>
                  <Text
                    style={[styles.detailValue, { color: theme.textStrong }]}
                  >
                    {row.value}
                  </Text>
                  {row.time && (
                    <Text style={[styles.detailTime, { color: theme.text }]}>
                      {row.time}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {ACTIONS.map((action, i) => (
              <TouchableOpacity
                key={action.label}
                style={[
                  styles.actionRow,
                  {
                    borderTopColor: theme.border,
                    borderTopWidth: i === 0 ? 0 : 1,
                  },
                ]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: action.danger
                        ? `${colors.error}10`
                        : `${colors.primary}10`,
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon}
                    size={18}
                    color={action.danger ? colors.error : colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.danger ? colors.error : theme.textStrong },
                  ]}
                >
                  {action.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={action.danger ? colors.error : theme.text}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>

      <ConfirmModal
        visible={cancelModal}
        title={t.cancelTitle}
        message={t.cancelMessage}
        confirmText={cancelling ? '...' : t.confirm}
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  imageContainer: { height: 200, position: 'relative' },
  tripImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  routeText: { ...typography.heading, fontSize: typography.sizes.xl, flex: 1 },
  classPill: {
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  classPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metaText: { ...typography.body, fontSize: typography.sizes.xs },
  statsRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.heading, fontSize: typography.sizes.md },
  statLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: { width: 1 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { ...typography.body, fontSize: typography.sizes.sm },
  detailRight: { alignItems: 'flex-end' },
  detailValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  detailTime: { ...typography.body, fontSize: typography.sizes.xs },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
});
