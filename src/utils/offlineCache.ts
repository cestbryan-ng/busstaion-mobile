import AsyncStorage from '@react-native-async-storage/async-storage';

export const TTL = {
  SHORT: 30 * 60 * 1000, // 30 min — listes live, dashboards
  MEDIUM: 4 * 60 * 60 * 1000, // 4 h    — détails voyage / gare / agence
  LONG: 24 * 60 * 60 * 1000, // 24 h   — défaut
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 j    — profils, abonnements, ressources stables
};

// [pattern, ttl] — première correspondance gagne
const TTL_RULES: [RegExp, number][] = [
  // 30 min : données fréquemment mises à jour
  [/^(home_trips|home_agencies|home_gares)$/, TTL.SHORT],
  [/^explore_(agencies|gares)$/, TTL.SHORT],
  [/^trips_list_/, TTL.SHORT],
  [/^bookings_/, TTL.SHORT],
  [/^history_/, TTL.SHORT],
  [/^agency_trips_/, TTL.SHORT],
  [/^bsm_agency_trips_/, TTL.SHORT],
  [/^bsm_agencies_/, TTL.SHORT],
  [/^bsm_taxes_/, TTL.SHORT],
  [/^org_agencies_/, TTL.SHORT],
  [/_dashboard_/, TTL.SHORT],

  // 4 h : données modérément stables
  [/^trip_detail_/, TTL.MEDIUM],
  [/^trip_[^d]/, TTL.MEDIUM],
  [/^booking_detail_/, TTL.MEDIUM],
  [/^client_dashboard_/, TTL.MEDIUM],
  [/^station_(detail|agencies|trips)_/, TTL.MEDIUM],
  [/^agency_detail_/, TTL.MEDIUM],
  [/^bsm_agency_detail_/, TTL.MEDIUM],
  [/^org_agency_detail_/, TTL.MEDIUM],
  [/^org_station_/, TTL.MEDIUM],
  [/^bsm_station_/, TTL.MEDIUM],
  [/^org_agency_stats_/, TTL.MEDIUM],

  // 7 jours : données stables
  [/_profile_/, TTL.WEEK],
  [/_classes$/, TTL.WEEK],
  [/^subscription_(plans|billing)_/, TTL.WEEK],
  [
    /^org_(service_line|affiliations|affiliation_taxes|my_agencies|profile_)/,
    TTL.WEEK,
  ],
  [/^agency_info_/, TTL.WEEK],
  [/^org_employees_/, TTL.WEEK],
  [/^org_vehicles_/, TTL.WEEK],
];

function getTTL(key: string): number {
  for (const [pattern, ttl] of TTL_RULES) {
    if (pattern.test(key)) return ttl;
  }
  return TTL.LONG;
}

type CacheEntry<T> = { data: T; timestamp: number; ttl: number };

export async function setCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: getTTL(key),
  };
  await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`cache_${key}`);
  if (!raw) return null;
  const entry: CacheEntry<T> = JSON.parse(raw);
  const ttl = entry.ttl ?? TTL.LONG; // compatibilité avec les entrées sans ttl
  if (Date.now() - entry.timestamp > ttl) return null;
  return entry.data;
}
