# Pages Agences & Gares Routières - Spécifications détaillées

## 1. Page `/agency`

**Fichier** : `src/app/(customer-view)/agency/page.tsx`

### Description générale
Page de listing des agences partenaires. Affichage des profils publics des agences de voyage proposées sur la plateforme avec recherche.

### Fonctionnalités principales
- **Affichage des agences** : Grille de cartes d'agences
- **Recherche** : Par nom d'agence ou localisation (filtre client useMemo)
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
  - agencies: TravelAgency[] (filtré)
  - isLoading: boolean
  - error: string | null
  - searchQuery: string
  - setSearchQuery()
  - refetch()
}
```

Les agences sont filtrées en temps réel par `longName` et `location` (useMemo côté client).

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
    },
    {
      "agencyId": "agency-02",
      "longName": "Express Travel",
      "location": "Yaoundé",
      "contact": {...},
      "photoUrl": "...",
      "description": "Service premium avec confort et sécurité",
      "ratingAverage": 4.8,
      "numberOfReviews": 256
    }
  ]
}
```

---

## 2. Page `/agency/[agencyId]`

**Fichier** : `src/app/(customer-view)/agency/[agencyId]/page.tsx`

### Description générale
Fiche détail d'une agence de voyage. Affichage du profil complet de l'agence avec ses voyages publiés, horaires et services.

### Fonctionnalités principales
- **Affichage du profil agence** :
  - Logo et bannière
  - Nom complet et localisation
  - Description détaillée
  - Coordonnées (téléphone, email, site web)
  - Rating et nombre d'avis
  - Services proposés
- **Affichage des voyages** :
  - Liste ou grille des voyages publiés par l'agence
  - Informations : classe, amenités, prix, horaires
- **Bouton retour** : Retour à la liste des agences (`/agency`)

### State & Hooks utilisés
```typescript
export function useAgencyPublicDetails(agencyId: string) {
  - agency: TravelAgency | null
  - trips: Trip[] (contenu de TripAxiosResponseInterface)
  - isLoading: boolean
  - error: string | null
  - refetch()
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/{id}` | `GET` | Récupère les détails d'une agence spécifique |
| `/voyage/agence/{agencyId}/public` | `GET` | Récupère les voyages publiés par l'agence |

**Réponse `/agence/{id}`** :
```json
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
  "bannerUrl": "https://api.busstation.com/agency-banners/voyageplus.jpg",
  "description": "Agence de voyage spécialisée dans les trajets longue distance avec confort premium",
  "ratingAverage": 4.5,
  "numberOfReviews": 128,
  "foundedYear": 2010,
  "affiliatedGares": 12,
  "totalTrips": 45
}
```

