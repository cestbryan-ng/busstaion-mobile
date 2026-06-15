# 📱 Page d'Inscription Mobile - Documentation Complète

## 🎯 Description de la Page

### Vue d'ensemble
Page d'inscription multi-étapes (3 étapes) permettant à un nouvel utilisateur de créer un compte sur la plateforme Bus Station. La page utilise un design responsive mobile-first avec animation progressive entre les étapes.

---

## 📋 Étape 1 - Informations Personnelles

### Formulaire
Champs à remplir:

| Champ | Type | Validation | Exemple |
|-------|------|-----------|---------|
| `first_name` | Texte | Requis, min 1 caractère | "Jean" |
| `last_name` | Texte | Requis, min 1 caractère | "Dupont" |
| `username` | Texte | Requis, min 3 caractères, unique | "dupont123" |
| `age` | Nombre | Requis, entier, min 12 | 25 |
| `gender` | Select | Requis (MALE/FEMALE) | "MALE" |
| `email` | Email | Requis, format valide, unique | "jean@example.com" |
| `phone_number` | Tel | Requis, min 8 caractères | "+33612345678" |
| `password` | Password | Requis, min 8, 1 majuscule, 1 chiffre | "SecurePass123" |
| `confirmPassword` | Password | Requis, doit correspondre | "SecurePass123" |
| Conditions | Checkbox | Requis | ✓ Coché |

### Boutons
- **Continuer** - Valide les champs et passe à l'étape 2
- **Retour** - Revient à l'étape précédente (désactivé)

### Actions
- Validation Zod en temps réel
- Affichage des erreurs par champ
- POST `/utilisateur/inscription` au clic "Continuer"
- Sauvegarde en sessionStorage (chiffré)

---

## 🔄 Étape 2 - Type de Compte

### Formulaire
Sélection du type de compte (radio buttons):

| Option | Valeur | Description |
|--------|--------|-------------|
| Client | `USAGER` | Compte simple pour voyager |
| Agence | `AGENCE_VOYAGE` | Compte pour gérer une agence de voyage |

### Comportement
- Si **USAGER** sélectionné → Bouton "Continuer" redirige vers login
- Si **AGENCE_VOYAGE** sélectionné → Affiche l'étape 3

### Boutons
- **Continuer** - Passe à l'étape 3 (ou va au login si USAGER)
- **Retour** - Revient à l'étape 1

---

## 🏢 Étape 3 - Détails de l'Agence (Conditionnel)

### Affichage
Visible **uniquement** si `AGENCE_VOYAGE` a été sélectionné à l'étape 2

### Formulaire
Champs à remplir:

| Champ | Type | Validation | Exemple |
|-------|------|-----------|---------|
| `long_name` | Texte | Requis | "General Voyages" |
| `ceo_name` | Texte | Requis | "KENFACK Adam" |
| `email` | Email | Requis, format valide | "contact@voyages.com" |
| `year_founded` | Date | Requis | "2025" |
| `business_registration_number` | Texte | Requis | "IM075123456" |
| `tax_number` | Texte | Requis | "FR12345678901" |

### Boutons
- **Créer Agence** - POST `/organizations` et complète l'inscription
- **Retour** - Revient à l'étape 2

### Actions
- POST `/organizations` pour créer l'organisation
- Affiche modal de succès
- Redirection vers `/login`

---

## 🔗 Endpoints Backend Utilisés

### 1. Inscription Utilisateur
```
POST /utilisateur/inscription
URL complète: http://localhost:8081/utilisateur/inscription
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
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
```

**Réponse (201/200):**
```json
{
  "id": "uuid",
  "first_name": "Jean",
  "last_name": "Dupont",
  "username": "dupont123",
  "email": "jean.dupont@example.com",
  "role": ["USAGER"]
}
```

**Erreurs:**
- `400` - Données invalides
- `409` - Email/username déjà existant

---

### 2. Créer Organisation/Agence
```
POST /organizations
URL complète: http://localhost:8081/organizations
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body:**
```json
{
  "long_name": "General Voyages",
  "ceo_name": "KENFACK Adam",
  "email": "contact@voyages.com",
  "year_founded": "2025",
  "business_registration_number": "IM075123456",
  "tax_number": "FR12345678901"
}
```

**Réponse (201):**
```json
{
  "id": "uuid",
  "long_name": "General Voyages",
  "ceo_name": "KENFACK Adam",
  "email": "contact@voyages.com",
  "status": "PENDING_VERIFICATION"
}
```

**Erreurs:**
- `400` - Données invalides
- `401` - Non authentifié
- `409` - Agence déjà existante

---

### 3. Connexion
```
POST /utilisateur/connexion
URL complète: http://localhost:8081/utilisateur/connexion
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "jean.dupont@example.com",
  "password": "SecurePass123"
}
```

**Réponse (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "jean.dupont@example.com",
    "role": ["USAGER"]
  }
}
```

---

### 4. Récupérer Profil
```
GET /utilisateur/profil
URL complète: http://localhost:8081/utilisateur/profil
```

**Headers:**
```
Authorization: Bearer {token}
```

**Réponse (200):**
```json
{
  "id": "uuid",
  "email": "jean.dupont@example.com",
  "first_name": "Jean",
  "last_name": "Dupont",
  "role": ["USAGER"],
  "organizationId": null
}
```

---

## 🎨 Éléments UI

### Composants
- **Barre de Progression** - Affiche l'étape 1/2/3 avec barre visuelle
- **Formulaire** - Champs de saisie avec validation inline
- **Messages d'Erreur** - Texte rouge sous les champs invalides
- **Loader** - Spinner pendant le traitement
- **Modal de Succès** - Confirmation après inscription
- **Modal d'Erreur** - Affichage des erreurs serveur

### Styles
- Design responsive (mobile-first)
- Gradient bleu (fond)
- Carte blanche (formulaire)
- Animations transitions entre étapes
- Boutons tactiles (hauteur py-3 ou plus)

---

## 🔄 Flux Complet d'Inscription

```
1. Utilisateur arrive sur /register
   ↓
2. Étape 1: Remplit infos personnelles
   ↓
3. Clique "Continuer"
   ↓
4. POST /utilisateur/inscription
   ↓
5. Réponse: 201 ✓ 
   ↓
6. Étape 2: Choisit type de compte
   ↓
7. Si USAGER → Redirection /login
   ↓
   Si AGENCE_VOYAGE → Étape 3
   ↓
8. Étape 3: Remplit détails agence
   ↓
9. Clique "Créer Agence"
   ↓
10. POST /organizations
    ↓
11. Réponse: 201 ✓
    ↓
12. Modal Succès affichée
    ↓
13. Redirection /login
```

---

## 🔐 Variables d'Environnement

```
NEXT_PUBLIC_TRIP_AGENCY_BACKEND_API_URL=http://localhost:8081
```

---

## 📱 Responsive Design

- **Mobile (< 640px):** Pleine largeur, champs empilés
- **Tablet (640px - 1024px):** Max-width 500px, 2 colonnes possibles
- **Desktop (> 1024px):** Max-width 1000px, 2 colonnes

---

## ✅ Résumé des URLs

| Méthode | Endpoint | Utilisation |
|---------|----------|------------|
| POST | `/utilisateur/inscription` | Créer un compte utilisateur |
| POST | `/utilisateur/connexion` | Se connecter |
| POST | `/organizations` | Créer une agence (étape 3) |
| GET | `/utilisateur/profil` | Récupérer le profil (optionnel) |

**Base URL:** `http://localhost:8081`
