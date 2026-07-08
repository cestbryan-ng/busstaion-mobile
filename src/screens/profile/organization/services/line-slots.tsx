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
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';

type Slot = {
  id_creneau: string;
  lieu_depart: string;
  lieu_arrive: string;
  heure_depart?: { hour: number; minute: number };
  heure_arrivee?: { hour: number; minute: number };
  nbr_places_disponibles?: number;
  actif: boolean;
};

export default function OrgLineSlots() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const [isOffline, setIsOffline] = useState(false);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgLineSlots'>>();
  const { lineId, lineName } = route.params;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/ligne-service/${lineId}/creneaux`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
        setCache(`org_line_slots_${lineId}`, data);
        setIsOffline(false);
      } else {
        const cached = await getCache(`org_line_slots_${lineId}`);
        if (cached) {
          setSlots(cached);
          setIsOffline(true);
        }
      }
    } catch {
      const cached = await getCache(`org_line_slots_${lineId}`);
      if (cached) {
        setSlots(cached);
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatTime = (t?: { hour: number; minute: number }) =>
    t
      ? `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(
          2,
          '0',
        )}`
      : '—';

  if (loading) return <SkeletonListScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      {(!isOnline || isOffline) && <OfflineBanner />}
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
            Créneaux de la ligne
          </Text>
          {lineName && (
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {lineName}
            </Text>
          )}
        </View>
        <TouchableOpacity>
          <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={isOnline ? onRefresh : undefined} tintColor={colors.primary} />}
      >
        {slots.map((slot, i) => (
          <View
            key={slot.id_creneau || i}
            style={[
              styles.slotCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.slotTime, { color: theme.textStrong }]}>
              {formatTime(slot.heure_depart)}
            </Text>
            <View style={styles.slotInfo}>
              <Text
                style={[styles.slotRoute, { color: theme.textStrong }]}
                numberOfLines={1}
              >
                {slot.lieu_depart} → {slot.lieu_arrive}
              </Text>
              <Text style={[styles.slotMeta, { color: theme.text }]}>
                {slot.lieu_depart} • {slot.nbr_places_disponibles ?? '—'} places
              </Text>
              {slot.heure_arrivee && (
                <Text style={[styles.slotArrive, { color: theme.text }]}>
                  Arrivée : {formatTime(slot.heure_arrivee)}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: slot.actif
                    ? `${colors.success}15`
                    : `${colors.error}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: slot.actif ? colors.success : colors.error },
                ]}
              >
                {slot.actif ? 'ACTIF' : 'INACTIF'}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        ))}
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
  subtitle: { ...typography.body, fontSize: typography.sizes.xs },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: spacing.lg },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  slotTime: { ...typography.heading, fontSize: typography.sizes.md, width: 52 },
  slotInfo: { flex: 1 },
  slotRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  slotMeta: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  slotArrive: { ...typography.body, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
});
