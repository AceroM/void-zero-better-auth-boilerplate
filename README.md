# Void Zero Better Auth Boilerplate

A native Void app-mode starter with React pages and Void-managed Better Auth.
It is meant to be a clean baseline for authenticated tools, dashboards, and
SaaS apps.

## What This Uses

- Void app mode, not a meta-framework, because Void-managed Better Auth is only
  supported in Void apps.
- React Pages via `@void/react`.
- Email/password Better Auth from `void/client` and `void/auth`.
- A protected API route at `/api/profile`.
- Void Cloud deployment through `void deploy`.
- Porio source sync through `scripts/porio-sync.ts`.

## Local Development

```bash
bun install
bun run db:push
bun run dev
```

Open `http://localhost:5173`.

Run `bun run db:generate` after changing `db/schema.ts` to create a checked-in
migration.

## Auth

Auth is enabled in `void.json`:

```json
{
  "auth": {
    "providers": ["email"]
  }
}
```

Client code uses:

```ts
import { auth } from "void/client";
```

Server routes use:

```ts
import { requireAuth } from "void/auth";
```

Void Cloud auto-creates `BETTER_AUTH_SECRET` for auth-enabled managed deploys.
Set it manually if you self-host or run outside the managed Void deploy flow.

## Deploy To Void

```bash
bun run deploy
```

For GitHub Actions, add `VOID_TOKEN` and `VOID_PROJECT` repository secrets.

## Sync To Porio

This repo can push its source into the Porio app record, similar to the Migz
repo loop:

```bash
bun run sync:push
```

The Porio app id is stored in `scripts/porio-sync.ts`. You can override it with
`PORIO_APP_ID`.

Current Porio app:
`https://app.porio.ai/apps/b5c8a861-e5e9-4629-ad1b-4f73abfe1ec1`

Important: Porio source sync is not the same as Void deploy. Porio's current WfP
publisher is TanStack Start-specific; this boilerplate deploys with Void Cloud.
