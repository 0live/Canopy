# 🛡️ Rapport d'Audit Sécurité — Canopy API

> **Date :** 2026-02-20 | **Stack :** FastAPI + SQLModel + PostgreSQL + Caddy + Docker
> **Référence :** « How To Secure Backend APIs from Common Vulnerabilities? » — Lena Tyson

---

## Résumé Exécutif

| Catégorie | Statut |
|---|---|
| 1. Injection | ✅ OK (⚠️ 1 point partiel) |
| 2. XSS | ⚠️ PARTIEL |
| 3. CSRF | ✅ OK |
| 4. Authentification & Autorisation | ✅ OK |
| 5. Sécurisation des données | ✅ OK |
| 6. Sécurité active & surveillance | ⚠️ PARTIEL |
| Bonus : Rate limiting | ✅ OK |
| Bonus : CI/CD security tests | ❌ NON IMPLÉMENTÉ |
| Bonus : OWASP API Top 10 | ⚠️ PARTIEL |

---

## 1. Vulnérabilités d'Injection

### 1.1 Validation des entrées — ✅ OK

Tous les endpoints utilisent **Pydantic schemas** via FastAPI pour valider body, path params et query params. Les types sont stricts ([int](file:///home/olivier/dev/Canopy/api/app/modules/users/service.py#78-89), `EmailStr`, enums, etc.).

```python
# users/schemas.py — Validation Pydantic stricte
class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        return validate_password(v)  # Min 12 chars (AppParameter.MIN_PASSWORD_LENGTH)
```

- `EmailStr` valide le format email
- [UserRole](file:///home/olivier/dev/Canopy/api/app/modules/users/schemas.py#44-47) enum contraint les rôles acceptés
- `field_validator` sur les mots de passe
- `frozen=True` sur les DTOs empêche la mutation post-validation

### 1.2 ORM sécurisé / Requêtes paramétrées — ✅ OK

Le [BaseRepository](file:///home/olivier/dev/Canopy/api/app/core/repository.py#11-198) utilise exclusivement **SQLModel/SQLAlchemy ORM** avec des requêtes paramétrées :

```python
# core/repository.py — Requêtes ORM sécurisées
query = select(self.model).where(self.model.id == id)
result = await self.session.exec(query)
```

```python
# auth/repository.py — Paramétrage correct
stmt = select(RefreshToken).where(
    RefreshToken.token_hash == token_hash, ~RefreshToken.revoked
)
```

### 1.3 Concaténation dynamique SQL — ⚠️ PARTIEL

> [!WARNING]
> Le module [db_access/repository.py](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py) utilise `text()` avec **f-strings** pour des commandes DDL PostgreSQL (`CREATE ROLE`, `GRANT`, `DROP`). Bien qu'un regex [_validate_role_name()](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py#26-29) et un [_escape_sql_string()](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py#44-46) soient en place, cette approche reste fragile.

```python
# db_access/repository.py — DDL avec f-strings (risque)
async def create_role(self, role_name: str, password: str) -> None:
    self._validate_role_name(role_name)  # regex ^canopy_user_\d+$
    escaped_password = self._escape_sql_string(password)  # simple quote escaping
    await self.session.execute(
        text(f"CREATE ROLE {role_name} LOGIN PASSWORD '{escaped_password}'")
    )
```

**Atténuation existante :**
- [role_name](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py#26-29) validé par regex strict `^canopy_user_\d+$` → pas d'injection via le nom
- [password](file:///home/olivier/dev/Canopy/api/app/core/hashing.py#4-10) échappé par remplacement de `'` → `''`

**Recommandation :** Utiliser `libpq` quoting ou `psycopg.sql.SQL` + `sql.Identifier` / `sql.Literal` pour un échappement garanti par le driver :

```python
from psycopg import sql
await self.session.execute(
    sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(
        sql.Identifier(role_name),
        sql.Literal(password),
    )
)
```

---

## 2. Cross-Site Scripting (XSS)

### 2.1 Pas d'injection de scripts dans les réponses — ✅ OK

L'API retourne exclusivement du **JSON** (`ORJSONResponse`). Aucun template HTML n'est rendu côté serveur. Les données sont sérialisées via Pydantic `model_validate` → pas de risque XSS direct.

### 2.2 Sanitization des données — ✅ OK

Les réponses passent par des `response_model` Pydantic stricts, qui filtrent tout champ non déclaré. Les erreurs internes sont masquées :

```python
# exceptions/handlers.py — Erreurs internes cachées
async def api_exception_handler(request, exc):
    logger.error("Internal Server Error: %s", exc.key, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

### 2.3 Content Security Policy (CSP) — ❌ NON IMPLÉMENTÉ

> [!IMPORTANT]
> Le [Caddyfile](file:///home/olivier/dev/Canopy/Caddyfile) définit HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy — mais **pas de header CSP**.

```
# Caddyfile — Headers existants (pas de CSP)
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
}
```

**Recommandation :** Ajouter un header CSP dans le Caddyfile :

```
Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'"
```

Également ajouter `Permissions-Policy` pour restreindre les APIs navigateur.

---

## 3. Cross-Site Request Forgery (CSRF)

### 3.1 Protection anti-CSRF — ✅ OK

L'API est protégée par plusieurs couches :

| Mécanisme | Preuve |
|---|---|
| **JWT Bearer tokens** | `OAuth2PasswordBearer(tokenUrl="auth/login")` — header `Authorization` requis |
| **Refresh tokens httpOnly** | `httponly=True`, `samesite="strict"` en prod |
| **CORS strict** | Origines configurables, `allow_credentials=True` |
| **SessionMiddleware** | `same_site="strict"` en prod, `https_only=True` en prod |
| **TrustedHostMiddleware** | Hosts autorisés dérivés de `SITE_ADDRESS` |

```python
# auth_service.py — Cookie sécurisé
response.set_cookie(
    key=AppParameter.REFRESH_TOKEN_COOKIE_NAME,
    value=token,
    httponly=True,
    secure=True,           # en prod
    samesite="strict",     # en prod
    max_age=...,
)
```

---

## 4. Authentification & Autorisation

### 4.1 Authentification solide — ✅ OK

| Élément | Statut | Preuve |
|---|---|---|
| **JWT signé** | ✅ | HS256, clé privée configurable |
| **Clé par défaut bloquée en PROD** | ✅ | [validate_secret_key](file:///home/olivier/dev/Canopy/api/app/core/config.py#44-53) lève [SecurityException](file:///home/olivier/dev/Canopy/api/app/core/exceptions/__init__.py#53-58) |
| **OAuth2 Password flow** | ✅ | `OAuth2PasswordRequestForm` |
| **Google OAuth** | ✅ | `GoogleAuthService` |
| **Bcrypt hashing** | ✅ | `bcrypt.hashpw` avec salt auto |
| **Mot de passe min 12 chars** | ✅ | `AppParameter.MIN_PASSWORD_LENGTH = 12` |
| **MFA** | ❌ | Non implémenté |

```python
# config.py — Sécurité de la clé privée en production
@field_validator("private_key")
def validate_secret_key(cls, v, info):
    if values.get("env") == Environment.PROD and v == "your_default_secret_key_change_me":
        raise SecurityException(key="config.insecure_secret_key")
```

**Recommandation MFA :** Envisager TOTP (pyotp) pour les comptes admin.

### 4.2 Gestion des sessions — ✅ OK

| Élément | Statut | Preuve |
|---|---|---|
| **Tokens non prédictibles** | ✅ | `secrets.token_urlsafe(32)` |
| **Expiration access token** | ✅ | 15 min par défaut |
| **Expiration refresh token** | ✅ | 30 jours |
| **Rotation du refresh token** | ✅ | Ancien token révoqué à chaque refresh |
| **Hash du refresh token en DB** | ✅ | `sha256` — pas de token en clair stocké |
| **Révocation au logout** | ✅ | [revoke_refresh_token](file:///home/olivier/dev/Canopy/api/app/modules/auth/repository.py#28-34) + `delete_cookie` |

```python
# auth_service.py — Rotation des tokens
async def refresh_access_token(self, refresh_token, response):
    # ... validation ...
    await self.repository.revoke_refresh_token(stored_token.id)  # Rotation
    return await self._issue_tokens(user, response)
```

### 4.3 Contrôles d'accès (RBAC) — ✅ OK

Tous les endpoints (sauf `/health`, `/auth/*`) exigent `Depends(get_current_user)`. Les services vérifient les rôles via [has_any_role()](file:///home/olivier/dev/Canopy/api/app/core/permissions.py#9-12) :

```python
# users/service.py — RBAC appliqué
async def get_all_users(self, current_user):
    if not has_any_role(current_user, [UserRole.ADMIN]):
        raise PermissionDeniedException(...)
```

Les rôles sont un enum ([UserRole](file:///home/olivier/dev/Canopy/api/app/modules/users/schemas.py#44-47)) avec `ADMIN`, `USER`, `WITHDBACCESS`.

---

## 5. Sécurisation des Données

### 5.1 HTTPS / TLS — ✅ OK

**Caddy gère automatiquement TLS** avec Let's Encrypt. HSTS est activé :

```
Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

L'API n'est pas exposée directement (uniquement `expose: "8000"` sur le réseau Docker interne `backend: internal: true`). Seul Caddy écoute sur les ports 80/443.

### 5.2 Chiffrement au repos — ⚠️ PARTIEL

| Élément | Statut |
|---|---|
| **Mots de passe hashés (bcrypt)** | ✅ |
| **Refresh tokens hashés (SHA-256)** | ✅ |
| **Chiffrement disque PostgreSQL** | ❌ Non configuré explicitement |
| **Gestion de clés (KMS)** | ❌ Pas de KMS |

**Recommandation :** Pour les données sensibles au repos, activer le chiffrement de volume Docker ou utiliser PostgreSQL TDE. Pour la gestion de clés, envisager HashiCorp Vault ou un KMS cloud.

---

## 6. Sécurité Active & Surveillance

### 6.1 Logging & Monitoring — ⚠️ PARTIEL

| Élément | Statut | Preuve |
|---|---|---|
| **Logging structuré** | ✅ | [logging_config.py](file:///home/olivier/dev/Canopy/api/app/core/logging_config.py) — logger `canopy` |
| **Exception logging** | ✅ | Tous les handlers loguent les erreurs |
| **Auth failures logged** | ✅ | `logger.warning("Authentication failed: ...")` |
| **Permission denied logged** | ✅ | `logger.warning("Permission denied for user ...")` |
| **Docker log rotation** | ✅ | `max-size: 10m`, `max-file: 3` |
| **Centralisation des logs** | ❌ | Pas de stack ELK/Loki/Datadog |
| **Alerting** | ❌ | Pas d'alertes configurées |

**Recommandation :** Intégrer un collecteur de logs (Loki + Grafana, ou ELK) et configurer des alertes sur les patterns critiques (auth failures burst, 500 errors spike).

### 6.2 Audits de sécurité — ❌ NON IMPLÉMENTÉ

Aucune trace de tests d'intrusion planifiés ou d'audits automatisés (DAST/SAST dans le pipeline).

**Recommandation :** Intégrer `bandit` (SAST Python) et `semgrep` dans le pipeline CI. Planifier des pentests périodiques.

### 6.3 WAF — ❌ NON IMPLÉMENTÉ

Pas de Web Application Firewall devant l'API. Caddy fait office de reverse proxy mais **ne filtre pas les payloads malveillants**.

**Recommandation :** Considérer Cloudflare (WAF intégré), ou `coraza-caddy` (WAF OWASP CRS pour Caddy), ou un WAF cloud.

---

## 🧪 Bonus

### Rate Limiting — ✅ OK

SlowAPI est intégré avec des limites sur les endpoints sensibles :

```python
# rate_limit.py
limiter = Limiter(key_func=get_remote_address, enabled=env != TEST)

# auth/endpoints.py
@limiter.limit("5/minute")
async def register(request, user, service): ...

@limiter.limit("5/minute")
async def login(request, form_data, service, response): ...
```

**Recommandation :** Étendre le rate limiting à tous les endpoints authentifiés (ex: `30/minute` global).

### Tests de sécurité CI/CD — ❌ NON IMPLÉMENTÉ

Aucun pipeline CI/CD détecté dans le repo (pas de `.github/workflows`, `.gitlab-ci.yml`, etc.).

**Recommandation :**
```yaml
# Exemple GitHub Actions
- name: Security scan (bandit)
  run: bandit -r api/app -ll
- name: Dependency audit
  run: pip-audit
- name: OWASP ZAP scan
  uses: zaproxy/action-baseline@v0.7.0
```

### OWASP API Top 10 — ⚠️ PARTIEL

| OWASP Item | Statut |
|---|---|
| API1 - Broken Object Level Auth | ✅ Vérifié par service (user_id check) |
| API2 - Broken Authentication | ✅ JWT + bcrypt + rotation |
| API3 - Broken Object Property Auth | ✅ Schemas Pydantic stricts |
| API4 - Unrestricted Resource Consumption | ⚠️ Rate limit partiel |
| API5 - Broken Function Level Auth | ✅ RBAC sur chaque endpoint |
| API6 - Unrestricted Access to Sensitive Flows | ⚠️ Pas de CAPTCHA sur register |
| API7 - Server Side Request Forgery | ✅ Pas de proxy utilisateur |
| API8 - Security Misconfiguration | ⚠️ CSP manquant, pas de WAF |
| API9 - Improper Inventory Management | ✅ Swagger auto-généré |
| API10 - Unsafe Consumption of APIs | ✅ Google OAuth validé |

---

## 📊 Tableau Récapitulatif

| # | Item | Statut | Action requise |
|---|---|---|---|
| 1.1 | Validation des entrées | ✅ OK | — |
| 1.2 | ORM / requêtes paramétrées | ✅ OK | — |
| 1.3 | Pas de concaténation SQL | ⚠️ PARTIEL | Migrer [db_access/repository.py](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py) vers `psycopg.sql` |
| 2.1 | Pas d'injection XSS | ✅ OK | — |
| 2.2 | Sanitization réponses | ✅ OK | — |
| 2.3 | CSP header | ❌ NON IMPL. | Ajouter CSP dans le Caddyfile |
| 3.1 | Anti-CSRF | ✅ OK | — |
| 4.1 | Authentification solide | ✅ OK | Envisager MFA (TOTP) pour admins |
| 4.2 | Sessions sécurisées | ✅ OK | — |
| 4.3 | RBAC | ✅ OK | — |
| 5.1 | HTTPS/TLS | ✅ OK | — |
| 5.2 | Chiffrement au repos | ⚠️ PARTIEL | Envisager chiffrement volume + KMS |
| 6.1 | Logging & monitoring | ⚠️ PARTIEL | Ajouter centralisation logs + alerting |
| 6.2 | Audits sécurité | ❌ NON IMPL. | Planifier pentests, intégrer SAST |
| 6.3 | WAF | ❌ NON IMPL. | Déployer WAF (Cloudflare / coraza-caddy) |
| B.1 | Rate limiting | ✅ OK | Étendre à tous les endpoints |
| B.2 | CI/CD security tests | ❌ NON IMPL. | Ajouter bandit, pip-audit, ZAP |
| B.3 | OWASP API Top 10 | ⚠️ PARTIEL | Voir détail ci-dessus |

---

## 🎯 Priorités d'Action

### Priorité Haute (sécurité immédiate)
1. **Migrer les DDL de [db_access/repository.py](file:///home/olivier/dev/Canopy/api/app/modules/db_access/repository.py)** vers `psycopg.sql.SQL` pour éliminer le risque d'injection
2. **Ajouter un header CSP** dans le Caddyfile

### Priorité Moyenne (hardening)
3. **Déployer un WAF** devant l'API (coraza-caddy ou Cloudflare)
4. **Centraliser les logs** (Loki/Grafana ou ELK) avec alerting
5. **Intégrer SAST** dans le pipeline CI (`bandit`, `semgrep`, `pip-audit`)

### Priorité Basse (améliorations)
6. **MFA (TOTP)** pour les comptes admin
7. **Chiffrement au repos** des volumes PostgreSQL
8. **Rate limiting global** sur tous les endpoints authentifiés
9. **Permissions-Policy** header dans Caddy
