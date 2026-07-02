import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { spacing } from '../../../../theme/spacing';
import { API_URL } from '../../../../utils/config';
import type { RootStackParamList } from '../../../../navigation';
import { EmptyState } from '../../../../components/empty-state';
import { SkeletonAgencyPlanning } from '../../../../components/skeleton';

type Agency = {
  agencyId: string;
  long_name: string;
  location: string;
  description?: string;
  contact?: { phone?: string; email?: string; website?: string };
  specialties?: string[];
};

type Trip = {
  idVoyage: string;
  titre?: string;
  lieuDepart: string;
  lieuArrive: string;
  dateDepartPrev: string;
  heureDepartEffectif?: string;
  statusVoyage: string;
  prix: number;
  nomClasseVoyage?: string;
  nbrPlaceRestante?: number;
};

type PlanningTab = 'profil' | 'contacts' | 'specialites';

const STATUS_TRIP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PUBLIE: { label: 'PUBLIÉ', color: colors.primary, bg: `${colors.primary}15` },
  EN_COURS: {
    label: 'EN COURS',
    color: colors.success,
    bg: `${colors.success}15`,
  },
  TERMINE: { label: 'TERMINÉ', color: '#6b7280', bg: '#6b728015' },
  ANNULE: { label: 'ANNULÉ', color: colors.error, bg: `${colors.error}15` },
};

const DAYS_FR = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];
const DAYS_EN = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const WEEKEND_DAYS = ['Samedi', 'Dimanche', 'Saturday', 'Sunday'];

