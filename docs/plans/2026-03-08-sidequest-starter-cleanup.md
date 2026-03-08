# SideQuest Starter — Cleanup & Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform "SQL Sidekick" into "SideQuest Starter" — a clean starter repo for friends learning to build projects with React + Convex + Clerk. Features: login, user settings (theme + display name), notes CRUD with markdown.

**Architecture:** Copy repo fresh (no git history) to `/Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest/`. Strip all SQL/AI/CodeMirror/ReactFlow dependencies and code. Keep core infrastructure (React 19, Vite, Tailwind v4, shadcn/ui, Convex, Clerk, React Router). Replace complex functionality with simple Notes CRUD + Settings. Add onboarding CLAUDE.md that guides new users through first-time setup.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui, Convex, Clerk, React Router v7, pnpm

---

### Task 1: Copy Repo Fresh & Initialize Git

**Files:**
- Create: `/Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest/` (entire directory)

**Step 1: Create the directory and copy files (excluding git, node_modules, dist)**

```bash
mkdir -p /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.wrangler' --exclude='.env' --exclude='.env.local' /Users/bartoszdec/SynologyDrive/AIMac/repos/tmp/adi/ /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest/
```

**Step 2: Initialize fresh git repo**

```bash
cd /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest
git init
```

**Step 3: Create .gitignore**

Ensure `.gitignore` includes: `node_modules/`, `dist/`, `.env`, `.env.local`, `.wrangler/`, `local/`

**Step 4: Commit**

```bash
git add -A
git commit -m "init: copy from sql-sidekick as starting point"
```

---

### Task 2: Strip SQL/AI Dependencies from package.json

**Files:**
- Modify: `package.json`

**Step 1: Remove these dependencies:**

Remove from `dependencies`:
- `@ai-sdk/anthropic`
- `@ai-sdk/provider-utils`
- `@codemirror/lang-sql`
- `@codemirror/language`
- `@codemirror/merge`
- `@codemirror/state`
- `@codemirror/theme-one-dark`
- `@codemirror/view`
- `@convex-dev/agent`
- `@dagrejs/dagre`
- `@marimo-team/codemirror-sql`
- `@uiw/react-codemirror`
- `@xyflow/react`
- `ai`
- `node-sql-parser`
- `sql-formatter`

Remove from `devDependencies`:
- `@cloudflare/vite-plugin`
- `wrangler`

**Step 2: Rename project**

Change `"name"` from `"sql-sidekick"` to `"sidequest-starter"`

**Step 3: Simplify scripts**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

Remove the `deploy` and old `preview` scripts (were Cloudflare-specific).

**Step 4: Run pnpm install**

```bash
pnpm install
```

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "strip sql/ai/cloudflare deps, rename to sidequest-starter"
```

---

### Task 3: Simplify Vite Config (Remove Cloudflare Plugin)

**Files:**
- Modify: `vite.config.ts`

**Step 1: Update vite.config.ts**

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

**Step 2: Delete wrangler.jsonc**

```bash
rm wrangler.jsonc
```

**Step 3: Commit**

```bash
git add vite.config.ts
git rm wrangler.jsonc
git commit -m "remove cloudflare plugin, make deployment agnostic"
```

---

### Task 4: Simplify Convex Schema & Backend

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/settings.ts`
- Modify: `convex/users.ts` (keep as-is)
- Modify: `convex/convex.config.ts`
- Modify: `convex/auth.config.ts` (keep as-is)
- Create: `convex/notes.ts`
- Delete: `convex/agents.ts`
- Delete: `convex/chat.ts`
- Delete: `convex/queries.ts`
- Delete: `convex/dbSchemas.ts`
- Delete: `convex/bestPractices.ts`
- Delete: `convex/usageLogs.ts`
- Delete: `convex/generateTitle.ts`

**Step 1: Rewrite schema.ts**

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

  settings: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    theme: v.union(v.literal("light"), v.literal("dark")),
  }).index("by_user", ["userId"]),

  notes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

