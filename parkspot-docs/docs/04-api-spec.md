# 04 — API Specification

A versioned **REST API** over HTTPS. Base path: `/api/v1`. Maintain a machine-readable **OpenAPI/Swagger** spec alongside the code; this document is the human-readable contract.

---

## 1. Conventions

- **Format:** JSON request/response, `Content-Type: application/json`.
- **Auth:** `Authorization: Bearer <access_token>` for protected routes.
- **IDs:** UUID strings.
- **Money:** integer **cents** + `currency` (e.g., `"USD"`).
- **Time:** ISO-8601 UTC (`2026-06-11T14:00:00Z`).
- **Pagination:** `?page=1&limit=20` → response includes `meta: { page, limit, total, totalPages }`.
- **Filtering/sorting:** `?sort=distance&filter[ev_charging]=true`.
- **Idempotency:** mutating money endpoints accept `Idempotency-Key` header.
- **Versioning:** path-based (`/api/v1`).

### Standard success envelope
```json
{ "data": { /* ... */ }, "meta": { /* optional */ } }
```

### Standard error envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "end_at must be after start_at",
    "details": [{ "field": "end_at", "issue": "must be after start_at" }],
    "requestId": "req_abc123"
  }
}
```

### Status codes
| Code | Meaning |
|------|---------|
| 200 / 201 | OK / Created |
| 204 | No content (e.g., delete) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (role/ownership) |
| 404 | Not found |
| 409 | Conflict (e.g., sold out, duplicate) |
| 422 | Unprocessable (business rule failed) |
| 429 | Rate limited |
| 500 | Server error |

---

## 2. Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | – | Create account (`role` default driver) |
| POST | `/auth/login` | – | Email+password → access + refresh tokens |
| POST | `/auth/refresh` | refresh | Rotate tokens |
| POST | `/auth/logout` | yes | Revoke refresh token |
| POST | `/auth/verify-email` | – | Confirm email via token |
| POST | `/auth/forgot-password` | – | Send reset email |
| POST | `/auth/reset-password` | – | Set new password via token |
| GET | `/auth/me` | yes | Current user profile |

**Register**
```http
POST /api/v1/auth/register
{ "email": "dana@example.com", "password": "S3cure!pass", "fullName": "Dana Driver" }
→ 201
{ "data": { "user": { "id": "...", "email": "...", "role": "driver" },
            "accessToken": "jwt...", "refreshToken": "jwt..." } }
```

---

## 3. Users, vehicles, payment methods

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/PATCH | `/users/me` | driver+ | Get/update profile |
| GET/POST | `/users/me/vehicles` | driver | List/add vehicles |
| PATCH/DELETE | `/users/me/vehicles/:id` | driver | Update/remove |
| GET/POST | `/users/me/payment-methods` | driver | List/attach Stripe PM |
| DELETE | `/users/me/payment-methods/:id` | driver | Remove |
| GET/POST | `/users/me/business-profile` | driver | Manage business profile |

---

## 4. Search (public)

```http
GET /api/v1/search
  ?lat=41.8781&lng=-87.6298        # OR ?address=233+S+Wacker,Chicago
  &start=2026-06-12T17:00:00Z
  &end=2026-06-12T22:00:00Z
  &radius=2000                     # meters, optional
  &filter[ev_charging]=true
  &filter[covered]=true
  &sort=price|distance|rating
  &page=1&limit=20
