# Pages Agence Voyage - Spécifications détaillées

Ce document décrit les pages `/dashboard/calendar`, `/dashboard/marketplace/bookings/[voyageId]` et `/dashboard/trip-planning` de l'acteur `agence_voyage` dans le projet `busstation2`.

> Le dossier principal est `src/app/(agency-views)`.

## 1. Page `/dashboard/calendar`

**Fichier** : `src/app/(agency-views)/dashboard/calendar/page.tsx`

**Route** : `/dashboard/calendar`

### Description générale
Page de gestion du calendrier des voyages de l'agence. Elle affiche une vue mensuelle ou agenda des voyages programmés, les statistiques de capacité et permet l'accès aux détails des voyages.

### Fonctionnalités principales
- Chargement des voyages de l'agence pour affichage calendrier.
- Affichage des statistiques clés : voyages programmés, taux d'occupation, places disponibles, revenus.
- Navigation par mois, date et type de vue (mois / agenda).
- Sélection d'une date pour consulter le détail des événements du jour.
- Ouverture d'une vue timeline détaillée pour les événements d'une date.
- Création d'un voyage depuis une date sans événement.
- Accès à l'édition, à l'annulation et à la suppression d'un voyage depuis le modal de détail.

### State & Hooks utilisés
```typescript
export function useEnhancedTripCalendar() {
  - isLoading: boolean
  - apiError: string | null
  - currentDate: Date
  - selectedDate: Date | null
  - viewType: 'month' | 'week' | 'day' | 'agenda'
  - showTimelineView: boolean
  - calendarMonth: CalendarMonth
  - calendarEvents: CalendarEvent[]
  - isModalOpen: boolean
  - selectedTrip: TripDetails | null
  - getEventsForDate(date: Date): CalendarEvent[]
  - getStatusColor(status: string): string
  - getStatusDotColor(status: string): string
  - goToNextMonth(): void
  - goToPreviousMonth(): void
  - goToToday(): void
  - goToDate(date: Date): void
  - setViewType(viewType: 'month' | 'week' | 'day' | 'agenda'): void
  - handleDateSelect(date: Date): void
  - handleEventSelect(event: CalendarEvent): void
  - handleCreateEvent(date: Date): void
  - closeModal(): void
  - closeTimelineView(): void
  - handleEdit(tripId: string): void
  - handleCancel(tripId: string): void
  - handleDelete(tripId: string): void
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence liée à l'utilisateur connecté. |
| `/voyage/agence/{agencyId}/public` | `GET` | Récupère les voyages publics de l'agence pour le calendrier. |
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
      "heureDepartEffectif": "08:00",
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

---

## 2. Page `/dashboard/marketplace/bookings/[voyageId]`

**Fichier** : `src/app/(agency-views)/dashboard/marketplace/bookings/[voyageId]/page.tsx`

**Route** : `/dashboard/marketplace/bookings/[voyageId]`

### Description générale
Page de gestion des réservations pour un voyage spécifique publié par l'agence. Elle affiche les réservations filtrées par voyage, les statistiques de réservation, et permet d'annuler des réservations.

### Fonctionnalités principales
- Chargement des réservations de l'agence.
- Filtrage par voyage spécifique via le paramètre `voyageId`.
- Recherche par ID de réservation ou par titre de voyage.
- Filtrage par statut de réservation (`CONFIRMER`, `RESERVER`, `ANNULER`, `VALIDER`).
- Affichage des statistiques de réservation : total, confirmées, en attente, annulées, revenus.
- Modal de détail de réservation.
- Annulation de réservation avec confirmation.
- Bouton de retour vers la liste des voyages.

### State & Hooks utilisés
```typescript
export function useBookingsPage() {
  - isLoading: boolean
  - isActionLoading: boolean
  - apiError: string | null
  - filteredBookings: ReservationPreviewDTO[]
  - stats: { total: number; confirmed: number; pending: number; cancelled: number; validated: number; totalRevenue: number }
  - currentPage: number
  - totalPages: number
  - totalElements: number
  - setCurrentPage(page: number): void
  - searchTerm: string
  - setSearchTerm(term: string): void
  - statusFilter: string
  - setStatusFilter(status: string): void
  - filterOptions: { label: string; value: string }[]
  - confirmModal: ConfirmModal
  - closeModal(): void
  - selectedBooking: ReservationPreviewDTO | null
  - isDetailModalOpen: boolean
  - closeDetailModal(): void
  - handleViewDetails(bookingId: string): void
  - handleContactClient(booking: ReservationPreviewDTO): void
  - handleDownloadReservation(booking: ReservationPreviewDTO): void
  - openCancelModal(reservationId: string, clientName?: string): void
  - getStatusInfo(status: string)
  - tripId: string | undefined
  - tripName: string | null
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence liée à l'utilisateur connecté. |
| `/reservation/agence/{agencyId}` | `GET` | Récupère la liste paginée des réservations de l'agence. |
| `/reservation/annuler-by-agence` | `POST` | Annule une réservation depuis le tableau de bord agence. |

**Réponse attendue `/reservation/agence/{agencyId}`** :
```json
{
  "content": [
    {
      "reservation": {
        "idReservation": "res-001",
        "statutReservation": "CONFIRMER",
        "prixTotal": 15000
      },
      "voyage": {
        "idVoyage": "trip-01",
        "titre": "Douala - Yaoundé Express"
      }
    }
  ],
  "totalPages": 1,
  "totalElements": 1
}
```

**Corps attendu `/reservation/annuler-by-agence`** :
```json
{
  "idReservation": "res-001",
  "motif": "Annulation administrative effectuée depuis le tableau de bord agence."
}
```

---

## 3. Page `/dashboard/trip-planning`

**Fichier** : `src/app/(agency-views)/dashboard/trip-planning/page.tsx`

**Route** : `/dashboard/trip-planning`

### Description générale
Page de création et d'édition d'un voyage. Elle propose un formulaire complet pour définir l'itinéraire, les dates, les ressources, les tarifs et le statut du voyage.

### Fonctionnalités principales
- Chargement des ressources nécessaires à la création de voyage : véhicules, chauffeurs, classes.
- Gestion de l'état édition si le paramètre `edit` est présent dans l'URL.
- Saisie des informations de voyage : titre, description, départ, arrivée, dates et heures.
- Sélection du véhicule, du chauffeur et de la classe de voyage.
- Enregistrement du voyage en brouillon ou publication directe.
- Redirection vers `/dashboard/drafts` ou `/dashboard/marketplace` après soumission.

### State & Hooks utilisés
```typescript
export function useTripPlanner() {
  - isLoading: boolean
  - isSubmitting: boolean
  - isSuccess: boolean
  - successMessage: string
  - formApiError: string | null
  - vehicles: { data: Vehicule[]; isLoading: boolean; error: string | null }
  - drivers: { data: Customer[]; isLoading: boolean; error: string | null }
  - travelClasses: { data: ClassVoyage[]; isLoading: boolean; error: string | null }
  - isEditMode: boolean
  - onSubmit(data: TripPlannerFormType, status: 'EN_ATTENTE' | 'PUBLIE'): Promise<void>
  - reloadVehicles(): void
  - reloadDrivers(): void
  - reloadClasses(): void
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence liée à l'utilisateur connecté. |
| `/vehicule/agence/{agencyId}` | `GET` | Récupère les véhicules disponibles pour l'agence. |
| `/chauffeur/chauffeurs/{agencyId}` | `GET` | Récupère les chauffeurs associés à l'agence. |
| `/class-voyage/agence/{agencyId}` | `GET` | Récupère les classes de voyage disponibles pour l'agence. |
| `/voyage/byId/{tripId}` | `GET` | Récupère les détails d'un voyage pour l'édition. |
| `/voyage/create` | `POST` | Crée un nouveau voyage. |
| `/voyage/{tripId}` | `PUT` | Met à jour un voyage existant. |

**Réponse attendue `/vehicule/agence/{agencyId}`** :
```json
[
  {
    "idVehicule": "veh-01",
    "immatriculation": "1234AB56",
    "capacite": 50,
    "modele": "Mercedes Sprinter"
  }
]
```

**Réponse attendue `/chauffeur/chauffeurs/{agencyId}`** :
```json
[
  {
    "userId": "chauff-01",
    "nom": "Jean",
    "prenom": "Kouassi"
  }
]
```

**Réponse attendue `/class-voyage/agence/{agencyId}`** :
```json
[
  {
    "idClassVoyage": "class-01",
    "nom": "VIP"
  }
]
```

**Corps attendu `/voyage/create`** :
```json
{
  "titre": "Douala - Kribi Premium",
  "description": "Voyage VIP avec pause déjeuner incluse.",
  "lieuDepart": "Douala",
  "lieuArrive": "Kribi",
  "dateDepartPrev": "2026-06-25",
  "heureDepartEffectif": "08:00",
  "heureArrive": "12:30",
  "nbrPlaceReservable": 40,
  "nbrPlaceRestante": 40,
  "statusVoyage": "EN_ATTENTE",
  "vehiculeId": "veh-01",
  "chauffeurId": "chauff-01",
  "classVoyageId": "class-01"
}
```

**Corps attendu `/voyage/{tripId}`** :
```json
{
  "titre": "Douala - Kribi Premium",
  "description": "Voyage VIP mis à jour.",
  "statusVoyage": "PUBLIE"
}
```

### Pages accessibles depuis cette page
- `/dashboard/drafts`
- `/dashboard/marketplace`
- Retour vers `/dashboard`
