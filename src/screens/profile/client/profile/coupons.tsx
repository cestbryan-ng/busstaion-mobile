import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL, QR_API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';

type Coupon = {
  idCoupon: string;
  dateDebut: string;
  dateFin: string;
  statusCoupon: 'VALIDE' | 'EXPIRE';
  valeur: number;
  idHistorique: string;
  nomAgence: string;
  lieuArrive: string;
};

type TabFilter = 'all' | 'VALIDE' | 'EXPIRE';
type ViewMode = 'grid' | 'list';

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  return new Date(dateStr).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR') + ' FCFA';
}

export default function Coupons() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const t = {
    fr: {
      title: 'Mes coupons',
      all: 'Tous',
      valid: 'Valides',
      expired: 'Expirés',
      validBadge: 'VALIDE',
      expiredBadge: 'EXPIRÉ',
      agency: 'Agence',
      destination: 'Destination : ',
      validFrom: 'Valable du',
      to: 'au',
      download: 'Télécharger',
      noCoupons: 'Aucun coupon disponible',
    },
    en: {
      title: 'My coupons',
      all: 'All',
      valid: 'Valid',
      expired: 'Expired',
      validBadge: 'VALID',
      expiredBadge: 'EXPIRED',
      agency: 'Agency',
      destination: 'Destination: ',
      validFrom: 'Valid from',
      to: 'to',
      download: 'Download',
      noCoupons: 'No coupons available',
    },
  }[lang];

  useEffect(() => {
    const load = async () => {
      try {
        const [token, userRaw, storedLang] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('app_lang'),
        ]);
        if (storedLang === 'fr' || storedLang === 'en') setLang(storedLang);

        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.userId || user?.id;
        if (!userId) return;

        const res = await fetch(`${API_URL}/coupon/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCoupons(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = coupons.filter(c => {
    if (activeTab === 'all') return true;
    return c.statusCoupon === activeTab;
  });

  const handleShare = async (coupon: Coupon) => {
    try {
      await Share.share({
        message: `
🎟️ BUS STATION — ${t.title}
━━━━━━━━━━━━━━━━━━━
🆔 ${coupon.idCoupon}
💰 ${formatPrice(coupon.valeur)}
🏢 ${coupon.nomAgence}
📍 ${t.destination}${coupon.lieuArrive}
📅 ${t.validFrom} ${formatDate(coupon.dateDebut, lang)} ${t.to} ${formatDate(
          coupon.dateFin,
          lang,
        )}
✅ ${coupon.statusCoupon === 'VALIDE' ? t.validBadge : t.expiredBadge}
        `.trim(),
        title: t.title,
      });
    } catch {
      // silent
    }
  };

  const getQRUrl = (coupon: Coupon) =>
    `${QR_API_URL}?size=150x150&data=${encodeURIComponent(coupon.idCoupon)}`;

  const CouponCard = ({ item }: { item: Coupon }) => {
    const isValid = item.statusCoupon === 'VALIDE';
    const statusColor = isValid ? colors.success : '#6b7280';
    const borderColor = isValid ? colors.success : '#6b7280';

    if (viewMode === 'list') {
      return (
        <View
          style={[
            styles.listCard,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              borderLeftColor: borderColor,
            },
          ]}
        >
          <View style={styles.listCardLeft}>
            <View style={styles.listCardTop}>
              <Text style={[styles.couponId, { color: statusColor }]}>
                {item.idCoupon}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor}15` },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {isValid ? t.validBadge : t.expiredBadge}
                </Text>
              </View>
            </View>
            <Text style={[styles.couponValue, { color: theme.textStrong }]}>
              {formatPrice(item.valeur)}
            </Text>
            <Text style={[styles.couponMeta, { color: theme.text }]}>
              {item.nomAgence}
            </Text>
            <Text style={[styles.couponMeta, { color: theme.text }]}>
              {t.destination}
              {item.lieuArrive}
            </Text>
            <Text style={[styles.couponValidity, { color: theme.text }]}>
              {t.validFrom} {formatDate(item.dateDebut, lang)} {t.to}{' '}
              {formatDate(item.dateFin, lang)}
            </Text>
          </View>
          <View style={styles.listCardRight}>
            <Image
              source={{ uri: getQRUrl(item) }}
              style={[styles.qrSmall, { opacity: isValid ? 1 : 0.4 }]}
              resizeMode="contain"
            />
            {isValid && (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleShare(item)}
              >
                <Ionicons
                  name="download-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.downloadText, { color: colors.primary }]}>
                  {t.download}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.gridCard,
          { backgroundColor: theme.background, borderColor: borderColor },
        ]}
      >
        {/* Top badges */}
        <View style={styles.gridCardTop}>
          <Text style={[styles.couponId, { color: statusColor }]}>
            {item.idCoupon}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}15` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isValid ? t.validBadge : t.expiredBadge}
            </Text>
          </View>
        </View>

        {/* Value */}
        <Text style={[styles.gridCouponValue, { color: theme.textStrong }]}>
          {formatPrice(item.valeur)}
        </Text>
        <Text style={[styles.couponMeta, { color: theme.text }]}>
          {item.nomAgence}
        </Text>
        <Text style={[styles.couponMeta, { color: theme.text }]}>
          {t.destination}
          {item.lieuArrive}
        </Text>

        {/* QR Code */}
        <View style={[styles.qrContainer, { borderColor: theme.border }]}>
          <Image
            source={{ uri: getQRUrl(item) }}
            style={[styles.qrCode, { opacity: isValid ? 1 : 0.4 }]}
            resizeMode="contain"
          />
        </View>

        {/* Validity */}
        <View style={[styles.validityRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.validityLabel, { color: theme.text }]}>
            {t.validFrom}
          </Text>
          <Text style={[styles.validityDate, { color: theme.textStrong }]}>
            {formatDate(item.dateDebut, lang)}
          </Text>
        </View>
        <View style={styles.validityRow}>
          <Text style={[styles.validityLabel, { color: theme.text }]}>
            {t.to}
          </Text>
          <Text style={[styles.validityDate, { color: theme.textStrong }]}>
            {formatDate(item.dateFin, lang)}
          </Text>
        </View>

        {/* Download */}
        {isValid && (
          <TouchableOpacity
            style={[styles.downloadBtnFull, { borderTopColor: theme.border }]}
            onPress={() => handleShare(item)}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.downloadTextFull, { color: colors.primary }]}>
              {t.download}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        {(['all', 'VALIDE', 'EXPIRE'] as TabFilter[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              tab === activeTab && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
              tab !== activeTab && { borderColor: theme.border },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === activeTab ? '#fff' : theme.text },
              ]}
            >
              {tab === 'all' ? t.all : tab === 'VALIDE' ? t.valid : t.expired}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode('grid')}>
            <Ionicons
              name="grid-outline"
              size={20}
              color={viewMode === 'grid' ? colors.primary : theme.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('list')}>
            <Ionicons
              name="list-outline"
              size={20}
              color={viewMode === 'list' ? colors.primary : theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {filtered.length === 0 ? (
          <EmptyState
            type="message"
            message={t.noCoupons}
            textColor={theme.text}
          />
        ) : viewMode === 'grid' ? (
          <View style={styles.grid}>
            {filtered.map(item => (
              <CouponCard key={item.idCoupon} item={item} />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(item => (
              <CouponCard key={item.idCoupon} item={item} />
            ))}
          </View>
        )}
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  tab: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  viewToggle: { flexDirection: 'row', gap: spacing.md, marginLeft: 'auto' },
  scroll: { padding: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  list: { gap: spacing.md },

  // Grid card
  gridCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.xs,
  },
  gridCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponId: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { ...typography.bodyBold, fontSize: 9 },
  gridCouponValue: { ...typography.heading, fontSize: typography.sizes.lg },
  couponMeta: { ...typography.body, fontSize: typography.sizes.xs },
  qrContainer: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.xs,
    marginVertical: spacing.xs,
  },
  qrCode: { width: 80, height: 80 },
  validityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  validityLabel: { ...typography.body, fontSize: typography.sizes.xs },
  validityDate: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  downloadBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  downloadTextFull: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  // List card
  listCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  listCardLeft: { flex: 1, gap: 3 },
  listCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  couponValue: { ...typography.heading, fontSize: typography.sizes.lg },
  couponValidity: {
    ...typography.body,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
  listCardRight: { alignItems: 'center', gap: spacing.sm },
  qrSmall: { width: 64, height: 64 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  downloadText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, fontSize: typography.sizes.md },
});
