# Plan d'implémentation des tests — Feature Admin

## Principes directeurs

Mêmes principes que la feature Auth :
- **Pyramide des tests** : unitaires → intégration → composants
- **Philosophie RTL** : tester le comportement utilisateur, pas l'implémentation interne
- **Mock de frontière** : MSW intercepte au niveau HTTP — TanStack Query tourne réellement
- **Réutilisation** : `renderWithProviders`, `renderHookWithProviders`, `resetStore` déjà disponibles
- **Ordre** : route guards → hooks → composants atomiques → composants conteneurs

---

## Phase 0 — Extension de l'infrastructure

> Pas de nouveau fichier de config. Seuls les handlers MSW et les fixtures sont à ajouter.

### 0.1 Étendre `src/test/mocks/handlers.ts`

Ajouter les handlers admin (happy path) :

```ts
// GET /api/users?skip=0&limit=25
http.get('/api/users', () => HttpResponse.json(mockPaginatedUsers))

// DELETE /api/users/:userId
http.delete('/api/users/:userId', () => new HttpResponse(null, { status: 204 }))

// PUT /api/users/:userId/roles
http.put('/api/users/:userId/roles', () => HttpResponse.json(mockAdminUser))
```

### 0.2 Ajouter les fixtures dans `src/test/mocks/handlers.ts`

```ts
export const mockAdminUser: AdminUserSummary = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  roles: [UserRole.USER, UserRole.ADMIN],
  is_verified: true,
}

export const mockRegularUser: AdminUserSummary = {
  id: 2,
  username: 'alice',
  email: 'alice@example.com',
  roles: [UserRole.USER],
  is_verified: true,
}

export const mockPaginatedUsers = {
  items: [mockAdminUser, mockRegularUser],
  total: 2,
  skip: 0,
  limit: 25,
}
```

### 0.3 Étendre `resetStore` dans `renderWithProviders.tsx`

Vérifier que le `QueryClient` est bien vidé entre les tests (déjà le cas avec un client frais par test — rien à faire).

---

## Phase 1 — Route Guards

> Logique pure : pas de composant, pas de réseau. Tests les plus rapides.

### `src/features/admin/__tests__/services/routes/adminLoader.test.ts`

| Cas | Comportement attendu |
|---|---|
| Pas de `accessToken` dans le store | retourne `redirect("/")` |
| `accessToken` présent, rôle `user` uniquement | retourne `redirect("/")` |
| `accessToken` présent, rôle `admin` inclus | retourne `null` (accès autorisé) |

**Patterns :**
- Setter `useAppStore.setState({ accessToken: "tok", ... })` avant chaque cas
- `adminLoader` retourne un objet `Response` (redirect) ou `null` — vérifier `response.headers.get("Location")`
- `resetStore()` dans `afterEach`

---

## Phase 2 — Hooks

> Logique métier : pagination, mutations, gestion des erreurs et effets de bord (toast, invalidation).

### `src/features/admin/__tests__/hooks/users/useAdminUsers.test.ts`

| Cas | Comportement attendu |
|---|---|
| Chargement initial | `isLoading: true` puis `false`, `users` rempli |
| Pagination : changement de page | `setPage(2)` → requête avec `skip=25` |
| Erreur API 500 | `isError: true`, `users` vide |
| Données reçues | `total` et `users` correspondent aux fixtures |

**Patterns :**
- `renderHookWithProviders(() => useAdminUsers())`
- `waitFor(() => expect(result.current.isLoading).toBe(false))`
- Override MSW pour le cas erreur : `server.use(http.get('/api/users', () => new HttpResponse(null, { status: 500 })))`
- Vérifier `result.current.page` après `act(() => result.current.setPage(2))`

---

### `src/features/admin/__tests__/hooks/users/useDeleteUser.test.ts`

