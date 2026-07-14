import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';

// Clés de cache appartenant à l'acteur Agence
const PREFIXES = ['cache_agency_'];

type CacheStats = {
  count: number;
  oldestDate: Date | null;
  newestDate: Date | null;
};

function formatRelativeDate(date: Date, lang: 'fr' | 'en'): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === 'fr') {
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  } else {
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

function matchesPrefixes(key: string): boolean {
  return PREFIXES.some(p => key.startsWith(p));
}

export default function AgencyCacheSettings() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation = useNavigation();

  const [lang] = useState<'fr' | 'en'>('fr');
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const t = {
    fr: {
      title: 'Gestion du cache',
      statsTitle: 'État du cache',
      entries: (n: number) => `${n} entrée${n > 1 ? 's' : ''} en cache`,
      oldest: 'Plus ancienne',
      newest: 'Plus récente',
      noCache: 'Aucune donnée en cache',
      noCacheDesc: 'Le cache sera rempli lors de votre prochaine navigation.',
      actionsTitle: 'Actions',
      clearBtn: 'Vider le cache',
      clearDesc:
        'Supprime les données de votre agence mises en cache. Elles seront rechargées depuis le serveur à la prochaine ouverture de chaque écran.',
      clearSuccess: 'Cache vidé',
      clearSuccessDesc: 'Les données seront rechargées depuis le serveur.',
      infoTitle: 'À propos du cache',
      infoText:
        'Le cache permet de consulter vos données sans connexion internet. Les données sont automatiquement mises à jour selon leur fréquence de changement (30 min à 7 jours).',
    },
    en: {
      title: 'Cache management',
      statsTitle: 'Cache status',
      entries: (n: number) => `${n} cached entr${n > 1 ? 'ies' : 'y'}`,
      oldest: 'Oldest',
      newest: 'Most recent',
      noCache: 'No cached data',
      noCacheDesc: 'Cache will be populated as you navigate the app.',
      actionsTitle: 'Actions',
      clearBtn: 'Clear cache',
      clearDesc:
        'Removes your agency cached data. Data will be reloaded from the server next time each screen is opened.',
      clearSuccess: 'Cache cleared',
      clearSuccessDesc: 'Data will be reloaded from the server.',
      infoTitle: 'About cache',
      infoText:
        'The cache lets you browse your data without an internet connection. Data is automatically refreshed based on how often it changes (30 min to 7 days).',
    },
  }[lang];

  const loadStats = useCallback(async () => {
    setLoading(true);
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(matchesPrefixes);

    if (cacheKeys.length === 0) {
      setStats({ count: 0, oldestDate: null, newestDate: null });
      setLoading(false);
      return;
    }

    const raws = await Promise.all(cacheKeys.map(k => AsyncStorage.getItem(k)));
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const raw of raws) {
      if (!raw) continue;
      try {
        const { timestamp } = JSON.parse(raw);
        if (typeof timestamp === 'number') {
          if (oldest === null || timestamp < oldest) oldest = timestamp;
          if (newest === null || timestamp > newest) newest = timestamp;
        }
      } catch {
        // entrée corrompue — on ignore
      }
    }

    setStats({
      count: cacheKeys.length,
      oldestDate: oldest ? new Date(oldest) : null,
      newestDate: newest ? new Date(newest) : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleClear = async () => {
    setClearing(true);
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(matchesPrefixes);
    await Promise.all(cacheKeys.map(k => AsyncStorage.removeItem(k)));
    setClearing(false);
    setCleared(true);
    setStats({ count: 0, oldestDate: null, newestDate: null });
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
        {title}
      </Text>
      {children}
    </View>
  );

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
          {t.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Section title={t.statsTitle}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : stats?.count === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="archive-outline"
                size={32}
                color={theme.placeholder}
              />
              <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>
                {t.noCache}
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.text }]}>
                {t.noCacheDesc}
              </Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: `${colors.primary}0d`,
                    borderColor: `${colors.primary}30`,
                  },
                ]}
              >
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats?.count}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  {t.entries(stats?.count ?? 0)}
                </Text>
              </View>
              {stats?.oldestDate && (
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: theme.backgroundAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={20} color={theme.text} />
                  <Text style={[styles.statValue, { color: theme.textStrong }]}>
                    {formatRelativeDate(stats.oldestDate, lang)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>
                    {t.oldest}
                  </Text>
                </View>
              )}
              {stats?.newestDate && (
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: theme.backgroundAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={colors.success}
                  />
                  <Text style={[styles.statValue, { color: theme.textStrong }]}>
                    {formatRelativeDate(stats.newestDate, lang)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>
                    {t.newest}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Section>

        <Section title={t.actionsTitle}>
          {cleared ? (
            <View style={styles.successRow}>
              <View
                style={[
                  styles.successIcon,
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={colors.success}
                />
              </View>
              <View style={styles.successText}>
                <Text style={[styles.menuLabel, { color: colors.success }]}>
                  {t.clearSuccess}
                </Text>
                <Text style={[styles.menuDesc, { color: theme.text }]}>
                  {t.clearSuccessDesc}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: 'transparent' }]}
              onPress={handleClear}
              disabled={clearing || stats?.count === 0}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: `${colors.error}10` },
                ]}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.error}
                  />
                )}
              </View>
              <View style={styles.menuText}>
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color:
                        stats?.count === 0 ? theme.placeholder : colors.error,
                    },
                  ]}
                >
                  {t.clearBtn}
                </Text>
                <Text style={[styles.menuDesc, { color: theme.text }]}>
                  {t.clearDesc}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Section>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}20`,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {t.infoText}
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  loadingRow: { paddingVertical: spacing.lg, alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  emptyDesc: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  statValue: { ...typography.bodyBold, fontSize: typography.sizes.md },
  statLabel: { ...typography.body, fontSize: typography.sizes.xs },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  menuDesc: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  successIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: { flex: 1 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  infoText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    flex: 1,
    lineHeight: 18,
  },
});
