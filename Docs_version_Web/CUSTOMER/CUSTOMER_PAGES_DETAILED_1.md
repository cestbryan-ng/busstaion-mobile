# Pages Customer - Spécifications détaillées

## 1. Page `/market-place`

**Fichier** : `src/app/(customer-view)/market-place/page.tsx`

### Description générale
Page de catalogue et recherche de trajets disponibles. Affichage d'un marché des voyages publiés par les agences partenaires, avec recherche multi-critères et filtres.

### Fonctionnalités principales
- **Affichage des trajets** : Grille de voyages publiés sur la plateforme
- **Recherche multi-critères** :
  - Lieu de départ
  - Lieu d'arrivée
  - Date de départ
- **Filtres** : Par lieu de départ ou d'arrivée (dropdown "all")
- **Informations affichées** :
  - Classe du voyage (VIP, Premium, Standard, Economy)
  - Commodités (WiFi, AC, USB, Boissons, Snacks, Prises électriques, Divertissement)
  - Prix
  - Durée du voyage
  - Nombre de sièges disponibles
- **Mode d'affichage** : Toggle Grid/List (si implémenté)
- **Pagination** : Navigation entre les pages de résultats
- **Navigation** : Lien vers le détail d'un voyage (`/market-place/trip/[idVoyage]`)

### State & Hooks utilisés
```typescript
export function useMarketPlace() {
  - availableTrips: Partial<Trip>[] | null
  - filteredTrips: Partial<Trip>[] | null
  - error: string | null
  - isLoading: boolean
  - activeFilter: string
  - searchFilters: SearchFilterType { departure, arrival, date }
  - handleSearch()
  - getClassColor()
  - getAmenityIcon()
  - setActiveFilter()
  - setSearchFilters()
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/voyage` | `GET` | Récupère la liste de tous les voyages (paginée) |

**Réponse attendue** :
```json
{
  "content": [
    {
      "idVoyage": "trip-01",
      "lieuDepart": "Douala",
      "lieuArrive": "Yaoundé",
      "dateDepartPrev": "2026-06-15T08:00:00",
      "statusVoyage": "PUBLIE",
      "class": "VIP",
      "amenities": ["WIFI", "AC", "USB"],
      "prix": 15000,
      "durationHours": 4.5,
      "seatsAvailable": 12
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalPages": 5,
  "totalElements": 150
}
```

**Note** : Seuls les voyages avec `statusVoyage === "PUBLIE"` sont affichés sur le marketplace.

---

## 2. Page `/agency`

**Fichier** : `src/app/(customer-view)/agency/page.tsx`

### Description générale
Page de listing des agences partenaires. Affichage des profils publics des agences de voyage proposées sur la plateforme.

### Fonctionnalités principales
- **Affichage des agences** : Grille de cartes d'agences
- **Recherche** : Par nom d'agence ou localisation
- **Informations affichées par agence** :
  - Logo/Image de l'agence
  - Nom complet
  - Localisation
  - Description/Services
  - Bouton d'action
- **Navigation** : Lien vers la fiche détail de l'agence (`/agency/[agencyId]`)

### State & Hooks utilisés
```typescript
export function useAgencies() {
  - agencies: TravelAgency[]
  - isLoading: boolean
  - error: string | null
  - searchQuery: string
  - setSearchQuery()
  - refetch()
}
```

