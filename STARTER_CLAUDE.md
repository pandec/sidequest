# SQL Sidekick

AI-powered BigQuery SQL query refiner and writer. Paste a query to get it refined against best practices, or describe what you need and let AI write it using your DB schema.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend/DB:** Convex (real-time, serverless)
- **Auth:** Clerk (`@clerk/react` v6, Core 3) with Convex integration
- **AI:** `@convex-dev/agent` + `@ai-sdk/anthropic` (Claude Sonnet 4.6 default)
- **Router:** React Router v7
- **SQL Editor:** CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-sql`, BigQuery dialect)
- **Diff View:** `@codemirror/merge` (side-by-side, syntax-highlighted)
- **Schema Viz:** `@xyflow/react` + `@dagrejs/dagre` (auto-layout ER diagram)
- **Deployment:** Cloudflare Pages (`@cloudflare/vite-plugin` + `wrangler`)
- **Package Manager:** pnpm

## Setup

Check user's OS and point them to the correct setup doc:
- macOS: `docs/SETUP_MAC.md`
- Windows: `docs/SETUP_WINDOWS.md`
- Linux: `docs/SETUP_LINUX.md`

## File Structure

```
src/
  components/
    layout/       # Header, Layout (with Outlet)
    auth/         # ProtectedRoute
    editor/       # SQL CodeMirror editor, diff view
    chat/         # Chat panel (AI conversation)
    schema/       # Schema viewer (React Flow ER diagram)
    settings/     # Settings tab sections
    ui/           # shadcn/ui components (button, card, dialog, etc.)
  routes/         # Dashboard, Refine, Write, Library, LibraryDetail, Settings
  hooks/          # useStoreUser, useTheme
  lib/            # Utilities, schema parser
  App.tsx         # Router + ThemeProvider
  main.tsx        # Clerk + Convex providers

convex/
  schema.ts       # DB schema (users, queries, dbSchemas, bestPractices, settings)
  convex.config.ts # Agent component registration
  auth.config.ts  # Clerk JWT issuer config
  agents.ts       # AI agent definition (system prompt, model, tools)
  chat.ts         # Chat actions (send message, list thread messages)
  users.ts        # User sync mutation + getCurrentUser helper
  queries.ts      # Saved queries CRUD
  dbSchemas.ts    # DB schema upload/management
  bestPractices.ts # Best practices doc CRUD + defaults
  settings.ts     # User settings (model, effort, theme)
```

## Convex Patterns

### Queries (read data, real-time)

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const queries = useQuery(api.queries.list);
```

### Mutations (write data)

```typescript
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const saveQuery = useMutation(api.queries.create);
await saveQuery({ title: "My Query", originalSql: "SELECT ...", mode: "refine" });
```

### Schema changes

1. Edit `convex/schema.ts`
2. Run `pnpm convex dev` -- Convex auto-detects and pushes schema changes

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

Always use the `--prod` flag for production Convex operations:

```bash
pnpm convex deploy --prod
pnpm convex env set CLERK_JWT_ISSUER_DOMAIN "https://..." --prod
```

Never override `CONVEX_DEPLOYMENT` inline.

## Auth Patterns

### How auth works

1. **Clerk** handles the sign-in/sign-up UI and session management
2. On login, the `useStoreUser` hook calls `api.users.store` to sync the Clerk user into Convex's `users` table
3. Backend functions use `getCurrentUser(ctx)` to get the authenticated user from the Convex `users` table
4. JWT validation is handled by the Clerk JWT template configured for Convex

**Important:** Use `@clerk/react` (v6, Core 3), NOT the old `@clerk/clerk-react` (v5). The v5 package is deprecated and has a critical bug -- it doesn't handle Clerk's `needs_client_trust` flow, which breaks sign-in on deployed environments (Cloudflare, Vercel, etc.). All imports should come from `@clerk/react`.

### Frontend auth guards

```tsx
import { Authenticated, Unauthenticated } from "convex/react";

// Show different content based on auth state
<Authenticated>
  <Dashboard />
</Authenticated>
<Unauthenticated>
  <LandingPage />
</Unauthenticated>
```

The `ProtectedRoute` component (`src/components/auth/ProtectedRoute.tsx`) wraps routes that require login.

