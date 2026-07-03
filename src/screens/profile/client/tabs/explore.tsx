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
import { useDebounce } from '../../../../hooks/useDebounce';
import AgencyPlaceholder from '../../../../assets/placeholders/shape.svg';
import StationPlaceholder from '../../../../assets/placeholders/building.svg';

type Agency = {
  id: string;
  longName: string;
  location: string;
  logoUrl?: string;
  description?: string;
  rating?: number;
  contact?: { phone?: string; email?: string; website?: string };
};

type Gare = {
  idGareRoutiere: string;
  nomGareRoutiere: string;
  ville: string;
  quartier?: string;
  photoUrl?: string | null;
  services: string[];
  nbreAgence: number | null;
  open?: boolean;
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
  'CLIMATISATION',
  'CONSIGNE',
  'MOBILE_MONEY',
  'BILLETTERIE_ELECTRONIQUE',
  'INFIRMERIE',
  'BOUTIQUES',
];

const SERVICE_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  RESTAURATION: 'restaurant-outline',
  SALLE_ATTENTE: 'people-outline',
  TOILETTES: 'water-outline',
  SECURITE: 'shield-checkmark-outline',
  CLIMATISATION: 'snow-outline',
  CONSIGNE: 'lock-closed-outline',
  MOBILE_MONEY: 'phone-portrait-outline',
  BILLETTERIE_ELECTRONIQUE: 'card-outline',
  INFIRMERIE: 'medkit-outline',
  BOUTIQUES: 'bag-outline',
};

