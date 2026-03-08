# Sidequest Starter — Design Doc

## Overview

Fork-ready GitHub template repo: React + Convex + Clerk, fully wired. Non-technical users fork, follow setup guide, start building with AI (Claude Code).

## Stack

- **Runtime**: Node.js LTS + pnpm
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend/DB**: Convex
- **Auth**: Clerk (`@clerk/clerk-react` + Convex integration)
- **Router**: React Router v7

## Example Features

1. **Auth flow** — Sign in/up via Clerk, protected routes
2. **User profile panel** — Display name, avatar (from Clerk), basic info
3. **User settings** — Theme toggle (light/dark), notification prefs (stored in Convex)
4. **Notes CRUD** — Create, read, update, delete notes with real-time sync

## Project Structure (flat, no monorepo)

```
sidequest/
├── src/
│   ├── components/       # UI components (shadcn + custom)
│   ├── routes/           # Pages (home, notes, settings, profile)
│   ├── lib/              # Utilities
│   ├── App.tsx           # Router + providers
│   └── main.tsx          # Entry point
├── convex/
│   ├── schema.ts         # DB schema (users, notes, settings)
│   ├── notes.ts          # Notes mutations/queries
│   ├── users.ts          # User sync from Clerk
│   └── settings.ts       # Settings mutations/queries
├── docs/
│   ├── SETUP_MAC.md
│   ├── SETUP_WINDOWS.md
│   └── SETUP_LINUX.md
├── STARTER_CLAUDE.md     # Template CLAUDE.md for forkers
├── README.md
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── components.json       # shadcn config
```

## DB Schema (Convex)

### users
- `clerkId: string` (indexed)
- `name: string`
- `email: string`
- `imageUrl: string`

### notes
- `userId: Id<"users">` (indexed)
- `title: string`
- `content: string`
- `createdAt: number`
- `updatedAt: number`

### settings
- `userId: Id<"users">` (indexed, unique)
- `theme: "light" | "dark"`
- `notifications: boolean`

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | No | Landing (logged out) / Dashboard (logged in) |
| `/notes` | Yes | Notes list + CRUD |
| `/settings` | Yes | User settings |
| `/profile` | Yes | User profile |

## Setup Docs (per OS)

Each doc covers:
1. Install Node.js (nvm/fnm)
2. Install pnpm
3. Install Git + GitHub CLI (`gh auth login`)
4. Install Claude Code CLI (+ VS Code/Cursor as alternatives)
5. Fork repo, clone, `pnpm install`
6. Create Convex project + deploy
7. Create Clerk app + get API keys
8. Set `.env.local` from `.env.example`
9. `pnpm dev`

## STARTER_CLAUDE.md

Covers:
- Project overview + stack
- Points to correct OS setup doc
- Convex patterns (queries, mutations, schema)
- Auth flow (Clerk <-> Convex user sync)
- File structure guide
- Common tasks ("add a page", "add a DB table", "add a component")
- Convex tips (`--prod` flag, etc.)
