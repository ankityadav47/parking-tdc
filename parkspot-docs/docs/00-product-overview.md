# 00 — Product Overview & Requirements

## 1. Vision

ParkSpot is an online marketplace that connects **drivers looking for parking** with **parking facility operators** (garages, lots, valets). Drivers reserve and pre-pay for a guaranteed spot; operators fill empty capacity and earn revenue. The platform earns a service fee on each booking.

**One-liner:** *"Look, Book, Park"* — find parking near your destination, reserve it in advance, and save.

---

## 2. Goals & Non-Goals

### Goals
- Let drivers find, compare, and book parking in seconds.
- Guarantee a spot for a chosen time window at a known price.
- Give operators tools to list inventory, set dynamic rates, and get paid.
- Be **scalable** to many cities, facilities, and concurrent bookings.

### Non-Goals (v1)
- Native iOS/Android apps (web-first; responsive PWA). Mobile apps are a later phase.
- On-street metered parking integration.
- Real-time gate/IoT hardware integration (assume QR/license-plate or staffed entry).
- Dynamic surge pricing engine (start with operator-set rates + simple rules).

---

## 3. Personas

| Persona | Description | Key needs |
|---------|-------------|-----------|
| **Dana the Driver** | Commuter/traveler needing parking near a destination | Fast search, trustworthy price, guaranteed spot, easy pass at the gate |
| **Omar the Operator** | Owns/manages a garage or lot | List spots, control availability & price, see earnings, get paid reliably |
| **Bianca the Business user** | Books parking for work, needs receipts | Business profile, expense reports, multiple bookings |
| **Adam the Admin** | Platform staff | Moderate listings, support users, resolve disputes, see analytics |

---

## 4. Core Features

### 4.1 Driver features
- Search parking by **destination address, venue, or "near me"** with **date/time range**.
- Map + list of nearby facilities with **price, distance, walk time, amenities, rating**.
- Filters: covered/uncovered, EV charging, accessibility (ADA), valet, in/out privileges, height clearance.
- Facility detail page: photos, address, rates, amenities, access instructions, reviews.
- **Booking & pre-payment** for a time window; instant confirmation.
- **Digital parking pass** (QR code / license plate / printable) with directions.
- Manage reservations: view, **edit times, cancel** (per cancellation policy), get refunds.
- **Multiple bookings** (book several days at once — e.g., hybrid commute).
- **Monthly parking** subscriptions.
- **Airport parking** category (long-term, shuttle info).
- Account: profile, saved vehicles, payment methods, booking history, receipts.
- Reviews & ratings after a completed booking.
- **Business profile**: separate expenses, downloadable receipts.

### 4.2 Operator features
- Onboarding & KYC (Stripe Connect).
- Create/manage **facilities** (location, photos, access hours, instructions).
- Define **spaces/inventory** and **capacity**.
- **Rate management**: hourly, daily, monthly, event pricing; time-based rules.
- **Availability calendar** & blackout dates.
- View & manage **incoming reservations**.
- **Earnings dashboard** & payout history.
- Scan/validate driver passes (operator-side validation view).

### 4.3 Admin features
- User management (drivers, operators) — suspend, verify.
- **Listing moderation** & approval workflow.
- Booking & dispute management, manual refunds.
- City/market management.
- Platform analytics: GMV, bookings, occupancy, revenue, top facilities.
- Content management (FAQ, policies, promo codes).

---

## 5. User Stories (selected)

> Format: *As a `<role>`, I want `<capability>` so that `<benefit>`.*

### Driver
- As a driver, I want to search parking near my destination for a date/time range so that I can see available options and prices.
- As a driver, I want to filter by EV charging so that I can charge while parked.
- As a driver, I want to pay online and get a confirmation so that my spot is guaranteed.
- As a driver, I want a QR pass so that I can enter the garage without hassle.
- As a driver, I want to cancel before my start time so that I can get a refund when plans change.

### Operator
- As an operator, I want to list my garage with photos and rates so that drivers can book it.
- As an operator, I want to set different prices for events so that I maximize revenue.
- As an operator, I want to limit how many bookings overlap so that I never oversell capacity.
- As an operator, I want automatic payouts so that I receive my earnings without manual invoicing.

### Admin
- As an admin, I want to approve new listings so that only legitimate facilities go live.
- As an admin, I want to issue a refund so that I can resolve a customer complaint.

A complete, prioritized backlog lives in [10-roadmap.md](10-roadmap.md).

---

## 6. Key Business Rules

1. **No overselling:** the number of overlapping confirmed reservations for a facility must never exceed its available capacity for that time window.
2. **Pricing:** total = base rate (from rate rules for the window) + taxes + service fee. Price is locked at booking time.
3. **Service fee:** platform takes a configurable % (e.g., 10–20%) of the base parking price.
4. **Cancellation policy:** free cancellation up to *N* minutes before start (configurable per facility); after that, partial/no refund.
5. **Payouts:** operators are paid the base price minus platform fee, on a schedule (e.g., daily/weekly) via Stripe Connect, typically after the reservation start (or completion).
6. **Time zones:** all times stored in UTC; displayed in the facility's local time zone.
7. **Search window validity:** start must be in the future (or within a small grace window); end must be after start.

---

## 7. Success Metrics (KPIs)

- **Conversion rate:** searches → bookings.
- **GMV** (gross merchandise value) and **net revenue**.
- **Occupancy/fill rate** per facility.
- **Repeat booking rate** & retention.
- **Time-to-book** (search to confirmation).
- **Cancellation & refund rate**.
- **Operator NPS / driver rating**.

---

## 8. Assumptions & Constraints

- Web-first, mobile-responsive; PWA-capable.
- USD currency and US-style addresses initially; design for i18n/multi-currency later.
- Google Maps for geocoding/maps; Stripe for payments.
- Legal/compliance (PCI via Stripe, tax handling) handled at the integration layer, not custom-built.

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| **Facility** | A parking location (garage, lot, valet) listed by an operator |
| **Space / inventory** | Bookable capacity within a facility |
| **Rate / rate rule** | Pricing for a time window (hourly/daily/monthly/event) |
| **Reservation / booking** | A driver's confirmed, paid right to park for a window |
| **Pass** | Digital proof of reservation (QR / license plate) |
| **Payout** | Money transferred to an operator for completed bookings |
| **GMV** | Total value of all bookings processed |
