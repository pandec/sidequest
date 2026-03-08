# Sidequest Starter — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a fork-ready starter template with React + Convex + Clerk + shadcn/ui, including example features (auth, notes CRUD, settings, profile) and beginner-friendly setup docs.

**Architecture:** Single flat Vite project. Convex handles backend/DB. Clerk handles auth with client-side user sync to Convex. React Router v7 for routing. shadcn/ui + Tailwind v4 for UI.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Convex, Clerk (`@clerk/clerk-react@^5`), React Router v7

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Step 1: Scaffold with Vite**

```bash
cd /Users/bartoszdec/SynologyDrive/AIMac/repos/tmp/adi
# Remove existing files except .git and docs
pnpm create vite . --template react-ts
```

If prompted about non-empty dir, proceed. This creates the base project.

**Step 2: Install core dependencies**

```bash
pnpm add convex @clerk/clerk-react react-router
pnpm add -D @types/node
```

**Step 3: Verify it runs**

```bash
pnpm dev
```

Expected: Vite dev server starts on localhost:5173

**Step 4: Commit**

```bash
git add -A && git commit -m "scaffold: vite + react + typescript"
```

---

### Task 2: Add Tailwind v4 + shadcn/ui

**Files:**
- Modify: `vite.config.ts`, `src/index.css`, `tsconfig.json`, `tsconfig.app.json`
- Create: `components.json`, `src/lib/utils.ts`

**Step 1: Initialize shadcn (handles Tailwind v4 setup automatically)**

```bash
pnpm dlx shadcn@latest init
```

Choose:
- Style: **New York**
- Base color: **Neutral**
- CSS variables: **yes**

This auto-installs `tailwindcss`, `@tailwindcss/vite`, configures `vite.config.ts` with the plugin, sets up `src/index.css` with CSS variables, creates `components.json`, and configures path aliases.

**Step 2: Add commonly needed shadcn components**

```bash
pnpm dlx shadcn@latest add button card input label textarea separator avatar dropdown-menu dialog tabs switch toast sonner
```

**Step 3: Update vite.config.ts with path alias**

Ensure `vite.config.ts` has:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 4: Verify styles work**

Create a simple component using a shadcn Button in `src/App.tsx`, run `pnpm dev`, confirm it renders with styles.

**Step 5: Commit**

```bash
git add -A && git commit -m "add: tailwind v4 + shadcn/ui components"
```

---

### Task 3: Set up Convex

**Files:**
- Create: `convex/schema.ts`, `convex/tsconfig.json`, `convex/auth.config.ts`
- Modify: `.env.local` (auto-created by convex)

**Step 1: Initialize Convex**

```bash
pnpm convex dev
```

This will:
1. Open browser to log in with GitHub
2. Ask to create a new project — name it "sidequest"
3. Auto-create `.env.local` with `VITE_CONVEX_URL`

Press Ctrl+C after setup completes.

**Step 2: Create schema**

Write `convex/schema.ts`:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    userId: v.id("users"),
    theme: v.union(v.literal("light"), v.literal("dark")),
    notifications: v.boolean(),
  }).index("by_user", ["userId"]),
});
```

**Step 3: Create auth config**

Write `convex/auth.config.ts`:
```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

**Step 4: Push schema**

```bash
pnpm convex dev
```

Wait for schema to sync, then Ctrl+C.

**Step 5: Commit**

```bash
git add convex/ && git commit -m "add: convex schema + auth config"
```

---

### Task 4: Set up Clerk + ConvexProviderWithClerk

**Files:**
- Create: `.env.example`
- Modify: `src/main.tsx`, `src/App.tsx`

**Step 1: Create .env.example**

```
VITE_CONVEX_URL=your_convex_url_here
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

**Step 2: Wire up providers in main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
```

**Step 3: Add VITE_CLERK_PUBLISHABLE_KEY to .env.local**

