import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonAgencyInfo } from '../../../../components/skeleton';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';

type Agency = {
  id: string;
  longName: string;
  shortName?: string;
  location?: string;
  logoUrl?: string;
  description?: string;
  greetingMessage?: string;
  isActive: boolean;
  socialNetwork?: string;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
};

export default function AgencyInfo() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const t = {
    fr: {
      title: "Informations agence",
      generalInfo: 'Informations générales',
      agencyId: 'ID agence',
      longName: 'Nom long',
      shortName: 'Nom court',
      location: 'Localisation',
      email: 'Email',
      phone: 'Téléphone',
      website: 'Site web',
      socialNetwork: 'Réseau social',
      description: 'Description',
      greeting: "Message d'accueil",
      status: 'Statut',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
    },
    en: {
      title: 'Agency information',
      generalInfo: 'General information',
      agencyId: 'Agency ID',
      longName: 'Long name',
      shortName: 'Short name',
      location: 'Location',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      socialNetwork: 'Social network',
      description: 'Description',
      greeting: 'Greeting message',
      status: 'Status',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const res = await fetch(`${API_URL}/agence/chef-agence/${chefId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgency(data);
        setCache(`agency_info_${chefId}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(`agency_info_${chefId}`);
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
          const cached = await getCache(`agency_info_${chefId}`);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const truncateId = (id?: string) =>
    id ? `${id.slice(0, 8)}-...-${id.slice(-8)}` : '—';

  if (loading) return <SkeletonAgencyInfo />;

  const isActive = agency?.isActive;

  const InfoRow = ({
    icon,
    iconColor,
    iconBg,
    label,
    value,
    onPress,
    last = false,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    label: string;
    value?: string;
    onPress?: () => void;
    last?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.infoRow,
        { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : 1 },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
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
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AgencyEditInfo')}>
          <Ionicons name="create-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={isOnline ? onRefresh : undefined}
            tintColor={colors.primary}
          />
        }
      >
        {/* Agency top card */}
        <View
          style={[
            styles.agencyTopCard,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={[styles.agencyLogo, { backgroundColor: `${colors.primary}15` }]}>
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
          <View style={styles.agencyTopInfo}>
            <View style={styles.agencyNameRow}>
              <Text style={[styles.agencyName, { color: theme.textStrong }]}>
                {agency?.longName || '—'}
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
            {agency?.contact?.email && (
              <View style={styles.agencyContactRow}>
                <Ionicons name="mail-outline" size={13} color={theme.text} />
                <Text style={[styles.agencyContact, { color: theme.text }]}>
                  {' '}{agency.contact.email}
                </Text>
              </View>
            )}
            {agency?.location && (
              <View style={styles.agencyContactRow}>
                <Ionicons name="location-outline" size={13} color={theme.text} />
                <Text style={[styles.agencyContact, { color: theme.text }]}>
                  {' '}{agency.location}
                </Text>
              </View>
            )}
            {agency?.contact?.website && (
              <TouchableOpacity
                style={styles.agencyContactRow}
                onPress={() => agency.contact?.website && Linking.openURL(agency.contact.website)}
              >
                <Ionicons name="globe-outline" size={13} color={theme.text} />
                <Text style={[styles.agencyContact, { color: theme.text }]}>
                  {' '}{agency.contact.website}
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
            iconBg={`${colors.primary}10`}
            label={t.agencyId}
            value={truncateId(agency?.id)}
          />
          <InfoRow
            icon="business-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.longName}
            value={agency?.longName}
          />
          {agency?.shortName && (
            <InfoRow
              icon="text-outline"
              iconColor={colors.primary}
              iconBg={`${colors.primary}10`}
              label={t.shortName}
              value={agency.shortName}
            />
          )}
          <InfoRow
            icon="location-outline"
            iconColor="#d97706"
            iconBg="#fef3c710"
            label={t.location}
            value={agency?.location}
          />
          <InfoRow
            icon="mail-outline"
            iconColor={colors.primary}
            iconBg={`${colors.primary}10`}
            label={t.email}
            value={agency?.contact?.email}
          />
          <InfoRow
            icon="call-outline"
            iconColor={colors.success}
            iconBg={`${colors.success}10`}
            label={t.phone}
            value={agency?.contact?.phone}
          />
          {agency?.contact?.website && (
            <InfoRow
              icon="globe-outline"
              iconColor={colors.primary}
              iconBg={`${colors.primary}10`}
              label={t.website}
              value={agency.contact.website}
              onPress={() => agency.contact?.website && Linking.openURL(agency.contact.website)}
            />
          )}
          {agency?.socialNetwork && (
            <InfoRow
              icon="share-social-outline"
              iconColor="#1877f2"
              iconBg="#1877f215"
              label={t.socialNetwork}
              value={agency.socialNetwork}
              onPress={() => agency.socialNetwork && Linking.openURL(
                agency.socialNetwork.startsWith('http') ? agency.socialNetwork : `https://${agency.socialNetwork}`
              )}
            />
          )}
          <InfoRow
            icon="checkmark-circle-outline"
            iconColor={isActive ? colors.success : colors.error}
            iconBg={isActive ? `${colors.success}10` : `${colors.error}10`}
            label={t.status}
            value={isActive ? t.active : t.inactive}
          />
          {agency?.greetingMessage && (
            <InfoRow
              icon="chatbubble-outline"
              iconColor="#7c3aed"
              iconBg={`${colors.primary}10`}
              label={t.greeting}
              value={agency.greetingMessage}
              last={!agency.description}
            />
          )}
          {agency?.description && (
            <InfoRow
              icon="document-text-outline"
              iconColor={colors.primary}
              iconBg={`${colors.primary}10`}
              label={t.description}
              value={agency.description}
              last
            />
          )}
        </View>

        <View style={{ height: spacing.xl }} />
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
  title: {
    ...typography.heading,
    fontSize: typography.sizes.lg,
    flex: 1,
    textAlign: 'center',
  },

  agencyTopCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    margin: spacing.lg,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  agencyLogo: {
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyTopInfo: { flex: 1 },
  agencyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  agencyContactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  agencyContact: { ...typography.body, fontSize: typography.sizes.xs },

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
});
