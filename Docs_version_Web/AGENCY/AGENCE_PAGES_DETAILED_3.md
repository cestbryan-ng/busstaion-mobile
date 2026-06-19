# Page Agence Voyage - Brouillons

Document technique détaillé pour la page `/dashboard/drafts` de l'acteur `agence_voyage`.

> La page est installée dans `src/app/(agency-views)/dashboard/drafts/page.tsx`.

## 1. Page `/dashboard/drafts`

**Fichier** : `src/app/(agency-views)/dashboard/drafts/page.tsx`

**Route** : `/dashboard/drafts`

### Description générale
Page de gestion des voyages en brouillon pour l'agence. Elle affiche la liste des voyages dont le statut est `EN_ATTENTE`, permet de rechercher et filtrer les projets de voyage, de modifier un brouillon, de le publier ou de le supprimer.

### Fonctionnalités principales
- Chargement des brouillons de voyages de l'agence.
- Filtre local sur le titre, le lieu de départ et le lieu d'arrivée.
- Affichage du statut et de la date de départ prévue.
- Bouton de modification qui redirige vers `/dashboard/trip-planning?edit={tripId}`.
- Publication d'un voyage, avec confirmation utilisateur.
- Suppression d'un brouillon, avec confirmation utilisateur.
- Affichage d'un écran de chargement et d'un message d'erreur si nécessaire.
- Option de création d'un nouveau voyage si aucun brouillon n'est disponible.

### State & Hooks utilisés
```typescript
export function useDraftsPage() {
  - isLoading: boolean
  - apiError: string | null
  - drafts: TripDetails[]
  - handleEdit(tripId: string): void
  - handlePublish(): Promise<void>
  - handleDelete(): Promise<void>
  - canOpenConfirmationModal: boolean
  - setCanOpenConfirmationModal(value: boolean): void
  - confirmationMessage: string
  - openConfirmModal(draft: TripDetails): void
  - canOpenPublishModal: boolean
  - setCanOpenPublishModal(value: boolean): void
  - publishMessage: string
  - openPublishModal(draft: TripDetails): void
}
```

### Logique principale
- Récupération de l'agence de l'utilisateur connecté via `getAgencyByChefId(userId)`.
- Chargement de tous les voyages de l'agence puis filtrage local des voyages dont `statusVoyage === 'EN_ATTENTE'`.
- Activation de la confirmation modale avant suppression ou publication.
- Suppression optimiste du brouillon de l'interface, puis appel de l'API.
- Rechargement de la liste après publication pour retirer le voyage publié.

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère l'agence liée à l'utilisateur connecté. |
| `/voyage/agence/{agencyId}/public` | `GET` | Récupère la liste des voyages publics de l'agence, utilisée ici pour filtrer les brouillons (`EN_ATTENTE`). |
| `/voyage/{tripId}` | `PUT` | Met à jour un voyage existant, utilisé ici indirectement via `publishTrip()` pour changer le statut en `PUBLIE`. |
| `/voyage/{tripId}` | `DELETE` | Supprime un voyage existant, utilisé pour supprimer un brouillon. |

### Exemple de réponse `/voyage/agence/{agencyId}/public`
```json
{
  "content": [
    {
      "idVoyage": "trip-01",
      "titre": "Douala - Kribi Premium",
      "lieuDepart": "Douala",
      "lieuArrive": "Kribi",
      "dateDepartPrev": "2026-07-05T08:00:00",
      "statusVoyage": "EN_ATTENTE"
    }
  ],
  "pageable": { "pageNumber": 0, "pageSize": 10 },
  "totalPages": 1,
  "totalElements": 1
}
```

### Exemple de flux de publication
- L'utilisateur clique sur Publier.
- `openPublishModal(draft)` ouvre la modale de confirmation.
- `publishTrip(tripId)` met à jour le voyage avec `{ statusVoyage: 'PUBLIE' }`.
- La liste des brouillons est rechargée pour exclure le voyage publié.

### Exemple de flux de suppression
- L'utilisateur clique sur Supprimer.
- `openConfirmModal(draft)` ouvre la modale de confirmation.
- `deleteVoyage(tripId)` supprime le voyage choisi.
- La liste de l'interface est mise à jour immédiatement, puis synchronisée avec le backend.
