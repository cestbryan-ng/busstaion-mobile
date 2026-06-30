import React, { useState, useEffect, useCallback } from 'react';
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

type Step = 1 | 2 | 3 | 4;

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  photoUrl?: string;
};

type StaffMember = {
  employeId: string;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  poste?: string;
  nomAgence?: string;
};

type FormData = {
  longName: string;
  shortName: string;
  location: string;
  socialNetwork: string;
  description: string;
  greetingMessage: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function OrgCreateAgency() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Station search/select
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationsLoading, setStationsLoading] = useState(true);

  // Step 2 — Form
  const [form, setForm] = useState<FormData>({
    longName: '',
    shortName: '',
    location: '',
    socialNetwork: '',
    description: '',
    greetingMessage: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  // Step 3 — Staff / Chef d'agence
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedChef, setSelectedChef] = useState<StaffMember | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

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
      selectChef: "Désigner un chef d'agence",
      selectChefDesc:
        "Choisissez un membre du staff pour diriger cette agence",
      searchStaff: 'Rechercher un membre...',
      noStaff: 'Aucun employé trouvé',
      noStaffHint:
        "Vous n'avez pas encore d'employés dans vos autres agences.",
      chefRequired: "Veuillez sélectionner un chef d'agence.",
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
      selectChef: 'Designate an agency chief',
      selectChefDesc: 'Choose a staff member to lead this agency',
      searchStaff: 'Search a member...',
      noStaff: 'No employees found',
      noStaffHint: 'You have no employees in your other agencies yet.',
      chefRequired: 'Please select an agency chief.',
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

  // Load staff when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;

    const loadStaff = async () => {
      setStaffLoading(true);
      try {
        const [token, orgRaw] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('organization'),
        ]);
        const org = orgRaw ? JSON.parse(orgRaw) : null;
        if (!org?.organization_id) return;

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Get all agencies of the organization
        const agenciesRes = await fetch(
          `${API_URL}/organizations/agencies/${org.organization_id}`,
          { headers },
        );
        if (!agenciesRes.ok || cancelled) return;
        const agenciesData = await agenciesRes.json();
        const agencies: Array<{ agencyId: string; longName?: string }> =
          agenciesData.content || agenciesData || [];

        if (agencies.length === 0) {
          if (!cancelled) setStaff([]);
          return;
        }

        // 2. Get employees from each agency
        const results = await Promise.allSettled(
          agencies.map(a =>
            fetch(`${API_URL}/employe/agence/${a.agencyId}`, { headers })
              .then(r => (r.ok ? r.json() : []))
              .then((members: any[]) =>
                (Array.isArray(members) ? members : []).map(m => ({
                  employeId: m.employeId,
                  userId: m.userId,
                  username: m.username,
                  firstName: m.firstName,
                  lastName: m.lastName,
                  email: m.email,
                  poste: m.poste,
                  nomAgence: m.nomAgence,
                })),
              ),
          ),
        );

        // 3. Aggregate and deduplicate by userId
        const seen = new Set<string>();
        const all: StaffMember[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const m of r.value) {
              if (!seen.has(m.userId)) {
                seen.add(m.userId);
                all.push(m);
              }
            }
          }
        }

        if (!cancelled) setStaff(all);
      } catch {
        // silent
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    };

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const update = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validateStep2 = (): boolean => {
    const e: FormErrors = {};
    if (!form.longName.trim() || form.longName.trim().length < 3)
      e.longName = t.required;
    if (!form.shortName.trim()) e.shortName = t.required;
    if (!form.location.trim()) e.location = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Next = () => {
    if (selectedStation) setStep(2);
  };

  const handleStep2Next = () => {
    if (validateStep2()) setStep(3);
  };

  const handleStep3Next = () => {
    if (!selectedChef) {
      toast.error(t.chefRequired);
      return;
    }
    setStep(4);
  };

  const handleCreate = async () => {
    if (!selectedStation || !selectedChef) return;
    setSubmitting(true);
    setApiError('');

    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(`${API_URL}/agence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedChef.userId,
          long_name: form.longName,
          short_name: form.shortName,
          location: form.location,
          gare_routiere_id: selectedStation.idGareRoutiere,
          social_network: form.socialNetwork || undefined,
          description: form.description || undefined,
          greeting_message: form.greetingMessage || undefined,
        }),
      });

      if (res.ok || res.status === 201) {
        toast.success(t.agencyCreated);
        navigation.navigate('OrgCreateAgencySuccess');
      } else if (res.status === 400) {
        toast.error(t.createError);
        setApiError(t.errorExists);
      } else if (res.status === 404) {
        toast.error(t.createError);
        setApiError(t.errorNotFound);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(t.createError);
        setApiError(data.message || t.errorGeneric);
      }
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
                  isActive && { backgroundColor: colors.error },
                  isDone && { backgroundColor: colors.error },
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
                  { color: isActive ? colors.error : theme.text },
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
                    backgroundColor: s.num < step ? colors.error : theme.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ─── Step 1 — Select station ────────────────────────────────────────────────

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
            placeholderTextColor={theme.text}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      {stationsLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.error}
          style={{ marginTop: spacing.lg }}
        />
      ) : stations.length === 0 ? (
        <EmptyState
          type="result"
          message={t.noStations}
          textColor={theme.text}
        />
      ) : (
        stations.map(station => {
          const isSelected =
            selectedStation?.idGareRoutiere === station.idGareRoutiere;
          return (
            <TouchableOpacity
              key={station.idGareRoutiere}
              style={[
                styles.stationCard,
                {
                  borderColor: isSelected ? colors.error : theme.border,
                  backgroundColor: isSelected
                    ? `${colors.error}08`
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
                  <Ionicons
                    name="business-outline"
                    size={24}
                    color={theme.text}
                  />
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
                  </Text>
                </View>
                {station.quartier && (
                  <View style={styles.stationMetaRow}>
                    <Ionicons
                      name="map-outline"
                      size={12}
                      color={theme.text}
                    />
                    <Text
                      style={[styles.stationMeta, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {' '}
                      {station.quartier}
                    </Text>
                  </View>
                )}
              </View>
              {isSelected && (
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: colors.error },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
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

  // ─── Step 2 — Form ──────────────────────────────────────────────────────────

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
              borderColor: errors.longName ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.longName}
          onChangeText={v => update('longName', v)}
          placeholder="Agence Voyages Cameroun"
          placeholderTextColor={theme.text}
        />
        {errors.longName && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {errors.longName}
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
              borderColor: errors.shortName ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.shortName}
          onChangeText={v => update('shortName', v)}
          placeholder="AVC"
          placeholderTextColor={theme.text}
        />
        {errors.shortName && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {errors.shortName}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.textStrong }]}>
          {t.location} <Text style={{ color: colors.error }}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.simpleInput,
            {
              borderColor: errors.location ? colors.error : theme.border,
              backgroundColor: theme.backgroundAlt,
              color: theme.textStrong,
            },
          ]}
          value={form.location}
          onChangeText={v => update('location', v)}
          placeholder="Yaoundé, Cameroun"
          placeholderTextColor={theme.text}
        />
        {errors.location && (
          <Text style={[styles.fieldError, { color: colors.error }]}>
            {errors.location}
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
            onChangeText={v => update('socialNetwork', v)}
            placeholder="facebook.com/avcameroun"
            placeholderTextColor={theme.text}
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
          onChangeText={v => update('description', v.slice(0, 500))}
          placeholder="Agence spécialisée en transport interurbain..."
          placeholderTextColor={theme.text}
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
          onChangeText={v => update('greetingMessage', v.slice(0, 200))}
          placeholder="Bienvenue chez AVC !"
          placeholderTextColor={theme.text}
          multiline
          maxLength={200}
        />
        <Text style={[styles.charCount, { color: theme.text }]}>
          {form.greetingMessage.length}/200
        </Text>
      </View>
    </View>
  );

  // ─── Step 3 — Chef d'agence ─────────────────────────────────────────────────

  const filteredStaff = staff.filter(m => {
    if (!staffSearch.trim()) return true;
    const q = staffSearch.toLowerCase();
    const full = `${m.firstName ?? ''} ${m.lastName ?? ''} ${m.username} ${m.email}`.toLowerCase();
    return full.includes(q);
  });

  const Step3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.textStrong }]}>
        {t.selectChef}
      </Text>
      <Text style={[styles.stepDesc, { color: theme.text }]}>
        {t.selectChefDesc}
      </Text>

      {staffLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.error}
          style={{ marginTop: spacing.xl }}
        />
      ) : staff.length === 0 ? (
        <EmptyState
          type="result"
          message={t.noStaff}
          textColor={theme.text}
        />
      ) : (
        <>
          {/* Search */}
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
              placeholder={t.searchStaff}
              placeholderTextColor={theme.text}
              value={staffSearch}
              onChangeText={setStaffSearch}
            />
          </View>

          {filteredStaff.map(member => {
            const isSelected = selectedChef?.userId === member.userId;
            const displayName =
              member.firstName || member.lastName
                ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                : member.username;
            return (
              <TouchableOpacity
                key={member.userId}
                style={[
                  styles.staffCard,
                  {
                    borderColor: isSelected ? colors.error : theme.border,
                    backgroundColor: isSelected
                      ? `${colors.error}08`
                      : theme.background,
                  },
                ]}
                onPress={() =>
                  setSelectedChef(isSelected ? null : member)
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.staffAvatar,
                    { backgroundColor: `${colors.error}15` },
                  ]}
                >
                  <Text style={[styles.staffAvatarText, { color: colors.error }]}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text
                    style={[styles.staffName, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <Text
                    style={[styles.staffEmail, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {member.email}
                  </Text>
                  {(member.poste || member.nomAgence) && (
                    <View style={styles.stationMetaRow}>
                      <Ionicons
                        name="briefcase-outline"
                        size={11}
                        color={theme.text}
                      />
                      <Text
                        style={[styles.stationMeta, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {' '}
                        {[member.poste, member.nomAgence]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.error },
                    ]}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );

  // ─── Step 4 — Confirmation ──────────────────────────────────────────────────

  const Step4 = () => {
    const displayName =
      selectedChef?.firstName || selectedChef?.lastName
        ? `${selectedChef.firstName ?? ''} ${selectedChef.lastName ?? ''}`.trim()
        : selectedChef?.username ?? '';

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.textStrong }]}>
          {t.verifyInfo}
        </Text>
        <Text style={[styles.stepDesc, { color: theme.text }]}>
          {t.verifyDesc}
        </Text>

        {/* Selected station */}
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
              <Ionicons name="business-outline" size={22} color={theme.text} />
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
            <Text style={[styles.changeLink, { color: colors.error }]}>
              {t.change}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Agency info summary */}
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
            ...(form.greetingMessage
              ? [
                  {
                    label: t.greeting
                      .replace(' (optionnel)', '')
                      .replace(' (optional)', ''),
                    value: form.greetingMessage,
                  },
                ]
              : []),
          ].map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.summaryRow,
                { borderTopColor: theme.border, borderTopWidth: i === 0 ? 0 : 1 },
              ]}
            >
              <Text style={[styles.summaryRowLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              <Text style={[styles.summaryRowValue, { color: theme.textStrong }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Chef d'agence */}
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
              styles.staffAvatar,
              { backgroundColor: `${colors.error}15` },
            ]}
          >
            <Text
              style={[styles.staffAvatarText, { color: colors.error }]}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.staffName, { color: theme.textStrong }]}>
              {displayName}
            </Text>
            <Text style={[styles.staffEmail, { color: theme.text }]}>
              {selectedChef?.email}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setStep(3)}>
            <Text style={[styles.changeLink, { color: colors.error }]}>
              {t.change}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Important notice */}
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
            <Text
              style={[styles.importantTitle, { color: theme.textStrong }]}
            >
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
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
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
                  backgroundColor: colors.error,
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
              style={[styles.primaryBtn, { backgroundColor: colors.error }]}
              onPress={handleStep2Next}
            >
              <Text style={styles.primaryBtnText}>{t.continueBtn}</Text>
            </TouchableOpacity>
          )}
          {step === 3 && (
            <View style={styles.finalButtons}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.error,
                    opacity: selectedChef ? 1 : 0.5,
                  },
                ]}
                onPress={handleStep3Next}
                disabled={!selectedChef}
              >
                <Text style={styles.primaryBtnText}>{t.continueBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                onPress={() => setStep(2)}
              >
                <Text
                  style={[
                    styles.secondaryBtnText,
                    { color: theme.textStrong },
                  ]}
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
                    backgroundColor: colors.error,
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
                  style={[
                    styles.secondaryBtnText,
                    { color: theme.textStrong },
                  ]}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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

  // Staff cards
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.lg,
  },
  staffInfo: { flex: 1 },
  staffName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  staffEmail: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 1 },

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
  fieldError: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    color: colors.error,
  },
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

  chefSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },

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
});