Get the publishable key from Clerk Dashboard (clerk.com) after creating an app. Add to `.env.local`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Also in Clerk Dashboard:
1. Go to JWT Templates > Convex
2. Copy the Issuer URL
3. In Convex Dashboard > Settings > Environment Variables, set `CLERK_JWT_ISSUER_DOMAIN` to that URL

**Step 4: Verify auth loads**

```bash
pnpm dev
```

Page should load without errors. Clerk sign-in should work.

**Step 5: Commit**

```bash
git add .env.example src/main.tsx && git commit -m "add: clerk + convex auth integration"
```

---

## Phase 2: Convex Backend Functions

### Task 5: User sync mutation

**Files:**
- Create: `convex/users.ts`

**Step 1: Write user store mutation (client-side sync approach)**

```typescript
import { mutation, query, QueryCtx } from "./_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Called store without authentication");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // Update if name/email/image changed
      if (
        user.name !== identity.name ||
        user.email !== identity.email ||
        user.imageUrl !== identity.pictureUrl
      ) {
        await ctx.db.patch(user._id, {
          name: identity.name ?? "Anonymous",
          email: identity.email ?? "",
          imageUrl: identity.pictureUrl ?? "",
        });
      }
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}
```

**Step 2: Commit**

```bash
git add convex/users.ts && git commit -m "add: user sync mutation + current user query"
```

---

### Task 6: Notes CRUD functions

**Files:**
- Create: `convex/notes.ts`

**Step 1: Write notes mutations and queries**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) return null;
    return note;
  },
});

export const create = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("notes"), title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.id, {
      title: args.title,
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});
```

**Step 2: Commit**

```bash
git add convex/notes.ts && git commit -m "add: notes CRUD queries + mutations"
```

---

### Task 7: Settings functions

**Files:**
- Create: `convex/settings.ts`

**Step 1: Write settings queries and mutations**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // Return defaults if no settings exist yet
    return settings ?? { theme: "light" as const, notifications: true };
  },
});

export const update = mutation({
  args: {
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    notifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.notifications !== undefined && { notifications: args.notifications }),
      });
    } else {
      await ctx.db.insert("settings", {
        userId: user._id,
        theme: args.theme ?? "light",
        notifications: args.notifications ?? true,
      });
    }
  },
});
```

**Step 2: Commit**

```bash
git add convex/settings.ts && git commit -m "add: user settings queries + mutations"
```

---

## Phase 3: Frontend — Layout & Routing

### Task 8: Router + Layout + Auth components

**Files:**
- Create: `src/hooks/useStoreUser.ts`, `src/components/layout/Header.tsx`, `src/components/layout/Layout.tsx`
- Modify: `src/App.tsx`

**NOTE:** Use `/frontend-design` skill for all UI components in this and subsequent tasks.

**Step 1: Create useStoreUser hook**

Write `src/hooks/useStoreUser.ts`:
```typescript
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useStoreUser() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserId(null);
      return;
    }
    async function sync() {
      const id = await storeUser();
      setUserId(id);
    }
    sync();
  }, [isAuthenticated, storeUser]);

  return {
    isLoading: isLoading || (isAuthenticated && userId === null),
    isAuthenticated: isAuthenticated && userId !== null,
    userId,
  };
}
```

**Step 2: Create Header component**

Write `src/components/layout/Header.tsx` — navigation bar with:
- App name "Sidequest"
- Nav links: Home, Notes, Settings, Profile (when logged in)
- Clerk `<UserButton />` (when logged in)
- Sign in button (when logged out)

**Step 3: Create Layout component**

Write `src/components/layout/Layout.tsx` — wraps pages with Header + main content area using `<Outlet />` from react-router.

**Step 4: Set up router in App.tsx**

