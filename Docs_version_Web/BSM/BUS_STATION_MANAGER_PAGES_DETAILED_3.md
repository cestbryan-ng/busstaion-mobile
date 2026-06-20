# Pages Infrastructure BSM - Spécifications détaillées

## 1. Page `/bsm-dashboard/infrastructure`

**Fichier** : `src/app/(bus-station-manager-views)/bsm-dashboard/infrastructure/page.tsx`

### Description générale
Page de gestion de l'infrastructure de la gare routière du manager de gare. Elle affiche un formulaire d'infrastructure permettant de lire et de modifier localement les informations principales de la gare.

### Fonctionnalités principales
- Affichage d'un formulaire d'édition grâce au composant `InfrastructureForm`.
- Modification des informations suivantes :
  - Nom de la gare routière
  - Ville
  - Quartier / adresse
  - Description
  - Photo de couverture
  - Services disponibles
  - Horaires d'ouverture
  - Statut d'ouverture (`estOuvert`)
  - Coordonnées GPS (latitude / longitude)
- Gestion du chargement : affichage du composant `Loader` tant que les données ne sont pas prêtes.
- Gestion des erreurs : affichage d'un message d'erreur et d'un bouton "Réessayer" si la récupération des données échoue.

### Composants clés
- `InfrastructureForm` : formulaire principal de la page.
- `Loader` : indicateur d'attente.
- `AlertCircle` et `RefreshCw` : gestion visuelle des erreurs.

### State & Hooks utilisés
#### `useBusStationManager()`
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

#### `useBusStationDashboard(stationId: string)`
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

#### `InfrastructureForm` props
```typescript
interface InfrastructureFormProps {
  station: BusStation;
  onSave?: (updatedStation: BusStation) => void;
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/gare/manager/{managerId}` | `GET` | Récupère l'ID et les informations de la gare associée au manager connecté |
| `/gare/{stationId}` | `GET` | Récupère les détails complets de la gare routière |
| `/agence/gare-routiere/{stationId}` | `GET` | Récupère les agences affiliées à la gare (chargées par le hook partagé) |
| `/politique-et-taxes/gare-routiere/{stationId}` | `GET` | Récupère les politiques et taxes liées à la gare (chargées par le hook partagé) |
| `/voyage/agence/{agencyId}` | `GET` | Récupère les voyages publiés par chaque agence affiliée (chargés par le hook partagé) |

> Note : la page actuelle n'appelle pas directement un endpoint de mise à jour. Le composant `InfrastructureForm` gère uniquement un état local et déclenche `onSave` s'il est fourni.

### Flux de données
1. `useBusStationManager()` récupère l'utilisateur connecté via `useBusStation()`.
2. Appel à `/gare/manager/{managerId}` pour déterminer la gare du manager.
3. Avec le `stationId`, le hook charge les données de la gare via `/gare/{stationId}`.
4. Les données de la station sont passées à `InfrastructureForm`.
5. Si le formulaire est soumis, `InfrastructureForm` met à jour localement son état et affiche un message de confirmation.

### Exemple de réponse attendue
#### `/gare/manager/{managerId}`
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

#### `/gare/{stationId}`
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

---

## 2. Page `/bsm-dashboard/infrastructure/[id]`

**Statut** : non implémentée dans l'arborescence actuelle du projet.

### Contexte
Aucun fichier `src/app/(bus-station-manager-views)/bsm-dashboard/infrastructure/[id]/page.tsx` n'existe actuellement.

### Recommandation
Si cette page doit être ajoutée, elle peut servir à afficher le détail d'une infrastructure spécifique — par exemple un bâtiment, un quai, une zone de maintenance ou un équipement identifié par ID.

### Endpoints recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/infrastructure/{id}` | `GET` | Récupère les détails d'une infrastructure spécifique |
| `/infrastructure/{id}` | `PUT` | Met à jour l'infrastructure identifiée |
| `/infrastructure/{id}/status` | `PATCH` | Modifie le statut de l'infrastructure |

---

## 3. Page `/bsm-dashboard/infrastructure/maintenance`

**Statut** : non implémentée dans l'arborescence actuelle du projet.

### Contexte
Aucun fichier `src/app/(bus-station-manager-views)/bsm-dashboard/infrastructure/maintenance/page.tsx` n'existe actuellement.

### Recommandation
Cette page pourrait servir à suivre les opérations de maintenance de la gare :
- historiques de maintenance
- planning des interventions
- véhicules ou équipements en maintenance
- rapports et actions en cours

### Endpoints recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/infrastructure/maintenance` | `GET` | Liste des opérations de maintenance |
| `/infrastructure/maintenance/{id}` | `GET` | Détails d'une opération de maintenance |
| `/infrastructure/maintenance` | `POST` | Crée une nouvelle opération de maintenance |
| `/infrastructure/maintenance/{id}` | `PUT` | Met à jour une opération de maintenance |

---

## Notes
- La seule page réellement implémentée dans le dossier `bsm-dashboard/infrastructure` est `page.tsx`.
- Le composant `InfrastructureForm` gère les modifications localement et ne réalise pas d'appel API de sauvegarde en l'état.
- Les routes `/bsm-dashboard/infrastructure/[id]` et `/bsm-dashboard/infrastructure/maintenance` devront être ajoutées si tu veux documenter un comportement effectif ou des pages existantes.
