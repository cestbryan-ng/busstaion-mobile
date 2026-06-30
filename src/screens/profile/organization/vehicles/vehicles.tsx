import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, useColorScheme, RefreshControl,
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

type Vehicle = {
  idVehicule: string;
  nom?: string;
  modele?: string;
  plaqueMatricule?: string;
  nbrPlaces?: number;
  lienPhoto?: string;
  description?: string;
};

type TravelClass = {
  idClassVoyage: string;
  nom: string;
  prix?: number;
};

const CLASS_COLORS: Record<string, string> = {
  VIP: '#1e3a8a', PREMIUM: '#d97706', STANDARD: '#16a34a', ECONOMIQUE: '#6b7280',
};

export default function OrgVehicles() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgVehicles'>>();
  const { agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [classes, setClasses] = useState<TravelClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const t = {
    fr: {
      title: 'Véhicules', search: 'Rechercher un véhicule...',
      places: 'places', active: 'ACTIF', maintenance: 'MAINTENANCE',
      travelClasses: 'Classes de voyage',
      noVehicles: 'Aucun véhicule', noClasses: 'Aucune classe',
    },
    en: {
      title: 'Vehicles', search: 'Search a vehicle...',
      places: 'seats', active: 'ACTIVE', maintenance: 'MAINTENANCE',
      travelClasses: 'Travel classes',
      noVehicles: 'No vehicles', noClasses: 'No classes',
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
      const [vRes, cRes] = await Promise.allSettled([
        fetch(`${API_URL}/vehicule/agence/${agencyId}`, { headers }),
        fetch(`${API_URL}/class-voyage/agence/${agencyId}`, { headers }),
      ]);

      if (vRes.status === 'fulfilled' && vRes.value.ok) {
        const d = await vRes.value.json(); setVehicles(d.content || d || []);
      }
      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const d = await cRes.value.json(); setClasses(d.content || d || []);
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

  const filteredVehicles = useMemo(() =>
    vehicles.filter(v => !search.trim() || [v.nom, v.modele, v.plaqueMatricule].some(f => f?.toLowerCase().includes(search.toLowerCase()))),
  [vehicles, search]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>{t.title}</Text>
        <TouchableOpacity>
          <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInput, { borderColor: theme.border, backgroundColor: theme.backgroundAlt }]}>
          <Ionicons name="search-outline" size={16} color={theme.text} />
          <TextInput
            style={[styles.searchText, { color: theme.textStrong }]}
            placeholder={t.search}
            placeholderTextColor={theme.text}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.border }]}>
          <Ionicons name="options-outline" size={20} color={theme.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
      >
        {/* Vehicles */}
        {filteredVehicles.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={48} color={theme.text} />
            <Text style={[styles.emptyText, { color: theme.text }]}>{t.noVehicles}</Text>
          </View>
        ) : (
          filteredVehicles.map(v => (
            <View key={v.idVehicule} style={[styles.vehicleCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={[styles.vehicleImage, { backgroundColor: theme.backgroundAlt }]}>
                {v.lienPhoto ? (
                  <Image source={{ uri: v.lienPhoto }} style={styles.vehicleImageInner} resizeMode="cover" />
                ) : (
                  <Ionicons name="bus-outline" size={28} color={theme.text} />
                )}
              </View>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleTopRow}>
                  <Text style={[styles.vehicleName, { color: theme.textStrong }]} numberOfLines={1}>
                    {v.nom || v.modele || '—'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${colors.success}15` }]}>
                    <Text style={[styles.statusText, { color: colors.success }]}>{t.active}</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.vehiclePlate, { color: theme.text }]}>{v.plaqueMatricule}</Text>
                <View style={styles.vehicleMeta}>
                  {v.nbrPlaces && (
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={12} color={theme.text} />
                      <Text style={[styles.metaText, { color: theme.text }]}> {v.nbrPlaces} {t.places}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}

        {/* Travel classes */}
        <View style={styles.classesSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>{t.travelClasses}</Text>
          <TouchableOpacity>
            <View style={[styles.addSmallBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {classes.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text, textAlign: 'center', marginTop: spacing.md }]}>
            {t.noClasses}
          </Text>
        ) : (
          classes.map(cls => {
            const classKey = cls.nom.toUpperCase().split(' ')[0];
            const classColor = CLASS_COLORS[classKey] || colors.primary;
            return (
              <View key={cls.idClassVoyage} style={[styles.classCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={[styles.classIcon, { backgroundColor: `${classColor}15` }]}>
                  <Ionicons name="star-outline" size={20} color={classColor} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: theme.textStrong }]}>{cls.nom}</Text>
                  {cls.prix !== undefined && (
                    <Text style={[styles.classPrice, { color: theme.text }]}>
                      {cls.prix.toLocaleString('fr-FR')} FCFA
                    </Text>
                  )}
                </View>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {classes.length > 0 && (
          <TouchableOpacity style={styles.seeMoreClasses}>
            <Text style={[styles.seeMoreText, { color: colors.primary }]}>
              {lang === 'fr' ? 'Voir toutes les classes' : 'View all classes'}
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  addBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 4, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm,
  },
  searchText: { ...typography.body, flex: 1, fontSize: typography.sizes.sm },
  filterBtn: { width: 44, height: 44, borderRadius: 4, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg },
  vehicleCard: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.md,
  },
  vehicleImage: { width: 90, justifyContent: 'center', alignItems: 'center' },
  vehicleImageInner: { width: '100%', height: '100%' },
  vehicleInfo: { flex: 1, padding: spacing.md },
  vehicleTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vehicleName: { ...typography.bodyBold, fontSize: typography.sizes.md, flex: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  vehiclePlate: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  vehicleMeta: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...typography.body, fontSize: typography.sizes.xs },
  classesSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, marginTop: spacing.md,
  },
  sectionTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  addSmallBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  classCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderRadius: 4, padding: spacing.md, marginBottom: spacing.md,
  },
  classIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  classInfo: { flex: 1 },
  className: { ...typography.bodyBold, fontSize: typography.sizes.md },
  classPrice: { ...typography.body, fontSize: typography.sizes.sm, marginTop: 2 },
  seeMoreClasses: { alignItems: 'center', paddingVertical: spacing.md },
  seeMoreText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});