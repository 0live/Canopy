# Plan d'implémentation — Audit Sécurité Accès PostgreSQL

## Vue d'ensemble

Ce plan couvre les 9 corrections identifiées lors de l'audit de sécurité du système d'autorisation d'accès PostgreSQL (`db_access` + `users`). Les items sont ordonnés par priorité décroissante.

---



---

## Item 3 — Mot de passe PostgreSQL hors de la string SQL (MOYENNE)

**Problème :** `CREATE ROLE ... PASSWORD 'plaintext'` est composé dans une string puis passé à `text()`, ce qui expose le mot de passe dans les logs SQL.

**Fichier concerné :**
- `api/app/modules/db_access/repository.py` — méthode `create_role()`

**Plan :**
1. Remplacer la séquence `CREATE ROLE ... PASSWORD {literal}` par deux étapes :
   - `CREATE ROLE {role_name} LOGIN` (sans mot de passe)
   - `ALTER ROLE {role_name} PASSWORD %s` via un paramètre lié psycopg natif (hors `text()`)
2. Vérifier que `log_statement` PostgreSQL n'est pas à `all` en environnement de prod (documenter dans `.env.example`)
3. S'assurer qu'aucun middleware SQLAlchemy (`echo=True`) n'est actif en prod
4. Test : vérifier que les logs ne contiennent pas le mot de passe après activation

---

## Item 4 — Restreindre le GRANT SELECT sur le schéma `public` (MOYENNE)

**Problème :** `GRANT SELECT ON ALL TABLES IN SCHEMA public TO {role}` accorde l'accès à toutes les tables présentes au moment de l'activation, y compris potentiellement des tables sensibles.

**Fichier concerné :**
- `api/app/modules/db_access/repository.py` — méthode `create_role()`

**Plan :**
1. Auditer les tables dans le schéma `public` et identifier celles qui peuvent être exposées
2. Remplacer le grant générique par des grants explicites sur une whitelist de tables :
   ```sql
   GRANT SELECT ON TABLE public.couche1, public.couche2, ... TO {role}
   ```
3. Définir la whitelist comme enum ou constante dans `AppParameter` / fichier de config
4. Documenter les tables accessibles dans un commentaire inline
5. Test : vérifier qu'une table ajoutée à `public` n'est pas automatiquement accessible

---

## Item 5 — Table d'audit persistante pour les changements de rôles (MOYENNE)

**Problème :** Seul un `logger.warning()` est émis lors de changements de rôles. Pas de traçabilité durable.

**Fichiers concernés :**
- `api/app/core/audit/` (nouveau module)
- `api/app/modules/users/service.py`
- Nouvelle migration Alembic

**Plan :**
1. Créer le modèle `AuditLog` :
   ```python
   class AuditLog(SQLModel, table=True):
       id: int
       actor_id: int          # admin qui agit
       target_user_id: int    # utilisateur modifié
       action: AuditAction    # enum: ROLES_GRANTED, ROLES_REVOKED, USER_DELETED...
       old_value: dict        # JSONB
       new_value: dict        # JSONB
       created_at: datetime
   ```
2. Créer l'enum `AuditAction`
3. Créer `AuditRepository` et `AuditService`
4. Injecter `AuditService` dans `UserService` et appeler `audit_service.log()` dans `update_user_roles()` et `delete_user()`
5. Migration Alembic pour la table `audit_log`
6. Tests unitaires sur l'écriture des logs

---

## Item 6 — Garde-fous sur la promotion du rôle ADMIN (MOYENNE)

**Problème :** Un admin peut se modifier lui-même ou promouvoir n'importe qui sans validation supplémentaire.

**Fichier concerné :**
- `api/app/modules/users/service.py` — méthode `update_user_roles()`

**Plan :**
1. Interdire qu'un admin modifie ses propres rôles (`user_id == current_user.id` → `PermissionDeniedException`)
2. Ajouter un message i18n `user.self_role_update_denied`
3. (Optionnel) Exiger que la promotion vers `ADMIN` soit confirmée par un second admin ou via un endpoint dédié `POST /users/{id}/promote-admin`
4. Tests : vérifier le rejet de l'auto-modification

