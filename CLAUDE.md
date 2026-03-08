# SideQuest Starter

## First Time Here?

If this is your first time working with this project or tech stack, tell Claude:
> "I'm new here, walk me through getting started"

Claude will use the full onboarding guide at `docs/ONBOARDING_FULL.md`.

If you've done this before, just start coding. Setup docs in `docs/`.

## Stack

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui
- Backend/DB: Convex (real-time, serverless)
- Auth: Clerk (`@clerk/react` v6) with Convex integration
- Router: React Router v7
- Package Manager: pnpm

## File Structure

```
src/
  components/
    layout/       # Header, Layout (with Outlet)
    auth/         # ProtectedRoute
    ui/           # shadcn/ui components (button, card, dialog, etc.)
    ErrorBoundary.tsx  # Catches crashes, shows friendly error UI
    OfflineBanner.tsx  # Shows "you're offline" banner when no internet
  routes/         # Dashboard, Notes, Settings
  hooks/          # useStoreUser, useTheme
  lib/            # Utilities (cn helper, csv import/export)
  App.tsx         # Router + ThemeProvider
  main.tsx        # Clerk + Convex providers
  index.css       # Tailwind + theme variables

convex/
  schema.ts       # DB schema (users, notes, settings)
  auth.config.ts  # Clerk JWT issuer config
  users.ts        # User sync mutation + getCurrentUser helper
  notes.ts        # Notes CRUD (list, get, create, update, remove)
  settings.ts     # User settings (displayName, theme)
```

## Convex Patterns

### Queries (read data, real-time)

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const notes = useQuery(api.notes.list);
```

### Mutations (write data)

```typescript
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const createNote = useMutation(api.notes.create);
await createNote({ title: "My Note", content: "# Hello" });
```

### Schema changes

1. Edit `convex/schema.ts`
2. Run `pnpm convex dev` -- auto-detects and pushes schema changes

### Creating a new Convex function

```typescript
// convex/myModule.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("myTable")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("myTable", {
      userId: user._id,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
```

### Production operations

Always use `--prod` flag: `pnpm convex deploy --prod`

```bash
pnpm convex deploy --prod
pnpm convex env set CLERK_JWT_ISSUER_DOMAIN "https://..." --prod
```

Never override `CONVEX_DEPLOYMENT` inline.

## Auth

### How it works

1. **Clerk** handles sign-in/sign-up UI and session management
2. On login, `useStoreUser` hook calls `api.users.store` to sync Clerk user into Convex `users` table
3. Backend functions use `getCurrentUser(ctx)` to get authenticated user
4. JWT validation via Clerk JWT template configured for Convex

**Important:** Use `@clerk/react` (v6, Core 3), NOT the old `@clerk/clerk-react` (v5). The v5 package has a critical bug -- doesn't handle `needs_client_trust` flow, breaks sign-in on deployed envs.

### Frontend auth guards

```tsx
import { Authenticated, Unauthenticated } from "convex/react";

<Authenticated>
  <Dashboard />
</Authenticated>
<Unauthenticated>
  <LandingPage />
</Unauthenticated>
```

`ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) wraps routes requiring login.

### Backend auth

```typescript
import { getCurrentUser } from "./users";

const user = await getCurrentUser(ctx);
if (!user) throw new Error("Not authenticated");
// user._id is the Convex user ID
```

## Common Tasks

### Add a new page

1. Create `src/routes/MyPage.tsx`
2. Add route in `src/App.tsx`: `<Route path="my-page" element={<MyPage />} />`
3. Add nav link in `src/components/layout/Header.tsx`

### Add a new DB table

1. Edit `convex/schema.ts` -- add table definition with `defineTable()`
2. Create `convex/myTable.ts` with queries and mutations
3. Run `pnpm convex dev` to push schema

### Add a UI component

```bash
pnpm dlx shadcn@latest add <component>
```

Components go to `src/components/ui/`. Import: `import { Button } from "@/components/ui/button";`

Browse: [ui.shadcn.com](https://ui.shadcn.com)

## Environment Variables

### `.env.local` (local dev, git-ignored)

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Auto-set by `pnpm convex dev` |
| `VITE_CONVEX_URL` | **Must add manually!** Copy value from `CONVEX_URL` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk dashboard) |

### Convex Dashboard (Settings > Environment Variables)

| Variable | Description |
|----------|-------------|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer URL (e.g. `https://your-app.clerk.accounts.dev`) |

## Gotchas

- **`VITE_CONVEX_URL` not auto-created:** `pnpm convex dev` creates `CONVEX_URL` but NOT `VITE_CONVEX_URL`. Must add manually to `.env.local`.
- **Clerk v6 vs v5:** Must use `@clerk/react` (v6+), not `@clerk/clerk-react` (v5). The v5 package breaks on deployed sites.
- **Clerk Bot Protection:** If sign-in fails with `needs_client_trust` even on v6, go to Clerk Dashboard > Configure > Attack Protection > Bot Protection > set to "Disabled" or "CAPTCHA".
- **Clerk JWT template:** Must create a "Convex" JWT template in Clerk Dashboard before auth works with Convex.
- **Production Convex ops:** Always use `--prod` flag. Never inline `CONVEX_DEPLOYMENT` override.

## PWA

The app is a Progressive Web App — installable on phones/tablets. It requires internet (no offline data sync). When offline, an `OfflineBanner` component shows a "go online" message.

- Configured via `vite-plugin-pwa` in `vite.config.ts`
- TODO: Generate proper app icons (currently uses favicon SVGs)

## CSV Utilities

`src/lib/csv.ts` provides reusable CSV import/export:
- `toCSV(data, columns?)` — objects to CSV string
- `fromCSV(csv)` — CSV string to objects
- `downloadCSV(csv, filename)` — trigger browser download

Notes page has an "Export" button as example usage.

## Useful Links

- [Convex Docs](https://docs.convex.dev)
- [Clerk Docs](https://clerk.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
