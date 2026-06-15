# Pages Réservations & Historique - Spécifications détaillées

## 1. Page `/my-reservations`

**Fichier** : `src/app/(customer-view)/my-reservations/page.tsx`

### Description générale
Page de gestion des réservations actives et passées de l'utilisateur. Affichage et gestion des voyages réservés avec paiement, annulation et recherche.

### Fonctionnalités principales
- **Affichage des réservations** : Grille ou Liste de réservations
- **Recherche** : Par titre voyage, lieu départ/arrivée, agence
- **Filtres** :
  - Par statut : Paid, Confirmed, Pending Payment, Cancelled
  - Par agence
  - Par date
- **Informations affichées** :
  - Lieu de départ et arrivée
  - Heure et date de départ
  - Statut de réservation
  - Statut de paiement
  - Agence
  - Prix total
  - Nombre de passagers
- **Actions** :
  - Consulter le détail (`/my-reservations/reservation-details/[reservationId]`)
  - Ouvrir modale de paiement
  - Ouvrir modale d'annulation
- **Pagination** : Navigation pagée des réservations

### State & Hooks utilisés
```typescript
export function useMyReservation(reservationId: string) {
  - myScheduledTrips: ReservationDetails[]
  - filteredTrips: ReservationDetails[]
  - selectedTrip: ReservationDetails | null
  - isLoading: boolean
  - error: Error | null
  - searchQuery: string
  - currentPage: number
  - totalPages: number
  - viewMode: "grid" | "list"
  - canOpenTripAnnulationModal: boolean
  - canOpenPaymentRequestModal: boolean
  - filterByStatus(status)
  - filterByAgency(agencyName)
  - filterByDate(dateString)
  - navigateToDetails(reservationId)
  - openPaymentModal()
  - openCancellationModal()
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/reservation/user/{idUser}` | `GET` | Récupère les réservations de l'utilisateur |
| `/reservation/payer` | `PUT` | Effectue un paiement de réservation |
| `/reservation/annuler-by-agence` | `POST` | Annule une réservation |

**Réponse `/reservation/user/{idUser}` (Paginated)** :
```json
{
  "content": [
    {
      "idReservation": "RES-001",
      "reservation": {
        "idReservation": "RES-001",
        "statutReservation": "CONFIRMEE",
        "statutPayement": "PAID",
        "dateReservation": "2026-06-10T14:30:00",
        "dateConfirmation": "2026-06-10T15:00:00"
      },
      "voyage": {
        "idVoyage": "VOY-001",
        "titre": "Douala - Yaoundé Express",
        "lieuDepart": "Douala",
        "lieuArrive": "Yaoundé",
        "dateDepartPrev": "2026-06-20T08:00:00",
        "dateDepartEffectif": "2026-06-20T08:15:00",
        "heureDepart": "08:00",
        "heureArrive": "12:30",
        "statusVoyage": "PUBLIE",
        "prixTotal": 15000
      },
      "agence": {
        "agencyId": "AG-001",
        "longName": "Voyage Plus",
        "location": "Douala"
      },
      "passagers": [
        {
          "idPassager": "PASS-001",
          "nom": "Jean Dupont",
          "telephone": "+237691234567",
          "carteID": "ID-12345",
          "age": 28,
          "genre": "M",
          "siege": "A01",
          "prixBillet": 15000
        }
      ],
      "nombrePassagers": 1
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalPages": 3,
  "totalElements": 28,
  "empty": false
}
```

---

## 2. Page `/my-reservations/reservation-details/[reservationId]`

**Fichier** : `src/app/(customer-view)/my-reservations/reservation-details/[reservationId]/page.tsx`

### Description générale
Page détail d'une réservation spécifique. Affichage complet des informations du voyage et des passagers avec possibilité d'annulation.

### Fonctionnalités principales
- **Affichage du récapitulatif** :
  - Informations du voyage (itinéraire, horaires, date)
  - Détails des passagers (nom, siège, prix)
  - Statut réservation et paiement
  - Agence responsable
