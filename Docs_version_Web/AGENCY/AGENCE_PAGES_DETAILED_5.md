# Page Agence Voyage - Paramètres

Document technique détaillé pour la page `/dashboard/settings` de l'acteur `agence_voyage`.

> La page est installée dans `src/app/(agency-views)/dashboard/settings/page.tsx`.

## 1. Page `/dashboard/settings`

**Fichier** : `src/app/(agency-views)/dashboard/settings/page.tsx`

**Route** : `/dashboard/settings`

### Description générale
Page de configuration du profil de l'agence. Elle permet à l'agence de modifier son nom, l'email de contact et le message d'accueil affiché aux clients.

### Fonctionnalités principales
- Chargement des informations de l'agence via l'utilisateur connecté.
- Formulaire de mise à jour des informations de l'agence.
- Validation client des champs `longName`, `email` et `greetingMessage`.
- Feedback utilisateur sur succès ou erreur.
- Bouton de sauvegarde désactivé pendant l'envoi.

### Composant utilisé
- `ProfileSettings` dans `src/components/dashboard/settings/ProfileSettings.tsx`

### Hook et états utilisés
#### `useProfileSettings()`
```typescript
- form: UseFormReturn<ProfileSettingsFormType>
- isLoading: boolean
- isSubmitting: boolean
- apiError: string | null
- successMessage: string | null
- onSubmit(data: ProfileSettingsFormType): Promise<void>
```

### Logique principale
- `getAgencyByChefId(userId)` est utilisé pour récupérer les données de l'agence.
- Le formulaire est initialisé avec `longName`, `email` et `greetingMessage`.
- À l'envoi, un `PATCH /agence/{agencyId}` met à jour les informations de l'agence.
- Les erreurs sont affichées dans une alerte rouge et les succès dans une alerte verte.

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/agence/chef-agence/{chefId}` | `GET` | Récupère les informations de l'agence associée à l'utilisateur connecté. |
| `/agence/{agencyId}` | `PATCH` | Met à jour les informations de l'agence (nom, contact, message d'accueil). |

### Exemple de réponse `/agence/chef-agence/{chefId}`
```json
{
  "agencyId": "agency-01",
  "longName": "Agence Transfert Express",
  "contact": {
    "email": "contact@transfertexpress.cm"
  },
  "greetingMessage": "Bienvenue chez Transfert Express !"
}
```

### Exemple de requête `PATCH /agence/{agencyId}`
```json
{
  "longName": "Agence Transfert Express Mise à Jour",
  "greetingMessage": "Bienvenue sur notre nouvelle page de réservation !",
  "contact": {
    "email": "contact@transfertexpress.cm"
  }
}
```

### Exemple de flux utilisateur
1. L'utilisateur se rend sur `/dashboard/settings`.
2. Le hook `useProfileSettings()` charge l'agence via `getAgencyByChefId()`.
3. Le formulaire est prérempli avec les données de l'agence.
4. L'utilisateur modifie les champs et clique sur `Sauvegarder`.
5. La page envoie `PATCH /agence/{agencyId}`.
6. En cas de succès, `successMessage` affiche "Informations mises à jour avec succès.".
7. En cas d'erreur, `apiError` affiche un message d'erreur.