**Step 2: Rewrite settings.ts**

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

const DEFAULTS = {
  displayName: "",
  theme: "light" as const,
};

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!doc) {
      return { ...DEFAULTS, _id: null };
    }

    return doc;
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.displayName !== undefined) updates.displayName = args.displayName;
      if (args.theme !== undefined) updates.theme = args.theme;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      userId: user._id,
      displayName: args.displayName ?? DEFAULTS.displayName,
      theme: args.theme ?? DEFAULTS.theme,
    });
  },
});
```

**Step 3: Create notes.ts**

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title,
      content: args.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    await ctx.db.patch(args.id, updates);
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

**Step 4: Simplify convex.config.ts (remove agent)**

```typescript
import { defineApp } from "convex/server";

const app = defineApp();
export default app;
```

**Step 5: Delete removed backend files**

```bash
rm convex/agents.ts convex/chat.ts convex/queries.ts convex/dbSchemas.ts convex/bestPractices.ts convex/usageLogs.ts convex/generateTitle.ts
```

**Step 6: Commit**

```bash
git add convex/
git commit -m "simplify convex: users + settings + notes only"
```

---

### Task 5: Delete SQL-Specific Frontend Files

**Files:**
- Delete: `src/routes/Refine.tsx`
- Delete: `src/routes/Write.tsx`
- Delete: `src/routes/Library.tsx`
- Delete: `src/routes/LibraryDetail.tsx`
- Delete: `src/routes/History.tsx`
- Delete: `src/routes/SchemaDiagram.tsx`
- Delete: `src/components/editor/SqlEditor.tsx`
- Delete: `src/components/editor/DiffView.tsx`
- Delete: `src/components/chat/ChatPanel.tsx`
- Delete: `src/components/schema/SchemaViewer.tsx`
- Delete: `src/components/schema/TableNode.tsx`
- Delete: `src/lib/schema-parser.ts`
- Delete: `src/lib/chat-utils.ts`
- Delete: `src/lib/format-cost.ts`
- Delete: `src/hooks/useChatSession.ts`

**Step 1: Delete all SQL/AI specific files**

```bash
rm src/routes/Refine.tsx src/routes/Write.tsx src/routes/Library.tsx src/routes/LibraryDetail.tsx src/routes/History.tsx src/routes/SchemaDiagram.tsx
rm -rf src/components/editor src/components/chat src/components/schema
rm src/lib/schema-parser.ts src/lib/chat-utils.ts src/lib/format-cost.ts
rm -f src/hooks/useChatSession.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "delete sql/ai-specific frontend files"
```

---

### Task 6: Create Notes Page

**Files:**
- Create: `src/routes/Notes.tsx`

**Step 1: Create Notes.tsx**

Build a simple notes page with:
- List of notes (title + truncated content + date)
- "New Note" button → dialog with title + textarea (markdown content)
- Click note → inline edit mode (title + textarea)
- Delete button with confirmation
- Markdown preview using react-markdown + remark-gfm
- Use shadcn Card, Button, Dialog, Input, Textarea
- Wrap in `<ProtectedRoute>`

Use the `@frontend-design` skill when implementing the actual UI. Keep it clean, simple, and polished.

The page should show notes in a grid/list with:
- Title
- First ~100 chars of content as preview
- Relative time (e.g., "2 hours ago")
- Edit / Delete actions

**Step 2: Commit**

```bash
git add src/routes/Notes.tsx
git commit -m "add notes page with CRUD + markdown support"
```

---

### Task 7: Simplify Settings Page

**Files:**
- Rewrite: `src/routes/Settings.tsx`

**Step 1: Rewrite Settings.tsx**

Strip down to just two sections (no tabs needed, simple page):

1. **Profile** — Display name input with save button
2. **Appearance** — Light/dark theme toggle (keep existing ThemeSettings pattern)

Use the existing shadcn components. Keep it clean and minimal. Use `@frontend-design` skill.

```tsx
// Simplified structure:
// - ProtectedRoute wrapper
// - "Settings" heading
// - Profile card (display name input + save)
// - Appearance card (theme toggle)
// - "More settings coming soon" placeholder text
```

**Step 2: Commit**

```bash
git add src/routes/Settings.tsx
git commit -m "simplify settings: display name + theme only"
```

---

### Task 8: Simplify Dashboard

**Files:**
- Modify: `src/routes/Dashboard.tsx`

**Step 1: Rewrite Dashboard.tsx**

Simple welcome page with:
- Welcome message (use display name from settings if available)
- Two quick-action cards: Notes, Settings
- Clean, minimal layout

Use `@frontend-design` skill.

**Step 2: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "simplify dashboard: welcome + notes/settings cards"
```

