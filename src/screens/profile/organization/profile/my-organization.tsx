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
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';

type Organization = {
  organization_id: string;
  long_name: string;
  short_name: string;
  logo_url?: string;
  email?: string;
  website_url?: string;
  social_network?: string;
  description?: string;
  is_active: boolean;
  legal_form?: string;
  ceo_name?: string;
  registration_date?: string;
  business_registration_number?: string;
  tax_number?: string;
  capital_share?: number;
  status?: string;
  // contact phone may be embedded
  phone?: string;
};

const SOCIAL_ICONS = [
  { key: 'facebook', icon: 'logo-facebook', color: '#1877F2' },
  { key: 'instagram', icon: 'logo-instagram', color: '#E1306C' },
  { key: 'linkedin', icon: 'logo-linkedin', color: '#0077B5' },
];

export default function OrgMyOrganization() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Mon organisation',
      subtitle: "Détails de l'organisation",
      generalInfo: 'Informations générales',
      orgId: 'ID organisation',
      shortName: 'Nom court',
      longName: 'Nom long',
      legalForm: 'Forme légale',
      status: 'Statut',
      createdAt: 'Créée le',
      ceo: 'CEO / Dirigeant',
      email: 'Email',
      phone: 'Téléphone',
      website: 'Site web',
      socialNetworks: 'Réseaux sociaux',
      legalInfo: 'Informations légales',
      registrationNumber: "N° d'enregistrement",
      taxNumber: 'N° contribuable',
      capital: 'Capital social',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
    },
    en: {
      title: 'My organization',
      subtitle: 'Organization details',
      generalInfo: 'General information',
      orgId: 'Organization ID',
      shortName: 'Short name',
      longName: 'Long name',
      legalForm: 'Legal form',
      status: 'Status',
      createdAt: 'Created on',
      ceo: 'CEO / Director',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      socialNetworks: 'Social networks',
      legalInfo: 'Legal information',
      registrationNumber: 'Registration number',
      taxNumber: 'Tax number',
      capital: 'Share capital',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, orgRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('organization'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      if (orgRaw) setOrg(JSON.parse(orgRaw));

      // Fresh fetch
      const cached = orgRaw ? JSON.parse(orgRaw) : null;
      const orgId = cached?.organization_id;
      if (orgId) {
        const res = await fetch(`${API_URL}/organizations/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOrg(data);
          await AsyncStorage.setItem('organization', JSON.stringify(data));
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

  const truncateId = (id?: string) =>
    id
      ? `${id.slice(0, 8)}-${id.slice(9, 13)}-${id.slice(
          14,
          18,
        )}-...-${id.slice(-12)}`
      : '—';

  const formatDate = (dateStr?: string) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString(
          lang === 'fr' ? 'fr-FR' : 'en-GB',
          { day: 'numeric', month: 'short', year: 'numeric' },
        )
      : '—';

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const InfoRow = ({
    icon,
    iconColor,
    iconBg,
    label,
    value,
    last = false,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    label: string;
    value?: string;
    last?: boolean;
  }) => (
    <View
      style={[
        styles.infoRow,
        { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <Text style={[styles.infoLabel, { color: theme.text }]}>{label}</Text>
      <Text
        style={[styles.infoValue, { color: theme.textStrong }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value || '—'}
      </Text>
    </View>
  );

  const isActive = org?.is_active;
  const initials = (org?.short_name || org?.long_name || 'ORG')
    .slice(0, 3)
    .toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
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
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text }]}>
            {t.subtitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('OrgEditOrganization')}
        >
          <Ionicons name="create-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
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
        {/* Org top card */}
        <View
          style={[
            styles.orgTopCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.orgLogo, { backgroundColor: `${colors.primary}15` }]}
          >
            {org?.logo_url ? (
              <Image
                source={{ uri: org.logo_url }}
                style={styles.orgLogoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.orgLogoText, { color: colors.primary }]}>
                {initials}
              </Text>
            )}
          </View>
          <View style={styles.orgTopInfo}>
            <View style={styles.orgNameRow}>
              <Text style={[styles.orgName, { color: theme.textStrong }]}>
                {org?.long_name || '—'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? `${colors.success}15`
                      : `${colors.error}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: isActive ? colors.success : colors.error },
                  ]}
                >
                  {isActive ? t.active : t.inactive}
                </Text>
              </View>
            </View>
            {org?.email && (
              <View style={styles.orgContactRow}>
                <Ionicons name="mail-outline" size={13} color={theme.text} />
                <Text style={[styles.orgContact, { color: theme.text }]}>
                  {' '}
                  {org.email}
                </Text>
              </View>
            )}
            {org?.website_url && (
              <TouchableOpacity
                style={styles.orgContactRow}
                onPress={() =>
                  org.website_url && Linking.openURL(org.website_url)
                }
              >
                <Ionicons name="globe-outline" size={13} color={theme.text} />
                <Text style={[styles.orgContact, { color: theme.text }]}>
                  {' '}
                  {org.website_url}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* General info */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.generalInfo}
          </Text>
          <InfoRow
            icon="finger-print-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            label={t.orgId}
            value={truncateId(org?.organization_id)}
          />
          <InfoRow
            icon="text-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.shortName}
            value={org?.short_name}
          />
          <InfoRow
            icon="business-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.longName}
            value={org?.long_name}
          />
          <InfoRow
            icon="shield-outline"
            iconColor="#d97706"
            iconBg="#fef3c710"
            label={t.legalForm}
            value={org?.legal_form}
          />
          <InfoRow
            icon="checkmark-circle-outline"
            iconColor={isActive ? colors.success : colors.error}
            iconBg={isActive ? `${colors.success}10` : `${colors.error}10`}
            label={t.status}
            value={isActive ? t.active : t.inactive}
          />
          <InfoRow
            icon="calendar-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.createdAt}
            value={formatDate(org?.registration_date)}
          />
          <InfoRow
            icon="person-outline"
            iconColor="#7c3aed"
            iconBg="#f5f3ff"
            label={t.ceo}
            value={org?.ceo_name}
          />
          <InfoRow
            icon="mail-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.email}
            value={org?.email}
          />
          <InfoRow
            icon="call-outline"
            iconColor={colors.success}
            iconBg={`${colors.success}10`}
            label={t.phone}
            value={(org as any)?.phone}
          />
          <InfoRow
            icon="globe-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.website}
            value={org?.website_url}
          />

          {/* Social networks row */}
          {org?.social_network && (
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.border, borderBottomWidth: 0 },
              ]}
            >
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Ionicons
                  name="share-social-outline"
                  size={14}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {t.socialNetworks}
              </Text>
              <View style={styles.socialIcons}>
                {SOCIAL_ICONS.map(s => (
                  <TouchableOpacity key={s.key} onPress={() => {}}>
                    <Ionicons name={s.icon} size={22} color={s.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Legal info */}
        {(org?.business_registration_number ||
          org?.tax_number ||
          org?.capital_share) && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.legalInfo}
            </Text>
            <InfoRow
              icon="document-outline"
              iconColor={colors.success}
              iconBg={`${colors.success}10`}
              label={t.registrationNumber}
              value={org?.business_registration_number}
            />
            <InfoRow
              icon="receipt-outline"
              iconColor={colors.success}
              iconBg={`${colors.success}10`}
              label={t.taxNumber}
              value={org?.tax_number}
            />
            <InfoRow
              icon="cash-outline"
              iconColor="#d97706"
              iconBg="#fef3c710"
              label={t.capital}
              value={
                org?.capital_share
                  ? `${org.capital_share.toLocaleString('fr-FR')} FCFA`
                  : undefined
              }
              last
            />
          </View>
        )}

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  headerSubtitle: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },

  orgTopCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  orgLogo: {
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orgLogoImage: { width: '100%', height: '100%' },
  orgLogoText: { ...typography.heading, fontSize: typography.sizes.md },
  orgTopInfo: { flex: 1 },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  orgName: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  orgContactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  orgContact: { ...typography.body, fontSize: typography.sizes.xs },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  infoValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  socialIcons: { flexDirection: 'row', gap: spacing.sm },
});
