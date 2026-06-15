# Customer View - Pages et navigation

Ce document décrit les pages de l'acteur `customer` dans le projet `busstation2`, avec les routes associées et les pages accessibles depuis chaque page.

> Le dossier principal est `src/app/(customer-view)`.

## 1. Layout client

- Fichier : `src/app/(customer-view)/layout.tsx`
- Route partagée : toutes les pages du customer-view héritent de ce layout.
- Description : barre latérale, barre de navigation, zone principale de rendu et footer.
- Pages accessibles depuis ce layout :
  - `/market-place`
  - `/gares-routieres`
  - `/agency`
  - `/my-reservations`
  - `/coupons`
  - `/history/reservation`
  - `/history/cancellation`

## 2. Page des agences

- Fichier : `src/app/(customer-view)/agency/page.tsx`
- Route : `/agency`
- Description : liste et recherche des agences partenaires.
- Pages accessibles depuis cette page :
  - `/agency/[agencyId]` (détail d'une agence)

## 3. Page détail agence

- Fichier : `src/app/(customer-view)/agency/[agencyId]/page.tsx`
- Route : `/agency/[agencyId]`
- Description : profil détaillé d'une agence et voyages associés.
- Pages accessibles depuis cette page :
  - Retour vers `/agency`

## 4. Page des coupons

- Fichier : `src/app/(customer-view)/coupons/page.tsx`
- Route : `/coupons`
- Description : gestion des coupons client, filtres par statut, téléchargement PDF.
- Pages accessibles depuis cette page :
  - Aucun sous-chemin de route interne géré directement

## 5. Page des gares routières

- Fichier : `src/app/(customer-view)/gares-routieres/page.tsx`
- Route : `/gares-routieres`
- Description : liste des gares, recherche par ville/nom et filtres de services.
- Pages accessibles depuis cette page :
  - `/gares-routieres/[id]` (détail d'une gare)

## 6. Page détail gare

- Fichier : `src/app/(customer-view)/gares-routieres/[id]/page.tsx`
- Route : `/gares-routieres/[id]`
- Description : fiche détaillée d'une gare routière.
- Pages accessibles depuis cette page :
  - Retour vers `/gares-routieres`

## 7. Page du marketplace

- Fichier : `src/app/(customer-view)/market-place/page.tsx`
- Route : `/market-place`
- Description : catalogue de voyages, recherche, filtres et grille de trajets.
- Pages accessibles depuis cette page :
  - `/market-place/trip/[idVoyage]` (détail d'un voyage)

## 8. Page des réservations client

- Fichier : `src/app/(customer-view)/my-reservations/page.tsx`
- Route : `/my-reservations`
- Description : liste des réservations, affichage grid/liste, paiement et annulation.
- Pages accessibles depuis cette page :
  - `/my-reservations/reservation-details/[reservationId]` (détail réservation)
  - `/market-place` (navigation vers le marché depuis le bouton de découverte)

## 9. Page détail réservation

- Fichier : `src/app/(customer-view)/my-reservations/reservation-details/[reservationId]/page.tsx`
- Route : `/my-reservations/reservation-details/[reservationId]`
- Description : récapitulatif de la réservation, détails de voyage et modale d'annulation.
- Pages accessibles depuis cette page :
  - Retour précédent (`router.back()`)

## 10. Historique des réservations

- Fichier : `src/app/(customer-view)/history/reservation/page.tsx`
- Route : `/history/reservation`
- Description : historique des voyages réservés, recherche, filtres et téléchargement de billet.
- Pages accessibles depuis cette page :
  - Détail interne via modal (pas de route distincte)

## 11. Historique des annulations

- Fichier : `src/app/(customer-view)/history/cancellation/page.tsx`
- Route : `/history/cancellation`
- Description : historique des annulations, filtre par initiateur et consultation des détails.
- Pages accessibles depuis cette page :
  - Détail interne via modal (pas de route distincte)

## 12. Page profil client

- Fichier : `src/app/(customer-view)/profil/page.tsx`
- Route : `/profil`
- Description : gestion du compte utilisateur, affichage des informations personnelles et modales de modification.
- Pages accessibles depuis cette page :
  - Aucun sous-chemin de route interne géré directement
  - Redirection vers `/login` si l'utilisateur n'est pas authentifié

## 13. Page publique du profil utilisateur

- Fichier : `src/app/(customer-view)/user-profile/user-profile/page.tsx`
- Route : `/user-profile`
- Description : vue publique ou visiteur du profil utilisateur, résumé et statistiques.
- Pages accessibles depuis cette page :
  - `/profil`

## 14. Sidebar customer

- Fichier principal : `src/components/layouts/customer-sibebar/clientNavLink.ts`
- Liens exposés :
  - `Market Place` → `/market-place`
  - `Gares Routières` → `/gares-routieres`
  - `Agences` → `/agency`
  - `My reservations` → `/my-reservations`
  - `Coupons` → `/coupons`
  - `History > Reservation` → `/history/reservation`
  - `History > Cancellation` → `/history/cancellation`

## Résumé des routes customer

- `/agency`
- `/agency/[agencyId]`
- `/coupons`
- `/gares-routieres`
- `/gares-routieres/[id]`
- `/market-place`
- `/market-place/trip/[idVoyage]`
- `/my-reservations`
- `/my-reservations/reservation-details/[reservationId]`
- `/history/reservation`
- `/history/cancellation`
- `/profil`
- `/user-profile`
