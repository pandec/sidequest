# SideQuest Starter

## New User?

If the human says they're new, haven't set up the project, or this is their first session — run `/project-setup`. Do not try to guide them manually.

## Stack

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui
- Backend/DB: Convex
- Auth: Clerk (`@clerk/react` v6)
- Router: React Router v7
- Package Manager: pnpm

## Convex Production Ops

For env var changes on prod:

```bash
npx convex env set VAR "value" --prod
npx convex env get VAR --prod
npx convex env list --prod
```

For deploys (auto-targets prod, no --prod needed):

```bash
npx convex deploy -y
```

Never override `CONVEX_DEPLOYMENT` inline — `.env.local` silently wins.

## Gotchas

- **Clerk v6 only.** Use `@clerk/react` (v6+), NOT `@clerk/clerk-react` (v5). v5 breaks sign-in on deployed envs (`needs_client_trust` bug).
- **VITE_CONVEX_URL manual.** `pnpm convex dev` creates `CONVEX_URL` but NOT `VITE_CONVEX_URL`. Must copy value manually to `.env.local`.
- **Clerk Bot Protection.** If sign-in fails even on v6, Clerk Dashboard > Configure > Attack Protection > Bot Protection > set to "Disabled" or "CAPTCHA".
- **Clerk JWT template.** Must create a "Convex" JWT template in Clerk Dashboard before auth works.

## UI Components

shadcn/ui. Add new ones: `pnpm dlx shadcn@latest add <component>`

## Frontend Design

When building UI, use `/frontend-design` skill (requires the frontend-design plugin).