**Réponse `/voyage/agence/{agencyId}/public`** :
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
      "class": "VIP",
      "amenities": ["WIFI", "AC", "USB"],
      "prix": 15000,
      "seatsAvailable": 12,
      "durationHours": 4.5
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalPages": 2,
  "totalElements": 12
}
```

---

## 3. Page `/gares-routieres`

**Fichier** : `src/app/(customer-view)/gares-routieres/page.tsx`

### Description générale
Page de listing des gares routières. Affichage des points de départ/arrivée pour les voyages, avec filtres de services côté serveur.

### Fonctionnalités principales
- **Affichage des gares** : Grille de cartes de gares
- **Recherche** : Par nom de gare ou ville (filtre client useMemo)
- **Filtres de services** (côté serveur) :
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
  - gares: GareRoutiere[] (filtré par recherche)
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

Le filtrage par services se fait **côté serveur** avec un paramètre de requête, la recherche par nom/ville **côté client** (useMemo).

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

## 4. Page `/gares-routieres/[id]`

**Fichier** : `src/app/(customer-view)/gares-routieres/[id]/page.tsx`

### Description générale
Fiche détail d'une gare routière. Affichage complet des informations de la gare avec les agences présentes et les départs disponibles.

### Fonctionnalités principales
- **Affichage du profil gare** :
  - Bannière et image
  - Nom et localisation (quartier, adresse)
  - Description détaillée
  - Horaires d'ouverture (tous les jours)
  - Services disponibles (badges)
  - Coordonnées de contact
- **Onglets de contenu** :
  - **Agences affiliées** : Liste des agences opérant depuis cette gare
  - **Départs** : Trajets publiés au départ de cette gare
- **Bouton retour** : Retour à la liste des gares (`/gares-routieres`)
- **Navigation** : Lien vers détail agence (`/agency/[agencyId]`)

### State & Hooks utilisés
```typescript
export function useGareDetails(gareId: string) {
  - gare: GareRoutiere | null
  - agences: TravelAgency[]
  - departs: Trip[]
  - isLoading: boolean
  - error: string | null
  - refetch()
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/gare/{id}` | `GET` | Récupère les détails d'une gare routière |
| `/agence/gare-routiere/{gareId}` | `GET` | Récupère les agences présentes dans la gare |
| `/voyage/gare/{gareId}` | `GET` | Récupère les trajets au départ de la gare |

**Réponse `/gare/{id}`** :
```json
{
  "idGareRoutiere": "gare-01",
  "nomGareRoutiere": "Gare Centrale Douala",
  "ville": "Douala",
  "quartier": "Centre",
  "adresse": "Avenue de la République, Douala",
  "description": "Principal terminus des transports en commun de Douala. Établie depuis 1995, offre des services de qualité avec parking sécurisé et restauration.",
  "photoUrl": "https://api.busstation.com/gares/gare-central-douala.jpg",
  "services": ["WIFI", "PARKING", "RESTAURATION", "SALLE_ATTENTE", "TOILETTES", "SECURITE"],
  "nbreAgence": 5,
  "horaires": {
    "lundi": "06:00-22:00",
    "mardi": "06:00-22:00",
    "mercredi": "06:00-22:00",
    "jeudi": "06:00-22:00",
    "vendredi": "06:00-22:00",
    "samedi": "07:00-23:00",
    "dimanche": "07:00-23:00"
  },
  "contact": {
    "phone": "+237691234567",
    "email": "contact@gare-douala.cm"
  }
}
```

**Réponse `/agence/gare-routiere/{gareId}`** :
```json
[
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
    "description": "Agence de voyage spécialisée",
    "ratingAverage": 4.5,
    "numberOfReviews": 128
  },
  {
    "agencyId": "agency-03",
    "longName": "Safe Travels",
    "location": "Douala",
    "contact": {...},
    "photoUrl": "...",
    "description": "Transport sécurisé et confortable",
    "ratingAverage": 4.7,
    "numberOfReviews": 89
  }
]
```

**Réponse `/voyage/gare/{gareId}`** :
```json
[
  {
    "idVoyage": "trip-01",
    "titre": "Douala - Yaoundé Express",
    "lieuDepart": "Douala",
    "lieuArrive": "Yaoundé",
    "dateDepartPrev": "2026-06-20T08:00:00",
    "heureDepart": "08:00",
    "heureArrive": "12:30",
    "statusVoyage": "PUBLIE",
    "class": "VIP",
    "amenities": ["WIFI", "AC"],
    "prix": 15000,
    "seatsAvailable": 8,
    "agencyName": "Voyage Plus"
  },
  {
    "idVoyage": "trip-02",
    "titre": "Douala - Bafoussam",
    "lieuDepart": "Douala",
    "lieuArrive": "Bafoussam",
    "dateDepartPrev": "2026-06-20T14:00:00",
    "heureDepart": "14:00",
    "heureArrive": "18:45",
    "statusVoyage": "PUBLIE",
    "class": "Standard",
    "amenities": ["AC"],
    "prix": 12000,
    "seatsAvailable": 15,
    "agencyName": "Safe Travels"
  }
]
```

---

## 5. Page `/history/reservation`

**Fichier** : `src/app/(customer-view)/history/reservation/page.tsx`

### Description générale
Page d'historique des voyages réalisés ou confirmés. Affichage des réservations passées avec téléchargement de billets et consultation des détails.

### Fonctionnalités principales
- **Affichage des réservations** : Grille de cartes de voyages
- **Recherche** : Par nom passager, ID réservation, ville départ/arrivée (filtre client)
- **Filtres** :
  - Par statut voyage (VIP, Standard)
  - Par état (EN_COURS, EN_ATTENTE, TERMINE)
- **Informations affichées** :
  - Référence billet (#idHistorique)
  - Passager principal (nom)
  - Itinéraire (départ → arrivée)
  - Date et heure
  - Prix du billet
  - Siège réservé
  - Statut voyage et historique
- **Actions** :
  - Affichage détail en modale
  - Téléchargement du billet (HTML)
  - Affichage du QR Code du billet

### State & Hooks utilisés
```typescript
export function useHistorique() {
  - historiques: HistoriqueEnrichi[]
  - reservations: HistoriqueEnrichi[]
  - isLoading: boolean
  - error: string | null
}

