import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Share,
  Linking,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../../../components/toast';
import ConfirmModal from '../../../../components/confirm-modal';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonAgencyDetail } from '../../../../components/skeleton';
import BuildingPlaceholder from '../../../../assets/placeholders/building.svg';

type Agency = {
  id: string;
  longName: string;
  shortName?: string;
  logoUrl?: string;
  location?: string;
  description?: string;
  greetingMessage?: string;
  socialNetwork?: string;
  rating?: number;
  gareIds?: string[];
  contact?: { email?: string; phone?: string; website?: string };
  isActive: boolean;
};

const STATUT_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  ACTIF: {
    label: 'Actif',
    labelEn: 'Active',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  SUSPENDU: {
    label: 'Suspendu',
    labelEn: 'Suspended',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

export default function AgencyDetailBsm() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AgencyDetailBsm'>>();
  const { agencyId } = route.params;
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [token, setToken] = useState('');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmIsActive, setConfirmIsActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Détails agence',
      seeTrips: "Voir les voyages de l'agence",
      suspend: 'Suspendre',
      activate: 'Activer',
      confirmSuspend: 'Suspendre cette agence ?',
      confirmSuspendMsg: "L'agence ne pourra plus opérer.",
      confirmActivate: 'Activer cette agence ?',
      confirmActivateMsg: "L'agence pourra opérer.",
      cancel: 'Annuler',
      error: 'Une erreur est survenue',
      statusUpdated: 'Statut mis à jour',
      updateError: 'Erreur lors de la mise à jour',
      station: 'Gare affiliée',
      rating: 'Note',
      greeting: 'Message d\'accueil',
      socialNetwork: 'Réseau social',
    },
    en: {
      title: 'Agency details',
      seeTrips: "View agency's trips",
      suspend: 'Suspend',
      activate: 'Activate',
      confirmSuspend: 'Suspend this agency?',
      confirmSuspendMsg: 'The agency will no longer be able to operate.',
      confirmActivate: 'Activate this agency?',
      confirmActivateMsg: 'The agency will be able to operate.',
      cancel: 'Cancel',
      error: 'An error occurred',
      statusUpdated: 'Status updated',
      updateError: 'Update error',
      station: 'Affiliated station',
      rating: 'Rating',
      greeting: 'Welcome message',
      socialNetwork: 'Social network',
    },
  }[lang];

  const load = useCallback(async () => {
    try {
      const [tk, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setToken(tk ?? '');

      const headers = { Authorization: `Bearer ${tk}` };
      const res = await fetch(`${API_URL}/agence/${agencyId}`, { headers });
      if (res.ok) {
        const data: Agency = await res.json();
        setAgency(data);

        const gareId = data.gareIds?.[0];
        if (gareId) {
          const gareRes = await fetch(`${API_URL}/gare/${gareId}`, { headers });
          if (gareRes.ok) {
            const g = await gareRes.json();
            setStationName(g.nomGareRoutiere || null);
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleShare = async () => {
    if (!agency) return;
    try {
      await Share.share({
        message: `${agency.longName}\n${agency.location ?? ''}\n${agency.contact?.phone ?? ''}`,
        title: agency.longName,
      });
    } catch {
      // silent
    }
  };

  const handleToggleStatut = () => {
    if (!agency) return;
    setConfirmIsActive(agency.isActive);
    setConfirmVisible(true);
  };

  const doToggleStatut = async () => {
    setConfirmVisible(false);
    setSuspending(true);
    try {
      const res = await fetch(`${API_URL}/bsm/agence/${agencyId}/statut`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !confirmIsActive }),
      });
      if (res.ok) {
        toast.success(t.statusUpdated);
        setAgency(prev => prev ? { ...prev, isActive: !confirmIsActive } : null);
      } else {
        toast.error(t.updateError);
      }
    } catch {
      toast.error(t.updateError);
    } finally {
      setSuspending(false);
    }
  };

  const socialUrl = agency?.socialNetwork
    ? agency.socialNetwork.startsWith('http')
      ? agency.socialNetwork
      : `https://${agency.socialNetwork}`
    : null;

  const initials = (agency?.shortName || agency?.longName || '??')
    .slice(0, 2)
    .toUpperCase();

  if (loading) return <SkeletonAgencyDetail />;
  if (!agency) return null;

  const statusCfg = STATUT_CONFIG[agency.isActive ? 'ACTIF' : 'SUSPENDU'];

  const infoRows = [
    stationName && { icon: 'business-outline', label: t.station, value: stationName },
    agency.location && { icon: 'location-outline', label: null, value: agency.location },
    agency.contact?.phone && { icon: 'call-outline', label: null, value: agency.contact.phone, onPress: () => Linking.openURL(`tel:${agency.contact!.phone}`) },
    agency.contact?.email && { icon: 'mail-outline', label: null, value: agency.contact.email, onPress: () => Linking.openURL(`mailto:${agency.contact!.email}`) },
    agency.contact?.website && { icon: 'globe-outline', label: null, value: agency.contact.website, onPress: () => Linking.openURL(agency.contact!.website!) },
    socialUrl && { icon: 'logo-facebook', label: t.socialNetwork, value: agency.socialNetwork!, onPress: () => Linking.openURL(socialUrl) },
    typeof agency.rating === 'number' && { icon: 'star-outline', label: t.rating, value: `${agency.rating} / 5` },
  ].filter(Boolean) as { icon: string; label: string | null; value: string; onPress?: () => void }[];

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
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: `${colors.primary}10` }]}>
          <BuildingPlaceholder width="90%" height="90%" />
        </View>

        {/* Logo overlay */}
        <View
          style={[
            styles.logoOverlay,
            { backgroundColor: theme.background, borderColor: `${colors.primary}30` },
          ]}
        >
          {agency.logoUrl && agency.logoUrl.startsWith('http') ? (
            <Image source={{ uri: agency.logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoLetter, { color: colors.primary }]}>{initials}</Text>
          )}
        </View>

        {/* Name + status */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.agencyName, { color: theme.textStrong }]} numberOfLines={2}>
                {agency.longName}
              </Text>
              {agency.shortName && (
                <Text style={[styles.shortName, { color: colors.primary }]}>
                  {agency.shortName}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>

          {agency.description && (
            <Text style={[styles.description, { color: theme.text }]}>
              {agency.description}
            </Text>
          )}

          {/* Greeting message */}
          {!!agency.greetingMessage && (
            <View style={[styles.greetingBox, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
              <Text style={[styles.greetingText, { color: theme.text }]}>
                {agency.greetingMessage}
              </Text>
            </View>
          )}

          {/* Info rows */}
          {infoRows.length > 0 && (
            <View style={[styles.contactList, { borderTopColor: theme.border }]}>
              {infoRows.map((row, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.contactRow,
                    { borderBottomColor: i < infoRows.length - 1 ? theme.border : 'transparent' },
                  ]}
                  onPress={row.onPress}
                  activeOpacity={row.onPress ? 0.7 : 1}
                  disabled={!row.onPress}
                >
                  <View style={[styles.contactIconBox, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name={row.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {row.label && (
                      <Text style={[styles.contactLabel, { color: theme.text }]}>{row.label}</Text>
                    )}
                    <Text
                      style={[
                        styles.contactText,
                        { color: row.onPress ? colors.primary : theme.textStrong },
                      ]}
                      numberOfLines={1}
                    >
                      {row.value}
                    </Text>
                  </View>
                  {row.onPress && (
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() =>
              navigation.navigate('AgencyTripsBsm', {
                agencyId: agency.id,
                agencyName: agency.longName,
              })
            }
            activeOpacity={0.85}
          >
              <Text style={styles.primaryBtnText}>{t.seeTrips}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { borderColor: agency.isActive ? colors.error : colors.success },
            ]}
            onPress={handleToggleStatut}
            disabled={suspending}
            activeOpacity={0.85}
          >
            {suspending ? (
              <ActivityIndicator
                size="small"
                color={agency.isActive ? colors.error : colors.success}
              />
            ) : (
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: agency.isActive ? colors.error : colors.success },
                ]}
              >
                {agency.isActive ? t.suspend : t.activate}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <ConfirmModal
        visible={confirmVisible}
        title={confirmIsActive ? t.confirmSuspend : t.confirmActivate}
        message={confirmIsActive ? t.confirmSuspendMsg : t.confirmActivateMsg}
        confirmText={confirmIsActive ? t.suspend : t.activate}
        cancelText={t.cancel}
        onConfirm={doToggleStatut}
        onCancel={() => setConfirmVisible(false)}
      />
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
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },

  banner: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    top: spacing.xl + 48 + 150 - 36,
    left: spacing.lg,
    width: 72,
    height: 72,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: { ...typography.heading, fontSize: typography.sizes.xxl },

  infoSection: {
    marginTop: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  agencyName: { ...typography.heading, fontSize: typography.sizes.xl },
  shortName: { ...typography.bodyBold, fontSize: typography.sizes.sm, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  greetingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  greetingText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 20,
  },

  contactList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  contactIconBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: { ...typography.body, fontSize: 10, marginBottom: 1 },
  contactText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  actionsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: 4,
  },
  primaryBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  toggleBtnText: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
