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
import { SUPPORT_URL, CGU_URL } from '../../../../utils/config';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonProfileScreen } from '../../../../components/skeleton';

type User = {
  userId: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: string[];
};

type Organization = {
  organization_id: string;
  long_name: string;
  short_name: string;
  logo_url?: string;
  email?: string;
  is_active: boolean;
};

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  AGENCE_VOYAGE: { color: '#1e3a8a', bg: '#dbeafe' },
  ORGANISATION: { color: '#065f46', bg: '#d1fae5' },
  BUS_STATION_MANAGER: { color: '#7c3aed', bg: '#f5f3ff' },
  USAGER: { color: '#d97706', bg: '#fef3c7' },
  ADMIN: { color: '#dc2626', bg: '#fee2e2' },
};

export default function OrgProfil() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  const t = {
    fr: {
      title: 'Profil',
      subtitle: 'Gérez votre compte et votre organisation',
      roles: 'Rôles',
      myProfile: 'Mon profil',
      myProfileDesc: 'Voir et modifier mes informations personnelles',
      myOrg: 'Mon organisation',
      myOrgDesc: "Voir et modifier les informations de l'organisation",
      preferences: 'Préférences',
      lang: 'Changer de langue',
      pinCode: 'Code PIN',
      pinActive: 'Code PIN activé',
      pinInactive: 'Code PIN non configuré',
      pinStatusActive: 'Actif',
      pinStatusInactive: 'Inactif',
      help: 'Aide & support',
      helpDesc: "Centre d'aide",
      about: 'À propos',
      aboutDesc: "Version de l'application",
      logout: 'Déconnexion',
      logoutDesc: "Se déconnecter de l'application",
      chef: "Chef d'agence",
    },
    en: {
      title: 'Profile',
      subtitle: 'Manage your account and organization',
      roles: 'Roles',
      myProfile: 'My profile',
      myProfileDesc: 'View and edit my personal information',
      myOrg: 'My organization',
      myOrgDesc: 'View and edit organization information',
      preferences: 'Preferences',
      lang: 'Change language',
      pinCode: 'PIN code',
      pinActive: 'PIN enabled',
      pinInactive: 'PIN not configured',
      pinStatusActive: 'Active',
      pinStatusInactive: 'Inactive',
      help: 'Help & support',
      helpDesc: 'Help center',
      about: 'About',
      aboutDesc: 'App version',
      logout: 'Logout',
      logoutDesc: 'Sign out of the application',
      chef: 'Agency manager',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [userRaw, orgRaw, storedLang, pinVal] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('organization'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('pin_enabled'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setPinEnabled(pinVal === 'true');
      if (userRaw) setUser(JSON.parse(userRaw));
      if (orgRaw) setOrg(JSON.parse(orgRaw));
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

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    '—';
  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || 'U';

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
      {rightEl ?? (
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      )}
    </TouchableOpacity>
  );

  if (loading) return <SkeletonProfileScreen />;

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
            styles.headerAvatarPlaceholder,
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
        {/* User card */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.userAvatar, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.userAvatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.textStrong }]}>
              {fullName}
            </Text>
            <View
              style={[
                styles.rolePill,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: `${colors.primary}20`,
                },
              ]}
            >
              <Text style={[styles.rolePillText, { color: colors.primary }]}>
                {t.chef}
              </Text>
            </View>
            {user?.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={13} color={theme.text} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  {' '}
                  {user.email}
                </Text>
              </View>
            )}
            {user?.phone_number && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={13} color={theme.text} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  {' '}
                  {user.phone_number}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Roles */}
        {user?.role && user.role.length > 0 && (
          <View
            style={[
              styles.rolesSection,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.rolesLabel, { color: theme.textStrong }]}>
              {t.roles}
            </Text>
            <View style={styles.rolesRow}>
              {user.role.map(r => {
                const cfg = ROLE_COLORS[r] || {
                  color: theme.text,
                  bg: theme.backgroundAlt,
                };
                return (
                  <View
                    key={r}
                    style={[styles.roleTag, { backgroundColor: cfg.bg }]}
                  >
                    <Text style={[styles.roleTagText, { color: cfg.color }]}>
                      {r}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Mon compte */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <MenuItem
            icon="business-outline"
            iconColor="#0891b2"
            iconBg="#cffafe15"
            label={t.myOrg}
            desc={t.myOrgDesc}
            onPress={() => navigation.navigate('OrgMyOrganization')}
          />
        </View>

        {/* Preferences */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <MenuItem
            icon="language-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}15`}
            label={t.lang}
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
            desc={pinEnabled ? t.pinActive : t.pinInactive}
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
                  {pinEnabled ? t.pinStatusActive : t.pinStatusInactive}
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
            onPress={() => {
              require('react-native').Linking.openURL(SUPPORT_URL);
            }}
          />
          <MenuItem
            icon="information-circle-outline"
            iconColor={theme.text}
            iconBg={theme.backgroundAlt}
            label={t.about}
            desc={t.aboutDesc}
            onPress={() => {
              require('react-native').Linking.openURL(CGU_URL);
            }}
          />
        </View>

        {/* Logout */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <MenuItem
            icon="log-out-outline"
            iconColor={colors.error}
            iconBg={`${colors.error}15`}
            label={t.logout}
            desc={t.logoutDesc}
            onPress={() => logout(navigation)}
            danger
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
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
  headerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    color: '#fff',
  },
  userInfo: { flex: 1, gap: 4 },
  userName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  rolePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rolePillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  contactText: { ...typography.body, fontSize: typography.sizes.xs },
  editIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  rolesSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rolesLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleTagText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  menuSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
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
    paddingVertical: 2,
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
});
