# Pages Taxes BSM - Spécifications détaillées

## 1. Page `/bsm-dashboard/taxes`

**Fichier** : `src/app/(bus-station-manager-views)/bsm-dashboard/policies-taxes/page.tsx`

### Description générale
Page de consultation des politiques et taxes de la gare routière. Elle permet au gestionnaire de gare de visualiser les règles en vigueur et les taxes liées aux agences affiliées.

### Fonctionnalités principales
- Affichage d'une liste de politiques et de taxes via le composant `PoliciesAndTaxesList`.
- Séparation des éléments en deux catégories : `Taxe` et `Politique`.
- Affichage des métadonnées : montant, date d'effet, document lié.
- Présentation visuelle des éléments sous forme de cartes avec badges de catégorie.
- Gestion du chargement : affichage du composant `Loader` tant que les données sont en cours de chargement.
- Gestion des erreurs : message d'erreur et bouton "Réessayer" si la récupération des données échoue.

### Composants clés
- `PoliciesAndTaxesList`
- `Loader`
- `AlertCircle`, `RefreshCw`

### State & Hooks utilisés
#### `usePoliciesAndTaxes()`
```typescript
export const usePoliciesAndTaxes = () => {
  const [policiesAndTaxes, setPoliciesAndTaxes] = useState<PolicyAndTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return { policiesAndTaxes, loading, error };
};
```

#### `PolicyAndTax`
```typescript
export interface PolicyAndTax {
  id: string;
  stationId: string;
  title: string;
  description: string;
  category: "Politique" | "Taxe";
  amount: number | null;
  effectiveDate: string;
  documentUrl: string | null;
}
```

### Endpoints API utilisés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/gare/manager/{managerId}` | `GET` | Récupère la gare associée au manager connecté |
| `/politique-et-taxes/gare-routiere/{stationId}` | `GET` | Récupère les politiques et taxes liées à la gare |

### Flux de données
1. `usePoliciesAndTaxes()` récupère l'utilisateur connecté via `useBusStation()`.
2. Appel à `/gare/manager/{managerId}` pour trouver le `stationId`.
3. Appel à `/politique-et-taxes/gare-routiere/{stationId}` pour charger la liste des politiques et taxes.
4. Transmission des données au composant `PoliciesAndTaxesList`.

### Exemple de réponse attendue
```json
[
  {
    "id": "policy-01",
    "stationId": "station-01",
    "title": "Taxe d'exploitation",
    "description": "Taxe mensuelle pour les agences affiliées",
    "category": "Taxe",
    "amount": 50000,
    "effectiveDate": "2026-01-01",
    "documentUrl": null
  },
  {
    "id": "policy-02",
    "stationId": "station-01",
    "title": "Politique de remboursement",
    "description": "Remboursement intégral jusqu'à 24h avant le départ",
    "category": "Politique",
    "amount": null,
    "effectiveDate": "2026-01-01",
    "documentUrl": "https://api.busstation.com/documents/remboursement-policy.pdf"
  }
]
```

### Remarques
- Le code actuel utilise le nom de route `policies-taxes` et non `taxes`.
- Il n'y a pas de mécanisme de création, modification ou suppression implémenté dans le composant existant.

---

## 2. Page `/bsm-dashboard/taxes/[id]`

**Statut** : non implémentée dans l'arborescence actuelle du projet.

### Contexte
Aucun fichier `src/app/(bus-station-manager-views)/bsm-dashboard/taxes/[id]/page.tsx` n'existe.

### Usage attendu
Cette page pourrait afficher le détail d'une taxe ou d'une politique spécifique, avec :
- titre et description complète
- montant et date d'effet
- document officiel
- historique de validation
- actions de modification ou suppression

### Endpoints recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/politique-et-taxes/{id}` | `GET` | Récupère les détails d'une politique ou taxe spécifique |
| `/politique-et-taxes/{id}` | `PUT` | Met à jour une politique ou taxe |
| `/politique-et-taxes/{id}` | `DELETE` | Supprime une politique ou taxe |

---

## 3. Page `/bsm-dashboard/taxes/history`

**Statut** : non implémentée dans l'arborescence actuelle du projet.

### Contexte
Aucun fichier `src/app/(bus-station-manager-views)/bsm-dashboard/taxes/history/page.tsx` n'existe.

### Usage attendu
Cette page pourrait présenter l'historique des paiements de taxes et des changements de politique, par exemple :
- opérations de taxations récentes
- paiements des agences affiliées
- factures et échéances
- statuts des contributions (payé / en retard / en attente)

### Endpoints recommandés
| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/politique-et-taxes/history/gare-routiere/{stationId}` | `GET` | Récupère l'historique des taxes et politiques pour une gare |
| `/politique-et-taxes/history/{id}` | `GET` | Récupère le détail d'une entrée d'historique |
| `/politique-et-taxes/history/{id}/acknowledge` | `POST` | Marque une entrée d'historique comme lue |

---

## Notes de cohérence
- La page existante liée aux taxes se trouve dans `policies-taxes`.
- Les routes `/bsm-dashboard/taxes/[id]` et `/bsm-dashboard/taxes/history` sont bien décrites ici comme non implémentées.
- Si tu préfères, je peux renommer ce document pour refléter `policies-taxes` plutôt que `taxes`.
