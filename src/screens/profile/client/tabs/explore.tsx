import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';
import { EmptyState } from '../../../../components/empty-state';

type Agency = {
  agencyId: string;
  longName: string;
  location: string;
  photoUrl?: string;
  description?: string;
  ratingAverage?: number;
  numberOfReviews?: number;
  contact?: { phone?: string; email?: string; website?: string };
};

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  photoUrl?: string;
  services: string[];
  nbreAgence: number;
  ratingAverage?: number;
  numberOfReviews?: number;
};

type TabType = 'agencies' | 'gares';

const SERVICES = [
  'WIFI',
  'PARKING',
  'RESTAURATION',
  'SALLE_ATTENTE',
  'TOILETTES',
  'SECURITE',
];

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-checkmark-outline',
};

const SERVICE_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  PARKING: { fr: 'Parking', en: 'Parking' },
  RESTAURATION: { fr: 'Restauration', en: 'Dining' },
  SALLE_ATTENTE: { fr: 'Salle attente', en: 'Waiting room' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  SECURITE: { fr: 'Sécurité', en: 'Security' },
};

export default function Explore() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [tab, setTab] = useState<TabType>('agencies');
  const [search, setSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showAllServices, setShowAllServices] = useState(false);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [gares, setGares] = useState<Gare[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingGares, setLoadingGares] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: 'Explorer',
      subtitle: 'Découvrez nos agences partenaires\net nos gares routières',
      tabAgencies: 'Agences',
      tabGares: 'Gares routières',
      searchAgency: 'Rechercher une agence ou une ville...',
      searchGare: 'Rechercher une gare ou une ville...',
      popularAgencies: 'Agences populaires',
      nearbyGares: 'Gares à proximité',
      serviceFilters: 'Filtres de services',
      seeAll: 'Voir tout',
      seeLess: 'Réduire',
      reviews: (n: number) => `${n} avis`,
      affiliatedGares: (n: number) =>
        `${n} gare${n > 1 ? 's' : ''} affiliée${n > 1 ? 's' : ''}`,
      affiliatedAgencies: (n: number) =>
        `${n} agence${n > 1 ? 's' : ''} affiliée${n > 1 ? 's' : ''}`,
      noAgencies: 'Aucune agence trouvée',
      noGares: 'Aucune gare trouvée',
    },
    en: {
      title: 'Explorer',
      subtitle: 'Discover our partner agencies\nand bus stations',
      tabAgencies: 'Agencies',
      tabGares: 'Bus stations',
      searchAgency: 'Search an agency or city...',
      searchGare: 'Search a station or city...',
      popularAgencies: 'Popular agencies',
      nearbyGares: 'Nearby stations',
      serviceFilters: 'Service filters',
      seeAll: 'See all',
      seeLess: 'Show less',
      reviews: (n: number) => `${n} review${n > 1 ? 's' : ''}`,
      affiliatedGares: (n: number) =>
        `${n} affiliated station${n > 1 ? 's' : ''}`,
      affiliatedAgencies: (n: number) =>
        `${n} affiliated agenc${n > 1 ? 'ies' : 'y'}`,
      noAgencies: 'No agencies found',
      noGares: 'No stations found',
    },
  }[lang];

  const loadAgencies = useCallback(async () => {
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/agence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgencies(data.content || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingAgencies(false);
    }
  }, []);

  const loadGares = useCallback(async (services: string[] = []) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const params = services.length ? `?services=${services.join(',')}` : '';
      const res = await fetch(`${API_URL}/gare${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGares(data.content || data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingGares(false);
    }
  }, []);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);
  useEffect(() => {
    loadGares(selectedServices);
  }, [loadGares, selectedServices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAgencies(), loadGares(selectedServices)]);
    setRefreshing(false);
  }, [loadAgencies, loadGares, selectedServices]);

  const toggleService = (s: string) => {
    setSelectedServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s],
    );
  };

  const filteredAgencies = useMemo(
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

  const filteredGares = useMemo(
    () =>
      gares.filter(g => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          g.nomGareRoutiere.toLowerCase().includes(q) ||
          g.ville?.toLowerCase().includes(q)
        );
      }),
    [gares, search],
  );

  const visibleServices = showAllServices ? SERVICES : SERVICES.slice(0, 6);

  const AgencyCard = ({ item }: { item: Agency }) => (
    <TouchableOpacity
      style={[
        styles.agencyCard,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('AgencyDetail', { agencyId: item.agencyId })
      }
    >
      {/* Logo */}
      <View
        style={[styles.agencyLogo, { backgroundColor: theme.backgroundAlt }]}
      >
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.agencyLogoImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.agencyLogoLetter, { color: colors.primary }]}>
            {item.longName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.agencyInfo}>
        <Text
          style={[styles.agencyName, { color: theme.textStrong }]}
          numberOfLines={1}
        >
          {item.longName}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={theme.text} />
          <Text
            style={[styles.locationText, { color: theme.text }]}
            numberOfLines={1}
          >
            {' '}
            {item.location}
          </Text>
        </View>
        {item.ratingAverage !== undefined && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={[styles.ratingText, { color: theme.text }]}>
              {' '}
              {item.ratingAverage.toFixed(1)} (
              {t.reviews(item.numberOfReviews || 0)})
            </Text>
          </View>
        )}
        {item.description && (
          <Text
            style={[styles.agencyDesc, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.text} />
    </TouchableOpacity>
  );

  const GareCard = ({ item }: { item: Gare }) => {
    const visibleSvcs = item.services?.slice(0, 3) || [];
    const extra = Math.max(0, (item.services?.length || 0) - 3);

    return (
      <TouchableOpacity
        style={[
          styles.gareCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('StationDetail', {
            stationId: item.idGareRoutiere,
          })
        }
      >
        {/* Image */}
        <View
          style={[styles.gareImage, { backgroundColor: theme.backgroundAlt }]}
        >
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.gareImageInner}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="business-outline" size={28} color={theme.text} />
          )}
        </View>

        {/* Info */}
        <View style={styles.gareInfo}>
          <Text
            style={[styles.gareName, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {item.nomGareRoutiere}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.text} />
            <Text
              style={[styles.locationText, { color: theme.text }]}
              numberOfLines={1}
            >
              {' '}
              {item.ville}
              {item.quartier ? `, ${item.quartier}` : ''}
            </Text>
          </View>
          {item.ratingAverage !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={[styles.ratingText, { color: theme.text }]}>
                {' '}
                {item.ratingAverage.toFixed(1)} (
                {t.reviews(item.numberOfReviews || 0)})
              </Text>
            </View>
          )}

          {/* Services chips */}
          <View style={styles.servicesRow}>
            {visibleSvcs.map(s => (
              <View
                key={s}
                style={[
                  styles.serviceChip,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Text
                  style={[styles.serviceChipText, { color: colors.primary }]}
                >
                  {lang === 'fr'
                    ? SERVICE_LABELS[s]?.fr
                    : SERVICE_LABELS[s]?.en}
                </Text>
              </View>
            ))}
            {extra > 0 && (
              <View
                style={[
                  styles.serviceChip,
                  { backgroundColor: theme.backgroundAlt },
                ]}
              >
                <Text style={[styles.serviceChipText, { color: theme.text }]}>
                  +{extra}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="people-outline" size={12} color={theme.text} />
            <Text style={[styles.locationText, { color: theme.text }]}>
              {' '}
              {t.affiliatedAgencies(item.nbreAgence)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    );
  };

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
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.textStrong }]}>
              {t.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t.subtitle}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.textStrong}
            />
          </TouchableOpacity>
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
          {/* Tabs */}
          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: theme.background },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'agencies' && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
                tab !== 'agencies' && { borderColor: theme.border },
              ]}
              onPress={() => {
                setTab('agencies');
                setSearch('');
              }}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={tab === 'agencies' ? colors.primary : theme.text}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: tab === 'agencies' ? colors.primary : theme.text },
                ]}
              >
                {t.tabAgencies}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === 'gares' && {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
                tab !== 'gares' && { borderColor: theme.border },
              ]}
              onPress={() => {
                setTab('gares');
                setSearch('');
              }}
            >
              <Ionicons
                name="bus-outline"
                size={16}
                color={tab === 'gares' ? colors.primary : theme.text}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: tab === 'gares' ? colors.primary : theme.text },
                ]}
              >
                {t.tabGares}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={[styles.searchRow, { backgroundColor: theme.background }]}
          >
            <View
              style={[
                styles.searchInput,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundAlt,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={theme.text} />
              <TextInput
                style={[styles.searchText, { color: theme.textStrong }]}
                placeholder={tab === 'agencies' ? t.searchAgency : t.searchGare}
                placeholderTextColor={theme.text}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.text} />
                </TouchableOpacity>
              )}
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

          {/* Service filters — only for gares tab */}
          {tab === 'gares' && (
            <View
              style={[
                styles.serviceFiltersSection,
                {
                  backgroundColor: theme.background,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={styles.serviceFiltersHeader}>
                <Text
                  style={[
                    styles.serviceFiltersTitle,
                    { color: theme.textStrong },
                  ]}
                >
                  {t.serviceFilters}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAllServices(!showAllServices)}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>
                    {showAllServices ? t.seeLess : t.seeAll}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serviceFiltersList}
              >
                {visibleServices.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.serviceFilterItem,
                      {
                        borderColor: selectedServices.includes(s)
                          ? colors.primary
                          : theme.border,
                      },
                      selectedServices.includes(s) && {
                        backgroundColor: `${colors.primary}10`,
                      },
                    ]}
                    onPress={() => toggleService(s)}
                  >
                    <Ionicons
                      name={SERVICE_ICONS[s] || 'ellipse-outline'}
                      size={22}
                      color={
                        selectedServices.includes(s)
                          ? colors.primary
                          : theme.text
                      }
                    />
                    <Text
                      style={[
                        styles.serviceFilterText,
                        {
                          color: selectedServices.includes(s)
                            ? colors.primary
                            : theme.text,
                        },
                      ]}
                    >
                      {lang === 'fr'
                        ? SERVICE_LABELS[s]?.fr
                        : SERVICE_LABELS[s]?.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content */}
          <View style={styles.listSection}>
            <Text style={[styles.listTitle, { color: theme.textStrong }]}>
              {tab === 'agencies' ? t.popularAgencies : t.nearbyGares}
            </Text>

            {tab === 'agencies' ? (
              loadingAgencies ? (
                <View style={{ flex: 1 }}>
                  <SkeletonListScreen />
                </View>
              ) : filteredAgencies.length === 0 ? (
                <EmptyState
                  type="result"
                  message={t.noAgencies}
                  textColor={theme.text}
                />
              ) : (
                filteredAgencies.map(item => (
                  <AgencyCard key={item.agencyId} item={item} />
                ))
              )
            ) : loadingGares ? (
              <View style={{ flex: 1 }}>
                <SkeletonListScreen />
              </View>
            ) : filteredGares.length === 0 ? (
              <EmptyState
                type="result"
                message={t.noGares}
                textColor={theme.text}
              />
            ) : (
              filteredGares.map(item => (
                <GareCard key={item.idGareRoutiere} item={item} />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  title: { ...typography.heading, fontSize: typography.sizes.xl },
  subtitle: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginTop: 2,
  },

  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: spacing.sm,
  },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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

  serviceFiltersSection: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  serviceFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  serviceFiltersTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
  },
  seeAllText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  serviceFiltersList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  serviceFilterItem: {
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.sm,
    minWidth: 72,
  },
  serviceFilterText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },

  listSection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  listTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Agency Card
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
    width: 56,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoLetter: { ...typography.heading, fontSize: typography.sizes.xl },
  agencyInfo: { flex: 1 },
  agencyName: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: 2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  locationText: { ...typography.body, fontSize: typography.sizes.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingText: { ...typography.body, fontSize: typography.sizes.xs },
  agencyDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },

  // Gare Card
  gareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  gareImage: {
    width: 72,
    height: 60,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gareImageInner: { width: '100%', height: '100%' },
  gareInfo: { flex: 1, gap: 3 },
  gareName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: 3,
  },
  serviceChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceChipText: { ...typography.body, fontSize: 10 },

  loader: { marginTop: spacing.xxl },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
