import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Modal,
  TextInput,
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
import { useToast } from '../../../../components/toast';
import { EmptyState } from '../../../../components/empty-state';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';

type Employee = {
  employeId: string;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  poste?: string;
  departement?: string;
  statutEmploye?: string;
  nomManager?: string;
};

type FormData = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  phone_number: string;
  gender: 'MALE' | 'FEMALE';
  poste: string;
  departement: string;
};

const EMPTY_FORM: FormData = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  phone_number: '',
  gender: 'MALE',
  poste: '',
  departement: '',
};

export default function OrgEmployees() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgEmployees'>>();
  const { agencyId, agencyName } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const toast = useToast();

  const t = {
    fr: {
      title: 'Employés',
      subtitle: agencyName || "Agence",
      add: 'Ajouter un employé',
      noEmployees: 'Aucun employé pour cette agence',
      name: 'Nom complet',
      username: "Nom d'utilisateur",
      email: 'Email',
      password: 'Mot de passe',
      phone: 'Téléphone',
      gender: 'Genre',
      male: 'Homme',
      female: 'Femme',
      poste: 'Poste',
      departement: 'Département',
      firstName: 'Prénom',
      lastName: 'Nom',
      cancel: 'Annuler',
      create: 'Créer',
      creating: 'Création...',
      required: 'Champs obligatoires manquants',
      fillRequired: "Veuillez remplir l'email, le nom d'utilisateur et le mot de passe.",
      success: 'Employé créé avec succès',
      error: "Erreur lors de la création de l'employé",
      active: 'ACTIF',
      inactive: 'INACTIF',
    },
    en: {
      title: 'Employees',
      subtitle: agencyName || 'Agency',
      add: 'Add employee',
      noEmployees: 'No employees for this agency',
      name: 'Full name',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      phone: 'Phone',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      poste: 'Position',
      departement: 'Department',
      firstName: 'First name',
      lastName: 'Last name',
      cancel: 'Cancel',
      create: 'Create',
      creating: 'Creating...',
      required: 'Missing required fields',
      fillRequired: 'Please fill in email, username and password.',
      success: 'Employee created successfully',
      error: 'Error creating employee',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
    },
  }[lang];

  const loadEmployees = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/employe/agence/${agencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.content || data || []);
        setCache(`org_employees_${agencyId}`, data.content || data || []);
        setIsOffline(false);
      } else {
        const cached = await getCache(`org_employees_${agencyId}`);
        if (cached) {
          setEmployees(cached);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache(`org_employees_${agencyId}`);
      if (cached) {
        setEmployees(cached);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  }, [loadEmployees]);

  const handleCreate = async () => {
    if (!form.email.trim() || !form.username.trim() || !form.password.trim()) {
      toast.warning(t.fillRequired);
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim() || undefined,
        role: ['EMPLOYE'],
        gender: form.gender,
        agenceVoyageId: agencyId,
        poste: form.poste.trim() || undefined,
        departement: form.departement.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/utilisateur/employe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalVisible(false);
        setForm(EMPTY_FORM);
        toast.success(t.success);
        loadEmployees();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s?: string) =>
    s === 'ACTIF' ? colors.success : s === 'SUSPENDU' ? colors.error : theme.text;

  if (loading) return <SkeletonListScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity style={styles.headerSide} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={styles.headerSide} />
      </View>
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
        {employees.length === 0 ? (
          <EmptyState
            type="result"
            message={t.noEmployees}
            textColor={theme.text}
          />
        ) : (
          employees.map(emp => (
            <View
              key={emp.employeId}
              style={[
                styles.card,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <AvatarPlaceholder width="70%" height="70%" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.textStrong }]}>
                  {[emp.firstName, emp.lastName].filter(Boolean).join(' ') ||
                    emp.username}
                </Text>
                <Text style={[styles.cardEmail, { color: theme.text }]}>
                  {emp.email}
                </Text>
                {emp.poste && (
                  <Text style={[styles.cardPoste, { color: theme.text }]}>
                    {emp.poste}
                    {emp.departement ? ` · ${emp.departement}` : ''}
                  </Text>
                )}
              </View>
              {emp.statutEmploye && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: `${statusColor(emp.statutEmploye)}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: statusColor(emp.statutEmploye) },
                    ]}
                  >
                    {emp.statutEmploye}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.background },
            ]}
          >
            {/* Modal header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setForm(EMPTY_FORM);
                }}
              >
                <Text style={[styles.modalCancel, { color: theme.text }]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.textStrong }]}>
                {t.add}
              </Text>
              <TouchableOpacity onPress={handleCreate} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.modalSubmit, { color: colors.primary }]}>
                    {t.create}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              {/* Row: first + last name */}
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t.firstName}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.textStrong,
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundAlt,
                      },
                    ]}
                    value={form.first_name}
                    onChangeText={v => setForm(f => ({ ...f, first_name: v }))}
                    placeholderTextColor={theme.placeholder}
                    placeholder={t.firstName}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {t.lastName}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.textStrong,
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundAlt,
                      },
                    ]}
                    value={form.last_name}
                    onChangeText={v => setForm(f => ({ ...f, last_name: v }))}
                    placeholderTextColor={theme.placeholder}
                    placeholder={t.lastName}
                  />
                </View>
              </View>

              {/* Username */}
              <Text style={[styles.label, { color: theme.text }]}>
                {t.username} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textStrong,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                value={form.username}
                onChangeText={v => setForm(f => ({ ...f, username: v }))}
                placeholderTextColor={theme.placeholder}
                placeholder={t.username}
                autoCapitalize="none"
              />

              {/* Email */}
              <Text style={[styles.label, { color: theme.text }]}>
                {t.email} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textStrong,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholderTextColor={theme.placeholder}
                placeholder={t.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Password */}
              <Text style={[styles.label, { color: theme.text }]}>
                {t.password} *
              </Text>
              <View
                style={[
                  styles.passwordRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: theme.textStrong }]}
                  value={form.password}
                  onChangeText={v => setForm(f => ({ ...f, password: v }))}
                  placeholderTextColor={theme.placeholder}
                  placeholder={t.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>

              {/* Phone */}
              <Text style={[styles.label, { color: theme.text }]}>{t.phone}</Text>
              <View style={[styles.phoneRow, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
                <Text style={styles.phoneFlag}>🇨🇲</Text>
                <Text style={[styles.phoneCode, { color: theme.textStrong, borderRightColor: theme.border }]}>+237</Text>
                <TextInput
                  style={[styles.phoneInput, { color: theme.textStrong }]}
                  value={form.phone_number}
                  onChangeText={v => setForm(f => ({ ...f, phone_number: v }))}
                  placeholderTextColor={theme.placeholder}
                  placeholder={t.phone}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Gender */}
              <Text style={[styles.label, { color: theme.text }]}>{t.gender}</Text>
              <View style={styles.genderRow}>
                {(['MALE', 'FEMALE'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setForm(f => ({ ...f, gender: g }))}
                    style={[
                      styles.genderBtn,
                      {
                        borderColor:
                          form.gender === g ? colors.primary : theme.border,
                        backgroundColor:
                          form.gender === g
                            ? `${colors.primary}10`
                            : theme.backgroundAlt,
                      },
                    ]}
                  >
                    <Ionicons
                      name={g === 'MALE' ? 'male-outline' : 'female-outline'}
                      size={16}
                      color={form.gender === g ? colors.primary : theme.text}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        {
                          color:
                            form.gender === g ? colors.primary : theme.text,
                        },
                      ]}
                    >
                      {g === 'MALE' ? t.male : t.female}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Poste */}
              <Text style={[styles.label, { color: theme.text }]}>{t.poste}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textStrong,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                value={form.poste}
                onChangeText={v => setForm(f => ({ ...f, poste: v }))}
                placeholderTextColor={theme.placeholder}
                placeholder="Caissier, Agent..."
              />

              {/* Département */}
              <Text style={[styles.label, { color: theme.text }]}>
                {t.departement}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.textStrong,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundAlt,
                  },
                ]}
                value={form.departement}
                onChangeText={v => setForm(f => ({ ...f, departement: v }))}
                placeholderTextColor={theme.placeholder}
                placeholder="Commercial, Opérations..."
              />

              <View style={{ height: spacing.xl }} />
            </ScrollView>
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
  headerSide: { width: 40, justifyContent: 'center' },
  headerTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.lg,
    flex: 1,
    textAlign: 'center',
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  cardInfo: { flex: 1 },
  cardName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  cardEmail: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  cardPoste: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { ...typography.bodyBold, fontSize: 10 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  modalCancel: { ...typography.body, fontSize: typography.sizes.sm },
  modalSubmit: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  modalBody: { padding: spacing.lg, gap: spacing.xs },
  label: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: typography.sizes.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  phoneFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  phoneCode: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
  },
  phoneInput: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    ...typography.body,
    fontSize: typography.sizes.sm,
    padding: 0,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
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
});
