# Page Détail Voyage - Spécifications détaillées

## Page `/market-place/trip/[idVoyage]`

**Fichier** : `src/app/(customer-view)/market-place/trip/[idVoyage]/page.tsx`

### Description générale
Fiche détail d'un voyage. Affiche les informations complètes du voyage avec galerie d'images, caractéristiques du véhicule, équipements et interface de réservation. Permet aux clients de consulter tous les détails avant de réserver.

### Fonctionnalités principales
- **Affichage des informations voyage** :
  - Galerie d'images (petit + grand format) avec carousel automatique
  - Navigation d'images (flèches, défilement automatique toutes les 5 secondes)
  - Titre, itinéraire, dates et horaires
  - Agence organisatrice
  - Prix et nombre de places disponibles
  - Statut du voyage (PUBLIE, EN_ATTENTE, etc.)
  - Description détaillée du voyage
  
- **Équipements et amenités** :
  - Affichage dynamique des équipements avec icônes (WIFI, AC, USB, etc.)
  - Détails du véhicule (nom, modèle, année, capacité, plaque d'immatriculation)
  - Siège sélectionnable pour réservation
  
- **Actions utilisateur** :
  - Bouton "Book This Trip" (versions desktop et mobile)
  - Ouverture modal de réservation
  - Confirmation réservation → ouverture modal de paiement
  - Affichage message de succès après paiement
  
- **Navigation** : Bouton retour vers les voyages disponibles

### State & Hooks utilisés
```typescript
const { idVoyage } = use(params);
const tripDetailsHook = useTripDetails(idVoyage);

export function useTripDetails(idVoyage: string) {
  // État de chargement et erreurs
  - isLoading: boolean (initialisé à true pour éviter flash de contenu vide)
  - axiosError: string | null
  
  // Données du voyage
  - tripDetails: Trip {
      idVoyage: string
      titre: string
      description: string
      lieuDepart: string
      lieuArrive: string
      pointDeDepart: string
      pointArrivee: string
      heureDepart: string
      heureArrive: string
      dateDepartPrev: string
      dateArriveEffectif: string | null
      dateDepartEffectif: string | null
      heureDepartEffectif: string | null
      dureeVoyage: string
      prix: number
      nomClasseVoyage: string
      statusVoyage: "PUBLIE" | "EN_ATTENTE" | "TERMINE" | "ANNULE"
      nomAgence: string
      smallImage: string
      bigImage: string
      amenities: Amenity[]
      nbrPlaceReservable: number
      nbrPlaceRestante: number
      placeReservees: number[]
      dateLimiteReservation: string
      dateLimiteConfirmation: string
      datePublication: string
      vehicule: {
        idVehicule: string
        nom: string
        modele: string
        description: string
        nbrPlaces: number
        lienPhoto: string
        idAgenceVoyage: string
        plaqueMatricule: string
      }
    }
  
  // Traitement des images
  - images: string[] (tableau filtré : [smallImage, bigImage] sans chaînes vides)
  - currentImageIndex: number (index actuel du carousel)
  - nextImage(): void
  - previousImage(): void
  - setCurrentImageIndex(index: number): void
  
  // Équipements mappés
  - equipmentsOnBus: equipmentOnBusType[] (mappé via AMENITY_MAP)
  
  // Modales et messages
  - canOpenReservationModal: boolean
  - canOpenPaymentModal: boolean
  - reservationSuccessMessage: string
  - setCanOpenReservationModal(boolean): void
  - setCanOpenPaymentModal(boolean): void
  - setReservationSuccessMessage(string): void
}
```

### Endpoints API utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/voyage/byId/{idVoyage}` | `GET` | Récupère les détails complets du voyage |

### Exemple de réponse `/voyage/byId/{idVoyage}`
```json
{
  "idVoyage": "trip-001",
  "titre": "Douala - Yaoundé Express VIP",
  "description": "Voyage confortable et rapide entre Douala et Yaoundé. Service haut de gamme avec Wi-Fi gratuit et collations. Transport sécurisé avec chauffeur professionnel.",
  "lieuDepart": "Douala",
  "lieuArrive": "Yaoundé",
  "pointDeDepart": "Gare Centrale Douala",
  "pointArrivee": "Gare de Yaoundé",
  "heureDepart": "08:00",
  "heureArrive": "12:30",
  "dateDepartPrev": "2026-06-20T08:00:00",
  "dateArriveEffectif": null,
  "dateDepartEffectif": null,
  "heureDepartEffectif": null,
  "dureeVoyage": "4h30",
  "prix": 18000,
  "nomClasseVoyage": "VIP Premium",
  "statusVoyage": "PUBLIE",
  "nomAgence": "Voyage Plus",
  "smallImage": "https://api.busstation.com/trips/trip-001-small.jpg",
  "bigImage": "https://api.busstation.com/trips/trip-001-big.jpg",
  "amenities": [
    "WIFI",
    "AC",
    "USB",
    "SNACKS",
    "COMFORTABLE_SEATS",
    "RESTROOMS",
    "LUGGAGE_STORAGE"
  ],
  "nbrPlaceReservable": 50,
  "nbrPlaceRestante": 12,
  "placeReservees": [1, 2, 5, 8, 15, 22, 33, 40],
  "dateLimiteReservation": "2026-06-19T23:59:59",
  "dateLimiteConfirmation": "2026-06-20T06:00:00",
  "datePublication": "2026-06-01T10:00:00",
  "vehicule": {
    "idVehicule": "bus-001",
    "nom": "IVECO S-WAY",
    "modele": "2024",
    "description": "Bus ultra-confortable avec sièges inclinables 180°, climatisation maximale, stores électriques et espace pour bagages volumineux.",
    "nbrPlaces": 50,
    "lienPhoto": "https://api.busstation.com/vehicles/iveco-sway.jpg",
    "plaqueMatricule": "CM-DL-2024-001",
    "idAgenceVoyage": "agency-01"
  }
}
```

### Détails du comportement

#### Chargement des données
- La page reçoit `idVoyage` depuis les paramètres d'URL
- Hook `useTripDetails(idVoyage)` est appelé dans un useEffect
- Appel API : `retrieveTripDetail(idVoyage)` → `GET /voyage/byId/{idVoyage}`
- État `isLoading` passe à `true` au début, `false` après réponse
- Erreur affichée si la requête échoue

#### Affichage des images
- Tableau `images` contient : `[tripDetails.smallImage, tripDetails.bigImage]` (filtré des chaînes vides)
- Carousel automatique toutes les 5 secondes (appel `nextImage()`)
- Navigation manuelle via flèches ou clic sur les images
- Index cyclic (revient à 0 après la dernière image)

#### Mapping des équipements
```typescript
const AMENITY_MAP: Record<Amenity, equipmentOnBusType> = {
  WIFI: { icon: Wifi, label: "Free WiFi", color: "text-blue-600" },
  BEVERAGES: { icon: Coffee, label: "Boissons", color: "text-orange-600" },
  USB: { icon: Usb, label: "USB Charging", color: "text-green-600" },
  AC: { icon: Wind, label: "Climatisation", color: "text-cyan-600" },
  SNACKS: { icon: Cookie, label: "Collations", color: "text-amber-600" },
  POWER_OUTLETS: { icon: Zap, label: "Prises électriques", color: "text-yellow-600" },
  ENTERTAINMENT: { icon: Monitor, label: "Divertissement", color: "text-purple-600" },
  COMFORTABLE_SEATS: { icon: Armchair, label: "Sièges confortables", color: "text-red-600" },
  RESTROOMS: { icon: Bath, label: "Toilettes", color: "text-indigo-600" },
  LUGGAGE_STORAGE: { icon: Luggage, label: "Rangement bagages", color: "text-gray-600" },
  CHILD_SEATS: { icon: Baby, label: "Sièges enfant", color: "text-pink-600" },
  PET_FRIENDLY: { icon: PawPrint, label: "Animaux autorisés", color: "text-orange-500" },
  AIRPORT_PICKUP: { icon: ArrowRight, label: "Ramassage aéroport", color: "text-teal-600" },
  AIRPORT_DROP_OFF: { icon: ArrowRight, label: "Dépôt aéroport", color: "text-teal-600" },
  MEAL_SERVICE: { icon: Utensils, label: "Service repas", color: "text-emerald-600" },
  ONBOARD_GUIDE: { icon: Headphones, label: "Guide à bord", color: "text-violet-600" },
  SEAT_SELECTION: { icon: Armchair, label: "Sélection de siège", color: "text-blue-500" },
  GROUP_DISCOUNTS: { icon: Percent, label: "Réductions groupes", color: "text-green-600" },
  LATE_CHECK_IN: { icon: Clock, label: "Enregistrement tardif", color: "text-yellow-500" },
  LATE_CHECK_OUT: { icon: Clock, label: "Départ tardif", color: "text-yellow-500" }
}
```

#### Flux de réservation
1. Utilisateur clique "Book This Trip"
2. `setCanOpenReservationModal(true)` → Affichage modal réservation
3. Utilisateur sélectionne siège(s) et confirme
4. Après confirmation succès : `setCanOpenPaymentModal(true)` → Modal paiement
5. Après paiement succès : `setReservationSuccessMessage("Réservation réussie !")` → Message affiché

#### Composants enfants
- **PrincipalSection** : Affiche itinéraire, dates, prix, agence
- **DetailedInformation** : Affiche description, équipements, caractéristiques véhicule
- **ReservationProcessModal** : Modal pour sélection siège et confirmation
- **PaymentModal** : Modal pour effectuer le paiement
- **TripDetailsLoader** : Composant de chargement affiché pendant `isLoading`

### Notes techniques

1. **Initialisation isLoading à true** : Évite le flash de contenu vide avant le chargement
2. **Filtrage des images** : Supprime les chaînes vides pour éviter erreurs affichage
3. **Récupération automatique** : `useEffect` déclenche le fetch au mount et quand `idVoyage` change
4. **Gestion des erreurs** : Message `axiosError` affiché si erreur API
5. **Auto-play carousel** : `setInterval` 5000ms, `useEffect` cleanup le timer
6. **Mapping dynamique** : Équipements convertis d'Enum en objets avec icône/label/couleur
7. **WebSocket réservation** : Pour les voyages type "voyage" (pas documenté ici, voir `useSeatManager`)

### Limitations et cas limites
- Si `smallImage` vide : utilise `bigImage` pour les deux images
- Si les deux images vides : tableau vide, carousel non fonctionnel
- Pas de validations métier sur `nbrPlaceRestante` > 0 avant affichage
- Erreur API affichée mais sans retry automatique

---

## Flux complet d'accès à la page

```
Utilisateur sur /market-place
         ↓
Liste des voyages disponibles
         ↓
Clic sur une carte de voyage
         ↓
Navigation → /market-place/trip/[idVoyage]
         ↓
useTripDetails(idVoyage) déclenché
         ↓
GET /voyage/byId/{idVoyage}
         ↓
Affichage du détail (galerie, équipements, véhicule, prix)
         ↓
Clic "Book This Trip"
         ↓
Modal réservation + sélection siège
         ↓
Modal paiement
         ↓
Message de succès + redirection
```

---

## Résumé des endpoints

| Endpoint | Méthode | Description | Statut |
|----------|---------|-------------|--------|
| `/voyage/byId/{idVoyage}` | GET | Récupère les détails complets d'un voyage | ✅ Implémenté |

---

## Métriques d'implémentation

- **Nombre de hooks utilisés** : 1 (`useTripDetails`)
- **Nombre d'endpoints API** : 1 (`GET /voyage/byId/{idVoyage}`)
- **Composants enfants** : 4 (PrincipalSection, DetailedInformation, ReservationProcessModal, PaymentModal)
- **État managé** : 6 états principaux (tripDetails, isLoading, images, modales, messages)
- **Auto-play** : Carousel images 5 secondes
