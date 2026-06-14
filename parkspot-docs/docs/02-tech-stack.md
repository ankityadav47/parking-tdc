# 02 — Tech Stack & Decisions

This document lists the chosen technologies and the reasoning (lightweight ADRs — Architecture Decision Records).

---

## 1. Stack summary

### Frontend
| Concern | Choice | Notes |
|---------|--------|-------|
| Language | **TypeScript** | Type safety across the stack |
| Framework | **React 18** | SPA; can adopt Next.js later for SSR/SEO on marketing/landing pages |
| Build tool | **Vite** | Fast dev server & builds |
| Routing | **React Router v6** | |
| Server state | **TanStack Query (React Query)** | Caching, retries, background refetch for API data |
| Client state | **Zustand** | Lightweight global UI/state store |
| Forms | **React Hook Form + Zod** | Performant forms + shared validation schemas |
| Styling | **Tailwind CSS** | Utility-first, fast, consistent. Pair with **shadcn/ui** or Radix for accessible components |
| Maps | **@react-google-maps/api** | Google Maps JS wrapper |
| Payments UI | **Stripe.js + React Stripe Elements** | PCI-compliant card capture |
| Testing | **Vitest + React Testing Library + Playwright** | unit/component + e2e |

### Backend
| Concern | Choice | Notes |
|---------|--------|-------|
| Runtime | **Node.js (LTS, v20+)** | |
| Language | **TypeScript** | |
| Framework | **Express** (or **NestJS**) | Express = simple & flexible; NestJS = opinionated structure/DI for larger teams. *Recommendation below.* |
| ORM | **Prisma** | Type-safe, great DX, migrations. Use raw SQL / `prisma.$queryRaw` for PostGIS geo queries |
| Validation | **Zod** | Share schemas with frontend |
| Auth | **JWT (access + refresh)** + **bcrypt/argon2** | Refresh tokens in Redis/DB |
| Queue/jobs | **BullMQ** (Redis-backed) | Emails, payouts, hold expiry |
| Realtime | **Socket.IO / ws** | Live booking status, operator notifications |
| Testing | **Jest/Vitest + Supertest** | unit + integration |
| API docs | **OpenAPI (Swagger)** | Generated/maintained spec |

### Data & infra
| Concern | Choice | Notes |
|---------|--------|-------|
| Primary DB | **PostgreSQL 15+ with PostGIS** | Relational integrity + geospatial search |
| Cache/sessions/queue | **Redis** | |
| Object storage | **S3-compatible** (AWS S3 / Cloudflare R2 / MinIO) | Photos, generated passes |
| Payments | **Stripe** (Payment Intents + Connect) | Driver charges + operator payouts |
| Maps/geo | **Google Maps Platform** | Maps JS, Places, Geocoding, Directions |
| Email/SMS | **SendGrid / Resend + Twilio** | Notifications |
| Containerization | **Docker + docker-compose** | Local + prod parity |
| CI/CD | **GitHub Actions** | Lint, test, build, deploy |
| Hosting | **AWS / GCP / Render / Fly.io** | Start simple (Render/Fly), grow into AWS |
| Monitoring | **Sentry + Prometheus/Grafana + structured logs** | Errors, metrics, dashboards |

---

## 2. Recommended database — and why (your "you recommend")

### Decision: **PostgreSQL + PostGIS** (with Redis as a companion cache).

**Why Postgres over MongoDB for this product:**

1. **The data is highly relational.** Users ↔ facilities ↔ rate rules ↔ reservations ↔ payments ↔ payouts form a web of foreign-key relationships. Postgres enforces this integrity natively.
2. **Money requires ACID transactions.** Bookings and payments must be atomic and consistent (no overselling, no half-charged bookings). Postgres transactions + row locks + exclusion constraints handle this elegantly.
3. **Geospatial search is first-class with PostGIS.** `ST_DWithin`, GiST indexes, and distance sorting are exactly what "find parking within X km, sorted by distance" needs — without bolting on a separate search engine early.
4. **Complex queries & reporting.** Admin analytics (GMV, occupancy, revenue) are natural SQL aggregations and joins.
5. **Mature ecosystem.** Prisma, migrations, read replicas, partitioning, and managed offerings (RDS, Cloud SQL, Neon, Supabase) are all excellent.

MongoDB is great for flexible/denormalized document data, but here the relational integrity and transactional guarantees around money and inventory are the dominant requirement. Redis covers the cases where you *do* want fast, ephemeral key-value access (caching, sessions, rate limiting, queues).

---

## 3. Express vs NestJS — recommendation

- **If you're a solo dev / small team and want to move fast:** start with **Express + TypeScript**, organized into clear domain modules (folders). Lightweight, huge ecosystem.
- **If you expect a growing team and want enforced structure (DI, modules, decorators, built-in validation/Swagger):** choose **NestJS** (which runs on Express under the hood).

**Recommendation for this project:** **NestJS** if you anticipate a multi-developer team and a long-lived codebase (its module system maps cleanly onto the domain modules in [01-architecture.md](01-architecture.md)); otherwise **Express** to start. The rest of these docs are framework-agnostic and work with either.

---

## 4. Architecture Decision Records (ADRs)

> Keep adding ADRs here as you make significant decisions. Template at the bottom.

### ADR-001: Modular monolith first
- **Status:** Accepted
- **Context:** Need to ship fast but stay scalable.
- **Decision:** Build a modular monolith with clear domain boundaries; extract services later.
- **Consequences:** Lower ops overhead now; requires discipline to keep module boundaries clean.

### ADR-002: PostgreSQL + PostGIS as primary datastore
- **Status:** Accepted
- **Context:** Relational, transactional, geospatial needs.
- **Decision:** Postgres + PostGIS; Redis for cache/queue.
- **Consequences:** Strong consistency & geo queries; team must know SQL/PostGIS.

### ADR-003: Stripe for payments + Connect for payouts
- **Status:** Accepted
- **Context:** Two-sided marketplace needs to charge drivers and pay operators while staying PCI-compliant.
- **Decision:** Stripe Payment Intents for charges; Stripe Connect (Express accounts) for operator onboarding/payouts.
- **Consequences:** Offloads PCI scope and payout complexity; tied to Stripe's fees/availability.

### ADR-004: Google Maps Platform for geo
- **Status:** Accepted (per your choice)
- **Context:** Need geocoding, maps, places autocomplete, directions.
- **Decision:** Use Google Maps Platform.
- **Consequences:** Rich data & familiar UX; usage-based cost — must cache geocoding and monitor quota. (Mapbox is the fallback alternative.)

### ADR-005: JWT access + refresh token auth
- **Status:** Accepted
- **Context:** Stateless, horizontally scalable auth for SPA clients.
- **Decision:** Short-lived access tokens + refresh tokens (rotated, stored server-side/Redis).
- **Consequences:** Stateless API scaling; must handle refresh rotation & revocation.

### ADR template
```
### ADR-00X: <title>
- Status: Proposed | Accepted | Superseded
- Context: <why this decision is needed>
- Decision: <what you chose>
- Consequences: <trade-offs, follow-ups>
```

---

## 5. Cost-awareness notes
- **Google Maps:** geocoding and Places calls cost money — **cache geocoding results**, debounce autocomplete, and restrict API keys by referrer/IP.
- **Stripe:** per-transaction fees + Connect fees; factor into the service fee.
- **Start lean:** managed Postgres/Redis (Neon/Supabase + Upstash) and Render/Fly.io keep early infra cheap; migrate to AWS/GCP as you scale.
