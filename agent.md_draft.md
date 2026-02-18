# 1. Principes de Design (Senior Level)

**Le code est lu 10× plus souvent qu’il n’est écrit.**

- **Lisibilité :** Un code senior est un code qui se lit comme une phrase. Pas de fonctions de plus de 20 lignes. **Pas de commentaires évidents** ("# définit x" ou "ceci fait cela"), mais des commentaires sur le "Pourquoi". Toujours commenter le code en anglais. Les noms de fonctions et de variables doivent permettre de limiter les commentaires.
- **Complexité** : Toujours préférer une solution claire à une solution “maligne” et une abstraction tardive à une abstraction prématurée.
- **Clean Code**:
  - Meaningful Names: Un nom (variable, fonction, classe) doit révéler son intention.
  - Le principe de responsabilité unique (SRP) : Une fonction ne doit faire qu'une seule chose et le faire bien.
  - Don't Repeat Yourself (DRY): Abstraire la logique commune dans une fonction ou une classe réutilisable. **Toujours vérifier que le code produit ne fait pas doublon avec du code existant et refactoriser si besoin**.
    Dès qu'une valeur (ex: schema="app_data" ou verification_token = secrets.token_urlsafe(32)) fait partie d'une liste, ou bien qu'elle est partagée à plusieurs endroits dans la codebase, utiliser des enums pour stocker et partager les valeurs.
- **You Ain't Gonna Need It (YAGNI)**:
  - Ne pas coder de fonctionnalités qui ne sont pas nécessaires à l'instant T.
  - Ne pas faire de modifications qui ne sont pas directement en lien avec ce qui est demandé (**Important!**). On ne casse pas ce qui marche tant que ce n'est pas demandé ou nécessaire pour accomplir ce qui est demandé.
- **SOLID**: Respecter les règles de conception SOLID pour la programmation objet

# 2. Backend - Fastapi

## 2.1. Structure du Projet (Separation of Concerns)

**Stack**: FastAPI + SQLModel + PostgreSQL + Alembic + TestContainers

Ce projet doit implémenter les principes de Clean Architecture et de séparation des responsabilités

- Le dossier **api/app/core** contient tout ce qui est commun à plusieurs modules ou réutilisé dans plusieurs endroits de l'application
- Le dossier **api/app/module** est inspiré du Domain Driven Design en version simplifiée, chaque module est indépendant des autres et représente une entité métier.
- Chaque module implémente le **Repository Pattern**:
  - La route délègue la logique métier au Service Layer
  - le **Service Layer** délègue l'interaction avec les données au **Repository**. Les erreurs sont gérées par les services, le Repository se contente des opérations SQL.
  - UOW: Les opérations de commit/rollback sont centralisées dans le gestionnaire de session Asyncio, les services gèrent la logique métier, flush les opérations du repository et lèvent des exceptions en cas d'erreur.
  - Les **schemas** implémentent la logique **Pydantic** et **models** les tables avec **SQLModel**

```
modules/<domain>/
  endpoints.py     # FastAPI routes + dependency injection
  models.py        # SQLModel definitions
  schemas.py       # Pydantic request/response
  repository.py    # Database access
  service.py       # Business logic
```

- Idéalement les modules ne doivent pas communiquer entre eux. Si cela est nécessaire pour garder un code clair et simple, privilégier la communication via les Service Layers, un Service ne doit pas avoir accès au Repository d'un autre module. Et deux Repository ne doivent jamais communiquer entre eux.
- Si plusieurs modules implémentent la même logique, le noter et recommander de faire une refactorisation . **Ne jamais refactoriser du code qui n'est pas directement concerné par la tache qui est demandé à l'agent**.

## 2.2 Directives de Développement

- Async/await requis : Toutes les opérations de base de données doivent être asynchrones. Utilisez async def, await, et AsyncSession.
- **Indication stricte des types :** Utilisez `Annotated` pour toutes les dépendances FastAPI. Cela sépare les métadonnées des dépendances des définitions de type, garantissant un code plus propre et une meilleure prise en charge par les IDE et l’analyse statique.
- Pour les erreurs, utiliser les classes définies dans le dossier core/exceptions. S'il faut créer une nouvelle exception pour être plus précis, fais le.
- Utilise les locales pour les messages. Si le message n'est pas dans les locales, le créer.
- Gestion des transactions dans les tests : Le rollback (retour arrière) est automatique ; ne faites pas de commit manuel dans le code de test, sauf si vous surchargez avec commit=True dans les seeds (données de test).
- Liaisons plusieurs-à-plusieurs (many-to-many) multiples : Utilisez explicitement link_model= (par exemple, UserTeamLink, AtlasTeamLink) et définissez les clés étrangères (foreign keys) directement dans les modèles de liaison.
- Schémas Pydantic par module : Les schémas Pydantic situés dans chaque module (ex : api/app/modules/users/schemas.py) définissent les modèles de requête et de réponse. Utilisez ConfigDict(from_attributes=True) pour permettre la conversion automatique des instances SQLModel en modèles Pydantic.
- Immuabilité : Favoriser l'usage de schémas Pydantic "frozen" (frozen=True) pour les objets de configuration et de transfert de données. Toute transformation de donnée doit produire un nouvel objet plutôt que de modifier l'existant (Pattern model_copy).
- Base de données : PostgreSQL avec l'extension PostGIS, migrations de schéma gérées via Alembic.
- A chaque fois qu'un modèle SQLModel est modifié, créer une migration avec la commande make-migration.
- A chaque fois qu'un modèle est créé, l'importer dans alembic/env.py avant de créer la migration.
- Authentification : Jetons JWT + schéma OAuth2 (Password flow), inscription par e-mail et support pour Google OAuth.
- Tests : Utilisation de pytest + pytest-asyncio + TestContainers (pour lancer des instances réelles de base de données dans Docker pendant les tests). La commande pour lancer les tests est `make launch-tests`
- Commandes système: Les commandes pour manipuler des containers, gérer Alembic sont dans des Makefiles. Avant de lancer des commandes via un shell, toujours vérifier qu'il n'est pas possible d'utiliser une commande Make existante.

## 2.3. Stratégie de Tests (Qualité Obligatoire)

L'agent doit systématiquement générer les tests avec le code livré.

### Règles

- Toute logique métier → test unitaire
- Pas de test inutilement verbeux
- Un test = un comportement
- Pas de dépendance réelle (DB, API, etc.)

### Implémentation

- **Tests Unitaires (Pytest) :** - Cibles : `app/core/`, `app/modules/{domain}/services`.
  - Règle : Mock systématique des dépendances externes. Focus sur la logique métier.
- **Tests d'Intégration (TestClient) :** - Cibles : `app/module/{domain}/endpoints`.
  - Règle : Doit tester le cycle complet (Request -> Route -> Service -> Mock DB -> Response).
  - Setup : Utiliser des fixtures Pytest pour gérer une base de données de test éphémère.
  - Toujours tester l'intégralité des endpoints avec une logique poussée, notamment au niveau des relations entre entités
