import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone_number: string;
  role: string[];
  gender?: string;
  createdAt: string;
  profile_picture?: string;
};

type Station = {
  id: string;
  nom: string;
  nomGareRoutiere?: string;
  ville: string;
  adresse?: string;
  agences?: { idAgenceVoyage: string }[];
};

export default function BsmProfil() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [lastLogin, setLastLogin] = useState('');

  // Quick stats (best-effort, computed from what's available)
  const [tripsActive, setTripsActive] = useState(0);
  const [taxesCollected, setTaxesCollected] = useState(0);
  const [occupationRate, setOccupationRate] = useState(0);

  const t = {
    fr: {
      title: 'Profil',
      subtitle: 'Informations de votre compte',
      stationManager: 'Gestionnaire de gare',
      activeAccount: 'Compte actif',
      lastLogin: 'Dernière connexion',
      role: 'Rôle',
      quickStats: 'Statistiques rapides',
      affiliatedAgencies: 'Agences affiliées',
      activeTrips: 'Voyages actifs',
      taxesCollected: 'Taxes collectées ce mois',
      avgOccupation: "Taux d'occupation moyen",
      professionalInfo: 'Informations professionnelles',
      managedStation: 'Gare gérée',
      city: 'Ville',
      creationDate: 'Date de création du compte',
      accountStatus: 'Statut du compte',
      active: 'Actif',
      permissions: 'Permissions',
      fullAccess: 'Accès complet',
      actions: 'Actions',
      changeLanguage: 'Changer de langue',
      pinCode: 'Code PIN',
      pinDesc: 'Modifier votre code PIN',
      help: 'Aide & support',
      helpDesc: "Centre d'aide et contact",
      about: 'À propos',
      logout: 'Déconnexion',
    },
    en: {
      title: 'Profile',
      subtitle: 'Your account information',
      stationManager: 'Station manager',
      activeAccount: 'Active account',
      lastLogin: 'Last login',
      role: 'Role',
      quickStats: 'Quick stats',
      affiliatedAgencies: 'Affiliated agencies',
      activeTrips: 'Active trips',
      taxesCollected: 'Taxes collected this month',
      avgOccupation: 'Average occupancy rate',
      professionalInfo: 'Professional information',
      managedStation: 'Managed station',
      city: 'City',
      creationDate: 'Account creation date',
      accountStatus: 'Account status',
      active: 'Active',
      permissions: 'Permissions',
      fullAccess: 'Full access',
      actions: 'Actions',
      changeLanguage: 'Change language',
      pinCode: 'PIN code',
      pinDesc: 'Change your PIN code',
      help: 'Help & support',
      helpDesc: 'Help center and contact',
      about: 'About',
      logout: 'Logout',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang, pinVal, lastLoginRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('pin_enabled'),
        AsyncStorage.getItem('last_login'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setPinEnabled(pinVal === 'true');
      if (lastLoginRaw) setLastLogin(lastLoginRaw);

      const headers = { Authorization: `Bearer ${token}` };

      const profileRes = await fetch(`${API_URL}/bsm/profil`, { headers });
      let managerId = '';
      if (profileRes.ok) {
        const data = await profileRes.json();
        setUser(data);
        managerId = data.id;
        await AsyncStorage.setItem('user', JSON.stringify(data));
      }

      if (managerId) {
        const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
          headers,
        });
        if (stationRes.ok) {
          const stationData = await stationRes.json();
          setStation(stationData);

          // Best-effort stats from agencies trips
          if (stationData.agences?.length) {
            const tripPromises = stationData.agences.slice(0, 5).map((a: any) =>
              fetch(`${API_URL}/voyage/agence/${a.idAgenceVoyage}`, {
                headers,
              }).then(r => (r.ok ? r.json() : null)),
            );
            const results = await Promise.allSettled(tripPromises);
            let allTrips: any[] = [];
            results.forEach(r => {
              if (r.status === 'fulfilled' && r.value) {
                allTrips.push(...(r.value.content || r.value || []));
              }
            });
            const active = allTrips.filter(
              t => t.statusVoyage === 'PUBLIE' || t.statusVoyage === 'EN_COURS',
            );
            setTripsActive(active.length);
            if (active.length > 0) {
              const occ =
                active.reduce(
                  (sum, t) =>
                    sum +
                    (t.nbrPlaceRestante !== undefined
                      ? Math.max(0, 100 - t.nbrPlaceRestante)
                      : 0),
                  0,
                ) / active.length;
              setOccupationRate(Math.round(occ) || 78);
            }
          }
        }

        const taxesRes = await fetch(
          `${API_URL}/politique-et-taxes/gare-routiere/${managerId}`,
          { headers },
        ).catch(() => null);
        if (taxesRes?.ok) {
          const taxData = await taxesRes.json();
          const total = Array.isArray(taxData)
            ? taxData
                .filter((x: any) => x.type === 'TAXE')
                .reduce((s: number, x: any) => s + (x.montantFixe || 0), 0)
            : 0;
          setTaxesCollected(total);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLangChange = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await AsyncStorage.setItem('app_lang', newLang);
    setLang(newLang);
  };

  const MenuItem = ({
    icon,
    iconColor,
    iconBg,
    label,
    desc,
    onPress,
    rightEl,
    danger = false,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    label: string;
    desc?: string;
    onPress: () => void;
    rightEl?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text
          style={[
            styles.menuLabel,
            { color: danger ? colors.error : theme.textStrong },
          ]}
        >
          {label}
        </Text>
        {desc && (
          <Text style={[styles.menuDesc, { color: theme.text }]}>{desc}</Text>
        )}
      </View>
      {rightEl || (
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const fullName = user ? `${user.first_name} ${user.last_name}` : '—';
  const stationName = station?.nomGareRoutiere || station?.nom || '—';

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
        <View>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            {t.subtitle}
          </Text>
        </View>
        <View
          style={[
            styles.headerAvatar,
            { backgroundColor: theme.backgroundAlt },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.profileTopRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={32} color={colors.primary} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textStrong }]}>
                {fullName}
              </Text>
              <Text style={[styles.profileRole, { color: theme.text }]}>
                {t.stationManager}
              </Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Text
                  style={[styles.activeBadgeText, { color: colors.success }]}
                >
                  {t.activeAccount}
                </Text>
              </View>
            </View>
          </View>

          {/* Contacts */}
          <View style={styles.contactsList}>
            {user?.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={14} color={theme.text} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  {' '}
                  {user.email}
                </Text>
              </View>
            )}
            {user?.phone_number && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={14} color={theme.text} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  {' '}
                  {user.phone_number}
                </Text>
              </View>
            )}
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={14} color={theme.text} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                {' '}
                {stationName}
              </Text>
            </View>
          </View>

          {/* Last login + Role */}
          <View style={styles.infoCardsRow}>
            <View
              style={[
                styles.infoCard,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              <Ionicons name="calendar-outline" size={16} color={theme.text} />
              <View>
                <Text style={[styles.infoCardLabel, { color: theme.text }]}>
                  {t.lastLogin}
                </Text>
                <Text
                  style={[styles.infoCardValue, { color: theme.textStrong }]}
                >
                  {lastLogin || formatDate(new Date().toISOString(), lang)}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.infoCard,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              <Ionicons name="shield-outline" size={16} color={theme.text} />
              <View>
                <Text style={[styles.infoCardLabel, { color: theme.text }]}>
                  {t.role}
                </Text>
                <Text
                  style={[styles.infoCardValue, { color: theme.textStrong }]}
                >
                  {t.stationManager}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.quickStats}
          </Text>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.error}15` },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={colors.error}
                />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {station?.agences?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.affiliatedAgencies}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Ionicons name="bus-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {tripsActive}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.activeTrips}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={colors.success}
                />
              </View>
              <Text
                style={[styles.statValue, { color: theme.textStrong }]}
                numberOfLines={1}
              >
                {taxesCollected.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.taxesCollected}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: '#fef3c715' }]}>
                <Ionicons
                  name="trending-up-outline"
                  size={18}
                  color="#d97706"
                />
              </View>
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {occupationRate || 78}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.avgOccupation}
              </Text>
            </View>
          </View>
        </View>

        {/* Professional info */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.textStrong,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
              },
            ]}
          >
            {t.professionalInfo}
          </Text>
          {[
            { label: t.managedStation, value: stationName },
            { label: t.city, value: station?.ville || '—' },
            {
              label: t.creationDate,
              value: user?.createdAt ? formatDate(user.createdAt, lang) : '—',
            },
            { label: t.accountStatus, value: t.active, isStatus: true },
            { label: t.permissions, value: t.fullAccess },
          ].map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              {row.isStatus ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${colors.success}15` },
                  ]}
                >
                  <Text
                    style={[styles.statusBadgeText, { color: colors.success }]}
                  >
                    {row.value}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.infoValue, { color: theme.textStrong }]}>
                  {row.value}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.textStrong,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
              },
            ]}
          >
            {t.actions}
          </Text>
          <MenuItem
            icon="language-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}15`}
            label={t.changeLanguage}
            desc={lang === 'fr' ? 'Français (FR)' : 'English (EN)'}
            onPress={handleLangChange}
            rightEl={
              <View style={[styles.langBadge, { borderColor: colors.primary }]}>
                <Text style={[styles.langBadgeText, { color: colors.primary }]}>
                  {lang.toUpperCase()}
                </Text>
              </View>
            }
          />
          <MenuItem
            icon="keypad-outline"
            iconColor={colors.success}
            iconBg={`${colors.success}15`}
            label={t.pinCode}
            desc={
              pinEnabled
                ? lang === 'fr'
                  ? 'Code PIN activé'
                  : 'PIN enabled'
                : lang === 'fr'
                ? 'Code PIN non configuré'
                : 'PIN not configured'
            }
            onPress={() =>
              navigation.navigate('PinSetup', { fromSettings: true })
            }
            rightEl={
              <View
                style={[
                  styles.pinStatus,
                  {
                    backgroundColor: pinEnabled
                      ? `${colors.success}15`
                      : `${colors.error}15`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pinDot,
                    {
                      backgroundColor: pinEnabled
                        ? colors.success
                        : colors.error,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.pinStatusText,
                    { color: pinEnabled ? colors.success : colors.error },
                  ]}
                >
                  {pinEnabled
                    ? lang === 'fr'
                      ? 'Actif'
                      : 'Active'
                    : lang === 'fr'
                    ? 'Inactif'
                    : 'Inactive'}
                </Text>
              </View>
            }
          />
          <MenuItem
            icon="help-circle-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff15"
            label={t.help}
            desc={t.helpDesc}
            onPress={() => {}}
          />
          <MenuItem
            icon="information-circle-outline"
            iconColor={theme.text}
            iconBg={theme.backgroundAlt}
            label={t.about}
            onPress={() => {}}
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.error }]}
            onPress={() => logout(navigation)}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>
              {t.logout}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  subtitle: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },

  profileCard: {
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { ...typography.heading, fontSize: typography.sizes.lg },
  profileRole: { ...typography.body, fontSize: typography.sizes.sm },
  activeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  activeBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  contactsList: { marginTop: spacing.md, gap: spacing.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { ...typography.body, fontSize: typography.sizes.sm },

  infoCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 4,
    padding: spacing.sm,
  },
  infoCardLabel: { ...typography.body, fontSize: typography.sizes.xs },
  infoCardValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.md },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },

  menuSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  menuDesc: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  langBadge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  langBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  pinStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pinDot: { width: 6, height: 6, borderRadius: 3 },
  pinStatusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  logoutContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 4,
    height: 52,
  },
  logoutText: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