| Cas | Comportement attendu |
|---|---|
| Succès (204) | toast de succès affiché, `onSuccess` appelé, cache invalidé |
| Utilisateur introuvable (404) | toast "not found" affiché, `onSuccess` quand même appelé |
| Erreur serveur (500) | toast d'erreur, `onSuccess` non appelé |

**Patterns :**
- `renderHookWithProviders(() => useDeleteUser({ onSuccess: vi.fn() }))`
- `act(() => result.current.mutate(userId))`
- Espionner `toast.success` / `toast.error` (déjà mocké dans `setup.ts`)
- `server.use(...)` pour les cas 404 et 500

---

### `src/features/admin/__tests__/hooks/users/useUpdateUserRoles.test.ts`

| Cas | Comportement attendu |
|---|---|
| Succès | toast de succès, `onSuccess` appelé avec l'utilisateur mis à jour |
| Erreur API (400/500) | toast d'erreur, `onSuccess` non appelé |

**Patterns :**
- `renderHookWithProviders(() => useUpdateUserRoles({ onSuccess: vi.fn() }))`
- `act(() => result.current.mutate({ userId: 2, roles: [UserRole.ADMIN] }))`

---

## Phase 3 — Composants atomiques

> Composants présentateurs sans logique métier. Tests rapides, pas de MSW nécessaire.

### `src/features/admin/__tests__/components/AdminPagination.test.tsx`

| Cas | Comportement attendu |
|---|---|
| Rendu initial (page 1, 50 total, 25/page) | affiche "1 à 25 sur 50", bouton Précédent désactivé |
| Dernière page (page 2) | bouton Suivant désactivé |
| Clic Suivant | `onPageChange` appelé avec `page + 1` |
| Clic Précédent | `onPageChange` appelé avec `page - 1` |
| `isFetching: true` | les deux boutons désactivés |
| Résultats vides (total = 0) | affiche "0 à 0 sur 0", les deux boutons désactivés |

**Patterns :**
- `render(<AdminPagination page={1} pageSize={25} total={50} isFetching={false} onPageChange={vi.fn()} />)`
- Pas de providers nécessaires (composant pur)
- `userEvent.click()` sur les boutons

---

### `src/features/admin/__tests__/components/AdminNav.test.tsx`

| Cas | Comportement attendu |
|---|---|
| Onglet "users" actif | lien "users" a l'attribut `aria-selected` ou classe active |
| Clic sur un onglet | `navigate` vers `/admin/{panel}` |
| Vue mobile | select visible, onglets cachés |
| Changement de select | navigation vers le panel sélectionné |

**Patterns :**
- Nécessite `MemoryRouter` avec `initialEntries={['/admin/users']}`
- Mocker `useNavigate` de react-router-dom

---

### `src/features/admin/__tests__/components/users/UsersTable.test.tsx`

| Cas | Comportement attendu |
|---|---|
| `isLoading: true` | 5 lignes skeleton affichées, pas de données |
| Liste vide (`users: []`) | message "aucun utilisateur" affiché |
| Liste remplie | username, email, rôles (badges), icône vérifié par ligne |
| Utilisateur courant | action "Supprimer" non visible sur sa propre ligne |
| Clic "Modifier les rôles" | `onEditRoles(user)` appelé |
| Clic "Supprimer" | `onDeleteUser(user)` appelé |

**Patterns :**
- Props en entrée : `users`, `isLoading`, `currentUserId`, `onEditRoles`, `onDeleteUser`
- `userEvent.click()` sur le menu Actions pour l'ouvrir avant de cliquer sur l'item

---

## Phase 4 — Composants conteneurs (intégration UI)

> Logique d'état + dialogs + réseau. MSW actif. Tests les plus proches de l'expérience utilisateur.

### `src/features/admin/__tests__/components/users/UserRoleDialog.test.tsx`

