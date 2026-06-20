# Page `/bsm-dashboard/affiliated-agencies`

**Fichier** : `src/app/(bus-station-manager-views)/bsm-dashboard/affiliated-agencies/page.tsx`

## Description générale
Page dédiée à la gestion et à la consultation des agences affiliées à la gare routière du manager. Elle affiche la liste des agences opérant depuis la gare, avec un rendu détaillé et des informations de contact.

## Fonctionnalités principales
- Affichage d'une liste d'agences affiliées via le composant `AffiliatedAgenciesList`.
- Présentation de chaque agence avec :
  - logo
  - nom
  - localisation
  - description
  - contacts
  - statuts
- Gestion du chargement et des erreurs :
  - affichage d'un loader pendant le chargement des données
  - affichage d'un message d'erreur avec bouton "Réessayer" si l'appel API échoue
- Navigation possible vers la page de dashboard principal et les autres sections du BSM dashboard.

## Composants clés
- `AffiliatedAgenciesList`
- `Loader`
- `AlertCircle` et `RefreshCw` pour le feedback en cas d'erreur

## State & Hooks utilisés
### `useBusStationManager()`
```typescript
export function useBusStationManager(): {
  station: BusStation | null;
  agencies: AgencyWithTaxStatus[];
  trips: Trip[];
  tripsByDate: TripsByDate[];
  loading: boolean;
  error: string | null;
};
```

### `useBusStationDashboard(stationId: string)`
```typescript
export function useBusStationDashboard(stationId: string): {
  station: BusStation | null;
  agencies: AgencyWithTaxStatus[];
  trips: Trip[];
  tripsByDate: TripsByDate[];
  loading: boolean;
  error: string | null;
};
```

### `AgencyWithTaxStatus`
```typescript
export interface AgencyWithTaxStatus extends Agency {
  taxStatus?: "payé" | "en attente" | "en retard";
  taxAmount?: number;
  taxDueDate?: string;
}
```

## Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/gare/manager/{managerId}` | `GET` | Récupère la gare associée au manager connecté |
| `/agence/gare-routiere/{stationId}` | `GET` | Récupère les agences affiliées à la gare |

## Flux de données
1. Le hook `useBusStationManager()` récupère l'utilisateur connecté via `useBusStation()`.
2. Appel à `/gare/manager/{managerId}` pour obtenir l'ID de la gare reliée au manager.
3. Avec `stationId`, l'application charge les agences affiliées depuis `/agence/gare-routiere/{stationId}`.
4. Les agences sont envoyées au composant `AffiliatedAgenciesList` pour l'affichage.

## Comportement visuel
- Si `loading` est vrai : affichage du composant `Loader` centré.
- Si `error` est défini : affichage d'un message d'erreur clair et d'un bouton permettant de recharger la page.
- Si la liste d'agences est chargée : affichage plein écran du contenu de `AffiliatedAgenciesList`.

## Exemple de réponse attendue
### `/gare/manager/{managerId}`
```json
{
  "id": "station-01",
  "nom": "Gare Douala",
  "nomGareRoutiere": "Gare Centrale Douala",
  "ville": "Douala",
  "quartier": "Centre",
  "adresse": "Avenue de la République",
  "localisation": { "latitude": 4.0511, "longitude": 9.7679 },
  "description": "Principal terminus des transports en commun de Douala",
  "imageUrl": "https://api.busstation.com/gares/gare-central-douala.jpg",
  "services": ["WIFI", "PARKING", "RESTAURATION", "TOILETTES"],
  "nbAgencesAffiliees": 5,
  "estOuvert": true,
  "horaires": "06:00-22:00"
}
```

### `/agence/gare-routiere/{stationId}`
```json
[
  {
    "id": "agency-01",
    "idAgenceVoyage": "agency-01",
    "organisationId": "org-01",
    "userId": "user-01",
    "longName": "Voyage Plus",
    "shortName": "VP",
    "logoUrl": "https://api.busstation.com/agency-logos/voyageplus.jpg",
    "location": "Douala",
    "description": "Agence spécialisée dans les trajets longue distance",
    "greetingMessage": "Bienvenue chez Voyage Plus",
    "rating": 4.5,
    "specialties": ["Longue distance", "Confort"],
    "contact": {
      "email": "info@voyageplus.cm",
      "phone": "+237123456789",
      "website": "voyageplus.cm"
    },
    "gareIds": ["station-01"]
  }
]
```

## Note
La page ne gère pas directement la modification des agences : elle est conçue pour l'affichage et la consultation des relations d'affiliation.
