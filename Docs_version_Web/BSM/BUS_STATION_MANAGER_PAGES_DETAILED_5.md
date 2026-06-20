# Pages Profil BSM - Spécifications détaillées

## 1. Page `/bsm-dashboard/profile`

**Fichier** : non implémenté dans l'arborescence actuelle.

### Description générale
Page de profil du gestionnaire de gare. Elle devrait afficher les informations du compte professionnel du manager, ses coordonnées, son rôle, et son historique de connexion.

### Contexte actuel
- Le dossier `src/app/(bus-station-manager-views)/bsm-dashboard` contient les pages :
  - `page.tsx`
  - `affiliated-agencies/page.tsx`
  - `infrastructure/page.tsx`
  - `policies-taxes/page.tsx`
  - `settings/page.tsx`
- Il n'existe pas de page `profile` ou `profile/edit` sous `bsm-dashboard`.
- La page la plus proche fonctionnellement est `/bsm-dashboard/settings`.

### Fonctionnalités attendues
- Affichage des informations du manager de gare :
  - Nom
  - Email
  - Téléphone
  - Rôle
  - Dernière connexion
  - Gare rattachée
- Bouton ou lien vers l'édition du profil.
- Boutons de gestion :
  - Modifier le profil
  - Changer le mot de passe
  - Déconnexion
- Petits indicateurs utiles : statut du compte, permissions, accès à la gare.

### State & Hooks attendus
#### `useBusStationManagerAccount()`
```typescript
export const useBusStationManagerAccount = () => {
  const [account, setAccount] = useState<BusStationManagerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return { account, loading, error };
};
```

#### `BusStationManagerAccount`
```typescript
export interface BusStationManagerAccount {
  id: string;
  busStationId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastLogin: string;
}
```

### Endpoints API utilisés / recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/gare/manager/{managerId}` | `GET` | Récupère la gare du manager connecté |
| `/manager-account/{busStationId}` | `GET` | Récupère les informations du compte manager |
| `/manager-account/{busStationId}` | `PUT` | Met à jour le profil manager |
| `/manager-account/{busStationId}/change-password` | `POST` | Modifie le mot de passe du manager |

### Notes importantes
- Le hook `useBusStationManagerAccount()` existe et tente de charger les données du manager via `getBusStationByManagerId()` puis `getBusStationManagerAccount()`.
- Dans le code courant, la fonction `getBusStationManagerAccount()` est une stub qui lève une erreur et n'appelle pas d'endpoint réel.
- La page `/bsm-dashboard/profile` n'est pas implémentée, mais elle devrait être positionnée comme une alternative dédiée à `/bsm-dashboard/settings`.

---

## 2. Page `/bsm-dashboard/profile/edit`

**Fichier** : non implémenté dans l'arborescence actuelle.

### Description générale
Page d'édition du profil du gestionnaire de gare. Elle devrait offrir un formulaire pour modifier les informations personnelles et professionnelles du compte.

### Fonctionnalités attendues
- Formulaire d'édition des champs :
  - Nom complet
  - Email
  - Téléphone
  - Photo de profil
  - Rôle (lecture seule)
- Validation des champs et feedback utilisateur.
- Boutons d'action :
  - Enregistrer
  - Réinitialiser
  - Annuler
- Possibilité de rediriger vers `/bsm-dashboard/profile` après enregistrement.

### State & Hooks attendus
#### `useBusStationManagerAccount()` + `useForm`
```typescript
const { account, loading, error } = useBusStationManagerAccount();
const form = useForm<ProfileFormType>({ ... });
```

#### `ProfileFormType`
```typescript
export type ProfileFormType = {
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
};
```

### Endpoints API utilisés / recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/manager-account/{busStationId}` | `GET` | Récupère les informations du manager |
| `/manager-account/{busStationId}` | `PUT` | Met à jour le profil du manager |
| `/manager-account/{busStationId}/avatar` | `POST` | Met à jour la photo de profil (optionnel) |

### Notes importantes
- Le code du projet ne contient pas de route `/profile/edit` pour le dashboard BSM.
- Si cette page est ajoutée, elle pourra réutiliser la même structure d'API que le profil principal.
- L'endpoint de mise à jour du manager n'est pas défini dans le code actuel.

---

## Relation avec `/bsm-dashboard/settings`
- La page existante `src/app/(bus-station-manager-views)/bsm-dashboard/settings/page.tsx` est le point de terminaison le plus proche de la fonctionnalité de profil.
- Elle utilise `useBusStationManagerAccount()` et un composant `SettingsForm`.
- Dans l'état actuel du projet, elle représente le profil et les paramètres du manager.

## Synthèse
- `/bsm-dashboard/profile` : page attendue, non implémentée.
- `/bsm-dashboard/profile/edit` : page attendue, non implémentée.
- Le hook d'accès au compte manager existe, mais l'API de sauvegarde n'est pas implémentée.
- Pour une documentation précise, ces pages sont décrites comme cibles prévues et non comme pages déjà présentes.
