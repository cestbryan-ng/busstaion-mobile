# Page de Connexion Mobile — Documentation Complète

## 📋 Vue d'ensemble

La page de connexion mobile permet aux **trois types d'acteurs** du système de s'authentifier :
1. **Customer** — Utilisateur client/voyageur
2. **AGENCE_VOYAGE** — Agence de voyage
3. **BUS_STATION_MANAGER** — Gestionnaire de gare routière

---

## 🎨 Structure de la page

### Éléments visuels et interactifs

```
┌─────────────────────────────┐
│      [Logo de l'App]        │  ← Image/SVG centré
├─────────────────────────────┤
│                             │
│   "Se connecter à votre     │  ← Titre
│    compte Bus Station"      │
│                             │
│  "Accédez à vos réservations│  ← Sous-titre
│   et gérez votre compte"    │
│                             │
├─────────────────────────────┤
│                             │
│ Email / Adresse e-mail      │  ← Champ input
│ [___________________]       │     - Clavier email
│ ❌ (erreur inline si besoin)│     - Trim & lowercase
│                             │
├─────────────────────────────┤
│                             │
│ Mot de passe                │  ← Champ input
│ [___________________] 👁️    │     - Masqué par défaut
│ ❌ (erreur inline si besoin)│     - Bouton afficher/masquer
│                             │
├─────────────────────────────┤
│                             │
│ ☐ Se souvenir de moi        │  ← Toggle/Checkbox (optionnel)
│                             │
├─────────────────────────────┤
│                             │
│ [   Se connecter   ]        │  ← Bouton principal
│ (désactivé si champs vides) │     - Hauteur 48px min
│ (loader spinner si envoi)   │     - Désactivé pendant POST
│                             │
├─────────────────────────────┤
│ Mot de passe oublié ?       │  ← Lien texte
│ S'inscrire                  │  ← Lien texte
│                             │
├─────────────────────────────┤
│ ⚠️ Erreur globale           │  ← Bandeau d'erreur serveur
│ (si la réponse échoue)      │     (rouge/warning)
└─────────────────────────────┘
```

---

## 🔧 Champs du formulaire

| Champ | Type | Validations | Remarques |
|-------|------|------------|-----------|
| **Email** | `text` | Required, format email valide, trim lowercase | Clavier `email-address` |
| **Mot de passe** | `password` | Required, min 8 caractères | Affichage/masquage |
| **Se souvenir de moi** | `checkbox` | Optionnel | Pour session persistante |

---

## 🎯 États de l'interface

| État | Description | Comportement |
|------|-------------|-------------|
| **Idle** | Formulaire vierge | Bouton désactivé si champs vides |
| **Typing** | L'utilisateur remplit les champs | Validation en temps réel (blur) |
| **Validating** | Vérification client-side | Messages inline pour champs invalides |
| **Submitting** | Envoi des données au serveur | Bouton désactivé, loader visible |
| **Success** | Connexion réussie | Redirection selon le rôle (voir section "Flux post-login") |
| **Error** | Réponse d'erreur serveur | Affichage du message d'erreur global |
| **Locked** | Compte bloqué (optionnel) | Message spécifique si limite d'essais atteinte |

---

## 🔐 Validations

### Client-side (avant envoi)

```
1. Email:
   - Non vide ✓
   - Format valide (regex email) ✓
   - Trimé et lowercase ✓

2. Mot de passe:
   - Non vide ✓
   - Longueur min 8 caractères ✓

3. État du bouton:
   - Désactivé si email OU mot de passe vide
   - Désactivé pendant l'envoi (loading state)
```

### Server-side (backend)

```
- Email ou mot de passe incorrect → 401/403
- Compte inexistant → 404
- Erreur interne → 500
```

---

## 📡 Endpoints backend

### 1. **Connexion utilisateur**

```http
POST /utilisateur/connexion
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "first_name": "Jean",
  "last_name": "Dupont",
  "username": "dupont123",
  "phone_number": "+33612345678",
  "age": 25,
  "role": ["USAGER"]  // ou ["AGENCE_VOYAGE"] ou ["BUS_STATION_MANAGER"]
}

Response (401/403 Unauthorized):
{
  "error": "invalid_credentials",
  "message": "Identifiants incorrects, veuillez réessayer !"
}

Response (404 Not Found):
{
  "error": "user_not_found",
  "message": "Utilisateur non trouvé, veuillez réessayer !"
}
```

