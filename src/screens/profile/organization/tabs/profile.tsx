import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { SUPPORT_URL, CGU_URL } from '../../../../utils/config';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonProfileScreen } from '../../../../components/skeleton';
import AvatarPlaceholder from '../../../../assets/placeholders/avatar-2.svg';

type User = {
  userId: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: string[];
};

export default function OrgProfil({
  setLang: notifyParentLang,
  setDrawerOpen,
}: {
  setLang?: (lang: 'fr' | 'en') => void;
  setDrawerOpen?: (open: boolean) => void;
} = {}) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  const t = {
    fr: {
      title: 'Profil',
      myAccount: 'Mon compte',
      credentials: 'Mes identifiants',
      credentialsDesc: 'Email, nom, mot de passe',
      myOrg: 'Mon organisation',
      myOrgDesc: "Voir et modifier les informations de l'organisation",
      personalInfo: 'Informations personnelles',
      personalInfoDesc: 'Gérez vos informations de profil',
      preferences: 'Préférences',
      lang: 'Changer de langue',
      pinCode: 'Code PIN',
      pinActive: 'Code PIN activé',
      pinInactive: 'Code PIN non configuré',
      pinStatusActive: 'Actif',
      pinStatusInactive: 'Inactif',
      support: 'Support',
      helpCenter: "Centre d'aide",
      helpCenterDesc: 'FAQ et assistance',
      terms: "Conditions d'utilisation",
      termsDesc: 'Lire nos conditions',
      cache: 'Gestion du cache',
      cacheDesc: 'Données hors ligne et stockage local',
      logout: 'Déconnexion',
    },
    en: {
      title: 'Profile',
      myAccount: 'My account',
      credentials: 'My credentials',
      credentialsDesc: 'Email, name, password',
      myOrg: 'My organization',
      myOrgDesc: 'View and edit organization information',
      personalInfo: 'Personal information',
      personalInfoDesc: 'Manage your profile information',
      preferences: 'Preferences',
      lang: 'Change language',
      pinCode: 'PIN code',
      pinActive: 'PIN enabled',
      pinInactive: 'PIN not configured',
      pinStatusActive: 'Active',
      pinStatusInactive: 'Inactive',
      support: 'Support',
      helpCenter: 'Help center',
      helpCenterDesc: 'FAQ and assistance',
      terms: 'Terms of use',
      termsDesc: 'Read our terms',
      cache: 'Cache management',
      cacheDesc: 'Offline data and local storage',
      logout: 'Logout',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [userRaw, storedLang, pinVal] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('pin_enabled'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setPinEnabled(pinVal === 'true');
      if (userRaw) setUser(JSON.parse(userRaw));
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
    notifyParentLang?.(newLang);
  };

  const MenuItem = ({
    icon,
    label,
    desc,
    onPress,
    rightEl,
    danger = false,
  }: {
    icon: string;
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
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: danger
              ? `${colors.error}10`
              : `${colors.primary}10`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={() => setDrawerOpen?.(true)}>
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
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.backgroundAlt },
              ]}
            >
              <AvatarPlaceholder width="100%" height="100%" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textStrong }]}>
                {user
                  ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
                  : '—'}
              </Text>
              <Text style={[styles.profileUsername, { color: theme.text }]}>
                {user?.username}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text }]}>
                {user?.email}
              </Text>
              {user?.phone_number && (
                <Text style={[styles.profilePhone, { color: theme.text }]}>
                  {user.phone_number}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Mon compte */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.myAccount}
          </Text>
          <MenuItem
            icon="key-outline"
            label={t.credentials}
            desc={t.credentialsDesc}
            onPress={() => navigation.navigate('OrgEditCredentials')}
          />
          <MenuItem
            icon="person-outline"
            label={t.personalInfo}
            desc={t.personalInfoDesc}
            onPress={() => navigation.navigate('ProfileSettings')}
          />
          <MenuItem
            icon="business-outline"
            label={t.myOrg}
            desc={t.myOrgDesc}
            onPress={() => navigation.navigate('OrgMyOrganization')}
          />
        </View>

        {/* Préférences */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.preferences}
          </Text>
          <MenuItem
            icon="language-outline"
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
        </View>

        {/* Support */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.support}
          </Text>
          <MenuItem
            icon="help-circle-outline"
            label={t.helpCenter}
            desc={t.helpCenterDesc}
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
          <MenuItem
            icon="document-text-outline"
            label={t.terms}
            desc={t.termsDesc}
            onPress={() => Linking.openURL(CGU_URL)}
          />
          <MenuItem
            icon="server-outline"
            label={t.cache}
            desc={t.cacheDesc}
            onPress={() => navigation.navigate('CacheSettings')}
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
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  profileRow: {
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
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...typography.heading, fontSize: typography.sizes.lg },
  profileUsername: { ...typography.body, fontSize: typography.sizes.sm },
  profileEmail: { ...typography.body, fontSize: typography.sizes.sm },
  profilePhone: { ...typography.body, fontSize: typography.sizes.sm },

  menuSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
