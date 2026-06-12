# CareBora — Build Plan & Milestones

> **CareBora** — *Quality care, made accessible.*
> Kenya's API-first telehealth platform: remote consultations, home-based care,
> a pharmacy marketplace, and M-Pesa payments — built as a clean backend API so
> the same engine powers web today and mobile tomorrow.

- **Owner / Engineer:** solo build (Edwin)
- **Status:** planning → build
- **Plan created:** 2026-06-12
- **Origin doc:** *Telehealth SME start-up* business plan (formerly "Genz Hospital")
- **Primary goal:** ship a **complete, investor-ready full stack** — investors have
  said financing follows a working end-to-end product, not a prototype.

---

## Table of Contents

1. [Vision & Naming](#1-vision--naming)
2. [Guiding Principles](#2-guiding-principles)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Core Domains & Data Model](#5-core-domains--data-model)
6. [API Design](#6-api-design)
7. [Milestones](#7-milestones)
8. [Definition of Done](#8-definition-of-done)
9. [Investor-Readiness Checklist](#9-investor-readiness-checklist)
10. [Out of Scope (Parking Lot)](#10-out-of-scope-parking-lot)
11. [Daily Working Rhythm](#11-daily-working-rhythm)
12. [Risks & Mitigations](#12-risks--mitigations)

---

## 1. Vision & Naming

**CareBora** = English *care* + Swahili *bora* ("best / excellent"). Friendly,
quality-signalling, easy to say, and distinct enough to own a domain and trademark.

- **Suggested domain:** `carebora.co.ke` (web) + `api.carebora.co.ke` (API)
- **Tagline options:** *"Quality care, made accessible."* / *"Afya bora, popote ulipo."*
- **Tone:** warm, modern, trustworthy — friendly enough for Gen-Z, credible enough for clinicians.

**The product (six core flows):**

| # | Flow | What it does |
|---|------|--------------|
| 1 | **Auth & Profiles** | Patients and providers sign up, verify, manage profiles |
| 2 | **Book a Provider** | Browse verified doctors/facilities, view profiles, book a slot |
| 3 | **Teleconsultation** | Live video + chat consult, clinical notes, digital prescriptions |
| 4 | **M-Pesa Payments** | Real Daraja STK-push payments, receipts, refunds |
| 5 | **Pharmacy Shop** | Medication catalogue, cart, checkout, delivery tracking |
| 6 | **Home-Based Care** | Request a nurse / physiotherapist to visit; assignment & visit lifecycle |

---

## 2. Guiding Principles

1. **API-first.** Every feature is a documented, versioned, auth-protected HTTP API.
   The web app is *a client* of that API — never a privileged shortcut. This is what
   makes the future mobile app (React Native or Flutter) a thin add-on, not a rewrite.
2. **One source of truth for types.** Validation schemas (Zod) and the DB schema
   (Prisma) live in shared packages, consumed by both server and clients. No drift.
3. **Transport-agnostic business logic.** Domain logic lives in a service layer
   (`packages/core`), called by API route handlers. We could swap Next.js for a
   standalone server without rewriting business rules.
4. **Secure by default.** Role-based access on every endpoint, secrets server-side,
   medical data encrypted at rest, audit trails on clinical actions. Kenya Data
   Protection Act 2019 in mind from day one.
5. **Deploy continuously.** It's live on a URL from M0. Investors can click it any day.
6. **Build vertically, not horizontally.** Finish a flow end-to-end (DB → API → UI →
   deployed) before starting the next. Always have a working product.

---

## 3. Architecture

```
                          ┌─────────────────────────┐
                          │        Clients          │
                          │  ┌──────┐   ┌─────────┐  │
                          │  │ Web  │   │ Mobile  │  │  ← later, reuses same API
                          │  │(Next)│   │(RN/Flut)│  │
                          │  └──┬───┘   └────┬────┘  │
                          └─────┼────────────┼───────┘
                                │   HTTPS    │
                                ▼   /api/v1  ▼
                     ┌────────────────────────────────┐
                     │   CareBora API (versioned REST) │
                     │  Route handlers → service layer │
                     │  Zod validation · JWT auth · RBAC│
                     └───┬─────────┬─────────┬─────────┘
                         │         │         │
        ┌────────────────┘   ┌─────┘    ┌────┘────────────┐
        ▼                    ▼          ▼                 ▼
  ┌───────────┐      ┌──────────────┐ ┌─────────┐ ┌───────────────┐
  │ PostgreSQL│      │   LiveKit    │ │ M-Pesa  │ │  Storage +    │
  │  (Neon) + │      │  (video/chat)│ │ Daraja  │ │  Email + SMS  │
  │  Prisma   │      └──────────────┘ └─────────┘ │ (Blob/Resend/ │
  └───────────┘                                   │  Africa'sTalk)│
                                                  └───────────────┘
```

**Repository shape — Turborepo monorepo** (set up at M0 so mobile slots in cleanly):

```
carebora/
├─ apps/
│  ├─ web/            # Next.js 16 app — first client + hosts the API routes
│  └─ mobile/         # (later) Expo / React Native — consumes packages/api-client
├─ packages/
│  ├─ core/           # business logic / services (transport-agnostic)
│  ├─ db/             # Prisma schema, migrations, client
│  ├─ shared/         # Zod schemas, types, constants, enums  (shared web+mobile)
│  ├─ api-client/     # typed fetch SDK generated from the API (web+mobile use it)
│  └─ ui/             # (optional) shared design tokens
├─ turbo.json
└─ package.json       # workspaces
```

> The API lives under `apps/web/app/api/v1/*` as Next.js Route Handlers, but all
> logic is delegated to `packages/core`. If we later need a standalone backend,
> we lift `packages/core` out untouched.

---

## 4. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Language** | TypeScript (strict) | One language across API, web, future mobile |
| **Web framework** | Next.js 16 (App Router) + React 19 | Already scaffolded; great DX; hosts API too |
| **Styling / UI** | Tailwind CSS 4 + shadcn/ui | Fast, consistent, friendly design system |
| **Monorepo** | Turborepo + npm workspaces | Shared packages for mobile reuse |
| **API style** | Versioned REST (`/api/v1`) + OpenAPI | Portable to any mobile stack (RN *or* Flutter) |
| **Validation** | Zod (shared schemas) | Single source of truth, runtime-safe |
| **Database** | PostgreSQL — **Docker** locally, **Neon** (serverless) in prod | Consistent local dev; scales to zero, Vercel-friendly in prod |
| **ORM / migrations** | **Prisma ORM** | Type-safe, great DX, mature migrations, hireable |
| **Auth** | JWT (access + refresh) + httpOnly cookie for web, bearer for mobile | Works identically for web and mobile clients |
| **Video / RTC** | **LiveKit** (cloud or self-host) | Open-source, has RN *and* Flutter SDKs, data channels for chat |
| **Payments** | **M-Pesa Daraja** (STK push, C2B/B2C callbacks) | The Kenyan payment rail; proves revenue model |
| **File storage** | Vercel Blob (or S3) | Prescriptions, KYC docs, product images |
| **Email** | Resend | Transactional email, receipts |
| **SMS / OTP** | Africa's Talking | Local SMS + OTP for phone verification |
| **Hosting** | Vercel (web+API) · Neon (DB) · LiveKit Cloud | Solo-friendly, fast deploys, previews |
| **Testing** | Vitest (unit) + Playwright (E2E critical flows) | Confidence on the flows investors will click |

**Auth note for mobile-readiness:** the auth endpoints issue JWTs. Web stores the
refresh token in an httpOnly cookie; mobile stores it in secure storage and sends a
bearer token. Same endpoints, same logic — no mobile-specific backend later.

---

## 5. Core Domains & Data Model

High-level entities (full schema designed in M0/M1):

- **User** — base identity; `role`: `patient | doctor | nurse | physio | pharmacy | admin`
- **PatientProfile** — demographics, medical history pointer, location
- **ProviderProfile** — specialty, license #, verification status, bio, fees, ratings
- **Facility** — pharmacies, labs, clinics (for the provider network)
- **Availability / Slot** — provider schedule
- **Appointment** — booking linking patient ↔ provider, type (`teleconsult | home_visit`), status
- **Consultation** — the session: LiveKit room, chat messages, clinical notes
- **Prescription** — issued from a consultation; links to pharmacy orders
- **Product / Inventory** — pharmacy catalogue, stock, price
- **Order / OrderItem** — pharmacy purchases, delivery status
- **HomeVisitRequest** — request → assignment → visit lifecycle, location, status
- **Payment / LedgerEntry** — M-Pesa transactions, receipts, refunds, commissions
- **VerificationDocument** — provider KYC / license uploads
- **AuditLog** — clinical & admin actions (compliance)

---

## 6. API Design

- **Base:** `/api/v1` — versioned so we never break mobile clients on the field.
- **Auth:** `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`,
  `/auth/verify-phone`, `/auth/me`.
- **Resources:** RESTful and predictable, e.g.
  - `GET /providers?specialty=&location=&verified=true`
  - `GET /providers/:id` · `GET /providers/:id/availability`
  - `POST /appointments` · `GET /appointments/:id` · `PATCH /appointments/:id`
  - `POST /consultations/:id/token` (LiveKit join token) · `GET /consultations/:id/messages`
  - `POST /consultations/:id/prescriptions`
  - `GET /products` · `POST /orders` · `GET /orders/:id`
  - `POST /home-visits` · `PATCH /home-visits/:id` (assign / accept / complete)
  - `POST /payments/mpesa/stk` · `POST /payments/mpesa/callback` (webhook)
  - Admin: `/admin/verifications`, `/admin/providers`, `/admin/analytics`
- **Every endpoint:** Zod-validated input, RBAC-checked, typed response, consistent
  error envelope `{ error: { code, message, details? } }`.
- **Docs:** OpenAPI spec generated and served at `/api/docs` — this is the artifact
  that proves "mobile-ready" to investors and future hires.
- **SDK:** `packages/api-client` exposes a typed client both web and mobile import.

---

## 7. Milestones

Estimate: **~4 weeks of daily focused coding (~22–27 build-days)** for a solo dev to
build all six flows *well* + admin + hardening + deploy. Milestones are vertical
slices — each ends with something deployed and demoable.

> **Suggested cadence** (flexible — milestones, not deadlines):
> - **Week 1 (Jun 12–18):** M0, M1, M2 → *you can browse providers and book*
> - **Week 2 (Jun 19–25):** M3, M4 → *you can consult on video and pay with M-Pesa*
> - **Week 3 (Jun 26–Jul 2):** M5, M6 → *pharmacy and home-visits live*
> - **Week 4 (Jul 3–9):** M7, M8 → *admin, hardening, investor demo*

### M0 — Foundation & Architecture  *(~2–3 days)*
Rebrand to **CareBora**; convert to Turborepo monorepo; set up `packages/{db,shared,core,api-client}`;
Postgres (Docker local / Neon prod) + Prisma wired; design system (Tailwind theme + shadcn/ui, friendly palette,
logo placeholder); API conventions (error envelope, Zod, versioning); auth scaffolding;
CI + Vercel deploy pipeline; seed script skeleton. **Exit:** empty-but-real app deployed,
DB connected, one health-check API endpoint live.

### M1 — Identity & Profiles  *(~2–3 days)*
Full auth API (register/login/refresh/logout, phone OTP via Africa's Talking); roles &
RBAC middleware; patient + provider profile CRUD; provider KYC document upload;
verification status. **Exit:** a patient and a provider can sign up, verify, and edit
profiles — entirely through the API.

### M2 — Provider Marketplace & Booking  *(~3 days)*
Provider directory with search/filter; provider profile pages; availability/slots;
appointment booking API + lifecycle (`requested → confirmed → completed/cancelled`);
patient & provider dashboards listing appointments. **Exit:** browse verified providers
and book a real appointment slot.

### M3 — Teleconsultation  *(~3–4 days)*
LiveKit integration (room + join tokens); consultation room UI (video + persisted in-call
chat); consult lifecycle tied to a booking; clinical notes; digital prescription generation
(PDF). **Exit:** patient and doctor hold a live video+chat consult; doctor issues a prescription.

### M4 — Payments (M-Pesa)  *(~3 days)*
Daraja STK-push; callback/webhook handling; payment records + receipts; ledger with
platform commission; refund path. Wire payments to bookings/consults. **Exit:** a real
(sandbox) M-Pesa payment completes a booking and produces a receipt.

### M5 — Pharmacy & E-commerce  *(~3 days)*
Product catalogue + inventory; cart; checkout via M-Pesa; prescription-linked orders;
delivery status tracking. **Exit:** buy medication end-to-end and track the order.

### M6 — Home-Based Care  *(~2–3 days)*
Request-a-nurse/physio flow; assignment/matching; scheduling; visit lifecycle with
status updates and location; post-visit notes. **Exit:** request a home visit, get a
provider assigned, complete the visit.

### M7 — Admin & Operations  *(~2–3 days)*
Admin dashboard: provider verification queue, onboarding, catalogue/inventory management,
order oversight, basic analytics & reporting (users, consults, revenue). **Exit:** an admin
can run the platform.

### M8 — Hardening, Docs & Launch  *(~2–3 days)*
OpenAPI docs + `api-client` SDK; security pass (rate limiting, input hardening, secrets,
audit logs); seed data with demo accounts; Playwright E2E on the six flows; production
deploy; **investor demo script + 10-minute walkthrough**. **Exit:** investor-ready.

---

## 8. Definition of Done

A milestone is done only when:

- [ ] Feature is exposed as a **versioned, Zod-validated, RBAC-protected API endpoint**
- [ ] Business logic lives in `packages/core` (not inline in the route)
- [ ] Web UI consumes it **via `packages/api-client`** (no privileged DB shortcuts)
- [ ] DB changes are in a **Prisma migration** (not hand-edited)
- [ ] It's **deployed** and works on the live URL with seed data
- [ ] Critical path has at least a smoke test
- [ ] No secrets in client code; inputs validated; errors return the standard envelope

---

## 9. Investor-Readiness Checklist

- [ ] All six flows work end-to-end on a **live production URL**
- [ ] Seed **demo accounts** (patient, doctor, nurse, pharmacy, admin) ready to click
- [ ] A real **M-Pesa sandbox payment** completes during the demo
- [ ] A real **video consultation** runs during the demo
- [ ] **OpenAPI spec** published — concrete proof the backend is mobile-ready
- [ ] 10-minute **demo script** rehearsed
- [ ] One-page **architecture diagram** (this doc's §3) to show technical depth

---

## 10. Out of Scope (Parking Lot)

Deliberately deferred until after the investor-ready stack is shipped:

- Native **mobile app** build (architecture already supports it — that's the point)
- **Cryptocurrency** payments (BTC/ETH/stablecoins)
- **AI** features: provider matching, NLP symptom checker, demand forecasting
- **Insurance / NHIF** integration and corporate health plans
- **IoT / wearables** and blockchain medical records
- Full **Swahili / local-language i18n** (architect for it now, translate later)
- Advanced logistics: cold-chain, route optimization, courier dispatch

---

## 11. Daily Working Rhythm

To sustain daily coding without burning out:

1. **Start each day** by re-reading the current milestone's Exit criterion.
2. **One vertical slice at a time:** schema → migration → service → API → UI → deploy.
3. **Commit small, deploy often.** End every day on green (it builds and deploys).
4. **End-of-day log:** jot what shipped + the first task for tomorrow (kills startup lag).
5. **If a day runs long,** push the *depth* (extra fields, edge cases) forward — never
   ship a half-wired flow that can't be demoed.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scope is large for one person | Vertical slices; strict parking lot; depth-before-breadth cut-line |
| M-Pesa Daraja onboarding delays | Start sandbox credentials early (during M0/M1), not at M4 |
| WebRTC complexity eats days | Use managed **LiveKit** (don't hand-roll signaling) |
| Compliance (Data Protection Act) | RBAC + encryption + audit logs from M0; legal review pre-launch |
| Solo bus-factor / momentum | Daily deploy + end-of-day log; everything in git; this plan as the map |
| "Complete stack" goalpost moving | §9 checklist is the shared, written definition of complete |

---

*Next step: kick off **M0 — Foundation & Architecture** (rebrand to CareBora + monorepo + DB + deploy pipeline).*
