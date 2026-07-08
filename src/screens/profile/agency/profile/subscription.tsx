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
import { setCache, getCache } from '../../../../utils/offlineCache';
import { useNetworkStatus } from '../../../../hooks/useNetworkStatus';
import { OfflineBanner } from '../../../../components/offline-banner';
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonSubscription } from '../../../../components/skeleton';

type Plan = {
  idPlan: string;
  name: string;
  price: number;
  features: string[];
  isCurrent: boolean;
};

type BillingItem = {
  idFacture: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
};

const FALLBACK_PLANS: Plan[] = [
  {
    idPlan: 'starter',
    name: 'STARTER',
    price: 25000,
    features: ['10 voyages / mois', 'Support standard', 'Rapports de base'],
    isCurrent: false,
  },
  {
    idPlan: 'pro',
    name: 'PRO',
    price: 65000,
    features: [
      'Voyages illimités',
      'Support prioritaire',
      'Analyses avancées',
      'Notifications personnalisées',
    ],
    isCurrent: true,
  },
  {
    idPlan: 'business',
    name: 'BUSINESS',
    price: 95000,
    features: [
      'Voyages illimités',
      'Support prioritaire',
      'Analyses avancées',
      'Gestion des employés',
    ],
    isCurrent: false,
  },
];

const FALLBACK_BILLING: BillingItem[] = [
  {
    idFacture: 'INV-2026-06-001',
    date: '2026-06-01',
    amount: 65000,
    status: 'paid',
  },
  {
    idFacture: 'INV-2026-05-001',
    date: '2026-05-01',
    amount: 65000,
    status: 'paid',
  },
  {
    idFacture: 'INV-2026-04-001',
    date: '2026-04-01',
    amount: 65000,
    status: 'paid',
  },
];

