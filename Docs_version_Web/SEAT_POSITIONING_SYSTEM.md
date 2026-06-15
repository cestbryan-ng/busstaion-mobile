# Système de Positionnement des Places dans le Bus

Documentation complète du système de gestion des places et du positionnement des sièges dans l'application BusStation.

---

## 1. Vue d'ensemble du système

Le système de positionnement des places gère la disposition physique des sièges dans le bus, leur statut (disponible, occupé, réservé), et permet aux utilisateurs de sélectionner leurs places en temps réel via WebSocket.

### Composants principaux
- **Hook `useSeatManager`** : Logique centrale de gestion des places
- **Composants de disposition** : `Bus56SeatsDisposition`, `Bus70SeatsDisposition`, `Bus75SeatsDisposition`, `Bus80SeatsDisposition`
- **WebSocket (STOMP)** : Communication en temps réel des changements de places
- **Coloration visuelle** : Code couleur pour les états des places

---

## 2. Architecture du système de sièges

### 2.1 Hook `useSeatManager`

**Fichier** : `src/lib/hooks/market-place/useSeatManager.ts`

Le hook gère :
- La sélection des places par l'utilisateur
- La synchronisation en temps réel via WebSocket
- Les trois états de place : libre, sélectionnée, réservée/occupée
- La déconnexion automatique et libération des places

```typescript
export function useSeatManager(tripId?: string) {
  // États des places
  - selectedSeats: number[] // Places sélectionnées par l'utilisateur actuel
  - temporaryReservedSeats: number[] // Places réservées par d'autres utilisateurs
  - permanentOccupiedSeats: number[] // Places définitivement occupées du voyage
  
  // État de connexion WebSocket
  - isConnecting: boolean
  - isConnected: boolean
  
  // Méthodes
  - handleSeatClick(seatNumber: number): void
  - getSeatClass(seatNumber: number): string
  - setPermanentOccupiedSeats(seats: number[]): void
  - releaseAllSeats(): void (cleanup)
}
```

### 2.2 États des places

#### Quatre états possibles pour chaque place :

| État | CSS Classes | Description |
|------|------------|-------------|
| **Disponible** | `border-gray-400 bg-gray-200 cursor-pointer hover:bg-gray-300` | Place libre et cliquable |
| **Sélectionnée** | `border-green-500 bg-green-300 cursor-pointer hover:bg-green-400` | Sélectionnée par l'utilisateur actuel |
| **Réservée (temporaire)** | `border-orange-500 bg-orange-300 cursor-not-allowed` | Réservée par un autre utilisateur en temps réel |
| **Occupée (permanente)** | `border-red-600 bg-red-400 cursor-not-allowed opacity-90` | Occupée/confirmée dans le voyage |

### 2.3 Types de bus supportés

Quatre configurations de bus supportées :

| Bus | Places | Configuration | Fichier |
|-----|--------|--------------|---------|
| **Bus 56 places** | 56 | 2 rangées + sections spéciales (portes, toilettes) | `Bus56SeatsDisposition.jsx` |
| **Bus 70 places** | 70 | 3 colonnes + sections spéciales | `Bus70SeatsDisposition.jsx` |
| **Bus 75 places** | 75 | 3 colonnes + sections spéciales | `Bus75SeatsDisposition.jsx` |
| **Bus 80 places** | 80 | 3 colonnes + sections spéciales | `Bus80SeatsDisposition.jsx` |

---

## 3. Configurations détaillées par type de bus

### 3.1 Bus 56 places

```
CONFIGURATION :
- Première rangée (30 places) : 2 colonnes
  Places 1-30 : Grille 2x15
  
- Deuxième rangée (26 places) : Sections spéciales
  Places 31-34 : Sièges standard (2 colonnes, 2 lignes)
  Places 35-36 : Toilettes (non cliquables)
  Places 37-38 : Portes (non cliquables)
  Places 39-56 : Sièges standard (2 colonnes, 9 lignes)

DIAGRAMME (Vue de haut) :
                [Driver]
    [1-30]              [31-34]
    (2x15)              [Toilettes]
                        [Portes]
                        [39-56]
```

**Logique de numérotation** :
```typescript
// Première rangée
Range 1: seats 1-30

// Deuxième rangée (avant portes et toilettes)
Range 2 Section 1:
  - index 0-11 → seats 31-42
  - Toilet check: seat === 35 || seat === 36
  - Door check: seat === 37 || seat === 38

Range 2 Section 2:
  - index 0-19 → seats 39-58
  - Door check: seat === 49 || seat === 50
```

### 3.2 Bus 70 places

