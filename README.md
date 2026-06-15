# CareBora

**Quality care, made accessible.** Kenya's API-first telehealth platform —
teleconsultations, home-based care, a pharmacy marketplace, and M-Pesa payments.

CareBora is built as a versioned REST API (`/api/v1`) so multiple clients — a web
dashboard, a future mobile app, partner integrations — share one backend engine.
There is no bundled end-user UI; the product surface is the API and its
interactive docs. See **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** for the full
architecture and milestone plan.

Milestones **M0–M8 are complete**: auth & RBAC, provider marketplace & booking,
teleconsultation (LiveKit + prescriptions/PDF), M-Pesa payments & ledger, pharmacy
& orders, home-based care, admin & operations, plus hardening, OpenAPI docs, demo
seed, and a Playwright E2E suite.

## Monorepo layout

```
carebora/
├─ apps/
│  └─ web/            # Next.js 16 app — hosts the /api/v1 REST API
├─ packages/
│  ├─ shared/         # Zod schemas, error envelope, shared types
│  ├─ db/             # Prisma schema + client + demo seed
│  ├─ core/           # business logic / services (transport-agnostic)
│  └─ api-client/     # typed fetch SDK (web + future mobile)
├─ turbo.json        # Turborepo task pipeline
└─ PROJECT_PLAN.md   # build plan & milestones
```

## Quick start

```bash
npm install                 # install all workspaces (one root lockfile)
cp .env.example .env        # local DATABASE_URL points at the Docker Postgres
docker compose up -d        # start local Postgres (or: see Podman note below)
npm run db:push             # apply the Prisma schema to the database
npm run db:seed             # load demo accounts + catalogue + bookable slots
npm run dev                 # start on http://localhost:3000
```

Then open:

- **API docs (Swagger UI):** http://localhost:3000/api/v1/docs
- **OpenAPI spec (JSON):** http://localhost:3000/api/v1/openapi
- **Health check:** http://localhost:3000/api/v1/health

> **Podman?** If you use Podman instead of Docker, start Postgres with:
> ```bash
> podman run -d --name carebora-postgres \
>   -e POSTGRES_USER=carebora -e POSTGRES_PASSWORD=carebora -e POSTGRES_DB=carebora \
>   -p 5432:5432 docker.io/library/postgres:16-alpine
> ```

## Demo accounts

After `npm run db:seed`, log in via `POST /api/v1/auth/login`. **Password for all:
`Demo1234!`**

| Email | Role | Notes |
|-------|------|-------|
| `admin@carebora.ke` | admin | Full admin/ops access |
| `dr.amina@carebora.ke` | doctor | GP · Nairobi · verified · has bookable slots |
| `dr.james@carebora.ke` | doctor | Paediatrics · Mombasa · verified |
| `dr.faith@carebora.ke` | doctor | OB-GYN · Nairobi · verified |
| `nurse.peter@carebora.ke` | nurse | Nairobi · verified |
| `nurse.grace@carebora.ke` | nurse | Kisumu · in_review (verification queue demo) |
| `alice@example.com` | patient | |
| `bob@example.com` | patient | |
| `carol@example.com` | patient | |

The seed also loads 15 pharmacy products (8 OTC + 7 prescription-only) and 30 days
of teleconsult slots for each doctor.

## Scripts (run from repo root)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run the app in dev (Turborepo) |
| `npm run build` | Production build |
| `npm run typecheck` | Typecheck every workspace |
| `npm run lint` | Lint every workspace |
| `npm run db:push` | Push schema to the database (no migration file) |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:generate` | Regenerate the Prisma client from schema |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Open Prisma Studio |

### End-to-end tests (Playwright)

```bash
npm run db:seed                       # tests assume seeded data
npm run e2e --workspace=@carebora/web # API E2E suite (auto-starts dev server)
```

## API conventions

- **Envelope:** success → `{ "data": ... }`, error → `{ "error": { "code", "message" } }`.
- **Status codes:** `422` validation (Zod), `400` business rule, `401`/`403` auth,
  `404` not found, `409` conflict, `503` payment-gateway unavailable.
- **Auth:** JWT access token (Bearer header or `cb_access` httpOnly cookie) +
  DB-backed rotating refresh token (`cb_refresh`). Role-gated via `requireAuth`.
- **Payments:** M-Pesa Daraja STK push; a single `/payments/mpesa/callback` webhook
  reconciles appointment payments, pharmacy orders, and home-visit payments.

## External services to provision

Create the account, then paste credentials into `.env` (see `.env.example`).
The app degrades gracefully when an integration is unconfigured (e.g. LiveKit and
M-Pesa return clear `400`/`503` errors rather than crashing), so you can run most
of the API locally with only Postgres.

| Service | For | Notes |
|---------|-----|-------|
| [Neon](https://neon.tech) | Postgres (prod) | Pooled `DATABASE_URL`; Docker/Podman locally |
| [Vercel](https://vercel.com) | hosting web + API | Root Directory = `apps/web` |
| [LiveKit](https://livekit.io) | video consultations | `LIVEKIT_API_KEY/SECRET/URL` |
| [M-Pesa Daraja](https://developer.safaricom.co.ke) | payments | start the sandbox app early — approval can take days |
| [Africa's Talking](https://africastalking.com) | SMS / phone OTP | |
| [Resend](https://resend.com) | transactional email | |

### Deploying to Vercel

Import the repo and set **Root Directory = `apps/web`**. Vercel detects Next.js and
installs the npm workspace from the repo root automatically. Add the env vars from
`.env.example` in the project settings.

## Tech stack

TypeScript · Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma ORM ·
PostgreSQL (Docker/Podman locally, Neon in prod) · Zod · `jose` JWT + scrypt ·
LiveKit · M-Pesa Daraja · pdf-lib · Turborepo · Playwright. Deployed on Vercel.
