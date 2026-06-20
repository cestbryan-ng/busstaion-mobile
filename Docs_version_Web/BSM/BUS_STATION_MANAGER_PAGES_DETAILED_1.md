# Page `/bsm-dashboard`

**Fichier** : `src/app/(bus-station-manager-views)/bsm-dashboard/page.tsx`

## Description générale
Page principale du tableau de bord du gestionnaire de gare routière. Elle offre un aperçu de l'activité de la gare, des agences affiliées, des indicateurs clés et de l'analyse des voyages.

## Fonctionnalités principales
- Affichage de cartes KPI : nombre d'agences affiliées, voyages programmés, taxes en retard, taux d'occupation.
- Affichage des détails de la gare via le composant `StationDetails`.
- Affichage de la liste détaillée des agences affiliées via `DetailedAffiliatedAgenciesList`.
- Graphique de l'évolution des voyages avec `TripsChart`.
- Gestion des états : `loading`, `error` et rechargement.

## Composants clés
- `StationDetails`
- `DetailedAffiliatedAgenciesList`
- `TripsChart`
- `Loader`
- `AlertCircle`, `RefreshCw` pour la gestion des erreurs

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
| `/gare/{stationId}` | `GET` | Récupère les détails complets de la gare routière |
| `/agence/gare-routiere/{stationId}` | `GET` | Récupère les agences affiliées à la gare |
| `/politique-et-taxes/gare-routiere/{stationId}` | `GET` | Récupère les politiques et taxes liées à la gare |
| `/voyage/agence/{agencyId}` | `GET` | Récupère les voyages publiés par une agence |

## Flux de données
1. Le hook `useBusStationManager()` récupère l'utilisateur connecté depuis `useBusStation()`.
2. Appel à `/gare/manager/{managerId}` pour déterminer l'ID de la gare.
3. Le `stationId` sert à charger :
   - les détails de la gare
   - les agences affiliées
   - les politiques/taxes de la gare
   - les voyages de chaque agence
4. Les résultats sont affichés dans le dashboard avec des composants dédiés.

## Réponses attendues
### Exemple réponse `/gare/manager/{managerId}`
```json
{
  "id": "station-01",
  "nom": "Gare Douala",
  "nomGareRoutiere": "Gare Centrale Douala",
  "ville": "Douala",
  "quartier": "Centre",
  "adresse": "Avenue de la République",
  "localisation": { "latitude": 4.0511, "longitude": 9.7679 },
  "description": "Terminus principal de Douala avec services complets.",
  "imageUrl": "https://api.busstation.com/gares/gare-central-douala.jpg",
  "services": ["WIFI", "PARKING", "RESTAURATION", "TOILETTES"],
  "nbAgencesAffiliees": 5,
  "estOuvert": true,
  "horaires": "06:00-22:00"
}
```

### Exemple réponse `/agence/gare-routiere/{stationId}`
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

### Exemple réponse `/politique-et-taxes/gare-routiere/{stationId}`
```json
[
  {
    "id": "policy-01",
    "stationId": "station-01",
    "title": "Taxe d'exploitation",
    "description": "Taxe mensuelle pour les agences affiliées",
    "category": "Taxe",
    "amount": 50000,
    "effectiveDate": "2026-01-01",
    "documentUrl": null
  }
]
```

### Exemple réponse `/voyage/agence/{agencyId}`
```json
{
  "content": [
    {
      "idVoyage": "trip-01",
      "titre": "Douala - Yaoundé Express",
      "lieuDepart": "Douala",
      "lieuArrive": "Yaoundé",
      "dateDepartPrev": "2026-06-20T08:00:00",
      "heureDepart": "08:00",
      "heureArrive": "12:30",
      "statusVoyage": "PUBLIE",
      "nomClasseVoyage": "VIP",
      "amenities": ["WIFI", "AC", "USB"],
      "prix": 15000,
      "nbrPlaceRestante": 12,
      "agencyId": "agency-01"
    }
  ]
}
```

## Gestion des erreurs
- Affiche un loader jusqu'à la disponibilité des données.
- En cas d'erreur, affiche un message de retour utilisateur avec un bouton "Réessayer".
- Les erreurs proviennent principalement des appels aux endpoints de chargement de la gare, des agences ou des voyages.
