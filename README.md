# CareBora

**Quality care, made accessible.** Kenya's API-first telehealth platform —
teleconsultations, home-based care, a pharmacy marketplace, and M-Pesa payments.

The backend is built as a versioned REST API so the web app today and a mobile
app later share one engine. See **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** for the
full plan, architecture, and milestones (M0–M8).

## Monorepo layout

```
carebora/
├─ apps/
│  └─ web/            # Next.js 16 app — first client + hosts the /api/v1 API
├─ packages/
│  ├─ shared/         # Zod schemas, error envelope, types (web + mobile)
│  ├─ db/             # Prisma schema + client + migrations
│  ├─ core/           # business logic / services (transport-agnostic)
│  └─ api-client/     # typed fetch SDK (web + future mobile)
├─ turbo.json        # Turborepo task pipeline
└─ PROJECT_PLAN.md   # build plan & milestones
```

## Quick start

```bash
npm install                 # install all workspaces (one root lockfile)
cp .env.example .env        # local DATABASE_URL points at Docker Postgres by default
docker compose up -d        # start local Postgres
npm run db:push             # apply the Prisma schema to the database
npm run dev                 # start the web app on http://localhost:3000
```

Health check (proves API + DB wiring): `GET http://localhost:3000/api/v1/health`

## Common scripts (run from repo root)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run all apps in dev (Turborepo) |
| `npm run build` | Production build |
| `npm run typecheck` | Typecheck every workspace |
| `npm run db:generate` | Regenerate the Prisma client from schema |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:push` | Push schema to the database (no migration file) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed demo data (implemented in M1) |

## Accounts you need to provision

These are external services. Create the account, then paste credentials into `.env`
(see `.env.example`). Most are only needed when you reach that milestone.

| Service | For | When | Status |
|---------|-----|------|--------|
| [Neon](https://neon.tech) | Postgres database | now (M0/M1) | ⬜ add `DATABASE_URL` |
| [Vercel](https://vercel.com) | hosting web + API | now (M0) | ⬜ link repo, Root Dir = `apps/web` |
| [Africa's Talking](https://africastalking.com) | SMS / phone OTP | M1 | ⬜ |
| [LiveKit](https://livekit.io) | video consultations | M3 | ⬜ |
| [M-Pesa Daraja](https://developer.safaricom.co.ke) | payments | M4 (start sandbox app **now** — approval can take days) | ⬜ |
| [Resend](https://resend.com) | transactional email | M1+ | ⬜ |

### Deploying to Vercel

Import the repo in Vercel and set **Root Directory = `apps/web`**. Vercel detects
Next.js and installs the npm workspace from the repo root automatically. Add the
env vars from `.env.example` in the Vercel project settings.

## Tech stack

TypeScript · Next.js 16 · React 19 · Tailwind 4 · Prisma ORM · PostgreSQL
(Docker locally / Neon in prod) · Zod · LiveKit · M-Pesa Daraja · Turborepo ·
Docker. Deployed on Vercel.
