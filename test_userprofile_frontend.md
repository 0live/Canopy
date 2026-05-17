# Plan d'implémentation des tests — Feature userProfile

## Principes directeurs

Mêmes règles que le plan auth :

- **Pyramide des tests** : beaucoup d'unitaires, moins d'intégration, peu d'E2E
- **Philosophie RTL** : tester le comportement visible par l'utilisateur, pas l'implémentation
- **Mock de frontière** : MSW intercepte au niveau HTTP — pas de mock Axios, pas de mock TanStack Query
- **Ordre** : des dépendances minimales vers les dépendances maximales (schémas → store → hooks → composants)

L'infrastructure (vitest, setup.ts, renderWithProviders, serveur MSW global) est **déjà en place**.
Seul un fichier de handlers propre à la feature est à créer.

---

## Phase 0 — Handlers MSW (feature-level)

### `src/features/userProfile/__tests__/mocks/handlers.ts`

Même pattern que `features/auth/__tests__/mocks/handlers.ts`.
Définit les happy-path par défaut ; chaque test peut surcharger avec `server.use(...)`.

| Endpoint | Méthode | Réponse par défaut |
|---|---|---|
| `/api/users/me` | GET | 200 — `mockUser` |
| `/api/users/:userId` | PATCH | 200 — `mockUser` mis à jour |
| `/api/notifications` | GET | 200 — `{ items: mockNotifications, total: 2 }` |
| `/api/notifications?unread_only=true&limit=100` | GET | 200 — `[mockNotification]` |
| `/api/notifications/read-all` | PATCH | 200 |
| `/api/notifications/bulk-delete` | POST | 200 |
| `/api/database-access/status` | GET | 200 — `mockDbStatus` (non activé) |
| `/api/database-access/activate` | POST | 201 — `{ role_name: "user_42", message: "..." }` |
| `/api/database-access/password` | PATCH | 200 |

**Fixtures à définir dans le fichier :**

```ts
export const mockUser = { id: 1, username: "testuser", email: "test@example.com", roles: [], ... }
export const mockNotification = { id: "n1", type: "INFO", key: null, payload: null, is_read: false, created_at: "..." }
export const mockDbStatus = { has_access: false, is_activated: false, role_name: null }
```

---

## Phase 1 — Schémas Yup

> Fonctions pures, zéro dépendance. Les plus rapides à écrire.

### `src/features/userProfile/__tests__/services/form/profileSchema.test.ts`

| Cas | Comportement attendu |
|---|---|
| username vide | erreur i18n key `usernameRequired` (ou équivalent) |
| username < 5 chars | erreur `usernameMinLength` |
| username avec caractères spéciaux | erreur `usernameInvalidFormat` |
| email invalide | erreur `invalidEmail` |
| password seul (sans confirmPassword) | erreur `confirmPasswordRequired` |
| password < 12 chars | erreur `passwordMinLength` |
| password + confirmPassword qui ne correspondent pas | erreur `passwordsMustMatch` |
| password absent (optionnel) | validation réussie sans erreur sur password |
| tous les champs valides avec password | validation réussie |
| tous les champs valides sans password | validation réussie |

### `src/features/userProfile/__tests__/services/form/dbAccessSchema.test.ts`

| Cas | Comportement attendu |
|---|---|
| password vide | erreur `passwordRequired` |
| password < 12 chars | erreur `passwordMinLength` |
| confirmPassword vide | erreur `confirmPasswordRequired` |
| password et confirmPassword différents | erreur `passwordsMustMatch` |
| les deux champs valides et identiques | validation réussie |

---

## Phase 2 — Store Zustand

### `src/features/userProfile/__tests__/store/notificationStore.test.ts`

| Cas | Comportement attendu |
|---|---|
| état initial | `unreadCount: 0` |
| `setUnreadCount(5)` | `unreadCount: 5` |
| `setUnreadCount(0)` | `unreadCount: 0` |
| `incrementUnreadCount()` depuis 0 | `unreadCount: 1` |
| `incrementUnreadCount()` trois fois | `unreadCount: 3` |
| reset entre les tests | l'état repart à 0 (vérifié par `resetStore`) |

---

## Phase 3 — Hooks

