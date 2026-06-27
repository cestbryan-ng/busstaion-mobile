import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL, SUPPORT_URL, CGU_URL } from '../../../../utils/config';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonProfileScreen } from '../../../../components/skeleton';

type Agency = {
  agencyId: string;
  longName: string;
  location?: string;
  photoUrl?: string;
};

export default function AgencyProfil() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
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
      agencyInfo: 'Informations agence',
      agencyInfoDesc: 'Voir et modifier les informations',
      subscription: 'Abonnement',
      subscriptionDesc: 'Gérer mon abonnement',
      security: 'Sécurité',
      securityDesc: 'Code PIN',
      changeLanguage: 'Changer de langue',
      currentLang: 'Français (FR)',
      help: 'Aide & support',
      helpDesc: "Centre d'aide et contact",
      about: 'À propos',
      aboutDesc: "Version de l'application",
      logout: 'Déconnexion',
    },
    en: {
      title: 'Profile',
      agencyType: 'Travel agency',
      myAccount: 'My account',
      agencyInfo: 'Agency information',
      agencyInfoDesc: 'View and edit information',
      subscription: 'Subscription',
      subscriptionDesc: 'Manage my subscription',
      security: 'Security',
      securityDesc: 'PIN code',
      changeLanguage: 'Change language',
      currentLang: 'English (EN)',
      help: 'Help & support',
      helpDesc: 'Help center and contact',
      about: 'About',
      aboutDesc: 'App version',
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
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const res = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAgency(await res.json());
    } catch {
      // silent
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
      {rightEl ?? (
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      )}
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
        <View
          style={[
            styles.headerAvatar,
            { backgroundColor: theme.backgroundAlt },
          ]}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
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
            {agency?.photoUrl ? (
              <Image
                source={{ uri: agency.photoUrl }}
                style={styles.agencyLogoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.agencyLogoText, { color: colors.primary }]}>
                {agency?.longName.slice(0, 2).toUpperCase() || 'VP'}
              </Text>
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
            icon="business-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}15`}
            label={t.agencyInfo}
            desc={t.agencyInfoDesc}
            onPress={() => navigation.navigate('AgencyInfo')}
          />
          <MenuItem
            icon="ribbon-outline"
            iconColor="#d97706"
            iconBg="#fef3c715"
            label={t.subscription}
            desc={t.subscriptionDesc}
            onPress={() => navigation.navigate('AgencySubscription')}
          />
        </View>

        {/* Other */}
        <View
          style={[
            styles.menuSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <MenuItem
            icon="keypad-outline"
            iconColor={colors.success}
            iconBg={`${colors.success}15`}
            label={t.security}
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
            icon="language-outline"
            iconColor={colors.success}
            iconBg={`${colors.success}15`}
            label={t.changeLanguage}
            desc={t.currentLang}
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
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },

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
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.lg },
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
  langBadge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  langBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
});
