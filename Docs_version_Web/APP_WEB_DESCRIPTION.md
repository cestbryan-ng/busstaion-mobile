# 📱 Bus Station - Plateforme de Gestion Multi-Tenante pour Gares Routières

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs et vision](#objectifs-et-vision)
3. [Fonctionnalités principales](#fonctionnalités-principales)
4. [Architecture technique](#architecture-technique)
5. [Structure du projet](#structure-du-projet)
6. [Modules et pages](#modules-et-pages)
7. [Flux des données](#flux-des-données)
8. [Stack technologique](#stack-technologique)
9. [Installation et configuration](#installation-et-configuration)
10. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

**Bus Station** est une plateforme web complète, moderne et multi-tenante dédiée à la gestion intégrée des **gares routières** et des **agences de transport**. L'application est conçue pour moderniser, automatiser et centraliser toutes les opérations liées au fonctionnement d'une gare routière.

### Contexte
Ce projet s'intègre dans un **écosystème plus large** comprenant :
- Une **application mobile** pour les clients et passagers
- Des **services backend** pour les opérations métier
- Une **API REST** pour l'intégration avec d'autres systèmes
- Un **système d'authentification centralisé** avec gestion des rôles et permissions

### Public cible
- **Gares routières** : Administrer les opérations quotidiennes
- **Agences de transport** : Gérer leurs véhicules et trajets
- **Chauffeurs** : Consulter les trajets et informations du voyage
- **Clients/Passagers** : Réserver des tickets et consulter leurs réservations
- **Administrateurs** : Superviser et valider les opérations

---

## 🎪 Objectifs et vision

### Objectifs principaux

1. **Centraliser la gestion des gares routières**
   - Unifier l'administration de plusieurs gares
   - Standardiser les opérations quotidiennes

2. **Automatiser les processus métier**
   - Gestion des départs et arrivées
   - Validation automatique des sociétés
   - Gestion des sanctions et statistiques
   - Collecte de taxes et revenus

3. **Moderniser l'expérience utilisateur**
   - Interface intuitive et responsive
   - Support multilingue (FR/EN)
   - Système de notifications en temps réel
   - Thème clair/sombre

4. **Garantir la sécurité et traçabilité**
   - Authentification robuste
   - Gestion des rôles et permissions granulaires
   - Historique et audit des opérations
   - Chiffrement des données sensibles

5. **Fournir des analytics et reportings**
   - Tableaux de bord détaillés
   - Statistiques en temps réel
   - Exportation de rapports
   - Suivi des métriques de performance

---

## ✨ Fonctionnalités principales

### 1. **Authentification et Gestion des Utilisateurs**
- **Login/Register** : Inscription et connexion sécurisées
- **Récupération de mot de passe** : Réinitialisation par email
- **Gestion des profils** : Modification des données personnelles et photos
- **Rôles multiples** : Agency, Bus Station Manager, Customer, Admin
- **Permissions granulaires** : Accès basé sur les rôles

### 2. **Gestion des Gares Routières**
- **Listing des gares** : Vue publique et détails complets
- **Configuration des gares** : Amenités, horaires, tarifs
- **Gestion des départs/arrivées** : Planification et suivi
- **Gestion des places de stationnement** : Attribution et suivi
- **Gestion des tickets de quai** : Système de file d'attente
- **Collecte des taxes** : Suivi des revenus et paiements

### 3. **Gestion des Agences de Transport**
- **Profil d'agence** : Logo, description, coordonnées
- **Gestion des véhicules** : Type, capacité, état, assurance
- **Gestion des chauffeurs** : Permis, documents, affectation
- **Gestion des employés** : Rôles, permissions, historique
- **Tarification** : Prix des trajets par classe
- **Traçabilité** : Historique des opérations

### 4. **Système de Réservation**
- **Planification des trajets** : Créer des voyages avec horaires
- **Disponibilité des sièges** : Vue interactive des places
- **Réservation de billets** : Processus simple et intuitif
- **Paiement** : Intégration paiement sécurisé
- **Confirmation** : Email de confirmation avec détails
- **Annulation** : Gestion des remboursements
- **Historique** : Consulter les réservations passées
- **Coupons/Codes promo** : Réductions et offres spéciales

### 5. **Marketplace**
- **Parcourir les trajets** : Recherche et filtrage
- **Comparaison de prix** : Entre agences et horaires
- **Avis clients** : Évaluations et commentaires
- **Recommandations** : Trajets basés sur l'historique

### 6. **Tableaux de Bord (Dashboards)**
- **Agence** : Vue des réservations, revenus, statistiques
- **Gare Routière** : Trafic, validations, sanctions
- **Admin** : Supervision globale, métriques clés
- **Client** : Réservations, historique, coupons

### 7. **Gestion Administrative**
- **Validation des agences** : Approbation des nouvelles agences
- **Gestion des sanctions** : Amende et restrictions
- **Supervision du trafic** : Vue temps réel des opérations
- **Rapports et analytics** : Exportation de données
- **Gestion des coupons** : Création et distribution

### 8. **Fonctionnalités Additionnelles**
- **Calendrier des événements** : Visualiser tous les trajets
- **Support multilingue** : Français et Anglais
- **Notifications en temps réel** : STOMP/WebSocket pour les mises à jour
- **Mode sombre/clair** : Préférence utilisateur
- **Pages informationnelles** : FAQ, Politique de confidentialité, Conditions, À propos, Contact

---

## 🏗️ Architecture technique

### Approche générale

L'architecture suit le **pattern Next.js App Router** avec une séparation claire des responsabilités :

```
Requête utilisateur
    ↓
Middleware (Authentification & Autorisation)
    ↓
Layout Racine (Providers globaux : Thème, Langue, État)
    ↓
Layout de section (UI commune : Sidebar, Header)
    ↓
Page (Composants spécifiques)
    ↓
Hooks personnalisés (Logique métier & État)
    ↓
Services (Appels API)
    ↓
HTML final
```

### Layers

1. **Présentation (UI)**
   - Pages (Next.js App Router)
   - Composants React
   - Layouts imbriqués
   - Primitives UI réutilisables

2. **Logique métier**
   - Hooks personnalisés
   - Contextes React
   - Utilitaires

3. **Persistance & Communication**
   - Services API (Axios)
   - Types TypeScript
   - Modèles de données

4. **Infrastructure**
   - Middleware d'authentification
   - Gestion des routes
   - Internationalisation (i18n)
   - Thématisation

---

## 📁 Structure du projet

```
busstation2/
├── src/
│   ├── app/                           # App Router - Pages et layouts
│   │   ├── (authentication-pages)/    # Routes d'authentification
│   │   │   ├── login/                 # Connexion
│   │   │   ├── register/              # Inscription
│   │   │   └── forgot-password/       # Récupération mot de passe
│   │   │
│   │   ├── (agency-views)/            # Routes des agences
│   │   │   ├── layout.tsx             # Layout avec sidebar
│   │   │   └── dashboard/             # Tableau de bord agence
│   │   │
│   │   ├── (bus-station-manager-views)/  # Routes des gares
│   │   │   ├── layout.tsx
│   │   │   └── bsm-dashboard/         # Tableau de bord gare
│   │   │
│   │   ├── (customer-view)/           # Routes des clients
│   │   │   ├── layout.tsx
│   │   │   ├── agency/                # Détails agence
│   │   │   ├── gares-routieres/       # Listing des gares
│   │   │   ├── market-place/          # Réservation de trajets
│   │   │   ├── my-reservations/       # Mes réservations
│   │   │   ├── coupons/               # Mes coupons
│   │   │   ├── profil/                # Profil utilisateur
│   │   │   ├── history/               # Historique des voyages
│   │   │   └── user-profile/          # Détails du profil
│   │   │
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── middleware.ts              # Authentification
│   │   ├── not-found.tsx              # Page 404
│   │   ├── loading.tsx                # Loading global
│   │   └── (pages publiques)/
│   │       ├── about/                 # À propos
│   │       ├── contact-us/            # Contact
│   │       ├── privacy-policy/        # Politique de confidentialité
│   │       ├── term-and-conditions/   # Conditions d'utilisation
│   │       ├── faqs/                  # FAQ
│   │       ├── cookies/               # Gestion des cookies
│   │       └── agency-profile/        # Profil agence public
│   │
│   ├── components/                    # Composants React réutilisables
│   │   ├── landing-page-components/   # Sections de la landing page
│   │   ├── authentication-pages-components/  # Formulaires auth
│   │   ├── dashboard/                 # Composants dashboard
│   │   ├── bus-station-dashboard/     # Dashboard gares
│   │   ├── reservation-components/    # Processus de réservation
│   │   ├── seat-disposition-components/  # Sélection de sièges
│   │   ├── market-place-components/   # Recherche/listing trajets
│   │   ├── my-reservation-components/ # Gestion réservations client
│   │   ├── bus-station-detail-page-components/  # Détails gare
│   │   ├── layouts/                   # Headers, Sidebars
│   │   ├── error-handler/             # Affichage des erreurs
│   │   ├── loading-page-components/   # États de chargement
│   │   ├── about-page-components/     # Section À propos
│   │   ├── faqs-page-component/       # Composants FAQ
│   │   └── agencies-page-components/  # Listing agences
│   │
│   ├── ui/                            # Primitives UI réutilisables
│   │   ├── Button.tsx                 # Boutons
│   │   ├── InputField.tsx             # Champs d'entrée
│   │   ├── SelectField.tsx            # Sélecteurs
│   │   ├── TextareaField.tsx          # Textareas
│   │   ├── Card.tsx                   # Cartes
│   │   ├── Modal.tsx                  # Modales
│   │   ├── EditableTextField.tsx      # Champs éditables
│   │   ├── ProgressBar.tsx            # Barres de progression
│   │   └── ...
│   │
│   ├── lib/                           # Logique partagée
│   │   ├── services/                  # Appels API
│   │   │   ├── agency-service.ts
│   │   │   ├── gare-service.ts
│   │   │   ├── trip-service.ts
│   │   │   ├── reservation-service.ts
│   │   │   ├── vehicule-service.ts
│   │   │   ├── chauffeur-service.ts
│   │   │   ├── statistics-service.ts
│   │   │   ├── contact-service.ts
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                     # Hooks personnalisés
│   │   │   └── useXxx.ts              # Hooks pour logique métier
│   │   │
│   │   ├── types/                     # Définitions TypeScript
│   │   │   ├── agency.ts
│   │   │   ├── trip.ts
│   │   │   ├── reservation.ts
│   │   │   ├── user.ts
│   │   │   └── ...
│   │   │
│   │   ├── animations/                # Animations Framer Motion
│   │   ├── contexts/                  # Contextes additionnels
│   │   └── ...
│   │
│   ├── context/                       # Contextes React globaux
│   │   ├── Provider.tsx               # Wrapper principal
│   │   ├── ThemeProvider.tsx          # Thème clair/sombre
│   │   ├── LanguageProvider.tsx       # Internationalisation
│   │   ├── ResourceContext.tsx        # Données partagées
│   │   └── ...
│   │
│   ├── modals/                        # Composants modales
│   │   ├── ConfirmationModal.tsx
│   │   ├── ErrorModal.tsx
│   │   ├── SuccessModal.tsx
│   │   ├── PaymentRequestModal.tsx
│   │   ├── ReservationProcessModal.tsx
│   │   ├── AddTripModal.tsx
│   │   ├── TripDetailModal.tsx
│   │   └── ...
│   │
│   ├── translations/                  # Fichiers i18n
│   │   ├── en/                        # Anglais
│   │   └── fr/                        # Français
│   │
│   └── globals.css                    # Styles globaux
│
├── public/                            # Ressources statiques
│   ├── images/
│   │   ├── team/                      # Photos d'équipe
│   │   └── tech/                      # Icônes technologiques
│   ├── agency-logos/                  # Logos des agences
│   └── documents/                     # Documents statiques
│
├── mock-server/
│   └── db.json                        # Base de données simulée
│
├── Configuration files
│   ├── package.json                   # Dépendances npm
│   ├── tsconfig.json                  # Configuration TypeScript
│   ├── next.config.ts                 # Configuration Next.js
│   ├── tailwind.config.js             # Configuration Tailwind
│   ├── postcss.config.mjs             # Configuration PostCSS
│   └── eslint.config.mjs              # Configuration ESLint
│
└── Documentation
    ├── README.md                      # Guide de démarrage
    ├── PROJECT_ARCHITECTURE.md        # Architecture détaillée
    ├── CHANGELOG.md                   # Historique des versions
    └── APP_DESCRIPTION.md             # Ce document
```

---

## 📄 Modules et pages

### 🔐 Module Authentification

**Routes** : `/login`, `/register`, `/forgot-password`

#### Pages
1. **Login** (`/login`)
   - Formulaire de connexion
   - Validation email/mot de passe
   - Redirection basée sur le rôle
   - Lien vers inscription et récupération mot de passe

2. **Register** (`/register`)
   - Formulaire d'inscription
   - Sélection du type de compte (Agency, Individual)
   - Validation des données
   - Email de confirmation

3. **Forgot Password** (`/forgot-password`)
   - Récupération de mot de passe
   - Email de réinitialisation
   - Sécurité par token

---

### 🏢 Module Agence

**Routes** : `/(agency-views)/dashboard`, etc.

#### Pages
1. **Dashboard Agence**
   - Statistiques clés (réservations, revenus)
   - Graphiques de tendances
   - Alertes et notifications
   - Raccourcis vers actions courantes

#### Fonctionnalités
- Gestion des véhicules
- Gestion des chauffeurs
- Gestion des trajets
- Suivi des réservations
- Statistiques et rapports
- Gestion du profil agence
- Configuration des tarifs

---

### 🚌 Module Gare Routière

**Routes** : `/(bus-station-manager-views)/bsm-dashboard`, etc.

#### Pages
1. **Dashboard Gare Routière**
   - Vue du trafic en temps réel
   - Validations en attente
   - Sanctions et violations
   - Statistiques du jour

#### Fonctionnalités
- Validation des agences
- Gestion des places de stationnement
- Gestion des tickets de quai
- Collecte des taxes
- Gestion des sanctions
- Suivi des départs/arrivées
- Rapports de trafic

---

### 👤 Module Client

**Routes** : `/(customer-view)/*`

#### Pages
1. **Marketplace** (`/market-place`)
   - Recherche et filtrage des trajets
   - Comparaison de prix
   - Affichage des disponibilités
   - Avis clients

2. **Réservation** (`/market-place` → processus)
   - Sélection du trajet
   - Choix des sièges (vue interactive)
   - Entrée des données passager
   - Paiement
   - Confirmation

3. **Mes réservations** (`/my-reservations`)
   - Liste des réservations actives
   - Historique des voyages passés
   - Options d'annulation
   - Détails des tickets

4. **Coupons** (`/coupons`)
   - Coupons disponibles
   - Coupons utilisés
   - Code promo
   - Économies réalisées

5. **Historique** (`/history`)
   - Tous les trajets passés
   - Évaluations et avis
   - Statistiques personnelles
   - Téléchargement de reçus

6. **Profil** (`/profil`, `/user-profile`)
   - Informations personnelles
   - Adresse de livraison/facturation
   - Méthodes de paiement
   - Préférences
   - Photo de profil

7. **Gares Routières** (`/gares-routieres`)
   - Listing de toutes les gares
   - Détails et amenités
   - Horaires et coordonnées
   - Points de contact

8. **Profil Agence** (`/agency/{id}`)
   - Informations agence
   - Véhicules disponibles
   - Trajet proposés
   - Avis des clients
   - Coordonnées de contact

---

### 📱 Module Public

#### Pages
1. **Landing Page** (`/`)
   - Héro section
   - Section client
   - Statistiques
   - Fonctionnalités
   - Appel à action
   - Agences partenaires
   - Footer

2. **À Propos** (`/about`)
   - Mission et vision
   - Historique
   - Équipe
   - Partenaires

3. **FAQ** (`/faqs`)
   - Questions fréquentes par catégorie
   - Accord/désaccord
   - Recherche

4. **Contact** (`/contact-us`)
   - Formulaire de contact
   - Données de l'agence
   - Réseaux sociaux

5. **Politique de Confidentialité** (`/privacy-policy`)
   - Politiques de données
   - Droits des utilisateurs

6. **Conditions d'Utilisation** (`/term-and-conditions`)
   - Conditions légales
   - Responsabilités

7. **Gestion des Cookies** (`/cookies`)
   - Préférences de cookies
   - Consentement

---

## 📊 Flux des données

### Flux de réservation (exemple complet)

```
Client accède à /market-place
    ↓
Appel service : searchTrips(origin, destination, date)
    ↓
API retourne liste des trajets disponibles
    ↓
Client sélectionne un trajet
    ↓
Affichage du plan des sièges
    ↓
Client sélectionne ses sièges
    ↓
Formulaire passager avec données personnelles
    ↓
Validation des données (Zod)
    ↓
Appel service : createReservation(tripId, seatIds, passengerData)
    ↓
API crée la réservation en base de données
    ↓
Paiement via gateway intégré
    ↓
Si paiement OK : confirmation et email
    ↓
Redirection vers page confirmation
    ↓
Ticket disponible dans "Mes réservations"
```

### Flux d'authentification

```
Utilisateur accède à une route protégée
    ↓
Middleware.ts vérifie le token JWT
    ↓
Si pas de token : redirection vers /login
    ↓
Si token expiré : redirection vers /login
    ↓
Si token valide : extraction du rôle et permissions
    ↓
Redirection basée sur le rôle vers le bon dashboard
    ↓
Page affiche le contenu autorisé
```

### Flux de communication temps réel

```
Événement serveur (new trip notification)
    ↓
Serveur publie via STOMP/WebSocket
    ↓
Client souscrit au channel (via @stomp/stompjs)
    ↓
Message reçu par socket listener
    ↓
Mise à jour du contexte React
    ↓
Re-render des composants abonnés
    ↓
Notification utilisateur (react-hot-toast)
```

---

## 💻 Stack technologique

### Frontend
| Technologie | Version | Utilisation |
|---|---|---|
| **Next.js** | 15.5.12 | Framework React full-stack avec App Router |
| **React** | 19.0.0 | Bilbliothèque UI |
| **TypeScript** | Latest | Typage fort du code |
| **Tailwind CSS** | @tailwindcss/postcss 4 | Styling utilitaire |
| **React Hook Form** | 7.58.1 | Gestion des formulaires |
| **Zod** | 3.24.4 | Validation de schémas |

### State Management & Context
| Technologie | Utilisation |
|---|---|
| **React Context API** | Gestion de l'état global (thème, langue) |
| **Constate** | État réactif simplifié |
| **React Hooks** | Logique composant et side effects |

### Communication & API
| Technologie | Utilisation |
|---|---|
| **Axios** | Requêtes HTTP |
| **@stomp/stompjs** | WebSocket STOMP pour temps réel |
| **sockjs-client** | Fallback WebSocket |

### UI & Animations
| Technologie | Utilisation |
|---|---|
| **@radix-ui** | Composants accessibles (Dialog, Dropdown) |
| **@heroicons/react** | Icônes SVG |
| **lucide-react** | Ensemble d'icônes modernes |
| **react-icons** | Icônes additionnelles |
| **Framer Motion** | Animations fluides |
| **react-hot-toast** | Notifications toast |

### Formulaires & Données
| Technologie | Utilisation |
|---|---|
| **antd** | Composants UI Enterprise (datepicker, etc.) |
| **react-big-calendar** | Calendrier avancé |
| **recharts** | Graphiques et data visualization |
| **date-fns** | Manipulation des dates |

### i18n & Accessibilité
| Technologie | Utilisation |
|---|---|
| **i18next** | Système de traduction |
| **react-i18next** | Intégration React pour i18n |
| **i18next-browser-languagedetector** | Détection automatique langue navigateur |

### Drag & Drop
| Technologie | Utilisation |
|---|---|
| **@dnd-kit** | Système drag-and-drop moderne |

### Intersection Observer
| Technologie | Utilisation |
|---|---|
| **react-intersection-observer** | Lazy loading et infinite scroll |

### Code Quality
| Technologie | Version | Utilisation |
|---|---|---|
| **ESLint** | Latest | Analyse statique du code |
| **@tailwindcss/postcss** | 4 | PostCSS pour Tailwind |

### Développement
| Technologie | Utilisation |
|---|---|
| **NVM** | Gestion des versions Node |
| **npm** | Gestionnaire de paquets |
| **json-server** | Serveur API simulé pour mock |

---

## 🚀 Installation et configuration

### Prérequis
- **Node.js** >= 20.9.0 (recommandé 20.x ou 22.x)
- **npm** >= 9.0
- **git**
- Un navigateur moderne (Chrome, Firefox, Safari, Edge)

### Étapes d'installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/cestbryan-ng/busstationv2.git
   cd busstationv2
   ```

2. **Installer Node.js via NVM** (optionnel mais recommandé)
   ```bash
   nvm install 20.9.0
   nvm use 20.9.0
   ```

3. **Installer les dépendances**
   ```bash
   npm install
   ```

4. **Démarrer le serveur de développement**
   ```bash
   npm run dev
   ```
   L'application est accessible sur `http://localhost:3000`

5. **Démarrer le serveur API simulé** (dans un autre terminal)
   ```bash
   npm run mock-api
   ```
   L'API est accessible sur `http://localhost:3001`

### Scripts disponibles

```bash
npm run dev          # Démarrer le serveur de développement
npm run build        # Compiler pour la production
npm run start        # Démarrer le serveur de production
npm run lint         # Vérifier la qualité du code
npm run mock-api     # Démarrer le serveur API simulé
```

### Configuration

#### Variables d'environnement
Créer un fichier `.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Bus Station
```

#### Configuration i18n
- Fichiers de traduction : `src/translations/`
- Langues supportées : Français (fr), Anglais (en)
- Détection automatique de la langue du navigateur

#### Configuration du thème
- Thème dans `src/context/ThemeProvider.tsx`
- Modes : light, dark, auto
- Stockage en localStorage

---

## 🌐 Déploiement

### Déploiement sur Vercel (Recommandé)

1. **Pousser sur GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Connecter à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le repository
   - Configurer les variables d'environnement
   - Déployer

3. **Configuration Vercel**
   - Build command: `npm run build`
   - Output directory: `.next`

### Déploiement sur Netlify

1. **Pousser sur GitHub/GitLab**
2. **Connecter à Netlify**
   - Build command: `npm run build`
   - Publish directory: `.next`

### Déploiement sur serveur custom

```bash
# Build
npm run build

# Déployer les fichiers
# - .next/
# - public/
# - package.json
# - package-lock.json

# Sur le serveur
npm install --production
npm run start
```

### Workflow de branche

```
atabong (Dev)
    ↓ merge
merge (Test/Intégration)
    ↓ merge
main (Production)
```

**Procédure de merge :**
```bash
# 1. Sauvegarder ta branche
git checkout atabong
git add .
git commit -m "Your message"
git push origin atabong

# 2. Fusionner vers merge
git checkout merge
git pull origin merge
git merge atabong
git push origin merge

# 3. Fusionner vers main (après validation)
git checkout main
git pull origin main
git merge merge
git push origin main
```

---

## 📋 Fonctionnalités futures envisagées

- [ ] Système de géolocalisation en temps réel
- [ ] Application mobile native (React Native)
- [ ] Intégration paiement multiple (Stripe, Paypal, etc.)
- [ ] Analyse prédictive de trafic
- [ ] Système de rating/review amélioré
- [ ] Intégration SMS/WhatsApp
- [ ] Gamification et fidélité
- [ ] Outils de gestion automatisée des tarifs
- [ ] API GraphQL
- [ ] Synchronisation offline

---

## 🤝 Contribution

Pour contribuer au projet :
1. Créer une branche feature à partir de `atabong`
2. Committer avec messages clairs
3. Ouvrir une Pull Request vers `merge`
4. Attendre l'approbation
5. Merge après validation

---

## 📞 Support et Contact

- **Email** : support@busstation.cm
- **Téléphone** : +237 XXX XXX XXX
- **Website** : www.busstation.cm
- **Social** : [LinkedIn, Twitter, Facebook]

---

## 📄 Licence

Ce projet est propriétaire et confidentiel. Tous les droits sont réservés.

---

## 📝 Notes importantes

- L'API mockée (`localhost:3001`) utilise `json-server` pour le développement local
- Pour la production, remplacer les URLs d'API par les vrais endpoints
- Assurez-vous que les variables d'environnement sont correctement configurées
- Effectuer des tests réguliers sur les navigateurs cibles
- Maintenir la documentation à jour lors des modifications

---

**Dernière mise à jour** : Juin 2026  
**Maintaineur** : Équipe de développement Bus Station  
**Repository** : [GitHub - cestbryan-ng/busstationv2](https://github.com/cestbryan-ng/busstationv2.git)
