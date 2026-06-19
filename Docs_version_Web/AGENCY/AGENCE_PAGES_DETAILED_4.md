# Page Agence Voyage - Ressources

Document technique détaillé pour la page `/dashboard/resources` de l'acteur `agence_voyage`.

> La page est installée dans `src/app/(agency-views)/dashboard/resources/page.tsx`.

## 1. Page `/dashboard/resources`

**Fichier** : `src/app/(agency-views)/dashboard/resources/page.tsx`

**Route** : `/dashboard/resources`

### Description générale
Page de gestion des ressources de l'agence. Elle centralise les quatre types de ressources critiques : véhicules, chauffeurs, employés et classes de voyage. Chaque onglet propose une gestion CRUD complète avec recherche, création, modification et suppression.

### Fonctionnalités principales
- Navigation par onglets : `Véhicules`, `Chauffeurs`, `Employés`, `Classes de Voyage`.
- Recherche locale dans chaque onglet.
- Ajout, édition et suppression de véhicules.
- Ajout, édition et suppression de chauffeurs.
- Ajout, édition et suppression d'employés.
- Ajout, édition et suppression de classes de voyage.
- Indicateurs d'état et modales de confirmation pour les actions destructrices.
- Chargement centralisé des ressources depuis les hooks métier.

### Structure de la page
- `VehiclesTab` : gestion de flotte de véhicules.
- `DriversTab` : gestion des chauffeurs.
- `EmployeesTab` : gestion des employés.
- `ClassVoyageTab` : gestion des classes de voyage.

### Endpoints API par onglet

#### Véhicules
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/vehicule/agence/{agencyId}` | `GET` | Récupère la liste des véhicules de l'agence. |
| `/vehicule` | `POST` | Crée un véhicule. |
| `/vehicule/{vehicleId}` | `PUT` | Met à jour un véhicule existant. |
| `/vehicule/{vehicleId}` | `DELETE` | Supprime un véhicule. |

#### Chauffeurs
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/utilisateur/chauffeurs/{agencyId}` | `GET` | Récupère les chauffeurs de l'agence. |
| `/utilisateur/chauffeur` | `POST` | Crée un chauffeur pour l'agence. |
| `/utilisateur/chauffeur/{driverId}` | `PUT` | Met à jour un chauffeur existant. |
| `/utilisateur/chauffeur/{driverId}` | `DELETE` | Supprime un chauffeur. |

#### Employés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/utilisateur/employes/{agencyId}` | `GET` | Récupère les employés de l'agence. |
| `/utilisateur/employe` | `POST` | Crée un employé pour l'agence. |
| `/utilisateur/employe/{employeeId}` | `PUT` | Met à jour un employé existant. |
| `/utilisateur/employe/{employeeId}` | `DELETE` | Supprime un employé. |

#### Classes de voyage
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/class-voyage/agence/{agencyId}` | `GET` | Récupère les classes de voyage de l'agence. |
| `/class-voyage` | `POST` | Crée une classe de voyage. |
| `/class-voyage/{classId}` | `PUT` | Met à jour une classe de voyage. |
| `/class-voyage/{classId}` | `DELETE` | Supprime une classe de voyage. |

### Hooks et états utilisés

#### `useVehiclesTab()`
```typescript
- vehicles: Vehicule[]
- isLoading: boolean
- isSubmitting: boolean
- isModalOpen: boolean
- apiError: string | null
- form: UseFormReturn<VehicleFormType>
- editingVehicle: Vehicule | null
- openModalForCreate(): void
- openModalForEdit(vehicle: Vehicule): void
- closeModal(): void
- onSubmit(data: VehicleFormType): Promise<void>
- handleDelete(): Promise<void>
- canOpenConfirmationModal: boolean
- setCanOpenConfirmationModal(value: boolean): void
- openConfirmModal(vehicle: Vehicule): void
- confirmationMessage: string
```

#### `useDriversTab()`
```typescript
- drivers: Customer[]
- isLoading: boolean
- isSubmitting: boolean
- isModalOpen: boolean
- apiError: string | null
- form: UseFormReturn<DriverFormType>
- editingDriver: UserResponseCreatedDTO | null
- openModalForCreate(): void
- openModalForEdit(driver: UserResponseCreatedDTO): void
- closeModal(): void
- onSubmit(data: DriverFormType): Promise<void>
- handleDelete(): Promise<void>
- openConfirmModal(driver: Customer): void
- canOpenConfirmModal: boolean
- setCanOpenConfirmModal(value: boolean): void
- confirmationMessage: string
```

#### `useEmployeesTab()`
```typescript
- employees: EmployeResponseDTO[]
- isLoading: boolean
- isSubmitting: boolean
- isModalOpen: boolean
- apiError: string | null
- form: UseFormReturn<EmployeeFormType>
- editingEmployee: EmployeResponseDTO | null
- openModalForCreate(): void
- openModalForEdit(employee: EmployeResponseDTO): void
- closeModal(): void
- onSubmit(data: EmployeeFormType): Promise<void>
- handleDelete(): Promise<void>
- openConfirmModal(employee: EmployeResponseDTO): void
- canOpenConfirmationModal: boolean
- setCanOpenConfirmationModal(value: boolean): void
- confirmationMessage: string
```

#### `useClassVoyageTab()`
```typescript
- classes: ClassVoyage[]
- isLoading: boolean
- isSubmitting: boolean
- isModalOpen: boolean
- apiError: string | null
- form: UseFormReturn<ClassVoyageFormType>
- editingClass: ClassVoyage | null
- openModalForCreate(): void
- openModalForEdit(cls: ClassVoyage): void
- closeModal(): void
- onSubmit(data: ClassVoyageFormType): Promise<void>
- handleDelete(): Promise<void>
- openConfirmModal(classVoyage: ClassVoyage): void
- canOpenConfirmationModal: boolean
- setCanOpenConfirmationModal(value: boolean): void
- confirmationMessage: string
```

### Exemples de réponse

#### Exemple `GET /vehicule/agence/{agencyId}`
```json
[
  {
    "idVehicule": "veh-01",
    "nom": "Minibus 20 places",
    "modele": "Mercedes Sprinter",
    "plaqueMatricule": "1234AB56",
    "nbrPlaces": 20,
    "description": "Minibus confortable pour longs trajets",
    "lienPhoto": "https://..."
  }
]
```

#### Exemple `GET /utilisateur/chauffeurs/{agencyId}`
```json
[
  {
    "userId": "drv-01",
    "first_name": "Jean",
    "last_name": "Kouassi",
    "username": "jkouassi",
    "email": "jean.kouassi@example.com",
    "phone_number": "+237650000000"
  }
]
```

#### Exemple `GET /utilisateur/employes/{agencyId}`
```json
[
  {
    "employeId": "emp-01",
    "firstName": "Alice",
    "lastName": "Nguessan",
    "username": "anguessan",
    "email": "alice.nguessan@example.com",
    "poste": "Responsable Commercial",
    "departement": "Ventes"
  }
]
```

#### Exemple `GET /class-voyage/agence/{agencyId}`
```json
[
  {
    "idClassVoyage": "class-01",
    "nom": "VIP",
    "prix": 20000,
    "tauxAnnulation": 5
  }
]
```
