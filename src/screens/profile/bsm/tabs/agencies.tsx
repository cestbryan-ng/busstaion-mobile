import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

type Agency = {
  id: string;
  longName: string;
  logoUrl?: string;
  location: string;
  description?: string;
  rating?: number;
  taxStatus?: 'payé' | 'en attente' | 'en retard';
};

const TAX_STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  payé: {
    label: 'Taxe payée',
    labelEn: 'Tax paid',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  'en attente': {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c715',
  },
  'en retard': {
    label: 'En retard',
    labelEn: 'Overdue',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

export default function BsmAgencies() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const t = {
    fr: {
      title: 'Agences',
      subtitle: 'Agences affiliées à la gare',
      search: 'Rechercher une agence...',
      affiliated: 'Agences affiliées',
      active: 'Agences actives',
      overdueTaxes: 'Taxes en retard',
      noAgencies: 'Aucune agence',
    },
    en: {
      title: 'Agencies',
      subtitle: 'Agencies affiliated to the station',
      search: 'Search an agency...',
      affiliated: 'Affiliated agencies',
      active: 'Active agencies',
      overdueTaxes: 'Overdue taxes',
      noAgencies: 'No agencies',
    },
  }[lang];

  const loadAgencies = useCallback(async () => {
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const managerId = user?.userId || user?.id;
      if (!managerId) return;

      const headers = { Authorization: `Bearer ${token}` };
      const stationRes = await fetch(`${API_URL}/gare/manager/${managerId}`, {
        headers,
      });
      if (!stationRes.ok) return;
      const station = await stationRes.json();

      const res = await fetch(`${API_URL}/agence/gare-routiere/${station.id}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.content || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgencies();
    setRefreshing(false);
  }, [loadAgencies]);

  const activeCount = agencies.filter(a => a.taxStatus !== 'en retard').length;
  const overdueCount = agencies.filter(a => a.taxStatus === 'en retard').length;

  const filtered = useMemo(
    () =>
      agencies.filter(a => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.longName.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q)
        );
      }),
    [agencies, search],
  );

  const AgencyCard = ({ item }: { item: Agency }) => {
    const statusCfg =
      TAX_STATUS_CONFIG[item.taxStatus || 'payé'] || TAX_STATUS_CONFIG['payé'];
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
            <Text style={[styles.agencyLogoText, { color: colors.primary }]}>
              {item.longName.slice(0, 2).toUpperCase()}
            </Text>
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
            <View
              style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
              </Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {item.location}
            </Text>
          </View>
          {item.rating !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={[styles.ratingText, { color: theme.text }]}>
                {' '}
                {item.rating.toFixed(1)}
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
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <View>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            {t.subtitle}
          </Text>
        </View>
        <View
          style={[styles.avatarBtn, { backgroundColor: theme.backgroundAlt }]}
        >
          <Ionicons name="person-outline" size={18} color={theme.text} />
        </View>
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
        {/* Search */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInput,
              { borderColor: theme.border, backgroundColor: theme.background },
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
            style={[styles.filterBtn, { borderColor: theme.border }]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={theme.textStrong}
            />
          </TouchableOpacity>
        </View>

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
            <Ionicons name="business-outline" size={18} color={colors.error} />
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
              { backgroundColor: '#fef3c710', borderColor: '#fef3c730' },
            ]}
          >
            <Ionicons name="bus-outline" size={18} color="#d97706" />
            <Text style={[styles.statValue, { color: theme.textStrong }]}>
              {overdueCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              {t.overdueTaxes}
            </Text>
          </View>
        </View>

        {/* List */}
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={theme.text} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {t.noAgencies}
              </Text>
            </View>
          ) : (
            filtered.map(item => <AgencyCard key={item.id} item={item} />)
          )}
        </View>

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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  subtitle: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
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
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.md },
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { ...typography.body, fontSize: typography.sizes.xs },
  agencyDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