---

## Item 7 — TTL sur le rôle PostgreSQL (`VALID UNTIL`) (FAIBLE)

**Problème :** Un rôle PostgreSQL créé n'a pas de date d'expiration. Une session active après révocation reste ouverte.

**Fichier concerné :**
- `api/app/modules/db_access/repository.py` — méthode `create_role()`

**Plan :**
1. Ajouter un paramètre `AppParameter.DB_ROLE_VALIDITY_DAYS` (ex: 90 jours)
2. Lors de `CREATE ROLE`, ajouter `VALID UNTIL '{expiry_date}'`
3. Créer un endpoint admin `POST /users/{id}/renew-db-access` pour renouveler la validité
4. (Optionnel) Tâche cron qui notifie les utilisateurs 7 jours avant expiration
5. Tests : vérifier que le rôle créé a bien une date d'expiration

---

## Item 8 — Éliminer la race condition sur `role_exists` / `create_role` (FAIBLE)

**Problème :** Double vérification non atomique entre `role_exists()` et `create_role()`.

**Fichier concerné :**
- `api/app/modules/db_access/service.py` — méthode `activate_database_access()`
- `api/app/modules/db_access/repository.py` — méthode `create_role()`

**Plan :**
1. Utiliser `pg_try_advisory_lock(user_id)` pour verrouiller la section critique par utilisateur
2. OU transformer `CREATE ROLE` en `DO $$ BEGIN CREATE ROLE ...; EXCEPTION WHEN duplicate_object THEN RAISE ...`
3. Libérer le lock dans un bloc `finally`
4. Test : simuler deux requêtes concurrentes et vérifier qu'une seule réussit

---

## Item 9 — Invalider le token après une erreur de création de rôle (FAIBLE)

**Problème :** Si `create_role()` échoue, le token reste valide et réutilisable indéfiniment.

**Fichier concerné :**
- `api/app/modules/db_access/service.py` — méthode `activate_database_access()`

**Plan :**
1. Ajouter un compteur `db_activation_attempts: int` sur le modèle `User`
2. Incrémenter à chaque échec de `create_role()`
3. Invalider le token (`db_activation_token = None`) si `attempts >= 3`
4. Retourner un message spécifique si le token a été invalidé suite à des échecs répétés
5. Tests : vérifier l'invalidation après N échecs

---

## Ordre de réalisation recommandé

| Priorité | Item | Justification |
|----------|------|---------------|
| 1 | Item 1 — Token hashé | Risque critique si DB compromise |
| 2 | Item 3 — Password hors SQL string | Fuite possible dans logs dès maintenant |
| 3 | Item 2 — Rate limiting | Surface d'attaque active |
| 4 | Item 5 — Table d'audit | Traçabilité légale/forensique |
| 5 | Item 4 — GRANT SELECT restreint | Données exposées à vérifier d'abord |
| 6 | Item 6 — Garde-fou ADMIN | Complète la sécurité d'accès |
| 7 | Item 7 — TTL rôle PG | Amélioration longue durée |
| 8 | Item 8 — Race condition | Risque très faible en pratique |
| 9 | Item 9 — Token post-erreur | Risque faible, UX à considérer |

---

## Références fichiers

| Fichier | Items concernés |
|---------|-----------------|
| `api/app/modules/users/models.py` | 1, 9 |
| `api/app/modules/users/service.py` | 1, 5, 6 |
| `api/app/modules/db_access/repository.py` | 1, 3, 4, 7, 8 |
| `api/app/modules/db_access/service.py` | 1, 2, 8, 9 |
| `api/app/modules/db_access/endpoints.py` | 2 |
| `api/app/core/audit/` _(nouveau)_ | 5 |
| Migrations Alembic | 1, 5, 9 |
