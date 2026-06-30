import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
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

type Affiliation = {
  id: string;
  gareRoutiereId: string;
  agencyId: string;
  agencyName: string;
  statut: 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD';
  echeance?: string;
  montantAffiliation?: number;
  createdAt: string;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  PAYE: {
    label: 'Affiliation active',
    labelEn: 'Active affiliation',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  EN_ATTENTE: {
    label: 'En attente',
    labelEn: 'Pending',
    color: '#d97706',
    bg: '#fef3c715',
  },
  EN_RETARD: {
    label: 'Affiliation expirée',
    labelEn: 'Expired affiliation',
    color: colors.error,
    bg: `${colors.error}15`,
  },
};

type TabType = 'affiliations' | 'taxes';

export default function OrgAffiliations() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrgAffiliations'>>();
  const { agencyId } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('affiliations');

  const t = {
    fr: {
      title: 'Affiliations',
      myAffiliations: 'Mes affiliations',
      taxesDues: 'Taxes dues',
      dueDate: 'Échéance :',
      noAffiliations: 'Aucune affiliation',
      seeAll: 'Voir toutes les affiliations',
    },
    en: {
      title: 'Affiliations',
      myAffiliations: 'My affiliations',
      taxesDues: 'Due taxes',
      dueDate: 'Due date:',
      noAffiliations: 'No affiliations',
      seeAll: 'See all affiliations',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const [token, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const res = await fetch(`${API_URL}/affiliation/agence/${agencyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAffiliations(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agencyId]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const overdueAffiliations = affiliations.filter(
    a => a.statut === 'EN_RETARD',
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
        <TouchableOpacity>
          <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
        {[
          { key: 'affiliations' as TabType, label: t.myAffiliations },
          { key: 'taxes' as TabType, label: t.taxesDues },
        ].map(tabItem => (
          <TouchableOpacity
            key={tabItem.key}
            style={[
              styles.tabBtn,
              tab === tabItem.key && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setTab(tabItem.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === tabItem.key ? colors.primary : theme.text },
              ]}
            >
              {tabItem.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {tab === 'affiliations' ? (
          affiliations.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="link-outline" size={48} color={theme.text} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {t.noAffiliations}
              </Text>
            </View>
          ) : (
            <>
              {affiliations.map(affil => {
                const statusCfg =
                  STATUS_CONFIG[affil.statut] || STATUS_CONFIG.EN_ATTENTE;
                return (
                  <View
                    key={affil.id}
                    style={[
                      styles.affiliCard,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.affiliIconBox,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.affiliInfo}>
                      <Text
                        style={[styles.affiliName, { color: theme.textStrong }]}
                      >
                        Gare Routière
                      </Text>
                      <View
                        style={[
                          styles.affiliStatusBadge,
                          { backgroundColor: statusCfg.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.affiliStatusText,
                            { color: statusCfg.color },
                          ]}
                        >
                          {lang === 'fr' ? statusCfg.label : statusCfg.labelEn}
                        </Text>
                      </View>
                      {affil.echeance && (
                        <Text
                          style={[styles.affiliEcheance, { color: theme.text }]}
                        >
                          {t.dueDate}{' '}
                          {new Date(affil.echeance).toLocaleDateString(
                            lang === 'fr' ? 'fr-FR' : 'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          )}
                        </Text>
                      )}
                    </View>
                    {affil.montantAffiliation !== undefined && (
                      <Text
                        style={[
                          styles.affiliAmount,
                          { color: theme.textStrong },
                        ]}
                      >
                        {affil.montantAffiliation.toLocaleString('fr-FR')} FCFA
                      </Text>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.text}
                    />
                  </View>
                );
              })}
              <TouchableOpacity style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t.seeAll}
                </Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          <TouchableOpacity
            style={[
              styles.navCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
            onPress={() =>
              navigation.navigate('OrgAffiliationTaxes', { agencyId })
            }
          >
            <View
              style={[styles.navIcon, { backgroundColor: `${colors.error}15` }]}
            >
              <Ionicons name="cash-outline" size={22} color={colors.error} />
            </View>
            <View style={styles.navText}>
              <Text style={[styles.navTitle, { color: theme.textStrong }]}>
                {lang === 'fr' ? 'Voir les taxes dues' : 'View due taxes'}
              </Text>
              {overdueAffiliations.length > 0 && (
                <Text style={[styles.navSub, { color: colors.error }]}>
                  {overdueAffiliations.length}{' '}
                  {lang === 'fr' ? 'en retard' : 'overdue'}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
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
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  list: { padding: spacing.lg },
  affiliCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  affiliIconBox: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  affiliInfo: { flex: 1, gap: 4 },
  affiliName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  affiliStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  affiliStatusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  affiliEcheance: { ...typography.body, fontSize: typography.sizes.xs },
  affiliAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  seeAllBtn: { alignItems: 'center', paddingVertical: spacing.md },
  seeAllText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: { flex: 1 },
  navTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  navSub: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
