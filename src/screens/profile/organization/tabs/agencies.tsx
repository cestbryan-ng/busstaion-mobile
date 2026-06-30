import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  isActive: boolean;
  gareRoutiereId?: string;
};

export default function OrgAgencies() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [vehicles, setVehicles] = useState(0);
  const [drivers, setDrivers] = useState(0);
  const [lines, setLines] = useState(0);
  const [tripsToday, setTripsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Agences',
      myAgencies: 'Mes agences',
      total: 'Total',
      stationPartners: 'Gare routière',
      partners: 'Partenaires',
      quickOverview: 'Aperçu rapide',
      vehicles: 'Véhicules',
      drivers: 'Chauffeurs',
      serviceLines: 'Lignes de service',
      active: 'Actives',
      tripsToday: "Voyages aujourd'hui",
      published: 'Publiés',
      quickAccess: 'Accès rapides',
      myAgenciesDesc: 'Voir et gérer vos agences',
      stationsDesc: 'Voir les gares et affiliations',
      vehiclesDesc: 'Gérer vos véhicules',
      linesDesc: 'Gérer vos lignes et créneaux',
      tripsDesc: 'Gérer vos voyages et brouillons',
      reservationsDesc: 'Voir les réservations',
      policyDesc: "Gérer votre politique d'annulation",
    },
    en: {
      title: 'Agencies',
      myAgencies: 'My agencies',
      total: 'Total',
      stationPartners: 'Bus stations',
      partners: 'Partners',
      quickOverview: 'Quick overview',
      vehicles: 'Vehicles',
      drivers: 'Drivers',
      serviceLines: 'Service lines',
      active: 'Active',
      tripsToday: 'Trips today',
      published: 'Published',
      quickAccess: 'Quick access',
      myAgenciesDesc: 'View and manage your agencies',
      stationsDesc: 'View stations and affiliations',
      vehiclesDesc: 'Manage your vehicles',
      linesDesc: 'Manage your lines and slots',
      tripsDesc: 'Manage your trips and drafts',
      reservationsDesc: 'View reservations',
      policyDesc: 'Manage your cancellation policy',
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
      const orgId = org?.organization_id;
      if (!orgId) return;

      const headers = { Authorization: `Bearer ${token}` };
      const agenciesRes = await fetch(
        `${API_URL}/organizations/agencies/${orgId}`,
        { headers },
      );
      if (!agenciesRes.ok) return;
      const data = await agenciesRes.json();
      const list: Agency[] = data.content || data || [];
      setAgencies(list);

      // Aggregate from first agency for overview
      if (list.length > 0) {
        const firstId = list[0].agencyId;
        const [vRes, dRes, lRes, tRes] = await Promise.allSettled([
          fetch(`${API_URL}/vehicule/agence/${firstId}`, { headers }),
          fetch(`${API_URL}/utilisateur/chauffeurs/${firstId}`, { headers }),
          fetch(`${API_URL}/ligne-service/agence/${firstId}`, { headers }),
          fetch(`${API_URL}/voyage/agence/${firstId}?size=100`, { headers }),
        ]);

        if (vRes.status === 'fulfilled' && vRes.value.ok) {
          const d = await vRes.value.json();
          setVehicles((d.content || d || []).length);
        }
        if (dRes.status === 'fulfilled' && dRes.value.ok) {
          const d = await dRes.value.json();
          setDrivers((d.content || d || []).length);
        }
        if (lRes.status === 'fulfilled' && lRes.value.ok) {
          const d = await lRes.value.json();
          const activeLines = (d.content || d || []).filter(
            (l: any) => l.statut === 'ACTIF',
          );
          setLines(activeLines.length);
        }
        if (tRes.status === 'fulfilled' && tRes.value.ok) {
          const d = await tRes.value.json();
          const today = new Date().toDateString();
          const todayPublished = (d.content || d || []).filter(
            (trip: any) =>
              trip.statusVoyage === 'PUBLIE' &&
              new Date(trip.dateDepartPrev).toDateString() === today,
          );
          setTripsToday(todayPublished.length);
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

  const stationCount = new Set(
    agencies.map(a => a.gareRoutiereId).filter(Boolean),
  ).size;
  const firstAgencyId = agencies[0]?.agencyId;

  const QUICK_ACCESS = [
    {
      icon: 'business-outline',
      label: t.myAgencies,
      desc: t.myAgenciesDesc,
      onPress: () => navigation.navigate('OrgMyAgencies'),
    },
    {
      icon: 'location-outline',
      label: t.stationPartners,
      desc: t.stationsDesc,
      onPress: () => navigation.navigate('OrgStations'),
    },
    {
      icon: 'car-outline',
      label: t.vehicles,
      desc: t.vehiclesDesc,
      onPress: firstAgencyId
        ? () => navigation.navigate('OrgVehicles', { agencyId: firstAgencyId })
        : () => {},
    },
    {
      icon: 'git-branch-outline',
      label: t.serviceLines,
      desc: t.linesDesc,
      onPress: firstAgencyId
        ? () =>
            navigation.navigate('OrgServiceLines', { agencyId: firstAgencyId })
        : () => {},
    },
    {
      icon: 'bus-outline',
      label: 'Voyages & Brouillons',
      desc: t.tripsDesc,
      onPress: () => {},
    },
    {
      icon: 'calendar-outline',
      label: 'Réservations',
      desc: t.reservationsDesc,
      onPress: () => {},
    },
    {
      icon: 'shield-outline',
      label: "Politique d'annulation",
      desc: t.policyDesc,
      onPress: () => {},
    },
  ];

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
        <TouchableOpacity>
          <Ionicons name="menu-outline" size={26} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ width: 26 }} />
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
        {/* Top stats row */}
        <View style={styles.topStats}>
          <View
            style={[
              styles.topStatCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.topStatIcon,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.topStatValue, { color: theme.textStrong }]}>
              {agencies.length}
            </Text>
            <Text style={[styles.topStatLabel, { color: theme.text }]}>
              {t.myAgencies}
            </Text>
            <Text style={[styles.topStatSub, { color: theme.text }]}>
              {t.total}
            </Text>
          </View>
          <View
            style={[
              styles.topStatCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.topStatIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={22}
                color={colors.success}
              />
            </View>
            <Text style={[styles.topStatValue, { color: theme.textStrong }]}>
              {stationCount}
            </Text>
            <Text style={[styles.topStatLabel, { color: theme.text }]}>
              {t.stationPartners}
            </Text>
            <Text style={[styles.topStatSub, { color: theme.text }]}>
              {t.partners}
            </Text>
          </View>
        </View>

        {/* Quick overview 2x2 grid */}
        <View
          style={[
            styles.overviewSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.quickOverview}
          </Text>
          <View style={styles.overviewGrid}>
            {[
              {
                icon: 'car-outline',
                color: '#7c3aed',
                bg: '#f5f3ff15',
                value: vehicles,
                label: t.vehicles,
                sub: t.total,
              },
              {
                icon: 'person-outline',
                color: colors.success,
                bg: `${colors.success}15`,
                value: drivers,
                label: t.drivers,
                sub: t.total,
              },
              {
                icon: 'git-branch-outline',
                color: colors.primary,
                bg: `${colors.primary}15`,
                value: lines,
                label: t.serviceLines,
                sub: t.active,
              },
              {
                icon: 'bus-outline',
                color: '#d97706',
                bg: '#fef3c715',
                value: tripsToday,
                label: t.tripsToday,
                sub: t.published,
              },
            ].map(item => (
              <View
                key={item.label}
                style={[styles.overviewCell, { borderColor: theme.border }]}
              >
                <View
                  style={[styles.overviewIcon, { backgroundColor: item.bg }]}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text
                  style={[styles.overviewValue, { color: theme.textStrong }]}
                >
                  {item.value}
                </Text>
                <Text style={[styles.overviewLabel, { color: theme.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.overviewSub, { color: theme.text }]}>
                  {item.sub}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick access */}
        <View
          style={[
            styles.quickAccessSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.quickAccess}
          </Text>
          {QUICK_ACCESS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.quickItem,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickIcon,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.quickText}>
                <Text style={[styles.quickLabel, { color: theme.textStrong }]}>
                  {item.label}
                </Text>
                <Text style={[styles.quickDesc, { color: theme.text }]}>
                  {item.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  topStats: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  topStatCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: 3,
  },
  topStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  topStatValue: { ...typography.heading, fontSize: typography.sizes.xxl },
  topStatLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  topStatSub: { ...typography.body, fontSize: typography.sizes.xs },
  overviewSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  overviewCell: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: 2,
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  overviewValue: { ...typography.heading, fontSize: typography.sizes.xl },
  overviewLabel: { ...typography.body, fontSize: typography.sizes.xs },
  overviewSub: { ...typography.body, fontSize: 9 },
  quickAccessSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    padding: spacing.md,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickText: { flex: 1 },
  quickLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  quickDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
});
