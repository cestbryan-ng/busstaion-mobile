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
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../../../components/toast';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import {
  DatePickerModal,
  formatDateDisplay,
} from '../../../../components/date-picker-modal';
import TimePickerModal from '../../../../components/time-picker-modal';
import { SkeletonAgencyTripDetail } from '../../../../components/skeleton';
import { CITIES } from '../../../../components/city-picker-modal';

type Step = 1 | 2 | 3 | 4;

type Vehicle = {
  idVehicule: string;
  plaqueMatricule?: string;
  nbrPlaces?: number;
  modele?: string;
  nom?: string;
};
type Driver = { userId: string; first_name?: string; last_name?: string };
type TClass = { id: string; nom: string };
type Destination = {
  lieuArrive: string;
  pointArriveeId: string;
  pointArriveeNom: string;
  agenceId?: string;
  agenceNom?: string;
};

type FormData = {
  titre: string;
  description: string;
  lieuDepart: string;
  pointDeDepart: string;
  lieuArrive: string;
  pointArrivee: string;
  dateDepartPrev: string;
  heureDepartEffectif: string;
  heureArrive: string;
  vehiculeId: string;
  chauffeurId: string;
  classVoyageId: string;
  nbrPlaceReservable: string;
  statusVoyage: 'EN_ATTENTE' | 'PUBLIE';
};

