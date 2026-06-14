# 11 — Project Setup Guide

Practical guide to scaffold the repo and run ParkSpot locally.

---

## 1. Prerequisites
- **Node.js** v20+ (LTS) and **pnpm** (`npm i -g pnpm`)
- **Docker** + Docker Compose
- **Git**
- Accounts/keys: **Stripe** (test mode), **Google Maps Platform** (with Maps JS, Places, Geocoding, Directions enabled)

---

## 2. Recommended repository structure (monorepo)

```
parkspot/
├─ apps/
│  ├─ api/                 # Node.js backend (Express/NestJS + Prisma)
│  │  ├─ src/
│  │  │  ├─ modules/       # auth, users, facilities, search, bookings,
│  │  │  │                 # payments, reviews, notifications, admin
│  │  │  ├─ common/        # middleware, errors, guards, utils
│  │  │  ├─ config/        # env, logger
│  │  │  ├─ db/            # prisma client, raw geo queries
│  │  │  └─ main.ts
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/
│  │  │  └─ seed.ts
│  │  └─ Dockerfile
│  ├─ web/                 # Driver React app (Vite)
│  ├─ operator/            # Operator dashboard (Vite)
│  └─ admin/               # Admin panel (Vite)
├─ packages/
│  ├─ ui/                  # shared design system
│  ├─ api-client/          # typed client + React Query hooks
│  ├─ types/               # shared TS types + Zod schemas
│  └─ config/              # eslint, tsconfig, tailwind preset
├─ docker-compose.yml
├─ turbo.json
├─ package.json            # workspaces
├─ pnpm-workspace.yaml
└─ .env.example
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 3. Environment variables (`.env.example`)

> Copy to `.env` (and per-app `.env` files) and fill in. **Never commit real secrets.**

```bash
# ---- Backend (apps/api) ----
NODE_ENV=development
PORT=4000
API_BASE_URL=https://ghostwhite-badger-995775.hostingersite.com

# Database (PostGIS-enabled Postgres)
DATABASE_URL=postgresql://parkspot:parkspot@localhost:5432/parkspot?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PLATFORM_FEE_PCT=0.15

# Google Maps (server key, IP-restricted)
GOOGLE_MAPS_SERVER_KEY=xxx

# Email / SMS
SENDGRID_API_KEY=xxx          # or RESEND_API_KEY
EMAIL_FROM=no-reply@parkspot.app
TWILIO_ACCOUNT_SID=xxx        # optional
TWILIO_AUTH_TOKEN=xxx         # optional

# Object storage (S3 / R2 / MinIO)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=parkspot-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# CORS
WEB_ORIGIN=http://localhost:5173
OPERATOR_ORIGIN=http://localhost:5174
ADMIN_ORIGIN=http://localhost:5175

# ---- Frontend (apps/web etc.) — Vite needs VITE_ prefix ----
VITE_API_BASE_URL=https://ghostwhite-badger-995775.hostingersite.com/api/v1
VITE_GOOGLE_MAPS_BROWSER_KEY=xxx      # referrer-restricted
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

## 4. docker-compose (local infra)

```yaml
version: "3.9"
services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_USER: parkspot
      POSTGRES_PASSWORD: parkspot
      POSTGRES_DB: parkspot
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]
  mailhog:
    image: mailhog/mailhog
    ports: ["1025:1025", "8025:8025"]
volumes:
  pgdata:
  miniodata:
```

---

## 5. Getting started (commands)

```bash
# 1. Clone & install
git clone <repo> parkspot && cd parkspot
pnpm install

# 2. Start infra
docker compose up -d postgres redis minio mailhog

# 3. Configure env
cp .env.example .env   # then fill in keys

# 4. Database: migrate + seed
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

# 5. Run everything (Turborepo runs all dev scripts)
pnpm dev
# api → https://ghostwhite-badger-995775.hostingersite.com
# web (driver) → http://localhost:5173
# operator → http://localhost:5174
# admin → http://localhost:5175
# mailhog UI → http://localhost:8025
```

### First PostGIS migration (raw SQL alongside Prisma)
```sql
-- prisma/migrations/xxxx_postgis/migration.sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "facilities" ADD COLUMN "location" geography(Point, 4326);
CREATE INDEX "idx_facilities_location" ON "facilities" USING GIST ("location");
```

---

## 6. Suggested npm scripts (root)
```jsonc
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:seed": "pnpm --filter api prisma db seed",
    "db:studio": "pnpm --filter api prisma studio"
  }
}
```

---

## 7. Stripe local webhooks
```bash
# Install Stripe CLI, then:
stripe login
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
stripe trigger payment_intent.succeeded   # test events
```

---

## 8. Google Maps setup
1. Create a Google Cloud project; enable **Maps JavaScript API, Places API, Geocoding API, Directions API**.
2. Create **two keys**: a **browser key** (restrict by HTTP referrer → your frontend origins) and a **server key** (restrict by IP → your backend).
3. Set budget alerts; enable only the APIs you use. Cache geocoding results to control cost.

---

## 9. Coding conventions
- **TypeScript everywhere**, `strict: true`.
- Shared **Zod schemas** in `packages/types` validate on both client and server.
- **Conventional Commits** + PR reviews; CI must pass (lint, typecheck, tests).
- Keep module boundaries clean (don't import across domain modules' internals — go through their service interface) so services can be extracted later.
- Write tests with features; aim for meaningful coverage on pricing, availability, auth, and payment logic.

---

## 10. Definition of Done (per feature)
- [ ] Code + tests pass in CI
- [ ] Input validated (Zod) & errors handled
- [ ] AuthZ enforced (role + ownership)
- [ ] API documented (OpenAPI) & these docs updated if needed
- [ ] Works locally via docker-compose
- [ ] Reviewed & merged

---

## 11. Next step
Start with **[Phase 0 in the Roadmap](10-roadmap.md)**. Build one phase at a time; each ends with something you can demo. Good luck building ParkSpot! 🅿️