> Utilise `renderHookWithProviders`. MSW gère les réponses HTTP.
> Le store est réinitialisé via `resetStore()` dans l'`afterEach` global.

### `src/features/userProfile/__tests__/hooks/profile/useProfileForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| soumettre avec champs vides | erreurs de validation, pas d'appel PATCH |
| modifier uniquement l'email et soumettre | seul `email` est envoyé dans le payload (buildPayload) |
| modifier uniquement le username et soumettre | seul `username` est envoyé |
| modifier password + confirmPassword valides et soumettre | `password` envoyé, pas d'erreur |
| API PATCH 200 | mutation `onSuccess` appelée, pas d'erreur de formulaire |
| API renvoie `email_exists` (409) | erreur positionnée sur le champ `email` |
| API renvoie `username_exists` (409) | erreur positionnée sur le champ `username` |
| erreur générique (500) | `root.serverError` renseigné |
| pendant la requête | `isPending: true` puis `false` |

### `src/features/userProfile/__tests__/hooks/notifications/useNotifications.test.ts`

| Cas | Comportement attendu |
|---|---|
| état initial | `isLoading: true` |
| après résolution | `notifications` = tableau, `total` correct, `isLoading: false` |
| changement de page via `setPage(2)` | nouvelle requête émise avec `skip` recalculé |
| API 500 | `isError: true` |

### `src/features/userProfile/__tests__/hooks/notifications/useUnreadCount.test.ts`

| Cas | Comportement attendu |
|---|---|
| sans accessToken | requête non émise (hook désactivé) |
| avec accessToken → API renvoie 2 notifs | `unreadCount` du store = 2 |
| avec accessToken → API renvoie tableau vide | `unreadCount` = 0 |

### `src/features/userProfile/__tests__/hooks/notifications/useDeleteNotifications.test.ts`

| Cas | Comportement attendu |
|---|---|
| appel avec liste d'IDs | POST `/notifications/bulk-delete` envoyé |
| API 200 | `onSuccess` callback appelé, cache invalidé |
| toast de succès | `toast.success` appelé (mock `sonner`) |
| API 500 | mutation en état `isError` |

### `src/features/userProfile/__tests__/hooks/notifications/useMarkAllRead.test.ts`

| Cas | Comportement attendu |
|---|---|
| appel de la mutation | PATCH `/notifications/read-all` émis |
| API 200 | `unreadCount` du store = 0 |
| cache `notifications` invalidé | re-fetch déclenché |

### `src/features/userProfile/__tests__/hooks/dbAccess/useDbAccessStatus.test.ts`

| Cas | Comportement attendu |
|---|---|
| sans accessToken | requête non émise |
| avec accessToken → API 200 non activé | `data.is_activated: false` |
| avec accessToken → API 200 activé | `data.is_activated: true`, `data.role_name` renseigné |

### `src/features/userProfile/__tests__/hooks/dbAccess/useActivateForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| soumettre avec password vide | erreur de validation, pas d'appel POST |
| soumettre avec password < 12 chars | erreur de validation |
| password valide → API 201 | `DB_ACCESS.STATUS` et `AUTH.CURRENT_USER` invalidés |
| API renvoie `db_access.*` error | erreur mappée en clé i18n sur `root.serverError` |
| erreur générique | `root.serverError` renseigné |

### `src/features/userProfile/__tests__/hooks/dbAccess/useUpdatePasswordForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| soumettre avec champs invalides | erreurs de validation, pas d'appel PATCH |
| password valide → API 200 | formulaire réinitialisé, toast de succès |
| API 500 | `root.serverError` renseigné |

---

## Phase 4 — Composants (intégration UI)

> Utilise `renderWithProviders` + `userEvent`. Les hooks s'exécutent réellement (non mockés).

### `src/features/userProfile/__tests__/components/profile/ProfilePanel.test.tsx`

| Cas | Comportement attendu |
|---|---|
| rendu initial (chargement) | skeleton ou spinner visible |
| après chargement | champs username et email pré-remplis avec les valeurs de `mockUser` |
| modifier l'email et soumettre | PATCH émis, pas d'erreur visible |
| email déjà utilisé (409) | message d'erreur sous le champ email |
| username déjà utilisé (409) | message d'erreur sous le champ username |
| section password | champ password absent par défaut (optionnel) ou vide |

