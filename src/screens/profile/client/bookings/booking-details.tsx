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
  Modal,
  TextInput,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import RNPrint from 'react-native-print';
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
    pointDeDepart?: string;
    lieuArrive: string;
    pointArrivee?: string;
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
    contact?: { phone?: string; email?: string };
  };
  passagers?: Passager[];
};

const STATUS_RESERVATION: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  RESERVER: {
    label: 'RÉSERVÉ',
    labelEn: 'RESERVED',
    color: '#d97706',
    bg: '#fef3c720',
  },
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

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
}

function parseDuration(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h 00m`;
  if (m) return `${m}m`;
  return '';
}

function generateTicketHTML(res: ReservationDetail, lang: 'fr' | 'en'): string {
  const t = (fr: string, en: string) => (lang === 'fr' ? fr : en);

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const fmtTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const nbrPassager = res.reservation.nbrPassager;
  const confirmDate = res.reservation.dateConfirmation;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${t('Billet', 'Ticket')} - ${res.reservation.idReservation}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #171717;
    }
    .ticket-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .ticket-header {
      padding: 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    .ticket-header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #2563EB;
      letter-spacing: -0.5px;
    }
    .ticket-header p {
      font-size: 13px;
      color: #737373;
      margin-top: 2px;
    }
    .amount-section {
      background: #fafafa;
      padding: 28px 24px;
      text-align: center;
      border-bottom: 1px solid #e5e5e5;
    }
    .amount-label {
      font-size: 12px;
      color: #737373;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .amount-value {
      font-size: 36px;
      font-weight: 800;
      color: #2563EB;
      line-height: 1;
    }
    .details-section { padding: 18px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #737373;
      padding-bottom: 10px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 5px 0;
    }
    .detail-label {
      font-size: 13px;
      color: #737373;
      font-weight: 500;
    }
    .detail-value {
      font-size: 13px;
      color: #171717;
      font-weight: 600;
      text-align: right;
      max-width: 60%;
    }
    .divider {
      height: 1px;
      background: #e5e5e5;
      margin: 16px 0;
    }
    .footer {
      background: #fafafa;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .footer-text {
      font-size: 12px;
      color: #737373;
      line-height: 1.6;
    }
    .footer-highlight { font-weight: 600; color: #171717; }
    @media print {
      body { background: white; padding: 0; }
      .ticket-wrapper { box-shadow: none; border: 1px solid #e5e5e5; }
    }
  </style>
</head>
<body>
  <div class="ticket-wrapper">
    <div class="ticket-header">
      <h1>BusStation</h1>
      <p>${t('Billet de voyage', 'Travel ticket')}</p>
    </div>

    <div class="amount-section">
      <div class="amount-label">${t('Montant total', 'Total amount')}</div>
      <div class="amount-value">${res.reservation.prixTotal.toLocaleString('fr-FR')} FCFA</div>
    </div>

    <div class="details-section">
      <div class="section-title">${t("Agence de voyage", "Travel agency")}</div>
      <div class="detail-row">
        <span class="detail-label">${t("Nom", "Name")}</span>
        <span class="detail-value">${res.agence.longName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t("Localisation", "Location")}</span>
        <span class="detail-value">${res.agence.location}</span>
      </div>

      <div class="divider"></div>

      <div class="section-title">${t("Itinéraire", "Itinerary")}</div>
      <div class="detail-row">
        <span class="detail-label">${t("Départ", "Departure")}</span>
        <span class="detail-value">${res.voyage.lieuDepart}${res.voyage.pointDeDepart ? ` — ${res.voyage.pointDeDepart}` : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t("Arrivée", "Arrival")}</span>
        <span class="detail-value">${res.voyage.lieuArrive}${res.voyage.pointArrivee ? ` — ${res.voyage.pointArrivee}` : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t("Date de départ", "Departure date")}</span>
        <span class="detail-value">${fmtDate(res.voyage.dateDepartPrev)} — ${fmtTime(res.voyage.heureDepartEffectif)}</span>
      </div>
      ${res.voyage.dureeVoyage ? `
      <div class="detail-row">
        <span class="detail-label">${t("Durée", "Duration")}</span>
        <span class="detail-value">${parseDuration(res.voyage.dureeVoyage)}</span>
      </div>` : ''}

      <div class="divider"></div>

      <div class="section-title">${t("Réservation", "Reservation")}</div>
      <div class="detail-row">
        <span class="detail-label">${t("Référence", "Reference")}</span>
        <span class="detail-value">${res.reservation.idReservation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t("Passagers", "Passengers")}</span>
        <span class="detail-value">${nbrPassager} ${t(`personne${nbrPassager > 1 ? 's' : ''}`, `passenger${nbrPassager > 1 ? 's' : ''}`)}</span>
      </div>

      <div class="divider"></div>

      <div class="section-title">${t("Paiement", "Payment")}</div>
      ${confirmDate ? `
      <div class="detail-row">
        <span class="detail-label">${t("Date de paiement", "Payment date")}</span>
        <span class="detail-value">${fmtDate(confirmDate)} — ${fmtTime(confirmDate)}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">${t("Montant", "Amount")}</span>
        <span class="detail-value">${res.reservation.prixTotal.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        <span class="footer-highlight">${t("Merci d'avoir choisi BusStation", "Thank you for choosing BusStation")}</span>
      </p>
      <p class="footer-text">${t("Veuillez présenter ce billet lors de l'embarquement", "Please present this ticket at boarding")}</p>
    </div>
  </div>
</body>
</html>`;
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
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payOperator, setPayOperator] = useState<'MTN' | 'ORANGE'>('MTN');
  const [payPhone, setPayPhone] = useState('');
  const [payPhoneError, setPayPhoneError] = useState('');
  const [payApiError, setPayApiError] = useState('');
  const [paying, setPaying] = useState(false);

  const t = {
    fr: {
      title: 'Détails réservation',
      resNumber: 'N° de réservation',
      tripInfo: 'Informations du voyage',
      agency: 'Agence',
      passengers: 'Détails des passagers',
      paymentSummary: 'Récapitulatif paiement',
      passengersCount: 'Nombre de passagers',
      totalPaid: 'Total payé',
      totalToPay: 'Total à payer',
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
      payNow: 'Payer maintenant',
      payTitle: 'Paiement',
      operatorLabel: 'Opérateur',
      phoneLabel: 'Numéro de téléphone',
      phonePlaceholder: '6XX XXX XXX',
      errorPhoneInvalid: 'Format invalide (ex: 677 123 456).',
      payError: 'Erreur lors du paiement',
      paySuccess: 'Paiement confirmé',
    },
    en: {
      title: 'Reservation details',
      resNumber: 'Reservation N°',
      tripInfo: 'Trip information',
      agency: 'Agency',
      passengers: 'Passenger details',
      paymentSummary: 'Payment summary',
      passengersCount: 'Number of passengers',
      totalPaid: 'Total paid',
      totalToPay: 'Total to pay',
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
      payNow: 'Pay now',
      payTitle: 'Payment',
      operatorLabel: 'Operator',
      phoneLabel: 'Phone number',
      phonePlaceholder: '6XX XXX XXX',
      errorPhoneInvalid: 'Invalid format (e.g. 677 123 456).',
      payError: 'Payment error',
      paySuccess: 'Payment confirmed',
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
          r => r.reservation?.idReservation === reservationId,
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
📋 ${t.resNumber}: ${reservation.reservation.idReservation}
🗺️ ${reservation.voyage.lieuDepart} → ${reservation.voyage.lieuArrive}
📅 ${formatDate(reservation.voyage.dateDepartPrev, lang)}
🕐 ${t.depHour}: ${formatTime(reservation.voyage.heureDepartEffectif)}
🏢 ${reservation.agence.longName}
👥 ${reservation.reservation.nbrPassager} passager(s)
💰 Total: ${formatPrice(reservation.reservation.prixTotal)}
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
      await RNPrint.print({ html: generateTicketHTML(reservation, lang) });
    } catch (e) {
      console.log('PDF export error:', e);
      toast.error(lang === 'fr' ? 'Impossible d\'exporter le PDF' : 'Could not export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/reservation/annuler/${reservation.reservation.idReservation}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idReservation: reservation.reservation.idReservation,
            idPassagers: (reservation.passagers || []).map(p => p.idPassager),
            causeAnnulation: 'Annulation à la demande du client',
            origineAnnulation: 'CLIENT',
            canceled: true,
          }),
        },
      );
      if (res.ok) {
        toast.success(t.bookingCancelled);
        setCancelModalVisible(false);
        navigation.goBack();
      } else {
        toast.error(t.cancelError);
      }
    } catch(error) {
      console.log('Cancel error:', error);
      toast.error(t.cancelError);
    } finally {
      setCancelling(false);
    }
  };

  const handlePay = async () => {
    const digits = payPhone.replace(/\D/g, '');
    if (!/^[679]\d{8}$/.test(digits)) {
      setPayPhoneError(t.errorPhoneInvalid);
      return;
    }
    setPayPhoneError('');
    setPaying(true);
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const userId = user?.userId || user?.id;

      // TODO: appeler l'API de paiement mobile money (MTN/Orange) ici avant de confirmer.
      // Données disponibles : amount = reservation.prixTotal, mobilePhone = digits, operator = payOperator.
      // Si le paiement retourne false → toast.error + return.

      const res = await fetch(`${API_URL}/reservation/confirmer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reservationId: reservation!.reservation.idReservation,
          userId,
          amount: reservation!.reservation.prixTotal,
          mobilePhone: digits,
          mobilePhoneName: payOperator,
        }),
      });

      if (res.ok) {
        setPayModalVisible(false);
        setPayPhone('');
        await loadData();
        toast.success(t.paySuccess);
      } else {
        const data = await res.json().catch(() => ({}));
        setPayApiError(data?.message || t.payError);
      }
    } catch {
      setPayApiError(t.payError);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <SkeletonBookingDetail />;

  if (!reservation) return null;

  const statusRes =
    STATUS_RESERVATION[reservation.reservation.statutReservation] ||
    STATUS_RESERVATION.RESERVER;
  const isCancelled = reservation.reservation.statutReservation === 'ANNULEE';
  const isPaid = reservation.reservation.statutPayement === 'PAID';
  const passagers = reservation.passagers || [];

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.backgroundAlt }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
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
                {reservation.reservation.idReservation}
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
                          : '#ef4444',
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
                          : '#ef4444',
                    },
                  ]}
                >
                  {reservation.reservation.statutPayement === 'PAID'
                    ? lang === 'fr'
                      ? 'Payé'
                      : 'Paid'
                    : lang === 'fr'
                    ? 'Non payé'
                    : 'Unpaid'}
                </Text>
              </View>
            </View>
            <View style={[styles.qrContainer, { borderColor: theme.border }]}>
              <QRCode
                value={reservation.reservation.idReservation}
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
                  {new Date(reservation.voyage.dateDepartPrev).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  )}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.text }]}>
                  {new Date(reservation.voyage.dateDepartPrev).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { weekday: 'long' },
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.text} />
              <View>
                <Text style={[styles.metaValue, { color: theme.textStrong }]}>
                  {formatTime(reservation.voyage.heureDepartEffectif)}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.text }]}>
                  {t.depHour}
                </Text>
              </View>
            </View>

            {!!parseDuration(reservation.voyage.dureeVoyage) && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="hourglass-outline"
                  size={14}
                  color={theme.text}
                />
                <View>
                  <Text style={[styles.metaValue, { color: theme.textStrong }]}>
                    {parseDuration(reservation.voyage.dureeVoyage)}
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
        {passagers.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.passengers}
              </Text>
            </View>

            {passagers.map((p, index) => (
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
                      style={[
                        styles.passengerName,
                        { color: theme.textStrong },
                      ]}
                    >
                      {p.nom}
                    </Text>
                    <Text
                      style={[styles.passengerMeta, { color: theme.text }]}
                    >
                      ID: {p.carteID} • {p.genre} • {p.age}{' '}
                      {lang === 'fr' ? 'ans' : 'y/o'}
                    </Text>
                  </View>
                  <View style={styles.passengerSeat}>
                    <Text style={[styles.seatLabel, { color: theme.text }]}>
                      {t.seat}
                    </Text>
                    <Text
                      style={[styles.seatValue, { color: colors.primary }]}
                    >
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
                  <Text
                    style={[styles.ticketPriceLabel, { color: theme.text }]}
                  >
                    {t.ticketPrice}
                  </Text>
                  <Text
                    style={[
                      styles.ticketPriceValue,
                      { color: theme.textStrong },
                    ]}
                  >
                    {formatPrice(p.prixBillet)}
                  </Text>
                </View>

                {index < passagers.length - 1 && (
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
        )}

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
              {reservation.reservation.nbrPassager}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.textStrong }]}>
              {isPaid ? t.totalPaid : t.totalToPay}
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatPrice(reservation.reservation.prixTotal)}
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          {isPaid && (
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
                <Ionicons
                  name="document-outline"
                  size={18}
                  color={colors.primary}
                />
              )}
              <Text style={[styles.downloadBtnText, { color: colors.primary }]}>
                {exportingPdf ? t.exportingPdf : t.downloadTicket}
              </Text>
            </TouchableOpacity>
          )}

          {!isPaid && !isCancelled && (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPayModalVisible(true)}
            >
              <Text style={styles.cancelBtnText}>{t.payNow}</Text>
            </TouchableOpacity>
          )}

          {!isCancelled && (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.error }]}
              onPress={() => setCancelModalVisible(true)}
            >
              <Text style={styles.cancelBtnText}>{t.cancelReservation}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Pay modal */}
      <Modal visible={payModalVisible} animationType="slide" transparent onRequestClose={() => { setPayModalVisible(false); setPayPhone(''); setPayPhoneError(''); setPayApiError(''); }}>
        <View style={styles.payOverlay}>
          <View style={[styles.paySheet, { backgroundColor: theme.background }]}>
            <View style={[styles.paySheetHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.paySheetTitle, { color: theme.textStrong }]}>{t.payTitle}</Text>
              <TouchableOpacity onPress={() => { setPayModalVisible(false); setPayPhone(''); setPayPhoneError(''); setPayApiError(''); }}>
                <Ionicons name="close" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>

            <View style={styles.paySheetBody}>
              {/* Operator */}
              <Text style={[styles.payFieldLabel, { color: theme.text }]}>{t.operatorLabel}</Text>
              <View style={styles.operatorRow}>
                {(['MTN', 'ORANGE'] as const).map(op => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.operatorBtn, {
                      borderColor: payOperator === op ? (op === 'MTN' ? '#f59e0b' : '#ea580c') : theme.border,
                      backgroundColor: payOperator === op ? (op === 'MTN' ? '#fef3c7' : '#fff7ed') : theme.backgroundAlt,
                    }]}
                    onPress={() => setPayOperator(op)}
                  >
                    <View style={[styles.operatorRadio, { borderColor: payOperator === op ? (op === 'MTN' ? '#f59e0b' : '#ea580c') : theme.border }]}>
                      {payOperator === op && <View style={[styles.operatorRadioInner, { backgroundColor: op === 'MTN' ? '#f59e0b' : '#ea580c' }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.operatorName, { color: payOperator === op ? (op === 'MTN' ? '#92400e' : '#9a3412') : theme.textStrong }]}>
                        {op === 'MTN' ? 'MTN Mobile Money' : 'Orange Money'}
                      </Text>
                    </View>
                    <Image
                      source={op === 'MTN' ? require('../../../../assets/images/momo.jpg') : require('../../../../assets/images/om.png')}
                      style={styles.operatorLogo}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Phone */}
              <Text style={[styles.payFieldLabel, { color: theme.text, marginTop: spacing.md }]}>{t.phoneLabel}</Text>
              <View style={[styles.payPhoneInput, { borderColor: payPhoneError ? colors.error : theme.border, backgroundColor: theme.backgroundAlt }]}>
                <Ionicons name="phone-portrait-outline" size={18} color={payPhoneError ? colors.error : theme.text} />
                <TextInput
                  style={[{ flex: 1, color: theme.textStrong, ...typography.body, fontSize: typography.sizes.md }]}
                  value={payPhone}
                  onChangeText={v => { setPayPhone(v.replace(/\D/g, '').slice(0, 9)); setPayPhoneError(''); setPayApiError(''); }}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor={theme.text}
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
              {!!payPhoneError && <Text style={[styles.payFieldError, { color: colors.error }]}>{payPhoneError}</Text>}

              {!!payApiError && (
                <View style={[styles.payErrorBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[styles.payFieldError, { color: colors.error, flex: 1 }]}>{payApiError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.payConfirmBtn, { backgroundColor: colors.primary, opacity: paying ? 0.7 : 1, marginTop: spacing.lg }]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? <ActivityIndicator size="small" color="#fff" /> : null }
                <Text style={styles.cancelBtnText}>{paying ? '...' : t.payNow}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  payOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  paySheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  paySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  paySheetTitle: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
  },
  paySheetBody: {
    padding: spacing.lg,
  },
  payFieldLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginBottom: 6,
  },
  payFieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  operatorRow: { gap: spacing.sm },
  operatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  operatorRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorRadioInner: { width: 10, height: 10, borderRadius: 5 },
  operatorName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  operatorLogo: { width: 40, height: 40, borderRadius: 4 },
  payPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
  },
  payConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 4,
    gap: spacing.sm,
  },
  payErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    marginTop: spacing.md,
  },
});
