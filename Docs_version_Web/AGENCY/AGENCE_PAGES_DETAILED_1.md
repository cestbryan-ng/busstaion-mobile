# Pages Agence Voyage - Dashboard détaillé

Ce document décrit les pages `/dashboard`, `/dashboard/planning`, `/dashboard/marketplace`, `/dashboard/subscription` et `/dashboard/feedback` de l'acteur `agence_voyage` dans le projet `busstation2`.

> Le dossier principal est `src/app/(agency-views)`.

## 1. Page `/dashboard`

**Fichier** : `src/app/(agency-views)/dashboard/page.tsx`

**Route** : `/dashboard`

### Description générale
Page principale du tableau de bord agence. Elle affiche un aperçu global de l'activité de l'agence, avec les indicateurs clés, les graphiques d'évolution et la liste des réservations récentes.

### Fonctionnalités principales
- Affichage des indicateurs clés : revenus, nombre de réservations, voyages publiés, nouveaux clients.
- Affichage des graphiques d'évolution.
- Affichage des réservations récentes.
- CTA vers la création et la planification de voyage.

### State & Hooks utilisés
```typescript
export function useDashboardOverview() {
  - isLoading: boolean
  - apiError: string | null
  - generalStats: AgenceStatisticsDTO | null
  - evolutionData: AgenceEvolutionDTO | null
  - recentBookings: ReservationPreviewDTO[]
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence liée à l'utilisateur connecté. |
| `/statistics/agence/{agencyId}/general` | `GET` | Récupère les statistiques générales de l'agence (KPI). |
| `/statistics/agence/{agencyId}/evolution` | `GET` | Récupère les données d'évolution pour les graphiques. |
| `/reservation/agence/{agencyId}` | `GET` | Récupère les réservations récentes pour l'agence. |

**Réponse attendue `/agence/chef-agence/{chefId}`** :
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
  "photoUrl": "https://api.busstation.com/agency-logos/voyageplus.jpg"
}
```

**Réponse attendue `/statistics/agence/{agencyId}/general`** :
```json
{
  "revenus": 12500000,
  "nombreReservations": 184,
  "nombreVoyages": 32,
  "nouveauxUtilisateurs": 28
}
```

**Réponse attendue `/statistics/agence/{agencyId}/evolution`** :
```json
{
  "data": [
    { "date": "2026-05-01", "value": 1200000 },
    { "date": "2026-05-08", "value": 1350000 },
    { "date": "2026-05-15", "value": 1420000 }
  ]
}
```

**Réponse attendue `/reservation/agence/{agencyId}`** :
```json
{
  "content": [
    {
      "idReservation": "res-001",
      "tripTitle": "Douala - Yaoundé Express",
      "customerName": "Mariam T.",
      "status": "CONFIRMED",
      "amount": 15000,
      "date": "2026-06-01"
    }
  ],
  "pageable": { "pageNumber": 0, "pageSize": 10 },
  "totalPages": 1,
  "totalElements": 5
}
```

### Pages accessibles depuis cette page
- `/dashboard/planning`
- `/dashboard/trip-planning`
- `/dashboard/marketplace`
- `/dashboard/calendar`
- `/dashboard/feedback`
- `/dashboard/resources`
- `/dashboard/settings`
- `/dashboard/subscription`

---

## 2. Page `/dashboard/planning`

**Fichier** : `src/app/(agency-views)/dashboard/planning/page.tsx`

**Route** : `/dashboard/planning`

### Description générale
Page de gestion du profil et du planning de l'agence. Elle affiche les informations publiques de l'agence, ses contacts et spécialités, puis permet de consulter et modifier le planning hebdomadaire.

### Fonctionnalités principales
- Chargement des informations publiques de l'agence.
- Édition des informations de l'agence via `EditableAgencyInfo`.
- Édition des contacts via `EditableAgencyContact`.
- Édition des spécialités via `EditableAgencySpecialties`.
- Affichage du planning hebdomadaire avec `WeeklySchedule`.

### State & Hooks utilisés
```typescript
export function useAgencyPublicDetails(agencyId: string) {
  - agency: TravelAgency | null
  - trips: Trip[]
  - isLoading: boolean
  - error: string | null
  - refetch(): void
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/{agencyId}` | `GET` | Récupère les détails publics de l'agence. |
| `/voyage/agence/{agencyId}/public` | `GET` | Récupère les voyages publics de l'agence. |

**Réponse attendue `/agence/{agencyId}`** :
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
  "description": "Agence de voyage spécialisée dans les trajets longue distance",
  "specialties": ["VIP", "Transport express"]
}
```

**Réponse attendue `/voyage/agence/{agencyId}/public`** :
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
      "prix": 15000,
      "nbrPlaceReservable": 50,
      "nbrPlaceRestante": 12
    }
  ],
  "pageable": { "pageNumber": 0, "pageSize": 10 },
  "totalPages": 1,
  "totalElements": 1
}
```

### Pages accessibles depuis cette page
- Retour vers `/dashboard`
- `/dashboard/trip-planning`
- `/dashboard/drafts`

---

## 3. Page `/dashboard/marketplace`

**Fichier** : `src/app/(agency-views)/dashboard/marketplace/page.tsx`

**Route** : `/dashboard/marketplace`

