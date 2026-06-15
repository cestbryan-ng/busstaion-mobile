import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import SeatSelectionModal from './seat-selection-modal';
import PaymentModal from './payment-modal';

const { width } = Dimensions.get('window');

export type TripDetail = {
  idVoyage: string;
  titre: string;
  description: string;
  lieuDepart: string;
  lieuArrive: string;
  pointDeDepart: string;
  pointArrivee: string;
  heureDepart: string;
  heureArrive: string;
  dateDepartPrev: string;
  dureeVoyage: string;
  prix: number;
  nomClasseVoyage: string;
  statusVoyage: string;
  nomAgence: string;
  smallImage: string;
  bigImage: string;
  amenities: string[];
  nbrPlaceReservable: number;
  nbrPlaceRestante: number;
  placeReservees: number[];
  dateLimiteReservation: string;
  dateLimiteConfirmation: string;
  vehicule: {
    idVehicule: string;
    nom: string;
    modele: string;
    description: string;
    nbrPlaces: number;
    lienPhoto: string;
    plaqueMatricule: string;
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#7c3aed',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};

const AMENITY_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  AC: 'snow-outline',
  USB: 'phone-portrait-outline',
  SNACKS: 'fast-food-outline',
  TOILETTES: 'water-outline',
  DIVERTISSEMENT: 'tv-outline',
  BOISSONS: 'cafe-outline',
  COMFORTABLE_SEATS: 'body-outline',
  LUGGAGE_STORAGE: 'bag-outline',
  RESTROOMS: 'water-outline',
  POWER_OUTLETS: 'flash-outline',
  ENTERTAINMENT: 'tv-outline',
  CHILD_SEATS: 'happy-outline',
  PET_FRIENDLY: 'paw-outline',
  MEAL_SERVICE: 'restaurant-outline',
  ONBOARD_GUIDE: 'headset-outline',
  SEAT_SELECTION: 'grid-outline',
  GROUP_DISCOUNTS: 'people-outline',
  BEVERAGES: 'cafe-outline',
  AIRPORT_PICKUP: 'airplane-outline',
  AIRPORT_DROP_OFF: 'airplane-outline',
};

const AMENITY_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  AC: { fr: 'Climatisation', en: 'A/C' },
  USB: { fr: 'Prises USB', en: 'USB Ports' },
  SNACKS: { fr: 'Collations', en: 'Snacks' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  DIVERTISSEMENT: { fr: 'Divertissement', en: 'Entertainment' },
  BOISSONS: { fr: 'Boissons', en: 'Drinks' },
  COMFORTABLE_SEATS: { fr: 'Sièges confortables', en: 'Comfy seats' },
  LUGGAGE_STORAGE: { fr: 'Rangement bagages', en: 'Luggage' },
  RESTROOMS: { fr: 'Toilettes', en: 'Restrooms' },
  POWER_OUTLETS: { fr: 'Prises électriques', en: 'Power outlets' },
  ENTERTAINMENT: { fr: 'Divertissement', en: 'Entertainment' },
  CHILD_SEATS: { fr: 'Sièges enfant', en: 'Child seats' },
  PET_FRIENDLY: { fr: 'Animaux autorisés', en: 'Pet friendly' },
  MEAL_SERVICE: { fr: 'Service repas', en: 'Meal service' },
  ONBOARD_GUIDE: { fr: 'Guide à bord', en: 'Onboard guide' },
  SEAT_SELECTION: { fr: 'Sélection siège', en: 'Seat selection' },
  GROUP_DISCOUNTS: { fr: 'Réductions groupes', en: 'Group discounts' },
  BEVERAGES: { fr: 'Boissons', en: 'Beverages' },
  AIRPORT_PICKUP: { fr: 'Ramassage aéroport', en: 'Airport pickup' },
  AIRPORT_DROP_OFF: { fr: 'Dépôt aéroport', en: 'Airport drop-off' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TripDetail'>>();
  const { tripId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationId, setReservationId] = useState('');
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const carouselRef = useRef<FlatList>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = {
    fr: {
      title: 'Détail du voyage',
      published: 'PUBLIE',
      itinerary: 'Itinéraire et horaires',
      departure: 'Point de départ',
      arrival: "Point d'arrivée",
      depDate: 'Date de départ',
      depHour: 'Heure de départ',
      duration: 'Durée du trajet',
      vehicleTitle: 'Caractéristiques du véhicule',
      seePlaces: 'Voir les places',
      vehicleDesc: 'Description du véhicule',
      amenities: 'Équipements à bord',
      importantInfo: 'Informations importantes',
      reservationLimit: "Réservation possible jusqu'au",
      confirmLimit: 'Confirmation avant',
      cancellationPolicy: "Politique d'annulation",
      seeConds: 'Voir les conditions',
      about: 'À propos de ce voyage',
      seeMore: 'Voir plus',
      seeLess: 'Voir moins',
      pricePerPerson: 'Prix par personne',
      seatsLeft: 'Places restantes',
      bookBtn: 'Réserver ce voyage',
      totalPrice: 'Prix total',
      reviews: (n: number) => `${n} avis`,
      more: 'Plus',
    },
    en: {
      title: 'Trip detail',
      published: 'PUBLISHED',
      itinerary: 'Itinerary & schedule',
      departure: 'Departure point',
      arrival: 'Arrival point',
      depDate: 'Departure date',
      depHour: 'Departure time',
      duration: 'Duration',
      vehicleTitle: 'Vehicle details',
      seePlaces: 'See seats',
      vehicleDesc: 'Vehicle description',
      amenities: 'On-board amenities',
      importantInfo: 'Important information',
      reservationLimit: 'Book before',
      confirmLimit: 'Confirm before',
      cancellationPolicy: 'Cancellation policy',
      seeConds: 'View conditions',
      about: 'About this trip',
      seeMore: 'See more',
      seeLess: 'See less',
      pricePerPerson: 'Price per person',
      seatsLeft: 'Seats left',
      bookBtn: 'Book this trip',
      totalPrice: 'Total price',
      reviews: (n: number) => `${n} reviews`,
      more: 'More',
    },
  }[lang];

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [token, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const res = await fetch(`${API_URL}/voyage/byId/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setTrip(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  // ─── Carousel ─────────────────────────────────────────────────────────────

  const images = trip ? [trip.smallImage, trip.bigImage].filter(Boolean) : [];

  const nextImage = useCallback(() => {
    if (!images.length) return;
    setCurrentImageIndex(prev => {
      const next = (prev + 1) % images.length;
      carouselRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (!images.length) return;
    setCurrentImageIndex(prev => {
      const p = (prev - 1 + images.length) % images.length;
      carouselRef.current?.scrollToIndex({ index: p, animated: true });
      return p;
    });
  }, [images.length]);

  useEffect(() => {
    if (images.length > 1) {
      autoPlayRef.current = setInterval(nextImage, 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [images.length, nextImage]);

  // ─── Amenities ────────────────────────────────────────────────────────────

  const visibleAmenities = showAllAmenities
    ? trip?.amenities || []
    : (trip?.amenities || []).slice(0, 5);

  const extraAmenities = Math.max(0, (trip?.amenities?.length || 0) - 5);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!trip) return null;

  const classColor =
    CLASS_COLORS[trip.nomClasseVoyage?.split(' ')[0]] || colors.primary;

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
        {/* ── Header ── */}
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
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ── Image Carousel ── */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              data={images.length ? images : ['placeholder']}
              keyExtractor={(_, i) => i.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.carouselSlide,
                    { backgroundColor: theme.backgroundAlt },
                  ]}
                >
                  {item !== 'placeholder' ? (
                    <Image
                      source={{ uri: item }}
                      style={styles.carouselImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.carouselPlaceholder,
                        { backgroundColor: theme.backgroundAlt },
                      ]}
                    >
                      <Ionicons
                        name="bus-outline"
                        size={64}
                        color={theme.text}
                      />
                    </View>
                  )}
                </View>
              )}
            />

            {/* Arrows */}
            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowLeft]}
                  onPress={prevImage}
                >
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  onPress={nextImage}
                >
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1}/{images.length}
                </Text>
              </View>
            )}
          </View>

          {/* ── Thumbnails ── */}
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.thumbnailRow,
                { backgroundColor: theme.background },
              ]}
            >
              {images.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setCurrentImageIndex(i);
                    carouselRef.current?.scrollToIndex({
                      index: i,
                      animated: true,
                    });
                  }}
                >
                  <Image
                    source={{ uri: img }}
                    style={[
                      styles.thumbnail,
                      {
                        borderColor:
                          i === currentImageIndex
                            ? colors.primary
                            : theme.border,
                      },
                    ]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Trip Header Info ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.tripHeaderRow}>
              <View
                style={[
                  styles.classPill,
                  {
                    backgroundColor: classColor + '20',
                    borderColor: classColor,
                  },
                ]}
              >
                <Text style={[styles.classPillText, { color: classColor }]}>
                  {trip.nomClasseVoyage}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Text
                  style={[styles.statusPillText, { color: colors.success }]}
                >
                  {lang === 'fr' ? t.published : 'PUBLISHED'}
                </Text>
              </View>
            </View>

            <Text style={[styles.tripTitle, { color: theme.textStrong }]}>
              {trip.lieuDepart} → {trip.lieuArrive}
            </Text>

            {/* Date/Time/Duration */}
            <View style={styles.tripMeta}>
              <View style={styles.tripMetaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={theme.text}
                />
                <Text style={[styles.tripMetaText, { color: theme.text }]}>
                  {' '}
                  {new Date(trip.dateDepartPrev).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  )}
                </Text>
              </View>
              <View style={styles.tripMetaItem}>
                <Ionicons name="time-outline" size={14} color={theme.text} />
                <Text style={[styles.tripMetaText, { color: theme.text }]}>
                  {' '}
                  {trip.heureDepart}
                </Text>
              </View>
              <View style={styles.tripMetaItem}>
                <Ionicons
                  name="hourglass-outline"
                  size={14}
                  color={theme.text}
                />
                <Text style={[styles.tripMetaText, { color: theme.text }]}>
                  {' '}
                  {trip.dureeVoyage}
                </Text>
              </View>
            </View>

            {/* Agency */}
            <View style={[styles.agencyRow, { borderTopColor: theme.border }]}>
              <View
                style={[
                  styles.agencyLogo,
                  { backgroundColor: `${classColor}15` },
                ]}
              >
                <Text style={[styles.agencyLogoText, { color: classColor }]}>
                  {trip.nomAgence.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.agencyName, { color: theme.textStrong }]}>
                  {trip.nomAgence}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={[styles.ratingText, { color: theme.text }]}>
                    {' '}
                    4.5 · {t.reviews(128)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.callBtn, { borderColor: theme.border }]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={theme.textStrong}
                />
              </TouchableOpacity>
            </View>

            {/* Price + Seats */}
            <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
              <View>
                <Text style={[styles.priceLabel, { color: theme.text }]}>
                  {t.pricePerPerson}
                </Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  {formatPrice(trip.prix)}
                </Text>
              </View>
              <View style={styles.seatsInfo}>
                <Text style={[styles.priceLabel, { color: theme.text }]}>
                  {t.seatsLeft}
                </Text>
                <Text style={[styles.seatsValue, { color: theme.textStrong }]}>
                  {trip.nbrPlaceRestante} / {trip.nbrPlaceReservable}
                </Text>
              </View>
            </View>
          </View>

          {/* ── About ── */}
          {trip.description && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.about}
              </Text>
              <Text
                style={[styles.descText, { color: theme.text }]}
                numberOfLines={descExpanded ? undefined : 3}
              >
                {trip.description}
              </Text>
              <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)}>
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                  {descExpanded ? t.seeLess : t.seeMore}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Itinerary ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.itinerary}
            </Text>

            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineRow}>
                <Text
                  style={[styles.timelineHour, { color: theme.textStrong }]}
                >
                  {trip.heureDepart}
                </Text>
                <View style={styles.timelineDot}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.primary }]}
                  />
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: theme.border },
                    ]}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.timelineCity, { color: theme.textStrong }]}
                  >
                    {trip.lieuDepart}
                  </Text>
                  <Text style={[styles.timelineStation, { color: theme.text }]}>
                    {trip.pointDeDepart}
                  </Text>
                  <Text style={[styles.timelineLabel, { color: theme.text }]}>
                    {t.departure}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineRow}>
                <Text
                  style={[styles.timelineHour, { color: theme.textStrong }]}
                >
                  {trip.heureArrive}
                </Text>
                <View style={styles.timelineDot}>
                  <View
                    style={[styles.dot, { backgroundColor: theme.border }]}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.timelineCity, { color: theme.textStrong }]}
                  >
                    {trip.lieuArrive}
                  </Text>
                  <Text style={[styles.timelineStation, { color: theme.text }]}>
                    {trip.pointArrivee}
                  </Text>
                  <Text style={[styles.timelineLabel, { color: theme.text }]}>
                    {t.arrival}
                  </Text>
                </View>
              </View>
            </View>

            {/* Date/Hour/Duration blocks */}
            <View style={[styles.infoBlocks, { borderTopColor: theme.border }]}>
              <View style={styles.infoBlock}>
                <Text
                  style={[styles.infoBlockValue, { color: theme.textStrong }]}
                >
                  {new Date(trip.dateDepartPrev).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  )}
                </Text>
                <Text style={[styles.infoBlockLabel, { color: theme.text }]}>
                  {new Date(trip.dateDepartPrev).toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { weekday: 'long' },
                  )}
                </Text>
                <Text style={[styles.infoBlockTitle, { color: theme.text }]}>
                  {t.depDate}
                </Text>
              </View>
              <View
                style={[
                  styles.infoBlock,
                  { borderLeftColor: theme.border, borderLeftWidth: 1 },
                ]}
              >
                <Text
                  style={[styles.infoBlockValue, { color: theme.textStrong }]}
                >
                  {trip.heureDepart}
                </Text>
                <Text style={[styles.infoBlockTitle, { color: theme.text }]}>
                  {t.depHour}
                </Text>
              </View>
              <View
                style={[
                  styles.infoBlock,
                  { borderLeftColor: theme.border, borderLeftWidth: 1 },
                ]}
              >
                <Text
                  style={[styles.infoBlockValue, { color: theme.textStrong }]}
                >
                  {trip.dureeVoyage}
                </Text>
                <Text style={[styles.infoBlockTitle, { color: theme.text }]}>
                  {t.duration}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Vehicle ── */}
          {trip.vehicule && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.vehicleTitle}
              </Text>

              <View style={styles.vehicleRow}>
                <View
                  style={[
                    styles.vehicleImageContainer,
                    { backgroundColor: theme.backgroundAlt },
                  ]}
                >
                  {trip.vehicule.lienPhoto ? (
                    <Image
                      source={{ uri: trip.vehicule.lienPhoto }}
                      style={styles.vehicleImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="bus-outline" size={32} color={theme.text} />
                  )}
                </View>
                <View style={styles.vehicleInfo}>
                  <Text
                    style={[styles.vehicleName, { color: theme.textStrong }]}
                  >
                    {trip.vehicule.nom} {trip.vehicule.modele}
                  </Text>
                  <Text style={[styles.vehicleMeta, { color: theme.text }]}>
                    {trip.vehicule.nbrPlaces} places · {trip.nomClasseVoyage}
                  </Text>
                  <Text style={[styles.vehicleMeta, { color: theme.text }]}>
                    Plaque : {trip.vehicule.plaqueMatricule}
                  </Text>
                  <TouchableOpacity
                    style={styles.seePlacesBtn}
                    onPress={() => setShowSeatModal(true)}
                  >
                    <Ionicons
                      name="download-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.seePlacesBtnText,
                        { color: colors.primary },
                      ]}
                    >
                      {t.seePlaces}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {trip.vehicule.description && (
                <>
                  <Text
                    style={[
                      styles.vehicleDescTitle,
                      { color: theme.textStrong },
                    ]}
                  >
                    {t.vehicleDesc}
                  </Text>
                  <Text style={[styles.vehicleDescText, { color: theme.text }]}>
                    {trip.vehicule.description}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* ── Amenities ── */}
          {trip.amenities?.length > 0 && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.amenities}
              </Text>

              <View style={styles.amenitiesGrid}>
                {visibleAmenities.map(a => (
                  <View
                    key={a}
                    style={[
                      styles.amenityItem,
                      { backgroundColor: theme.backgroundAlt },
                    ]}
                  >
                    <Ionicons
                      name={AMENITY_ICONS[a] || 'ellipse-outline'}
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={[styles.amenityLabel, { color: theme.text }]}>
                      {lang === 'fr'
                        ? AMENITY_LABELS[a]?.fr || a
                        : AMENITY_LABELS[a]?.en || a}
                    </Text>
                  </View>
                ))}

                {!showAllAmenities && extraAmenities > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.amenityItem,
                      styles.amenityMore,
                      {
                        backgroundColor: theme.backgroundAlt,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setShowAllAmenities(true)}
                  >
                    <View
                      style={[
                        styles.moreCircle,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.moreCircleText}>
                        +{extraAmenities}
                      </Text>
                    </View>
                    <Text style={[styles.amenityLabel, { color: theme.text }]}>
                      {t.more}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ── Important Info ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.importantInfo}
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {t.reservationLimit}
              </Text>
              <Text style={[styles.infoValue, { color: theme.textStrong }]}>
                {trip.dateLimiteReservation
                  ? new Date(trip.dateLimiteReservation).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-GB',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )
                  : '—'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {t.confirmLimit}
              </Text>
              <Text style={[styles.infoValue, { color: theme.textStrong }]}>
                {trip.dateLimiteConfirmation
                  ? new Date(trip.dateLimiteConfirmation).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-GB',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )
                  : '—'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {t.cancellationPolicy}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    'https://www.termsfeed.com/live/2b6bd548-23a3-47e6-aee9-0e5dd0edb278',
                  )
                }
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {t.seeConds}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Sticky Footer ── */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <View>
            <Text style={[styles.footerLabel, { color: theme.text }]}>
              {t.totalPrice}
            </Text>
            <Text style={[styles.footerPrice, { color: colors.primary }]}>
              {formatPrice(trip.prix)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowSeatModal(true)}
          >
            <Text style={styles.bookBtnText}>{t.bookBtn}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seat Selection Modal */}
      {trip && (
        <SeatSelectionModal
          visible={showSeatModal}
          trip={trip}
          lang={lang}
          onClose={() => setShowSeatModal(false)}
          onConfirm={seats => {
            setSelectedSeats(seats);
            setShowSeatModal(false);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Payment Modal */}
      {trip && (
        <PaymentModal
          visible={showPaymentModal}
          trip={trip}
          selectedSeats={selectedSeats}
          lang={lang}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={resId => {
            setReservationId(resId);
            setShowPaymentModal(false);
            setReservationSuccess(true);
          }}
        />
      )}

      {/* Success Screen */}
      {reservationSuccess && (
        <View
          style={[styles.successOverlay, { backgroundColor: theme.background }]}
        >
          <View style={styles.successContent}>
            <View
              style={[
                styles.successIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={72}
                color={colors.success}
              />
            </View>
            <Text style={[styles.successTitle, { color: colors.success }]}>
              {lang === 'fr' ? 'Réservation réussie !' : 'Booking successful!'}
            </Text>
            <Text style={[styles.successSubtitle, { color: theme.text }]}>
              {lang === 'fr'
                ? 'Votre voyage a été réservé avec succès. Un email de confirmation vous a été envoyé.'
                : 'Your trip has been booked successfully. A confirmation email has been sent.'}
            </Text>

            {/* Recap */}
            <View
              style={[
                styles.successRecap,
                {
                  backgroundColor: theme.backgroundAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.successRecapRow}>
                <Text style={[styles.successRecapLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'N° de réservation' : 'Booking N°'}
                </Text>
                <Text
                  style={[
                    styles.successRecapValue,
                    { color: theme.textStrong },
                  ]}
                >
                  {reservationId}
                </Text>
              </View>
              <View
                style={[
                  styles.successRecapRow,
                  { borderTopColor: theme.border },
                ]}
              >
                <Text style={[styles.successRecapLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'Date' : 'Date'}
                </Text>
                <Text
                  style={[
                    styles.successRecapValue,
                    { color: theme.textStrong },
                  ]}
                >
                  {new Date(trip?.dateDepartPrev || '').toLocaleDateString(
                    lang === 'fr' ? 'fr-FR' : 'en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' },
                  )}{' '}
                  · {trip?.heureDepart}
                </Text>
              </View>
              <View
                style={[
                  styles.successRecapRow,
                  { borderTopColor: theme.border },
                ]}
              >
                <Text style={[styles.successRecapLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'Itinéraire' : 'Itinerary'}
                </Text>
                <Text
                  style={[
                    styles.successRecapValue,
                    { color: theme.textStrong },
                  ]}
                >
                  {trip?.lieuDepart} → {trip?.lieuArrive}
                </Text>
              </View>
              <View
                style={[
                  styles.successRecapRow,
                  { borderTopColor: theme.border },
                ]}
              >
                <Text style={[styles.successRecapLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'Sièges' : 'Seats'}
                </Text>
                <Text
                  style={[
                    styles.successRecapValue,
                    { color: theme.textStrong },
                  ]}
                >
                  {selectedSeats.join(', ')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Réservations' as any)}
            >
              <Text style={styles.successBtnText}>
                {lang === 'fr' ? 'Voir mes réservations' : 'View my bookings'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.successBtnOutline,
                { borderColor: colors.primary },
              ]}
              onPress={() => navigation.navigate('ClientHome')}
            >
              <Text
                style={[
                  styles.successBtnOutlineText,
                  { color: colors.primary },
                ]}
              >
                {lang === 'fr' ? "Retour à l'accueil" : 'Back to home'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },

  // Carousel
  carouselContainer: { position: 'relative' },
  carouselSlide: { width, height: 240 },
  carouselImage: { width: '100%', height: '100%' },
  carouselPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowLeft: { left: spacing.md },
  carouselArrowRight: { right: spacing.md },
  imageCounter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  imageCounterText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },
  thumbnailRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 56,
    height: 40,
    borderRadius: 4,
    borderWidth: 2,
  },

  // Section
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },

  // Trip Header
  tripHeaderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  classPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  classPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusPillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tripTitle: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.sm,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tripMetaItem: { flexDirection: 'row', alignItems: 'center' },
  tripMetaText: { ...typography.body, fontSize: typography.sizes.sm },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.lg },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { ...typography.body, fontSize: typography.sizes.xs },
  callBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  priceLabel: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  priceValue: { ...typography.heading, fontSize: typography.sizes.xl },
  seatsInfo: { alignItems: 'flex-end' },
  seatsValue: { ...typography.bodyBold, fontSize: typography.sizes.lg },

  // Description
  descText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  seeMoreText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },

  // Timeline
  timeline: { gap: spacing.sm },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  timelineHour: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    width: 48,
  },
  timelineDot: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { width: 2, height: 36, marginTop: 2 },
  timelineCity: { ...typography.bodyBold, fontSize: typography.sizes.md },
  timelineStation: { ...typography.body, fontSize: typography.sizes.sm },
  timelineLabel: { ...typography.body, fontSize: typography.sizes.xs },
  infoBlocks: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  infoBlock: { flex: 1, paddingHorizontal: spacing.sm },
  infoBlockValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  infoBlockLabel: { ...typography.body, fontSize: typography.sizes.xs },
  infoBlockTitle: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },

  // Vehicle
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  vehicleImageContainer: {
    width: 90,
    height: 70,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vehicleImage: { width: '100%', height: '100%' },
  vehicleInfo: { flex: 1 },
  vehicleName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  vehicleMeta: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  seePlacesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  seePlacesBtnText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  vehicleDescTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  vehicleDescText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },

  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityItem: {
    width: '18%',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 4,
    gap: spacing.xs,
  },
  amenityMore: { borderWidth: 1 },
  amenityLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  moreCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreCircleText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    color: '#fff',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 0,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  infoValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  linkText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerLabel: { ...typography.body, fontSize: typography.sizes.xs },
  footerPrice: { ...typography.heading, fontSize: typography.sizes.lg },
  bookBtn: {
    flex: 1,
    marginLeft: spacing.lg,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Success
  successOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    zIndex: 999,
  },
  successContent: { width: '100%', alignItems: 'center' },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  successRecap: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  successRecapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  successRecapLabel: { ...typography.body, fontSize: typography.sizes.sm },
  successRecapValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  successBtn: {
    width: '100%',
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  successBtnOutline: {
    width: '100%',
    height: 52,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBtnOutlineText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
  },
});
