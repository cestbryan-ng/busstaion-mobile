# Pages Client `/profil`, `/user-profile`, `/coupons` - Spécifications détaillées

## 1. Page `/profil`

**Fichier** : `src/app/(customer-view)/profil/page.tsx`

### Description générale
Page de gestion du compte client. Affiche les informations personnelles du profil connecté et propose des actions de sécurité.

### Fonctionnalités principales
- Affichage des informations utilisateur : prénom, nom, nom d'utilisateur, âge, email, téléphone.
- Affichage du rôle utilisateur.
- Bouton de déconnexion.
- Redirection vers `/login` si l'utilisateur n'est pas authentifié.
- Modals de modification du profil et de changement de mot de passe actuellement bloqués.

### State & Hooks utilisés
```typescript
const { userData, isLoading, isCustomerAuthenticated, isAgencyConnected, logout } = useBusStation();
const [modalOpen, setModalOpen] = useState<'edit' | 'password' | null>(null);
```

- `useBusStation()` : contexte global d'authentification.
- `userData` : profil utilisateur connecté.
- `logout()` : supprime le token local et redirige vers l'accueil.

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/utilisateur/profil` | `GET` | Récupère le profil de l'utilisateur connecté. |

### Endpoints mentionnés mais non implémentés
| Endpoint | Méthode | Usage UI |
|----------|---------|---------|
| `/utilisateur/{userId}` | `PATCH` | Modal `EditProfileModal` pour modifier le profil. |
| `/utilisateur/change-password` | `POST` | Modal `ChangePasswordModal` pour changer le mot de passe. |

### Exemple de réponse attendue `/utilisateur/profil`
```json
{
  "userId": "user-123",
  "first_name": "Jean",
  "last_name": "Dupont",
  "username": "jdupont",
  "age": 32,
  "email": "jean.dupont@example.com",
  "phone_number": "+237650123456",
  "role": ["CLIENT"],
  "profile_picture": null
}
```

---

## 2. Page `/user-profile`

**Fichier** : `src/app/(customer-view)/user-profile/user-profile/page.tsx`

### Description générale
Tableau de bord profil. Affiche le résumé du profil connecté, des statistiques et un aperçu de l'historique des réservations.

### Fonctionnalités principales
- Résumé du profil : nom, initiales, rôle.
- Lien vers `/profil` pour accéder aux paramètres du compte.
- Statistiques : voyages réussis, annulations, réservations totales, destinations uniques.
- Aperçu des réservations récentes et des annulations.

### State & Hooks utilisés
```typescript
const { userData, isLoading: isUserLoading } = useBusStation();
const { historiques, reservations, annulations, isLoading: isHistoriqueLoading } = useHistorique();
```

- `useBusStation()` : profil connecté via `GET /utilisateur/profil`.
- `useHistorique()` : charge l'historique de l'utilisateur et l'enrichit.

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/utilisateur/profil` | `GET` | Profil connecté pour affichage du nom et du rôle. |
| `/historique/reservation/{userId}` | `GET` | Récupère la liste des historiques de réservation. |
| `/reservation/{idReservation}` | `GET` | Récupère les détails de chaque réservation. |

### Exemple de réponse attendue `/historique/reservation/{userId}`
```json
[
  {
    "idHistorique": "hist-001",
    "statusHistorique": "TERMINE",
    "idReservation": "res-001",
    "dateReservation": "2026-05-10T14:00:00",
    "dateConfirmation": "2026-05-11T09:00:00",
    "dateAnnulation": null
  },
  {
    "idHistorique": "hist-002",
    "statusHistorique": "ANNULE",
    "idReservation": "res-002",
    "dateReservation": "2026-04-20T08:30:00",
    "dateConfirmation": null,
    "dateAnnulation": "2026-04-21T10:00:00"
  }
]
```

### Exemple de réponse attendue `/reservation/{idReservation}`
```json
{
  "idReservation": "res-001",
  "lieuDepart": "Douala",
  "lieuArrive": "Yaoundé",
  "dateDepart": "2026-05-15T08:00:00",
  "dateArrive": "2026-05-15T12:30:00",
  "prix": 15000,
  "nomAgence": "Voyage Plus"
}
```

---

## 3. Page `/coupons`

**Fichier** : `src/app/(customer-view)/coupons/page.tsx`

### Description générale
Page de gestion des coupons de remboursement. Affiche les coupons de l'utilisateur avec filtres, vue et téléchargement PDF.

### Fonctionnalités principales
- Affichage des coupons en vue grille ou liste.
- Filtres de statut : tous, valides, expirés.
- Informations affichées : montant, agence, destination, période de validité, état.
- QR code visuel pour chaque coupon.
- Téléchargement PDF côté client pour les coupons valides.

### State & Hooks utilisés
```typescript
const [activeTab, setActiveTab] = useState<string>('all');
const [downloadingCoupon, setDownloadingCoupon] = useState<string | null>(null);
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
const { filteredCoupons, isLoading, error } = useCoupons(activeTab);
```

- `useCoupons(activeTab)` : charge les coupons de l'utilisateur et les filtre localement.
- `useBusStation()` : fournit `userData.userId` pour la requête.

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/coupon/user/{userId}` | `GET` | Récupère la liste des coupons de l'utilisateur connecté. |

### Exemple de réponse attendue `/coupon/user/{userId}`
```json
[
  {
    "idCoupon": "coupon-001",
    "dateDebut": "2026-05-15T00:00:00",
    "dateFin": "2026-08-15T00:00:00",
    "statusCoupon": "VALIDE",
    "valeur": 12000,
    "idHistorique": "hist-021",
    "nomAgence": "Voyage Plus",
    "lieuArrive": "Yaoundé"
  },
  {
    "idCoupon": "coupon-002",
    "dateDebut": "2026-02-01T00:00:00",
    "dateFin": "2026-04-01T00:00:00",
    "statusCoupon": "EXPIRE",
    "valeur": 8000,
    "idHistorique": "hist-018",
    "nomAgence": "Express Travel",
    "lieuArrive": "Bafoussam"
  }
]
```

### Notes techniques
- Le filtrage `activeTab` est appliqué localement sur `statusCoupon`.
- Le PDF est généré côté client via `html2pdf`.
- Le QR code est rendu via `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=...`.

---

## 4. Synthèse des endpoints utilisés

| Page | Endpoint | Méthode | Description |
|------|----------|---------|-------------|
| `/profil` | `/utilisateur/profil` | GET | Récupère le profil connecté. |
| `/user-profile` | `/historique/reservation/{userId}` | GET | Récupère l'historique de l'utilisateur. |
| `/user-profile` | `/reservation/{idReservation}` | GET | Récupère les détails de chaque réservation. |
| `/coupons` | `/coupon/user/{userId}` | GET | Récupère les coupons de l'utilisateur. |

### Endpoints non implémentés
- `/utilisateur/{userId}` : `PATCH` pour modifier le profil.
- `/utilisateur/change-password` : `POST` pour changer le mot de passe.
