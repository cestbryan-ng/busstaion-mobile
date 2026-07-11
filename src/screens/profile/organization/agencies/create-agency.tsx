import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../../../components/empty-state';
import { useToast } from '../../../../components/toast';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import BuildingPlaceholder from '../../../../assets/placeholders/building.svg';

type Step = 1 | 2 | 3 | 4;

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  photoUrl?: string;
  services?: string[];
  nbreAgence?: number | null;
  open?: boolean;
  isOpen?: boolean;
};

type AgencyForm = {
  longName: string;
  shortName: string;
  location: string;
  socialNetwork: string;
  description: string;
  greetingMessage: string;
};

type ChefForm = {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: 'MALE' | 'FEMALE';
  poste: string;
  departement: string;
};

type AgencyErrors = Partial<Record<keyof AgencyForm, string>>;
type ChefErrors = Partial<Record<'email' | 'username' | 'password', string>>;

type EmployeeOption = {
  employeId: string;
  userId: string;
  displayName: string;
  email: string;
  poste?: string;
};

const EMPTY_AGENCY: AgencyForm = {
  longName: '',
  shortName: '',
  location: '',
  socialNetwork: '',
  description: '',
  greetingMessage: '',
};

const EMPTY_CHEF: ChefForm = {
  email: '',
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  gender: 'MALE',
  poste: "Chef d'agence",
  departement: 'Administration',
};

