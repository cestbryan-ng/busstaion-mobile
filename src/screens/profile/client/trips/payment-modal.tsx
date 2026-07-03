import React, { useState, useCallback, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { TripDetail } from './trip-detail';
import SuccessComponent from '../../../../components/success';
import ErrorComponent from '../../../../components/error';

type Props = {
  visible: boolean;
  trip: TripDetail;
  selectedSeats: number[];
  lang: 'fr' | 'en';
  onClose: () => void;
  onSuccess: (reservationId: string) => void;
};

type Step = 'passenger' | 'payment' | 'processing' | 'result';
type PayStatus = 'SUCCESS' | 'ERROR' | 'FAILED';
type Operator = 'MTN' | 'ORANGE';

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 9);
  if (d.length >= 7) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
  if (d.length >= 4) return d.slice(0, 3) + ' ' + d.slice(3);
  return d;
}

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

  // Steps
  const [step, setStep] = useState<Step>('passenger');

  // Passenger form
  const [passengerName, setPassengerName] = useState('');
  const [cni, setCni] = useState('');
  const [genre, setGenre] = useState<'MALE' | 'FEMALE'>('MALE');
  const [age, setAge] = useState('');
  const [nbrBaggage, setNbrBaggage] = useState('0');

  // Payment form
  const [operator, setOperator] = useState<Operator>('MTN');
  const [phone, setPhone] = useState('');

  // Field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Result state
  const [payStatus, setPayStatus] = useState<PayStatus | null>(null);
  const [reservationId, setReservationId] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');

  // Cancel polling on unmount
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPrice = selectedSeats.length * trip.prix;

  const t = {
    fr: {
      title: 'Paiement',
      summary: 'Résumé du voyage',
      stepPassenger: 'Informations passager',
      stepPayment: 'Méthode de paiement',
      nameLabel: 'Nom complet',
      namePlaceholder: 'Votre nom',
      cniLabel: 'Numéro CNI',
      cniPlaceholder: 'AA12345678',
      genreLabel: 'Genre',
      genreMale: 'Homme',
      genreFemale: 'Femme',
      ageLabel: 'Âge',
      agePlaceholder: '25',
      baggageLabel: 'Nombre de bagages',
      operatorLabel: 'Opérateur',
      phoneLabel: 'Numéro de téléphone',
      phonePlaceholder: '6XX XXX XXX',
      pricePerPerson: 'Prix par personne',
      totalToPay: 'Total à payer',
      selectedSeats: 'Sièges',
      next: 'Suivant',
      pay: 'Payer maintenant',
      processingReservation: 'Création de la réservation...',
      processingPayment: 'Initialisation du paiement...',
      processingPolling: 'Vérification du paiement...',
      successTitle: 'Paiement réussi !',
      successMsg: 'Votre réservation a été confirmée.',
      failedTitle: 'Paiement échoué',
      failedMsg: 'Le paiement n\'a pas pu être traité. Veuillez réessayer.',
      errorTitle: 'Erreur',
      errorMsg: 'Une erreur est survenue. Veuillez réessayer.',
      done: 'Terminer',
      retry: 'Réessayer',
      errorNameRequired: 'Le nom est requis.',
      errorNameShort: 'Nom trop court (min. 3 caractères).',
      errorCniRequired: 'Le numéro CNI est requis.',
      errorCniShort: 'CNI invalide (min. 5 caractères).',
      errorAgeRequired: 'L\'âge est requis.',
      errorAgeInvalid: 'Âge invalide (1 – 120).',
      errorPhoneRequired: 'Le numéro est requis.',
      errorPhoneInvalid: 'Format invalide (ex: 677 123 456).',
    },
    en: {
      title: 'Payment',
      summary: 'Trip summary',
      stepPassenger: 'Passenger information',
      stepPayment: 'Payment method',
      nameLabel: 'Full name',
      namePlaceholder: 'Your name',
      cniLabel: 'ID number',
      cniPlaceholder: 'AA12345678',
      genreLabel: 'Gender',
      genreMale: 'Male',
      genreFemale: 'Female',
      ageLabel: 'Age',
      agePlaceholder: '25',
      baggageLabel: 'Number of bags',
      operatorLabel: 'Operator',
      phoneLabel: 'Phone number',
      phonePlaceholder: '6XX XXX XXX',
      pricePerPerson: 'Price per person',
      totalToPay: 'Total to pay',
      selectedSeats: 'Seats',
      next: 'Next',
      pay: 'Pay now',
      processingReservation: 'Creating reservation...',
      processingPayment: 'Initiating payment...',
      processingPolling: 'Checking payment status...',
      successTitle: 'Payment successful!',
      successMsg: 'Your booking has been confirmed.',
      failedTitle: 'Payment failed',
      failedMsg: 'The payment could not be processed. Please try again.',
      errorTitle: 'Error',
      errorMsg: 'Something went wrong. Please try again.',
      done: 'Done',
      retry: 'Try again',
      errorNameRequired: 'Full name is required.',
      errorNameShort: 'Name too short (min. 3 characters).',
      errorCniRequired: 'ID number is required.',
      errorCniShort: 'Invalid ID (min. 5 characters).',
      errorAgeRequired: 'Age is required.',
      errorAgeInvalid: 'Invalid age (1 – 120).',
      errorPhoneRequired: 'Phone number is required.',
      errorPhoneInvalid: 'Invalid format (e.g. 677 123 456).',
    },
  }[lang];

  const cols =
    trip.vehicule?.nbrPlaces <= 40 ? 2 : trip.vehicule?.nbrPlaces <= 60 ? 3 : 4;
  const formatSeat = (seatNum: number) => {
    const col = (seatNum - 1) % cols;
    const row = Math.ceil(seatNum / cols);
    return `${String.fromCharCode(65 + col)}${String(row).padStart(2, '0')}`;
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validatePassenger = (): boolean => {
    const errors: Record<string, string> = {};
    if (!passengerName.trim()) errors.name = t.errorNameRequired;
    else if (passengerName.trim().length < 3) errors.name = t.errorNameShort;
    if (!cni.trim()) errors.cni = t.errorCniRequired;
    else if (cni.trim().length < 5) errors.cni = t.errorCniShort;
    const ageNum = parseInt(age, 10);
    if (!age.trim()) errors.age = t.errorAgeRequired;
    else if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) errors.age = t.errorAgeInvalid;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePayment = (): boolean => {
    const errors: Record<string, string> = {};
    const digits = phone.replace(/\D/g, '');
    if (!digits) errors.phone = t.errorPhoneRequired;
    else if (!/^[679]\d{8}$/.test(digits)) errors.phone = t.errorPhoneInvalid;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Poll payment status recursively
  const pollPaymentStatus = useCallback(
    async (txCode: string, token: string, resId: string, attempt = 0) => {
      if (attempt >= 20) {
        setPayStatus('FAILED');
        setStep('result');
        return;
      }
      setProcessingMsg(t.processingPolling);
      try {
        const res = await fetch(
          `${API_URL}/reservation/paiement/status/${txCode}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const status = (await res.json()) as PayStatus;
          if (status === 'SUCCESS' || status === 'ERROR' || status === 'FAILED') {
            setPayStatus(status);
            setStep('result');
            if (status === 'SUCCESS') onSuccess(resId);
            return;
          }
        }
      } catch {
        // network hiccup — keep polling
      }
      pollTimerRef.current = setTimeout(
        () => pollPaymentStatus(txCode, token, resId, attempt + 1),
        3000,
      );
    },
    [t.processingPolling, onSuccess],
  );

  const handleSubmit = async () => {
    if (!validatePayment()) return;

    setStep('processing');
    setPayStatus(null);

    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);
      const user = userRaw ? JSON.parse(userRaw) : null;
      const userId = user?.userId || user?.id;

      // Step 1 – create reservation
      setProcessingMsg(t.processingReservation);
      const reserveRes = await fetch(`${API_URL}/reservation/reserver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idVoyage: trip.idVoyage,
          idUser: userId,
          nbrPassager: selectedSeats.length,
          montantPaye: totalPrice,
          passagerDTO: selectedSeats.map(seat => ({
            nom: passengerName.trim(),
            numeroPieceIdentific: cni.trim(),
            genre,
            age: parseInt(age, 10),
            nbrBaggage: parseInt(nbrBaggage, 10) || 0,
            placeChoisis: seat,
          })),
        }),
      });

      const reserveData = await reserveRes.json();
      if (!reserveRes.ok) {
        setPayStatus('ERROR');
        setStep('result');
        return;
      }

      const resId: string = reserveData.idReservation || reserveData.id || '';
      setReservationId(resId);

      // Step 2 – initiate mobile money payment
      setProcessingMsg(t.processingPayment);
      const payRes = await fetch(`${API_URL}/paiement/initier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobilePhone: phone.replace(/\D/g, ''),
          mobilePhoneName: operator,
          amount: totalPrice,
          userId,
          reservationId: resId,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok || payData.status === 'ERROR' || payData.status === 'FAILED') {
        setPayStatus('FAILED');
        setStep('result');
        return;
      }

      const txCode: string = payData.data?.transaction_code || '';
      if (!txCode) {
        // No transaction code — treat as immediate failure
        setPayStatus('FAILED');
        setStep('result');
        return;
      }

      // Step 3 – poll status
      if (token) {
        pollPaymentStatus(txCode, token, resId);
      }
    } catch {
      setPayStatus('ERROR');
      setStep('result');
    }
  };

  const handleClose = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setStep('passenger');
    setPassengerName('');
    setCni('');
    setGenre('MALE');
    setAge('');
    setNbrBaggage('0');
    setPhone('');
    setFieldErrors({});
    setPayStatus(null);
    setReservationId('');
    setProcessingMsg('');
    onClose();
  };

  const inputStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: theme.backgroundAlt,
      borderColor: fieldErrors[field] ? colors.error : theme.border,
      color: theme.textStrong,
    },
  ];

  // ── Shared header ──────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <View style={{ width: 24 }}>
        {step === 'payment' && (
          <TouchableOpacity onPress={() => { setFieldErrors({}); setStep('passenger'); }}>
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color: theme.textStrong }]}>{t.title}</Text>
      <TouchableOpacity onPress={handleClose} disabled={step === 'processing'}>
        <Ionicons
          name="close"
          size={24}
          color={step === 'processing' ? theme.border : theme.textStrong}
        />
      </TouchableOpacity>
    </View>
  );

  // ── Trip summary card ──────────────────────────────────────────────────────
  const renderTripCard = () => (
    <View
      style={[
        styles.tripCard,
        { backgroundColor: theme.backgroundAlt, borderColor: theme.border },
      ]}
    >
      <View style={[styles.tripImage, { backgroundColor: theme.border }]}>
        {trip.smallImage ? (
          <Image source={{ uri: trip.smallImage }} style={styles.tripImageInner} resizeMode="cover" />
        ) : (
          <Ionicons name="bus-outline" size={24} color={theme.text} />
        )}
      </View>
      <View style={styles.tripInfo}>
        <Text style={[styles.tripRoute, { color: theme.textStrong }]}>
          {lang === 'fr'
            ? `De ${trip.lieuDepart} vers ${trip.lieuArrive}`
            : `From ${trip.lieuDepart} to ${trip.lieuArrive}`}
        </Text>
        <View style={styles.stationsCol}>
          <View style={styles.stationLine}>
            <Ionicons name="location" size={11} color={colors.primary} />
            <Text style={[styles.stationText, { color: theme.text }]} numberOfLines={1}>
              {trip.pointDeDepart}
            </Text>
          </View>
          <View style={styles.stationLine}>
            <Ionicons name="location-outline" size={11} color={theme.text} />
            <Text style={[styles.stationText, { color: theme.text }]} numberOfLines={1}>
              {trip.pointArrivee}
            </Text>
          </View>
        </View>
        <Text style={[styles.tripMeta, { color: theme.text }]}>
          {new Date(trip.dateDepartPrev).toLocaleDateString(
            lang === 'fr' ? 'fr-FR' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' },
          )}{' '}
          · {formatTime(trip.heureDepartEffectif)}
        </Text>
        <Text style={[styles.tripMeta, { color: theme.text }]} numberOfLines={1}>
          {trip.nomAgence}
        </Text>
        <Text style={[styles.tripPrice, { color: colors.primary }]}>
          {totalPrice.toLocaleString('fr-FR')} FCFA
        </Text>
      </View>
    </View>
  );

  // ── Price rows ─────────────────────────────────────────────────────────────
  const renderPriceRows = () => (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: theme.text }]}>{t.selectedSeats}</Text>
        <Text style={[styles.priceValue, { color: theme.textStrong }]}>
          {selectedSeats.map(s => formatSeat(s)).join(', ')}
        </Text>
      </View>
      <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.priceLabel, { color: theme.text }]}>{t.pricePerPerson}</Text>
        <Text style={[styles.priceValue, { color: theme.textStrong }]}>
          {trip.prix.toLocaleString('fr-FR')} FCFA
        </Text>
      </View>
      <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.totalLabel, { color: theme.textStrong }]}>{t.totalToPay}</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>
          {totalPrice.toLocaleString('fr-FR')} FCFA
        </Text>
      </View>
    </View>
  );

  // ── Step indicator ─────────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {(['passenger', 'payment'] as const).map((s, i) => (
        <React.Fragment key={s}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  step === s || (step === 'processing' && i === 1) || (step === 'result' && i === 1)
                    ? colors.primary
                    : theme.border,
              },
            ]}
          >
            <Text style={styles.stepDotText}>{i + 1}</Text>
          </View>
          {i < 1 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    step === 'payment' || step === 'processing' || step === 'result'
                      ? colors.primary
                      : theme.border,
                },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // ── STEP 1: Passenger info ─────────────────────────────────────────────────
  const renderPassengerStep = () => (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {renderTripCard()}
        {renderStepIndicator()}

        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>{t.stepPassenger}</Text>
          <View style={styles.formBody}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.nameLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={fieldErrors.name ? colors.error : theme.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={inputStyle('name')}
                  value={passengerName}
                  onChangeText={v => { setPassengerName(v); clearFieldError('name'); }}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor={theme.text}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {fieldErrors.name ? (
                <Text style={[styles.fieldError, { color: colors.error }]}>{fieldErrors.name}</Text>
              ) : null}
            </View>

            {/* CNI */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.cniLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color={fieldErrors.cni ? colors.error : theme.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={inputStyle('cni')}
                  value={cni}
                  onChangeText={v => { setCni(v.replace(/\s/g, '')); clearFieldError('cni'); }}
                  placeholder={t.cniPlaceholder}
                  placeholderTextColor={theme.text}
                  keyboardType="default"
                  returnKeyType="next"
                />
              </View>
              {fieldErrors.cni ? (
                <Text style={[styles.fieldError, { color: colors.error }]}>{fieldErrors.cni}</Text>
              ) : null}
            </View>

            {/* Genre */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.genreLabel}</Text>
              <View style={styles.toggleRow}>
                {(['MALE', 'FEMALE'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.toggleBtn,
                      {
                        borderColor: genre === g ? colors.primary : theme.border,
                        backgroundColor: genre === g ? `${colors.primary}10` : theme.backgroundAlt,
                      },
                    ]}
                    onPress={() => setGenre(g)}
                  >
                    <Ionicons
                      name={g === 'MALE' ? 'male-outline' : 'female-outline'}
                      size={16}
                      color={genre === g ? colors.primary : theme.text}
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        { color: genre === g ? colors.primary : theme.text },
                      ]}
                    >
                      {g === 'MALE' ? t.genreMale : t.genreFemale}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age + Baggage */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.ageLabel}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="calendar-number-outline"
                    size={18}
                    color={fieldErrors.age ? colors.error : theme.text}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={inputStyle('age')}
                    value={age}
                    onChangeText={v => { setAge(v.replace(/\D/g, '').slice(0, 3)); clearFieldError('age'); }}
                    placeholder={t.agePlaceholder}
                    placeholderTextColor={theme.text}
                    keyboardType="numeric"
                    maxLength={3}
                    returnKeyType="next"
                  />
                </View>
                {fieldErrors.age ? (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{fieldErrors.age}</Text>
                ) : null}
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.baggageLabel}</Text>
                <View style={styles.baggageRow}>
                  <TouchableOpacity
                    style={[styles.baggageBtn, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
                    onPress={() => setNbrBaggage(prev => String(Math.max(0, parseInt(prev, 10) - 1)))}
                  >
                    <Ionicons name="remove" size={16} color={theme.textStrong} />
                  </TouchableOpacity>
                  <Text style={[styles.baggageCount, { color: theme.textStrong }]}>{nbrBaggage}</Text>
                  <TouchableOpacity
                    style={[styles.baggageBtn, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}
                    onPress={() => setNbrBaggage(prev => String(Math.min(10, parseInt(prev, 10) + 1)))}
                  >
                    <Ionicons name="add" size={16} color={theme.textStrong} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => { if (validatePassenger()) { setFieldErrors({}); setStep('payment'); } }}
        >
          <Text style={styles.actionBtnText}>{t.next}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── STEP 2: Payment method ─────────────────────────────────────────────────
  const renderPaymentStep = () => (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {renderTripCard()}
        {renderStepIndicator()}
        {renderPriceRows()}

        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>{t.stepPayment}</Text>
          <View style={styles.formBody}>
            {/* Operator selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.operatorLabel}</Text>
              <View style={styles.operatorRow}>
                <TouchableOpacity
                  style={[
                    styles.operatorBtn,
                    {
                      borderColor: operator === 'MTN' ? '#f59e0b' : theme.border,
                      backgroundColor: operator === 'MTN' ? '#fef3c7' : theme.backgroundAlt,
                    },
                  ]}
                  onPress={() => setOperator('MTN')}
                >
                  <View style={[styles.operatorRadio, { borderColor: operator === 'MTN' ? '#f59e0b' : theme.border }]}>
                    {operator === 'MTN' && <View style={[styles.operatorRadioInner, { backgroundColor: '#f59e0b' }]} />}
                  </View>
                  <View style={styles.operatorInfo}>
                    <Text style={[styles.operatorName, { color: operator === 'MTN' ? '#92400e' : theme.textStrong }]}>
                      MTN Mobile Money
                    </Text>
                    <Text style={[styles.operatorDesc, { color: theme.text }]}>MoMo</Text>
                  </View>
                  <Image
                    source={require('../../../../assets/images/momo.jpg')}
                    style={styles.operatorLogo}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.operatorBtn,
                    {
                      borderColor: operator === 'ORANGE' ? '#ea580c' : theme.border,
                      backgroundColor: operator === 'ORANGE' ? '#fff7ed' : theme.backgroundAlt,
                    },
                  ]}
                  onPress={() => setOperator('ORANGE')}
                >
                  <View style={[styles.operatorRadio, { borderColor: operator === 'ORANGE' ? '#ea580c' : theme.border }]}>
                    {operator === 'ORANGE' && <View style={[styles.operatorRadioInner, { backgroundColor: '#ea580c' }]} />}
                  </View>
                  <View style={styles.operatorInfo}>
                    <Text style={[styles.operatorName, { color: operator === 'ORANGE' ? '#9a3412' : theme.textStrong }]}>
                      Orange Money
                    </Text>
                    <Text style={[styles.operatorDesc, { color: theme.text }]}>OM</Text>
                  </View>
                  <Image
                    source={require('../../../../assets/images/om.png')}
                    style={styles.operatorLogo}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{t.phoneLabel}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color={fieldErrors.phone ? colors.error : theme.text}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={inputStyle('phone')}
                  value={phone}
                  onChangeText={v => { setPhone(formatPhone(v)); clearFieldError('phone'); }}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor={theme.text}
                  keyboardType="phone-pad"
                  maxLength={11}
                  returnKeyType="done"
                />
              </View>
              {fieldErrors.phone ? (
                <Text style={[styles.fieldError, { color: colors.error }]}>{fieldErrors.phone}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>{t.pay}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── STEP 3: Processing ─────────────────────────────────────────────────────
  const renderProcessingStep = () => (
    <View style={styles.centeredStep}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.processingText, { color: theme.textStrong }]}>{processingMsg}</Text>
      <Text style={[styles.processingSubText, { color: theme.text }]}>
        {lang === 'fr' ? 'Veuillez ne pas fermer cette fenêtre.' : 'Please do not close this window.'}
      </Text>
    </View>
  );

  // ── STEP 4: Result ─────────────────────────────────────────────────────────
  const renderResultStep = () => {
    const isSuccess = payStatus === 'SUCCESS';
    if (isSuccess) {
      return (
        <SuccessComponent
          title={t.successTitle}
          message={t.successMsg}
          buttonText={t.done}
          onPress={handleClose}
        />
      );
    }
    return (
      <ErrorComponent
        title={payStatus === 'FAILED' ? t.failedTitle : t.errorTitle}
        message={payStatus === 'FAILED' ? t.failedMsg : t.errorMsg}
        buttonText={t.retry}
        onPress={() => { setStep('payment'); setPayStatus(null); }}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {step !== 'processing' && step !== 'result' && renderHeader()}
          {step === 'passenger' && renderPassengerStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'result' && renderResultStep()}
        </View>
      </KeyboardAvoidingView>
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

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: { ...typography.bodyBold, fontSize: 12, color: '#fff' },
  stepLine: { width: 48, height: 2, marginHorizontal: 6 },

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
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  tripMeta: { ...typography.body, fontSize: typography.sizes.xs },
  tripBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripPrice: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  card: { borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formBody: { padding: spacing.md, gap: spacing.md },

  fieldGroup: { gap: 6 },
  fieldLabel: { ...typography.body, fontSize: typography.sizes.sm },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: spacing.sm, top: 13, zIndex: 1 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 4,
    paddingLeft: 38,
    paddingRight: spacing.md,
    ...typography.body,
    fontSize: typography.sizes.md,
  },
  fieldError: { ...typography.body, fontSize: typography.sizes.xs },
  rowFields: { flexDirection: 'row', gap: spacing.md },

  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  toggleText: { ...typography.body, fontSize: typography.sizes.sm },

  baggageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 2 },
  baggageBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baggageCount: { ...typography.bodyBold, fontSize: typography.sizes.lg, minWidth: 24, textAlign: 'center' },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  priceLabel: { ...typography.body, fontSize: typography.sizes.sm },
  priceValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
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
  operatorInfo: { flex: 1 },
  operatorName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  operatorDesc: { ...typography.body, fontSize: typography.sizes.xs },
  operatorIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorIconText: { ...typography.bodyBold, fontSize: 16, color: '#fff' },
  operatorLogo: { width: 40, height: 40, borderRadius: 4 },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  actionBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
    letterSpacing: 0.3,
  },

  centeredStep: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  processingText: { ...typography.bodyBold, fontSize: typography.sizes.md, textAlign: 'center' },
  processingSubText: { ...typography.body, fontSize: typography.sizes.sm, textAlign: 'center' },
  resultIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  retryBtn: {
    height: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md, letterSpacing: 0.3 },
  resultTitle: { ...typography.heading, fontSize: typography.sizes.xl, textAlign: 'center' },
  resultMsg: { ...typography.body, fontSize: typography.sizes.sm, textAlign: 'center' },
  stationsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'nowrap' },
  stationsCol: { gap: 2 },
  stationLine: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stationText: { ...typography.body, fontSize: typography.sizes.xs, flexShrink: 1 },
});
