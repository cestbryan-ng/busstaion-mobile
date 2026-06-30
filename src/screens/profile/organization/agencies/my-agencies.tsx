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
  agencyId: string;
  longName: string;
  shortName?: string;
  logoUrl?: string;
  location?: string;
  isActive: boolean;
  // enriched
  nbrLignes?: number;
  nbrVehicules?: number;
  nbrChauffeurs?: number;
  nbrVoyages?: number;
};

export default function OrgMyAgencies() {
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
      title: 'Mes agences',
      search: 'Rechercher une agence...',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      lignes: 'Lignes',
      vehicules: 'Véhicules',
      chauffeurs: 'Chauffeurs',
      voyages: 'Voyages',
      noAgencies: 'Aucune agence',
    },
    en: {
      title: 'My agencies',
      search: 'Search an agency...',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      lignes: 'Lines',
      vehicules: 'Vehicles',
      chauffeurs: 'Drivers',
      voyages: 'Trips',
      noAgencies: 'No agencies',
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

      const org = orgRaw ? JSON.parse(orgRaw) : null;
      if (!org?.organization_id) return;

      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `${API_URL}/organizations/agencies/${org.organization_id}`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      const list: Agency[] = data.content || data || [];

      // Enrich each agency with stats
      const enriched = await Promise.all(
        list.map(async a => {
          try {
            const [vRes, dRes, lRes, tRes] = await Promise.allSettled([
              fetch(`${API_URL}/vehicule/agence/${a.agencyId}`, { headers }),
              fetch(`${API_URL}/utilisateur/chauffeurs/${a.agencyId}`, {
                headers,
              }),
              fetch(`${API_URL}/ligne-service/agence/${a.agencyId}`, {
                headers,
              }),
              fetch(`${API_URL}/voyage/agence/${a.agencyId}?size=1`, {
                headers,
              }),
            ]);
            return {
              ...a,
              nbrVehicules:
                vRes.status === 'fulfilled' && vRes.value.ok
                  ? await vRes.value
                      .json()
                      .then((d: any) => (d.content || d || []).length)
                  : 0,
              nbrChauffeurs:
                dRes.status === 'fulfilled' && dRes.value.ok
                  ? await dRes.value
                      .json()
                      .then((d: any) => (d.content || d || []).length)
                  : 0,
              nbrLignes:
                lRes.status === 'fulfilled' && lRes.value.ok
                  ? await lRes.value
                      .json()
                      .then((d: any) => (d.content || d || []).length)
                  : 0,
              nbrVoyages:
                tRes.status === 'fulfilled' && tRes.value.ok
                  ? await tRes.value
                      .json()
                      .then((d: any) => d.totalElements || 0)
                  : 0,
            };
          } catch {
            return a;
          }
        }),
      );
      setAgencies(enriched);
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

  const filtered = useMemo(
    () =>
      agencies.filter(
        a =>
          !search.trim() ||
          a.longName.toLowerCase().includes(search.toLowerCase()),
      ),
    [agencies, search],
  );

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <Ionicons name="menu-outline" size={26} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('OrgCreateAgency')}>
          <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchInput,
            { borderColor: theme.border, backgroundColor: theme.backgroundAlt },
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
          <Ionicons name="options-outline" size={20} color={theme.textStrong} />
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
        contentContainerStyle={styles.list}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={theme.text} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t.noAgencies}
            </Text>
          </View>
        ) : (
          filtered.map(agency => (
            <TouchableOpacity
              key={agency.agencyId}
              style={[
                styles.agencyCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('OrgAgencyDetail', {
                  agencyId: agency.agencyId,
                })
              }
            >
              <View style={styles.agencyCardTop}>
                <View
                  style={[
                    styles.agencyLogo,
                    { backgroundColor: theme.backgroundAlt },
                  ]}
                >
                  {agency.logoUrl ? (
                    <Image
                      source={{ uri: agency.logoUrl }}
                      style={styles.agencyLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text
                      style={[styles.agencyLogoText, { color: colors.primary }]}
                    >
                      {(agency.shortName || agency.longName)
                        .slice(0, 3)
                        .toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.agencyMainInfo}>
                  <Text
                    style={[styles.agencyName, { color: theme.textStrong }]}
                    numberOfLines={1}
                  >
                    {agency.longName}
                  </Text>
                  {agency.location && (
                    <View style={styles.agencyLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={theme.text}
                      />
                      <Text
                        style={[styles.agencyLocation, { color: theme.text }]}
                      >
                        {' '}
                        {agency.location}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: agency.isActive
                        ? `${colors.success}15`
                        : `${colors.error}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: agency.isActive ? colors.success : colors.error,
                      },
                    ]}
                  >
                    {agency.isActive ? t.active : t.inactive}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.text} />
              </View>

              {/* Stats row */}
              <View
                style={[
                  styles.agencyStatsRow,
                  { borderTopColor: theme.border },
                ]}
              >
                {[
                  { label: t.lignes, value: agency.nbrLignes ?? 0 },
                  { label: t.vehicules, value: agency.nbrVehicules ?? 0 },
                  { label: t.chauffeurs, value: agency.nbrChauffeurs ?? 0 },
                  { label: t.voyages, value: agency.nbrVoyages ?? 0 },
                ].map((stat, i) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.agencyStat,
                      {
                        borderLeftColor: theme.border,
                        borderLeftWidth: i === 0 ? 0 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.agencyStatValue,
                        { color: theme.textStrong },
                      ]}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={[styles.agencyStatLabel, { color: theme.text }]}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))
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
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
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
  list: { padding: spacing.lg, gap: spacing.md },
  agencyCard: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  agencyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  agencyMainInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  agencyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  agencyLocation: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  agencyStatsRow: { flexDirection: 'row', borderTopWidth: 1 },
  agencyStat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  agencyStatValue: { ...typography.bodyBold, fontSize: typography.sizes.md },
  agencyStatLabel: { ...typography.body, fontSize: typography.sizes.xs },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
