# @carebora/web

The CareBora web app (Next.js 16, App Router) — the first client of the CareBora
API and the host for the `/api/v1` route handlers.

Run from the **repo root** (`npm run dev`), not here, so workspace packages link
correctly. See the [root README](../../README.md) and
[PROJECT_PLAN.md](../../PROJECT_PLAN.md).

## Conventions

- **API routes** live under `src/app/api/v1/*` and stay thin: parse input → call
  a service in `@carebora/core` → return via the helpers in `src/server/http.ts`.
- Every response uses the `{ data }` / `{ error }` envelope from `@carebora/shared`.
- The browser/app talks to the API through `@carebora/api-client`, never the DB.
