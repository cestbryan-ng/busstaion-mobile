import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';

type Agency = {
  id: string;
  longName: string;
  shortName?: string;
  location?: string;
  logoUrl?: string;
  isActive: boolean;
};

export default function AgencyProfil({
  setLang: notifyParentLang,
  setDrawerOpen,
}: {
  setLang?: (lang: 'fr' | 'en') => void;
  setDrawerOpen?: (open: boolean) => void;
} = {}) {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [isOffline, setIsOffline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Profil',
      agencyType: 'Agence de voyage',
      myAccount: 'Mon compte',
      credentials: 'Mes identifiants',
      credentialsDesc: 'Email, nom, mot de passe',
      agencyInfo: 'Informations agence',
      agencyInfoDesc: 'Voir et modifier les informations',
      subscription: 'Abonnement',
      subscriptionDesc: 'Gérer mon abonnement',
      preferences: 'Préférences',
      security: 'Code PIN',
      pinActive: 'Code PIN activé',
      pinInactive: 'Code PIN non configuré',
      pinStatusActive: 'Actif',
      pinStatusInactive: 'Inactif',
      changeLanguage: 'Changer de langue',
      support: 'Support',
      help: "Centre d'aide",
      helpDesc: 'FAQ et assistance',
      terms: "Conditions d'utilisation",
      termsDesc: 'Lire nos conditions',
      cache: 'Gestion du cache',
      cacheDesc: 'Données hors ligne et stockage local',
      logout: 'Déconnexion',
    },
    en: {
      title: 'Profile',
      agencyType: 'Travel agency',
      myAccount: 'My account',
      credentials: 'My credentials',
      credentialsDesc: 'Email, name, password',
      agencyInfo: 'Agency information',
      agencyInfoDesc: 'View and edit information',
      subscription: 'Subscription',
      subscriptionDesc: 'Manage my subscription',
      preferences: 'Preferences',
      security: 'PIN code',
      pinActive: 'PIN enabled',
      pinInactive: 'PIN not configured',
      pinStatusActive: 'Active',
      pinStatusInactive: 'Inactive',
      changeLanguage: 'Change language',
      support: 'Support',
      help: 'Help center',
      helpDesc: 'FAQ and assistance',
      terms: 'Terms of use',
      termsDesc: 'Read our terms',
      cache: 'Cache management',
      cacheDesc: 'Offline data and local storage',
      logout: 'Logout',
    },
  }[lang];

  const loadAgency = useCallback(async () => {
    try {
      const [token, userRaw, storedLang, pinVal] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('pin_enabled'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setPinEnabled(pinVal === 'true');

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const { API_URL } = require('../../../../utils/config');
      const res = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgency(data);
        setCache(`agency_profile_${chefId}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache<Agency>(`agency_profile_${chefId}`);
        if (cached) {
          setAgency(cached);
          setIsOffline(true);
        }
      }
    } catch {
      try {
        const userRaw = await AsyncStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const chefId = user?.userId || user?.id;
        if (chefId) {
          const cached = await getCache<Agency>(`agency_profile_${chefId}`);
          if (cached) {
            setAgency(cached);
            setIsOffline(true);
          }
        }
      } catch {
        // silent
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgency();
    setRefreshing(false);
  }, [loadAgency]);

  useEffect(() => {
    loadAgency();
  }, [loadAgency]);

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
      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

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
        {/* Agency card */}
        <TouchableOpacity
          style={[
            styles.agencyCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
          onPress={() => navigation.navigate('AgencyInfo')}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.agencyLogo,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            {agency?.logoUrl && agency.logoUrl.startsWith('http') ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={styles.agencyLogoImage}
                resizeMode="contain"
              />
            ) : (
              <AgencyPlaceholder width="60%" height="60%" />
            )}
          </View>
          <View style={styles.agencyInfo}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {agency?.longName || '—'}
            </Text>
            <Text style={[styles.agencyType, { color: theme.text }]}>
              {t.agencyType}
            </Text>
            <View style={styles.agencyLocationRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.agencyLocation, { color: theme.text }]}>
                {' '}
                {agency?.location || '—'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.text} />
        </TouchableOpacity>

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
            onPress={() => navigation.navigate('EditCredentials')}
          />
          <MenuItem
            icon="business-outline"
            label={t.agencyInfo}
            desc={t.agencyInfoDesc}
            onPress={() => navigation.navigate('AgencyInfo')}
          />
          <MenuItem
            icon="ribbon-outline"
            label={t.subscription}
            desc={t.subscriptionDesc}
            onPress={() => navigation.navigate('AgencySubscription')}
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
            label={t.security}
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
            label={t.help}
            desc={t.helpDesc}
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

  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  agencyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  agencyType: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 1,
  },
  agencyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  agencyLocation: { ...typography.body, fontSize: typography.sizes.xs },

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
