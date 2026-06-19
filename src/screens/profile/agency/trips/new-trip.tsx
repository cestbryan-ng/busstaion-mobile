import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
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

type Step = 1 | 2 | 3 | 4 | 5;

type Vehicle = {
  idVehicule: string;
  immatriculation?: string;
  capacite?: number;
  modele?: string;
  nom?: string;
};
type Driver = { userId: string; nom?: string; prenom?: string };
type TClass = { idClassVoyage: string; nom: string };

type FormData = {
  titre: string;
  description: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepartEffectif: string;
  heureArrive: string;
  vehiculeId: string;
  chauffeurId: string;
  classVoyageId: string;
  nbrPlaceReservable: string;
  amenities: string[];
  prix: string;
  statusVoyage: 'EN_ATTENTE' | 'PUBLIE';
};

const CITIES = [
  'Douala',
  'Yaoundé',
  'Bafoussam',
  'Kribi',
  'Buea',
  'Garoua',
  'Bertoua',
  'Maroua',
  'Ngaoundéré',
  'Bamenda',
];

const STEP_LABELS_FR = [
  'Itinéraire',
  'Ressources',
  'Détails',
  'Tarifs',
  'Confirmation',
];
const STEP_LABELS_EN = [
  'Itinerary',
  'Resources',
  'Details',
  'Pricing',
  'Confirmation',
];