Les agences sont filtrées en temps réel par `longName` et `location`.

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence` | `GET` | Récupère la liste de toutes les agences publiques |

**Réponse attendue** :
```json
{
  "content": [
    {
      "agencyId": "agency-01",
      "longName": "Voyage Plus",
      "location": "Douala",
      "contact": {
        "website": "voyageplus.cm",
        "phone": "+237123456789",
        "email": "info@voyageplus.cm"
      },
      "photoUrl": "https://api.busstation.com/agency-logos/voyageplus.jpg",
      "description": "Agence de voyage spécialisée dans les trajets longue distance",
      "ratingAverage": 4.5,
      "numberOfReviews": 128
    }
  ]
}
```

---

## 3. Page `/gares-routieres`

**Fichier** : `src/app/(customer-view)/gares-routieres/page.tsx`

### Description générale
Page de listing des gares routières. Affichage des points de départ/arrivée pour les voyages, avec filtres de services.

### Fonctionnalités principales
- **Affichage des gares** : Grille de cartes de gares
- **Recherche** : Par nom de gare ou ville
- **Filtres de services** :
  - WIFI
  - PARKING
  - RESTAURATION
  - SALLE_ATTENTE
  - TOILETTES
  - SECURITE
- **Informations affichées** :
  - Nom et localisation
  - Services disponibles
  - Horaires d'ouverture
  - Nombre d'agences affiliées
- **Navigation** : Lien vers le détail de la gare (`/gares-routieres/[id]`)

### State & Hooks utilisés
```typescript
export function useGaresRoutieres() {
  - gares: GareRoutiere[]
  - isLoading: boolean
  - error: string | null
  - searchQuery: string
  - selectedServices: Service[]
  - allServices: Service[]
  - setSearchQuery()
  - handleServiceToggle()
  - refetch()
}
```

Le filtrage par services se fait **côté serveur** avec un paramètre de requête.

### Endpoints API utilisés

| Endpoint | Méthode | Description | Paramètres |
|----------|---------|-------------|-----------|
| `/gare` | `GET` | Récupère la liste des gares | `?services=WIFI,PARKING,...` (optionnel) |

**Réponse attendue** :
```json
{
  "content": [
    {
      "idGareRoutiere": "gare-01",
      "nomGareRoutiere": "Gare Centrale Douala",
      "ville": "Douala",
      "quartier": "Centre",
      "adresse": "Avenue de la République",
      "description": "Principal terminus des transports en commun de Douala",
      "photoUrl": "https://api.busstation.com/gares/gare-central-douala.jpg",
      "services": ["WIFI", "PARKING", "RESTAURATION", "TOILETTES"],
      "nbreAgence": 5,
      "horaires": {
        "lundi": "06:00-22:00",
        "mardi": "06:00-22:00",
        "mercredi": "06:00-22:00",
        "jeudi": "06:00-22:00",
        "vendredi": "06:00-22:00",
        "samedi": "07:00-23:00",
        "dimanche": "07:00-23:00"
      }
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalPages": 3,
  "totalElements": 28
}
```

---

## 4. Page `/coupons`

**Fichier** : `src/app/(customer-view)/coupons/page.tsx`

### Description générale
Page de gestion des coupons de remboursement pour l'utilisateur connecté. Affichage des coupons obtenus lors d'annulations de réservations.

### Fonctionnalités principales
- **Affichage des coupons** :
  - Mode Grid ou List
  - Statut : VALIDE, EXPIRE
  - Filtres : Tous, Valides, Expirés
- **Informations affichées par coupon** :
  - ID du coupon
  - Valeur en FCFA
  - Agence associée
  - Lieu d'arrivée
  - Date de début et fin de validité
  - Statut
- **Actions** :
  - Téléchargement du coupon en PDF
  - Affichage du QR Code
  - Filtrage par statut

### State & Hooks utilisés
```typescript
export function useCoupons(activeTab: string) {
  - filteredCoupons: CouponDTO[]
  - isLoading: boolean
  - error: string | null
}

interface CouponDTO {
  idCoupon: string;
  dateDebut: string;
  dateFin: string;
  statusCoupon: string; // "VALIDE" | "EXPIRE"
  valeur: number;
  idHistorique: string;
  nomAgence: string;
  lieuArrive: string;
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/coupon/user/{userId}` | `GET` | Récupère les coupons de l'utilisateur |

**Réponse attendue** :
```json
[
  {
    "idCoupon": "COUP-001",
    "dateDebut": "2026-06-01T00:00:00",
    "dateFin": "2026-12-31T23:59:59",
    "statusCoupon": "VALIDE",
    "valeur": 25000,
    "idHistorique": "HIST-001",
    "nomAgence": "Voyage Plus",
    "lieuArrive": "Yaoundé"
  },
  {
    "idCoupon": "COUP-002",
    "dateDebut": "2025-12-01T00:00:00",
    "dateFin": "2026-03-31T23:59:59",
    "statusCoupon": "EXPIRE",
    "valeur": 15000,
    "idHistorique": "HIST-002",
    "nomAgence": "Express Travel",
    "lieuArrive": "Buea"
  }
]
```

---

## Résumé des Endpoints par Page

| Page | Endpoint | Méthode | Paramètres |
|------|----------|---------|-----------|
| Market Place | `/voyage` | GET | — |
| Agency | `/agence` | GET | — |
| Gares Routières | `/gare` | GET | `?services=...` (optionnel) |
| Coupons | `/coupon/user/{userId}` | GET | — |

---

## Notes d'implémentation

1. **Authentification** : Les pages `/profil`, `/my-reservations` et `/coupons` nécessitent une authentification utilisateur.
2. **Cachage** : Considérer un système de cache côté client (React Query, SWR) pour les listes.
3. **Pagination** : Les endpoints `/voyage` et `/gare` retournent des réponses paginées.
4. **Filtres serveur vs client** :
   - `/gare` : Filtres serveur (paramètres de requête)
   - `/market-place` : Filtres client (JavaScript côté client)
   - `/agency` : Filtres client (useMemo)
   - `/coupons` : Filtres client (useMemo)
5. **Requête axios** : Toutes les requêtes utilisent l'instance `axiosInstance` configurée avec les en-têtes d'authentification.