### `src/features/userProfile/__tests__/components/notifications/UnreadBadge.test.tsx`

> Composant pur — pas de MSW nécessaire.

| Cas | Comportement attendu |
|---|---|
| `count = 0` | rien rendu (retour `null`) |
| `count = 5` | badge avec "5" visible |
| `count = 99` | badge avec "99" visible |
| `count = 100` | badge avec "99+" visible |
| `count = 150` | badge avec "99+" visible |

### `src/features/userProfile/__tests__/components/notifications/NotificationsTable.test.tsx`

> Composant présentationnel — tester avec des props directes (pas de MSW).

| Cas | Comportement attendu |
|---|---|
| rendu avec notifications | une ligne par notification, date et statut affichés |
| notification `is_read: false` | badge "non lu" visible |
| notification `is_read: true` | badge "lu" visible |
| notification de type `INFO` | icône info visible |
| notification de type `ERROR` | icône error visible |
| clic sur checkbox d'une ligne | `onSelectionChange` appelé avec l'ID |
| "select all" coché | toutes les checkboxes cochées |
| notification avec `key: ROLES_CHANGED` | message formaté affiché (rôles traduits) |
| notification avec `key: null` | fallback "New notification" affiché |

### `src/features/userProfile/__tests__/components/notifications/NotificationsPanel.test.tsx`

| Cas | Comportement attendu |
|---|---|
| état initial (chargement) | spinner visible |
| après chargement — aucune notification | message "aucune notification" affiché |
| après chargement — notifications présentes | table visible avec les données |
| sélectionner une notification | bouton "supprimer" devient actif |
| clic "supprimer" | POST `/notifications/bulk-delete` émis, table mise à jour |
| clic "tout marquer comme lu" | PATCH `/notifications/read-all` émis |
| API 500 sur le fetch | message d'erreur affiché |
| pagination — page suivante | nouvelle requête avec `skip` mis à jour |

### `src/features/userProfile/__tests__/components/dbAccess/DbAccessPanel.test.tsx`

| Cas | Comportement attendu |
|---|---|
| état initial (chargement) | spinner visible |
| DB access non activé | formulaire d'activation visible, pas de badge de rôle |
| DB access activé | badge avec `role_name`, formulaire de mise à jour visible, pas d'activation |
| soumettre activation avec password valide | POST émis, panel bascule vers l'état activé |
| soumettre activation — erreur API | message d'erreur affiché sous le formulaire |
| soumettre mise à jour password valide | PATCH émis, toast de succès affiché |
| soumettre mise à jour password invalide | erreur de validation visible, pas d'appel API |

---

## Hors scope (WebSocket)

`useNotificationWebSocket` n'est **pas couvert** dans ce plan.
Les WebSockets nécessitent une infrastructure de mock dédiée (`ws` ou `@mswjs/interceptors`) absente de la stack actuelle. Ce hook sera testé séparément lorsque cette infrastructure sera en place.

---

## Arborescence cible

```
frontend/src/features/userProfile/__tests__/
├── mocks/
│   └── handlers.ts
├── services/form/
│   ├── profileSchema.test.ts
│   └── dbAccessSchema.test.ts
├── store/
│   └── notificationStore.test.ts
├── hooks/
│   ├── profile/
│   │   └── useProfileForm.test.tsx
│   ├── notifications/
│   │   ├── useNotifications.test.ts
│   │   ├── useUnreadCount.test.ts
│   │   ├── useDeleteNotifications.test.ts
│   │   └── useMarkAllRead.test.ts
│   └── dbAccess/
│       ├── useDbAccessStatus.test.ts
│       ├── useActivateForm.test.tsx
│       └── useUpdatePasswordForm.test.tsx
└── components/
    ├── profile/
    │   └── ProfilePanel.test.tsx
    ├── notifications/
    │   ├── UnreadBadge.test.tsx
    │   ├── NotificationsTable.test.tsx
    │   └── NotificationsPanel.test.tsx
    └── dbAccess/
        └── DbAccessPanel.test.tsx
```

**Total : 15 fichiers de tests** (vs 8 pour auth, feature plus riche).