- **Bouton retour** : Retour à la page précédente
- **Actions modales** :
  - Annulation de la réservation (TripAnnulationModal)
- **Informations affichées** :
  - QR Code de la réservation
  - Numéro de réservation
  - Détails complets du voyage

### State & Hooks utilisés
```typescript
export function useMyReservation(reservationId: string) {
  - reservationDetail: ReservationDetails | null
  - isLoading: boolean
  - error: Error | null
  - canOpenTripAnnulationModal: boolean
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/reservation/{idReservation}` | `GET` | Récupère les détails d'une réservation |

**Réponse `/reservation/{idReservation}`** :
```json
{
  "idReservation": "RES-001",
  "reservation": {
    "idReservation": "RES-001",
    "statutReservation": "CONFIRMEE",
    "statutPayement": "PAID",
    "dateReservation": "2026-06-10T14:30:00",
    "dateConfirmation": "2026-06-10T15:00:00"
  },
  "voyage": {
    "idVoyage": "VOY-001",
    "titre": "Douala - Yaoundé Express",
    "lieuDepart": "Douala",
    "pointDeDepart": "Gare Centrale Douala",
    "lieuArrive": "Yaoundé",
    "pointArrivee": "Gare de Yaoundé",
    "dateDepartPrev": "2026-06-20T08:00:00",
    "heureDepart": "08:00",
    "heureArrive": "12:30",
    "statusVoyage": "PUBLIE",
    "prixTotal": 15000,
    "duree": 4.5
  },
  "agence": {
    "agencyId": "AG-001",
    "longName": "Voyage Plus",
    "contact": {
      "phone": "+237123456789",
      "email": "info@voyageplus.cm"
    }
  },
  "passagers": [
    {
      "idPassager": "PASS-001",
      "nom": "Jean Dupont",
      "telephone": "+237691234567",
      "carteID": "ID-12345",
      "age": 28,
      "genre": "M",
      "siege": "A01",
      "prixBillet": 15000
    }
  ],
  "nombrePassagers": 1
}
```

---

## 3. Page `/history/reservation`

**Fichier** : `src/app/(customer-view)/history/reservation/page.tsx`

### Description générale
Page d'historique des voyages réalisés ou confirmés. Affichage des réservations passées avec téléchargement de billets et consultation des détails.

### Fonctionnalités principales
- **Affichage des réservations** : Grille de cartes de voyages
- **Recherche** : Par nom passager, ID réservation, ville départ/arrivée
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
  - annulations: HistoriqueEnrichi[]
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

## 4. Page `/history/cancellation`

**Fichier** : `src/app/(customer-view)/history/cancellation/page.tsx`

### Description générale
Page d'historique des annulations de réservations. Affichage des voyages annulés avec détails sur l'annulation et le coupon de remboursement.

### Fonctionnalités principales
- **Affichage des annulations** : Grille de cartes de voyages annulés
- **Recherche** : Par nom passager, ID réservation, ville départ/arrivée
- **Filtres** :
  - Par initiateur (Client, Agence)
  - Par statut voyage