export default function AgencySubscription() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const isOnline = useNetworkStatus();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [billing, setBilling] = useState<BillingItem[]>(FALLBACK_BILLING);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const t = {
    fr: {
      title: 'Abonnement',
      currentPlan: 'Plan actuel',
      active: 'ACTIF',
      perMonth: '/ mois',
      activationDate: "Date d'activation",
      nextRenewal: 'Prochain renouvellement',
      otherPlans: 'Autres plans',
      choosePlan: 'Choisir ce plan',
      billingHistory: 'Historique de facturation',
      seeAll: 'Voir tout',
      invoice: 'Facture',
      paid: 'Payée',
      pending: 'En attente',
      failed: 'Échouée',
    },
    en: {
      title: 'Subscription',
      currentPlan: 'Current plan',
      active: 'ACTIVE',
      perMonth: '/ month',
      activationDate: 'Activation date',
      nextRenewal: 'Next renewal',
      otherPlans: 'Other plans',
      choosePlan: 'Choose this plan',
      billingHistory: 'Billing history',
      seeAll: 'See all',
      invoice: 'Invoice',
      paid: 'Paid',
      pending: 'Pending',
      failed: 'Failed',
    },
  }[lang];

  const loadData = useCallback(async () => {
    try {
      const [token, userRaw, storedLang] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('app_lang'),
      ]);
      if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

      const user = userRaw ? JSON.parse(userRaw) : null;
      const chefId = user?.userId || user?.id;
      if (!chefId) return;

      const headers = { Authorization: `Bearer ${token}` };
      const agencyRes = await fetch(
        `${API_URL}/agence/chef-agence/${chefId}`,
        { headers },
      );
      if (!agencyRes.ok) return;
      const agency = await agencyRes.json();

      // TODO: ces endpoints ne sont pas encore définis
      const [plansRes, billingRes] = await Promise.allSettled([
        fetch(`${API_URL}/abonnement/plans/agence/${agency.agencyId}`, {
          headers,
        }),
        fetch(`${API_URL}/facturation/agence/${agency.agencyId}`, {
          headers,
        }),
      ]);

      let anyFromCache = false;

      if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
        const data = await plansRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
          setCache(`subscription_plans_${agency.agencyId}`, data);
        }
      } else {
        const cached = await getCache<Plan[]>(`subscription_plans_${agency.agencyId}`);
        if (cached) { setPlans(cached); anyFromCache = true; }
      }

      if (billingRes.status === 'fulfilled' && billingRes.value.ok) {
        const data = await billingRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setBilling(data);
          setCache(`subscription_billing_${agency.agencyId}`, data);
        }
      } else {
        const cached = await getCache<BillingItem[]>(`subscription_billing_${agency.agencyId}`);
        if (cached) { setBilling(cached); anyFromCache = true; }
      }

      setIsOffline(anyFromCache);
    } catch {
      // fallback already set in initial state
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

  const currentPlan = plans.find(p => p.isCurrent) || plans[0];
  const otherPlans = plans.filter(p => !p.isCurrent);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const STATUS_LABEL: Record<string, string> = {
    paid: t.paid,
    pending: t.pending,
    failed: t.failed,
  };

  if (loading) return <SkeletonSubscription />;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt }]}>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textStrong} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textStrong }]}>
          {t.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {(!isOnline || isOffline) && <OfflineBanner lang={lang} />}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={isOnline ? onRefresh : undefined} tintColor={colors.primary} />}>
        {/* Current plan */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.currentPlan}
          </Text>
          <View
            style={[
              styles.currentPlanCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.currentPlanTop}>
              <View style={[styles.crownIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="trophy-outline" size={26} color="#d97706" />
              </View>
              <View style={styles.currentPlanInfo}>
                <Text style={[styles.planName, { color: theme.textStrong }]}>
                  PLAN {currentPlan?.name}
                </Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {currentPlan?.price.toLocaleString('fr-FR')} FCFA {t.perMonth}
                </Text>
              </View>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: `${colors.success}15` },
                ]}
              >
                <Text
                  style={[styles.activeBadgeText, { color: colors.success }]}
                >
                  {t.active}
                </Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresList}>
              {currentPlan?.features.map(f => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success}
                  />
                  <Text
                    style={[styles.featureText, { color: theme.textStrong }]}
                  >
                    {' '}
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Dates row */}
          <View style={styles.datesRow}>
            <View
              style={[
                styles.dateCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />
              <View>
                <Text style={[styles.dateLabel, { color: theme.text }]}>
                  {t.activationDate}
                </Text>
                <Text style={[styles.dateValue, { color: theme.textStrong }]}>
                  01 Janv. 2026
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.dateCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.dateLabel, { color: theme.text }]}>
                  {t.nextRenewal}
                </Text>
                <Text style={[styles.dateValue, { color: theme.textStrong }]}>
                  01 Juil. 2026
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Other plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
            {t.otherPlans}
          </Text>
          <View style={styles.otherPlansRow}>
            {otherPlans.map(plan => (
              <View
                key={plan.idPlan}
                style={[
                  styles.otherPlanCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[styles.otherPlanName, { color: theme.textStrong }]}
                >
                  PLAN {plan.name}
                </Text>
                <Text style={[styles.otherPlanPrice, { color: '#d97706' }]}>
                  {plan.price.toLocaleString('fr-FR')} FCFA {t.perMonth}
                </Text>
                <View style={styles.otherPlanFeatures}>
                  {plan.features.slice(0, 4).map(f => (
                    <View key={f} style={styles.otherFeatureRow}>
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color={colors.success}
                      />
                      <Text
                        style={[styles.otherFeatureText, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {' '}
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.choosePlanBtn,
                    { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.choosePlanBtnText,
                      { color: colors.primary },
                    ]}
                  >
                    {t.choosePlan}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Billing history */}
        <View style={[styles.section, { paddingBottom: spacing.xl }]}>
          <View style={styles.billingHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>
              {t.billingHistory}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.primary }]}>
                {t.seeAll}
              </Text>
            </TouchableOpacity>
          </View>

          {billing.map((item, i) => (
            <View
              key={item.idFacture}
              style={[
                styles.billingRow,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.billingIcon,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.billingInfo}>
                <Text style={[styles.billingDate, { color: theme.textStrong }]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.billingRef, { color: theme.text }]}>
                  {t.invoice} #{item.idFacture}
                </Text>
              </View>
              <View style={styles.billingRight}>
                <View
                  style={[
                    styles.billingStatus,
                    {
                      backgroundColor:
                        item.status === 'paid'
                          ? `${colors.success}15`
                          : `${colors.error}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.billingStatusText,
                      {
                        color:
                          item.status === 'paid'
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {STATUS_LABEL[item.status] || item.status}
                  </Text>
                </View>
                <Text
                  style={[styles.billingAmount, { color: theme.textStrong }]}
                >
                  {item.amount.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },

  currentPlanCard: { borderWidth: 1, borderRadius: 4, padding: spacing.md },
  currentPlanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  crownIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanInfo: { flex: 1 },
  planName: { ...typography.heading, fontSize: typography.sizes.lg },
  planPrice: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  featuresList: { gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureText: { ...typography.body, fontSize: typography.sizes.sm },

  datesRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  dateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
  },
  dateLabel: { ...typography.body, fontSize: typography.sizes.xs },
  dateValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  otherPlansRow: { flexDirection: 'row', gap: spacing.sm },
  otherPlanCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  otherPlanName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  otherPlanPrice: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  otherPlanFeatures: { gap: 4, marginVertical: spacing.xs },
  otherFeatureRow: { flexDirection: 'row', alignItems: 'center' },
  otherFeatureText: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  choosePlanBtn: {
    borderWidth: 1.5,
    borderRadius: 4,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  choosePlanBtnText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  billingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  billingIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billingInfo: { flex: 1 },
  billingDate: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  billingRef: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  billingRight: { alignItems: 'flex-end', gap: 4 },
  billingStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  billingStatusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  billingAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
