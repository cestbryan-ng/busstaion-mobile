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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonServiceLineDetail } from '../../../../components/skeleton';

type Line = {
  id_planning: string;
  nom: string;
  description?: string;
  recurrence: string;
  statut: string;
  date_debut: string;
  date_fin?: string;
  nombre_creneaux?: number;
  nom_agence?: string;
  creneaux?: any[];
};

type Stats = {
  nombreVoyages?: number;
  tauxOccupation?: number;
  nombreReservations?: number;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ACTIF: { label: 'Active', color: colors.success, bg: `${colors.success}15` },
  INACTIF: { label: 'Inactive', color: colors.error, bg: `${colors.error}15` },
  BROUILLON: { label: 'Brouillon', color: '#d97706', bg: '#fef3c715' },
};

const RECURRENCE_FR: Record<string, string> = {
  QUOTIDIEN: 'Quotidien',
  HEBDOMADAIRE: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  ANNUEL: 'Annuel',
};

export default function OrgServiceLineDetail() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'OrgServiceLineDetail'>>();
  const { lineId, agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [line, setLine] = useState<Line | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const headers = { Authorization: `Bearer ${token}` };
      const [lineRes, statsRes] = await Promise.allSettled([
        fetch(`${API_URL}/ligne-service/${lineId}`, { headers }),
        fetch(`${API_URL}/statistiques/agence/${agencyId}/general`, {
          headers,
        }),
      ]);

      if (lineRes.status === 'fulfilled' && lineRes.value.ok) {
        const lineData = await lineRes.value.json();
        setLine(lineData);
        setCache(`org_service_line_${lineId}`, lineData);
        setIsOffline(false);
      } else {
        const cached = await getCache(`org_service_line_${lineId}`);
        if (cached) {
          setLine(cached);
          setIsOffline(true);
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        setStats(statsData);
        setCache(`org_service_line_stats_${agencyId}`, statsData);
      } else {
        const cachedStats = await getCache(`org_service_line_stats_${agencyId}`);
        if (cachedStats) {
          setStats(cachedStats);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache(`org_service_line_${lineId}`);
      if (cached) {
        setLine(cached);
        setIsOffline(true);
      }
      const cachedStats = await getCache(`org_service_line_stats_${agencyId}`);
      if (cachedStats) {
        setStats(cachedStats);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [lineId, agencyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleToggle = async () => {
    if (!line) return;
    setToggling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint =
        line.statut === 'ACTIF'
          ? `${API_URL}/ligne-service/${lineId}/desactiver`
          : `${API_URL}/ligne-service/${lineId}/activer`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLine(await res.json());
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  const handleGenerateTrips = async () => {
    // Navigate to generate trips flow
  };

  if (loading) return <SkeletonServiceLineDetail />;
  if (!line) return null;

  const statusCfg = STATUS_CONFIG[line.statut] || STATUS_CONFIG.INACTIF;
  const creneaux = line.creneaux || [];

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
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {lang === 'fr' ? 'Détails de la ligne' : 'Line details'}
        </Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={22} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={isOnline ? onRefresh : undefined} tintColor={colors.primary} />}>
        {/* Line header */}
        <View
          style={[
            styles.lineHeader,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.lineAvatar,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Ionicons
              name="git-branch-outline"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.lineHeaderInfo}>
            <Text style={[styles.lineName, { color: theme.textStrong }]}>
              {line.nom}
            </Text>
            <Text style={[styles.lineRecurrence, { color: theme.text }]}>
              {RECURRENCE_FR[line.recurrence] || line.recurrence}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {lang === 'fr' ? 'Informations générales' : 'General information'}
          </Text>
          {[
            {
              label: lang === 'fr' ? 'Agence' : 'Agency',
              value: line.nom_agence,
            },
            {
              label: lang === 'fr' ? 'Récurrence' : 'Recurrence',
              value: RECURRENCE_FR[line.recurrence] || line.recurrence,
            },
            {
              label: lang === 'fr' ? 'Date de début' : 'Start date',
              value: new Date(line.date_debut).toLocaleDateString(
                lang === 'fr' ? 'fr-FR' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              ),
            },
            {
              label: lang === 'fr' ? 'Statut' : 'Status',
              value: statusCfg.label,
            },
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
        </View>

        {/* Stats */}
        <View
          style={[
            styles.statsRow,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {[
            {
              value: stats?.nombreVoyages ?? 0,
              label: lang === 'fr' ? 'Voyages' : 'Trips',
            },
            {
              value: stats?.tauxOccupation
                ? `${Math.round(stats.tauxOccupation * 100)}%`
                : '0%',
              label: lang === 'fr' ? "Taux d'occ." : 'Occupancy',
            },
            {
              value: stats?.nombreReservations ?? 0,
              label: lang === 'fr' ? 'Réservations' : 'Reservations',
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
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Créneaux preview */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {lang === 'fr'
                ? `Créneaux (${creneaux.length})`
                : `Slots (${creneaux.length})`}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('OrgLineSlots', {
                  lineId,
                  agencyId,
                  lineName: line.nom,
                })
              }
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {lang === 'fr' ? 'Voir tout' : 'See all'}
              </Text>
            </TouchableOpacity>
          </View>
          {creneaux.slice(0, 3).map((creneau, i) => (
            <View
              key={creneau.id_creneau || i}
              style={[
                styles.slotRow,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <Text style={[styles.slotTime, { color: theme.textStrong }]}>
                {creneau.heure_depart?.hour?.toString().padStart(2, '0') ||
                  '00'}
                :
                {creneau.heure_depart?.minute?.toString().padStart(2, '0') ||
                  '00'}
              </Text>
              <View style={styles.slotInfo}>
                <Text
                  style={[styles.slotRoute, { color: theme.textStrong }]}
                  numberOfLines={1}
                >
                  {creneau.lieu_depart} → {creneau.lieu_arrive}
                </Text>
                <Text style={[styles.slotMeta, { color: theme.text }]}>
                  {creneau.nbr_places_disponibles} places
                </Text>
              </View>
              <View
                style={[
                  styles.slotStatus,
                  {
                    backgroundColor: creneau.actif
                      ? `${colors.success}15`
                      : `${colors.error}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.slotStatusText,
                    { color: creneau.actif ? colors.success : colors.error },
                  ]}
                >
                  {creneau.actif ? 'ACTIF' : 'INACTIF'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                borderColor:
                  line.statut === 'ACTIF' ? colors.error : colors.success,
              },
            ]}
            onPress={handleToggle}
            disabled={toggling}
          >
            <Text
              style={[
                styles.toggleBtnText,
                {
                  color:
                    line.statut === 'ACTIF' ? colors.error : colors.success,
                },
              ]}
            >
              {toggling
                ? '...'
                : line.statut === 'ACTIF'
                ? lang === 'fr'
                  ? 'Désactiver la ligne'
                  : 'Deactivate line'
                : lang === 'fr'
                ? 'Activer la ligne'
                : 'Activate line'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
            onPress={handleGenerateTrips}
          >
            <Text style={styles.generateBtnText}>
              {lang === 'fr' ? 'Générer des voyages' : 'Generate trips'}
            </Text>
          </TouchableOpacity>
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  lineAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineHeaderInfo: { flex: 1 },
  lineName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  lineRecurrence: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { ...typography.heading, fontSize: typography.sizes.xl },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  slotTime: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    width: 52,
  },
  slotInfo: { flex: 1 },
  slotRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  slotMeta: { ...typography.body, fontSize: typography.sizes.xs },
  slotStatus: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotStatusText: { ...typography.bodyBold, fontSize: 9 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  generateBtn: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    color: '#fff',
  },
});
