# SQL Sidekick

AI-powered BigQuery SQL query refiner and writer.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![Convex](https://img.shields.io/badge/Convex-Backend-orange?logo=convex)
![Clerk](https://img.shields.io/badge/@clerk/react-Auth-purple?logo=clerk)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-blue?logo=tailwindcss)

---

Paste a SQL query and get it refined against BigQuery best practices, or describe what you need and let AI write it using your database schema. Chat with the AI for follow-up questions and iterations.

## Features

- **Query Refiner** -- Paste SQL, get an improved version with side-by-side diff view and explanations
- **Query Writer** -- Describe what you need in plain English, AI writes the SQL using your schema
- **Chat Interface** -- Follow-up conversation with AI for each query session
- **Query Library** -- Save, search, and reopen past queries with full chat history
- **DB Schema Manager** -- Upload your BigQuery schema (DDL), view as interactive ER diagram
- **Best Practices Editor** -- Customize the BigQuery best practices that guide AI refinements
- **Dark Mode** -- Light and dark theme support

## Quick Start

1. **Fork** this repository
2. Follow the setup guide for your OS:
   - [macOS](docs/SETUP_MAC.md)
   - [Windows](docs/SETUP_WINDOWS.md)
   - [Linux](docs/SETUP_LINUX.md)
3. Run `pnpm install`
4. Configure Clerk + Convex (see setup guide)
5. Run `pnpm dev`

## Deployment

SQL Sidekick supports deployment to **Cloudflare Pages**.

- Build command: `pnpm build`, output directory: `dist`
- Set `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY` as environment variables
- SPA routing is handled via `wrangler.jsonc` (included in the repo)
- Or deploy from the CLI: `pnpm deploy`

See the deployment step in any of the setup guides for details.

## AI-Assisted Development

This project includes `STARTER_CLAUDE.md` -- a CLAUDE.md template for AI-assisted development with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Copy it to `CLAUDE.md` and start building with AI assistance:

```bash
cp STARTER_CLAUDE.md CLAUDE.md
claude
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, shadcn/ui |
| Backend | Convex (real-time serverless) |
| Auth | Clerk (`@clerk/react`) |
| AI | @convex-dev/agent, Claude (Anthropic) |
| SQL Editor | CodeMirror 6 (BigQuery dialect) |
| Schema Viz | React Flow + dagre auto-layout |
| Router | React Router v7 |

## Project Structure

```
src/
  components/    # UI components (layout, auth, editor, chat, schema, settings, ui)
  routes/        # Page components (Dashboard, Refine, Write, Library, Settings)
  hooks/         # Custom hooks
  lib/           # Utilities
convex/
  schema.ts      # Database schema
  agents.ts      # AI agent configuration
  chat.ts        # Chat actions
  users.ts       # User management
  queries.ts     # Saved queries
  bestPractices.ts  # Best practices content
  settings.ts    # User preferences
docs/
  SETUP_MAC.md
  SETUP_WINDOWS.md
  SETUP_LINUX.md
  bigquery-best-practices.md
```

## License

MIT
