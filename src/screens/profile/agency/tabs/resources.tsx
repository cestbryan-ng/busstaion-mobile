import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollToTop } from '@react-navigation/native';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import ConfirmModal from '../../../../components/confirm-modal';
import { SkeletonResourcesScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';
import { useToast } from '../../../../components/toast';
import { useDebounce } from '../../../../hooks/useDebounce';
import ImagePlaceholder from '../../../../assets/placeholders/image.svg';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';

type Vehicle = {
  idVehicule: string;
  nom?: string;
  modele?: string;
  plaqueMatricule?: string;
  nbrPlaces?: number;
  description?: string;
  lienPhoto?: string;
  statut?: string;
  carburant?: string;
};

type Driver = {
  userId: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  permis?: string;
  statut?: string;
};

type Employee = {
  employeId: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  poste?: string;
  departement?: string;
  dateEmbauche?: string;
  statutEmploye?: string;
  nomManager?: string;
  agenceVoyageId?: string;
  nomAgence?: string;
};

type TravelClass = {
  id: string;
  nom: string;
  prix?: number;
  tauxAnnulation?: number;
  description?: string;
  amenities?: string[];
};

type ResourceTab = 'vehicles' | 'drivers' | 'employees' | 'classes';

const VEHICLE_STATUS: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  DISPONIBLE: {
    label: 'Disponible',
    labelEn: 'Available',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_VOYAGE: {
    label: 'En voyage',
    labelEn: 'On trip',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  MAINTENANCE: {
    label: 'Maintenance',
    labelEn: 'Maintenance',
    color: '#d97706',
    bg: '#fef3c715',
  },
  HORS_SERVICE: {
    label: 'Hors service',
    labelEn: 'Out of service',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

const DRIVER_STATUS: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  DISPONIBLE: {
    label: 'Disponible',
    labelEn: 'Available',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_VOYAGE: {
    label: 'En voyage',
    labelEn: 'On trip',
    color: colors.primary,
    bg: `${colors.primary}15`,
  },
  REPOS: { label: 'Repos', labelEn: 'Rest', color: '#d97706', bg: '#fef3c715' },
};

const EMPLOYEE_STATUS: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  ACTIF: {
    label: 'Actif',
    labelEn: 'Active',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_CONGE: {
    label: 'En congé',
    labelEn: 'On leave',
    color: '#d97706',
    bg: '#fef3c715',
  },
  INACTIF: {
    label: 'Inactif',
    labelEn: 'Inactive',
    color: '#6b7280',
    bg: '#6b728015',
  },
};

const CLASS_ICONS: Record<string, string> = {
  VIP: 'diamond-outline',
  PREMIUM: 'star-outline',
  STANDARD: 'person-outline',
  ECONOMY: 'bicycle-outline',
};

const CLASS_ICON_COLORS: Record<string, string> = {
  VIP: '#1e3a8a',
  PREMIUM: '#d97706',
  STANDARD: '#16a34a',
  ECONOMY: '#6b7280',
};


function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  required?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  return (
    <View style={fStyles.field}>
      <Text style={[fStyles.label, { color: theme.textStrong }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <TextInput
        style={[
          fStyles.input,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundAlt,
            color: theme.textStrong,
          },
          multiline && {
            height: 72,
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
    </View>
  );
}

const fStyles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
});

export default function AgencyResources() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [agencyId, setAgencyId] = useState('');
  const [token, setToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeTab, setActiveTab] = useState<ResourceTab>('vehicles');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [classes, setClasses] = useState<TravelClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [formModal, setFormModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuItem, setMenuItem] = useState<any>(null);

  // Forms
  const [vForm, setVForm] = useState({
    nom: '',
    modele: '',
    plaqueMatricule: '',
    nbrPlaces: '',
    description: '',
    carburant: 'Diesel',
  });
  const [dForm, setDForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    username: '',
    permis: '',
    password: '',
  });
  const [eForm, setEForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    poste: '',
    departement: '',
    username: '',
    password: '',
  });
  const [cForm, setCForm] = useState({
    nom: '',
    prix: '',
    tauxAnnulation: '',
    description: '',
  });

  const t = {
    fr: {
      title: 'Ressources',
      vehicles: 'Véhicules',
      drivers: 'Chauffeurs',
      employees: 'Employés',
      classes: 'Classes',
      overview: 'Aperçu des ressources',
      totalSeats: 'Places totales',
      searchVehicle: 'Rechercher un véhicule...',
      searchDriver: 'Rechercher un chauffeur...',
      searchEmployee: 'Rechercher un employé...',
      searchClass: 'Rechercher une classe...',
      addVehicle: '+ Ajouter un véhicule',
      addDriver: '+ Ajouter un chauffeur',
      addEmployee: '+ Ajouter un employé',
      addClass: '+ Ajouter une classe',
      newVehicle: 'Nouveau véhicule',
      editVehicle: 'Modifier le véhicule',
      newDriver: 'Nouveau chauffeur',
      editDriver: 'Modifier le chauffeur',
      newEmployee: 'Nouvel employé',
      editEmployee: "Modifier l'employé",
      newClass: 'Nouvelle classe de voyage',
      editClass: 'Modifier la classe',
      places: 'places',
      fuel: 'carburant',
      permit: 'Permis :',
      department: 'Département',
      cancelRate: "Taux d'annulation :",
      deleteTitle: 'Confirmer la suppression',
      deleteMessage: 'Voulez-vous vraiment supprimer cet élément ?',
      confirmDelete: 'Supprimer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      close: 'Annuler',
      // Vehicle form
      vehicleName: 'Nom du véhicule',
      model: 'Modèle',
      plate: "Plaque d'immatriculation",
      seats: 'Nombre de places',
      desc: 'Description',
      // Driver form
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      username: "Nom d'utilisateur",
      permitNum: 'Numéro de permis',
      password: 'Mot de passe',
      // Employee form
      position: 'Poste',
      dept: 'Département',
      // Class form
      className: 'Nom de la classe',
      price: 'Prix (FCFA)',
      cancelRateField: "Taux d'annulation (%)",
      savedSuccess: 'Enregistré avec succès',
      deletedSuccess: 'Supprimé avec succès',
      error: 'Une erreur est survenue',
    },
    en: {
      title: 'Resources',
      vehicles: 'Vehicles',
      drivers: 'Drivers',
      employees: 'Employees',
      classes: 'Classes',
      overview: 'Resources overview',
      totalSeats: 'Total seats',
      searchVehicle: 'Search a vehicle...',
      searchDriver: 'Search a driver...',
      searchEmployee: 'Search an employee...',
      searchClass: 'Search a class...',
      addVehicle: '+ Add vehicle',
      addDriver: '+ Add driver',
      addEmployee: '+ Add employee',
      addClass: '+ Add class',
      newVehicle: 'New vehicle',
      editVehicle: 'Edit vehicle',
      newDriver: 'New driver',
      editDriver: 'Edit driver',
      newEmployee: 'New employee',
      editEmployee: 'Edit employee',
      newClass: 'New travel class',
      editClass: 'Edit class',
      places: 'seats',
      fuel: 'fuel',
      permit: 'License:',
      department: 'Department',
      cancelRate: 'Cancellation rate:',
      deleteTitle: 'Confirm deletion',
      deleteMessage: 'Are you sure you want to delete this item?',
      confirmDelete: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Cancel',
      vehicleName: 'Vehicle name',
      model: 'Model',
      plate: 'License plate',
      seats: 'Number of seats',
      desc: 'Description',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      username: 'Username',
      permitNum: 'License number',
      password: 'Password',
      position: 'Position',
      dept: 'Department',
      className: 'Class name',
      price: 'Price (FCFA)',
      cancelRateField: 'Cancellation rate (%)',
      savedSuccess: 'Saved successfully',
      deletedSuccess: 'Deleted successfully',
      error: 'An error occurred',
    },
  }[lang];

  const loadAll = useCallback(async () => {
    try {
      const [tok, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      if (!tok) return;
      setToken(tok);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;
      setCurrentUserId(chefId);

      const headers = { Authorization: `Bearer ${tok}` };
      const agencyRes = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers,
      });
      if (!agencyRes.ok) return;
      const agency = await agencyRes.json();
      setAgencyId(agency.id);

      const [vRes, dRes, eRes, cRes] = await Promise.allSettled([
        fetch(`${API_URL}/vehicule/agence/${agency.id}`, { headers }),
        fetch(`${API_URL}/utilisateur/chauffeurs/${agency.id}`, { headers }),
        fetch(`${API_URL}/utilisateur/employes/${agency.id}`, { headers }),
        fetch(`${API_URL}/class-voyage/agence/${agency.id}`, { headers }),
      ]);

      if (vRes.status === 'fulfilled' && vRes.value.ok) {
        const d = await vRes.value.json();
        setVehicles(d.content || d || []);
      }
      if (dRes.status === 'fulfilled' && dRes.value.ok) {
        const d = await dRes.value.json();
        setDrivers(d.content || d || []);
      }
      if (eRes.status === 'fulfilled' && eRes.value.ok) {
        const d = await eRes.value.json();
        setEmployees(d.content || d || []);
      }
      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const d = await cRes.value.json();
        setClasses(d.content || d || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const totalSeats = vehicles.reduce((s, v) => s + (v.nbrPlaces || 0), 0);

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(v => {
        if (filterStatus !== 'ALL' && (v.statut || 'DISPONIBLE').toUpperCase() !== filterStatus) return false;
        if (!debouncedSearch.trim()) return true;
        return [v.nom, v.modele, v.plaqueMatricule].some(f =>
          f?.toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
      }),
    [vehicles, debouncedSearch, filterStatus],
  );

  const filteredDrivers = useMemo(
    () =>
      drivers.filter(d => {
        if (filterStatus !== 'ALL' && (d.statut || 'DISPONIBLE').toUpperCase() !== filterStatus) return false;
        if (!debouncedSearch.trim()) return true;
        return [d.first_name, d.last_name, d.phone_number].some(f =>
          f?.toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
      }),
    [drivers, debouncedSearch, filterStatus],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter(e => {
        if (filterStatus !== 'ALL' && (e.statutEmploye || 'ACTIF').toUpperCase() !== filterStatus) return false;
        if (!debouncedSearch.trim()) return true;
        return [e.firstName, e.lastName, e.poste, e.departement, e.phoneNumber].some(f =>
          f?.toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
      }),
    [employees, debouncedSearch, filterStatus],
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter(
        c =>
          !debouncedSearch.trim() || c.nom.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [classes, debouncedSearch],
  );

  const STATUS_CHIPS: Record<ResourceTab, { key: string; label: string }[]> = {
    vehicles: [
      { key: 'ALL', label: lang === 'fr' ? 'Tous' : 'All' },
      { key: 'DISPONIBLE', label: lang === 'fr' ? 'Disponible' : 'Available' },
      { key: 'EN_VOYAGE', label: lang === 'fr' ? 'En voyage' : 'On trip' },
      { key: 'MAINTENANCE', label: 'Maintenance' },
      { key: 'HORS_SERVICE', label: lang === 'fr' ? 'Hors service' : 'Out of service' },
    ],
    drivers: [
      { key: 'ALL', label: lang === 'fr' ? 'Tous' : 'All' },
      { key: 'DISPONIBLE', label: lang === 'fr' ? 'Disponible' : 'Available' },
      { key: 'EN_VOYAGE', label: lang === 'fr' ? 'En voyage' : 'On trip' },
      { key: 'REPOS', label: lang === 'fr' ? 'Repos' : 'Rest' },
    ],
    employees: [
      { key: 'ALL', label: lang === 'fr' ? 'Tous' : 'All' },
      { key: 'ACTIF', label: lang === 'fr' ? 'Actif' : 'Active' },
      { key: 'EN_CONGE', label: lang === 'fr' ? 'En congé' : 'On leave' },
      { key: 'INACTIF', label: lang === 'fr' ? 'Inactif' : 'Inactive' },
    ],
    classes: [],
  };

  const openCreate = () => {
    setEditItem(null);
    if (activeTab === 'vehicles')
      setVForm({
        nom: '',
        modele: '',
        plaqueMatricule: '',
        nbrPlaces: '',
        description: '',
        carburant: 'Diesel',
      });
    if (activeTab === 'drivers')
      setDForm({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        username: '',
        permis: '',
        password: '',
      });
    if (activeTab === 'employees')
      setEForm({
        firstName: '',
        lastName: '',
        email: '',
        poste: '',
        departement: '',
        username: '',
        password: '',
      });
    if (activeTab === 'classes')
      setCForm({ nom: '', prix: '', tauxAnnulation: '', description: '' });
    setFormModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (activeTab === 'vehicles')
      setVForm({
        nom: item.nom || '',
        modele: item.modele || '',
        plaqueMatricule: item.plaqueMatricule || '',
        nbrPlaces: String(item.nbrPlaces || ''),
        description: item.description || '',
        carburant: item.carburant || 'Diesel',
      });
    if (activeTab === 'drivers')
      setDForm({
        first_name: item.first_name || '',
        last_name: item.last_name || '',
        email: item.email || '',
        phone_number: item.phone_number || '',
        username: item.username || '',
        permis: item.permis || '',
        password: '',
      });
    if (activeTab === 'employees')
      setEForm({
        firstName: item.firstName || item.first_name || '',
        lastName: item.lastName || item.last_name || '',
        email: item.email || '',
        poste: item.poste || '',
        departement: item.departement || '',
        username: item.username || '',
        password: '',
      });
    if (activeTab === 'classes')
      setCForm({
        nom: item.nom || '',
        prix: String(item.prix || ''),
        tauxAnnulation: String(item.tauxAnnulation || ''),
        description: item.description || '',
      });
    setFormModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const isEdit = !!editItem;

      if (activeTab === 'vehicles') {
        const body = {
          ...vForm,
          nbrPlaces: Number(vForm.nbrPlaces),
          idAgenceVoyage: agencyId,
        };
        const url = isEdit
          ? `${API_URL}/vehicule/${editItem.idVehicule}`
          : `${API_URL}/vehicule`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(t.savedSuccess);
          await loadAll();
          setFormModal(false);
        } else {
          toast.error(t.error);
        }
      }
      if (activeTab === 'drivers') {
        const body = {
          first_name: dForm.first_name,
          last_name: dForm.last_name,
          email: dForm.email,
          phone_number: dForm.phone_number,
          username: dForm.username,
          password: dForm.password,
          role: ['EMPLOYE'],
          gender: 'MALE',
          agenceVoyageId: agencyId,
        };
        const url = isEdit
          ? `${API_URL}/utilisateur/chauffeur/${editItem.userId}`
          : `${API_URL}/utilisateur/chauffeur`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(t.savedSuccess);
          await loadAll();
          setFormModal(false);
        } else {
          toast.error(t.error);
        }
      }
      if (activeTab === 'employees') {
        const body = {
          first_name: eForm.firstName,
          last_name: eForm.lastName,
          email: eForm.email,
          username: eForm.username,
          password: eForm.password,
          role: ['EMPLOYE'],
          gender: 'MALE',
          poste: eForm.poste,
          departement: eForm.departement,
          agenceVoyageId: agencyId,
        };
        const url = isEdit
          ? `${API_URL}/utilisateur/employe/${editItem.employeId}`
          : `${API_URL}/utilisateur/employe`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(t.savedSuccess);
          await loadAll();
          setFormModal(false);
        } else {
          toast.error(t.error);
        }
      }
      if (activeTab === 'classes') {
        const body = {
          ...cForm,
          prix: Number(cForm.prix),
          tauxAnnulation: Number(cForm.tauxAnnulation),
          idAgenceVoyage: agencyId,
        };
        const url = isEdit
          ? `${API_URL}/class-voyage/${editItem.id || editItem.idClassVoyage}`
          : `${API_URL}/class-voyage`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success(t.savedSuccess);
          await loadAll();
          setFormModal(false);
        } else {
          toast.error(t.error);
        }
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let url = '';
      if (activeTab === 'vehicles')
        url = `${API_URL}/vehicule/${deleteItem.idVehicule}`;
      if (activeTab === 'drivers')
        url = `${API_URL}/utilisateur/chauffeur/${deleteItem.userId}`;
      if (activeTab === 'employees')
        url = `${API_URL}/utilisateur/employe/${deleteItem.employeId}`;
      if (activeTab === 'classes')
        url = `${API_URL}/class-voyage/${deleteItem.id || deleteItem.idClassVoyage}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success(t.deletedSuccess);
        await loadAll();
        setConfirmModal(false);
        setDeleteItem(null);
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    }
  };

  const openDelete = (item: any) => {
    setDeleteItem(item);
    setConfirmModal(true);
  };

  const searchPlaceholder = {
    vehicles: t.searchVehicle,
    drivers: t.searchDriver,
    employees: t.searchEmployee,
    classes: t.searchClass,
  }[activeTab];

  const formTitle = {
    vehicles: editItem ? t.editVehicle : t.newVehicle,
    drivers: editItem ? t.editDriver : t.newDriver,
    employees: editItem ? t.editEmployee : t.newEmployee,
    classes: editItem ? t.editClass : t.newClass,
  }[activeTab];

  const ThreeDotMenu = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => setMenuItem(item)} style={styles.dotMenuBtn}>
      <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
    </TouchableOpacity>
  );

  const VehiclesTab = () => (
    <>
      {filteredVehicles.length === 0 && (
        <EmptyState type="result" message={lang === 'fr' ? 'Aucun véhicule' : 'No vehicles'} textColor={theme.text} />
      )}
      {filteredVehicles.map((v, i) => {
        const statusKey = (v.statut || 'DISPONIBLE')
          .toUpperCase()
          .replace(/ /g, '_');
        const statusCfg =
          VEHICLE_STATUS[statusKey] || VEHICLE_STATUS.DISPONIBLE;
        return (
          <View
            key={v.idVehicule}
            style={[
              styles.listCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.vehicleImage,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              {v.lienPhoto && v.lienPhoto.startsWith('http') ? (
                <Image
                  source={{ uri: v.lienPhoto }}
                  style={styles.vehicleImageInner}
                  resizeMode="cover"
                />
              ) : (
                <ImagePlaceholder width="65%" height="65%" />
              )}
            </View>
            <View style={styles.listInfo}>
              <View style={styles.listTopRow}>
                <Text
                  style={[styles.listTitle, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {v.nom || v.modele || '—'}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusCfg.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                  </Text>
                </View>
              </View>
              <Text style={[styles.listSub, { color: theme.text }]}>
                {v.plaqueMatricule}
              </Text>
              <View style={styles.listMetaRow}>
                {v.nbrPlaces && (
                  <View style={styles.listMeta}>
                    <Ionicons
                      name="people-outline"
                      size={12}
                      color={theme.text}
                    />
                    <Text style={[styles.listMetaText, { color: theme.text }]}>
                      {' '}
                      {v.nbrPlaces} {t.places}
                    </Text>
                  </View>
                )}
                {v.carburant && (
                  <View style={styles.listMeta}>
                    <Ionicons
                      name="water-outline"
                      size={12}
                      color={theme.text}
                    />
                    <Text style={[styles.listMetaText, { color: theme.text }]}>
                      {' '}
                      {v.carburant}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <ThreeDotMenu item={v} />
          </View>
        );
      })}
    </>
  );

  const DriversTab = () => (
    <>
      {filteredDrivers.length === 0 && (
        <EmptyState type="result" message={lang === 'fr' ? 'Aucun chauffeur' : 'No drivers'} textColor={theme.text} />
      )}
      {filteredDrivers.map(d => {
        const statusKey = (d.statut || 'DISPONIBLE')
          .toUpperCase()
          .replace(/ /g, '_');
        const statusCfg = DRIVER_STATUS[statusKey] || DRIVER_STATUS.DISPONIBLE;
        return (
          <View
            key={d.userId}
            style={[
              styles.listCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.avatar}>
              <AvatarPlaceholder width="100%" height="100%" />
            </View>
            <View style={styles.listInfo}>
              <View style={styles.listTopRow}>
                <Text
                  style={[styles.listTitle, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {d.first_name} {d.last_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                  </Text>
                </View>
              </View>
              <Text style={[styles.listSub, { color: theme.text }]}>
                {d.phone_number}
              </Text>
              {d.permis && (
                <View style={styles.listMeta}>
                  <Ionicons name="card-outline" size={12} color={theme.text} />
                  <Text style={[styles.listMetaText, { color: theme.text }]}>
                    {' '}{t.permit} {d.permis}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </>
  );

  const EmployeesTab = () => (
    <>
      {filteredEmployees.length === 0 && (
        <EmptyState type="result" message={lang === 'fr' ? 'Aucun employé' : 'No employees'} textColor={theme.text} />
      )}
      {filteredEmployees.map(e => {
        const statusKey = (e.statutEmploye || 'ACTIF')
          .toUpperCase()
          .replace(/ /g, '_');
        const statusCfg = EMPLOYEE_STATUS[statusKey] || EMPLOYEE_STATUS.ACTIF;
        return (
          <View
            key={e.employeId}
            style={[
              styles.listCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.avatar}>
              <AvatarPlaceholder width="100%" height="100%" />
            </View>
            <View style={styles.listInfo}>
              <View style={styles.listTopRow}>
                <Text
                  style={[styles.listTitle, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {e.firstName} {e.lastName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                  </Text>
                </View>
              </View>
              <Text style={[styles.listSub, { color: theme.text }]}>{e.poste}</Text>
              {e.phoneNumber && (
                <View style={styles.listMeta}>
                  <Ionicons name="call-outline" size={12} color={theme.text} />
                  <Text style={[styles.listMetaText, { color: theme.text }]}>
                    {' '}{e.phoneNumber}
                  </Text>
                </View>
              )}
              {e.departement && (
                <Text style={[styles.listMetaText, { color: theme.text }]}>
                  {t.department}: {e.departement}
                </Text>
              )}
            </View>
            {e.userId !== currentUserId && <ThreeDotMenu item={e} />}
          </View>
        );
      })}
    </>
  );

  const ClassesTab = () => (
    <>
      {filteredClasses.length === 0 && (
        <EmptyState type="result" message={lang === 'fr' ? 'Aucune classe' : 'No classes'} textColor={theme.text} />
      )}
      {filteredClasses.map((c, i) => {
        const classKey = c.nom.toUpperCase().split(' ')[0];
        const iconName = CLASS_ICONS[classKey] || 'star-outline';
        const iconColor = CLASS_ICON_COLORS[classKey] || colors.primary;
        return (
          <View
            key={c.id ?? `class-${i}`}
            style={[
              styles.classCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[styles.classIcon, { backgroundColor: `${iconColor}15` }]}
            >
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.listInfo}>
              <Text style={[styles.listTitle, { color: theme.textStrong }]}>
                {c.nom}
              </Text>
              {c.prix !== undefined && (
                <Text style={[styles.classPrice, { color: theme.textStrong }]}>
                  {c.prix.toLocaleString('fr-FR')} FCFA
                </Text>
              )}
              {c.tauxAnnulation !== undefined && (
                <Text style={[styles.listMetaText, { color: theme.text }]}>
                  {t.cancelRate}{' '}
                  <Text style={{ color: colors.error }}>
                    {c.tauxAnnulation}%
                  </Text>
                </Text>
              )}
            </View>
            <ThreeDotMenu item={c} />
          </View>
        );
      })}
    </>
  );

  if (loading) { return <SkeletonResourcesScreen />; }

  const TAB_ITEMS: { key: ResourceTab; label: string }[] = [
    { key: 'vehicles', label: t.vehicles },
    { key: 'drivers', label: t.drivers },
    { key: 'employees', label: t.employees },
    { key: 'classes', label: t.classes },
  ];

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.background, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
        </View>

        {/* Tabs */}
        <View
          style={[
            styles.tabsRow,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {TAB_ITEMS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                activeTab === tab.key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => {
                setActiveTab(tab.key);
                setSearch('');
                setFilterStatus('ALL');
                setShowFilter(false);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab.key ? colors.primary : theme.text,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Overview — vehicles tab only */}
          {activeTab === 'vehicles' && (
            <View style={styles.overviewSection}>
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.overview}
              </Text>
              <View style={styles.overviewGrid}>
                {[
                  {
                    icon: 'bus-outline',
                    iconColor: colors.primary,
                    iconBg: `${colors.primary}15`,
                    value: String(vehicles.length),
                    label: t.vehicles,
                  },
                  {
                    icon: 'person-outline',
                    iconColor: colors.success,
                    iconBg: `${colors.success}15`,
                    value: String(drivers.length),
                    label: t.drivers,
                  },
                  {
                    icon: 'people-outline',
                    iconColor: '#d97706',
                    iconBg: '#fef3c715',
                    value: String(employees.length),
                    label: t.employees,
                  },
                  {
                    icon: 'briefcase-outline',
                    iconColor: '#7c3aed',
                    iconBg: '#f5f3ff15',
                    value: String(totalSeats),
                    label: t.totalSeats,
                  },
                ].map(item => (
                  <View
                    key={item.label}
                    style={[
                      styles.overviewCard,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.overviewIcon,
                        { backgroundColor: item.iconBg },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.iconColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.overviewValue,
                        { color: theme.textStrong },
                      ]}
                    >
                      {item.value}
                    </Text>
                    <Text style={[styles.overviewLabel, { color: theme.text }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Search */}
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor:
                  activeTab === 'vehicles' ? 'transparent' : theme.background,
              },
            ]}
          >
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
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.text}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
            {STATUS_CHIPS[activeTab].length > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  {
                    borderColor: filterStatus !== 'ALL' ? colors.primary : theme.border,
                    backgroundColor: filterStatus !== 'ALL' ? `${colors.primary}10` : 'transparent',
                  },
                ]}
                onPress={() => setShowFilter(v => !v)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={filterStatus !== 'ALL' ? colors.primary : theme.textStrong}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          {showFilter && STATUS_CHIPS[activeTab].length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {STATUS_CHIPS[activeTab].map(chip => {
                const active = filterStatus === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderColor: active ? colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFilterStatus(chip.key)}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Tab content */}
          <View style={styles.listContainer}>
            {activeTab === 'vehicles' && <VehiclesTab />}
            {activeTab === 'drivers' && <DriversTab />}
            {activeTab === 'employees' && <EmployeesTab />}
            {activeTab === 'classes' && <ClassesTab />}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={formModal}
        animationType="slide"
        onRequestClose={() => setFormModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
                {formTitle}
              </Text>
              <TouchableOpacity onPress={() => setFormModal(false)}>
                <Ionicons name="close" size={24} color={theme.textStrong} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'vehicles' && (
                <>
                  <Field
                    label={t.vehicleName}
                    value={vForm.nom}
                    onChangeText={v => setVForm(f => ({ ...f, nom: v }))}
                    placeholder="Mercedes Sprinter"
                    required
                  />
                  <Field
                    label={t.model}
                    value={vForm.modele}
                    onChangeText={v => setVForm(f => ({ ...f, modele: v }))}
                    placeholder="2022"
                  />
                  <Field
                    label={t.plate}
                    value={vForm.plaqueMatricule}
                    onChangeText={v => setVForm(f => ({ ...f, plaqueMatricule: v }))}
                    placeholder="1234AB56"
                    required
                  />
                  <Field
                    label={t.seats}
                    value={vForm.nbrPlaces}
                    onChangeText={v => setVForm(f => ({ ...f, nbrPlaces: v }))}
                    keyboardType="numeric"
                    placeholder="50"
                    required
                  />
                  <Field
                    label={t.desc}
                    value={vForm.description}
                    onChangeText={v => setVForm(f => ({ ...f, description: v }))}
                    multiline
                  />
                </>
              )}

              {activeTab === 'drivers' && (
                <>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.firstName}
                        value={dForm.first_name}
                        onChangeText={v => setDForm(f => ({ ...f, first_name: v }))}
                        placeholder={t.firstName}
                        required
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.lastName}
                        value={dForm.last_name}
                        onChangeText={v => setDForm(f => ({ ...f, last_name: v }))}
                        placeholder={t.lastName}
                        required
                      />
                    </View>
                  </View>
                  <Field
                    label={t.email}
                    value={dForm.email}
                    onChangeText={v => setDForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    placeholder={t.email}
                    required
                  />
                  <Field
                    label={t.phone}
                    value={dForm.phone_number}
                    onChangeText={v => setDForm(f => ({ ...f, phone_number: v }))}
                    keyboardType="phone-pad"
                    placeholder={t.phone}
                    required
                  />
                  <Field
                    label={t.username}
                    value={dForm.username}
                    onChangeText={v => setDForm(f => ({ ...f, username: v }))}
                    placeholder={t.username}
                    required
                  />
                  <Field
                    label={t.permitNum}
                    value={dForm.permis}
                    onChangeText={v => setDForm(f => ({ ...f, permis: v }))}
                    placeholder={t.permitNum}
                  />
                  {!editItem && (
                    <Field
                      label={t.password}
                      value={dForm.password}
                      onChangeText={v => setDForm(f => ({ ...f, password: v }))}
                      placeholder={t.password}
                      required
                    />
                  )}
                </>
              )}

              {activeTab === 'employees' && (
                <>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.firstName}
                        value={eForm.firstName}
                        onChangeText={v => setEForm(f => ({ ...f, firstName: v }))}
                        placeholder={t.firstName}
                        required
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.lastName}
                        value={eForm.lastName}
                        onChangeText={v => setEForm(f => ({ ...f, lastName: v }))}
                        placeholder={t.lastName}
                        required
                      />
                    </View>
                  </View>
                  <Field
                    label={t.email}
                    value={eForm.email}
                    onChangeText={v => setEForm(f => ({ ...f, email: v }))}
                    keyboardType="email-address"
                    placeholder={t.email}
                    required
                  />
                  <Field
                    label={t.position}
                    value={eForm.poste}
                    onChangeText={v => setEForm(f => ({ ...f, poste: v }))}
                    placeholder={t.position}
                    required
                  />
                  <Field
                    label={t.dept}
                    value={eForm.departement}
                    onChangeText={v => setEForm(f => ({ ...f, departement: v }))}
                    placeholder={t.dept}
                  />
                  <Field
                    label={t.username}
                    value={eForm.username}
                    onChangeText={v => setEForm(f => ({ ...f, username: v }))}
                    placeholder={t.username}
                    required
                  />
                  {!editItem && (
                    <Field
                      label={t.password}
                      value={eForm.password}
                      onChangeText={v => setEForm(f => ({ ...f, password: v }))}
                      placeholder={t.password}
                      required
                    />
                  )}
                </>
              )}

              {activeTab === 'classes' && (
                <>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.className}
                        value={cForm.nom}
                        onChangeText={v => setCForm(f => ({ ...f, nom: v }))}
                        placeholder={t.className}
                        required
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.price}
                        value={cForm.prix}
                        onChangeText={v => setCForm(f => ({ ...f, prix: v }))}
                        keyboardType="numeric"
                        placeholder="Ex: 15000 *"
                        required
                      />
                    </View>
                  </View>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={t.cancelRateField}
                        value={cForm.tauxAnnulation}
                        onChangeText={v => setCForm(f => ({ ...f, tauxAnnulation: v }))}
                        keyboardType="numeric"
                        placeholder="Ex: 5"
                        required
                      />
                    </View>
                  </View>
                  <Field
                    label={t.desc}
                    value={cForm.description}
                    onChangeText={v => setCForm(f => ({ ...f, description: v }))}
                    placeholder="Description de la classe (optionnel)"
                    multiline
                  />
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setFormModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.text }]}>
                  {t.close}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
          <View style={[styles.menuSheet, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={styles.menuSheetItem}
              onPress={() => { openEdit(menuItem); setMenuItem(null); }}
            >
              <Ionicons name="create-outline" size={20} color={theme.textStrong} />
              <Text style={[styles.menuSheetText, { color: theme.textStrong }]}>
                {lang === 'fr' ? 'Modifier' : 'Edit'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.menuSheetDivider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.menuSheetItem}
              onPress={() => { openDelete(menuItem); setMenuItem(null); }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.menuSheetText, { color: colors.error }]}>
                {lang === 'fr' ? 'Supprimer' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={confirmModal}
        title={t.deleteTitle}
        message={t.deleteMessage}
        confirmText={t.confirmDelete}
        cancelText={t.cancel}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmModal(false);
          setDeleteItem(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // Overview
  overviewSection: { padding: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  overviewGrid: { flexDirection: 'row', gap: spacing.sm },
  overviewCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewValue: { ...typography.heading, fontSize: typography.sizes.lg },
  overviewLabel: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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

  // List
  listContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  vehicleImage: {
    width: 72,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vehicleImageInner: { width: '100%', height: '100%' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: { flex: 1 },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  listTitle: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  listSub: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  listMetaRow: { flexDirection: 'row', gap: spacing.md, marginTop: 3 },
  listMeta: { flexDirection: 'row', alignItems: 'center' },
  listMetaText: { ...typography.body, fontSize: typography.sizes.xs },
  classPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  dotMenuBtn: { padding: spacing.xs },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
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

  chipsScroll: { maxHeight: 52 },
  chipsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...typography.heading, fontSize: typography.sizes.lg },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
