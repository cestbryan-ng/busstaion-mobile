import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { logout } from '../../../../utils/logout';
import type { RootStackParamList } from '../../../../navigation';
import { CGU_URL } from '../../../../utils/config';

type User = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  age: number;
  role: string[];
};

export default function ProfileSettings() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const t = {
    fr: {
      title: 'Paramètres',
      preferences: 'Préférences',
      changeLanguage: 'Changer de langue',
      currentLang: 'Français (FR)',
      pinCode: 'Code PIN',
      pinDesc: 'Modifier votre code PIN',
      account: 'Compte',
      personalInfo: 'Informations personnelles',
      personalInfoDesc: 'Voir vos informations de profil',
      security: 'Sécurité',
      pinSecurity: 'Code PIN',
      pinSecurityDesc: 'Modifier votre code PIN',
      general: 'Général',
      about: 'À propos',
      version: 'Version 1.0.0',
      logout: 'Déconnexion',
    },
    en: {
      title: 'Settings',
      preferences: 'Preferences',
      changeLanguage: 'Change language',
      currentLang: 'English (EN)',
      pinCode: 'PIN Code',
      pinDesc: 'Change your PIN code',
      account: 'Account',
      personalInfo: 'Personal information',
      personalInfoDesc: 'View your profile information',
      security: 'Security',
      pinSecurity: 'PIN Code',
      pinSecurityDesc: 'Change your PIN code',
      general: 'General',
      about: 'About',
      version: 'Version 1.0.0',
      logout: 'Logout',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      const [storedLang, pinVal, userRaw] = await Promise.all([
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('pin_enabled'),
        AsyncStorage.getItem('user'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setPinEnabled(pinVal === 'true');
      if (userRaw) setUser(JSON.parse(userRaw));
    };
    load();
  }, []);

  const handleLangChange = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await AsyncStorage.setItem('app_lang', newLang);
    setLang(newLang);
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
      {rightEl || (
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      )}
    </TouchableOpacity>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
        {title}
      </Text>
      {children}
    </View>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preferences */}
        <Section title={t.preferences}>
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
            label={t.pinCode}
            desc={t.pinDesc}
            onPress={() =>
              navigation.navigate('PinSetup', { fromSettings: true })
            }
          />
        </Section>

        {/* Account */}
        <Section title={t.account}>
          <MenuItem
            icon="person-outline"
            label={t.personalInfo}
            desc={
              user ? `${user.first_name} ${user.last_name}` : t.personalInfoDesc
            }
            onPress={() => {}}
          />
        </Section>

        {/* Security */}
        <Section title={t.security}>
          <MenuItem
            icon="lock-closed-outline"
            label={t.pinSecurity}
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
        </Section>

        {/* General */}
        <Section title={t.general}>
          <MenuItem
            icon="information-circle-outline"
            label={t.about}
            desc={t.version}
            onPress={() =>
              Linking.openURL(
                CGU_URL,
              )
            }
          />
        </Section>

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
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
    paddingVertical: spacing.xl,
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