```
CONFIGURATION :
- Première rangée (42 places) : 3 colonnes
  Places 1-42 : Grille 3x14
  
- Deuxième rangée (26 places) : Sections avec portes
  Places 43-54 : Sièges + portes (2 colonnes)
  Places 55-68 : Sièges + portes (2 colonnes)
  
- Dernier banc (6 places) : 1 rangée
  Places 65-70 : Grille 1x6

DIAGRAMME :
                [Driver]
    [1-42]              [43-54]
    (3x14)              [Portes]
                        [55-68]
                        [Dernier banc]
                        [65-70]
```

### 3.3 Bus 75 places

```
CONFIGURATION :
- Première rangée (45 places) : 3 colonnes
  Places 1-45 : Grille 3x15
  
- Deuxième rangée (24 places) : Sections avec portes
  Places 46-57 : Sièges + portes
  Places 56-71 : Sièges + portes
  
- Dernier banc (6 places) : 1 rangée
  Places 72-77 : Grille 1x6
```

### 3.4 Bus 80 places

```
CONFIGURATION :
- Première rangée (48 places) : 3 colonnes
  Places 1-48 : Grille 3x16
  
- Deuxième rangée (26 places) : Sections avec portes
  Places 49-60 : Sièges + portes
  Places 59-76 : Sièges + portes
  
- Dernier banc (6 places) : 1 rangée
  Places 77-82 : Grille 1x6
```

---

## 4. Système WebSocket en temps réel

### 4.1 Architecture WebSocket

Le système utilise **SockJS + STOMP** pour la communication en temps réel :

```typescript
// Configuration WebSocket
webSocketFactory: () => new SockJS("https://agence-voyage.ddns.net/api/ws")

// Heartbeat
heartbeatIncoming: 4000 // ms
heartbeatOutgoing: 4000 // ms

// Reconnexion
reconnectDelay: 5000 // ms
maxRetries: 3
```

### 4.2 Topics et destinations

#### Abonnement (Subscribe)
```
/topic/voyage.{tripId}

Reçoit les mises à jour de places :
{
  "placeNumber": 15,
  "status": "RESERVED" | "FREE"
}
```

#### Notification (Publish)
```
/app/voyage/{tripId}/reserver

Envoie les actions de l'utilisateur :
{
  "placeNumber": 15,
  "status": "RESERVED" | "FREE"
}
```

#### Demande d'état initial
```
/app/voyage/{tripId}/get-state

Récupère l'état complet des places du voyage
```

### 4.3 Flux de synchronisation

```
1. Connexion WebSocket
   ↓
2. Subscribe à /topic/voyage.{tripId}
   ↓
3. Demande état initial → /app/voyage/{tripId}/get-state
   ↓
4. Réception updates → Sync avec serveur
   ↓
5. Affichage places colorées (3 états)
   ↓
6. Utilisateur clique sur place
   ↓
7. Publish message → /app/voyage/{tripId}/reserver
   ↓
8. Broadcast aux autres utilisateurs
   ↓
9. Mise à jour visuelle en temps réel
```

### 4.4 Indicateur de connexion

Le composant affiche l'état de connexion WebSocket :

```typescript
// En ligne (connexion active)
<div className="flex items-center gap-2 text-green-600 text-sm">
  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
  <span>En ligne</span>
</div>

// En connexion
<div className="flex items-center gap-2 text-blue-600 text-sm">
  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
  <span>Connexion...</span>
</div>

// Reconnexion (après déconnexion)
<div className="flex items-center gap-2 text-orange-600 text-sm">
  <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
  <span>Reconnexion...</span>
</div>
```

---

## 5. Interaction utilisateur

### 5.1 Sélection de place

```
Utilisateur clique sur place disponible
         ↓
Place passe à l'état "Sélectionnée" (vert)
         ↓
Publication WebSocket : placeNumber + status='RESERVED'
         ↓
Autre utilisateur reçoit update (couleur orange)
         ↓
userA peut déclicker pour désélectionner
         ↓
Publication WebSocket : placeNumber + status='FREE'
         ↓
Autre utilisateur voit place redevenir grise
```

### 5.2 Sélection multiple

L'utilisateur peut sélectionner plusieurs places :

```typescript
// Flux de sélection multiple
[1] Clic sur place 5 → selectedSeats = [5]
    ↓
[2] Clic sur place 8 → selectedSeats = [5, 8]
    ↓
[3] Clic sur place 12 → selectedSeats = [5, 8, 12]
    ↓
[4] Clic sur place 8 (déselect) → selectedSeats = [5, 12]
    ↓
[5] Confirmation réservation avec selectedSeats = [5, 12]
```

### 5.3 Libération des places

Quand l'utilisateur quitte la page ou ferme le navigateur :