export default function AgencyNewTrip() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyNewTrip'>>();
  const editTripId = route.params?.editTripId;
  const isEdit = !!editTripId;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [step, setStep] = useState<Step>(1);
  const [agencyId, setAgencyId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [classes, setClasses] = useState<TClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );

  const [form, setForm] = useState<FormData>({
    titre: '',
    description: '',
    lieuDepart: '',
    lieuArrive: '',
    dateDepartPrev: '',
    heureDepartEffectif: '08:00',
    heureArrive: '12:30',
    vehiculeId: '',
    chauffeurId: '',
    classVoyageId: '',
    nbrPlaceReservable: '40',
    amenities: [],
    prix: '',
    statusVoyage: 'EN_ATTENTE',
  });

  const t = {
    fr: {
      titleNew: 'Nouveau voyage',
      titleEdit: 'Modifier le voyage',
      stepLabels: STEP_LABELS_FR,
      baseInfo: 'Informations de base',
      tripTitle: 'Titre du voyage *',
      titlePlaceholder: 'Douala → Kribi Premium',
      description: 'Description',
      descPlaceholder: 'Voyage confortable avec pause déjeuner incluse.',
      departure: 'Lieu de départ *',
      arrival: "Lieu d'arrivée *",
      depDate: 'Date de départ prévue *',
      depHour: 'Heure de départ prévue *',
      arrHour: "Heure d'arrivée prévue *",
      additionalInfo: 'Informations complémentaires',
      seatsAvailable: 'Places disponibles *',
      travelClass: 'Classe de voyage *',
      status: 'Statut *',
      draft: 'EN ATTENTE (Brouillon)',
      published: 'PUBLIÉ',
      vehicle: 'Véhicule *',
      driver: 'Chauffeur *',
      selectVehicle: 'Sélectionner un véhicule',
      selectDriver: 'Sélectionner un chauffeur',
      selectClass: 'Sélectionner une classe',
      price: 'Prix par personne (FCFA) *',
      pricePlaceholder: '15000',
      next: 'Suivant',
      saveDraft: 'Enregistrer en brouillon',
      publish: 'Publier le voyage',
      edit: 'Enregistrer les modifications',
      required: 'Champ requis',
      summary: 'Récapitulatif',
    },
    en: {
      titleNew: 'New trip',
      titleEdit: 'Edit trip',
      stepLabels: STEP_LABELS_EN,
      baseInfo: 'Basic information',
      tripTitle: 'Trip title *',
      titlePlaceholder: 'Douala → Kribi Premium',
      description: 'Description',
      descPlaceholder: 'Comfortable trip with lunch break included.',
      departure: 'Departure *',
      arrival: 'Arrival *',
      depDate: 'Departure date *',
      depHour: 'Departure time *',
      arrHour: 'Arrival time *',
      additionalInfo: 'Additional information',
      seatsAvailable: 'Available seats *',
      travelClass: 'Travel class *',
      status: 'Status *',
      draft: 'PENDING (Draft)',
      published: 'PUBLISHED',
      vehicle: 'Vehicle *',
      driver: 'Driver *',
      selectVehicle: 'Select a vehicle',
      selectDriver: 'Select a driver',
      selectClass: 'Select a class',
      price: 'Price per person (FCFA) *',
      pricePlaceholder: '15000',
      next: 'Next',
      saveDraft: 'Save as draft',
      publish: 'Publish trip',
      edit: 'Save changes',
      required: 'Required field',
      summary: 'Summary',
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
        const agencyData = await agencyRes.json();
        setAgencyId(agencyData.agencyId);

        const [vRes, dRes, cRes] = await Promise.allSettled([
          fetch(`${API_URL}/vehicule/agence/${agencyData.agencyId}`, {
            headers,
          }),
          fetch(`${API_URL}/chauffeur/chauffeurs/${agencyData.agencyId}`, {
            headers,
          }),
          fetch(`${API_URL}/class-voyage/agence/${agencyData.agencyId}`, {
            headers,
          }),
        ]);

        if (vRes.status === 'fulfilled' && vRes.value.ok)
          setVehicles(await vRes.value.json());
        if (dRes.status === 'fulfilled' && dRes.value.ok)
          setDrivers(await dRes.value.json());
        if (cRes.status === 'fulfilled' && cRes.value.ok)
          setClasses(await cRes.value.json());

        // Edit mode: load existing trip
        if (editTripId) {
          const tripRes = await fetch(`${API_URL}/voyage/byId/${editTripId}`, {
            headers,
          });
          if (tripRes.ok) {
            const trip = await tripRes.json();
            setForm(prev => ({
              ...prev,
              titre: trip.titre || '',
              description: trip.description || '',
              lieuDepart: trip.lieuDepart || '',
              lieuArrive: trip.lieuArrive || '',
              dateDepartPrev: trip.dateDepartPrev?.split('T')[0] || '',
              heureDepartEffectif: trip.heureDepart || '08:00',
              heureArrive: trip.heureArrive || '12:30',
              nbrPlaceReservable: String(trip.nbrPlaceReservable || 40),
              prix: String(trip.prix || ''),
              statusVoyage:
                trip.statusVoyage === 'PUBLIE' ? 'PUBLIE' : 'EN_ATTENTE',
            }));
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editTripId]);

  const update = (key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!form.titre.trim()) e.titre = t.required;
      if (!form.lieuDepart) e.lieuDepart = t.required;
      if (!form.lieuArrive) e.lieuArrive = t.required;
      if (!form.dateDepartPrev) e.dateDepartPrev = t.required;
    }
    if (step === 2) {
      if (!form.vehiculeId) e.vehiculeId = t.required;
      if (!form.classVoyageId) e.classVoyageId = t.required;
    }
    if (step === 4) {
      if (!form.prix.trim()) e.prix = t.required;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 5) setStep((step + 1) as Step);
  };

  const handleSubmit = async (status: 'EN_ATTENTE' | 'PUBLIE') => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        titre: form.titre,
        description: form.description,
        lieuDepart: form.lieuDepart,
        lieuArrive: form.lieuArrive,
        dateDepartPrev: form.dateDepartPrev,
        heureDepartEffectif: form.heureDepartEffectif,
        heureArrive: form.heureArrive,
        nbrPlaceReservable: Number(form.nbrPlaceReservable),
        nbrPlaceRestante: Number(form.nbrPlaceReservable),
        statusVoyage: status,
        vehiculeId: form.vehiculeId,
        chauffeurId: form.chauffeurId || undefined,
        classVoyageId: form.classVoyageId,
        prix: Number(form.prix),
      };

      const url = isEdit
        ? `${API_URL}/voyage/${editTripId}`
        : `${API_URL}/voyage/create`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) navigation.goBack();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline,
    error,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: any;
    multiline?: boolean;
    error?: string;
  }) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.fieldInput,
          {
            borderColor: error ? colors.error : theme.border,
            backgroundColor: theme.backgroundAlt,
            color: theme.textStrong,
          },
          multiline && {
            height: 80,
            textAlignVertical: 'top',
            paddingTop: spacing.sm,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );

  const CityPicker = ({
    label,
    value,
    onSelect,
    error,
  }: {
    label: string;
    value: string;
    onSelect: (v: string) => void;
    error?: string;
  }) => (
    <View style={[styles.field, { flex: 1 }]}>
      <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
        {label}
      </Text>
      <View
        style={[
          styles.picker,
          {
            borderColor: error ? colors.error : theme.border,
            backgroundColor: theme.backgroundAlt,
          },
        ]}
      >
        <ScrollView style={{ maxHeight: 120 }}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={[
                styles.pickerOption,
                value === city && { backgroundColor: `${colors.primary}10` },
              ]}
              onPress={() => onSelect(city)}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  { color: value === city ? colors.primary : theme.textStrong },
                ]}
              >
                {city}
              </Text>
              {value === city && (
                <Ionicons name="checkmark" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );

  const SelectPicker = ({
    label,
    value,
    onSelect,
    options,
    placeholder,
    error,
  }: {
    label: string;
    value: string;
    onSelect: (v: string) => void;
    options: { id: string; label: string }[];
    placeholder: string;
    error?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const selected = options.find(o => o.id === value);
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {label}
        </Text>
        <TouchableOpacity
          style={[
            styles.selectBtn,
            {
              borderColor: error ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
            },
          ]}
          onPress={() => setOpen(!open)}
        >
          <Text
            style={[
              styles.selectBtnText,
              { color: selected ? theme.textStrong : theme.text },
            ]}
          >
            {selected?.label || placeholder}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.text}
          />
        </TouchableOpacity>
        {open && (
          <View
            style={[
              styles.dropdown,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            {options.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: theme.border },
                ]}
                onPress={() => {
                  onSelect(opt.id);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    {
                      color:
                        value === opt.id ? colors.primary : theme.textStrong,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {value === opt.id && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {error && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    );
  };

  const Step1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepSectionTitle, { color: theme.textStrong }]}>
        {t.baseInfo}
      </Text>

      <Field
        label={t.tripTitle}
        value={form.titre}
        onChangeText={v => update('titre', v)}
        placeholder={t.titlePlaceholder}
        error={errors.titre}
      />
      <Field
        label={t.description}
        value={form.description}
        onChangeText={v => update('description', v)}
        placeholder={t.descPlaceholder}
        multiline
        error={errors.description}
      />

      <View style={styles.twoCol}>
        <CityPicker
          label={t.departure}
          value={form.lieuDepart}
          onSelect={v => update('lieuDepart', v)}
          error={errors.lieuDepart}
        />
        <CityPicker
          label={t.arrival}
          value={form.lieuArrive}
          onSelect={v => update('lieuArrive', v)}
          error={errors.lieuArrive}
        />
      </View>

      <Field
        label={t.depDate}
        value={form.dateDepartPrev}
        onChangeText={v => update('dateDepartPrev', v)}
        placeholder="2026-06-25"
        error={errors.dateDepartPrev}
      />

      <View style={styles.twoCol}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
            {t.depHour}
          </Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
                color: theme.textStrong,
              },
            ]}
            value={form.heureDepartEffectif}
            onChangeText={v => update('heureDepartEffectif', v)}
            placeholder="08:00"
            placeholderTextColor={theme.text}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
            {t.arrHour}
          </Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
                color: theme.textStrong,
              },
            ]}
            value={form.heureArrive}
            onChangeText={v => update('heureArrive', v)}
            placeholder="12:30"
            placeholderTextColor={theme.text}
          />
        </View>
      </View>
    </View>
  );

  const Step2 = () => (
    <View style={styles.stepContent}>
      <SelectPicker
        label={t.vehicle}
        value={form.vehiculeId}
        onSelect={v => update('vehiculeId', v)}
        placeholder={t.selectVehicle}
        options={vehicles.map(v => ({
          id: v.idVehicule,
          label: `${v.nom || v.modele || v.immatriculation} (${
            v.capacite || '—'
          } places)`,
        }))}
        error={errors.vehiculeId}
      />
      <SelectPicker
        label={t.driver}
        value={form.chauffeurId}
        onSelect={v => update('chauffeurId', v)}
        placeholder={t.selectDriver}
        options={drivers.map(d => ({
          id: d.userId,
          label: `${d.prenom || ''} ${d.nom || ''}`.trim(),
        }))}
      />
      <SelectPicker
        label={t.travelClass}
        value={form.classVoyageId}
        onSelect={v => update('classVoyageId', v)}
        placeholder={t.selectClass}
        options={classes.map(c => ({ id: c.idClassVoyage, label: c.nom }))}
        error={errors.classVoyageId}
      />
    </View>
  );

  const Step3 = () => (
    <View style={styles.stepContent}>
      <Field
        label={t.seatsAvailable}
        value={form.nbrPlaceReservable}
        onChangeText={v => update('nbrPlaceReservable', v)}
        keyboardType="numeric"
        error={errors.nbrPlaceReservable}
      />
    </View>
  );

  const Step4 = () => (
    <View style={styles.stepContent}>
      <Field
        label={t.price}
        value={form.prix}
        onChangeText={v => update('prix', v)}
        placeholder={t.pricePlaceholder}
        keyboardType="numeric"
        error={errors.prix}
      />
      <SelectPicker
        label={t.status}
        value={form.statusVoyage}
        onSelect={v => update('statusVoyage', v as any)}
        placeholder=""
        options={[
          { id: 'EN_ATTENTE', label: t.draft },
          { id: 'PUBLIE', label: t.published },
        ]}
      />
    </View>
  );

  const Step5 = () => {
    const selectedVehicle = vehicles.find(
      v => v.idVehicule === form.vehiculeId,
    );
    const selectedClass = classes.find(
      c => c.idClassVoyage === form.classVoyageId,
    );
    const rows = [
      { label: lang === 'fr' ? 'Titre' : 'Title', value: form.titre },
      {
        label: lang === 'fr' ? 'Itinéraire' : 'Route',
        value: `${form.lieuDepart} → ${form.lieuArrive}`,
      },
      { label: lang === 'fr' ? 'Date' : 'Date', value: form.dateDepartPrev },
      {
        label: lang === 'fr' ? 'Départ' : 'Departure',
        value: form.heureDepartEffectif,
      },
      { label: lang === 'fr' ? 'Arrivée' : 'Arrival', value: form.heureArrive },
      {
        label: lang === 'fr' ? 'Véhicule' : 'Vehicle',
        value: selectedVehicle?.modele || selectedVehicle?.nom || '—',
      },
      {
        label: lang === 'fr' ? 'Classe' : 'Class',
        value: selectedClass?.nom || '—',
      },
      {
        label: lang === 'fr' ? 'Places' : 'Seats',
        value: form.nbrPlaceReservable,
      },
      {
        label: lang === 'fr' ? 'Prix' : 'Price',
        value: `${Number(form.prix).toLocaleString('fr-FR')} FCFA`,
      },
      {
        label: lang === 'fr' ? 'Statut' : 'Status',
        value: form.statusVoyage === 'PUBLIE' ? t.published : t.draft,
      },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepSectionTitle, { color: theme.textStrong }]}>
          {t.summary}
        </Text>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.summaryRow,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.summaryLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.textStrong }]}>
                {row.value || '—'}
              </Text>
            </View>
          ))}
        </View>
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
        <TouchableOpacity
          onPress={() =>
            step === 1 ? navigation.goBack() : setStep((step - 1) as Step)
          }
        >
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {isEdit ? t.titleEdit : t.titleNew}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicators */}
      <View
        style={[
          styles.stepIndicators,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {t.stepLabels.map((label, i) => {
          const s = (i + 1) as Step;
          const isActive = s === step;
          const isDone = s < step;
          return (
            <TouchableOpacity
              key={label}
              style={styles.stepIndicator}
              onPress={() => isDone && setStep(s)}
            >
              <View
                style={[
                  styles.stepDot,
                  isActive && { backgroundColor: colors.primary },
                  isDone && { backgroundColor: colors.primary },
                  !isActive && !isDone && { backgroundColor: theme.border },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepDotText,
                      { color: isActive ? '#fff' : theme.text },
                    ]}
                  >
                    {s}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: isActive ? colors.primary : theme.text },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}
        {step === 4 && <Step4 />}
        {step === 5 && <Step5 />}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer buttons */}
      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}
      >
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>{t.next}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.finalButtons}>
            {!isEdit && (
              <TouchableOpacity
                style={[styles.draftBtn, { borderColor: colors.primary }]}
                onPress={() => handleSubmit('EN_ATTENTE')}
                disabled={submitting}
              >
                <Text style={[styles.draftBtnText, { color: colors.primary }]}>
                  {t.saveDraft}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.publishBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={() =>
                handleSubmit(isEdit ? form.statusVoyage : 'PUBLIE')
              }
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.publishBtnText}>
                  {isEdit ? t.edit : t.publish}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
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
  stepIndicators: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  stepIndicator: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  stepLabel: { ...typography.body, fontSize: 9, textAlign: 'center' },
  stepContent: { padding: spacing.lg, gap: spacing.md },
  stepSectionTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  fieldError: { ...typography.body, fontSize: typography.sizes.xs },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  picker: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    maxHeight: 120,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerOptionText: { ...typography.body, fontSize: typography.sizes.sm },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  selectBtnText: { ...typography.body, fontSize: typography.sizes.sm },
  dropdown: {
    borderWidth: 1,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  dropdownText: { ...typography.body, fontSize: typography.sizes.sm },
  summaryCard: { borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryLabel: { ...typography.body, fontSize: typography.sizes.sm },
  summaryValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  nextBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
    letterSpacing: 0.3,
  },
  finalButtons: { gap: spacing.sm },
  draftBtn: {
    height: 52,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  publishBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
