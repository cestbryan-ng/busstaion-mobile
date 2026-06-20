import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { TripDetail } from './trip-detail';

type Props = {
  visible: boolean;
  trip: TripDetail;
  selectedSeats: number[];
  lang: 'fr' | 'en';
  onClose: () => void;
  onSuccess: (reservationId: string) => void;
};

type PaymentMethod = 'mobile_money' | 'card';

export default function PaymentModal({
  visible,
  trip,
  selectedSeats,
  lang,
  onClose,
  onSuccess,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('mobile_money');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = selectedSeats.length * trip.prix;

  const t = {
    fr: {
      title: 'Paiement',
      bookingDetails: 'Détails de la réservation',
      passenger: 'Passager',
      adult: '1 adulte',
      selectedSeats: 'Sièges sélectionnés',
      pricePerPerson: 'Prix par personne',
      totalToPay: 'Total à payer',
      paymentMethod: 'Méthode de paiement',
      mobileMoney: 'Mobile Money',
      mobileMoneyDesc: 'MTN, Orange',
      card: 'Carte bancaire',
      cardDesc: 'Visa, Mastercard',
      payNow: 'Payer maintenant',
      errorGeneric: 'Une erreur est survenue. Veuillez réessayer.',
    },
    en: {
      title: 'Payment',
      bookingDetails: 'Booking details',
      passenger: 'Passenger',
      adult: '1 adult',
      selectedSeats: 'Selected seats',
      pricePerPerson: 'Price per person',
      totalToPay: 'Total to pay',
      paymentMethod: 'Payment method',
      mobileMoney: 'Mobile Money',
      mobileMoneyDesc: 'MTN, Orange',
      card: 'Bank card',
      cardDesc: 'Visa, Mastercard',
      payNow: 'Pay now',
      errorGeneric: 'An error occurred. Please try again.',
    },
  }[lang];

  const cols =
    trip.vehicule?.nbrPlaces <= 40 ? 2 : trip.vehicule?.nbrPlaces <= 60 ? 3 : 4;
  const formatSeat = (seatNum: number) => {
    const col = (seatNum - 1) % cols;
    const row = Math.ceil(seatNum / cols);
    return `${String.fromCharCode(65 + col)}${String(row).padStart(2, '0')}`;
  };

  const handlePay = async () => {
    setLoading(true);
    setError('');

    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);

      const user = userRaw ? JSON.parse(userRaw) : null;

      const response = await fetch(`${API_URL}/reservation/reserver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idVoyage: trip.idVoyage,
          idUser: user?.userId || user?.id,
          nbrPassager: selectedSeats.length,
          montantPaye: totalPrice,
          passagerDTO: selectedSeats.map(s => ({
            nom: user?.last_name || '',
            prenom: user?.first_name || '',
            cni: '',
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const resId = data.idReservation || `RES-${Date.now()}`;
        onSuccess(resId);
      } else {
        setError(data.message || t.errorGeneric);
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.textStrong} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Trip summary */}
          <View
            style={[
              styles.tripCard,
              {
                backgroundColor: theme.backgroundAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.tripImage, { backgroundColor: theme.border }]}>
              {trip.smallImage ? (
                <Image
                  source={{ uri: trip.smallImage }}
                  style={styles.tripImageInner}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="bus-outline" size={24} color={theme.text} />
              )}
            </View>
            <View style={styles.tripInfo}>
              <View style={styles.tripRouteRow}>
                <Text style={[styles.tripRoute, { color: theme.textStrong }]}>
                  {trip.lieuDepart} → {trip.lieuArrive}
                </Text>
                <View
                  style={[
                    styles.classBadge,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Text
                    style={[styles.classBadgeText, { color: colors.primary }]}
                  >
                    {trip.nomClasseVoyage}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tripMeta, { color: theme.text }]}>
                {new Date(trip.dateDepartPrev).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-GB',
                  { day: 'numeric', month: 'long', year: 'numeric' },
                )}{' '}
                · {trip.heureDepart} · {trip.dureeVoyage}
              </Text>
              <Text style={[styles.tripMeta, { color: theme.text }]}>
                {trip.nomAgence}
              </Text>
            </View>
          </View>

          {/* Booking details */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.bookingDetails}
            </Text>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.text }]}>
                {t.passenger}
              </Text>
              <Text style={[styles.detailValue, { color: theme.textStrong }]}>
                {t.adult}
              </Text>
            </View>

            <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.text }]}>
                {t.selectedSeats}
              </Text>
              <Text style={[styles.detailValue, { color: theme.textStrong }]}>
                {selectedSeats.map(s => formatSeat(s)).join(', ')}
              </Text>
            </View>

            <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.detailLabel, { color: theme.text }]}>
                {t.pricePerPerson}
              </Text>
              <Text style={[styles.detailValue, { color: theme.textStrong }]}>
                {trip.prix.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>

            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.textStrong }]}>
                {t.totalToPay}
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          </View>

          {/* Payment methods */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.paymentMethod}
            </Text>

            {/* Mobile Money */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                {
                  borderColor:
                    paymentMethod === 'mobile_money'
                      ? colors.primary
                      : theme.border,
                },
                paymentMethod === 'mobile_money' && {
                  backgroundColor: `${colors.primary}08`,
                },
              ]}
              onPress={() => setPaymentMethod('mobile_money')}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor:
                      paymentMethod === 'mobile_money'
                        ? colors.primary
                        : theme.border,
                  },
                ]}
              >
                {paymentMethod === 'mobile_money' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentName, { color: theme.textStrong }]}>
                  {t.mobileMoney}
                </Text>
                <Text style={[styles.paymentDesc, { color: theme.text }]}>
                  {t.mobileMoneyDesc}
                </Text>
              </View>
              <View
                style={[styles.paymentIcon, { backgroundColor: '#fef3c7' }]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color="#d97706"
                />
              </View>
            </TouchableOpacity>

            {/* Card */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                {
                  borderColor:
                    paymentMethod === 'card' ? colors.primary : theme.border,
                },
                paymentMethod === 'card' && {
                  backgroundColor: `${colors.primary}08`,
                },
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor:
                      paymentMethod === 'card' ? colors.primary : theme.border,
                  },
                ]}
              >
                {paymentMethod === 'card' && (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentName, { color: theme.textStrong }]}>
                  {t.card}
                </Text>
                <Text style={[styles.paymentDesc, { color: theme.text }]}>
                  {t.cardDesc}
                </Text>
              </View>
              <View
                style={[styles.paymentIcon, { backgroundColor: '#eff6ff' }]}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error !== '' && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          )}
        </ScrollView>

        {/* Pay button */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.payBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handlePay}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                <Text style={styles.payBtnText}>{t.payNow}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  scroll: { padding: spacing.lg, gap: spacing.md },

  tripCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
  },
  tripImage: {
    width: 64,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tripImageInner: { width: '100%', height: '100%' },
  tripInfo: { flex: 1, gap: 3 },
  tripRouteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm, flex: 1 },
  classBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripMeta: { ...typography.body, fontSize: typography.sizes.xs },

  detailsCard: { borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  detailLabel: { ...typography.body, fontSize: typography.sizes.sm },
  detailValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  totalLabel: { ...typography.bodyBold, fontSize: typography.sizes.md },
  totalValue: { ...typography.heading, fontSize: typography.sizes.xl },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  paymentInfo: { flex: 1 },
  paymentName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  paymentDesc: { ...typography.body, fontSize: typography.sizes.xs },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  payBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  payBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
