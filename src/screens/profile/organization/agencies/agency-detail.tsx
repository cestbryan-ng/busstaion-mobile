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
  Linking,
  RefreshControl,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonOrgAgencyDetail } from '../../../../components/skeleton';
import ShapePlaceholder from '../../../../assets/placeholders/shape.svg';

type Agency = {
  id: string;
  agencyId?: string;
  longName: string;
  shortName?: string;
  logoUrl?: string;
  location?: string;
  description?: string;
  greetingMessage?: string;
  socialNetwork?: string;
  isActive: boolean;
  rating?: number;
  contact?: { email?: string; phone?: string; website?: string };
  gareIds?: string[];
  moyensPaiement?: string[];
  vehiculeIdDefaut?: string;
  chauffeurIdDefaut?: string;
};

type Stats = {
  nombreEmployes?: number;
  nombreChauffeurs?: number;
  nombreVoyages?: number;
  nombreReservations?: number;
  revenus?: number;
  nouveauxUtilisateurs?: number;
  tauxOccupation?: number;
  voyagesParStatut?: Record<string, number>;
  reservationsParStatut?: Record<string, number>;
};

type TabType = 'agence' | 'ressources' | 'lignes' | 'finances';

export default function OrgAgencyDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgAgencyDetail'>>();
  const { agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('agence');
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: "Détails de l'agence",
      tabs: {
        agence: 'Agence',
        ressources: 'Ressources',
        lignes: 'Lignes',
        finances: 'Finances',
      },
      generalInfo: 'Informations générales',
      fullName: 'Nom complet',
      shortName: 'Nom court',
      location: 'Localisation',
      station: 'Gare routière',
      socialNetwork: 'Réseaux sociaux',
      description: 'Description',
      greeting: "Message d'accueil",
      stats: 'Statistiques',
      voyages: 'Voyages',
      employees: 'Employés',
      drivers: 'Chauffeurs',
      revenue: 'Revenus',
      total: 'Total',
      paymentMethods: 'Moyens de paiement acceptés',
      defaultResources: 'Ressources par défaut',
      defaultVehicle: 'Véhicule',
      defaultDriver: 'Chauffeur',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      manageLines: 'Gérer les lignes',
      manageTaxes: 'Gérer les taxes',
      manageVehicles: 'Gérer les véhicules',
      manageAffiliations: 'Gérer les affiliations',
      manageEmployees: 'Gérer les employés',
    },
    en: {
      title: 'Agency details',
      tabs: {
        agence: 'Agency',
        ressources: 'Resources',
        lignes: 'Lines',
        finances: 'Finances',
      },
      generalInfo: 'General information',
      fullName: 'Full name',
      shortName: 'Short name',
      location: 'Location',
      station: 'Bus station',
      socialNetwork: 'Social networks',
      description: 'Description',
      greeting: 'Greeting message',
      stats: 'Statistics',
      voyages: 'Trips',
      employees: 'Employees',
      drivers: 'Drivers',
      revenue: 'Revenue',
      total: 'Total',
      paymentMethods: 'Accepted payment methods',
      defaultResources: 'Default resources',
      defaultVehicle: 'Vehicle',
      defaultDriver: 'Driver',
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      manageLines: 'Manage lines',
      manageTaxes: 'Manage taxes',
      manageVehicles: 'Manage vehicles',
      manageAffiliations: 'Manage affiliations',
      manageEmployees: 'Manage employees',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const headers = { Authorization: `Bearer ${token}` };
      const [agencyRes, statsRes] = await Promise.allSettled([
        fetch(`${API_URL}/agence/${agencyId}`, { headers }),
        fetch(`${API_URL}/statistiques/agence/${agencyId}/general`, {
          headers,
        }),
      ]);

      if (agencyRes.status === 'fulfilled' && agencyRes.value.ok) {
        const data = await agencyRes.value.json();
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
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleShare = async () => {
    if (!agency) return;
    try {
      await Share.share({
        message: `🏢 ${agency.longName}${agency.shortName ? ` (${agency.shortName})` : ''}${agency.location ? `\n📍 ${agency.location}` : ''}${agency.description ? `\n${agency.description}` : ''}`,
        title: agency.longName,
      });
    } catch {
      // silent
    }
  };

  if (loading) return <SkeletonOrgAgencyDetail />;

  if (!agency) return null;

  const realId = agency.id || agency.agencyId || agencyId;
  const hasLogo = !!agency.logoUrl && agency.logoUrl.startsWith('http');

  const AgenceTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
          {t.generalInfo}
        </Text>
        {[
          { label: t.fullName, value: agency.longName },
          { label: t.shortName, value: agency.shortName },
          { label: t.location, value: agency.location },
          { label: t.station, value: stationName },
          { label: t.socialNetwork, value: agency.socialNetwork },
        ]
          .filter(r => r.value)
          .map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.infoLabel, { color: theme.text }]}>
                {row.label}
              </Text>
              <Text style={[styles.infoValue, { color: theme.textStrong }]}>
                {row.value}
              </Text>
            </View>
          ))}
        {agency.description && (
          <View style={[styles.infoBlock, { borderTopColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.description}
            </Text>
            <Text style={[styles.infoBodyText, { color: theme.text }]}>
              {agency.description}
            </Text>
          </View>
        )}
        {agency.greetingMessage && (
          <View style={[styles.infoBlock, { borderTopColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.greeting}
            </Text>
            <Text style={[styles.infoBodyText, { color: theme.text }]}>
              {agency.greetingMessage}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View
        style={[
          styles.statsGrid,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            {
              color: theme.textStrong,
              padding: spacing.md,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          {t.stats}
        </Text>
        <View style={styles.statsRow}>
          {[
            {
              label: t.voyages,
              value: stats?.nombreVoyages ?? 0,
              sub: t.total,
            },
            {
              label: t.employees,
              value: stats?.nombreEmployes ?? 0,
              sub: t.total,
            },
            {
              label: t.drivers,
              value: stats?.nombreChauffeurs ?? 0,
              sub: t.total,
            },
            {
              label: t.revenue,
              value: stats?.revenus
                ? `${(stats.revenus / 1000000).toFixed(2)}M`
                : '0',
              sub: 'FCFA',
            },
          ].map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statCell,
                {
                  borderLeftColor: theme.border,
                  borderLeftWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.statCellValue, { color: colors.primary }]}>
                {s.value}
              </Text>
              <Text style={[styles.statCellLabel, { color: theme.text }]}>
                {s.label}
              </Text>
              <Text style={[styles.statCellSub, { color: theme.text }]}>
                {s.sub}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment methods */}
      {agency.moyensPaiement && agency.moyensPaiement.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.paymentMethods}
          </Text>
          <View style={styles.pillsRow}>
            {agency.moyensPaiement.map(m => (
              <View
                key={m}
                style={[
                  styles.pill,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}20`,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.success}
                />
                <Text style={[styles.pillText, { color: colors.primary }]}>
                  {m}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Default resources */}
      {(agency.vehiculeIdDefaut || agency.chauffeurIdDefaut) && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.defaultResources}
          </Text>
          {agency.vehiculeIdDefaut && (
            <View style={styles.resourceRow}>
              <Ionicons name="car-outline" size={16} color={theme.text} />
              <Text style={[styles.resourceLabel, { color: theme.text }]}>
                {t.defaultVehicle}
              </Text>
              <Text style={[styles.resourceValue, { color: theme.textStrong }]}>
                Toyota Hiace · LT-1234-YA
              </Text>
            </View>
          )}
          {agency.chauffeurIdDefaut && (
            <View
              style={[
                styles.resourceRow,
                { borderTopColor: theme.border, borderTopWidth: 1 },
              ]}
            >
              <Ionicons name="person-outline" size={16} color={theme.text} />
              <Text style={[styles.resourceLabel, { color: theme.text }]}>
                {t.defaultDriver}
              </Text>
              <Text style={[styles.resourceValue, { color: theme.textStrong }]}>
                Jean Dupont
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const RessourcesTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
    >
      <TouchableOpacity
        style={[
          styles.navCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        onPress={() => navigation.navigate('OrgVehicles', { agencyId: realId })}
      >
        <View
          style={[
            styles.navCardIcon,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <Ionicons name="car-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.navCardText}>
          <Text style={[styles.navCardTitle, { color: theme.textStrong }]}>
            {lang === 'fr' ? 'Gérer les classes et véhicules' : 'Manage classes & vehicles'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.navCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        onPress={() =>
          navigation.navigate('OrgEmployees', {
            agencyId: realId,
            agencyName: agency.longName,
          })
        }
      >
        <View
          style={[
            styles.navCardIcon,
            { backgroundColor: `${colors.success}15` },
          ]}
        >
          <Ionicons name="people-outline" size={22} color={colors.success} />
        </View>
        <View style={styles.navCardText}>
          <Text style={[styles.navCardTitle, { color: theme.textStrong }]}>
            {t.manageEmployees}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    </ScrollView>
  );

  const LignesTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
    >
      <TouchableOpacity
        style={[
          styles.navCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        onPress={() =>
          navigation.navigate('OrgServiceLines', {
            agencyId: realId,
            agencyName: agency.longName,
          })
        }
      >
        <View
          style={[
            styles.navCardIcon,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <Ionicons
            name="git-branch-outline"
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={styles.navCardText}>
          <Text style={[styles.navCardTitle, { color: theme.textStrong }]}>
            {t.manageLines}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    </ScrollView>
  );

  const FinancesTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
    >
      <TouchableOpacity
        style={[
          styles.navCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        onPress={() =>
          navigation.navigate('OrgAffiliationTaxes', {
            agencyId: realId,
            agencyName: agency.longName,
          })
        }
      >
        <View
          style={[styles.navCardIcon, { backgroundColor: `${colors.error}15` }]}
        >
          <Ionicons name="cash-outline" size={22} color={colors.error} />
        </View>
        <View style={styles.navCardText}>
          <Text style={[styles.navCardTitle, { color: theme.textStrong }]}>
            {t.manageTaxes}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.navCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        onPress={() =>
          navigation.navigate('OrgAffiliations', { agencyId: realId })
        }
      >
        <View
          style={[
            styles.navCardIcon,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <Ionicons name="link-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.navCardText}>
          <Text style={[styles.navCardTitle, { color: theme.textStrong }]}>
            {t.manageAffiliations}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    </ScrollView>
  );

  const TABS: { key: TabType; label: string }[] = [
    { key: 'agence', label: t.tabs.agence },
    { key: 'ressources', label: t.tabs.ressources },
    { key: 'lignes', label: t.tabs.lignes },
    { key: 'finances', label: t.tabs.finances },
  ];

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
        <Text style={[styles.headerTitle, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      {/* Agency banner */}
      <View
        style={[
          styles.agencyBanner,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.bannerLogo,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          {hasLogo ? (
            <Image
              source={{ uri: agency.logoUrl! }}
              style={styles.bannerLogoImage}
              resizeMode="contain"
            />
          ) : (
            <ShapePlaceholder width="70%" height="70%" />
          )}
        </View>
        <View style={styles.bannerInfo}>
          <Text style={[styles.bannerName, { color: theme.textStrong }]}>
            {agency.longName}
          </Text>
          {agency.location && (
            <View style={styles.bannerLocationRow}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.bannerLocation, { color: theme.text }]}>
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
              { color: agency.isActive ? colors.success : colors.error },
            ]}
          >
            {agency.isActive ? t.active : t.inactive}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabsRow,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : theme.text },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'agence' && <AgenceTab />}
        {activeTab === 'ressources' && <RessourcesTab />}
        {activeTab === 'lignes' && <LignesTab />}
        {activeTab === 'finances' && <FinancesTab />}
      </View>
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
  agencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  bannerLogo: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerLogoImage: { width: '100%', height: '100%' },
  bannerLogoText: { ...typography.bodyBold, fontSize: typography.sizes.md },
  bannerInfo: { flex: 1 },
  bannerName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  bannerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bannerLocation: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  tabContent: { padding: spacing.lg, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: 4, padding: spacing.md },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    flex: 1,
    textAlign: 'right',
  },
  infoBlock: { borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.xs },
  infoBodyText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  statsGrid: { borderWidth: 1, borderRadius: 4 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statCellValue: { ...typography.heading, fontSize: typography.sizes.lg },
  statCellLabel: { ...typography.body, fontSize: typography.sizes.xs },
  statCellSub: { ...typography.body, fontSize: 9 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pillText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  resourceLabel: { ...typography.body, fontSize: typography.sizes.sm, flex: 1 },
  resourceValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  navCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardText: { flex: 1 },
  navCardTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
});