### Description générale
Page de gestion des voyages publiés par l'agence. Elle affiche la liste des voyages, les filtres par statut, la recherche textuelle et les actions sur chaque voyage.

### Fonctionnalités principales
- Chargement des voyages publiés de l'agence.
- Recherche par titre, lieu de départ ou lieu d'arrivée.
- Filtrage par statut (`all`, `PUBLIE`, `EN_COURS`, `TERMINE`, `ANNULE`).
- Affichage des statistiques globales des voyages.
- Navigation vers les réservations d'un voyage.
- Édition d'un voyage et annulation avec confirmation.

### State & Hooks utilisés
```typescript
export function usePublishedTrips() {
  - isLoading: boolean
  - isActionLoading: boolean
  - apiError: string | null
  - filteredTrips: TripDetails[]
  - stats: { total: number; publies: number; enCours: number; termines: number; totalRevenue: number; totalReservations: number }
  - filter: 'all' | 'PUBLIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE'
  - setFilter(): void
  - searchTerm: string
  - setSearchTerm(): void
  - filterOptions: { label: string; value: string }[]
  - confirmModal: ConfirmModal
  - closeModal(): void
  - handleViewBookings(tripId: string): void
  - handleEditTrip(tripId: string): void
  - openCancelModal(tripId: string): void
  - calculateTripStats(trip: TripDetails)
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence de l'utilisateur connecté. |
| `/voyage/agence/{agencyId}/public` | `GET` | Récupère la liste des voyages publics de l'agence. |
| `/voyage/{tripId}` | `PUT` | Met à jour un voyage (utilisé pour annuler un voyage). |

**Réponse attendue `/voyage/agence/{agencyId}/public`** :
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
      "prix": 15000,
      "nbrPlaceReservable": 50,
      "nbrPlaceRestante": 12
    }
  ],
  "pageable": { "pageNumber": 0, "pageSize": 10 },
  "totalPages": 1,
  "totalElements": 1
}
```

**Corps attendu `/voyage/{tripId}` (PUT)** :
```json
{
  "statusVoyage": "ANNULE"
}
```

### Pages accessibles depuis cette page
- `/dashboard/marketplace/bookings/[voyageId]`
- `/dashboard/trip-planning`
- Retour vers `/dashboard`

---

## 4. Page `/dashboard/subscription`

**Fichier** : `src/app/(agency-views)/dashboard/subscription/page.tsx`

**Route** : `/dashboard/subscription`

### Description générale
Page de gestion de l'abonnement de l'agence. Elle affiche les plans disponibles et l'historique de facturation.

### Fonctionnalités principales
- Chargement des plans d'abonnement.
- Affichage des cartes de plan.
- Présentation de l'historique de facturation.
- Fallback sur données statiques si l'API n'est pas disponible.

### State & Hooks utilisés
```typescript
export function useSubscriptionPage() {
  - plans: SubscriptionPlan[]
  - billingHistory: BillingHistoryItem[]
  - isLoading: boolean
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence de l'utilisateur connecté. |
| `/abonnement/plans/agence/{agencyId}` | `GET` | Récupère les plans disponibles pour l'agence. |
| `/facturation/agence/{agencyId}` | `GET` | Récupère l'historique de facturation de l'agence. |

**Réponse attendue `/abonnement/plans/agence/{agencyId}`** :
```json
[
  {
    "idPlan": "plan-01",
    "name": "Pro",
    "price": 65000,
    "features": ["Voyages illimités", "Support prioritaire", "Analyses avancées"],
    "isCurrent": true,
    "idAgenceVoyage": "agency-01"
  }
]
```

**Réponse attendue `/facturation/agence/{agencyId}`** :
```json
[
  {
    "idFacture": "inv-001",
    "date": "2025-06-01",
    "amount": 65000,
    "status": "paid",
    "idAgenceVoyage": "agency-01"
  }
]
```

> Note : les endpoints `GET /abonnement/plans/agence/{agencyId}` et `GET /facturation/agence/{agencyId}` sont actuellement tolérés en fallback statique si le backend ne répond pas.

### Pages accessibles depuis cette page
- Retour vers `/dashboard`

---

## 5. Page `/dashboard/feedback`

**Fichier** : `src/app/(agency-views)/dashboard/feedback/page.tsx`

**Route** : `/dashboard/feedback`

### Description générale
Page de gestion des avis clients. Elle affiche les retours clients reçus sur les voyages de l'agence.

### Fonctionnalités principales
- Chargement des avis clients.
- Affichage des notes et des commentaires.
- Message de fallback si aucun avis n'est disponible.

### State & Hooks utilisés
```typescript
export function useFeedbackPage() {
  - feedbacks: Feedback[]
  - isLoading: boolean
  - error: string | null
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence de l'utilisateur connecté. |
| `/feedbacks/agence/{agencyId}` | `GET` | Récupère les avis clients de l'agence. |

**Réponse attendue `/feedbacks/agence/{agencyId}`** :
```json
[
  {
    "id": "fb-1",
    "customerName": "Claire Durand",
    "tripName": "Safari à Waza",
    "rating": 5,
    "comment": "Une expérience inoubliable !",
    "date": "2025-05-23"
  }
]
```

> Note : la page utilise actuellement des données mockées tant que l'endpoint backend n'est pas disponible.

### Pages accessibles depuis cette page
- Retour vers `/dashboard`