export default function AgencyPlanning() {
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PlanningTab>('profil');

  const t = {
    fr: {
      title: 'Planning',
      modify: 'Modifier',
      profil: 'Profil',
      contacts: 'Contacts',
      specialites: 'Spécialités',
      about: 'À propos',
      creationDate: 'Date de création',
      status: 'Statut',
      agencyType: "Type d'agence",
      region: 'Région',
      active: 'Actif',
      roadTransport: 'Transport routier',
      weeklySchedule: 'Planning hebdomadaire',
      upcomingTrips: 'Prochains départs',
      today: "Aujourd'hui",
      tomorrow: 'Demain',
      seeAll: 'Voir tout',
      seatsLeft: (n: number) => `${n} places libres`,
      phone: 'Téléphone',
      email: 'Email',
      website: 'Site web',
      noContact: 'Non renseigné',
      noDescription: 'Aucune description disponible.',
      noSpecialties: 'Aucune spécialité renseignée.',
    },
    en: {
      title: 'Planning',
      modify: 'Edit',
      profil: 'Profile',
      contacts: 'Contacts',
      specialites: 'Specialties',
      about: 'About',
      creationDate: 'Creation date',
      status: 'Status',
      agencyType: 'Agency type',
      region: 'Region',
      active: 'Active',
      roadTransport: 'Road transport',
      weeklySchedule: 'Weekly schedule',
      upcomingTrips: 'Upcoming departures',
      today: 'Today',
      tomorrow: 'Tomorrow',
      seeAll: 'See all',
      seatsLeft: (n: number) => `${n} seats left`,
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      noContact: 'Not provided',
      noDescription: 'No description available.',
      noSpecialties: 'No specialties listed.',
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
        const chefId = user?.userId || user?.id;
        if (!chefId) return;

        const headers = { Authorization: `Bearer ${token}` };
        const agencyRes = await fetch(
          `${API_URL}/agence/chef-agence/${chefId}`,
          { headers },
        );
        if (!agencyRes.ok) return;
        const agencyData = await agencyRes.json();
        setAgency(agencyData);

        const tripsRes = await fetch(
          `${API_URL}/voyage/agence/${agencyData.agencyId}`,
          { headers },
        );
        if (tripsRes.ok) {
          const data = await tripsRes.json();
          setTrips(data.content || data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayTrips = trips.filter(t => {
    const d = new Date(t.dateDepartPrev);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const tomorrowTrips = trips.filter(t => {
    const d = new Date(t.dateDepartPrev);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === tomorrow.getTime();
  });

  const TripRow = ({ trip }: { trip: Trip }) => {
    const statusCfg = STATUS_TRIP[trip.statusVoyage] || STATUS_TRIP.PUBLIE;
    return (
      <View style={[styles.tripRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.tripHour, { color: theme.textStrong }]}>
          {trip.heureDepartEffectif || ''}
        </Text>
        <View style={styles.tripInfo}>
          <Text
            style={[styles.tripRoute, { color: theme.textStrong }]}
            numberOfLines={1}
          >
            {trip.lieuDepart} → {trip.lieuArrive}
          </Text>
          <Text style={[styles.tripMeta, { color: theme.text }]}>
            {trip.nomClasseVoyage || 'Standard'}
            {trip.nbrPlaceRestante !== undefined
              ? ` · ${t.seatsLeft(trip.nbrPlaceRestante)}`
              : ''}
          </Text>
        </View>
        <View style={[styles.tripStatus, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.tripStatusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>
    );
  };

  const ProfilTab = () => (
    <View style={styles.tabContent}>
      {/* About */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
          {t.about}
        </Text>
        <Text style={[styles.cardDesc, { color: theme.text }]}>
          {agency?.description || t.noDescription}
        </Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>
            {t.creationDate}
          </Text>
          <Text style={[styles.infoValue, { color: theme.textStrong }]}>
            {'—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>
            {t.status}
          </Text>
          <Text style={[styles.infoValueGreen, { color: colors.success }]}>
            {t.active}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>
            {t.agencyType}
          </Text>
          <Text style={[styles.infoValue, { color: theme.textStrong }]}>
            {t.roadTransport}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>
            {t.region}
          </Text>
          <Text style={[styles.infoValue, { color: theme.textStrong }]}>
            {agency?.location || '—'}
          </Text>
        </View>
      </View>

      {/* Weekly schedule */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.weeklySchedule}
          </Text>
          <TouchableOpacity>
            <Text style={[styles.modifyText, { color: colors.primary }]}>
              {t.modify}
            </Text>
          </TouchableOpacity>
        </View>
        {(lang === 'fr' ? DAYS_FR : DAYS_EN).map((day, i) => {
          const isWeekend = WEEKEND_DAYS.includes(day);
          return (
            <View
              key={day}
              style={[
                styles.scheduleRow,
                { borderTopColor: i === 0 ? 'transparent' : theme.border },
              ]}
            >
              <Text
                style={[
                  styles.scheduleDay,
                  { color: isWeekend ? colors.primary : theme.textStrong },
                ]}
              >
                {day}
              </Text>
              <Text
                style={[
                  styles.scheduleHours,
                  { color: isWeekend ? colors.primary : theme.text },
                ]}
              >
                {isWeekend ? '07:00 - 23:00' : '06:00 - 22:00'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Upcoming trips */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>
            {t.upcomingTrips}
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {t.seeAll}
            </Text>
          </TouchableOpacity>
        </View>

        {todayTrips.length > 0 && (
          <>
            <Text style={[styles.dayLabel, { color: theme.text }]}>
              {t.today}
            </Text>
            {todayTrips.map(trip => (
              <TripRow key={trip.idVoyage} trip={trip} />
            ))}
          </>
        )}

        {tomorrowTrips.length > 0 && (
          <>
            <Text
              style={[
                styles.dayLabel,
                { color: theme.text, marginTop: spacing.md },
              ]}
            >
              {t.tomorrow}
            </Text>
            {tomorrowTrips.map(trip => (
              <TripRow key={trip.idVoyage} trip={trip} />
            ))}
          </>
        )}

        {todayTrips.length === 0 && tomorrowTrips.length === 0 && (
          <EmptyState type="result" message="" textColor={theme.text} />
        )}
      </View>
    </View>
  );

  const ContactsTab = () => (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {[
          {
            icon: 'call-outline',
            label: t.phone,
            value: agency?.contact?.phone,
          },
          {
            icon: 'mail-outline',
            label: t.email,
            value: agency?.contact?.email,
          },
          {
            icon: 'globe-outline',
            label: t.website,
            value: agency?.contact?.website,
          },
        ].map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.contactRow,
              { borderTopColor: theme.border, borderTopWidth: i === 0 ? 0 : 1 },
            ]}
          >
            <View
              style={[
                styles.contactIcon,
                { backgroundColor: `${colors.primary}10` },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.contactLabel, { color: theme.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.contactValue, { color: theme.textStrong }]}>
                {item.value || t.noContact}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const SpecialitesTab = () => (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        {agency?.specialties?.length ? (
          <View style={styles.specialtiesGrid}>
            {agency.specialties.map(s => (
              <View
                key={s}
                style={[
                  styles.specialtyChip,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}30`,
                  },
                ]}
              >
                <Text style={[styles.specialtyText, { color: colors.primary }]}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.cardDesc, { color: theme.text }]}>
            {t.noSpecialties}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) return <SkeletonAgencyPlanning />;

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Agency banner */}
        <View
          style={[
            styles.agencyBanner,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.agencyLogo,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Text style={[styles.agencyLogoText, { color: colors.primary }]}>
              {agency?.long_name.slice(0, 2).toUpperCase() || 'VP'}
            </Text>
          </View>
          <View style={styles.agencyInfo}>
            <Text style={[styles.agencyName, { color: theme.textStrong }]}>
              {agency?.long_name}
            </Text>
            <View style={styles.agencyLocation}>
              <Ionicons name="location-outline" size={12} color={theme.text} />
              <Text style={[styles.agencyLocationText, { color: theme.text }]}>
                {' '}
                {agency?.location}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.modifyBtn, { borderColor: colors.primary }]}
          >
            <Ionicons name="create-outline" size={14} color={colors.primary} />
            <Text style={[styles.modifyBtnText, { color: colors.primary }]}>
              {t.modify}
            </Text>
          </TouchableOpacity>
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
          {(['profil', 'contacts', 'specialites'] as PlanningTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                activeTab === tab && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : theme.text },
                ]}
              >
                {tab === 'profil'
                  ? t.profil
                  : tab === 'contacts'
                  ? t.contacts
                  : t.specialites}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'profil' && <ProfilTab />}
        {activeTab === 'contacts' && <ContactsTab />}
        {activeTab === 'specialites' && <SpecialitesTab />}
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

  agencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  agencyLogo: {
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agencyLogoImage: { width: '100%', height: '100%' },
  agencyLogoText: { ...typography.heading, fontSize: typography.sizes.lg },
  agencyInfo: { flex: 1 },
  agencyName: { ...typography.bodyBold, fontSize: typography.sizes.md },
  agencyLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  agencyLocationText: { ...typography.body, fontSize: typography.sizes.xs },
  modifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modifyBtnText: { ...typography.bodyBold, fontSize: typography.sizes.xs },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  tabContent: { padding: spacing.lg, gap: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { ...typography.bodyBold, fontSize: typography.sizes.md },
  cardDesc: {
    ...typography.body,
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  divider: { height: 1, marginVertical: spacing.xs },
  modifyText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  seeAll: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: { ...typography.body, fontSize: typography.sizes.sm },
  infoValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  infoValueGreen: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  scheduleDay: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  scheduleHours: { ...typography.body, fontSize: typography.sizes.sm },

  dayLabel: {
    ...typography.bodyBold,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tripHour: {
    ...typography.bodyBold,
    fontSize: typography.sizes.sm,
    width: 44,
  },
  tripInfo: { flex: 1 },
  tripRoute: { ...typography.bodyBold, fontSize: typography.sizes.sm },
  tripMeta: { ...typography.body, fontSize: typography.sizes.xs, marginTop: 2 },
  tripStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tripStatusText: { ...typography.bodyBold, fontSize: typography.sizes.xs },
  emptyTrips: { height: 60, justifyContent: 'center', alignItems: 'center' },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: { ...typography.body, fontSize: typography.sizes.xs },
  contactValue: { ...typography.bodyBold, fontSize: typography.sizes.sm },

  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specialtyChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  specialtyText: { ...typography.bodyBold, fontSize: typography.sizes.sm },
});