### Backend auth

```typescript
import { getCurrentUser } from "./users";

// In any query or mutation handler:
const user = await getCurrentUser(ctx);
if (!user) throw new Error("Not authenticated");
// user._id is the Convex user ID
```

## AI Agent Patterns

The AI agent is defined in `convex/agents.ts` using `@convex-dev/agent`:

- System prompt dynamically includes: best practices doc + DB schema + BigQuery dialect rules
- Each query session gets its own thread (preserves chat history)
- Agent has a `saveFinalQuery` tool to save refined/written SQL to the library
- Chat actions in `convex/chat.ts` handle streaming responses via `saveStreamDeltas`

Frontend uses `@convex-dev/agent/react` hooks for real-time chat UI.

## Cloudflare Pages Deployment

The project deploys to Cloudflare Pages using `@cloudflare/vite-plugin` + `wrangler`.

- **Config:** `wrangler.jsonc` configures SPA routing (`not_found_handling: "single-page-application"`)
- **Build:** `pnpm build`
- **Deploy:** `pnpm deploy`
- **Preview locally:** `pnpm preview`

Make sure all `VITE_` environment variables are set in Cloudflare Pages dashboard (Settings > Environment Variables) as build-time variables.

## Environment Variables

### `.env.local` (local dev, git-ignored)

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Auto-set by `pnpm convex dev` |
| `CONVEX_URL` | Auto-set by `pnpm convex dev` |
| `VITE_CONVEX_URL` | **Must be added manually!** Copy value from `CONVEX_URL`. Vite only exposes `VITE_` prefixed vars. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk dashboard) |

### Convex Dashboard (Settings > Environment Variables)

| Variable | Description |
|----------|-------------|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer URL (e.g. `https://your-app.clerk.accounts.dev`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |

### Cloudflare Pages (Settings > Environment Variables, build-time)

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Same as local `VITE_CONVEX_URL` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as local |
| `NODE_VERSION` | Set to `20` if build fails |

## Gotchas

- **`VITE_CONVEX_URL` not auto-created:** `pnpm convex dev` creates `CONVEX_URL` but NOT `VITE_CONVEX_URL`. You must add it manually to `.env.local` (copy the value from `CONVEX_URL`).
- **Clerk `needs_client_trust` error on deployed sites:** Must use `@clerk/react` v6+, not the old `@clerk/clerk-react` v5. The v5 package doesn't handle this flow.
- **Clerk Bot Protection:** If sign-in fails with `needs_client_trust` even on v6, go to Clerk Dashboard > Configure > Attack Protection > Bot Protection > set to "Disabled" or "CAPTCHA".
- **Clerk JWT template:** Must create a "Convex" JWT template in Clerk Dashboard before auth works with Convex.
- **Production Convex ops:** Always use `--prod` flag. Never inline `CONVEX_DEPLOYMENT` override.

## Common Tasks

### Add a new page

1. Create `src/routes/MyPage.tsx`:
   ```tsx
   export default function MyPage() {
     return <div>My Page</div>;
   }
   ```
2. Add the route in `src/App.tsx`:
   ```tsx
   <Route path="my-page" element={<MyPage />} />
   ```
3. Add a nav link in `src/components/layout/Header.tsx`

### Add a new DB table

1. Edit `convex/schema.ts` -- add your table definition:
   ```typescript
   myTable: defineTable({
     userId: v.id("users"),
     name: v.string(),
     createdAt: v.number(),
   }).index("by_user", ["userId"]),
   ```
2. Create `convex/myTable.ts` with queries and mutations
3. Run `pnpm convex dev` to push the schema

### Add a UI component

```bash
pnpm dlx shadcn@latest add <component>
```

Examples:
```bash
pnpm dlx shadcn@latest add alert
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add sheet
```

Components are added to `src/components/ui/`. Import them:
```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
```

Browse available components at [ui.shadcn.com](https://ui.shadcn.com).

## Useful Links

- [Convex Docs](https://docs.convex.dev)
- [Clerk Docs](https://clerk.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [CodeMirror Docs](https://codemirror.net)
- [React Flow Docs](https://reactflow.dev)
- [Convex Agent Docs](https://github.com/get-convex/agent)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
