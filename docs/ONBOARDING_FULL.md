# SideQuest Starter -- Onboarding Guide

This document is a script for Claude to follow when onboarding a new user. When a user says "I'm new here" or similar, walk them through this guide interactively.

---

## 1. Welcome

Introduce the project:

> SideQuest Starter is a ready-to-go template for building full-stack web apps. It comes with authentication, a database, real-time updates, and a clean UI -- all wired up and working. You can use it as a starting point for any project idea.
>
> Right now it has: login/signup, a notes feature with markdown support, and a settings page (display name + theme). Your job is to build on top of it.

## 2. Prerequisites Check

Ask the user these questions one at a time. Adapt based on answers:

1. **What OS are you on?** (macOS / Windows / Linux)
   - Point them to the correct setup doc:
     - macOS: `docs/SETUP_MAC.md`
     - Windows: `docs/SETUP_WINDOWS.md`
     - Linux: `docs/SETUP_LINUX.md`

2. **Do you have Node.js (v20+) and pnpm installed?**
   - If no: the OS setup doc covers this. Walk them through it first.
   - Quick check: `node --version` and `pnpm --version`

3. **Do you have a GitHub account?**
   - If no: they'll need one for version control. Point to github.com/signup.

4. **Do you have Clerk and Convex accounts?**
   - If no: we'll set these up in the next section.
   - Clerk: [clerk.com](https://clerk.com) (free tier is fine)
   - Convex: [convex.dev](https://convex.dev) (free tier is fine)

5. **Are you comfortable with git basics?** (clone, commit, push)
   - If no: give a brief primer or suggest they look at a git tutorial first. Basics needed: `git clone`, `git add`, `git commit`, `git push`.

6. **Do you already have a project idea, or just exploring?**
   - Store this for later (section 7). If exploring, we'll suggest ideas.

## 3. Account Setup

Walk through these only if user doesn't have accounts yet:

### Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application (name it whatever -- can change later)
3. Choose sign-in methods (Email + Google is a good start)
4. Go to **API Keys** -- copy the **Publishable Key** (starts with `pk_`)
5. Go to **JWT Templates** > click **New template** > choose **Convex**
   - This creates the JWT template Convex needs for auth
   - Leave defaults, click Save
6. Go to **Configure** > **Attack Protection** > **Bot Protection**
   - Set to **Disabled** or **CAPTCHA** (the default "Machine detection" can cause issues)
7. Note the **Issuer URL** from the JWT template (looks like `https://your-app.clerk.accounts.dev`)

### Convex (Backend + Database)

1. Go to [convex.dev](https://convex.dev) and sign up
2. No need to create a project manually -- `pnpm convex dev` will do it
3. Once project exists, go to **Settings** > **Environment Variables**
4. Add: `CLERK_JWT_ISSUER_DOMAIN` = the issuer URL from Clerk's JWT template

## 4. Environment Setup

Point user to their OS-specific setup doc (determined in step 2.1):
- `docs/SETUP_MAC.md`
- `docs/SETUP_WINDOWS.md`
- `docs/SETUP_LINUX.md`

These cover: Node.js, pnpm, git, and editor setup.

## 5. First Run

Walk through step by step:

```bash
# 1. Clone the repo (or if already cloned, cd into it)
git clone <repo-url>
cd sidequest

# 2. Install dependencies
pnpm install

# 3. Start Convex dev server (will prompt to create project on first run)
pnpm convex dev
```

**After `pnpm convex dev`:**
- It creates `.env.local` with `CONVEX_DEPLOYMENT` and `CONVEX_URL`
- **IMPORTANT:** You must manually add two more variables to `.env.local`:

```env
VITE_CONVEX_URL=<copy the value from CONVEX_URL above>
VITE_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key (pk_...)>
```

Tell the user: `pnpm convex dev` does NOT create `VITE_CONVEX_URL` -- Vite only exposes env vars with the `VITE_` prefix, so you must add it yourself.

```bash
# 4. In a separate terminal, start the frontend
pnpm dev
```

The app should now be running at `http://localhost:5173`. They should be able to:
- See the landing page
- Sign in with Clerk
- Create, edit, delete notes
- Change display name and theme in settings

If something doesn't work, check:
- Are all env vars in `.env.local` correct?
- Is `pnpm convex dev` still running in the other terminal?
- Is `CLERK_JWT_ISSUER_DOMAIN` set in Convex dashboard?
- Was the "Convex" JWT template created in Clerk?

## 6. Project Tour

Explain the project structure. Adjust depth based on user's experience level.

### Overview

```
src/                    # Frontend code (React)
  main.tsx              # Entry point -- sets up Clerk + Convex providers
  App.tsx               # Router -- defines pages and wraps in ThemeProvider
  index.css             # Tailwind config + theme CSS variables
  components/
    layout/             # Header (nav bar) and Layout (page wrapper with Outlet)
    auth/               # ProtectedRoute -- redirects to login if not authenticated
    ui/                 # shadcn/ui components (pre-built, styled)
  routes/               # Page components (Dashboard, Notes, Settings)
  hooks/                # useStoreUser (syncs Clerk user to Convex), useTheme
  lib/                  # Utility functions (cn helper for class merging)

convex/                 # Backend code (runs on Convex servers)
  schema.ts             # Database schema -- defines tables and indexes
  auth.config.ts        # Tells Convex to trust Clerk JWTs
  users.ts              # User sync + getCurrentUser helper
  notes.ts              # Notes CRUD operations
  settings.ts           # Settings read/write
  _generated/           # Auto-generated types -- never edit these
```

### What is Convex?

Convex is the backend. Explain briefly:
- It's a serverless database + backend-as-a-service
- You write TypeScript functions (queries/mutations) that run on Convex servers
- **Queries** read data and are real-time -- UI auto-updates when data changes
- **Mutations** write data
- Schema is defined in `convex/schema.ts` -- Convex enforces it
- `pnpm convex dev` watches for changes and auto-deploys to dev environment
- Frontend uses `useQuery()` and `useMutation()` hooks to call backend functions

### What is Clerk?

Clerk handles authentication. Explain briefly:
- Provides sign-in/sign-up UI components and session management
- User signs in via Clerk, Clerk issues a JWT
- Convex validates the JWT using the issuer domain
- `useStoreUser` hook syncs Clerk profile data into Convex's `users` table
- Backend uses `getCurrentUser(ctx)` to identify who's making the request

### How React Router organizes pages

- Routes defined in `src/App.tsx`
- `Layout` component wraps all pages (provides header + content area)
- Each route maps to a component in `src/routes/`
- Current routes: `/` (Dashboard), `/notes` (Notes), `/settings` (Settings)

### How shadcn/ui components work

- Pre-built, styled React components in `src/components/ui/`
- NOT a package -- they're actual source files you can edit
- Add new ones: `pnpm dlx shadcn@latest add <component-name>`
- Browse available: [ui.shadcn.com](https://ui.shadcn.com)
- They use Tailwind CSS for styling + CSS variables for theming

### Where to add new features

- **New page:** Create component in `src/routes/`, add route in `App.tsx`, add nav link in `Header.tsx`
- **New DB table:** Add to `convex/schema.ts`, create new file in `convex/` for queries/mutations
- **New UI component:** `pnpm dlx shadcn@latest add <name>` or create custom in `src/components/`
- **New backend logic:** Add queries/mutations in existing or new `convex/*.ts` files

## 7. What to Build Next

Based on user's answer from step 2.6, suggest relevant ideas. If exploring, offer these:

### Enhance existing notes
- Add tags or categories to notes
- Add a "pinned" flag to keep important notes at top
- Add search/filtering on the notes page
- Add note sharing (public link)

### Add a new feature/page
- Todo list with checkboxes and due dates
- Bookmark manager
- Simple budget tracker
- Journal/diary with date entries
- Habit tracker

### Customize the look
- Edit theme colors in `src/index.css` (CSS variables under `:root` and `.dark`)
- Change fonts
- Modify the layout/header
- Add a sidebar navigation instead of top nav

### General guidance
- Start small -- pick ONE thing to add
- Follow existing patterns (look at how notes works as a reference)
- Use Claude to help write the code -- describe what you want

## 8. Optional Enhancements

Ask the user if they're interested in any of these. Only set up what they want:

### AI Chat Capabilities
- Add `@convex-dev/agent` + `@ai-sdk/anthropic` for AI-powered features
- Enables: chat with AI, AI-assisted content generation, smart search
- Requires: Anthropic API key (set in Convex dashboard as `ANTHROPIC_API_KEY`)
- Example uses: AI writing assistant for notes, chat bot, content summarization

### Deployment
Ask if they want to share their app with others via a URL.

**Recommended: Vercel** (easiest option)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Import Project" and select the repo
3. Vercel auto-detects Vite — no config needed
4. Add environment variables: `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`
5. Deploy — get a `*.vercel.app` URL instantly
6. Auto-deploys on every push to main

**Alternatives** (if user prefers):
- **Cloudflare Pages:** Fast, generous free tier. Needs `@cloudflare/vite-plugin` + `wrangler`. More setup but great CDN.
- **Netlify:** Similar to Vercel. Connect repo, set env vars, auto-deploys.

For any platform: set `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY` as build-time environment variables.

### Monitoring
- **Sentry:** Error tracking. Catches frontend/backend errors, shows stack traces.
- **PostHog:** Product analytics. Track user actions, feature usage, funnels.
- Both have generous free tiers. Set up only if user wants production-level observability.

### Internationalization (i18n)
- Use `i18next` + `react-i18next`
- Default setup: English + Polish (or whatever languages user needs)
- Only add if the user explicitly wants multi-language support

---

## Notes for Claude

- Be conversational, not lecture-y. Ask questions, wait for answers.
- Adjust depth based on user's experience. Don't over-explain to experienced devs.
- If user gets stuck on setup, troubleshoot with them step by step.
- After onboarding, transition to normal coding mode. The user should feel ready to ask for features.
- Reference `CLAUDE.md` at the project root for quick patterns and gotchas during development.