```typescript
import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./components/layout/Layout";
import { useStoreUser } from "./hooks/useStoreUser";
// Import route components (create placeholder pages first)
import { HomePage } from "./routes/Home";
import { NotesPage } from "./routes/Notes";
import { SettingsPage } from "./routes/Settings";
import { ProfilePage } from "./routes/Profile";

function App() {
  useStoreUser();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Step 5: Create placeholder route files**

Create `src/routes/Home.tsx`, `src/routes/Notes.tsx`, `src/routes/Settings.tsx`, `src/routes/Profile.tsx` — each exports a simple component with the page name.

**Step 6: Verify routing works**

```bash
pnpm dev
```

Navigate between routes, confirm layout renders.

**Step 7: Commit**

```bash
git add -A && git commit -m "add: router + layout + auth hook + placeholder pages"
```

---

## Phase 4: Frontend — Feature Pages

### Task 9: Home page

**Files:**
- Modify: `src/routes/Home.tsx`

**NOTE:** Use `/frontend-design` skill.

Landing page when logged out (hero section, "Get Started" → sign in). Dashboard when logged in (welcome message, quick links to Notes/Settings/Profile).

Use `<Authenticated>`, `<Unauthenticated>` from `convex/react` for conditional rendering.

**Commit:** `git commit -m "add: home page with landing + dashboard"`

---

### Task 10: Notes page

**Files:**
- Modify: `src/routes/Notes.tsx`
- Create: `src/components/notes/NoteCard.tsx`, `src/components/notes/NoteDialog.tsx`

**NOTE:** Use `/frontend-design` skill.

Features:
- List notes as cards (title, preview, date)
- "New Note" button → dialog with title + content fields
- Click note → edit dialog
- Delete button on each card
- Empty state when no notes
- Uses `useQuery(api.notes.list)` and `useMutation(api.notes.create/update/remove)`
- Real-time: notes update automatically across tabs

**Commit:** `git commit -m "add: notes CRUD page with real-time sync"`

---

### Task 11: Settings page

**Files:**
- Modify: `src/routes/Settings.tsx`

**NOTE:** Use `/frontend-design` skill.

Features:
- Theme toggle (light/dark) using shadcn Switch
- Notification preference toggle
- Uses `useQuery(api.settings.get)` and `useMutation(api.settings.update)`
- Apply theme class to `<html>` element via useEffect
- Toast confirmation on save

**Commit:** `git commit -m "add: settings page with theme + notifications"`

---

### Task 12: Profile page

**Files:**
- Modify: `src/routes/Profile.tsx`

**NOTE:** Use `/frontend-design` skill.

Features:
- Display user avatar (from Clerk via Convex users table)
- Display name, email
- Link to Clerk's `<UserProfile />` or embed it for account management
- Uses `useQuery(api.users.current)`

**Commit:** `git commit -m "add: profile page"`

---

### Task 13: Protected routes

**Files:**
- Create: `src/components/auth/ProtectedRoute.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ProtectedRoute component**

Redirects to home (or shows sign-in) if not authenticated. Uses `useConvexAuth()`.

**Step 2: Wrap protected routes in App.tsx**

Wrap `/notes`, `/settings`, `/profile` routes with `<ProtectedRoute>`.

**Step 3: Verify**

Try accessing `/notes` when logged out — should redirect to home.

**Commit:** `git commit -m "add: protected route wrapper"`

---

## Phase 5: Dark Mode Support

