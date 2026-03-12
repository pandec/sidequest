# SideQuest Starter

An opinionated starter template designed around **Claude Code** and a specific modern stack. The goal: get you from zero to building features with AI-assisted development as fast as possible.

This isn't just a boilerplate — it's a workflow. The project comes with Claude Code commands, curated skills, and setup automation that guide you through the entire process: installing tools, configuring services, deploying, and building.

## Why This Exists

Getting a full-stack app running with auth, a database, real-time sync, and a decent UI involves a lot of moving parts. Each service has its own setup, gotchas, and configuration dance. This starter handles all of that upfront so you can focus on building your actual idea.

It's also built for people who are new to this stack (or to coding in general) but want to use Claude Code effectively. The `/project-setup` command walks you through everything interactively — no need to read walls of documentation.

## The Default App

The starter ships with a working **Notes app** — not because you need a notes app, but because it exercises all the important parts of the stack:

- **Authentication** — sign in/up with Clerk, protected routes, user sync to database
- **Database CRUD** — create, read, update, delete notes via Convex
- **Real-time sync** — changes appear instantly (Convex reactivity)
- **Rich content** — markdown editing and rendering
- **Image uploads** — file storage with client-side resize
- **CSV export** — data import/export utilities
- **Settings** — user preferences (display name, theme)
- **PWA** — installable on phones, works like a native app
- **Error handling** — error boundaries, offline detection

Once you've got it running and understand the patterns, delete what you don't need and start building your thing.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui |
| Backend / DB | Convex (serverless, real-time) |
| Auth | Clerk |
| Router | React Router v7 |
| Package Manager | pnpm |

## Getting Started

### With Claude Code (recommended)

```bash
claude
```

Then say: **"I'm new here"** — Claude will run `/project-setup` and walk you through everything:

1. Installing recommended plugins and skills
2. Setting up your development environment
3. Creating Clerk and Convex accounts
4. Configuring environment variables
5. Running the app locally
6. Optional: deploying to Vercel for a shareable URL

### Without Claude Code

Check the setup guide for your OS:
- [macOS](docs/setup/SETUP_MAC.md)
- [Windows](docs/setup/SETUP_WINDOWS.md)
- [Linux](docs/setup/SETUP_LINUX.md)

## Project Structure

```
src/                    # React frontend
  routes/               # Page components
  components/           # UI components (shadcn/ui + custom)
  hooks/                # Custom React hooks
  lib/                  # Utilities

convex/                 # Backend (runs on Convex servers)
  schema.ts             # Database schema
  notes.ts              # Notes CRUD
  users.ts              # User sync + auth helper
  settings.ts           # User settings

.claude/commands/       # Claude Code commands
  project-setup.md      # Interactive onboarding

tools/                  # Shipped tooling
  skills/               # Claude Code skills (installed globally by /project-setup)
  statusline-command.sh # Terminal status line for Claude Code

docs/setup/             # OS-specific setup guides + Vercel deploy guide
```

## What `/project-setup` Does

The onboarding command handles:

- **Environment scan** — detects what you already have installed (Node, pnpm, git, etc.)
- **Plugin recommendations** — superpowers, code-simplifier, skill-creator, security-guidance, frontend-design
- **Global skill installation** — convex-tips, browser-debug, excalidraw-diagram
- **Chrome MCP setup** — for browser debugging via Claude
- **Status line** — shows model, git branch, context usage in your terminal
- **Shell aliases** — `cl` (launch Claude Code), `qlc` (debug Chrome), `ll` (file listing)
- **Full project setup** — Clerk, Convex, env vars, first run, verification
- **Optional Vercel deploy** — free shareable URL using dev credentials

## License

MIT
