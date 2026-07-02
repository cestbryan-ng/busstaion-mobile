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

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  location?: string;
  description?: string;
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
      activate: 'Réactiver',
      confirmSuspend: 'Suspendre cette agence ?',
      confirmSuspendMsg: "L'agence ne pourra plus opérer.",
      confirmActivate: 'Réactiver cette agence ?',
      confirmActivateMsg: "L'agence pourra de nouveau opérer.",
      cancel: 'Annuler',
      error: 'Une erreur est survenue',
      statusUpdated: 'Statut mis à jour',
      updateError: 'Erreur lors de la mise à jour',
    },
    en: {
      title: 'Agency details',
      seeTrips: "View agency's trips",
      suspend: 'Suspend',
      activate: 'Reactivate',
      confirmSuspend: 'Suspend this agency?',
      confirmSuspendMsg: 'The agency will no longer be able to operate.',
      confirmActivate: 'Reactivate this agency?',
      confirmActivateMsg: 'The agency will be able to operate again.',
      cancel: 'Cancel',
      error: 'An error occurred',
      statusUpdated: 'Status updated',
      updateError: 'Update error',
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

      const res = await fetch(`${API_URL}/agence/${agencyId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (res.ok) setAgency(await res.json());
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

  if (loading) return <SkeletonAgencyDetail />;

  if (!agency) return null;

  const statusCfg = STATUT_CONFIG[agency.isActive ? 'ACTIF' : 'SUSPENDU'];
  const canToggle = true;

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
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Banner / Logo */}
        <View
          style={[
            styles.bannerPlaceholder,
            { backgroundColor: `${colors.primary}10` },
          ]}
        >
          <Ionicons name="bus-outline" size={48} color={colors.primary} />
        </View>
        <View
          style={[
            styles.logoOverlay,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {agency.logoUrl ? (
            <Image
              source={{ uri: agency.logoUrl }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={[styles.logoLetter, { color: colors.primary }]}>
              {agency.longName.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Info */}
        <View
          style={[
            styles.infoSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {agency.longName}
            </Text>
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

          {/* Contact */}
          <View style={[styles.contactList, { borderTopColor: theme.border }]}>
            {agency.contact?.phone && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: theme.border }]}
                onPress={() => Linking.openURL(`tel:${agency.contact!.phone}`)}
              >
                <Ionicons name="call-outline" size={18} color={theme.textStrong} />
                <Text style={[styles.contactText, { color: theme.textStrong }]}>
                  {agency.contact.phone}
                </Text>
                <View
                  style={[
                    styles.contactIconBtn,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Ionicons name="call-outline" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}
            {agency.contact?.email && (
              <TouchableOpacity
                style={[styles.contactRow, { borderBottomColor: theme.border }]}
                onPress={() => Linking.openURL(`mailto:${agency.contact!.email}`)}
              >
                <Ionicons name="mail-outline" size={18} color={theme.textStrong} />
                <Text style={[styles.contactText, { color: theme.textStrong }]}>
                  {agency.contact.email}
                </Text>
                <View
                  style={[
                    styles.contactIconBtn,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Ionicons name="mail-outline" size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}
            {agency.location && (
              <View style={[styles.contactRow, { borderBottomColor: 'transparent' }]}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={theme.textStrong}
                />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  {agency.location}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.error }]}
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

          {canToggle && (
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {
                  borderColor:
                    agency.isActive ? colors.error : colors.success,
                },
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
                <>
                  <Ionicons
                    name={
                      agency.isActive
                        ? 'ban-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={18}
                    color={agency.isActive ? colors.error : colors.success}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      {
                        color: agency.isActive ? colors.error : colors.success,
                      },
                    ]}
                  >
                    {agency.isActive ? t.suspend : t.activate}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
  headerTitle: { ...typography.heading, fontSize: typography.sizes.lg },

  bannerPlaceholder: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  agencyName: { ...typography.heading, fontSize: typography.sizes.xl, flex: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  description: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  contactList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  contactText: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  contactIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