```typescript
const releaseAllSeats = useCallback(() => {
  // Pour chaque place sélectionnée
  mySelectedSeats.current.forEach(seatNumber => {
    // Publier status='FREE' pour chaque place
    client.publish({
      destination: `/app/voyage/${tripId}/reserver`,
      body: JSON.stringify({ placeNumber: seatNumber, status: 'FREE' })
    });
  });
  
  // Cleanup local state
  setSelectedSeats([]);
  mySelectedSeats.current = [];
}, [tripId]);

// Appelé au cleanup du component
useEffect(() => {
  return () => {
    releaseAllSeats();
  };
}, [releaseAllSeats]);
```

---

## 6. Composants de disposition

### 6.1 Structure générale

Tous les composants de disposition suivent ce pattern :

```typescript
export default function BusXXSeatsDisposition({setSeats, _reservedSeats, tripId}) {
  // 1. Récupérer le hook avec la logique
  const {
    selectedSeats,
    temporaryReservedSeats,
    permanentOccupiedSeats,
    handleSeatClick,
    getSeatClass,
    setPermanentOccupiedSeats
  } = useSeatManager(tripId);

  // 2. Initialiser places permanentes au mount
  useEffect(() => {
    if (_reservedSeats && _reservedSeats.length > 0) {
      setPermanentOccupiedSeats(_reservedSeats);
    }
  }, [_reservedSeats, setPermanentOccupiedSeats]);

  // 3. Notifier le parent des places sélectionnées
  useEffect(() => {
    setSeats(selectedSeats);
  }, [selectedSeats, setSeats]);

  // 4. Rendu de la grille
  return (
    <div className="p-5">
      {/* Indicateur de connexion WebSocket */}
      {/* Grille de places */}
      {/* Sections spéciales (portes, toilettes) */}
    </div>
  );
}
```

### 6.2 Props attendues

```typescript
interface BusDispositionProps {
  setSeats: (seats: number[]) => void  // Callback pour notifier le parent
  _reservedSeats: number[]              // Places déjà réservées (du voyage)
  tripId: string                        // ID du voyage pour WebSocket
}
```

### 6.3 Rendu des places

```typescript
// Boucle standard
{Array.from({length: 30}, (_, index) => {
  const seatNumber = index + 1;
  const isDisabled = permanentOccupiedSeats.includes(seatNumber) || 
                     temporaryReservedSeats.includes(seatNumber);

  return (
    <button
      key={index}
      onClick={() => handleSeatClick(seatNumber)}
      disabled={isDisabled}
      className={getSeatClass(seatNumber)}
      title={
        permanentOccupiedSeats.includes(seatNumber) ? "Place occupée" :
        temporaryReservedSeats.includes(seatNumber) ? "Réservée par un autre utilisateur" :
        selectedSeats.includes(seatNumber) ? "Sélectionnée (cliquez pour désélectionner)" :
        "Disponible (cliquez pour sélectionner)"
      }
    >
      {seatNumber}
    </button>
  );
})}
```

### 6.4 Sections spéciales (portes, toilettes)

```typescript
// Exemple : Porte ou Toilette
{Array.from({length: 12}, (_, index) => {
  const seatNumber = index + 31;
  const isDoor = seatNumber === 37 || seatNumber === 38;
  const isToilet = seatNumber === 35 || seatNumber === 36;
  
  // Affichage spécial non cliquable
  const isSpecial = isDoor || isToilet;
  
  return (
    <button
      disabled={isSpecial}
      onClick={() => !isSpecial && handleSeatClick(seatNumber)}
      className={`${
        isSpecial 
          ? "lg:w-12 lg:h-12 w-10 h-10 border-2 border-gray-300 rounded-lg bg-gray-100 text-xs font-bold text-gray-500" 
          : getSeatClass(seatNumber)
      }`}
    >
      {isDoor ? "Porte" : isToilet ? "Toilette" : seatNumber}
    </button>
  );
})}
```

---

## 7. Intégration avec la modal de réservation

### 7.1 Flux de réservation

```
Page `/market-place/trip/[idVoyage]`
         ↓
Clic "Book This Trip"
         ↓
Ouverture `ReservationProcessModal`
         ↓
Affichage `Bus[XX]SeatsDisposition` avec tripId
         ↓
Utilisateur sélectionne places
         ↓
Confirmation sélection
         ↓
selectedSeats envoyés à la réservation
         ↓
Création réservation avec les places
```

### 7.2 Communication parent-enfant

```typescript
// Dans ReservationProcessModal
const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

<Bus56SeatsDisposition 
  setSeats={setSelectedSeats}           // Callback pour recevoir les places
  _reservedSeats={reservedSeats}        // Places occupées du voyage
  tripId={tripId}                       // ID pour WebSocket
/>

// selectedSeats maintient la liste mise à jour des places sélectionnées
```

---

## 8. Gestion des erreurs et cas limites

### 8.1 Déconnexion WebSocket

**Comportement** : 
- Tentatives de reconnexion automatique (max 3)
- Délai entre tentatives : 2s × numéro tentative
- Après 3 échecs : affichage d'erreur