interface HistoriqueEnrichi {
  idHistorique: string;
  statusHistorique: string; // "TERMINE", "EN_ATTENTE"
  dateReservation: string;
  dateConfirmation: string;
  reservation: ReservationDetailsDTO | null;
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/historique/reservation/{userId}` | `GET` | Récupère l'historique des réservations |
| `/reservation/{idReservation}` | `GET` | Récupère les détails d'une réservation (enrichissement) |

**Réponse `/historique/reservation/{userId}`** :
```json
[
  {
    "idHistorique": "HIST-001",
    "statusHistorique": "TERMINE",
    "dateReservation": "2026-05-15T10:30:00",
    "dateConfirmation": "2026-05-15T11:00:00",
    "dateAnnulation": null,
    "causeAnnulation": null,
    "origineAnnulation": null,
    "tauxAnnulation": 0,
    "compensation": 0,
    "idReservation": "RES-001"
  },
  {
    "idHistorique": "HIST-002",
    "statusHistorique": "TERMINE",
    "dateReservation": "2026-04-20T14:00:00",
    "dateConfirmation": "2026-04-20T14:30:00",
    "dateAnnulation": null,
    "causeAnnulation": null,
    "origineAnnulation": null,
    "tauxAnnulation": 0,
    "compensation": 0,
    "idReservation": "RES-002"
  }
]
```

**Réponse `/reservation/{idReservation}` (enrichissement)** :
```json
{
  "idReservation": "RES-001",
  "lieuDepart": "Douala",
  "lieuArrive": "Yaoundé",
  "pointDeDepart": "Gare Centrale",
  "pointArrivee": "Gare de Yaoundé",
  "heureDepart": "08:00",
  "heureArrive": "12:30",
  "dateDepart": "2026-05-20",
  "nomAgence": "Voyage Plus",
  "statusVoyage": "VIP",
  "passagers": [
    {
      "nom": "Jean Dupont",
      "telephone": "+237691234567",
      "carteID": "ID-12345",
      "age": 28,
      "genre": "M",
      "siege": "A01",
      "prixBillet": 15000
    }
  ]
}
```

---

## Résumé des Endpoints par Page

| Page | Endpoint | Méthode | Description |
|------|----------|---------|-------------|
| Agency | `/agence` | GET | Liste des agences publiques |
| Agency Details | `/agence/{id}` | GET | Détails d'une agence |
| Agency Details | `/voyage/agence/{agencyId}/public` | GET | Voyages publiés d'une agence |
| Gares Routières | `/gare` | GET | Liste des gares (avec filtres optionnels) |
| Gares Routières Details | `/gare/{id}` | GET | Détails d'une gare |
| Gares Routières Details | `/agence/gare-routiere/{gareId}` | GET | Agences d'une gare |
| Gares Routières Details | `/voyage/gare/{gareId}` | GET | Départs d'une gare |
| History Reservation | `/historique/reservation/{userId}` | GET | Historique réservations |
| History Reservation | `/reservation/{idReservation}` | GET | Enrichissement détails |

---

## Flux de données

### 1. **Agency → Agency Details**
```
useAgencies() → page listing
            ↓
GET /agence
            ↓
TravelAgency[]
            ↓
Clic sur agence → naviguer vers /agency/[agencyId]
            ↓
useAgencyPublicDetails(agencyId)
            ↓
Requête parallèle:
  - GET /agence/{agencyId}
  - GET /voyage/agence/{agencyId}/public
            ↓
Affichage profil + voyages publiés
```

### 2. **Gares Routières → Gares Routières Details**
```
useGaresRoutieres() → page listing
                  ↓
GET /gare?services=... (côté serveur)
Recherche par nom/ville (côté client useMemo)
                  ↓
GareRoutiere[]
                  ↓
Clic sur gare → naviguer vers /gares-routieres/[id]
                  ↓
useGareDetails(gareId)
                  ↓
Requête parallèle:
  - GET /gare/{gareId}
  - GET /agence/gare-routiere/{gareId}
  - GET /voyage/gare/{gareId}
                  ↓
Affichage profil + agences + départs
```

### 3. **History Reservation**
```
useHistorique() → filtrage reservations (statusHistorique !== "ANNULE")
              ↓
GET /historique/reservation/{userId}
              ↓
HistoriqueDTO[]
              ↓
Pour chaque historique → GET /reservation/{idReservation}
              ↓
HistoriqueEnrichi[] avec données complètes
              ↓
Affichage grille + modale détails + téléchargement billet
```

---

## Notes d'implémentation

1. **Filtrage côté client vs serveur** :
   - `/agence` : Filtrage client (useMemo) par `longName` et `location`
   - `/gare` : Filtrage serveur (paramètres de requête `services=...`), recherche client (useMemo)
   - `/history/reservation` : Filtrage client (useMemo)

2. **Requêtes parallèles** : Les pages détail (`/agency/[agencyId]` et `/gares-routieres/[id]`) utilisent `Promise.all()` pour paralléliser les requêtes API.

3. **Enrichissement de données** : `/history/reservation` enrichit chaque historique avec `GET /reservation/{idReservation}`.

4. **Pagination** : Les endpoints `/voyage/agence/{agencyId}/public` et `/gare` retournent des réponses paginées.

5. **Authentification** : `/history/reservation` utilise `userData.userId` du contexte `useBusStation()`.

6. **Téléchargement** : `/history/reservation` génère un HTML téléchargeable du billet.

7. **Services** : Les agences et gares retournent des tableaux de services accessibles pour les filtres et affichage.
