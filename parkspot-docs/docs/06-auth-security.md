# 06 — Authentication & Security

## 1. Authentication model

**JWT with access + refresh tokens** (stateless API, scalable horizontally).

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant API as Auth Module
    participant R as Redis (refresh store)

    C->>API: POST /auth/login (email, password)
    API->>API: verify password (argon2)
    API->>R: store refresh token (hashed, w/ exp)
    API-->>C: accessToken (15m) + refreshToken (7-30d)
    Note over C: access token in memory;<br/>refresh token in httpOnly cookie
    C->>API: API calls w/ Authorization: Bearer access
    Note over C,API: access token expires
    C->>API: POST /auth/refresh (refresh cookie)
    API->>R: validate + rotate refresh token
    API-->>C: new access + new refresh
```

### Token strategy
- **Access token:** short-lived (~15 min), JWT signed (RS256 or HS256), contains `sub` (user id), `role`, `exp`. Sent as `Authorization: Bearer`.
- **Refresh token:** longer-lived (7–30 days), **rotated on every use**, stored server-side (Redis/DB, hashed) so it can be **revoked**. Prefer storing it in an **httpOnly, Secure, SameSite cookie** to mitigate XSS theft.
- **Logout:** delete refresh token server-side; client drops access token.
- **Reuse detection:** if a rotated (already-used) refresh token is presented, revoke the whole token family (possible theft).

### Password handling
- Hash with **argon2id** (or bcrypt, cost ≥ 12). Never store plaintext.
- Enforce strength (length ≥ 8–12, breached-password check optional via HIBP).
- Reset via single-use, expiring, signed token sent by email.

### Optional: OAuth / social login
- Google/Apple sign-in later; map to the same `users` table (`password_hash` null).

---

## 2. Authorization (RBAC)

Roles: `driver`, `operator`, `admin`. A user may hold driver+operator capabilities.

```ts
// middleware
requireAuth                       // valid access token
requireRole('operator')           // role check
requireOwnership('facility')      // resource belongs to caller (operator owns facility)
```

| Resource | Rule |
|----------|------|
| Facility CRUD | operator must own the facility (`facility.operator_id === user.operatorProfile.id`) |
| Reservation | driver owns it; operator can view those at their facilities; admin all |
| Admin routes | role = admin only |
| Payouts/earnings | operator owns operator profile |

> Always enforce authorization **server-side** on every endpoint — never trust the client. Check both role and resource ownership.

---

## 3. Payment security (PCI)
- **Never** touch raw card data. Use **Stripe Elements** (client) + **Payment Intents** (server). Card data goes directly to Stripe; you store only Stripe tokens/IDs → keeps you in the lowest PCI scope (SAQ A).
- Verify **Stripe webhook signatures**; treat Stripe as the source of truth for payment state.
- Use **idempotency keys** for booking/payment creation and refunds.

---

## 4. OWASP Top 10 — mitigations

| Risk | Mitigation |
|------|-----------|
| **Injection** | Parameterized queries / Prisma; validate all input (Zod). Be careful with raw PostGIS SQL — always parameterize. |
| **Broken auth** | Strong hashing, short access tokens, rotating refresh tokens, lockout/rate-limit on login, MFA later |
| **Broken access control** | Centralized RBAC + ownership checks on every route; deny by default |
| **Sensitive data exposure** | TLS everywhere; secrets in a secret manager; encrypt at rest; minimal PII; no card data |
| **Security misconfiguration** | `helmet` headers, disable verbose errors in prod, least-privilege DB user, locked-down CORS |
| **XSS** | React escapes by default; sanitize any HTML; CSP header; refresh token in httpOnly cookie |
| **CSRF** | For cookie auth, use SameSite=strict/lax + CSRF tokens on state-changing routes; bearer-header APIs are less exposed |
| **SSRF/insecure deserialization** | Validate/allow-list outbound URLs; avoid eval; validate webhook payloads |
| **Vulnerable dependencies** | `npm audit`, Dependabot/Renovate, pin versions |
| **Insufficient logging** | Structured logs, audit log for admin/financial actions, alerting |

---

## 5. Input validation
- Validate **every** request body/query/param with **Zod** schemas at the API boundary; reject unknown fields.
- Validate business rules (e.g., `end_at > start_at`, `start_at` in future) and return `400`/`422` with field-level details.
- Share Zod schemas between frontend and backend via `packages/types`.

---

## 6. Rate limiting & abuse prevention
- Global limiter (e.g., `express-rate-limit` backed by Redis): ~100 req/min/IP.
- Strict limits on `/auth/login`, `/auth/forgot-password`, `/auth/register` (e.g., 5–10/min/IP + per-account).
- CAPTCHA (hCaptcha/Turnstile) on register/login after repeated failures.
- Throttle/cache Google Places autocomplete to control cost and abuse.

---

## 7. Secrets & configuration
- All secrets via env vars / secret manager (AWS Secrets Manager, Doppler, etc.). **Never commit secrets.**
- Separate keys per environment (dev/staging/prod).
- Restrict the **Google Maps browser key** by HTTP referrer; keep a separate **server key** restricted by IP for geocoding.
- Rotate keys periodically; revoke on leak.

See env var list in [11-project-setup.md](11-project-setup.md).

---

## 8. Transport & network
- **HTTPS/TLS only** (HSTS). Redirect HTTP→HTTPS.
- `helmet` for security headers (CSP, X-Frame-Options, etc.).
- Strict **CORS allow-list** of known frontend origins.
- Put the API behind a WAF/CDN (Cloudflare) for DDoS protection at scale.

---

## 9. Privacy & compliance
- Publish Privacy Policy & Terms; cookie consent if targeting EU.
- **GDPR/CCPA:** support data export & deletion (anonymize PII while retaining financial records).
- PCI handled via Stripe; document the data flow.
- Tax handling via Stripe Tax or a tax service where required.

---

## 10. Auditing & incident response
- `audit_log` for admin actions, refunds, role changes, listing approvals.
- Centralized error tracking (Sentry) with alerts.
- Document an incident runbook: key rotation, revoke tokens, notify users, post-mortem.