- **Informations affichées** :
  - Référence (#idHistorique)
  - Passager principal
  - Itinéraire
  - Date et heure
  - Prix du billet
  - Initiateur annulation (Client/Agence)
  - Date annulation
- **Actions** :
  - Affichage détail en modale
  - Informations de compensation/coupon
  - Visualisation des détails d'annulation

### State & Hooks utilisés
```typescript
export function useHistorique() {
  - historiques: HistoriqueEnrichi[]
  - annulations: HistoriqueEnrichi[]
  - isLoading: boolean
  - error: string | null
}

interface HistoriqueEnrichi {
  idHistorique: string;
  statusHistorique: string; // "ANNULE"
  dateReservation: string;
  dateAnnulation: string;
  causeAnnulation: string;
  origineAnnulation: string; // "client" | "agence"
  tauxAnnulation: number;
  compensation: number;
  reservation: ReservationDetailsDTO | null;
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/historique/reservation/{userId}` | `GET` | Récupère l'historique des réservations (y compris annulées) |
| `/reservation/{idReservation}` | `GET` | Récupère les détails d'une réservation (enrichissement) |

**Réponse `/historique/reservation/{userId}` (pour annulations)** :
```json
[
  {
    "idHistorique": "HIST-003",
    "statusHistorique": "ANNULE",
    "dateReservation": "2026-06-05T09:00:00",
    "dateConfirmation": "2026-06-05T09:30:00",
    "dateAnnulation": "2026-06-08T16:45:00",
    "causeAnnulation": "Changement de plans personnels",
    "origineAnnulation": "client",
    "tauxAnnulation": 50,
    "compensation": 7500,
    "idReservation": "RES-003"
  },
  {
    "idHistorique": "HIST-004",
    "statusHistorique": "ANNULE",
    "dateReservation": "2026-05-10T11:00:00",
    "dateConfirmation": "2026-05-10T11:30:00",
    "dateAnnulation": "2026-05-15T10:00:00",
    "causeAnnulation": "Voyage annulé par l'agence",
    "origineAnnulation": "agence",
    "tauxAnnulation": 100,
    "compensation": 15000,
    "idReservation": "RES-004"
  }
]
```

---

## Résumé des Endpoints

| Page | Endpoint | Méthode | Description |
|------|----------|---------|-------------|
| My Reservations | `/reservation/user/{idUser}` | GET | Liste réservations utilisateur (paginée) |
| My Reservations | `/reservation/payer` | PUT | Effectue paiement |
| Reservation Details | `/reservation/{idReservation}` | GET | Détail réservation |
| History - Reservation | `/historique/reservation/{userId}` | GET | Historique réservations |
| History - Reservation | `/reservation/{idReservation}` | GET | Enrichissement détails |
| History - Cancellation | `/historique/reservation/{userId}` | GET | Historique avec annulations |
| History - Cancellation | `/reservation/{idReservation}` | GET | Enrichissement détails |

---

## Flux de données

### 1. **My Reservations** → **Reservation Details**
```
useMyReservation() → fetchMyScheduledTrips()
                  ↓
GET /reservation/user/{userId}
                  ↓
ReservationDetails[] (contenu complet avec voyage + agence + passagers)
                  ↓
navigateToDetails(reservationId)
                  ↓
Récupère détails via GET /reservation/{idReservation}
```

### 2. **History Reservation** 
```
useHistorique() → getHistoriqueByUser()
              ↓
GET /historique/reservation/{userId}
              ↓
HistoriqueDTO[]
              ↓
Pour chaque historique → getReservationById()
              ↓
GET /reservation/{idReservation}
              ↓
HistoriqueEnrichi[] avec données complètes
              ↓
Filtre reservations (statusHistorique !== "ANNULE")
```

### 3. **History Cancellation**
```
useHistorique() → getHistoriqueByUser()
              ↓
GET /historique/reservation/{userId}
              ↓
HistoriqueDTO[]
              ↓
Pour chaque historique → getReservationById()
              ↓
GET /reservation/{idReservation}
              ↓
HistoriqueEnrichi[] avec données complètes
              ↓
Filtre annulations (statusHistorique === "ANNULE")
```

---

## Notes d'implémentation

1. **Authentification** : Toutes les pages utilisent `userData.userId` du contexte `useBusStation()`.
2. **Enrichissement de données** : `useHistorique()` fait une requête supplémentaire pour chaque historique pour enrichir les données de la réservation.
3. **Pagination** : `/reservation/user/{userId}` retourne une réponse paginée.
4. **Filtrage** :
   - **My Reservations** : Filtrage client (useMemo) par statut, agence, date
   - **History** : Filtrage client basé sur `statusHistorique`
5. **Modales** : Les pages utilisent `TransparentModal` pour les actions (annulation, paiement, détails).
6. **Téléchargement** : `/history/reservation` génère un HTML téléchargeable du billet.