```typescript
const handleReconnection = () => {
  if (connectionRetries.current < maxRetries) {
    connectionRetries.current++;
    setTimeout(() => {
      setIsConnecting(true);
      connectWebSocket();
    }, 2000 * connectionRetries.current);
  } else {
    console.error('Échec de la connexion WebSocket après plusieurs tentatives');
    setIsConnecting(false);
  }
};
```

### 8.2 Place occupée par permanent

Si une place devient permanente (autre utilisateur confirme réservation) :
```
1. Update reçue via WebSocket
2. Place passe de orange (temporaire) à rouge (permanent)
3. Impossible à cliquer / désactiver
4. Si l'utilisateur l'avait sélectionnée, elle reste verte mais un système
   d'alerte devrait le notifier (non implémenté actuellement)
```

### 8.3 Quitter sans confirmation

```
Utilisateur sélectionne places
         ↓
Quitte la page sans confirmer
         ↓
useEffect cleanup déclenché
         ↓
releaseAllSeats() appelé
         ↓
Toutes les places libérées (status='FREE')
         ↓
Autres utilisateurs voient places redevenir disponibles
```

---

## 9. Styles Tailwind CSS appliqués

### 9.1 Classes de place

```typescript
// Dimension
lg:w-12 lg:h-12  // Large : 48x48px
w-10 h-10        // Mobile : 40x40px

// Bordure et couleur (par état)
border-2 rounded-lg transition-all duration-200

// Disponible
border-gray-400 bg-gray-200 cursor-pointer hover:bg-gray-300

// Sélectionnée
border-green-500 bg-green-300 cursor-pointer hover:bg-green-400

// Réservée (autre)
border-orange-500 bg-orange-300 cursor-not-allowed

// Occupée
border-red-600 bg-red-400 cursor-not-allowed opacity-90
```

### 9.2 Responsive

Les grilles s'adaptent à l'écran :
```
mobile    : gap-8   w-10 h-10
tablet    : gap-4   w-10 h-10
desktop   : gap-2   lg:w-12 lg:h-12
```

---

## 10. Flux complet d'exemple

### Scénario : Deux utilisateurs A et B réservent des places

```
T0: UserA ouvre le voyage
    ├─ Connexion WebSocket UserA
    └─ État initial : [1-10 occupées, 11-50 libres]

T1: UserA clique place 15
    ├─ Publique /app/voyage/123/reserver {placeNumber: 15, status: 'RESERVED'}
    ├─ UserA : place 15 verte
    └─ UserB : place 15 orange

T2: UserB clique place 12
    ├─ Publie /app/voyage/123/reserver {placeNumber: 12, status: 'RESERVED'}
    ├─ UserB : place 12 verte
    └─ UserA : place 12 orange

T3: UserA clique place 15 (désélect)
    ├─ Publie /app/voyage/123/reserver {placeNumber: 15, status: 'FREE'}
    ├─ UserA : place 15 grise
    └─ UserB : place 15 grise

T4: UserB réserve finalement places [12, 20]
    ├─ Appel API POST /reservation
    ├─ Backend place 12 et 20 passent à permanent (occupées)
    └─ Autres utilisateurs voient places 12, 20 rouges

T5: UserA quitte le navigateur
    ├─ Cleanup useEffect déclenché
    ├─ releaseAllSeats() appelé
    └─ Aucune place sélectionnée donc pas d'action

T6: UserC ouvre le voyage
    ├─ État initial : [1-11 occupées, 12-20 occupées (UserB), 21-50 libres]
    └─ Affichage correct des 22 places réservées
```

---

## 11. Optimisations et bonnes pratiques

### 11.1 Performance

- **Virtualisation** : Pas de virtualisation actuellement (max 80 places acceptable)
- **Re-renders** : Hook useMemo pour éviter les calculs inutiles sur getSeatClass
- **WebSocket** : Throttling des updates pour éviter trop d'écrans

### 11.2 Accessibilité

- **Tooltips** : Title attribute sur les buttons
- **États visuels** : Couleurs + curseurs distincts
- **Aria-disabled** : Pas implémenté, recommandé pour lecteur d'écran

### 11.3 Sécurité

- **Validation serveur** : La réservation doit être validée côté serveur
- **WebSocket** : Authentification via token localStorage
- **Limitation** : Pas de limite de places sélectionnables côté client (à implémenter)

---

## 12. TODO et améliorations futures

- [ ] Virtualisation pour très grands bus (150+ places)
- [ ] Limitation du nombre de places sélectionnables
- [ ] Animation lors du changement d'état
- [ ] Son de notification pour les changements
- [ ] Export PDF avec plan des places sélectionnées
- [ ] Mode sombre pour l'interface des places
- [ ] Historique des places sélectionnées
- [ ] Persistance des sélections en local storage
