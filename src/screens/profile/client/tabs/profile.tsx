import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonProfileScreen } from '../../../../components/skeleton';

type User = {
  userId: string;
  first_name: string;
  last_name: string;
  username: string;
  age: number;
  email: string;
  phone_number: string;
  role: string[];
};

export default function Profile({ setDrawerOpen }: { setDrawerOpen: (open: boolean) => void }) {
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

  const t = {
    fr: {
      title: 'Profil',
      myAccount: 'Mon compte',
      personalInfo: 'Informations personnelles',
      personalInfoDesc: 'Gérez vos informations de profil',
      coupons: 'Mes coupons',
      couponsDesc: 'Consultez vos coupons de remboursement',
      dashboard: 'Mon profil public',
      dashboardDesc: 'Voir votre profil public',
      settings: 'Paramètres',
      settingsDesc: 'Langue, code PIN...',
      support: 'Support',
      helpCenter: "Centre d'aide",
      helpCenterDesc: 'FAQ et assistance',
      terms: "Conditions d'utilisation",
      termsDesc: 'Lire nos conditions',
      logout: 'Déconnexion',
      client: 'CLIENT',
      agency: 'AGENCE',
      manager: 'MANAGER',
    },
    en: {
      title: 'Profile',
      myAccount: 'My account',
      personalInfo: 'Personal information',
      personalInfoDesc: 'Manage your profile information',
      coupons: 'My coupons',
      couponsDesc: 'View your refund coupons',
      dashboard: 'My public profile',
      dashboardDesc: 'View your public profile',
      settings: 'Settings',
      settingsDesc: 'Language, PIN code...',
      support: 'Support',
      helpCenter: 'Help center',
      helpCenterDesc: 'FAQ and assistance',
      terms: 'Terms of use',
      termsDesc: 'Read our terms',
      logout: 'Logout',
      client: 'CLIENT',
      agency: 'AGENCY',
      manager: 'MANAGER',
    },
  }[lang];

  const loadUser = useCallback(async () => {
    try {
      const [token, storedLang, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('user'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      // Try fetching fresh profile
      try {
        const res = await fetch(`${API_URL}/utilisateur/profil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          await AsyncStorage.setItem('user', JSON.stringify(data));
          return;
        }
      } catch {
        // fall through to cached
      }

      // Fallback to cached
      if (userRaw) setUser(JSON.parse(userRaw));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  }, [loadUser]);

  const getRoleLabel = (roles: string[]) => {
    if (roles.includes('BUS_STATION_MANAGER')) return t.manager;
    if (roles.includes('AGENCE_VOYAGE')) return t.agency;
    return t.client;
  };

  const MenuItem = ({
    icon,
    label,
    desc,
    onPress,
    danger = false,
  }: {
    icon: string;
    label: string;
    desc?: string;
    onPress: () => void;
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
      <Ionicons name="chevron-forward" size={18} color={theme.text} />
    </TouchableOpacity>
  );

  if (loading) { return <SkeletonProfileScreen />; }

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
            {/* Avatar */}
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <Text
                style={[styles.avatarInitials, { color: colors.primary }]}
              >
                {user
                  ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
                  : '?'}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textStrong }]}>
                {user ? `${user.first_name} ${user.last_name}` : '—'}
              </Text>
              <Text style={[styles.profileUsername, { color: theme.text }]}>
                {user?.username}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text }]}>
                {user?.email}
              </Text>
              <Text style={[styles.profilePhone, { color: theme.text }]}>
                {user?.phone_number}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {user ? getRoleLabel(user.role) : '—'}
                </Text>
              </View>
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
            icon="person-outline"
            label={t.personalInfo}
            desc={t.personalInfoDesc}
            onPress={() => navigation.navigate('ProfileSettings')}
          />
          <MenuItem
            icon="pricetag-outline"
            label={t.coupons}
            desc={t.couponsDesc}
            onPress={() => navigation.navigate('Coupons')}
          />
          <MenuItem
            icon="grid-outline"
            label={t.dashboard}
            desc={t.dashboardDesc}
            onPress={() => navigation.navigate('Dashboard')}
          />
          <MenuItem
            icon="settings-outline"
            label={t.settings}
            desc={t.settingsDesc}
            onPress={() => navigation.navigate('ProfileSettings')}
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
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label={t.terms}
            desc={t.termsDesc}
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
  avatarSmallImage: { width: '100%', height: '100%' },

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
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { ...typography.heading, fontSize: typography.sizes.xl },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...typography.heading, fontSize: typography.sizes.lg },
  profileUsername: { ...typography.body, fontSize: typography.sizes.sm },
  profileEmail: { ...typography.body, fontSize: typography.sizes.sm },
  profilePhone: { ...typography.body, fontSize: typography.sizes.sm },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  roleText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

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