| Cas | Comportement attendu |
|---|---|
| Rendu initial | checkboxes pré-cochées selon `user.roles` |
| Décocher un rôle puis sauvegarder | mutation appelée avec les nouveaux rôles, dialog fermé |
| Clic Annuler | `onClose` appelé, pas de mutation |
| Pendant la sauvegarde | bouton "Sauvegarder" désactivé |
| Succès API | toast de succès, `onClose` appelé |
| Erreur API | toast d'erreur, dialog reste ouvert |

**Patterns :**
- `renderWithProviders(<UserRoleDialog user={mockRegularUser} onClose={vi.fn()} />)`
- `userEvent.click()` sur une checkbox pour la décocher
- `server.use(...)` pour simuler une erreur

---

### `src/features/admin/__tests__/components/users/DeleteUserDialog.test.tsx`

| Cas | Comportement attendu |
|---|---|
| Rendu initial | username de l'utilisateur visible dans le message |
| Clic "Confirmer" | mutation `deleteUser` déclenchée |
| Clic "Annuler" | `onClose` appelé, pas de mutation |
| Pendant la suppression | bouton "Confirmer" désactivé |
| Succès (204) | toast succès, `onClose` appelé |
| Utilisateur introuvable (404) | toast "not found", dialog fermé quand même |

---

### `src/features/admin/__tests__/components/users/UsersPanel.test.tsx`

> Test d'intégration principal : tous les sous-composants assemblés avec MSW.

| Cas | Comportement attendu |
|---|---|
| Chargement initial | skeletons affichés puis remplacés par les données |
| Affichage des utilisateurs | tableau avec 2 lignes (fixtures) |
| Pagination visible | "1 à 2 sur 2" affiché |
| Clic "Modifier les rôles" | dialog `UserRoleDialog` s'ouvre avec le bon utilisateur |
| Sauvegarder les rôles → succès | dialog se ferme, toast succès |
| Clic "Supprimer" | dialog `DeleteUserDialog` s'ouvre |
| Confirmer la suppression → succès | dialog se ferme, liste rechargée |
| Erreur de chargement (500) | message d'erreur affiché |
| Utilisateur courant | action "Supprimer" masquée sur sa propre ligne |

**Patterns :**
- `renderWithProviders(<UsersPanel />)` — tous les hooks internes actifs
- Setter `useAppStore.setState({ accessToken: "tok", currentUser: mockAdminUser })` en amont
- `waitFor()` systématique pour les assertions post-réseau
- `server.use(...)` pour les cas d'erreur et de rechargement

---

## Arborescence cible

```
frontend/src/features/admin/__tests__/
├── services/
│   └── routes/
│       └── adminLoader.test.ts
├── hooks/
│   └── users/
│       ├── useAdminUsers.test.ts
│       ├── useDeleteUser.test.ts
│       └── useUpdateUserRoles.test.ts
└── components/
    ├── AdminNav.test.tsx
    ├── AdminPagination.test.tsx
    └── users/
        ├── UsersTable.test.tsx
        ├── UserRoleDialog.test.tsx
        ├── DeleteUserDialog.test.tsx
        └── UsersPanel.test.tsx
```

---

## Récapitulatif des modifications à l'infrastructure existante

| Fichier | Modification |
|---|---|
| `src/test/mocks/handlers.ts` | Ajouter 3 handlers + 3 fixtures (mockAdminUser, mockRegularUser, mockPaginatedUsers) |
| `src/test/setup.ts` | Aucune modification requise |
| `src/test/utils/renderWithProviders.tsx` | Aucune modification requise |

---

## Ordre d'implémentation recommandé

```
Phase 0 → Phase 1 → Phase 2 (useAdminUsers → useDeleteUser → useUpdateUserRoles)
       → Phase 3 (AdminPagination → UsersTable → AdminNav)
       → Phase 4 (UserRoleDialog → DeleteUserDialog → UsersPanel)
```

Les phases 2 et 3 sont indépendantes et peuvent être développées en parallèle.