**Base URL:** `http://localhost:8081`

---

### 2. **Récupération du profil utilisateur connecté**

```http
GET /utilisateur/profil
Authorization: Bearer {token}

Response (200 OK):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "first_name": "Jean",
  "last_name": "Dupont",
  "username": "dupont123",
  "phone_number": "+33612345678",
  "age": 25,
  "role": ["USAGER"]  // ou ["AGENCE_VOYAGE"] ou ["BUS_STATION_MANAGER"]
}
```

**Utilisé:** Au démarrage de l'app pour restaurer la session

---

### 3. **Inscription utilisateur** (lié à la page login)

```http
POST /utilisateur/inscription
Content-Type: application/json

Request:
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "username": "dupont123",
  "email": "jean.dupont@example.com",
  "phone_number": "+33612345678",
  "age": 25,
  "gender": "MALE",
  "password": "SecurePass123",
  "role": ["USAGER"]
}

Response (201 Created):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jean.dupont@example.com",
  "first_name": "Jean",
  "last_name": "Dupont",
  "role": ["USAGER"],
  "createdAt": "2025-06-01T10:30:00Z"
}
```

**Utilisé:** Si l'utilisateur clique sur "S'inscrire"

---

## 🔄 Flux d'authentification

### Étape 1: Connexion initiale

```
User → Saisit email/password
    ↓
Client valide les champs
    ↓
POST /utilisateur/connexion
    ↓
Backend renvoie token + user data + role
    ↓
Client sauvegarde: localStorage.setItem("bus_station_token_key", token)
    ↓
Provider détecte le rôle et active le bon flag:
  - role = ["USAGER"] → isCustomerAuthenticated = true
  - role = ["AGENCE_VOYAGE"] → isAgencyConnected = true
  - role = ["BUS_STATION_MANAGER"] → isAgencyConnected = true + isOrganizationConnected = true
    ↓
Redirection selon le rôle (voir section "Redirection post-login")
```

### Étape 2: Restauration de session

```
App démarre
    ↓
Provider appelle getCurrentUser()
    ↓
Token trouvé dans localStorage ? OUI
    ↓
GET /utilisateur/profil (avec token en header)
    ↓
Backend renvoie user data + role
    ↓
Provider restaure userData et active les flags
    ↓
Affiche le contenu approprié
```

### Étape 3: Déconnexion

```
User clique sur "Déconnexion"
    ↓
Client supprime le token: localStorage.removeItem("bus_station_token_key")
    ↓
Provider reset userData et désactive tous les flags
    ↓
Redirection vers "/"
```

---

## 🎯 Redirection post-login

Selon le rôle renvoyé par le backend :

| Rôle | Flag activé | Redirection | Destination |
|------|-------------|------------|-------------|
| `USAGER` | `isCustomerAuthenticated` | Customer dashboard | `/my-reservations` ou `/coupons` |
| `AGENCE_VOYAGE` | `isAgencyConnected` | Agency dashboard | `/agency-profile` ou `/dashboard` |
| `BUS_STATION_MANAGER` | `isAgencyConnected` + `isOrganizationConnected` | Manager dashboard | `/bsm-dashboard` ou `/bus-station-manager-views` |

---

## 🛡️ Sécurité

### Stockage du token

- **Local:** `localStorage.setItem("bus_station_token_key", token)`
- **Clé:** `"bus_station_token_key"`
- **Format:** JWT Bearer token
- **Durée:** Définie par le backend (`expiresIn` en secondes)

### Ajout du token aux requêtes

L'intercepteur `src/lib/services/axios-services/interceptors/auth-interceptor.ts` ajoute automatiquement le header :

```
Authorization: Bearer {token}
```

**Exception :** Les endpoints `/utilisateur/connexion` et `/utilisateur/inscription` ne reçoivent PAS le token (publics).

### Gestion d'erreurs