export default function OrgCreateAgency() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Step 1 — Station
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>(
    'all',
  );

  // Step 2 — Agency form
  const [form, setForm] = useState<AgencyForm>(EMPTY_AGENCY);
  const [agencyErrors, setAgencyErrors] = useState<AgencyErrors>({});

  // Step 3 — Chef form
  const [chefForm, setChefForm] = useState<ChefForm>(EMPTY_CHEF);
  const [chefErrors, setChefErrors] = useState<ChefErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [chefMode, setChefMode] = useState<'select' | 'create'>('create');
  const [orgEmployees, setOrgEmployees] = useState<EmployeeOption[]>([]);
  const [orgEmployeesLoading, setOrgEmployeesLoading] = useState(false);
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string | null>(null);

  const t = {
    fr: {
      title: 'Créer une agence',
      stepStation: 'Gare',
      stepInfo: 'Infos',
      stepChef: 'Chef',
      stepConfirm: 'Confirmation',
      selectStation: 'Sélectionner une gare routière',
      selectStationDesc: 'Choisissez la gare où votre agence sera affiliée',
      searchStation: 'Rechercher une gare...',
      changeLater: 'Vous pourrez changer de gare plus tard si nécessaire.',
      continueBtn: 'Continuer',
      agencyInfo: "Informations de l'agence",
      agencyInfoDesc: 'Remplissez les informations de votre agence de voyage',
      longName: "Nom long de l'agence",
      shortName: 'Nom court',
      location: 'Localisation',
      socialNetwork: 'Réseaux sociaux (optionnel)',
      description: 'Description (optionnel)',
      greeting: "Message d'accueil (optionnel)",
      createChef: "Créer le chef d'agence",
      createChefDesc: 'Créez le compte du responsable qui gérera cette agence',
      firstName: 'Prénom',
      lastName: 'Nom',
      username: "Nom d'utilisateur",
      email: 'Email',
      password: 'Mot de passe',
      phone: 'Téléphone',
      gender: 'Genre',
      male: 'Homme',
      female: 'Femme',
      poste: 'Poste',
      departement: 'Département',
      verifyInfo: 'Vérification des informations',
      verifyDesc: 'Vérifiez les informations avant la création',
      selectedStation: 'Gare routière sélectionnée',
      change: 'Changer',
      important: 'Important',
      importantMsg:
        "Votre agence sera créée en attente d'activation. Elle devra être validée par le gestionnaire de la gare routière.",
      createAgency: "Créer l'agence",
      back: 'Retour',
      required: 'Ce champ est requis.',
      errorGeneric: 'Une erreur est survenue, veuillez réessayer.',
      errorExists: 'Une agence existe déjà avec ces informations.',
      errorNotFound: 'Utilisateur ou gare routière introuvable.',
      noStations: 'Aucune gare trouvée',
      agencyCreated: 'Agence créée avec succès',
      createError: 'Erreur lors de la création',
      error: 'Une erreur est survenue',
      chefDAgence: "Chef d'agence",
      filterAll: 'Toutes',
      filterOpen: 'Ouvertes',
      filterClosed: 'Fermées',
      open: 'OUVERTE',
      closed: 'FERMÉE',
      selectExisting: 'Choisir existant',
      createNew: 'Créer nouveau',
      selectChefRequired: 'Veuillez sélectionner un employé.',
      employeesLoading: 'Chargement des employés...',
    },
    en: {
      title: 'Create an agency',
      stepStation: 'Station',
      stepInfo: 'Info',
      stepChef: 'Chief',
      stepConfirm: 'Confirm',
      selectStation: 'Select a bus station',
      selectStationDesc:
        'Choose the station your agency will be affiliated with',
      searchStation: 'Search a station...',
      changeLater: 'You can change the station later if needed.',
      continueBtn: 'Continue',
      agencyInfo: 'Agency information',
      agencyInfoDesc: 'Fill in your travel agency information',
      longName: 'Agency long name',
      shortName: 'Short name',
      location: 'Location',
      socialNetwork: 'Social networks (optional)',
      description: 'Description (optional)',
      greeting: 'Greeting message (optional)',
      createChef: 'Create agency chief',
      createChefDesc:
        'Create the account of the manager who will run this agency',
      firstName: 'First name',
      lastName: 'Last name',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      phone: 'Phone',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      poste: 'Position',
      departement: 'Department',
      verifyInfo: 'Verify information',
      verifyDesc: 'Verify the information before creation',
      selectedStation: 'Selected station',
      change: 'Change',
      important: 'Important',
      importantMsg:
        'Your agency will be created pending activation. It must be validated by the station manager.',
      createAgency: 'Create agency',
      back: 'Back',
      required: 'This field is required.',
      errorGeneric: 'An error occurred, please try again.',
      errorExists: 'An agency already exists with this information.',
      errorNotFound: 'User or station not found.',
      noStations: 'No stations found',
      agencyCreated: 'Agency created successfully',
      createError: 'Creation error',
      error: 'An error occurred',
      chefDAgence: 'Agency chief',
      filterAll: 'All',
      filterOpen: 'Open',
      filterClosed: 'Closed',
      open: 'OPEN',
      closed: 'CLOSED',
      selectExisting: 'Choose existing',
      createNew: 'Create new',
      selectChefRequired: 'Please select an employee.',
      employeesLoading: 'Loading employees...',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then(l => {
      if (l === 'fr' || l === 'en') setLang(l);
    });
  }, []);

  const loadStations = useCallback(async (term = '') => {
    setStationsLoading(true);
    try {
      const params = new URLSearchParams({ page: '0', size: '20' });
      if (term.trim()) params.append('searchTerm', term.trim());
      const res = await fetch(`${API_URL}/gare?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStations(Array.isArray(data) ? data : data.content || []);
      }
    } catch {
      // silent
    } finally {
      setStationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    const timeout = setTimeout(() => loadStations(search), 400);
    return () => clearTimeout(timeout);
  }, [search, loadStations]);

  const loadOrgEmployees = useCallback(async () => {
    setOrgEmployeesLoading(true);
    try {
      const [token, orgRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('organization'),
      ]);
      const org = orgRaw ? JSON.parse(orgRaw) : null;
      if (!org?.organization_id) return;
      const headers = { Authorization: `Bearer ${token}` };

      const agenciesRes = await fetch(
        `${API_URL}/organizations/agencies/${org.organization_id}`,
        { headers },
      );
      if (!agenciesRes.ok) return;
      const agenciesData = await agenciesRes.json();
      const agencies: any[] = agenciesData.content || agenciesData || [];

      const all: EmployeeOption[] = [];
      await Promise.allSettled(
        agencies.map(async (a: any) => {
          const empRes = await fetch(`${API_URL}/employe/agence/${a.agencyId}`, { headers });
          if (!empRes.ok) return;
          const empData = await empRes.json();
          const list: any[] = empData.content || empData || [];
          list.forEach(e => {
            all.push({
              employeId: e.employeId,
              userId: e.userId,
              displayName: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.username,
              email: e.email,
              poste: e.poste,
            });
          });
        }),
      );
      setOrgEmployees(all);
      setChefMode(all.length > 0 ? 'select' : 'create');
    } catch {
      setChefMode('create');
    } finally {
      setOrgEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3) loadOrgEmployees();
  }, [step, loadOrgEmployees]);

  const STATION_FILTERS = [
    { key: 'all' as const, label: t.filterAll },
    { key: 'open' as const, label: t.filterOpen },
    { key: 'closed' as const, label: t.filterClosed },
  ];

  const filteredStations = useMemo(
    () =>
      stations.filter(s => {
        const isOpen = s.open ?? s.isOpen ?? true;
        if (filterStatus === 'open' && !isOpen) return false;
        if (filterStatus === 'closed' && isOpen) return false;
        return true;
      }),
    [stations, filterStatus],
  );

  const updateAgency = (key: keyof AgencyForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setAgencyErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const updateChef = (key: keyof ChefForm, value: string) => {
    setChefForm(prev => ({ ...prev, [key]: value }));
    setChefErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validateStep2 = (): boolean => {
    const e: AgencyErrors = {};
    if (!form.longName.trim() || form.longName.trim().length < 3)
      e.longName = t.required;
    if (!form.shortName.trim()) e.shortName = t.required;
    if (!form.location.trim()) e.location = t.required;
    setAgencyErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    if (chefMode === 'select') {
      if (!selectedExistingUserId) {
        toast.error(t.selectChefRequired);
        return false;
      }
      return true;
    }
    const e: ChefErrors = {};
    if (!chefForm.email.trim()) e.email = t.required;
    if (!chefForm.username.trim()) e.username = t.required;
    if (!chefForm.password.trim()) e.password = t.required;
    setChefErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Next = () => {
    if (selectedStation) {
      setForm(prev => ({ ...prev, location: prev.location || selectedStation.ville }));
      setStep(2);
    }
  };
  const handleStep2Next = () => {
    if (validateStep2()) setStep(3);
  };
  const handleStep3Next = () => {
    if (validateStep3()) setStep(4);
  };

  const handleCreate = async () => {
    if (!selectedStation) return;
    setSubmitting(true);
    setApiError('');

    try {
      const [token, orgRaw, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('organization'),
        AsyncStorage.getItem('user'),
      ]);
      const org = orgRaw ? JSON.parse(orgRaw) : null;
      const user = userRaw ? JSON.parse(userRaw) : null;
      const orgId = org?.organization_id;
      const currentUserId: string | undefined = user?.userId || user?.id;
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Step A — Create agency
      // If existing employee selected: pass their userId directly (no PATCH needed)
      // If new employee: pass current actor's userId, then PATCH after creation
      const initialUserId = selectedExistingUserId ?? currentUserId;

      const agenceRes = await fetch(`${API_URL}/agence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          organisation_id: orgId,
          user_id: initialUserId,
          long_name: form.longName,
          short_name: form.shortName,
          location: form.location,
          gare_routiere_id: selectedStation.idGareRoutiere,
          social_network: form.socialNetwork || undefined,
          description: form.description || undefined,
          greeting_message: form.greetingMessage || undefined,
        }),
      });

      if (!agenceRes.ok && agenceRes.status !== 201) {
        const d = await agenceRes.json().catch(() => ({}));
        toast.error(t.createError);
        setApiError(agenceRes.status === 400 ? t.errorExists : d.message || t.errorGeneric);
        return;
      }

      const agenceData = await agenceRes.json();
      const agenceId: string = agenceData.id;

      // Step B & C — Only needed when creating a new employee
      if (!selectedExistingUserId) {
        const employeRes = await fetch(`${API_URL}/employe`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: chefForm.email.trim(),
            username: chefForm.username.trim(),
            password: chefForm.password,
            role: ['EMPLOYE'],
            gender: chefForm.gender,
            first_name: chefForm.first_name.trim() || undefined,
            last_name: chefForm.last_name.trim() || undefined,
            phone_number: chefForm.phone_number.trim() || undefined,
            agenceVoyageId: agenceId,
            poste: chefForm.poste.trim() || "Chef d'agence",
            departement: chefForm.departement.trim() || undefined,
          }),
        });
        if (!employeRes.ok && employeRes.status !== 201) {
          const d = await employeRes.json().catch(() => ({}));
          toast.error(t.createError);
          setApiError(d.message || t.errorGeneric);
          return;
        }
        const employeData = await employeRes.json();
        const newChefUserId: string = employeData.id;

        await fetch(`${API_URL}/agence/${agenceId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ user_id: newChefUserId }),
        });
      }

      toast.success(t.agencyCreated);
      navigation.navigate('OrgCreateAgencySuccess');
    } catch {
      toast.error(t.error);
      setApiError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: t.stepStation },
    { num: 2, label: t.stepInfo },
    { num: 3, label: t.stepChef },
    { num: 4, label: t.stepConfirm },
  ];

  const Stepper = () => (
    <View style={styles.stepperRow}>
      {STEPS.map((s, i) => {
        const isDone = s.num < step;
        const isActive = s.num === step;
        return (
          <React.Fragment key={s.num}>
            <View style={styles.stepperItem}>
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
                    {s.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: isActive ? colors.primary : theme.text },
                ]}
              >
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      s.num < step ? colors.primary : theme.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ─── Step 1 — Select station ─────────────────────────────────────────────────

  const Step1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.textStrong }]}>
        {t.selectStation}
      </Text>
      <Text style={[styles.stepDesc, { color: theme.text }]}>
        {t.selectStationDesc}
      </Text>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInput,
            { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={theme.text} />
          <TextInput
            style={[styles.searchText, { color: theme.textStrong }]}
            placeholder={t.searchStation}
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              borderColor: showFilters ? colors.primary : theme.border,
              backgroundColor: showFilters
                ? `${colors.primary}15`
                : 'transparent',
            },
          ]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? colors.primary : theme.textStrong}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterChips}>
          {STATION_FILTERS.map(f => {
            const active = filterStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : theme.background,
                    borderColor: active ? colors.primary : theme.border,
                  },
                ]}
                onPress={() => setFilterStatus(f.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? '#fff' : theme.text },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {stationsLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginTop: spacing.lg }}
        />
      ) : filteredStations.length === 0 ? (
        <EmptyState
          type="result"
          message={t.noStations}
          textColor={theme.text}
        />
      ) : (
        filteredStations.map(station => {
          const isSelected =
            selectedStation?.idGareRoutiere === station.idGareRoutiere;
          const isOpen = station.open ?? station.isOpen ?? true;
          return (
            <TouchableOpacity
              key={station.idGareRoutiere}
              style={[
                styles.stationCard,
                {
                  borderColor: isSelected ? colors.primary : theme.border,
                  backgroundColor: isSelected
                    ? `${colors.primary}08`
                    : theme.background,
                },
              ]}
              onPress={() => setSelectedStation(station)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.stationImage,
                  { backgroundColor: theme.backgroundAlt },
                ]}
              >
                {station.photoUrl ? (
                  <Image
                    source={{ uri: station.photoUrl }}
                    style={styles.stationImageInner}
                    resizeMode="cover"
                  />
                ) : (
                  <BuildingPlaceholder width="70%" height="70%" />
                )}
              </View>
              <View style={styles.stationInfo}>
                <Text
                  style={[styles.stationName, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {station.nomGareRoutiere}
                </Text>
                <View style={styles.stationMetaRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={theme.text}
                  />
                  <Text style={[styles.stationMeta, { color: theme.text }]}>
                    {' '}
                    {station.ville}
                    {station.quartier ? ` · ${station.quartier}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.stationRight}>
                <View
                  style={[
                    styles.openBadge,
                    {
                      backgroundColor: isOpen
                        ? `${colors.success}15`
                        : `${colors.error}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.openBadgeText,
                      { color: isOpen ? colors.success : colors.error },
                    ]}
                  >
                    {isOpen ? t.open : t.closed}
                  </Text>
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View
        style={[
          styles.hintBox,
          {
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}20`,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.hintText, { color: theme.textStrong }]}>
          {t.changeLater}
        </Text>
      </View>
    </View>
  );

  // ─── Step 2 — Agency form ─────────────────────────────────────────────────────

  const Step2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.textStrong }]}>
        {t.agencyInfo}
      </Text>
      <Text style={[styles.stepDesc, { color: theme.text }]}>
        {t.agencyInfoDesc}
      </Text>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.longName} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.simpleInput,
            {
              borderColor: agencyErrors.longName ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.longName}
          onChangeText={v => updateAgency('longName', v)}
          placeholder="Agence Voyages Cameroun"
          placeholderTextColor={theme.placeholder}
        />
        {agencyErrors.longName && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {agencyErrors.longName}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.shortName} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.simpleInput,
            {
              borderColor: agencyErrors.shortName ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.shortName}
          onChangeText={v => updateAgency('shortName', v)}
          placeholder="AVC"
          placeholderTextColor={theme.placeholder}
        />
        {agencyErrors.shortName && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {agencyErrors.shortName}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.location} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <View
          style={[
            styles.simpleInput,
            {
              borderColor: agencyErrors.location ? colors.error : theme.border,
              backgroundColor: theme.border + '30',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={[{ ...typography.body, fontSize: typography.sizes.sm, color: theme.textStrong }]}>
            {form.location}
          </Text>
        </View>
        {agencyErrors.location && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {agencyErrors.location}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.socialNetwork}
        </Text>
        <View
          style={[
            styles.fieldInputWrapper,
            { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
          ]}
        >
          <Ionicons name="logo-facebook" size={16} color="#1877F2" />
          <TextInput
            style={[styles.fieldInput, { color: theme.textStrong }]}
            value={form.socialNetwork}
            onChangeText={v => updateAgency('socialNetwork', v)}
            placeholder="facebook.com/avcameroun"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.description}
        </Text>
        <TextInput
          style={[
            styles.textarea,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.description}
          onChangeText={v => updateAgency('description', v.slice(0, 500))}
          placeholder="Agence spécialisée en transport interurbain..."
          placeholderTextColor={theme.placeholder}
          multiline
          maxLength={500}
        />
        <Text style={[styles.charCount, { color: theme.text }]}>
          {form.description.length}/500
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.greeting}
        </Text>
        <TextInput
          style={[
            styles.textarea,
            {
              height: 70,
              borderColor: theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.greetingMessage}
          onChangeText={v => updateAgency('greetingMessage', v.slice(0, 200))}
          placeholder="Bienvenue chez AVC !"
          placeholderTextColor={theme.placeholder}
          multiline
          maxLength={200}
        />
        <Text style={[styles.charCount, { color: theme.text }]}>
          {form.greetingMessage.length}/200
        </Text>
      </View>
    </View>
  );

  // ─── Step 3 — Chef (select existing or create new) ───────────────────────────

  const ChefCreateForm = () => (
    <View style={{ gap: spacing.md }}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.firstName}</Text>
          <TextInput
            style={[styles.simpleInput, { borderColor: theme.border, backgroundColor: theme.backgroundAlt, color: theme.textStrong }]}
            value={chefForm.first_name}
            onChangeText={v => updateChef('first_name', v)}
            placeholder={t.firstName}
            placeholderTextColor={theme.placeholder}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.lastName}</Text>
          <TextInput
            style={[styles.simpleInput, { borderColor: theme.border, backgroundColor: theme.backgroundAlt, color: theme.textStrong }]}
            value={chefForm.last_name}
            onChangeText={v => updateChef('last_name', v)}
            placeholder={t.lastName}
            placeholderTextColor={theme.placeholder}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.username} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[styles.simpleInput, { borderColor: chefErrors.username ? colors.error : theme.border, backgroundColor: theme.backgroundAlt, color: theme.textStrong }]}
          value={chefForm.username}
          onChangeText={v => updateChef('username', v)}
          placeholder={t.username}
          placeholderTextColor={theme.placeholder}
          autoCapitalize="none"
        />
        {chefErrors.username && <Text style={[styles.fieldError, { color: colors.error }]}>{chefErrors.username}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.email} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[styles.simpleInput, { borderColor: chefErrors.email ? colors.error : theme.border, backgroundColor: theme.backgroundAlt, color: theme.textStrong }]}
          value={chefForm.email}
          onChangeText={v => updateChef('email', v)}
          placeholder={t.email}
          placeholderTextColor={theme.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {chefErrors.email && <Text style={[styles.fieldError, { color: colors.error }]}>{chefErrors.email}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.password} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <View style={[styles.passwordRow, { borderColor: chefErrors.password ? colors.error : theme.border, backgroundColor: theme.backgroundAlt }]}>
          <TextInput
            style={[styles.passwordInput, { color: theme.textStrong }]}
            value={chefForm.password}
            onChangeText={v => updateChef('password', v)}
            placeholder={t.password}
            placeholderTextColor={theme.placeholder}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(s => !s)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
        {chefErrors.password && <Text style={[styles.fieldError, { color: colors.error }]}>{chefErrors.password}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.phone}</Text>
        <View style={[styles.phoneRow, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
          <Text style={styles.phoneFlag}>🇨🇲</Text>
          <Text style={[styles.phoneCodeText, { color: theme.textStrong, borderRightColor: theme.border }]}>+237</Text>
          <TextInput
            style={[styles.phoneTextInput, { color: theme.textStrong }]}
            value={chefForm.phone_number}
            onChangeText={v => updateChef('phone_number', v)}
            placeholder="6XX XXX XXX"
            placeholderTextColor={theme.placeholder}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.gender}</Text>
        <View style={styles.genderRow}>
          {(['MALE', 'FEMALE'] as const).map(g => (
            <TouchableOpacity
              key={g}
              onPress={() => setChefForm(f => ({ ...f, gender: g }))}
              style={[styles.genderBtn, { borderColor: chefForm.gender === g ? colors.primary : theme.border, backgroundColor: chefForm.gender === g ? `${colors.primary}10` : theme.backgroundAlt }]}
            >
              <Ionicons name={g === 'MALE' ? 'male-outline' : 'female-outline'} size={16} color={chefForm.gender === g ? colors.primary : theme.text} />
              <Text style={[styles.genderText, { color: chefForm.gender === g ? colors.primary : theme.text }]}>
                {g === 'MALE' ? t.male : t.female}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.poste}</Text>
          <View style={[styles.simpleInput, { borderColor: theme.border, backgroundColor: theme.border + '30', justifyContent: 'center' }]}>
            <Text style={{ ...typography.body, fontSize: typography.sizes.sm, color: theme.textStrong }}>{chefForm.poste}</Text>
          </View>
        </View>
        <View style={styles.half}>
          <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>{t.departement}</Text>
          <View style={[styles.simpleInput, { borderColor: theme.border, backgroundColor: theme.border + '30', justifyContent: 'center' }]}>
            <Text style={{ ...typography.body, fontSize: typography.sizes.sm, color: theme.textStrong }}>{chefForm.departement}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const Step3 = () => {
    if (orgEmployeesLoading) {
      return (
        <View style={[styles.stepContent, { alignItems: 'center', paddingTop: spacing.xl }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.stepDesc, { color: theme.text, marginTop: spacing.md }]}>{t.employeesLoading}</Text>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.textStrong }]}>{t.createChef}</Text>
        <Text style={[styles.stepDesc, { color: theme.text }]}>{t.createChefDesc}</Text>

        {/* Toggle — only shown if there are existing employees */}
        {orgEmployees.length > 0 && (
          <View style={[styles.modeToggle, { backgroundColor: theme.backgroundAlt, borderColor: theme.border }]}>
            {(['select', 'create'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => { setChefMode(mode); setSelectedExistingUserId(null); }}
                style={[styles.modeBtn, chefMode === mode && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modeBtnText, { color: chefMode === mode ? '#fff' : theme.text }]}>
                  {mode === 'select' ? t.selectExisting : t.createNew}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Select existing */}
        {chefMode === 'select' && orgEmployees.map(emp => {
          const isSelected = selectedExistingUserId === emp.userId;
          return (
            <TouchableOpacity
              key={emp.employeId}
              onPress={() => setSelectedExistingUserId(emp.userId)}
              style={[
                styles.employeeCard,
                {
                  borderColor: isSelected ? colors.primary : theme.border,
                  backgroundColor: isSelected ? `${colors.primary}08` : theme.background,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.empAvatar, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.empAvatarText, { color: colors.primary }]}>
                  {emp.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.staffName, { color: theme.textStrong }]}>{emp.displayName}</Text>
                <Text style={[styles.staffEmail, { color: theme.text }]}>{emp.email}</Text>
                {emp.poste ? <Text style={[styles.staffEmail, { color: theme.text }]}>{emp.poste}</Text> : null}
              </View>
              {isSelected && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Create form */}
        {chefMode === 'create' && ChefCreateForm()}
      </View>
    );
  };

  // ─── Step 4 — Confirmation ────────────────────────────────────────────────────

  const Step4 = () => {
    const chefDisplayName =
      chefForm.first_name || chefForm.last_name
        ? `${chefForm.first_name} ${chefForm.last_name}`.trim()
        : chefForm.username;

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.textStrong }]}>
          {t.verifyInfo}
        </Text>
        <Text style={[styles.stepDesc, { color: theme.text }]}>
          {t.verifyDesc}
        </Text>

        {/* Station */}
        <Text style={[styles.summaryLabel, { color: theme.textStrong }]}>
          {t.selectedStation}
        </Text>
        <View
          style={[
            styles.confirmStationCard,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.stationImage,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            {selectedStation?.photoUrl ? (
              <Image
                source={{ uri: selectedStation.photoUrl }}
                style={styles.stationImageInner}
                resizeMode="cover"
              />
            ) : (
              <BuildingPlaceholder width="70%" height="70%" />
            )}
          </View>
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: theme.textStrong }]}>
              {selectedStation?.nomGareRoutiere}
            </Text>
            <View style={styles.stationMetaRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.stationMeta, { color: theme.text }]}>
                {' '}
                {selectedStation?.ville}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={[styles.changeLink, { color: colors.primary }]}>
              {t.change}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Agency info */}
        <View
          style={[
            styles.summaryCard,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <Text style={[styles.summaryCardTitle, { color: theme.textStrong }]}>
            {t.agencyInfo}
          </Text>
          {[
            { label: t.longName, value: form.longName },
            { label: t.shortName, value: form.shortName },
            { label: t.location, value: form.location },
            ...(form.socialNetwork
              ? [
                  {
                    label: t.socialNetwork
                      .replace(' (optionnel)', '')
                      .replace(' (optional)', ''),
                    value: form.socialNetwork,
                  },
                ]
              : []),
            ...(form.description
              ? [
                  {
                    label: t.description
                      .replace(' (optionnel)', '')
                      .replace(' (optional)', ''),
                    value: form.description,
                  },
                ]
              : []),
          ].map((row, i) => (
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
              <Text style={[styles.summaryRowLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              <Text
                style={[styles.summaryRowValue, { color: theme.textStrong }]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Chef */}
        <Text style={[styles.summaryLabel, { color: theme.textStrong }]}>
          {t.chefDAgence}
        </Text>
        <View
          style={[
            styles.chefSummaryCard,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.chefAvatar,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Text style={[styles.chefAvatarText, { color: colors.primary }]}>
              {chefDisplayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.staffName, { color: theme.textStrong }]}>
              {chefDisplayName}
            </Text>
            <Text style={[styles.staffEmail, { color: theme.text }]}>
              {chefForm.email}
            </Text>
            {chefForm.poste ? (
              <Text style={[styles.staffEmail, { color: theme.text }]}>
                {chefForm.poste}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setStep(3)}>
            <Text style={[styles.changeLink, { color: colors.primary }]}>
              {t.change}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Important */}
        <View
          style={[
            styles.importantBox,
            { backgroundColor: '#fef3c710', borderColor: '#fef3c740' },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#d97706"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.importantTitle, { color: theme.textStrong }]}>
              {t.important}
            </Text>
            <Text style={[styles.importantText, { color: theme.text }]}>
              {t.importantMsg}
            </Text>
          </View>
        </View>

        {apiError !== '' && (
          <Text style={[styles.apiErrorText, { color: colors.error }]}>
            {apiError}
          </Text>
        )}
      </View>
    );
  };

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
            {t.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stepper */}
        <View
          style={[
            styles.stepperContainer,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Stepper />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && Step1()}
          {step === 2 && Step2()}
          {step === 3 && Step3()}
          {step === 4 && Step4()}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          {step === 1 && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: selectedStation ? 1 : 0.5,
                },
              ]}
              onPress={handleStep1Next}
              disabled={!selectedStation}
            >
              <Text style={styles.primaryBtnText}>{t.continueBtn}</Text>
            </TouchableOpacity>
          )}
          {step === 2 && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleStep2Next}
            >
              <Text style={styles.primaryBtnText}>{t.continueBtn}</Text>
            </TouchableOpacity>
          )}
          {step === 3 && (
            <View style={styles.finalButtons}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleStep3Next}
              >
                <Text style={styles.primaryBtnText}>{t.continueBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                onPress={() => setStep(2)}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: theme.textStrong }]}
                >
                  {t.back}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 4 && (
            <View style={styles.finalButtons}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: submitting ? 0.7 : 1,
                  },
                ]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t.createAgency}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                onPress={() => setStep(3)}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: theme.textStrong }]}
                >
                  {t.back}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  stepperContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepperItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  stepLabel: { ...typography.body, fontSize: 9, textAlign: 'center' },
  stepLine: { flex: 1, height: 1.5, marginHorizontal: 4, marginBottom: 16 },
  stepContent: { padding: spacing.lg, gap: spacing.md },
  stepTitle: { ...typography.heading, fontSize: typography.sizes.lg },
  stepDesc: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: -spacing.sm,
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
  },
  stationImage: {
    width: 56,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stationImageInner: { width: '100%', height: '100%' },
  stationInfo: { flex: 1 },
  stationName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  stationMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stationMeta: { ...typography.body, fontSize: typography.sizes.xs },
  stationRight: { alignItems: 'flex-end', gap: spacing.xs },
  openBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openBadgeText: { ...typography.bodyBold, fontSize: 9 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  hintText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 18,
  },

  field: { gap: spacing.xs },
  fieldLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  simpleInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  phoneFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  phoneCodeText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
  },
  phoneTextInput: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  fieldInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  fieldInput: { flex: 1, ...typography.body, fontSize: typography.sizes.sm },
  fieldError: { ...typography.body, fontSize: typography.sizes.xs },
  textarea: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    height: 90,
    textAlignVertical: 'top',
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  charCount: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'right',
  },

  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    ...typography.body,
    fontSize: typography.sizes.sm,
    padding: 0,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  genderText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  summaryLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginTop: spacing.xs,
  },
  confirmStationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  changeLink: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  summaryRow: { paddingVertical: spacing.sm },
  summaryRowLabel: { ...typography.body, fontSize: typography.sizes.xs },
  summaryRowValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  chefSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  chefAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chefAvatarText: { ...typography.bodyBold, fontSize: typography.sizes.lg },
  staffName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  staffEmail: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  importantBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  importantTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  importantText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  apiErrorText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  finalButtons: { gap: spacing.sm },
  secondaryBtn: {
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  modeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAvatarText: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
