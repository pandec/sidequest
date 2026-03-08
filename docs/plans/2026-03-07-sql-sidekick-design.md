# SQL Sidekick — Design Doc

## Overview

Web app for refining, writing, and managing BigQuery SQL queries with AI assistance. Paste a query, get a refined version with explanations. Or describe what you need, AI writes it using your DB schema. Chat interface for follow-up discussion.

## Stack

- **Runtime**: Node.js LTS + pnpm
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend/DB**: Convex
- **Auth**: Clerk (`@clerk/clerk-react@^5` + Convex integration)
- **AI**: `@convex-dev/agent` + `@ai-sdk/anthropic` (Claude Sonnet 4.6 default)
- **Router**: React Router v7
- **SQL Editor**: CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-sql`, `@marimo-team/codemirror-sql` for BigQuery)
- **Diff View**: `@codemirror/merge` (side-by-side, syntax-highlighted)
- **SQL Formatter**: `sql-formatter` (BigQuery dialect)
- **Schema Viz**: `@xyflow/react` + DatabaseSchemaNode + `@dagrejs/dagre`
- **Schema Parser**: `node-sql-parser` (BigQuery dialect)
- **Chat UI**: `@convex-dev/agent/react` hooks (useUIMessages, SmoothText)

## Core Features

### 1. Query Refiner (primary flow)
- Paste SQL in CodeMirror editor (BigQuery syntax highlighting)
- Click "Refine" -> AI analyzes against best practices doc + DB schema
- Side-by-side diff view via `@codemirror/merge`: original vs. refined
- Chat panel below for follow-up ("why did you change X?")
- Save refined query to library

### 2. Query Writer
- Describe what you need in natural language
- AI writes the query using DB schema for accurate table/column references
- Same chat panel for iteration
- Save to library

### 3. Query Library
- List of all saved queries (title, date, mode, preview)
- Click to reopen in refiner/writer with full chat history
- Search/filter

### 4. DB Schema Manager (Settings)
- Upload schema (paste or file upload)
- View with interactive React Flow diagram (DatabaseSchemaNode + dagre auto-layout)
- Table relationships, column details, types
- Filter/search tables
- Parse DDL via `node-sql-parser` BigQuery dialect
- Stored in Convex, always available to AI as context

### 5. Best Practices Editor (Settings)
- Markdown editor for BigQuery SQL best practices
- Ships with starter doc (naming, partitioning, JOINs, cost optimization, CTEs, window functions)
- AI uses this as its rulebook when refining

### 6. Settings
- LLM model: Anthropic Claude Sonnet 4.6 (default), configurable
- Effort level: medium (default), configurable
- Theme: light/dark

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | Yes | Dashboard — recent queries, quick actions |
| `/refine` | Yes | Query refiner (paste -> refine -> diff -> chat) |
| `/write` | Yes | Query writer (describe -> generate -> chat) |
| `/library` | Yes | Saved queries list |
| `/library/:id` | Yes | View/reopen saved query |
| `/settings` | Yes | Schema, best practices, LLM config, theme |

## Convex Schema

### users
- `name: string`, `email: string`, `imageUrl: string`, `tokenIdentifier: string`
- Index: `by_token` on `tokenIdentifier`

### queries
- `userId: Id<"users">`, `title: string`, `originalSql: string`, `refinedSql: string`
- `mode: "refine" | "write"`, `description: string`, `threadId: string`
- `createdAt: number`, `updatedAt: number`
- Index: `by_user` on `userId`

### dbSchemas
- `userId: Id<"users">`, `name: string`, `content: string`
- `createdAt: number`, `updatedAt: number`
- Index: `by_user` on `userId`

### bestPractices
- `userId: Id<"users">`, `content: string`, `updatedAt: number`
- Index: `by_user` on `userId`

### settings
- `userId: Id<"users">`, `model: string`, `effort: string`, `theme: "light" | "dark"`
- Index: `by_user` on `userId`

### Threads/messages — managed by `@convex-dev/agent` component (automatic)

## AI Agent Setup

### Agent definition (convex/agents.ts)
- Uses `@convex-dev/agent` component registered in `convex/convex.config.ts`
- Default model: `anthropic('claude-sonnet-4-6')` via `@ai-sdk/anthropic`
- System prompt dynamically includes: best practices doc + DB schema + BigQuery dialect rules
- Tools: `saveFinalQuery` (saves refined/written query to library)
- Thread per query session — preserves chat history

### Chat actions (convex/chat.ts)
- `send` action: takes prompt + mode + threadId, streams response via `saveStreamDeltas`
- `listThreadMessages` query: paginated messages with streaming support
- Uses `@convex-dev/agent/react` hooks on frontend (useUIMessages, optimisticallySendMessage)

## Schema Visualization Architecture

```
BigQuery DDL (CREATE TABLE statements)
        |
        v
[node-sql-parser] BigQuery dialect — parse DDL, extract tables/columns/types/FKs
        |
        v
Normalized schema object (Table[], Column[], ForeignKey[])
        |
        v
[@xyflow/react] + [DatabaseSchemaNode] + [@dagrejs/dagre]
        |
Interactive diagram: zoom, pan, minimap, hover-highlight, search/filter
```

Reference projects for UI inspiration:
- ChartDB (React + React Flow + Radix/shadcn + Tailwind — closest stack)
- Liam ERD (hover-highlight-related-tables UX)
- DrawDB (clean SVG rendering)

## Project Structure

```
sidequest/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, Layout, nav
│   │   ├── auth/         # ProtectedRoute
│   │   ├── editor/       # SQL editor, diff view
│   │   ├── chat/         # Chat panel
│   │   ├── schema/       # Schema viewer (React Flow)
│   │   ├── settings/     # Settings sections
│   │   └── ui/           # shadcn components
│   ├── routes/           # Home, Refine, Write, Library, LibraryDetail, Settings
│   ├── hooks/            # useStoreUser, useTheme
│   ├── lib/              # Utilities, schema parser
│   ├── App.tsx
│   └── main.tsx
├── convex/
│   ├── convex.config.ts  # Agent component registration
│   ├── schema.ts
│   ├── auth.config.ts
│   ├── agents.ts         # AI agent definition
│   ├── chat.ts           # Chat actions
│   ├── tools.ts          # AI tools (saveFinalQuery)
│   ├── users.ts
│   ├── queries.ts
│   ├── dbSchemas.ts
│   ├── bestPractices.ts
│   └── settings.ts
├── docs/
│   ├── SETUP_MAC.md
│   ├── SETUP_WINDOWS.md
│   ├── SETUP_LINUX.md
│   └── bigquery-best-practices.md
├── STARTER_CLAUDE.md
├── README.md
├── .env.example
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── components.json
```
