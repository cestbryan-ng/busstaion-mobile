import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Share,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { print as printPDF } from 'react-native-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import ConfirmModal from '../../../../components/confirm-modal';
import { useToast } from '../../../../components/toast';
import { SkeletonBookingDetail } from '../../../../components/skeleton';
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

type ReservationDetail = {
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
    pointDeDepart?: string;
    lieuArrive: string;
    pointArrivee?: string;
    dateDepartPrev: string;
    heureDepartEffectif: string;
    heureArrive: string;
    statusVoyage: string;
    prix: number;
    duree?: number;
  };
  agence: {
    agencyId: string;
    longName: string;
    contact?: { phone?: string; email?: string };
  };
  passagers: Passager[];
  nombrePassagers: number;
};

const STATUS_RESERVATION: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  CONFIRMEE: {
    label: 'CONFIRMÉE',
    labelEn: 'CONFIRMED',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  EN_ATTENTE: {
    label: 'EN ATTENTE',
    labelEn: 'PENDING',
    color: '#d97706',
    bg: '#fef3c720',
  },
  ANNULEE: {
    label: 'ANNULÉE',
    labelEn: 'CANCELLED',
    color: '#6b7280',
    bg: '#6b728015',
  },
};

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h 00m`;
}

function generateTicketHTML(res: ReservationDetail, lang: 'fr' | 'en'): string {
  const passengersRows = res.passagers
    .map(
      p => `
    <tr>
      <td>${p.nom}</td>
      <td>${p.siege}</td>
      <td>${p.genre}</td>
      <td>${p.age} ans</td>
      <td>${p.prixBillet.toLocaleString('fr-FR')} FCFA</td>
    </tr>
  `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Billet - ${res.idReservation}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
        h1 { color: #2563EB; font-size: 22px; }
        .section { margin: 16px 0; padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
        .route { font-size: 20px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .total { font-size: 18px; font-weight: bold; color: #2563EB; }
      </style>
    </head>
    <body>
      <h1>BUS STATION — ${
        lang === 'fr' ? 'Billet de voyage' : 'Travel ticket'
      }</h1>
      <div class="section">
        <p><b>${lang === 'fr' ? 'N° de réservation' : 'Reservation N°'}:</b> ${
    res.idReservation
  }</p>
        <p class="route">${res.voyage.lieuDepart} → ${res.voyage.lieuArrive}</p>
        <p>${res.voyage.pointDeDepart || ''} → ${
    res.voyage.pointArrivee || ''
  }</p>
        <p><b>${lang === 'fr' ? 'Date' : 'Date'}:</b> ${formatDate(
    res.voyage.dateDepartPrev,
    lang,
  )}</p>
        <p><b>${lang === 'fr' ? 'Départ' : 'Departure'}:</b> ${
    res.voyage.heureDepartEffectif
  }</p>
        <p><b>${lang === 'fr' ? 'Agence' : 'Agency'}:</b> ${
    res.agence.longName
  }</p>
      </div>
      <div class="section">
        <h3>${lang === 'fr' ? 'Passagers' : 'Passengers'}</h3>
        <table>
          <tr>
            <th>${lang === 'fr' ? 'Nom' : 'Name'}</th>
            <th>${lang === 'fr' ? 'Siège' : 'Seat'}</th>
            <th>${lang === 'fr' ? 'Genre' : 'Gender'}</th>
            <th>${lang === 'fr' ? 'Âge' : 'Age'}</th>
            <th>${lang === 'fr' ? 'Prix' : 'Price'}</th>
          </tr>
          ${passengersRows}
        </table>
      </div>
      <div class="section">
        <p class="total">${
          lang === 'fr' ? 'Total payé' : 'Total paid'
        }: ${formatPrice(res.voyage.prix * res.nombrePassagers)}</p>
      </div>
    </body>
    </html>
  `;
}