### Task 14: Theme provider

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/main.tsx` or `src/App.tsx`

Wire theme from Convex settings to the `<html>` element's `class` attribute (`dark` / `light`). Ensure Tailwind dark mode works with the `dark:` prefix. Fall back to system preference if no setting saved.

**Commit:** `git commit -m "add: dark mode theme support"`

---

## Phase 6: Documentation

### Task 15: Setup docs — Mac

**Files:**
- Create: `docs/SETUP_MAC.md`

Cover (step-by-step with exact commands):
1. Install Xcode CLI tools (`xcode-select --install`)
2. Install Homebrew
3. Install fnm via Homebrew, add to `~/.zshrc`, install Node LTS
4. Install pnpm (`npm install -g pnpm`)
5. Verify: `node -v`, `pnpm -v`
6. Install GitHub CLI (`brew install gh`), run `gh auth login`
7. Install Claude Code (`npm install -g @anthropic-ai/claude-code`), run `claude` to auth
8. Mention VS Code / Cursor as alternative editors
9. Fork + clone the repo
10. `pnpm install`
11. Create Clerk app (step-by-step with screenshots description)
12. Create Convex project (`pnpm convex dev` — first run flow)
13. Configure Clerk JWT template for Convex
14. Set env vars in `.env.local` and Convex dashboard
15. `pnpm dev` — verify it works

**Commit:** `git commit -m "docs: mac setup guide"`

---

### Task 16: Setup docs — Windows

**Files:**
- Create: `docs/SETUP_WINDOWS.md`

Same flow as Mac but with Windows-specific commands:
- winget for Git, Node, gh
- fnm or nvm-windows
- PowerShell commands
- Note about running terminal as admin when needed

**Commit:** `git commit -m "docs: windows setup guide"`

---

### Task 17: Setup docs — Linux

**Files:**
- Create: `docs/SETUP_LINUX.md`

Same flow but with apt/dnf commands, curl-based installers for fnm/nvm, gh CLI apt repo setup.

**Commit:** `git commit -m "docs: linux setup guide"`

---

### Task 18: STARTER_CLAUDE.md

**Files:**
- Create: `STARTER_CLAUDE.md`

Contents:
- Project name + description
- OS detection instruction: "Check user's OS and point them to the correct setup doc in `docs/`"
- Stack overview (React, Convex, Clerk, Tailwind, shadcn/ui)
- File structure explanation
- Convex patterns:
  - Queries: `useQuery(api.module.functionName)`
  - Mutations: `useMutation(api.module.functionName)`
  - Schema changes: edit `convex/schema.ts`, run `pnpm convex dev`
  - Always use `--prod` flag for production operations
- Auth patterns:
  - Clerk handles sign-in/up UI
  - User synced to Convex via `useStoreUser` hook
  - Use `getCurrentUser()` in Convex functions for auth
  - Use `<Authenticated>` / `<Unauthenticated>` for conditional UI
- Common tasks:
  - "Add a new page": create route file, add to App.tsx router, add nav link
  - "Add a new DB table": add to `convex/schema.ts`, create query/mutation file
  - "Add a UI component": `pnpm dlx shadcn@latest add <component>`
- Environment variables guide
- Link to Convex docs, Clerk docs, shadcn docs

**Commit:** `git commit -m "docs: STARTER_CLAUDE.md for AI-assisted development"`

---

### Task 19: README.md

**Files:**
- Create: `README.md`

Brief overview:
- What Sidequest is
- Stack badges
- Quick start (fork → setup doc → `pnpm dev`)
- Links to setup docs per OS
- "Built for use with Claude Code" note
- License (MIT)

**Commit:** `git commit -m "docs: README with quick start"`

---

### Task 20: .gitignore + .env.example + final cleanup

**Files:**
- Modify: `.gitignore` (ensure `node_modules`, `.env.local`, `dist` are ignored)
- Verify: `.env.example` has all needed vars listed
- Remove: `excalidraw.log` and any temp files

**Step 1: Clean up .gitignore**

Ensure it includes:
```
node_modules
dist
.env.local
.DS_Store
```

**Step 2: Final verification**

```bash
pnpm install && pnpm dev
```

Verify: app loads, sign in works, notes CRUD works, settings persist, profile shows.

**Step 3: Final commit + push**

```bash
git add -A && git commit -m "chore: cleanup + finalize starter template"
git push
```

---

## DONE sections

_Mark each phase as DONE here after completion._

- [ ] Phase 1: Project Scaffolding (Tasks 1-4)
- [ ] Phase 2: Convex Backend (Tasks 5-7)
- [ ] Phase 3: Frontend Layout & Routing (Task 8)
- [ ] Phase 4: Frontend Feature Pages (Tasks 9-13)
- [ ] Phase 5: Dark Mode (Task 14)
- [ ] Phase 6: Documentation (Tasks 15-20)
