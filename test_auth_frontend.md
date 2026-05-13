# Plan d'implémentation des tests — Feature Auth

## Principes directeurs

- **Pyramide des tests** : beaucoup d'unitaires, moins d'intégration, peu d'E2E
- **Philosophie RTL** : tester le comportement visible par l'utilisateur, pas l'implémentation
- **Mock de frontière** : MSW intercepte au niveau HTTP — pas de mock Axios, pas de mock TanStack Query
- **Ordre** : des dépendances minimales vers les dépendances maximales (schémas → store → hooks → composants)

---

## Phase 0 — Infrastructure

### 0.1 Dépendances à installer

```bash
@testing-library/user-event   # interactions réalistes (frappe, clic)
@testing-library/jest-dom     # matchers expressifs (toBeInTheDocument, etc.)
msw                           # mock réseau au niveau HTTP
jsdom                         # environnement DOM pour Vitest
```

### 0.2 `vitest.config.ts` (racine de `/frontend`)

Configurera : environnement `jsdom`, résolution des alias `@/`, fichier de setup, inclusion des fichiers `*.test.ts(x)`.

### 0.3 `src/test/setup.ts`

Exécuté avant chaque suite de tests. Contiendra :
- Import des matchers `@testing-library/jest-dom`
- Démarrage/réinitialisation/arrêt du serveur MSW
- Mock du web component `altcha-widget` (non disponible dans jsdom)
- Mock de `sonner` (toasts — effets de bord non pertinents dans les tests)

### 0.4 `src/test/utils/renderWithProviders.tsx`

Utilitaire `renderWithProviders(ui)` wrappant chaque composant avec :
- Un `QueryClient` frais (staleTime: 0, retry: false)
- Le provider i18n en mode test (retourne la clé de traduction telle quelle)
- Reset du store Zustand entre les tests

### 0.5 `src/test/mocks/handlers.ts`

Handlers MSW définissant les réponses HTTP par défaut (happy path) :
- `POST /api/auth/login` → 200 avec token
- `POST /api/auth/register` → 201
- `GET /api/users/me` → 200 avec utilisateur fictif

### 0.6 `src/test/mocks/server.ts`

Serveur MSW Node pour Vitest. Expose `server` avec `use()` pour surcharger les handlers dans un test spécifique (cas d'erreur, scénarios alternatifs).

---

## Phase 1 — Schémas Yup

> Fonctions pures, zéro dépendance. Les plus rapides à écrire et à exécuter.

### `src/features/auth/__tests__/services/form/loginSchema.test.ts`

| Cas | Comportement attendu |
|---|---|
| username vide | erreur `requiredUsername` |
| password vide | erreur `requiredPassword` |
| les deux remplis | validation réussie |

### `src/features/auth/__tests__/services/form/registerSchema.test.ts`

| Cas | Comportement attendu |
|---|---|
| email invalide | erreur `invalidEmail` |
| username < 5 chars | erreur `usernameMinLength` |
| username avec caractères spéciaux | erreur `usernameInvalidFormat` |
| password < 12 chars | erreur `passwordMinLength` |
| altcha_payload vide | erreur `captchaRequired` |
| tous les champs valides | validation réussie |

---

## Phase 2 — Store Zustand

> Tester les mutations d'état et les effets de bord sur `localStorage`.

### `src/features/auth/__tests__/store/authStore.test.ts`

| Cas | Comportement attendu |
|---|---|
| état initial sans localStorage | `accessToken: null`, `isLoading: false` |
| état initial avec `hasAuthSession: true` | `isLoading: true` |
| `setAccessToken(token)` | `accessToken` mis à jour, clé écrite dans localStorage |
| `clearAuth()` | `accessToken: null`, `isLoading: false`, clé localStorage supprimée |
| `setVerifyingStatus("success")` | `verifyingStatus: "success"` |

---

## Phase 3 — Hooks

> Logique métier : validation, gestion des erreurs API, mutations TanStack Query.
> Utilise `renderHook` de RTL. MSW gère les réponses HTTP.

### `src/features/auth/__tests__/hooks/useLoginForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| soumettre avec champs vides | erreurs de validation, pas d'appel API |
| soumettre valide → API 200 | callback `onSuccess` appelé, pas d'erreur |
| credentials invalides → API 401 | `root.serverError` = `auth.loginError` |
| erreur serveur → API 500 | `root.serverError` = `auth.genericError` |
| pendant la requête | `isPending: true` puis `false` |

### `src/features/auth/__tests__/hooks/useRegisterForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| soumettre avec champs vides | erreurs de validation, pas d'appel API |
| soumettre valide → API 201 | toast affiché, `isSuccess: true` |
| API renvoie `email_exists` | erreur sur le champ `email` |
| API renvoie `username_exists` | erreur sur le champ `username` |
| erreur générique | `root.serverError` affiché |

---

## Phase 4 — Composants (intégration UI)

> Tester ce que l'utilisateur voit et fait.
> Utilise `render` + `userEvent`. Les hooks tournent réellement (pas mockés), MSW gère l'API.

### `src/features/auth/__tests__/components/LoginForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| rendu initial | champs username/password visibles, bouton "Se connecter" |
| soumettre vide | messages d'erreur sous chaque champ |
| remplir et soumettre valide | bouton disabled pendant chargement, `onSuccess` appelé |
| credentials incorrects | message d'erreur serveur affiché |
| `onForgotPassword` fourni | lien "Mot de passe oublié" visible et cliquable |
| `onForgotPassword` absent | lien non affiché |

### `src/features/auth/__tests__/components/RegisterForm.test.tsx`

| Cas | Comportement attendu |
|---|---|
| rendu initial | champs email/username/password et CAPTCHA visibles |
| soumettre vide | erreurs de validation sur chaque champ |
| email déjà utilisé → API 409 | erreur sous le champ email uniquement |
| username déjà utilisé → API 409 | erreur sous le champ username uniquement |
| inscription réussie | formulaire remplacé par le message de succès |

---

## Arborescence cible

```
frontend/
├── vitest.config.ts
└── src/
    ├── test/
    │   ├── setup.ts
    │   ├── utils/
    │   │   └── renderWithProviders.tsx
    │   └── mocks/
    │       ├── handlers.ts
    │       └── server.ts
    └── features/auth/__tests__/
        ├── services/form/
        │   ├── loginSchema.test.ts
        │   └── registerSchema.test.ts
        ├── store/
        │   └── authStore.test.ts
        ├── hooks/
        │   ├── useLoginForm.test.tsx
        │   └── useRegisterForm.test.tsx
        └── components/
            ├── LoginForm.test.tsx
            └── RegisterForm.test.tsx
```
