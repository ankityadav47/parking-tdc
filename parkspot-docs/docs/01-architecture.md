# 01 — System Architecture

## 1. Architectural approach

Start with a **modular monolith** (a single Node.js codebase organized into clear domain modules) and a clean separation between frontend apps. This is the pragmatic path to launch fast while keeping a clear road to **extract microservices** later as load grows.

> **Why modular monolith first?** Microservices add operational overhead (networking, distributed transactions, deployment complexity) that slows down an early-stage product. A well-structured monolith with module boundaries gives you 90% of the scalability with 10% of the complexity, and the boundaries make later extraction straightforward.

```mermaid
flowchart TB
    subgraph "Phase 1: Modular Monolith"
        M[Node.js App<br/>auth · search · booking · payment · notify modules]
    end
    subgraph "Phase 2+: Extract hot paths"
        S1[Search Service]
        S2[Booking Service]
        S3[Payment Service]
    end
    M -. extract when needed .-> S1
    M -. extract when needed .-> S2
    M -. extract when needed .-> S3
```

---

## 2. High-level architecture

```mermaid
flowchart LR
    subgraph Client Layer
        D[Driver App<br/>React SPA/PWA]
        O[Operator Dashboard<br/>React]
        A[Admin Panel<br/>React]
    end

    CDN[CDN<br/>static assets]
    LB[Load Balancer / Nginx]

    subgraph API Layer
        API[Node.js API<br/>Express/NestJS<br/>REST + WebSocket]
    end

    subgraph Domain Modules
        AUTH[Auth & Users]
        FAC[Facilities & Listings]
        SRCH[Search]
        BOOK[Bookings]
        PAY[Payments]
        REV[Reviews]
        NOTIF[Notifications]
        ADMIN[Admin]
    end

    subgraph Data Layer
        PG[(PostgreSQL<br/>+ PostGIS)]
        RDS[(Redis<br/>cache · sessions · rate limit)]
        OBJ[(Object Storage<br/>S3 — photos, passes)]
    end

    subgraph Async
        Q[[Queue<br/>BullMQ/Redis]]
        W[Workers<br/>emails, payouts, cleanup]
    end

    subgraph External
        STRIPE[[Stripe]]
        GMAPS[[Google Maps]]
        MAIL[[Email/SMS<br/>SendGrid/Twilio]]
    end

    D & O & A --> CDN
    D & O & A --> LB --> API
    API --> AUTH & FAC & SRCH & BOOK & PAY & REV & NOTIF & ADMIN
    AUTH & FAC & BOOK & PAY & REV & ADMIN --> PG
    SRCH --> PG
    AUTH & SRCH --> RDS
    FAC --> OBJ
    PAY --> STRIPE
    SRCH --> GMAPS
    BOOK --> Q --> W --> MAIL
    PAY --> Q
    NOTIF --> MAIL
```

---

## 3. Component responsibilities

| Module | Responsibility |
|--------|---------------|
| **Auth & Users** | Registration, login, JWT issuance/refresh, roles (driver/operator/admin), profiles, vehicles, payment methods, business profiles |
| **Facilities & Listings** | CRUD for facilities, spaces, rate rules, availability, photos, amenities, moderation status |
| **Search** | Geospatial + temporal availability search, ranking, filters; reads from PostGIS, caches popular queries in Redis |
| **Bookings** | Reservation lifecycle, capacity/availability enforcement (no oversell), pass generation, edits/cancellations |
| **Payments** | Stripe Payment Intents, refunds, Stripe Connect onboarding & payouts, webhooks, ledger |
| **Reviews** | Ratings/reviews after completed bookings, aggregation |
| **Notifications** | Email/SMS/push for confirmations, reminders, cancellations |
| **Admin** | Moderation, user management, disputes, analytics |

---

## 4. Request flow examples

### 4.1 Search flow

