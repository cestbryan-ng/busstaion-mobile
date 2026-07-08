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
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import { useDebounce } from '../../../../hooks/useDebounce';
import { useToast } from '../../../../components/toast';

type Vehicle = {
  idVehicule: string;
  nom?: string;
  modele?: string;
  plaqueMatricule?: string;
  nbrPlaces?: number;
  lienPhoto?: string;
  description?: string;
};

type TravelClass = {
  id: string;
  nom: string;
  prix?: number;
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#d97706',
  STANDARD: '#16a34a',
  ECONOMIQUE: '#6b7280',
};

export default function OrgVehicles() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgVehicles'>>();
  const { agencyId } = route.params;

  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [token, setToken] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [classes, setClasses] = useState<TravelClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterSeats, setFilterSeats] = useState<
    'all' | 'small' | 'medium' | 'large'
  >('all');
  const debouncedSearch = useDebounce(search);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vNom, setVNom] = useState('');
  const [vModele, setVModele] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [vNbrPlaces, setVNbrPlaces] = useState('');
  const [vPlaque, setVPlaque] = useState('');

  const [showClassModal, setShowClassModal] = useState(false);
  const [cNom, setCNom] = useState('');
  const [cPrix, setCPrix] = useState('');

  const [creating, setCreating] = useState(false);

  const t = {
    fr: {
      title: 'Véhicules',
      search: 'Rechercher un véhicule...',
      places: 'places',
      active: 'ACTIF',
      maintenance: 'MAINTENANCE',
      travelClasses: 'Classes de voyage',
      noVehicles: 'Aucun véhicule',
      noClasses: 'Aucune classe',
    },
    en: {
      title: 'Vehicles',
      search: 'Search a vehicle...',
      places: 'seats',
      active: 'ACTIVE',
      maintenance: 'MAINTENANCE',
      travelClasses: 'Travel classes',
      noVehicles: 'No vehicles',
      noClasses: 'No classes',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setToken(token ?? '');

      const headers = { Authorization: `Bearer ${token}` };
      const [vRes, cRes] = await Promise.allSettled([
        fetch(`${API_URL}/vehicule/agence/${agencyId}`, { headers }),
        fetch(`${API_URL}/class-voyage/agence/${agencyId}`, { headers }),
      ]);

      if (vRes.status === 'fulfilled' && vRes.value.ok) {
        const d = await vRes.value.json();
        const vehicleData = d.content || d || [];
        setVehicles(vehicleData);
        setCache(`org_vehicles_${agencyId}`, vehicleData);
        setIsOffline(false);
      } else {
        const cached = await getCache(`org_vehicles_${agencyId}`);
        if (cached) {
          setVehicles(cached);
          setIsOffline(true);
        }
      }

      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const d = await cRes.value.json();
        const classData = d.content || d || [];
        setClasses(classData);
        setCache(`org_vehicles_classes_${agencyId}`, classData);
      } else {
        const cached = await getCache(`org_vehicles_classes_${agencyId}`);
        if (cached) {
          setClasses(cached);
          setIsOffline(true);
        }
      }
    } catch {
      const cachedVehicles = await getCache(`org_vehicles_${agencyId}`);
      if (cachedVehicles) {
        setVehicles(cachedVehicles);
        setIsOffline(true);
      }
      const cachedClasses = await getCache(`org_vehicles_classes_${agencyId}`);
      if (cachedClasses) {
        setClasses(cachedClasses);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCreateVehicle = async () => {
    if (!vNom.trim() || !vNbrPlaces.trim() || !vPlaque.trim()) {
      toast.warning(
        lang === 'fr'
          ? 'Champs obligatoires manquants'
          : 'Required fields missing',
      );
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/vehicule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: vNom.trim(),
          modele: vModele.trim() || undefined,
          description: vDescription.trim() || undefined,
          nbrPlaces: Number(vNbrPlaces),
          plaqueMatricule: vPlaque.trim(),
          carburant: 'Diesel',
          idAgenceVoyage: agencyId,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setVehicles(prev => [...prev, created]);
        toast.success(lang === 'fr' ? 'Véhicule créé' : 'Vehicle created');
        setShowVehicleModal(false);
        setVNom('');
        setVModele('');
        setVDescription('');
        setVNbrPlaces('');
        setVPlaque('');
      } else {
        toast.error(
          lang === 'fr' ? 'Erreur lors de la création' : 'Creation failed',
        );
      }
    } catch {
      toast.error(lang === 'fr' ? 'Erreur réseau' : 'Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClass = async () => {
    if (!cNom.trim() || !cPrix.trim()) {
      toast.warning(
        lang === 'fr'
          ? 'Champs obligatoires manquants'
          : 'Required fields missing',
      );
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/class-voyage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: cNom.trim(),
          prix: parseFloat(cPrix),
          idAgenceVoyage: agencyId,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setClasses(prev => [...prev, created]);
        toast.success(lang === 'fr' ? 'Classe créée' : 'Class created');
        setShowClassModal(false);
        setCNom('');
        setCPrix('');
      } else {
        toast.error(
          lang === 'fr' ? 'Erreur lors de la création' : 'Creation failed',
        );
      }
    } catch {
      toast.error(lang === 'fr' ? 'Erreur réseau' : 'Network error');
    } finally {
      setCreating(false);
    }
  };

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(v => {
        const matchSearch =
          !debouncedSearch.trim() ||
          [v.nom, v.modele, v.plaqueMatricule].some(f =>
            f?.toLowerCase().includes(debouncedSearch.toLowerCase()),
          );
        const seats = v.nbrPlaces || 0;
        const matchSeats =
          filterSeats === 'all' ||
          (filterSeats === 'small' && seats < 20) ||
          (filterSeats === 'medium' && seats >= 20 && seats <= 40) ||
          (filterSeats === 'large' && seats > 40);
        return matchSearch && matchSeats;
      }),
    [vehicles, debouncedSearch, filterSeats],
  );

  if (loading) return <SkeletonListScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}
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
          style={styles.headerSide}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={styles.headerSide} />
      </View>

      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchInput,
            { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={theme.text} />
          <TextInput
            style={[styles.searchText, { color: theme.textStrong }]}
            placeholder={t.search}
            placeholderTextColor={theme.text}
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
        <View
          style={[
            styles.filterChips,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {(
            [
              { key: 'all', label: lang === 'fr' ? 'Tous' : 'All' },
              { key: 'small', label: '< 20 places' },
              { key: 'medium', label: '20 – 40' },
              { key: 'large', label: '> 40' },
            ] as const
          ).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    filterSeats === f.key
                      ? colors.primary
                      : theme.backgroundAlt,
                  borderColor:
                    filterSeats === f.key ? colors.primary : theme.border,
                },
              ]}
              onPress={() => setFilterSeats(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filterSeats === f.key ? '#fff' : theme.text },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
      >
        {/* Vehicles section header */}
        <View style={styles.classesSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.title}
          </Text>
        </View>

        {filteredVehicles.length === 0 ? (
          <EmptyState
            type="result"
            message={t.noVehicles}
            textColor={theme.text}
          />
        ) : (
          filteredVehicles.map((v, i) => (
            <View
              key={v.idVehicule ?? `vehicle-${i}`}
              style={[
                styles.vehicleCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.vehicleImageBox,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                {v.lienPhoto && v.lienPhoto.startsWith('http') ? (
                  <Image
                    source={{ uri: v.lienPhoto }}
                    style={styles.vehicleImageFull}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="bus-outline"
                    size={28}
                    color={colors.primary}
                  />
                )}
              </View>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleTopRow}>
                  <Text
                    style={[styles.vehicleName, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {v.nom || v.modele || '—'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${colors.success}15` },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: colors.success }]}
                    >
                      {t.active}
                    </Text>
                  </View>
                </View>
                {v.modele && v.nom && (
                  <Text
                    style={[styles.vehicleModel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {v.modele}
                  </Text>
                )}
                <Text style={[styles.vehiclePlate, { color: theme.text }]}>
                  {v.plaqueMatricule}
                </Text>
                {v.nbrPlaces ? (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="people-outline"
                      size={12}
                      color={theme.text}
                    />
                    <Text style={[styles.metaText, { color: theme.text }]}>
                      {' '}
                      {v.nbrPlaces} {t.places}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}

        {/* Travel classes */}
        <View style={styles.classesSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.travelClasses}
          </Text>
          <TouchableOpacity onPress={() => setShowClassModal(true)}>
            <View
              style={[styles.addSmallBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {classes.length === 0 ? (
          <EmptyState
            type="result"
            message={t.noClasses}
            textColor={theme.text}
          />
        ) : (
          classes.map((cls, i) => {
            const classKey = cls.nom.toUpperCase().split(' ')[0];
            const classColor = CLASS_COLORS[classKey] || colors.primary;
            return (
              <View
                key={cls.id ?? `class-${i}`}
                style={[
                  styles.classCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.classIcon,
                    { backgroundColor: `${classColor}15` },
                  ]}
                >
                  <Ionicons name="star-outline" size={20} color={classColor} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: theme.textStrong }]}>
                    {cls.nom}
                  </Text>
                  {cls.prix !== undefined && (
                    <Text style={[styles.classPrice, { color: theme.text }]}>
                      {cls.prix.toLocaleString('fr-FR')} FCFA
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}


        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Modal — Créer un véhicule */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
                {lang === 'fr' ? 'Nouveau véhicule' : 'New vehicle'}
              </Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {[
                {
                  label: lang === 'fr' ? 'Nom *' : 'Name *',
                  value: vNom,
                  set: setVNom,
                  placeholder: 'Toyota Coaster',
                },
                {
                  label: lang === 'fr' ? 'Modèle' : 'Model',
                  value: vModele,
                  set: setVModele,
                  placeholder: 'Coaster 2020',
                },
                {
                  label:
                    lang === 'fr' ? 'Plaque matricule *' : 'Plate number *',
                  value: vPlaque,
                  set: setVPlaque,
                  placeholder: 'LT-1234-AB',
                },
                {
                  label: lang === 'fr' ? 'Nb de places *' : 'Seats *',
                  value: vNbrPlaces,
                  set: setVNbrPlaces,
                  placeholder: '30',
                  keyboardType: 'numeric' as const,
                },
                {
                  label: lang === 'fr' ? 'Description' : 'Description',
                  value: vDescription,
                  set: setVDescription,
                  placeholder: '…',
                  multiline: true,
                },
              ].map(field => (
                <View key={field.label} style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.text }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        borderColor: theme.border,
                        color: theme.textStrong,
                        backgroundColor: theme.backgroundAlt,
                        height: field.multiline ? 72 : 44,
                        textAlignVertical: field.multiline ? 'top' : 'center',
                      },
                    ]}
                    value={field.value}
                    onChangeText={field.set}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.text}
                    keyboardType={field.keyboardType || 'default'}
                    multiline={field.multiline}
                  />
                </View>
              ))}
            </ScrollView>
            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: theme.backgroundAlt,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowVehicleModal(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: theme.textStrong }]}
                >
                  {lang === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateVehicle}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {lang === 'fr' ? 'Créer' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal — Créer une classe de voyage */}
      <Modal
        visible={showClassModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClassModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
                {lang === 'fr' ? 'Nouvelle classe' : 'New class'}
              </Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'Nom *' : 'Name *'}
                </Text>
                <View style={styles.classChips}>
                  {['VIP', 'PREMIUM', 'STANDARD', 'ECONOMIQUE'].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.classChip,
                        {
                          backgroundColor:
                            cNom === n ? colors.primary : theme.backgroundAlt,
                          borderColor:
                            cNom === n ? colors.primary : theme.border,
                        },
                      ]}
                      onPress={() => setCNom(n)}
                    >
                      <Text
                        style={[
                          styles.classChipText,
                          { color: cNom === n ? '#fff' : theme.text },
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>
                  {lang === 'fr' ? 'Prix (FCFA) *' : 'Price (FCFA) *'}
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      borderColor: theme.border,
                      color: theme.textStrong,
                      backgroundColor: theme.backgroundAlt,
                      height: 44,
                    },
                  ]}
                  value={cPrix}
                  onChangeText={setCPrix}
                  placeholder="8000"
                  placeholderTextColor={theme.text}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: theme.backgroundAlt,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowClassModal(false)}
              >
                <Text
                  style={[styles.modalBtnText, { color: theme.textStrong }]}
                >
                  {lang === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateClass}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {lang === 'fr' ? 'Créer' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerSide: { width: 40 },
  title: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    flex: 1,
    textAlign: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
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
  list: { padding: spacing.lg },
  vehicleCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  vehicleImage: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImageBox: {
    width: 56,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    margin: spacing.md,
  },
  vehicleImageFull: { width: '100%', height: '100%' },
  vehicleImageInner: { width: '100%', height: '100%' },
  vehicleInfo: { flex: 1, padding: spacing.md },
  vehicleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vehicleName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  vehicleModel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  vehiclePlate: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  vehicleMeta: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.body, fontSize: typography.sizes.xs },
  classesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  addSmallBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: { flex: 1 },
  className: { ...typography.bodyBold, fontSize: typography.sizes.md },
  classPrice: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  seeMoreClasses: { alignItems: 'center', paddingVertical: spacing.md },
  seeMoreText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...typography.bodyBold, fontSize: typography.sizes.lg },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  modalField: { gap: spacing.xs },
  modalLabel: { ...typography.body, fontSize: typography.sizes.sm },
  modalInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  classChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  classChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  classChipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