const STEP_LABELS_FR = ['Itinéraire', 'Ressources', 'Détails', 'Confirmation'];
const STEP_LABELS_EN = ['Itinerary', 'Resources', 'Details', 'Confirmation'];

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  subtitle,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  readOnly,
  error,
  theme,
}: {
  label: string;
  value: string;
  subtitle?: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  readOnly?: boolean;
  error?: string;
  theme: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
        {label}
      </Text>
      {readOnly ? (
        <View
          style={[
            styles.fieldInput,
            {
              borderColor: theme.border,
              backgroundColor: theme.border + '30',
              height: 'auto',
              minHeight: 48,
              paddingVertical: spacing.sm,
              justifyContent: 'center',
            },
          ]}
        >
          {(() => {
            const idx = value ? value.indexOf('-') : -1;
            const main =
              idx > -1 ? value.slice(0, idx) : value || placeholder || '';
            const sub =
              subtitle || (idx > -1 ? value.slice(idx + 1) : undefined);
            return (
              <>
                <Text
                  style={{
                    ...typography.body,
                    fontSize: typography.sizes.sm,
                    color: theme.textStrong,
                  }}
                >
                  {main}
                </Text>
                {sub ? (
                  <Text
                    style={{
                      ...typography.body,
                      fontSize: typography.sizes.xs,
                      color: theme.text,
                      marginTop: 2,
                    }}
                  >
                    {sub}
                  </Text>
                ) : null}
              </>
            );
          })()}
        </View>
      ) : (
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
          placeholderTextColor={theme.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      )}
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── CityPicker ───────────────────────────────────────────────────────────────

function CityPicker({
  label,
  value,
  subtitle,
  onSelect,
  readOnly,
  error,
  theme,
}: {
  label: string;
  value: string;
  subtitle?: string;
  onSelect: (v: string) => void;
  readOnly?: boolean;
  error?: string;
  theme: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
        {label}
      </Text>
      {readOnly ? (
        <View
          style={[
            styles.pickerBtn,
            {
              borderColor: theme.border,
              backgroundColor: theme.border + '30',
              height: 'auto',
              minHeight: 48,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <Ionicons name="location-outline" size={18} color={theme.text} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.pickerBtnText,
                { color: theme.textStrong, flex: 0 },
              ]}
            >
              {value || '—'}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  {
                    ...typography.body,
                    fontSize: typography.sizes.xs,
                    color: theme.text,
                    marginTop: 1,
                  },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            {
              borderColor: error ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
            },
          ]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={18} color={theme.text} />
          <Text
            style={[
              styles.pickerBtnText,
              { color: value ? theme.textStrong : theme.text },
            ]}
            numberOfLines={1}
          >
            {value || '—'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.text} />
        </TouchableOpacity>
      )}
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>
          {error}
        </Text>
      )}

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.cityModalContainer,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.cityModalHeader,
              { borderBottomColor: theme.border },
            ]}
          >
            <Text style={[styles.cityModalTitle, { color: theme.textStrong }]}>
              {label}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textStrong} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CITIES}
            keyExtractor={item => item}
            renderItem={({ item: city }) => (
              <TouchableOpacity
                style={[
                  styles.cityModalItem,
                  { borderBottomColor: theme.border },
                  value === city && { backgroundColor: `${colors.primary}12` },
                ]}
                onPress={() => {
                  onSelect(city);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.cityModalItemText,
                    {
                      color: value === city ? colors.primary : theme.textStrong,
                    },
                  ]}
                >
                  {city}
                </Text>
                {value === city && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── SelectPicker ─────────────────────────────────────────────────────────────

function SelectPicker({
  label,
  value,
  onSelect,
  options,
  placeholder,
  error,
  theme,
}: {
  label: string;
  value: string;
  onSelect: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  error?: string;
  theme: any;
}) {
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
              style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                onSelect(opt.id);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  {
                    color: value === opt.id ? colors.primary : theme.textStrong,
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
}

// ─── DestinationPicker ────────────────────────────────────────────────────────

function DestinationPicker({
  label,
  value,
  cityValue,
  agenceValue,
  onSelect,
  destinations,
  loading,
  error,
  theme,
}: {
  label: string;
  value: string;
  cityValue?: string;
  agenceValue?: string;
  onSelect: (d: Destination) => void;
  destinations: Destination[];
  loading: boolean;
  error?: string;
  theme: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.pickerBtn,
          {
            borderColor: error ? colors.error : theme.border,
            backgroundColor: theme.backgroundAlt,
            height: 'auto',
            minHeight: 48,
            paddingVertical: spacing.sm,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={18} color={theme.text} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.pickerBtnText,
              { color: cityValue ? theme.textStrong : theme.text, flex: 0 },
            ]}
            numberOfLines={1}
          >
            {cityValue || '—'}
          </Text>
          {agenceValue ? (
            <Text
              style={[
                {
                  ...typography.body,
                  fontSize: typography.sizes.xs,
                  color: theme.text,
                  marginTop: 1,
                },
              ]}
            >
              {agenceValue}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={16} color={theme.text} />
      </TouchableOpacity>
      {error && (
        <Text style={[styles.fieldError, { color: colors.error }]}>
          {error}
        </Text>
      )}

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.cityModalContainer,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.cityModalHeader,
              { borderBottomColor: theme.border },
            ]}
          >
            <Text style={[styles.cityModalTitle, { color: theme.textStrong }]}>
              {label}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color={theme.textStrong} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : destinations.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Ionicons name="map-outline" size={40} color={theme.border} />
              <Text
                style={[
                  {
                    ...typography.body,
                    fontSize: typography.sizes.sm,
                    color: theme.text,
                    marginTop: 12,
                  },
                ]}
              >
                Aucune destination configurée
              </Text>
            </View>
          ) : (
            <FlatList
              data={destinations}
              keyExtractor={item => item.pointArriveeId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityModalItem,
                    { borderBottomColor: theme.border },
                    value === item.pointArriveeNom && {
                      backgroundColor: `${colors.primary}12`,
                    },
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.cityModalItemText,
                        {
                          color:
                            value === item.pointArriveeNom
                              ? colors.primary
                              : theme.textStrong,
                        },
                      ]}
                    >
                      {item.lieuArrive}
                    </Text>
                    <Text
                      style={[
                        {
                          ...typography.body,
                          fontSize: typography.sizes.xs,
                          color: theme.text,
                          marginTop: 2,
                        },
                      ]}
                    >
                      {item.pointArriveeNom}
                    </Text>
                    {item.agenceNom ? (
                      <Text
                        style={[
                          {
                            ...typography.body,
                            fontSize: typography.sizes.xs,
                            color: colors.primary,
                            marginTop: 1,
                          },
                        ]}
                      >
                        {item.agenceNom}
                      </Text>
                    ) : null}
                  </View>
                  {value === item.pointArriveeNom && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AgencyNewTrip() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyNewTrip'>>();
  const editTripId = route.params?.editTripId;
  const duplicateTripId = route.params?.duplicateTripId;
  const isEdit = !!editTripId;
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [step, setStep] = useState<Step>(1);
  const [agencyId, setAgencyId] = useState('');
  const [destAgenceId, setDestAgenceId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [classes, setClasses] = useState<TClass[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'dep' | 'arr'>(
    'dep',
  );

  const [form, setForm] = useState<FormData>({
    titre: '',
    description: '',
    lieuDepart: '',
    pointDeDepart: '',
    lieuArrive: '',
    pointArrivee: '',
    dateDepartPrev: '',
    heureDepartEffectif: '08:00',
    heureArrive: '12:30',
    vehiculeId: '',
    chauffeurId: '',
    classVoyageId: '',
    nbrPlaceReservable: '40',
    statusVoyage: 'EN_ATTENTE',
  });

  const t = {
    fr: {
      titleNew: 'Nouveau voyage',
      titleEdit: 'Modifier le voyage',
      titleDuplicate: 'Dupliquer le voyage',
      stepLabels: STEP_LABELS_FR,
      baseInfo: 'Informations de base',
      tripTitle: 'Titre du voyage *',
      titlePlaceholder: 'Douala → Kribi Premium',
      description: 'Description',
      descPlaceholder: 'Voyage confortable avec pause déjeuner incluse.',
      departure: 'Ville de départ *',
      depPoint: 'Point de départ *',
      depPointPlaceholder: 'Ex: Gare de Bonanjo',
      arrival: "Ville d'arrivée *",
      arrPoint: "Point d'arrivée *",
      arrPointPlaceholder: 'Ex: Terminal de Mfoundi',
      depDate: 'Date de départ prévue *',
      depHour: 'Heure de départ *',
      arrHour: "Heure d'arrivée *",
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
      next: 'Suivant',
      saveDraft: 'Enregistrer en brouillon',
      publish: 'Publier le voyage',
      edit: 'Enregistrer les modifications',
      required: 'Champ requis',
      summary: 'Récapitulatif',
      tripSaved: 'Voyage enregistré',
      saveError: "Erreur lors de l'enregistrement",
      chooseDate: 'Choisir une date',
      chooseTime: 'Choisir une heure',
    },
    en: {
      titleNew: 'New trip',
      titleEdit: 'Edit trip',
      titleDuplicate: 'Duplicate trip',
      stepLabels: STEP_LABELS_EN,
      baseInfo: 'Basic information',
      tripTitle: 'Trip title *',
      titlePlaceholder: 'Douala → Kribi Premium',
      description: 'Description',
      descPlaceholder: 'Comfortable trip with lunch break included.',
      departure: 'Departure city *',
      depPoint: 'Boarding point *',
      depPointPlaceholder: 'e.g. Bonanjo Station',
      arrival: 'Arrival city *',
      arrPoint: 'Alighting point *',
      arrPointPlaceholder: 'e.g. Mfoundi Terminal',
      depDate: 'Departure date *',
      depHour: 'Departure time *',
      arrHour: 'Arrival time *',
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
      next: 'Next',
      saveDraft: 'Save as draft',
      publish: 'Publish trip',
      edit: 'Save changes',
      required: 'Required field',
      summary: 'Summary',
      tripSaved: 'Trip saved',
      saveError: 'Save error',
      chooseDate: 'Choose a date',
      chooseTime: 'Choose a time',
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
        setAgencyId(agencyData.id);

        // Fetch destinations
        try {
          setDestinationsLoading(true);
          const destRes = await fetch(
            `${API_URL}/agence/${agencyData.id}/destinations`,
            { headers },
          );
          if (destRes.ok) {
            const destData: Destination[] = await destRes.json();
            const ownGareId = agencyData.gareIds?.[0];
            setDestinations(
              ownGareId
                ? destData.filter(d => d.pointArriveeId !== ownGareId)
                : destData,
            );
          }
        } catch {
          // silent
        } finally {
          setDestinationsLoading(false);
        }

        // Pré-remplir départ depuis la gare routière associée (nouveau voyage uniquement)
        if (!editTripId && !duplicateTripId) {
          const gareId = agencyData.gareIds?.[0];
          if (gareId) {
            try {
              const gareRes = await fetch(`${API_URL}/gare/${gareId}`, {
                headers,
              });
              if (gareRes.ok) {
                const gare = await gareRes.json();
                setForm(prev => ({
                  ...prev,
                  lieuDepart: gare.ville || '',
                  pointDeDepart: gare.nomGareRoutiere
                    ? `${gare.nomGareRoutiere}-${
                        agencyData.longName || agencyData.nom || ''
                      }`
                    : '',
                }));
              }
            } catch {
              // silent — champs restent vides
            }
          }
        }

        const [vRes, dRes, cRes] = await Promise.allSettled([
          fetch(
            `${API_URL}/vehicule/agence/${agencyData.id}?statut=DISPONIBLE`,
            { headers },
          ),
          fetch(
            `${API_URL}/utilisateur/chauffeurs/${agencyData.id}?statut=LIBRE`,
            {
              headers,
            },
          ),
          fetch(`${API_URL}/class-voyage/agence/${agencyData.id}`, { headers }),
        ]);

        if (vRes.status === 'fulfilled' && vRes.value.ok) {
          const d = await vRes.value.json();
          setVehicles(d.content || d || []);
        }
        if (dRes.status === 'fulfilled' && dRes.value.ok) {
          const d = await dRes.value.json();
          setDrivers(d.content || d || []);
        }
        if (cRes.status === 'fulfilled' && cRes.value.ok) {
          const d = await cRes.value.json();
          setClasses(d.content || d || []);
        }

        const prefillId = editTripId || duplicateTripId;
        if (prefillId) {
          const tripRes = await fetch(`${API_URL}/voyage/${prefillId}`, {
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
              heureDepartEffectif: trip.heureDepartEffectif?.includes('T')
                ? trip.heureDepartEffectif.split('T')[1]?.slice(0, 5) || '08:00'
                : trip.heureDepartEffectif || '08:00',
              heureArrive: trip.heureArrive?.includes('T')
                ? trip.heureArrive.split('T')[1]?.slice(0, 5) || '12:30'
                : trip.heureArrive || '12:30',
              pointDeDepart: trip.pointDeDepart || '',
              pointArrivee: trip.pointArrivee || '',
              nbrPlaceReservable: String(trip.nbrPlaceReservable || 40),
              vehiculeId: trip.vehicule?.idVehicule || trip.vehiculeId || '',
              chauffeurId: trip.chauffeur?.userId || trip.chauffeurId || '',
              classVoyageId: trip.classeVoyage?.id || trip.classVoyageId || '',
              statusVoyage: 'EN_ATTENTE',
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
      if (!form.pointDeDepart.trim()) e.pointDeDepart = t.required;
      if (!form.lieuArrive) e.lieuArrive = t.required;
      if (!form.pointArrivee.trim()) e.pointArrivee = t.required;
      if (!form.dateDepartPrev) e.dateDepartPrev = t.required;
    }
    if (step === 2) {
      if (!form.vehiculeId) e.vehiculeId = t.required;
      if (!form.chauffeurId) e.chauffeurId = t.required;
      if (!form.classVoyageId) e.classVoyageId = t.required;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleSubmit = async (status: 'EN_ATTENTE' | 'PUBLIE') => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const departDateTime = `${form.dateDepartPrev}T${form.heureDepartEffectif}:00`;
      const arriveDateTime = `${form.dateDepartPrev}T${form.heureArrive}:00`;
      const body = {
        titre: form.titre,
        description: form.description,
        lieuDepart: form.lieuDepart,
        lieuArrive: form.lieuArrive,
        pointDeDepart: form.pointDeDepart,
        pointArrivee: form.pointArrivee,
        dateDepartPrev: departDateTime,
        heureDepartEffectif: departDateTime,
        heureArrive: arriveDateTime,
        dateLimiteReservation: departDateTime,
        dateLimiteConfirmation: departDateTime,
        nbrPlaceReservable: Number(form.nbrPlaceReservable),
        nbrPlaceRestante: Number(form.nbrPlaceReservable),
        statusVoyage: status,
        vehiculeId: form.vehiculeId,
        chauffeurId: form.chauffeurId,
        classVoyageId: form.classVoyageId,
        agenceVoyageId: agencyId,
      };
      const url = isEdit
        ? `${API_URL}/voyage/${editTripId}`
        : `${API_URL}/voyage`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (!isEdit && destAgenceId && status === 'PUBLIE') {
          try {
            const created = await res.json();
            const tripId = created.idVoyage || created.id;
            if (tripId) {
              await fetch(`${API_URL}/voyage/${tripId}/notifier-destination`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ agenceDestinationId: destAgenceId }),
              });
            }
          } catch {
            // notification silencieuse — le voyage est déjà créé
          }
        }
        toast.success(t.tripSaved);
        navigation.goBack();
      } else {
        toast.error(t.saveError);
      }
    } catch {
      toast.error(t.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content (inline JSX, not inner components) ──────────────────────

  const step1 = (
    <View style={styles.stepContent}>
      <Text style={[styles.stepSectionTitle, { color: theme.textStrong }]}>
        {t.baseInfo}
      </Text>

      <View style={styles.twoCol}>
        <CityPicker
          label={t.departure}
          value={form.lieuDepart}
          onSelect={v => update('lieuDepart', v)}
          readOnly
          error={errors.lieuDepart}
          theme={theme}
        />
        <DestinationPicker
          label={t.arrival}
          value={form.pointArrivee}
          cityValue={form.lieuArrive}
          onSelect={d => {
            update('lieuArrive', d.lieuArrive);
            update(
              'pointArrivee',
              d.agenceNom
                ? `${d.pointArriveeNom}-${d.agenceNom}`
                : d.pointArriveeNom,
            );
            setDestAgenceId(d.agenceId || '');
          }}
          destinations={destinations}
          loading={destinationsLoading}
          error={errors.lieuArrive}
          theme={theme}
        />
      </View>

      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Field
            label={t.depPoint}
            value={form.pointDeDepart}
            onChangeText={v => update('pointDeDepart', v)}
            placeholder={t.depPointPlaceholder}
            readOnly
            error={errors.pointDeDepart}
            theme={theme}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label={t.arrPoint}
            value={form.pointArrivee}
            onChangeText={v => update('pointArrivee', v)}
            readOnly
            error={errors.pointArrivee}
            theme={theme}
          />
        </View>
      </View>

      <Field
        label={t.tripTitle}
        value={form.titre}
        onChangeText={v => update('titre', v)}
        placeholder={t.titlePlaceholder}
        error={errors.titre}
        theme={theme}
      />
      <Field
        label={t.description}
        value={form.description}
        onChangeText={v => update('description', v)}
        placeholder={t.descPlaceholder}
        multiline
        error={errors.description}
        theme={theme}
      />

      {/* Date picker */}
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.depDate}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            {
              borderColor: errors.dateDepartPrev ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
            },
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.text} />
          <Text
            style={[
              styles.pickerBtnText,
              { color: form.dateDepartPrev ? theme.textStrong : theme.text },
            ]}
          >
            {form.dateDepartPrev
              ? formatDateDisplay(form.dateDepartPrev, lang)
              : t.chooseDate}
          </Text>
        </TouchableOpacity>
        {errors.dateDepartPrev && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {errors.dateDepartPrev}
          </Text>
        )}
      </View>

      {/* Time pickers */}
      <View style={styles.twoCol}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
            {t.depHour}
          </Text>
          <TouchableOpacity
            style={[
              styles.pickerBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
              },
            ]}
            onPress={() => {
              setTimePickerTarget('dep');
              setShowTimePicker(true);
            }}
          >
            <Ionicons name="time-outline" size={18} color={theme.text} />
            <Text style={[styles.pickerBtnText, { color: theme.textStrong }]}>
              {form.heureDepartEffectif || t.chooseTime}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
            {t.arrHour}
          </Text>
          <TouchableOpacity
            style={[
              styles.pickerBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundAlt,
              },
            ]}
            onPress={() => {
              setTimePickerTarget('arr');
              setShowTimePicker(true);
            }}
          >
            <Ionicons name="time-outline" size={18} color={theme.text} />
            <Text style={[styles.pickerBtnText, { color: theme.textStrong }]}>
              {form.heureArrive || t.chooseTime}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const step2 = (
    <View style={styles.stepContent}>
      <SelectPicker
        label={t.vehicle}
        value={form.vehiculeId}
        onSelect={v => {
          update('vehiculeId', v);
          const veh = vehicles.find(x => x.idVehicule === v);
          if (veh?.nbrPlaces)
            update('nbrPlaceReservable', String(veh.nbrPlaces));
        }}
        placeholder={t.selectVehicle}
        options={vehicles.map(v => ({
          id: v.idVehicule,
          label: `${v.nom || v.modele || v.plaqueMatricule} (${
            v.nbrPlaces || '—'
          } places)`,
        }))}
        error={errors.vehiculeId}
        theme={theme}
      />
      <SelectPicker
        label={t.driver}
        value={form.chauffeurId}
        onSelect={v => update('chauffeurId', v)}
        placeholder={t.selectDriver}
        options={drivers.map(d => ({
          id: d.userId,
          label: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        }))}
        error={errors.chauffeurId}
        theme={theme}
      />
      <SelectPicker
        label={t.travelClass}
        value={form.classVoyageId}
        onSelect={v => update('classVoyageId', v)}
        placeholder={t.selectClass}
        options={classes.map(c => ({ id: c.id, label: c.nom }))}
        error={errors.classVoyageId}
        theme={theme}
      />
    </View>
  );

  const step3 = (
    <View style={styles.stepContent}>
      <SelectPicker
        label={t.status}
        value={form.statusVoyage}
        onSelect={v => update('statusVoyage', v as any)}
        placeholder=""
        options={[
          { id: 'EN_ATTENTE', label: t.draft },
          { id: 'PUBLIE', label: t.published },
        ]}
        theme={theme}
      />
    </View>
  );

  const selectedVehicle = vehicles.find(v => v.idVehicule === form.vehiculeId);
  const selectedClass = classes.find(c => c.id === form.classVoyageId);
  const summaryRows = [
    { label: lang === 'fr' ? 'Titre' : 'Title', value: form.titre },
    {
      label: lang === 'fr' ? 'Itinéraire' : 'Route',
      value: `${form.lieuDepart} → ${form.lieuArrive}`,
    },
    {
      label: lang === 'fr' ? 'Point de départ' : 'Boarding point',
      value: form.pointDeDepart,
    },
    {
      label: lang === 'fr' ? "Point d'arrivée" : 'Alighting point',
      value: form.pointArrivee,
    },
    {
      label: lang === 'fr' ? 'Date' : 'Date',
      value: form.dateDepartPrev
        ? formatDateDisplay(form.dateDepartPrev, lang)
        : '—',
    },
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
      label: lang === 'fr' ? 'Statut' : 'Status',
      value: form.statusVoyage === 'PUBLIE' ? t.published : t.draft,
    },
  ];

  const step4 = (
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
        {summaryRows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.summaryRow,
              { borderTopColor: theme.border, borderTopWidth: i === 0 ? 0 : 1 },
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

  if (loading) return <SkeletonAgencyTripDetail />;

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
          <TouchableOpacity
            onPress={() =>
              step === 1 ? navigation.goBack() : setStep((step - 1) as Step)
            }
          >
            <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {isEdit
              ? t.titleEdit
              : duplicateTripId
              ? t.titleDuplicate
              : t.titleNew}
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
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
          {step === 4 && step4}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          {step < 4 ? (
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
                  <Text
                    style={[styles.draftBtnText, { color: colors.primary }]}
                  >
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

      <DatePickerModal
        visible={showDatePicker}
        lang={lang}
        selectedDate={form.dateDepartPrev || null}
        onApply={d => {
          if (d) update('dateDepartPrev', d);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      <TimePickerModal
        visible={showTimePicker}
        lang={lang}
        title={timePickerTarget === 'dep' ? t.depHour : t.arrHour}
        value={
          timePickerTarget === 'dep'
            ? form.heureDepartEffectif
            : form.heureArrive
        }
        onApply={v =>
          update(
            timePickerTarget === 'dep' ? 'heureDepartEffectif' : 'heureArrive',
            v,
          )
        }
        onClose={() => setShowTimePicker(false)}
      />
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  pickerBtnText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
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
  cityModalContainer: { flex: 1 },
  cityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  cityModalTitle: { ...typography.heading, fontSize: typography.sizes.md },
  cityModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cityModalItemText: { ...typography.body, fontSize: typography.sizes.md },
});
