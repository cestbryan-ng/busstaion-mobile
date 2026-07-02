import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Linking,
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
import type { RootStackParamList } from '../../../../navigation';
import { SkeletonListScreen } from '../../../../components/skeleton';

type Tax = {
  idTaxe: string;
  nomTaxe: string;
  description?: string;
  tauxTaxe: number;
  montantFixe: number;
  dateEffet: string;
  documentUrl?: string;
};

type TaxResponse = {
  agencyId: string;
  gareRoutiereId: string;
  montantTotalDu: number;
  taxes: Tax[];
};

export default function OrgAffiliationTaxes() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'OrgAffiliationTaxes'>>();
  const { agencyId, agencyName } = route.params;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [taxData, setTaxData] = useState<TaxResponse | null>(null);
  const [agencyInfo, setAgencyInfo] = useState<{
    longName: string;
    location?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const t = {
    fr: {
      title: "Taxes d'affiliation",
      summary: 'Résumé',
      agency: 'Agence',
      station: 'Gare routière',
      totalDue: 'Montant total dû',
      taxDetails: 'Détail des taxes',
      fixedAmount: 'Montant fixe',
      from: 'Depuis le',
      documents: 'Documents',
      payBtn: 'Payer les taxes dues',
      noTaxes: 'Aucune taxe',
    },
    en: {
      title: 'Affiliation taxes',
      summary: 'Summary',
      agency: 'Agency',
      station: 'Station',
      totalDue: 'Total amount due',
      taxDetails: 'Tax details',
      fixedAmount: 'Fixed amount',
      from: 'From',
      documents: 'Documents',
      payBtn: 'Pay due taxes',
      noTaxes: 'No taxes',
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
      const [taxRes, agencyRes] = await Promise.allSettled([
        fetch(`${API_URL}/taxe-affiliation/agence/${agencyId}`, { headers }),
        fetch(`${API_URL}/agence/${agencyId}`, { headers }),
      ]);

      if (taxRes.status === 'fulfilled' && taxRes.value.ok)
        setTaxData(await taxRes.value.json());
      if (agencyRes.status === 'fulfilled' && agencyRes.value.ok) {
        const d = await agencyRes.value.json();
        setAgencyInfo({ longName: d.longName, location: d.location });
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

  if (loading) return <SkeletonListScreen />;

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
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={theme.textStrong}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {/* Summary */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.summary}
          </Text>
          <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.agency}
            </Text>
            <Text style={[styles.infoValue, { color: theme.textStrong }]}>
              {agencyName || agencyInfo?.longName || '—'}
            </Text>
          </View>
          <View
            style={[
              styles.infoRow,
              { borderTopColor: theme.border, borderTopWidth: 1 },
            ]}
          >
            <Text style={[styles.infoLabel, { color: theme.text }]}>
              {t.station}
            </Text>
            <Text style={[styles.infoValue, { color: theme.textStrong }]}>
              {taxData?.gareRoutiereId ? 'Gare Routière' : '—'}
            </Text>
          </View>
          <View
            style={[
              styles.totalBox,
              {
                backgroundColor: `${colors.error}08`,
                borderColor: `${colors.error}20`,
              },
            ]}
          >
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              {t.totalDue}
            </Text>
            <Text style={[styles.totalValue, { color: colors.error }]}>
              {(taxData?.montantTotalDu || 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {/* Tax details */}
        {taxData?.taxes && taxData.taxes.length > 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
              {t.taxDetails}
            </Text>
            {taxData.taxes.map((tax, i) => (
              <View
                key={tax.idTaxe}
                style={[
                  styles.taxRow,
                  {
                    borderTopColor: theme.border,
                    borderTopWidth: i === 0 ? 0 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.taxIconBox,
                    { backgroundColor: `${colors.error}15` },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.error}
                  />
                </View>
                <View style={styles.taxInfo}>
                  <Text style={[styles.taxName, { color: theme.textStrong }]}>
                    {tax.nomTaxe}
                  </Text>
                  <Text style={[styles.taxRate, { color: theme.text }]}>
                    {tax.tauxTaxe * 100}% · {t.from}{' '}
                    {new Date(tax.dateEffet).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-GB',
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    )}
                  </Text>
                </View>
                <Text style={[styles.taxAmount, { color: colors.error }]}>
                  {tax.montantFixe.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Documents */}
        {taxData?.taxes?.some(t => t.documentUrl) && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.docHeader}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
                {t.documents}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            {taxData.taxes
              .filter(tax => tax.documentUrl)
              .map((tax, i) => (
                <TouchableOpacity
                  key={tax.idTaxe}
                  style={[
                    styles.docRow,
                    {
                      borderTopColor: theme.border,
                      borderTopWidth: i === 0 ? 0 : 1,
                    },
                  ]}
                  onPress={() =>
                    tax.documentUrl && Linking.openURL(tax.documentUrl)
                  }
                >
                  <View
                    style={[
                      styles.docIcon,
                      { backgroundColor: `${colors.error}10` },
                    ]}
                  >
                    <Ionicons
                      name="document-outline"
                      size={18}
                      color={colors.error}
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docName, { color: theme.textStrong }]}>
                      {tax.nomTaxe}
                    </Text>
                    <Text style={[styles.docMeta, { color: theme.text }]}>
                      PDF
                    </Text>
                  </View>
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Pay button */}
        {(taxData?.montantTotalDu || 0) > 0 && (
          <View style={styles.payBtnContainer}>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.payBtnText}>{t.payBtn}</Text>
            </TouchableOpacity>
          </View>
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
  title: { ...typography.heading, fontSize: typography.sizes.lg },
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  totalBox: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  totalLabel: { ...typography.body, fontSize: typography.sizes.sm },
  totalValue: {
    ...typography.heading,
    fontSize: typography.sizes.xxl,
    marginTop: 4,
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  taxIconBox: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taxInfo: { flex: 1 },
  taxName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  taxRate: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  taxAmount: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docName: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  docMeta: { ...typography.body, fontSize: typography.sizes.xs },
  payBtnContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  payBtn: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: {
    ...typography.bodyBold,
    fontSize: typography.sizes.md,
    color: '#fff',
  },
});