```mermaid
sequenceDiagram
    participant U as Driver (React)
    participant API as Node API
    participant GM as Google Geocoding
    participant R as Redis
    participant DB as PostGIS

    U->>API: GET /search?address=...&start=...&end=...
    API->>GM: Geocode address → lat/lng
    GM-->>API: coordinates
    API->>R: cache lookup (geo+time key)
    alt cache hit
        R-->>API: cached results
    else cache miss
        API->>DB: ST_DWithin facilities + availability for window
        DB-->>API: candidate facilities
        API->>API: compute price, distance, rank
        API->>R: store (TTL ~60s)
    end
    API-->>U: ranked facilities + map markers
```

### 4.2 Booking + payment flow (no double-booking)

```mermaid
sequenceDiagram
    participant U as Driver
    participant API as Booking Module
    participant DB as PostgreSQL
    participant S as Stripe

    U->>API: POST /bookings (facility, window, vehicle)
    API->>DB: BEGIN tx; SELECT capacity ... FOR UPDATE
    API->>DB: count overlapping confirmed/held reservations
    alt capacity available
        API->>DB: INSERT reservation (status=PENDING, hold expiry)
        API->>DB: COMMIT
        API->>S: Create PaymentIntent (amount locked)
        S-->>API: client_secret
        API-->>U: reservation id + client_secret
        U->>S: Confirm payment (Stripe.js)
        S-->>API: webhook payment_intent.succeeded
        API->>DB: UPDATE reservation status=CONFIRMED; generate pass
        API-->>U: confirmation + pass (via webhook/poll)
    else no capacity
        API->>DB: ROLLBACK
        API-->>U: 409 Conflict (sold out for window)
    end
```

> **Key technique:** a short-lived **PENDING hold** (e.g., 10 min) reserves capacity while the user pays. Use `SELECT ... FOR UPDATE` (or an exclusion constraint) to serialize concurrent attempts and prevent overselling. A background worker expires stale holds.

---

## 5. Scalability strategy

| Concern | Strategy |
|---------|----------|
| **Stateless API** | No in-memory session; JWT + Redis. Horizontally scale API behind a load balancer. |
| **Read-heavy search** | Cache hot geo/time queries in Redis (short TTL). Add PostgreSQL **read replicas**; route search reads to replicas. |
| **Geospatial performance** | PostGIS **GiST index** on location; `ST_DWithin` for radius queries. |
| **No oversell under load** | Row-level locks / exclusion constraints + short holds; idempotent booking creation. |
| **Spiky workloads (events)** | Queue async work (emails, payouts, pass gen). Autoscale workers. |
| **Static & media** | Serve React build + images via **CDN**; store media in object storage (S3). |
| **Hot data** | Cache facility details, rate rules in Redis. |
| **Database growth** | Partition large tables (e.g., reservations by month) later; archive old data. |
| **Service extraction** | Extract Search/Booking/Payment into independent services when a module becomes a bottleneck. |
| **Idempotency** | Idempotency keys on booking & payment endpoints to safely retry. |

### Scaling timeline
```mermaid
flowchart LR
    A[Single instance<br/>+ managed Postgres/Redis] --> B[Multiple API instances<br/>behind LB]
    B --> C[Read replicas<br/>+ heavier caching]
    C --> D[Extract Search & Booking<br/>services + queues]
    D --> E[Sharding / partitioning<br/>multi-region]
```

---

## 6. Cross-cutting concerns

- **Auth/RBAC:** middleware validates JWT and role per route. See [06-auth-security.md](06-auth-security.md).
- **Validation:** schema validation (Zod/Joi) at the API boundary.
- **Error handling:** centralized error middleware → consistent error envelope (see [04-api-spec.md](04-api-spec.md)).
- **Logging/metrics/tracing:** structured logs, request IDs, metrics, traces. See [09-infra-devops.md](09-infra-devops.md).
- **Config:** 12-factor env vars; secrets in a secret manager.
- **Time:** store UTC; convert per facility timezone in presentation.

---

## 7. Data consistency notes

- Money + reservations are **strongly consistent** (single Postgres, transactions).
- Search results can be **eventually consistent** (cached, short TTL) — acceptable, with a final capacity check at booking time.
- Stripe is the **source of truth for payment state**; reconcile via webhooks + a payments ledger table.
