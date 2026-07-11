import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL, SUPPORT_URL, CGU_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonProfileScreen } from '../../../../components/skeleton';

type User = {
  userId: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone_number: string;
  role: string[];
};

type Station = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  adresse?: string;
  description?: string;
  horaires?: string;
  nomPresident?: string;
  services?: string[];
  nbreAgence: number | null;
};

export default function BsmProfil({
  setDrawerOpen,
  setLang: notifyParentLang,
}: {
  setDrawerOpen: (open: boolean) => void;
  setLang?: (lang: 'fr' | 'en') => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isOffline, setIsOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [user, setUser] = useState<User | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [lastLogin, setLastLogin] = useState('');

  const [taxesCollected, setTaxesCollected] = useState(0);
  const [agenciesCount, setAgenciesCount] = useState(0);

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
      district: 'Quartier',
      address: 'Adresse',
      schedule: 'Horaires',
      accountStatus: 'Statut du compte',
      active: 'Actif',
      permissions: 'Permissions',
      fullAccess: 'Accès complet',
      actions: 'Actions',
      credentials: 'Mes identifiants',
      credentialsDesc: 'Email, nom, mot de passe',
      changeLanguage: 'Changer de langue',
      pinCode: 'Code PIN',
      pinDesc: 'Modifier votre code PIN',
      help: 'Aide & support',
      helpDesc: "Centre d'aide et contact",
      about: 'À propos',
      aboutDesc: 'Version et informations légales',
      support: 'Support',
      cache: 'Gestion du cache',
      cacheDesc: 'Données hors ligne et stockage local',
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
      district: 'District',
      address: 'Address',
      schedule: 'Hours',
      accountStatus: 'Account status',
      active: 'Active',
      permissions: 'Permissions',
      fullAccess: 'Full access',
      actions: 'Actions',
      credentials: 'My credentials',
      credentialsDesc: 'Email, name, password',
      changeLanguage: 'Change language',
      pinCode: 'PIN code',
      pinDesc: 'Change your PIN code',
      help: 'Help & support',
      helpDesc: 'Help center and contact',
      about: 'About',
      aboutDesc: 'Version and legal information',
      support: 'Support',
      cache: 'Cache management',
      cacheDesc: 'Offline data and local storage',
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

      let managerId = '';
      try {
        const profileRes = await fetch(`${API_URL}/bsm/profil`, { headers });
        if (profileRes.ok) {
          const data = await profileRes.json();
          setUser(data);
          managerId = data.userId;
          await AsyncStorage.setItem('user', JSON.stringify(data));
          await setCache(`bsm_profile_${managerId}`, data);
          setIsOffline(false);
        } else {
          const cached = await getCache('bsm_profile_unknown');
          if (cached) {
            setUser(cached);
            managerId = cached.userId || '';
            setIsOffline(true);
          }
        }
      } catch {
        const cached = await getCache('bsm_profile_unknown');
        if (cached) {
          setUser(cached);
          managerId = cached.userId || '';
          setIsOffline(true);
        }
      }

      if (managerId) {
        // save profile with correct key now that we have managerId
        const existingUser = await getCache(`bsm_profile_${managerId}`);
        if (!existingUser) {
          const cached = await getCache('bsm_profile_unknown');
          if (cached) await setCache(`bsm_profile_${managerId}`, cached);
        }

        let gareId = '';
        try {
          const stationRes = await fetch(
            `${API_URL}/gare/manager/${managerId}`,
            { headers },
          );
          if (stationRes.ok) {
            const stationData = await stationRes.json();
            setStation(stationData);
            gareId = stationData.idGareRoutiere ?? '';
            await setCache(`bsm_station_${managerId}`, stationData);
            setIsOffline(false);
          } else {
            const cached = await getCache(`bsm_station_${managerId}`);
            if (cached) {
              setStation(cached);
              gareId = cached.idGareRoutiere ?? '';
              setIsOffline(true);
            }
          }
        } catch {
          const cached = await getCache(`bsm_station_${managerId}`);
          if (cached) {
            setStation(cached);
            gareId = cached.idGareRoutiere ?? '';
            setIsOffline(true);
          }
        }

        if (gareId) {
          try {
            const agenciesRes = await fetch(
              `${API_URL}/gare/${gareId}/agences`,
              { headers },
            );
            if (agenciesRes.ok) {
              const agData = await agenciesRes.json();
              const count = (agData.content || agData || []).length;
              setAgenciesCount(count);
              await setCache(`bsm_agencies_${gareId}`, agData);
              setIsOffline(false);
            } else {
              const cached = await getCache(`bsm_agencies_${gareId}`);
              if (cached) {
                setAgenciesCount((cached.content || cached || []).length);
                setIsOffline(true);
              }
            }
          } catch {
            const cached = await getCache(`bsm_agencies_${gareId}`);
            if (cached) {
              setAgenciesCount((cached.content || cached || []).length);
              setIsOffline(true);
            }
          }

          try {
            const taxesRes = await fetch(
              `${API_URL}/politique-et-taxes/gare-routiere/${gareId}`,
              { headers },
            );
            if (taxesRes.ok) {
              const taxData = await taxesRes.json();
              const total = Array.isArray(taxData)
                ? taxData
                    .filter((x: any) => x.type === 'TAXE')
                    .reduce((s: number, x: any) => s + (x.montantFixe || 0), 0)
                : 0;
              setTaxesCollected(total);
              await setCache(`bsm_taxes_${gareId}`, taxData);
              setIsOffline(false);
            } else {
              const cached = await getCache(`bsm_taxes_${gareId}`);
              if (cached) {
                const total = Array.isArray(cached)
                  ? cached
                      .filter((x: any) => x.type === 'TAXE')
                      .reduce(
                        (s: number, x: any) => s + (x.montantFixe || 0),
                        0,
                      )
                  : 0;
                setTaxesCollected(total);
                setIsOffline(true);
              }
            }
          } catch {
            const cached = await getCache(`bsm_taxes_${gareId}`);
            if (cached) {
              const total = Array.isArray(cached)
                ? cached
                    .filter((x: any) => x.type === 'TAXE')
                    .reduce((s: number, x: any) => s + (x.montantFixe || 0), 0)
                : 0;
              setTaxesCollected(total);
              setIsOffline(true);
            }
          }
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
    return <SkeletonProfileScreen subtitle />;
  }

  const fullName = user ? `${user.first_name} ${user.last_name}` : '—';
  const stationName = station?.nomGareRoutiere || '—';

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}
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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={() => setDrawerOpen(true)}>
          <View
            style={[
              styles.avatarSmall,
              { backgroundColor: theme.backgroundAlt },
            ]}
          >
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
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
              style={[styles.avatar, { backgroundColor: theme.backgroundAlt }]}
            >
              <AvatarPlaceholder width="100%" height="100%" />
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
                {station?.nbreAgence ?? agenciesCount}
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
                —
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
                —
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
            { label: t.district, value: station?.quartier || '—' },
            { label: t.address, value: station?.adresse || '—' },
            { label: t.schedule, value: station?.horaires || '—' },
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
            icon="key-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.credentials}
            desc={t.credentialsDesc}
            onPress={() => navigation.navigate('EditCredentials')}
          />
          <MenuItem
            icon="language-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
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
        </View>

        {/* Support */}
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
            {t.support}
          </Text>
          <MenuItem
            icon="help-circle-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.help}
            desc={t.helpDesc}
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
          <MenuItem
            icon="server-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.cache}
            desc={t.cacheDesc}
            onPress={() => navigation.navigate('CacheSettings')}
          />
          <MenuItem
            icon="information-circle-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.about}
            desc={t.aboutDesc}
            onPress={() => Linking.openURL(CGU_URL)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  profileCard: {
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