```
Response:
```json
{
  "data": [
    {
      "facilityId": "fac_123",
      "name": "Wacker Garage",
      "type": "garage",
      "distanceMeters": 180,
      "walkMinutes": 3,
      "coordinates": { "lat": 41.8779, "lng": -87.6310 },
      "priceCents": 2400,
      "currency": "USD",
      "available": true,
      "avgRating": 4.6,
      "reviewCount": 212,
      "amenities": ["covered", "ev_charging", "in_out_privileges"],
      "coverPhotoUrl": "https://cdn.../cover.jpg"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 37, "totalPages": 2,
            "searchCenter": { "lat": 41.8781, "lng": -87.6298 } }
}
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Geospatial + temporal availability search |
| GET | `/search/autocomplete?q=` | Address/venue suggestions (proxies Google Places) |
| GET | `/facilities/:id` | Public facility detail (photos, rates, amenities, reviews) |
| GET | `/facilities/:id/availability?start=&end=` | Capacity check + price quote for a window |
| GET | `/facilities/:id/reviews` | Paginated reviews |

**Price quote**
```json
GET /facilities/fac_123/availability?start=...&end=...
{ "data": { "available": true, "spotsLeft": 12,
  "quote": { "basePriceCents": 2000, "serviceFeeCents": 300, "taxCents": 100, "totalCents": 2400, "currency": "USD" } } }
```

---

## 5. Bookings (driver)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings` | driver | Create reservation (PENDING hold) + PaymentIntent |
| POST | `/bookings/batch` | driver | Multiple bookings (multi-day) |
| GET | `/bookings` | driver | List my reservations (filter by status) |
| GET | `/bookings/:id` | driver | Reservation detail |
| GET | `/bookings/:id/pass` | driver | Digital pass (QR + access info) |
| PATCH | `/bookings/:id` | driver | Edit times (subject to availability/policy) |
| POST | `/bookings/:id/cancel` | driver | Cancel + refund per policy |
| GET | `/bookings/:id/receipt` | driver | Receipt (PDF/JSON) |

**Create booking**
```http
POST /api/v1/bookings
Idempotency-Key: 7c9e...-uuid
{
  "facilityId": "fac_123",
  "start": "2026-06-12T17:00:00Z",
  "end": "2026-06-12T22:00:00Z",
  "vehicleId": "veh_55",
  "promoCode": "SAVE10"
}
→ 201
{
  "data": {
    "reservation": { "id": "res_789", "code": "PS-4F2A9", "status": "pending",
                     "holdExpiresAt": "2026-06-11T14:10:00Z", "totalCents": 2160 },
    "payment": { "clientSecret": "pi_..._secret_..." }   // confirm with Stripe.js
  }
}
```
- On `409`: `{"error":{"code":"NO_CAPACITY","message":"Sold out for selected window"}}`.
- Confirmation finalizes via Stripe webhook (`payment_intent.succeeded`) → status `confirmed`, pass generated.

**Pass**
```json
GET /bookings/res_789/pass
{ "data": {
  "code": "PS-4F2A9",
  "qrData": "PS-4F2A9|fac_123|2026-06-12T17:00Z",
  "facility": { "name": "Wacker Garage", "address": "...", "accessInstructions": "Pull a ticket; scan QR at kiosk." },
  "vehicle": { "plate": "ABC1234", "state": "IL" },
  "window": { "start": "...", "end": "..." },
  "directionsUrl": "https://maps.google.com/?..." } }
```

---

## 6. Operator endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/operator/onboarding` | operator | Start Stripe Connect onboarding (returns link) |
| GET | `/operator/onboarding/status` | operator | KYC/payout status |
| GET/POST | `/operator/facilities` | operator | List/create facilities |
| GET/PATCH/DELETE | `/operator/facilities/:id` | operator | Manage a facility |
| POST | `/operator/facilities/:id/submit` | operator | Submit for admin review |
| POST/DELETE | `/operator/facilities/:id/photos` | operator | Upload/remove photos |
| GET/POST | `/operator/facilities/:id/rate-rules` | operator | Manage pricing |
| PATCH/DELETE | `/operator/rate-rules/:id` | operator | Update/remove rate |
| GET/POST | `/operator/facilities/:id/availability` | operator | Blackouts/capacity overrides |
| GET | `/operator/reservations` | operator | Incoming reservations |
| POST | `/operator/reservations/:id/validate` | operator | Validate a scanned pass |
| GET | `/operator/earnings` | operator | Earnings summary |
| GET | `/operator/payouts` | operator | Payout history |

---

## 7. Admin endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | admin | List/search users |
| PATCH | `/admin/users/:id` | admin | Suspend/verify/change role |
| GET | `/admin/facilities?status=pending_review` | admin | Moderation queue |
| POST | `/admin/facilities/:id/approve` | admin | Approve listing |
| POST | `/admin/facilities/:id/reject` | admin | Reject with reason |
| GET | `/admin/bookings` | admin | All bookings |
| POST | `/admin/bookings/:id/refund` | admin | Manual refund |
| GET/POST | `/admin/promo-codes` | admin | Manage promos |
| GET | `/admin/analytics/overview` | admin | GMV, bookings, revenue, occupancy |
| GET | `/admin/cities` | admin | Manage markets |

---

## 8. Webhooks (inbound from Stripe)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/stripe` | Verify signature; handle `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`, `payout.paid` |

> Webhook handlers must be **idempotent** (dedupe by event id) and respond `200` quickly; do heavy work via the queue.

---

## 9. Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bookings/:id/review` | driver | Create review (only after `completed`) |
| GET | `/facilities/:id/reviews` | – | List reviews |

---

## 10. Rate limiting & security headers
- Global rate limit (e.g., 100 req/min/IP); stricter on `/auth/*` (e.g., 5–10/min).
- `Idempotency-Key` required on `POST /bookings` and refund endpoints.
- CORS allow-list for the web app origins.
- See [06-auth-security.md](06-auth-security.md).

---

## 11. Realtime (WebSocket) — optional
- `ws /realtime` with JWT auth.
- Events: `reservation.confirmed`, `reservation.cancelled` (to driver), `reservation.created` (to operator dashboard).
