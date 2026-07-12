---
sidebar_position: 2
---

# Authentication

Canopy uses a dual-token JWT scheme: a short-lived **access token** for API
calls and a long-lived **refresh token** for session continuity. Source:
`app/modules/auth/`.

## Token strategy

| Token         | Default lifetime | Storage                       | Purpose                    |
| ------------- | ---------------- | ----------------------------- | -------------------------- |
| Access token  | 15 min           | Client memory (Zustand store) | API request authorization  |
| Refresh token | 30 days          | HTTP-only cookie `canopy_rt`  | Obtain new access tokens   |

The refresh token is also persisted server-side (`refreshtoken` table) so it can
be revoked. Lifetimes are configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` and
`REFRESH_TOKEN_EXPIRE_DAYS`.

## Endpoints

| Method | Path                    | Rate limit | Notes                                            |
| ------ | ----------------------- | ---------- | ------------------------------------------------ |
| GET    | `/auth/captcha/challenge` | 20/min   | Altcha proof-of-work challenge for registration. |
| POST   | `/auth/register`        | 5/min      | Create account. Body includes `altcha_payload`.  |
| POST   | `/auth/login`           | 5/min      | OAuth2 password form (`username`, `password`).   |
| POST   | `/auth/refresh`         | —          | Reads `canopy_rt` cookie, rotates it.            |
| POST   | `/auth/logout`          | —          | Revokes the refresh token, clears the cookie.    |
| GET    | `/auth/verify?token=`   | —          | Verify email, issues tokens.                     |
| POST   | `/auth/forgot-password` | 3/hour     | Always 200 (prevents email enumeration).         |
| POST   | `/auth/reset-password`  | 5/hour     | Body: `token`, `new_password`.                   |
| GET    | `/auth/google`          | —          | Start Google OAuth (if enabled).                 |
| GET    | `/auth/google/callback` | —          | OAuth callback, issues tokens.                   |

> **Correction vs older docs:** the Google entry point is `GET /auth/google`
> (not `/auth/google/login`).

### Login

```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=yourpassword
```

Response (`Token`):

```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

The refresh token is delivered as the HTTP-only cookie `canopy_rt` (not in the
body of `Token`).

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "myuser",
  "password": "a-strong-password",
  "altcha_payload": "<solved captcha>"
}
```

Constraints: `username` ≥ 5 chars matching `^[a-zA-Z0-9_-]+$`; password policy
enforced by `validate_password` (min length 12, see `AppParameter`). A
verification email is sent; the account is inactive until verified. Self-service
registration requires `ALLOW_SELF_REGISTRATION=True`, otherwise only admins
create users.

### Refresh & rotation

`POST /auth/refresh` reads the `canopy_rt` cookie, issues a new access token and
**rotates** the refresh token (the previous one is invalidated). The frontend
axios interceptor performs this transparently on a 401 and retries the original
request.

### Google OAuth (optional)

Enabled with `ACTIVATE_GOOGLE_AUTH=True` + `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`. Because it can create accounts, it requires
`ALLOW_SELF_REGISTRATION=True`.

## Using the access token

```http
Authorization: Bearer eyJ...
```

WebSocket auth (notifications) uses the same token via `get_current_user_ws`.

## Security notes

- Refresh token in an **HTTP-only** cookie (`canopy_rt`) — not readable by JS.
- **Rotation** on every refresh limits replay of a stolen token.
- In prod, session/cookies use `SameSite=strict` and `Secure` (dev relaxes to
  `lax` / non-secure over `localhost`).
- Passwords hashed with **bcrypt** (`app/core/hashing.py`).
