# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Orbit — a multi-tenant booking SaaS admin, reconstructed from `orbit.homo.tw`. Frontend was reverse-engineered 1:1 from the production bundle (design tokens, page structure, all copy); the backend is a from-scratch implementation of the contract in `docs/SPEC.md`, storing data in Supabase (Postgres). Docs and all UI copy are in Traditional Chinese (zh-TW).

Live deploy: https://new-orbit.vercel.app · Demo login: `demo@orbit.test` / `demo1234` · Demo tenant slug: `midao` (`/midao` = customer storefront, `/midao/dashboard` = admin).

## Commands

```bash
cp .env.example .env      # then fill SUPABASE_SERVICE_ROLE_KEY and AUTH_SECRET
npm install
npm run db:check          # verify DB connectivity + seed data
npm run dev:all           # API server (8080) + Vite dev server (5173) together
npm run dev               # frontend only (Vite proxies /api → 8080)
npm run api               # backend only (server/index.js)
npm run build             # production build (vite build)
```

There is no unit-test suite and no linter, but there IS an end-to-end smoke harness — **run it after any backend change and before declaring work done**:

```bash
npm run smoke             # against the live deploy (default new-orbit.vercel.app)
npm run smoke:local       # against a locally running `npm run api`
```

`scripts/smoke.mjs` checks auth (401/403/404), tenant isolation, secret masking, and a write roundtrip; it exits non-zero on any failure. After pushing to `main`, wait for the Vercel deploy to finish, then run `npm run smoke` against production. See `docs/WORKPLAN.md` for the full development playbook and the per-task acceptance criteria.

## Architecture

### One router, two HTTP entry points

All API logic lives in `server/router.js` as a single `handle(method, pathname, query, body, headers)` function implementing the REST contract from `docs/SPEC.md §5`. Two thin wrappers call it:

- `server/index.js` — zero-framework local Node server (reads `.env` itself, no dotenv).
- `api/handler.js` — Vercel serverless entry. **Vercel gotcha:** filename catch-all (`api/[...path].js`) did not match multi-segment paths, so `vercel.json` explicitly rewrites `/api/:path*` → `/api/handler?__path=:path*` and the handler reconstructs the original path from `__path`. Don't rename `api/handler.js` or drop that rewrite.

`server/supabase.js` creates the service_role client lazily (serverless must not crash on cold start) and provides `resolveOrgId()` (uuid or slug → org uuid). `server/mappers.js` converts DB snake_case ↔ API camelCase. `server/seed.sql` re-seeds the demo tenant; schema/migrations documented in `server/DATABASE.md`.

### Security model (must be preserved)

- Every table has **RLS enabled with zero policies** → the anon key reads nothing; only the backend's `SUPABASE_SERVICE_ROLE_KEY` can touch data. (Supabase advisor flags `rls_enabled_no_policy` — that is intentional, not a bug.)
- Because service_role bypasses RLS, **tenant isolation is entirely the router's job**: the auth guard checks that the token's `staff` list includes the resolved `orgId`, and queries filter by `org_id`.
- Passwords are bcrypt hashes verified inside the DB by `verify_login()` (SECURITY DEFINER); hashes never leave Postgres.
- Login tokens are HS256-signed (`server/auth.js`, `AUTH_SECRET`). No token on a protected endpoint → 401; token for another org → 403.
- Tenant secrets (LINE channel tokens, ECPay/JKoPay keys) are **write-only**: GET returns only `hasXxx` flags and `••••••••` masks; the frontend sends an empty string to mean "unchanged". Never echo raw secret values.
- `SUPABASE_SERVICE_ROLE_KEY` / `AUTH_SECRET` must never get a `VITE_` prefix (VITE_ vars are bundled into the public frontend).

Tenant-isolation invariants enforced in the router (keep them when adding routes): `resolveOrgId()` is strict — an unknown slug is a 404 `ORG_NOT_FOUND`, never a fallback to another org; when no `orgId` query param is given on a protected route, scope defaults to the caller's own org from the token; **every** org-scoped query — including `:id` lookups, updates, and deletes — must carry `.eq('org_id', orgId)`; `organizations/:id` PUT checks membership of the org in the URL. The `smoke-b` tenant in `server/seed.sql` exists solely so the smoke harness can prove cross-tenant access fails — don't delete it.

### Frontend data layer

Pages never call axios directly. The chain is: page → `src/lib/services.js` (domain services) → `src/lib/api.js` (axios instances + `ENDPOINTS` registry mirroring the production contract) → backend. `src/lib/useApi.js` provides `useApi` (with `fallback` so pages render when the backend is down) and `useMutation`. Auth tokens live in cookies (`src/lib/auth.js`); the axios interceptor attaches Bearer tokens and does a single 401→`auth/refresh` retry.

Each page is a single self-contained `.jsx`. Store pages (`src/pages/store/`) still hold mock data in top-of-file `useState` — wiring them means replacing the data source only, not the UI.

### Routing & state

- URL first segment is the **vendor slug**: `/:orgSlug/*` is the customer storefront (6 pages via `StoreLayout`), `/:orgSlug/dashboard/*` is the protected admin (14 pages via `DashboardLayout`; sidebar defined in `src/layout/nav.js`). Auth pages register at both root and `/:orgSlug`.
- Redux Toolkit with six slices in `src/store/index.js`: `constants`, `me`, `org`, `modals` (global modal host), `planBanner` (402 upgrade prompts), `ui`.
- Per-tenant configurable settings (LINE, payments, booking rules, notifications) are schema'd in `src/config/tenant.js`; platform-level env vars in `src/config/env.js`.

## Working conventions

- **UI copy must match `docs/UI-COPY.md` verbatim** — it is a word-for-word catalog of every page/modal/toast from the production site. When adding features, look copy up there instead of writing new strings.
- Design tokens (colors `orbit-*`, radii, shadows, component classes like `.orbit-card`) are in `docs/DESIGN-SYSTEM.md`, `tailwind.config.js`, and `src/styles/index.css` — follow them rather than inventing styles.
- `docs/SPEC.md` is the source of truth for routes, API contract, auth flows, domain enums, and env-var vs tenant-setting split. New endpoints belong in the `ENDPOINTS` registry in `src/lib/api.js` and in `server/router.js`.

## Current state

Done: all 14 dashboard pages wired to real Supabase data (read + write), API auth, 6 storefront pages built.
Not done: storefront pages still use mock data (not wired to the API); LINE "test connection" is fake; payments and notifications have settings UIs but no real third-party integration.