---

### Task 9: Simplify Header & App Router

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/App.tsx`

**Step 1: Simplify Header.tsx**

- Remove SQL-specific nav items (Refine, Write, Library, History)
- Remove TotalCost component
- Remove `formatCost` and `usageLogs` imports
- Keep: Dashboard, Notes, Settings nav items
- Keep: theme toggle, Clerk UserButton, Sign In button
- Change logo icon from `Database` to something generic (e.g., `Rocket`, `Zap`, or `Compass`)
- Change app name from "SQL Sidekick" to "SideQuest"

Nav items:
```typescript
const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
```

**Step 2: Simplify App.tsx**

```tsx
<Routes>
  <Route element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="notes" element={<Notes />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route>
</Routes>
```

Remove all old route imports.

**Step 3: Commit**

```bash
git add src/components/layout/Header.tsx src/App.tsx
git commit -m "simplify routing: home, notes, settings only"
```

---

### Task 10: Update ProtectedRoute & useTheme

**Files:**
- Modify: `src/components/auth/ProtectedRoute.tsx`
- Keep: `src/hooks/useTheme.ts` (still works)
- Keep: `src/hooks/useStoreUser.ts` (still works)

**Step 1: Update ProtectedRoute text**

Change "You need to be signed in to access SQL Sidekick" → "Sign in to get started"

**Step 2: Commit**

```bash
git add src/components/auth/ProtectedRoute.tsx
git commit -m "update protected route messaging"
```

---

### Task 11: Update index.html & Metadata

**Files:**
- Modify: `index.html`

**Step 1: Update title and metadata**

```html
<title>SideQuest Starter</title>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "update page title to SideQuest Starter"
```

---

### Task 12: Rewrite Setup Guides (Generic)

**Files:**
- Rewrite: `docs/SETUP_MAC.md`
- Rewrite: `docs/SETUP_WINDOWS.md`
- Rewrite: `docs/SETUP_LINUX.md`

**Step 1: Rewrite each guide**

Make them generic — not SQL Sidekick specific. Structure:

1. Install dev tools (OS-specific: Xcode CLT / build tools)
2. Install Homebrew (Mac) / Chocolatey (Windows) / apt packages (Linux)
3. Install Node.js via fnm
4. Install pnpm
5. Install GitHub CLI + authenticate
6. Install Claude Code CLI (optional)
7. Install code editor
8. Fork & clone the repo
9. Install dependencies (`pnpm install`)
10. Create Clerk app (generic instructions, no "SQL Sidekick" naming)
11. Create Convex project (`pnpm convex dev`)
12. Configure Clerk JWT template for Convex
13. Set environment variables (`.env.local` + Convex dashboard)
14. Start the app (`pnpm dev` + `pnpm convex dev`)
15. Troubleshooting table

Replace all "SQL Sidekick" references with "your project" / "SideQuest Starter".
Remove Cloudflare deployment section (deployment agnostic now).
Remove ANTHROPIC_API_KEY from env vars (no AI by default).

**Step 2: Commit**

```bash
git add docs/
git commit -m "rewrite setup guides as generic starter guides"
```

---

### Task 13: Create CLAUDE.md with Onboarding Flow

**Files:**
- Create: `CLAUDE.md` (root)
- Create: `docs/ONBOARDING_FULL.md`

**Step 1: Create CLAUDE.md**

```markdown
# SideQuest Starter

## Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- Backend/DB: Convex (real-time, serverless)
- Auth: Clerk (@clerk/react v6) with Convex integration
- Router: React Router v7
- Package Manager: pnpm

## First Time Here?

If this is your first time working with this project or tech stack, tell Claude:
> "I'm new here, walk me through getting started"

Claude will use the full onboarding guide at `docs/ONBOARDING_FULL.md` to help you:
- Set up your dev environment
- Create required accounts (Clerk, Convex)
- Configure environment variables
- Understand the project structure
- Decide what to build

If you've done this before, just start coding. The setup docs are in `docs/` if you need a refresher.

## File Structure

```
src/
  components/
    layout/       # Header, Layout
    auth/         # ProtectedRoute
    ui/           # shadcn/ui components
  routes/         # Dashboard, Notes, Settings
  hooks/          # useStoreUser, useTheme
  lib/            # Utilities
  App.tsx         # Router + ThemeProvider
  main.tsx        # Clerk + Convex providers

convex/
  schema.ts       # DB schema (users, settings, notes)
  auth.config.ts  # Clerk JWT config
  users.ts        # User sync + getCurrentUser helper
  settings.ts     # User settings (displayName, theme)
  notes.ts        # Notes CRUD
```

## Convex Patterns

### Queries (read, real-time)
```typescript
const notes = useQuery(api.notes.list);
```

### Mutations (write)
```typescript
const create = useMutation(api.notes.create);
await create({ title: "My Note", content: "..." });
```

### Auth in backend
```typescript
const user = await getCurrentUser(ctx);
if (!user) throw new Error("Not authenticated");
```

### Production ops
Always use `--prod` flag: `pnpm convex deploy --prod`

## Auth

Uses Clerk (@clerk/react v6, NOT old @clerk/clerk-react v5).
- Frontend: `<ProtectedRoute>` wrapper, `<Authenticated>`/`<Unauthenticated>` components
- Backend: `getCurrentUser(ctx)` helper in every query/mutation
- User sync: `useStoreUser()` hook syncs Clerk → Convex on login

## Common Tasks

### Add a page
1. Create `src/routes/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav link in `src/components/layout/Header.tsx`

### Add a DB table
1. Add table in `convex/schema.ts`
2. Create `convex/myTable.ts` with queries/mutations
3. `pnpm convex dev` pushes schema automatically

### Add a UI component
```bash
pnpm dlx shadcn@latest add <component>
```

## Environment Variables

### .env.local (local, git-ignored)
- `VITE_CONVEX_URL` — must add manually (copy from CONVEX_URL)
- `VITE_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard

### Convex Dashboard
- `CLERK_JWT_ISSUER_DOMAIN` — Clerk issuer URL

## Gotchas
- `VITE_CONVEX_URL` not auto-created by `pnpm convex dev` — must add manually
- Use `@clerk/react` v6+, not old `@clerk/clerk-react` v5
- Clerk Bot Protection can break sign-in — disable or set to CAPTCHA
- Must create "Convex" JWT template in Clerk Dashboard
```

**Step 2: Create docs/ONBOARDING_FULL.md**

This is the comprehensive onboarding guide that Claude reads when a user says they're new. It should include:

1. **Welcome** — brief explanation of what this starter is
2. **Prerequisites Check** — questions to ask the user:
   - What OS are you on? (→ point to correct setup doc)
   - Do you have Node.js and pnpm installed?
   - Do you have a GitHub account?
   - Do you have accounts for Clerk and Convex? (or need to create them)
   - Are you comfortable with git? (adjust guidance level)
   - Do you already have a project idea? (help them plan) or just exploring?
3. **Account Setup** — walk through Clerk + Convex account creation
4. **Environment Setup** — use the OS-specific setup guide
5. **First Run** — getting the app running locally
6. **Project Tour** — explain each folder/file and what it does
7. **What to Build Next** — suggestions:
   - Add more fields to notes (tags, categories)
   - Add a new page/feature
   - Customize the theme/colors
   - Add AI chat capabilities (optional, ask if interested)
8. **Optional Enhancements** — questions to ask:
   - Want AI chat? (install @convex-dev/agent + @ai-sdk/anthropic)
   - Want deployment? (Vercel, Cloudflare, Netlify options)
   - Want monitoring? (Sentry, Posthog)

**Step 3: Commit**

```bash
git add CLAUDE.md docs/ONBOARDING_FULL.md
git commit -m "add CLAUDE.md with onboarding flow for new users"
```

---

### Task 14: Write README.md

**Files:**
- Rewrite: `README.md`

**Step 1: Write a clean README**

```markdown
# SideQuest Starter

A beginner-friendly starter template for building full-stack web apps with React, Convex, and Clerk.

## What's Included

- User authentication (sign in / sign up)
- User settings (display name, dark/light theme)
- Notes with markdown support (create, edit, delete)
- Real-time data sync via Convex
- Clean, responsive UI with Tailwind + shadcn/ui

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend:** Convex (serverless, real-time)
- **Auth:** Clerk
- **Router:** React Router v7

## Getting Started

Check your OS setup guide:
- [macOS](docs/SETUP_MAC.md)
- [Windows](docs/SETUP_WINDOWS.md)
- [Linux](docs/SETUP_LINUX.md)

## Using Claude Code

Open the project in your terminal and run `claude`. If it's your first time, say "I'm new here" and Claude will walk you through everything.

## License

MIT
```

**Step 2: Delete STARTER_CLAUDE.md** (its content is now in CLAUDE.md)

```bash
rm STARTER_CLAUDE.md
```

**Step 3: Commit**

```bash
git add README.md
git rm STARTER_CLAUDE.md
git commit -m "rewrite README for starter template"
```

---

### Task 15: Clean Up Old Docs & Unused Files

**Files:**
- Delete: `docs/plans/` (all old plan files)
- Delete: `docs/bigquery-best-practices.md`
- Delete: `local/` directory (if exists)
- Delete: unused shadcn components that were only used by SQL features (review and keep only what's needed)

**Step 1: Delete old planning docs and SQL docs**

```bash
rm -rf docs/plans/2026-03-07-*.md
rm -f docs/bigquery-best-practices.md
rm -rf local/
```

**Step 2: Review and keep only needed UI components**

Keep these shadcn components (used by Notes + Settings + Layout):
- button, card, dialog, input, label, separator, sonner, switch, textarea, badge

Consider removing if truly unused:
- avatar (check if Clerk uses it)
- dropdown-menu (check if used)
- scroll-area (check if used)
- tabs (no longer used after settings simplification)
- tooltip (check if used)

Check each import before deleting.

**Step 3: Commit**

```bash
git add -A
git commit -m "clean up old docs, unused files and components"
```

---

### Task 16: Verify Build & Final Review

**Step 1: Run TypeScript check**

```bash
cd /Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest
pnpm tsc -b --noEmit
```

Expected: no errors

**Step 2: Run build**

```bash
pnpm build
```

Expected: successful build

**Step 3: Manual review**

- Check all imports resolve
- No references to SQL, BigQuery, CodeMirror, agents, etc.
- No dead code or unused imports
- App name says "SideQuest" everywhere

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from cleanup"
```

---

## DONE Checklist

After all tasks:
- [ ] Fresh repo at `/Users/bartoszdec/SynologyDrive/AIMac/repos/sidequest/`
- [ ] No SQL/AI/CodeMirror/ReactFlow code or dependencies
- [ ] Working: login, notes CRUD with markdown, settings (display name + theme)
- [ ] Generic setup guides for Mac/Windows/Linux
- [ ] CLAUDE.md with onboarding flow
- [ ] Clean README
- [ ] TypeScript builds with no errors
- [ ] NOT pushed to GitHub (user will do this manually)
