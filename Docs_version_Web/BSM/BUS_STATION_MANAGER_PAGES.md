# Bus Station Manager - Pages et navigation

Ce document décrit les pages de l'acteur `bus_station_manager` dans le projet `busstation2`, avec les routes associées et les pages accessibles depuis chaque page.

> Le dossier principal est `src/app/(bus-station-manager-views)`.

## 1. Layout Bus Station Manager

- Fichier : `src/app/(bus-station-manager-views)/layout.tsx`
- Route partagée : toutes les pages de l'espace bus_station_manager héritent de ce layout.
- Description : structure globale de l'espace manager de gare, contenant la sidebar de navigation `BusStationDashboardSidebar`, la barre supérieure `NavBar` et le footer `Footer`. Gère l'état ouverture/fermeture de la sidebar et les actions de déconnexion.
- Composants clés :
  - `BusStationDashboardSidebar` : sidebar navigable avec les items de menu
  - `CustomerNavBar` : barre de navigation supérieure
  - `Footer` : pied de page
- Pages accessibles depuis ce layout :
  - `/bsm-dashboard`
  - `/bsm-dashboard/affiliated-agencies`
  - `/bsm-dashboard/infrastructure`
  - `/bsm-dashboard/policies-taxes`
  - `/bsm-dashboard/settings`

## 2. Page Tableau de bord principal

- Fichier : `src/app/(bus-station-manager-views)/bsm-dashboard/page.tsx`
- Route : `/bsm-dashboard`
- Description : page d'accueil du manager de gare, présentant un aperçu complet de l'activité. Affiche les KPI principaux (agences affiliées, voyages programmés, taxes en retard, taux d'occupation), les informations détaillées de la gare, la liste des agences affiliées et un graphique d'analyse des voyages.
- Hooks utilisés :
  - `useBusStationManager` : pour charger les données de la station, agences et voyages
- Composants clés :
  - `StationDetails` : affiche les infos de la gare
  - `DetailedAffiliatedAgenciesList` : liste complète des agences affiliées
  - `TripsChart` : graphique d'évolution des voyages
- Gestion d'erreurs :
  - Affiche un loader pendant le chargement
  - Affiche un message d'erreur avec bouton "Réessayer" en cas d'erreur
- Pages accessibles depuis cette page :
  - `/bsm-dashboard/affiliated-agencies`
  - `/bsm-dashboard/infrastructure`
  - `/bsm-dashboard/policies-taxes`
  - `/bsm-dashboard/settings`

## 3. Page Agences affiliées

- Fichier : `src/app/(bus-station-manager-views)/bsm-dashboard/affiliated-agencies/page.tsx`
- Route : `/bsm-dashboard/affiliated-agencies`
- Description : page dédiée à la gestion complète des agences de voyage affiliées à la gare. Affiche une liste détaillée de toutes les compagnies opérant dans la gare routière avec leurs informations et états.
- Hooks utilisés :
  - `useBusStationManager` : pour charger la liste des agences affiliées
- Composants clés :
  - `AffiliatedAgenciesList` : liste des agences avec filtres et actions
- Gestion d'erreurs :
  - Affiche un loader pendant le chargement
  - Affiche un message d'erreur avec bouton "Réessayer" en cas d'erreur
- Pages accessibles depuis cette page :
  - Retour vers `/bsm-dashboard`
  - `/bsm-dashboard/infrastructure`
  - `/bsm-dashboard/policies-taxes`
  - `/bsm-dashboard/settings`

## 4. Page Infrastructure

- Fichier : `src/app/(bus-station-manager-views)/bsm-dashboard/infrastructure/page.tsx`
- Route : `/bsm-dashboard/infrastructure`
- Description : page de gestion et de configuration de l'infrastructure de la gare routière. Permet de consulter et modifier les données relatives aux installations, équipements et caractéristiques physiques de la gare.
- Hooks utilisés :
  - `useBusStationManager` : pour charger les données de la station
- Composants clés :
  - `InfrastructureForm` : formulaire d'édition des données d'infrastructure
- Gestion d'erreurs :
  - Affiche un loader pendant le chargement
  - Affiche un message d'erreur avec bouton "Réessayer" en cas d'erreur
- Pages accessibles depuis cette page :
  - Retour vers `/bsm-dashboard`
  - `/bsm-dashboard/affiliated-agencies`
  - `/bsm-dashboard/policies-taxes`
  - `/bsm-dashboard/settings`

## 5. Page Politiques et taxes

- Fichier : `src/app/(bus-station-manager-views)/bsm-dashboard/policies-taxes/page.tsx`
- Route : `/bsm-dashboard/policies-taxes`
- Description : page de gestion des politiques commerciales et du suivi des taxes de la gare. Affiche les politiques en vigueur, les taux de taxation, les paiements des agences affiliées et leur statut de conformité.
- Hooks utilisés :
  - `usePoliciesAndTaxes` : pour charger les données des politiques et taxes
- Composants clés :
  - `PoliciesAndTaxesList` : liste des politiques et états de taxe
- Gestion d'erreurs :
  - Affiche un loader pendant le chargement
  - Affiche un message d'erreur avec bouton "Réessayer" en cas d'erreur
- Pages accessibles depuis cette page :
  - Retour vers `/bsm-dashboard`
  - `/bsm-dashboard/affiliated-agencies`
  - `/bsm-dashboard/infrastructure`
  - `/bsm-dashboard/settings`

## 6. Page Paramètres

- Fichier : `src/app/(bus-station-manager-views)/bsm-dashboard/settings/page.tsx`
- Route : `/bsm-dashboard/settings`
- Description : page de configuration du compte et des paramètres du manager de gare. Permet de gérer les préférences personnelles, les informations du compte et les options de sécurité.
- Hooks utilisés :
  - `useBusStationManagerAccount` : pour charger les données du compte manager
- Composants clés :
  - `SettingsForm` : formulaire de configuration des paramètres du compte
- Gestion d'erreurs :
  - Affiche un loader pendant le chargement
  - Affiche un message d'erreur avec bouton "Réessayer" en cas d'erreur
- Pages accessibles depuis cette page :
  - Retour vers `/bsm-dashboard`
  - `/bsm-dashboard/affiliated-agencies`
  - `/bsm-dashboard/infrastructure`
  - `/bsm-dashboard/policies-taxes`

## Navigation

Le menu de navigation est défini dans le fichier `src/app/(bus-station-manager-views)/bsm-dashboard/busStationNavLink.ts`, qui fournit :
- `menuItems` : éléments de menu principal
- `secondaryMenuItems` : éléments de menu secondaire

La sidebar affiche ces éléments et permet une navigation fluide entre les différentes sections de l'espace manager.
