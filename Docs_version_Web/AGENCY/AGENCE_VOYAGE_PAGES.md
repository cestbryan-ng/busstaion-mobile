# Agence Voyage - Pages et navigation

Ce document décrit les pages de l'acteur `agence_voyage` dans le projet `busstation2`, avec les routes associées et les pages accessibles depuis chaque page.

> Le dossier principal est `src/app/(agency-views)`.

## 1. Layout agence voyage

- Fichier : `src/app/(agency-views)/layout.tsx`
- Route partagée : toutes les pages de l’espace agence_voyage héritent de ce layout.
- Description : structure globale de l’espace agence, wrapper d’interface et éventuelle barre de navigation/side menu commune.
- Pages accessibles depuis ce layout :
  - `/dashboard`
  - `/dashboard/planning`
  - `/dashboard/trip-planning`
  - `/dashboard/drafts`
  - `/dashboard/marketplace`
  - `/dashboard/marketplace/bookings/[voyageId]`
  - `/dashboard/calendar`
  - `/dashboard/feedback`
  - `/dashboard/resources`
  - `/dashboard/settings`
  - `/dashboard/subscription`

## 2. Layout dashboard agence

- Fichier : `src/app/(agency-views)/dashboard/layout.tsx`
- Route partagée : toutes les pages sous `/dashboard`
- Description : layout spécifique au dashboard agence, gérant la sous-navigation et le rendu des pages du tableau de bord.
- Pages accessibles depuis ce layout :
  - `/dashboard`
  - `/dashboard/planning`
  - `/dashboard/trip-planning`
  - `/dashboard/drafts`
  - `/dashboard/marketplace`
  - `/dashboard/marketplace/bookings/[voyageId]`
  - `/dashboard/calendar`
  - `/dashboard/feedback`
  - `/dashboard/resources`
  - `/dashboard/settings`
  - `/dashboard/subscription`

## 3. Page Tableau de bord

- Fichier : `src/app/(agency-views)/dashboard/page.tsx`
- Route : `/dashboard`
- Description : page principale du dashboard agence, offrant un aperçu de l’activité, des indicateurs et des liens vers les modules opérationnels.
- Pages accessibles depuis cette page :
  - `/dashboard/planning`
  - `/dashboard/trip-planning`
  - `/dashboard/drafts`
  - `/dashboard/marketplace`
  - `/dashboard/calendar`
  - `/dashboard/feedback`
  - `/dashboard/resources`
  - `/dashboard/settings`
  - `/dashboard/subscription`

## 4. Page Planning

- Fichier : `src/app/(agency-views)/dashboard/planning/page.tsx`
- Route : `/dashboard/planning`
- Description : page dédiée à l’organisation des trajets dans le temps, avec une vue de planning et des créneaux de départ.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`
  - `/dashboard/trip-planning`

## 5. Page Création de voyage

- Fichier : `src/app/(agency-views)/dashboard/trip-planning/page.tsx`
- Route : `/dashboard/trip-planning`
- Description : interface de création et paramétrage détaillé d’un nouveau voyage.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`
  - `/dashboard/drafts`

## 6. Page Brouillons

- Fichier : `src/app/(agency-views)/dashboard/drafts/page.tsx`
- Route : `/dashboard/drafts`
- Description : liste des voyages sauvegardés en brouillon, avec possibilité de reprendre l’édition ou de publier.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`
  - `/dashboard/trip-planning`

## 7. Page Place de marché

- Fichier : `src/app/(agency-views)/dashboard/marketplace/page.tsx`
- Route : `/dashboard/marketplace`
- Description : gestion des offres commerciales et des voyages publiés sur la place de marché.
- Pages accessibles depuis cette page :
  - `/dashboard/marketplace/bookings/[voyageId]`
  - Retour vers `/dashboard`

## 8. Page Détail réservation

- Fichier : `src/app/(agency-views)/dashboard/marketplace/bookings/[voyageId]/page.tsx`
- Route : `/dashboard/marketplace/bookings/[voyageId]`
- Description : page de détail d’une réservation ou d’un trajet précis issu du marketplace.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard/marketplace`
  - Retour vers `/dashboard`

## 9. Page Calendrier

- Fichier : `src/app/(agency-views)/dashboard/calendar/page.tsx`
- Route : `/dashboard/calendar`
- Description : vue calendrier centrée sur les disponibilités, les événements et la planification des ressources.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`

## 10. Page Avis

- Fichier : `src/app/(agency-views)/dashboard/feedback/page.tsx`
- Route : `/dashboard/feedback`
- Description : espace de consultation et de gestion des retours clients et des avis.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`

## 11. Page Ressources

- Fichier : `src/app/(agency-views)/dashboard/resources/page.tsx`
- Route : `/dashboard/resources`
- Description : gestion des ressources de l’agence (bus, chauffeurs, gares, équipements, etc.).
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`

## 12. Page Paramètres

- Fichier : `src/app/(agency-views)/dashboard/settings/page.tsx`
- Route : `/dashboard/settings`
- Description : configuration de l’agence, informations générales, préférences et options techniques.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`

## 13. Page Abonnement

- Fichier : `src/app/(agency-views)/dashboard/subscription/page.tsx`
- Route : `/dashboard/subscription`
- Description : gestion du plan d’abonnement et de la facturation de l’agence.
- Pages accessibles depuis cette page :
  - Retour vers `/dashboard`