const SERVICE_LABELS: Record<string, { fr: string; en: string }> = {
  WIFI: { fr: 'WiFi', en: 'WiFi' },
  PARKING: { fr: 'Parking', en: 'Parking' },
  RESTAURATION: { fr: 'Restauration', en: 'Dining' },
  SALLE_ATTENTE: { fr: 'Salle attente', en: 'Waiting room' },
  TOILETTES: { fr: 'Toilettes', en: 'Toilets' },
  SECURITE: { fr: 'Sécurité', en: 'Security' },
  CLIMATISATION: { fr: 'Climatisation', en: 'A/C' },
  CONSIGNE: { fr: 'Consigne', en: 'Luggage' },
  MOBILE_MONEY: { fr: 'Mobile Money', en: 'Mobile Money' },
  BILLETTERIE_ELECTRONIQUE: { fr: 'Billetterie', en: 'E-Ticketing' },
  INFIRMERIE: { fr: 'Infirmerie', en: 'Medical' },
  BOUTIQUES: { fr: 'Boutiques', en: 'Shops' },
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
  const debouncedSearch = useDebounce(search);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showServiceFilters, setShowServiceFilters] = useState(false);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [gares, setGares] = useState<Gare[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingGares, setLoadingGares] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agencyPage, setAgencyPage] = useState(0);
  const [agencyTotalPages, setAgencyTotalPages] = useState(1);
  const [agencyLoadingMore, setAgencyLoadingMore] = useState(false);
  const [garePage, setGarePage] = useState(0);
  const [gareTotalPages, setGareTotalPages] = useState(1);
  const [gareLoadingMore, setGareLoadingMore] = useState(false);

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
      recentSearches: 'Recherches récentes',
      clearHistory: 'Effacer',
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
      recentSearches: 'Recent searches',
      clearHistory: 'Clear',
      noAgencies: 'No agencies found',
      noGares: 'No stations found',
    },
  }[lang];

  useEffect(() => {
    AsyncStorage.getItem('search_history_explore').then(raw => {
      if (raw) setSearchHistory(JSON.parse(raw));
    });
  }, []);

  const saveExploreSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(h => h !== query)].slice(0, 5);
      AsyncStorage.setItem('search_history_explore', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearExploreHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem('search_history_explore');
  };

  const loadAgencies = useCallback(async (pageNum = 0) => {
    if (pageNum === 0) setLoadingAgencies(true);
    try {
      const [token, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const res = await fetch(`${API_URL}/agence?page=${pageNum}&size=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items: Agency[] = data.content || data || [];
        setAgencies(prev => (pageNum === 0 ? items : [...prev, ...items]));
        setAgencyTotalPages(data.totalPages ?? 1);
        setAgencyPage(pageNum);
      }
    } catch {
      // silent
    } finally {
      setLoadingAgencies(false);
      setAgencyLoadingMore(false);
    }
  }, []);

  const loadGares = useCallback(async (pageNum = 0, services: string[] = []) => {
    if (pageNum === 0) setLoadingGares(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const serviceParam = services.length ? `&services=${services.join(',')}` : '';
      const res = await fetch(
        `${API_URL}/gare?page=${pageNum}&size=15${serviceParam}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        const items: Gare[] = data.content || data || [];
        setGares(prev => (pageNum === 0 ? items : [...prev, ...items]));
        setGareTotalPages(data.totalPages ?? 1);
        setGarePage(pageNum);
      }
    } catch {
      // silent
    } finally {
      setLoadingGares(false);
      setGareLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadAgencies(0);
  }, [loadAgencies]);
  useEffect(() => {
    loadGares(0, selectedServices);
  }, [loadGares, selectedServices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAgencies(0), loadGares(0, selectedServices)]);
    setRefreshing(false);
  }, [loadAgencies, loadGares, selectedServices]);

  const handleScroll = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        layoutMeasurement: { height: number };
        contentSize: { height: number };
      };
    }) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const nearBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 200;
      if (!nearBottom) return;
      if (tab === 'agencies' && !agencyLoadingMore && agencyPage + 1 < agencyTotalPages) {
        setAgencyLoadingMore(true);
        loadAgencies(agencyPage + 1);
      } else if (tab === 'gares' && !gareLoadingMore && garePage + 1 < gareTotalPages) {
        setGareLoadingMore(true);
        loadGares(garePage + 1, selectedServices);
      }
    },
    [
      tab,
      agencyLoadingMore,
      agencyPage,
      agencyTotalPages,
      gareLoadingMore,
      garePage,
      gareTotalPages,
      loadAgencies,
      loadGares,
      selectedServices,
    ],
  );

  const toggleService = (s: string) => {
    setSelectedServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s],
    );
  };

  const filteredAgencies = useMemo(
    () =>
      agencies.filter(a => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          a.longName.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q)
        );
      }),
    [agencies, debouncedSearch],
  );

  const filteredGares = useMemo(
    () =>
      gares.filter(g => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase();
        return (
          g.nomGareRoutiere.toLowerCase().includes(q) ||
          g.ville?.toLowerCase().includes(q)
        );
      }),
    [gares, debouncedSearch],
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
        navigation.navigate('AgencyDetail', { agencyId: item.id })
      }
    >
      {/* Logo */}
      <View
        style={[styles.agencyLogo, { backgroundColor: theme.backgroundAlt }]}
      >
        {item.logoUrl && !item.logoUrl.toLowerCase().includes('placeholder')
          ? <Image source={{ uri: item.logoUrl }} style={styles.agencyLogoImage} resizeMode="contain" />
          : <AgencyPlaceholder width="100%" height="100%" />}
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
        {!!item.rating && (
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
          {item.photoUrl
            ? <Image source={{ uri: item.photoUrl }} style={styles.gareImageInner} resizeMode="cover" />
            : <StationPlaceholder width="100%" height="100%" />}
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
                {item.ratingAverage.toFixed(1)}
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

          {item.nbreAgence != null && (
            <View style={styles.locationRow}>
              <Ionicons name="people-outline" size={12} color={theme.text} />
              <Text style={[styles.locationText, { color: theme.text }]}>
                {' '}
                {t.affiliatedAgencies(item.nbreAgence)}
              </Text>
            </View>
          )}
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
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {t.title}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={300}
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
                scrollRef.current?.scrollTo({ y: 0, animated: false });
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
                scrollRef.current?.scrollTo({ y: 0, animated: false });
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
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  setSearchFocused(false);
                  saveExploreSearch(search);
                }}
                onSubmitEditing={() => saveExploreSearch(search)}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
            {tab === 'gares' && (
              <TouchableOpacity
                style={[styles.filterBtn, {
                  borderColor: selectedServices.length > 0 ? colors.primary : theme.border,
                  backgroundColor: selectedServices.length > 0 ? `${colors.primary}10` : undefined,
                }]}
                onPress={() => setShowServiceFilters(v => !v)}
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={selectedServices.length > 0 ? colors.primary : theme.textStrong}
                />
                {selectedServices.length > 0 && <View style={styles.filterBadge} />}
              </TouchableOpacity>
            )}
          </View>

          {/* Search History dropdown */}
          {searchFocused && search.length === 0 && searchHistory.length > 0 && (
            <View
              style={[
                styles.historyDropdown,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.historyDropdownHeader}>
                <View style={styles.historyDropdownLeft}>
                  <Ionicons name="time-outline" size={14} color={theme.text} />
                  <Text
                    style={[styles.historyDropdownTitle, { color: theme.text }]}
                  >
                    {t.recentSearches}
                  </Text>
                </View>
                <TouchableOpacity onPress={clearExploreHistory}>
                  <Text
                    style={[
                      styles.historyDropdownClear,
                      { color: colors.primary },
                    ]}
                  >
                    {t.clearHistory}
                  </Text>
                </TouchableOpacity>
              </View>
              {searchHistory.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.historyDropdownItem,
                    { borderTopColor: theme.border },
                    index === 0 && { borderTopWidth: 0 },
                  ]}
                  onPress={() => {
                    setSearch(item);
                    setSearchFocused(false);
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={14}
                    color={theme.text}
                  />
                  <Text
                    style={[
                      styles.historyDropdownItemText,
                      { color: theme.textStrong },
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Service filters — only for gares tab */}
          {tab === 'gares' && showServiceFilters && (
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
                  <AgencyCard key={item.id} item={item} />
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
            {(tab === 'agencies' ? agencyLoadingMore : gareLoadingMore) && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: spacing.md }}
              />
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.heading, fontSize: typography.sizes.xl },

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
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
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

  // Search History
  historyDropdown: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  historyDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDropdownTitle: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  historyDropdownClear: {
    ...typography.body,
    fontSize: typography.sizes.xs,
  },
  historyDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  historyDropdownItemText: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },

  loader: { marginTop: spacing.xxl },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
