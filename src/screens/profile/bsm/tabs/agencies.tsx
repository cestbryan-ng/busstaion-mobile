import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation,
  useFocusEffect,
  useScrollToTop,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { useToast } from '../../../../components/toast';
import ConfirmModal from '../../../../components/confirm-modal';
import { useDebounce } from '../../../../hooks/useDebounce';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  location?: string;
  description?: string;
  isActive: boolean;
};

type Affiliation = {
  id: string;
  agencyId: string;
  agencyName?: string;
  statut: string;
  createdAt?: string;
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

export default function BsmAgencies() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [token, setToken] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [pendingAffiliations, setPendingAffiliations] = useState<Affiliation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Affiliation | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIF' | 'SUSPENDU'>('ALL');
  const [showFilter, setShowFilter] = useState(false);

  const t = {
    fr: {
      title: 'Agences',
      subtitle: 'Agences affiliées à la gare',
      search: 'Rechercher une agence...',
      affiliated: 'Affiliées',
      active: 'Actives',
      suspended: 'Suspendues',
      noAgencies: 'Aucune agence',
      pendingTitle: 'Demandes en attente',
      validate: 'Valider',
      reject: 'Rejeter',
      confirmReject: 'Rejeter cette demande ?',
      confirmRejectMsg: "L'agence ne sera pas activée.",
      cancel: 'Annuler',
      affiliationSince: 'Depuis',
      allAgencies: 'Agences affiliées',
      agencyApproved: 'Agence validée',
      agencyRejected: 'Agence rejetée',
      error: 'Une erreur est survenue',
    },
    en: {
      title: 'Agencies',
      subtitle: 'Agencies affiliated to the station',
      search: 'Search an agency...',
      affiliated: 'Affiliated',
      active: 'Active',
      suspended: 'Suspended',
      noAgencies: 'No agencies',
      pendingTitle: 'Pending requests',
      validate: 'Validate',
      reject: 'Reject',
      confirmReject: 'Reject this request?',
      confirmRejectMsg: 'The agency will not be activated.',
      cancel: 'Cancel',
      affiliationSince: 'Since',
      allAgencies: 'Affiliated agencies',
      agencyApproved: 'Agency approved',
      agencyRejected: 'Agency rejected',
      error: 'An error occurred',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [tk, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);
      setToken(tk ?? '');

      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (!managerId) return;

      const headers = { Authorization: `Bearer ${tk}` };
      const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers,
      });
      if (!stationRes.ok) return;
      const stationData = await stationRes.json();
      const station = stationData;

      const [agenciesRes, affiliationsRes] = await Promise.all([
        fetch(`${API_URL}/gare/${station.idGareRoutiere}/agences`, { headers }),
        fetch(`${API_URL}/affiliation/gare/${station.idGareRoutiere}`, { headers }),
      ]);

      if (agenciesRes.ok) {
        const data = await agenciesRes.json();
        setAgencies(Array.isArray(data) ? data : []);
      }
      if (affiliationsRes.ok) {
        const all: Affiliation[] = await affiliationsRes.json();
        setPendingAffiliations(
          Array.isArray(all) ? all.filter(a => a.statut === 'EN_ATTENTE') : [],
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleValidate = async (aff: Affiliation) => {
    setProcessingId(aff.id);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      // 1. Marquer l'affiliation comme PAYE
      await fetch(`${API_URL}/affiliation/${aff.id}/statut`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ statut: 'PAYE' }),
      });
      // 2. Activer l'agence
      const agencyRes = await fetch(
        `${API_URL}/bsm/agence/${aff.agencyId}/statut`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ active: true }),
        },
      );
      if (agencyRes.ok) {
        toast.success(t.agencyApproved);
        setPendingAffiliations(prev => prev.filter(a => a.id !== aff.id));
        setAgencies(prev =>
          prev.map(a =>
            a.id === aff.agencyId ? { ...a, isActive: true } : a,
          ),
        );
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (aff: Affiliation) => {
    setRejectTarget(aff);
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    const aff = rejectTarget;
    setRejectTarget(null);
    setProcessingId(aff.id);
    try {
      const res = await fetch(`${API_URL}/bsm/agence/${aff.agencyId}/statut`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: false }),
      });
      if (res.ok) {
        toast.success(t.agencyRejected);
        setPendingAffiliations(prev => prev.filter(a => a.id !== aff.id));
      } else {
        toast.error(t.error);
      }
    } catch {
      toast.error(t.error);
    } finally {
      setProcessingId(null);
    }
  };

  const activeCount = agencies.filter(a => a.isActive === true).length;
  const suspendedCount = agencies.filter(a => a.isActive === false).length;

  const filtered = useMemo(
    () =>
      agencies.filter(a => {
        if (filterStatus === 'ACTIF' && !a.isActive) return false;
        if (filterStatus === 'SUSPENDU' && a.isActive) return false;
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          a.longName.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q)
        );
      }),
    [agencies, debouncedSearch, filterStatus],
  );

  const AffiliationCard = ({ aff }: { aff: Affiliation }) => {
    const isProcessing = processingId === aff.id;
    const agencyName =
      aff.agencyName ??
      agencies.find(a => a.id === aff.agencyId)?.longName ??
      aff.agencyId;
    const logo = agencies.find(a => a.id === aff.agencyId)?.logoUrl;

    return (
      <View
        style={[
          styles.affiliationCard,
          { backgroundColor: theme.background, borderColor: '#d97706' },
        ]}
      >
        <View style={styles.affiliationTop}>
          <View
            style={[styles.agencyLogo, { backgroundColor: `${'#d97706'}15` }]}
          >
            {logo ? (
              <Image
                source={{ uri: logo }}
                style={styles.agencyLogoImage}
                resizeMode="contain"
              />
            ) : (
              <AgencyPlaceholder width={40} height={40} />
            )}
          </View>
          <View style={styles.affiliationInfo}>
            <Text
              style={[styles.affiliationName, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {agencyName}
            </Text>
            {aff.createdAt && (
              <Text style={[styles.affiliationDate, { color: theme.text }]}>
                {t.affiliationSince}{' '}
                {new Date(aff.createdAt).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : 'en-GB',
                )}
              </Text>
            )}
          </View>
          <View style={[styles.pendingBadge, { backgroundColor: '#fef3c715' }]}>
            <Text style={[styles.pendingBadgeText, { color: '#d97706' }]}>
              {lang === 'fr' ? 'En attente' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.affiliationActions}>
          {isProcessing ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ flex: 1 }}
            />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.validateBtn,
                  { backgroundColor: colors.success },
                ]}
                onPress={() => handleValidate(aff)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{t.validate}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: colors.error }]}
                onPress={() => handleReject(aff)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-outline" size={16} color={colors.error} />
                <Text style={[styles.rejectBtnText, { color: colors.error }]}>
                  {t.reject}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const AgencyCard = ({ item }: { item: Agency }) => {
    const cfg = STATUT_CONFIG[item.isActive ? 'ACTIF' : 'SUSPENDU'];
    return (
      <TouchableOpacity
        style={[
          styles.agencyCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AgencyDetailBsm', { agencyId: item.id })
        }
      >
        <View
          style={[styles.agencyLogo, { backgroundColor: theme.backgroundAlt }]}
        >
          {item.logoUrl ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.agencyLogoImage}
              resizeMode="contain"
            />
          ) : (
            <AgencyPlaceholder width={40} height={40} />
          )}
        </View>

        <View style={styles.agencyInfo}>
          <View style={styles.agencyTopRow}>
            <Text
              style={[styles.agencyName, { color: theme.textStrong }]}
              numberOfLines={1}
            >
              {item.longName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>
                {lang === 'fr' ? cfg.label : cfg.labelEn}
              </Text>
            </View>
          </View>
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.locationText, { color: theme.text }]}>
                {' '}
                {item.location}
              </Text>
            </View>
          )}
          {item.description && (
            <Text
              style={[styles.agencyDesc, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <SkeletonListScreen hasStats subtitle />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
      >
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
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Search */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.searchText, { color: theme.textStrong }]}
                placeholder={t.search}
                placeholderTextColor={theme.text}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                {
                  borderColor: filterStatus !== 'ALL' ? colors.primary : theme.border,
                  backgroundColor: filterStatus !== 'ALL' ? `${colors.primary}10` : 'transparent',
                },
              ]}
              onPress={() => setShowFilter(v => !v)}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={filterStatus !== 'ALL' ? colors.primary : theme.textStrong}
              />
            </TouchableOpacity>
          </View>

          {/* Filter chips */}
          {showFilter && (
            <View style={styles.filterChips}>
              {(['ALL', 'ACTIF', 'SUSPENDU'] as const).map(status => {
                const label =
                  status === 'ALL'
                    ? lang === 'fr' ? 'Tous' : 'All'
                    : status === 'ACTIF'
                    ? t.active
                    : t.suspended;
                const active = filterStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : theme.background,
                        borderColor: active ? colors.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : theme.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: `${colors.error}10`,
                  borderColor: `${colors.error}20`,
                },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={colors.error}
              />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {agencies.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.affiliated}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: `${colors.success}10`,
                  borderColor: `${colors.success}20`,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.success}
              />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {activeCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.active}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: `${colors.error}10`,
                  borderColor: `${colors.error}20`,
                },
              ]}
            >
              <Ionicons name="ban-outline" size={18} color={colors.error} />
              <Text style={[styles.statValue, { color: theme.textStrong }]}>
                {suspendedCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {t.suspended}
              </Text>
            </View>
          </View>

          {/* Demandes en attente */}
          {pendingAffiliations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text
                  style={[styles.sectionTitle, { color: theme.textStrong }]}
                >
                  {t.pendingTitle}
                </Text>
                <View
                  style={[
                    styles.pendingCount,
                    { backgroundColor: '#fef3c715', borderColor: '#d97706' },
                  ]}
                >
                  <Text style={[styles.pendingCountText, { color: '#d97706' }]}>
                    {pendingAffiliations.length}
                  </Text>
                </View>
              </View>
              {pendingAffiliations.map(aff => (
                <AffiliationCard key={aff.id} aff={aff} />
              ))}
            </View>
          )}

          {/* Liste agences */}
          <View style={styles.section}>
            {pendingAffiliations.length > 0 && (
              <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
                {t.allAgencies}
              </Text>
            )}
            {filtered.length === 0 ? (
              <EmptyState
                type="result"
                message={t.noAgencies}
                textColor={theme.text}
              />
            ) : (
              filtered.map(item => <AgencyCard key={item.id} item={item} />)
            )}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        <ConfirmModal
          visible={!!rejectTarget}
          title={t.confirmReject}
          message={t.confirmRejectMsg}
          confirmText={t.reject}
          cancelText={t.cancel}
          onConfirm={doReject}
          onCancel={() => setRejectTarget(null)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchText: { ...typography.body, flex: 1, fontSize: typography.sizes.sm },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  statValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  pendingCount: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.md,
  },
  pendingCountText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  affiliationCard: {
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  affiliationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  affiliationInfo: { flex: 1 },
  affiliationName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  affiliationDate: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  pendingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  affiliationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  validateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 40,
    borderRadius: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 40,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  actionBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
  rejectBtnText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  agencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  agencyInfo: { flex: 1 },
  agencyTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agencyName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { ...typography.body, fontSize: typography.sizes.xs },
  agencyDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },

  filterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