export default function BookingDetails() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookingDetails'>>();
  const { reservationId } = route.params;
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [reservation, setReservation] = useState<ReservationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détails réservation',
      resNumber: 'N° de réservation',
      tripInfo: 'Informations du voyage',
      agency: 'Agence',
      passengers: 'Détails des passagers',
      paymentSummary: 'Récapitulatif paiement',
      passengersCount: 'Nombre de passagers',
      unitPrice: 'Prix unitaire',
      serviceFee: 'Frais de service',
      totalPaid: 'Total payé',
      downloadTicket: 'Exporter en PDF',
      exportingPdf: 'Préparation...',
      cancelReservation: 'Annuler la réservation',
      cancelTitle: 'Annuler la réservation',
      cancelMessage:
        'Voulez-vous vraiment annuler cette réservation ? Cette action est irréversible.',
      confirmCancel: 'Oui, annuler',
      noCancel: 'Non',
      seat: 'Siège',
      ticketPrice: 'Prix du billet',
      shareTitle: 'Billet de voyage',
      departure: 'Départ',
      arrival: 'Arrivée',
      duration: 'Durée',
      depHour: 'Heure départ',
      bookingCancelled: 'Réservation annulée',
      cancelError: "Erreur lors de l'annulation",
    },
    en: {
      title: 'Reservation details',
      resNumber: 'Reservation N°',
      tripInfo: 'Trip information',
      agency: 'Agency',
      passengers: 'Passenger details',
      paymentSummary: 'Payment summary',
      passengersCount: 'Number of passengers',
      unitPrice: 'Unit price',
      serviceFee: 'Service fee',
      totalPaid: 'Total paid',
      downloadTicket: 'Export as PDF',
      exportingPdf: 'Preparing...',
      cancelReservation: 'Cancel reservation',
      cancelTitle: 'Cancel reservation',
      cancelMessage:
        'Are you sure you want to cancel this reservation? This action is irreversible.',
      confirmCancel: 'Yes, cancel',
      noCancel: 'No',
      seat: 'Seat',
      ticketPrice: 'Ticket price',
      shareTitle: 'Travel ticket',
      departure: 'Departure',
      arrival: 'Arrival',
      duration: 'Duration',
      depHour: 'Dep. time',
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
      const userId = user?.userId || user?.id;
      if (!userId) return;

      const res = await fetch(
        `${API_URL}/reservation/user/${userId}?page=0&size=100`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        const content: ReservationDetail[] = data.content || [];
        const found = content.find(
          r =>
            r.idReservation === reservationId ||
            r.reservation?.idReservation === reservationId,
        );
        if (found) setReservation(found);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleShare = async () => {
    if (!reservation) return;
    try {
      const ticketText = `
🚌 BUS STATION — ${t.shareTitle}
━━━━━━━━━━━━━━━━━━━
📋 ${t.resNumber}: ${reservation.idReservation}
🗺️ ${reservation.voyage.lieuDepart} → ${reservation.voyage.lieuArrive}
📅 ${formatDate(reservation.voyage.dateDepartPrev, lang)}
🕐 ${t.depHour}: ${reservation.voyage.heureDepartEffectif}
🏢 ${reservation.agence.longName}
👥 ${reservation.nombrePassagers} passager(s)
💰 Total: ${formatPrice(
        reservation.voyage.prix * reservation.nombrePassagers,
      )}
      `.trim();

      await Share.share({
        message: ticketText,
        title: t.shareTitle,
      });
    } catch {
      // silent
    }
  };

  const handleExportPDF = async () => {
    if (!reservation || exportingPdf) return;
    setExportingPdf(true);
    try {
      await printPDF({ html: generateTicketHTML(reservation, lang) });
    } catch {
      // L'utilisateur a annulé ou erreur silencieuse
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/reservation/annuler/${reservation.idReservation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success(t.bookingCancelled);
        setCancelModalVisible(false);
        navigation.goBack();
      } else {
        toast.error(t.cancelError);
      }
    } catch {
      toast.error(t.cancelError);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <SkeletonBookingDetail />;

  if (!reservation) return null;

  const statusRes =
    STATUS_RESERVATION[reservation.reservation.statutReservation] ||
    STATUS_RESERVATION.EN_ATTENTE;
  const isCancelled = reservation.reservation.statutReservation === 'ANNULEE';
  const totalPrice = reservation.voyage.prix * reservation.nombrePassagers;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.backgroundAlt }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
          <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons
              name="share-social-outline"
              size={24}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>

        {/* ── Reservation Number + QR ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.resNumberRow}>
            <View style={styles.resNumberInfo}>
              <Text style={[styles.resNumberLabel, { color: theme.text }]}>
                {t.resNumber}
              </Text>
              <Text style={[styles.resNumberValue, { color: colors.primary }]}>
                {reservation.idReservation}
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusRes.bg, marginTop: spacing.xs },
                ]}
              >
                <Text style={[styles.badgeText, { color: statusRes.color }]}>
                  {lang === 'fr' ? statusRes.label : statusRes.labelEn}
                </Text>
              </View>
              <View style={styles.payRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        reservation.reservation.statutPayement === 'PAID'
                          ? colors.success
                          : '#d97706',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.payText,
                    {
                      color:
                        reservation.reservation.statutPayement === 'PAID'
                          ? colors.success
                          : '#d97706',
                    },
                  ]}
                >
                  {reservation.reservation.statutPayement === 'PAID'
                    ? lang === 'fr'
                      ? 'Payé'
                      : 'Paid'
                    : lang === 'fr'
                    ? 'Paiement requis'
                    : 'Payment required'}
                </Text>
              </View>
            </View>
            <View style={[styles.qrContainer, { borderColor: theme.border }]}>
              <QRCode
                value={reservation.idReservation}
                size={90}
                color={theme.textStrong}
                backgroundColor="transparent"
              />
            </View>
          </View>
        </View>

        {/* ── Trip Info ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="bus-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.tripInfo}
            </Text>
          </View>

          {/* Route */}
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <Text style={[styles.routeCity, { color: theme.textStrong }]}>
                {reservation.voyage.lieuDepart}
              </Text>
              {reservation.voyage.pointDeDepart && (
                <Text style={[styles.routeStation, { color: theme.text }]}>
                  {reservation.voyage.pointDeDepart}
                </Text>
              )}
            </View>

            <View style={styles.routeMiddle}>
              <View
                style={[styles.routeLine, { backgroundColor: theme.border }]}
              />
              <View
                style={[
                  styles.routeBusIcon,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Ionicons name="bus-outline" size={16} color={colors.primary} />
              </View>
              <View
                style={[styles.routeLine, { backgroundColor: theme.border }]}
              />
            </View>

            <View style={[styles.routePoint, { alignItems: 'flex-end' }]}>
              <Text style={[styles.routeCity, { color: theme.textStrong }]}>
                {reservation.voyage.lieuArrive}
              </Text>
              {reservation.voyage.pointArrivee && (
                <Text style={[styles.routeStation, { color: theme.text }]}>
                  {reservation.voyage.pointArrivee}
                </Text>
              )}
            </View>
          </View>

          {/* Date/Time/Duration */}
          <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={theme.text} />
              <View>
                <Text style={[styles.metaValue, { color: theme.textStrong }]}>
                  {new Date(
                    reservation.voyage.dateDepartPrev,
                  ).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.text }]}>
                  {new Date(
                    reservation.voyage.dateDepartPrev,
                  ).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                    weekday: 'long',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.text} />
              <View>
                <Text style={[styles.metaValue, { color: theme.textStrong }]}>
                  {reservation.voyage.heureDepartEffectif}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.text }]}>
                  {t.depHour}
                </Text>
              </View>
            </View>

            {reservation.voyage.duree && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="hourglass-outline"
                  size={14}
                  color={theme.text}
                />
                <View>
                  <Text style={[styles.metaValue, { color: theme.textStrong }]}>
                    {formatDuration(reservation.voyage.duree)}
                  </Text>
                  <Text style={[styles.metaLabel, { color: theme.text }]}>
                    {t.duration}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Agency ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="business-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.agency}
            </Text>
          </View>
          <View style={styles.agencyRow}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {reservation.agence.longName}
            </Text>
            {reservation.agence.contact?.phone && (
              <View style={styles.agencyContact}>
                <Ionicons name="call-outline" size={14} color={theme.text} />
                <Text style={[styles.agencyPhone, { color: theme.text }]}>
                  {' '}
                  {reservation.agence.contact.phone}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Passengers ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.passengers}
            </Text>
          </View>

          {reservation.passagers.map((p, index) => (
            <View key={p.idPassager}>
              <View style={styles.passengerRow}>
                <View
                  style={[
                    styles.passengerIndex,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.passengerIndexText,
                      { color: colors.primary },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.passengerInfo}>
                  <Text
                    style={[styles.passengerName, { color: theme.textStrong }]}
                  >
                    {p.nom}
                  </Text>
                  <Text style={[styles.passengerMeta, { color: theme.text }]}>
                    ID: {p.carteID} • {p.genre} • {p.age}{' '}
                    {lang === 'fr' ? 'ans' : 'y/o'}
                  </Text>
                </View>
                <View style={styles.passengerSeat}>
                  <Text style={[styles.seatLabel, { color: theme.text }]}>
                    {t.seat}
                  </Text>
                  <Text style={[styles.seatValue, { color: colors.primary }]}>
                    {p.siege}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.ticketPriceRow,
                  { borderTopColor: theme.border },
                ]}
              >
                <Text style={[styles.ticketPriceLabel, { color: theme.text }]}>
                  {t.ticketPrice}
                </Text>
                <Text
                  style={[styles.ticketPriceValue, { color: theme.textStrong }]}
                >
                  {formatPrice(p.prixBillet)}
                </Text>
              </View>

              {index < reservation.passagers.length - 1 && (
                <View
                  style={[
                    styles.passengerDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Payment Summary ── */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.paymentSummary}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>
              {t.passengersCount}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.textStrong }]}>
              {reservation.nombrePassagers}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>
              {t.unitPrice}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.textStrong }]}>
              {formatPrice(reservation.voyage.prix)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>
              {t.serviceFee}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.textStrong }]}>
              0 FCFA
            </Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.textStrong }]}>
              {t.totalPaid}
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatPrice(totalPrice)}
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              { borderColor: colors.primary, opacity: exportingPdf ? 0.7 : 1 },
            ]}
            onPress={handleExportPDF}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.downloadBtnText, { color: colors.primary }]}>
              {exportingPdf ? t.exportingPdf : t.downloadTicket}
            </Text>
          </TouchableOpacity>

          {!isCancelled && (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.error }]}
              onPress={() => setCancelModalVisible(true)}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.cancelBtnText}>{t.cancelReservation}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel modal */}
      <ConfirmModal
        visible={cancelModalVisible}
        title={t.cancelTitle}
        message={t.cancelMessage}
        confirmText={cancelling ? '...' : t.confirmCancel}
        cancelText={t.noCancel}
        onConfirm={handleCancel}
        onCancel={() => setCancelModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },

  // Reservation number
  resNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resNumberInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  resNumberLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  resNumberValue: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  payText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  qrContainer: {
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
  },

  // Route
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routePoint: {
    flex: 1,
  },
  routeCity: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },
  routeStation: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeLine: {
    flex: 1,
    height: 1,
  },
  routeBusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  metaValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  metaLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },

  // Agency
  agencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agencyName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  agencyContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyPhone: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },

  // Passenger
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  passengerIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerIndexText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  passengerMeta: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  passengerSeat: {
    alignItems: 'flex-end',
  },
  seatLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  seatValue: {
    ...typography.heading,
    fontSize: typography.sizes.md,
  },
  ticketPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  ticketPriceLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  ticketPriceValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  passengerDivider: {
    height: 1,
    marginVertical: spacing.md,
  },

  // Payment summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  summaryValue: {
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  totalValue: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 4,
    height: 52,
    gap: spacing.sm,
  },
  downloadBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    height: 52,
    gap: spacing.sm,
  },
  cancelBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#ffffff',
  },
});