```javascript
// Dans le Provider (src/context/Provider.tsx)

if (error?.response?.status === 401 || error?.response?.status === 403) {
  → "Identifiants incorrects, veuillez réessayer !"
} else if (error?.response?.status === 404) {
  → "Utilisateur non trouvé, veuillez réessayer !"
} else {
  → "Une erreur est survenue. Vérifiez votre connexion."
}
```

---

## 📱 Optimisations mobile

### UX/UI

- Hauteur minimum bouton : `48px` (cible tactile)
- Police : `16sp` minimum (évite zoom iOS)
- Spacing : `12-16px` entre éléments
- Focus management : Focus auto sur le 1er champ
- Clavier approprié : `email-address` pour email, masqué pour pwd

### Performance

- Pas de API calls inutiles
- Token stocké en mémoire + localStorage
- Pas de re-renders inutiles avec `useMemo` dans Provider

### Accessibilité

- Labels explicites pour chaque champ
- Contraste WCAG AAA
- Support clavier `Tab`, `Enter`, `Shift+Tab`
- Screen reader: `aria-label`, `aria-describedby` pour erreurs

---

## 🌍 Internationalisation (i18n)

Les textes sont traduits (FR/EN) via `src/translations/` :

```
src/translations/
  ├── fr/
  │   └── global.json
  └── en/
      └── global.json
```

Clés utilisées pour la page de login :

```json
{
  "auth": {
    "loginText": "Se connecter",
    "registerText": "S'inscrire",
    "emailPlaceholder": "Adresse email",
    "passwordPlaceholder": "Mot de passe",
    "rememberMe": "Se souvenir de moi",
    "forgotPassword": "Mot de passe oublié ?",
    "loginButton": "Se connecter",
    "invalidCredentials": "Identifiants incorrects, veuillez réessayer !",
    "userNotFound": "Utilisateur non trouvé, veuillez réessayer !",
    "networkError": "Une erreur est survenue. Vérifiez votre connexion."
  }
}
```

---

## 📊 Architecture du code

### Fichiers clés

```
src/
├── app/
│   └── (authentication-pages)/
│       └── login/
│           └── page.tsx              ← Page de connexion
│
├── components/
│   └── authentication-pages-components/
│       ├── LoginForm.tsx             ← Composant formulaire
│       └── ...
│
├── context/
│   └── Provider.tsx                  ← Logic auth (login, logout, roles)
│
├── lib/
│   ├── services/
│   │   ├── businessActor-service.ts  ← API calls (loginBusinessActor, getConnectedUser)
│   │   └── axios-services/
│   │       └── interceptors/
│   │           └── auth-interceptor.ts ← Ajout du token aux headers
│   │
│   └── types/
│       ├── schema/
│       │   └── loginSchema.ts        ← Validation Zod
│       └── models/
│           └── BusinessActor.ts      ← Types Customer, LoginResponseDTO
│
└── translations/
    ├── fr/
    └── en/
        └── global.json              ← Textes i18n
```

### Data flow

```
LoginForm (User input)
    ↓
useBusStation() Provider (login method)
    ↓
loginBusinessActor(data)
    ↓
axiosInstance.post("/utilisateur/connexion")
    ↓
auth-interceptor (ajoute Bearer token si présent)
    ↓
Backend: /utilisateur/connexion
    ↓
Response: { token, userId, email, role, ... }
    ↓
Provider sauvegarde dans localStorage
    ↓
Provider active flags selon role
    ↓
Redirection selon role
```

---

## ✅ Checklist implémentation

- [ ] Créer page `/login` avec formulaire
- [ ] Implémenter validation Zod pour email + password
- [ ] Créer composant `LoginForm` réutilisable
- [ ] Connecter au Provider `useBusStation()`
- [ ] Tester les 3 rôles (Customer, Agence, Manager)
- [ ] Ajouter messages d'erreur inline
- [ ] Ajouter loader sur bouton pendant envoi
- [ ] Implémenter "Se souvenir de moi" (optionnel)
- [ ] Ajouter lien "Mot de passe oublié ?"
- [ ] Ajouter lien "S'inscrire"
- [ ] Tester sur mobile (Responsive Design)
- [ ] Vérifier accessibilité (WCAG)
- [ ] Tester offline/network errors
- [ ] Tester session restore au démarrage
- [ ] Tester logout et redirect
- [ ] Documenter pour l'équipe
