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
import ConfirmModal from '../../../../components/confirm-modal';
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
  carburant?: string;
  statut?: string;
};

type TravelClass = {
  id: string;
  nom: string;
  prix?: number;
  tauxAnnulation?: number;
  description?: string;
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

  // Vehicle form
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [vNom, setVNom] = useState('');
  const [vModele, setVModele] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [vNbrPlaces, setVNbrPlaces] = useState('');
  const [vPlaque, setVPlaque] = useState('');

  // Class form
  const [showClassModal, setShowClassModal] = useState(false);
  const [editClass, setEditClass] = useState<TravelClass | null>(null);
  const [cNom, setCNom] = useState('');
  const [cPrix, setCPrix] = useState('');
  const [cTaux, setCTaux] = useState('');

  // Menu & delete
  const [menuItem, setMenuItem] = useState<{
    item: any;
    type: 'vehicle' | 'class';
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'vehicle' | 'class';
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      newVehicle: 'Nouveau véhicule',
      editVehicle: 'Modifier le véhicule',
      newClass: 'Nouvelle classe',
      editClass: 'Modifier la classe',
      save: 'Enregistrer',
      create: 'Créer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      deleteTitle: 'Confirmer la suppression',
      deleteMessage: 'Voulez-vous vraiment supprimer cet élément ?',
      savedSuccess: 'Enregistré avec succès',
      deletedSuccess: 'Supprimé avec succès',
      error: 'Une erreur est survenue',
      required: 'Champs obligatoires manquants',
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
      newVehicle: 'New vehicle',
      editVehicle: 'Edit vehicle',
      newClass: 'New class',
      editClass: 'Edit class',
      save: 'Save',
      create: 'Create',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      deleteTitle: 'Confirm deletion',
      deleteMessage: 'Are you sure you want to delete this item?',
      savedSuccess: 'Saved successfully',
      deletedSuccess: 'Deleted successfully',
      error: 'An error occurred',
      required: 'Required fields missing',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [tok, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setToken(tok ?? '');

      const headers = { Authorization: `Bearer ${tok}` };
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

  const openCreateVehicle = () => {
    setEditVehicle(null);
    setVNom('');
    setVModele('');
    setVDescription('');
    setVNbrPlaces('');
    setVPlaque('');
    setShowVehicleModal(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditVehicle(v);
    setVNom(v.nom || '');
    setVModele(v.modele || '');
    setVDescription(v.description || '');
    setVNbrPlaces(String(v.nbrPlaces || ''));
    setVPlaque(v.plaqueMatricule || '');
    setShowVehicleModal(true);
  };

  const openCreateClass = () => {
    setEditClass(null);
    setCNom('');
    setCPrix('');
    setCTaux('');
    setShowClassModal(true);
  };

  const openEditClass = (c: TravelClass) => {
    setEditClass(c);
    setCNom(c.nom || '');
    setCPrix(String(c.prix || ''));
    setCTaux(String(c.tauxAnnulation || ''));
    setShowClassModal(true);
  };

  const handleSubmitVehicle = async () => {
    if (!vNom.trim() || !vNbrPlaces.trim() || !vPlaque.trim()) {
      toast.warning(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const body = {
        nom: vNom.trim(),
        modele: vModele.trim() || undefined,
        description: vDescription.trim() || undefined,
        nbrPlaces: Number(vNbrPlaces),
        plaqueMatricule: vPlaque.trim(),
        carburant: 'Diesel',
        idAgenceVoyage: agencyId,
      };
      const url = editVehicle
        ? `${API_URL}/vehicule/${editVehicle.idVehicule}`
        : `${API_URL}/vehicule`;
      const method = editVehicle ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(t.savedSuccess);
        await loadData();
        setShowVehicleModal(false);
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClass = async () => {
    if (!cNom.trim() || !cPrix.trim()) {
      toast.warning(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const body = {
        nom: cNom.trim(),
        prix: parseFloat(cPrix),
        tauxAnnulation: cTaux ? parseFloat(cTaux) : undefined,
        idAgenceVoyage: agencyId,
      };
      const url = editClass
        ? `${API_URL}/class-voyage/${editClass.id}`
        : `${API_URL}/class-voyage`;
      const method = editClass ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(t.savedSuccess);
        await loadData();
        setShowClassModal(false);
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const url =
        deleteTarget.type === 'vehicle'
          ? `${API_URL}/vehicule/${deleteTarget.id}`
          : `${API_URL}/class-voyage/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success(t.deletedSuccess);
        await loadData();
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setConfirmModal(false);
      setDeleteTarget(null);
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
        {/* Vehicles section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <TouchableOpacity onPress={openCreateVehicle}>
            <View style={[styles.addSmallBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
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
                      {
                        backgroundColor:
                          v.statut === 'EN_SERVICE'
                            ? `${colors.primary}15`
                            : `${colors.success}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            v.statut === 'EN_SERVICE'
                              ? colors.primary
                              : colors.success,
                        },
                      ]}
                    >
                      {v.statut === 'EN_SERVICE'
                        ? lang === 'fr'
                          ? 'En service'
                          : 'In service'
                        : lang === 'fr'
                        ? 'Disponible'
                        : 'Available'}
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
            {v.statut !== 'EN_SERVICE' && (
              <TouchableOpacity
                onPress={() => setMenuItem({ item: v, type: 'vehicle' })}
                style={styles.dotMenuBtn}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
              </TouchableOpacity>
            )}
            </View>
          ))
        )}

        {/* Travel classes */}
        <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.travelClasses}
          </Text>
          <TouchableOpacity onPress={openCreateClass}>
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
                <TouchableOpacity
                  onPress={() => setMenuItem({ item: cls, type: 'class' })}
                  style={styles.dotMenuBtn}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Modal — Véhicule (create / edit) */}
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
                {editVehicle ? t.editVehicle : t.newVehicle}
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
                    placeholderTextColor={theme.placeholder}
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
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitVehicle}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {editVehicle ? t.save : t.create}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal — Classe de voyage (create / edit) */}
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
                {editClass ? t.editClass : t.newClass}
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
                  placeholderTextColor={theme.placeholder}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>
                  {lang === 'fr' ? "Taux d'annulation (%)" : 'Cancellation rate (%)'}
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
                  value={cTaux}
                  onChangeText={setCTaux}
                  placeholder="5"
                  placeholderTextColor={theme.placeholder}
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
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitClass}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {editClass ? t.save : t.create}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom sheet menu */}
      <Modal
        visible={menuItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuItem(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuItem(null)}
        >
          <View
            style={[styles.menuSheet, { backgroundColor: theme.background }]}
          >
            <TouchableOpacity
              style={styles.menuSheetItem}
              onPress={() => {
                if (menuItem?.type === 'vehicle') openEditVehicle(menuItem.item);
                else if (menuItem?.type === 'class') openEditClass(menuItem.item);
                setMenuItem(null);
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.textStrong} />
              <Text style={[styles.menuSheetText, { color: theme.textStrong }]}>
                {t.edit}
              </Text>
            </TouchableOpacity>
            <View style={[styles.menuSheetDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.menuSheetItem}
              onPress={() => {
                const id =
                  menuItem?.type === 'vehicle'
                    ? menuItem.item.idVehicule
                    : menuItem?.item.id;
                setDeleteTarget({ id, type: menuItem!.type });
                setMenuItem(null);
                setConfirmModal(true);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.menuSheetText, { color: colors.error }]}>
                {t.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={confirmModal}
        title={t.deleteTitle}
        message={t.deleteMessage}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmModal(false);
          setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  addSmallBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
  vehicleInfo: { flex: 1, paddingVertical: spacing.md },
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
  metaItem: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { ...typography.body, fontSize: typography.sizes.xs },
  dotMenuBtn: { padding: spacing.md },
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  menuSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  menuSheetText: { ...typography.body, fontSize: typography.sizes.md },
  menuSheetDivider: { height: 1, marginHorizontal: spacing.lg },
});
