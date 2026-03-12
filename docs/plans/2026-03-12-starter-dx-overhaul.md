# SideQuest Starter DX Overhaul

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the developer experience so friends cloning this repo get a lean CLAUDE.md, an interactive `/project-setup` command, and proper tooling — no bloated docs that drift.

**Architecture:** Single `/project-setup` command orchestrates all onboarding. CLAUDE.md is minimal (CC-facing, not human-facing). Setup docs move to `docs/setup/`. Skills and MCP config are installed globally by the command, not shipped in repo.

**Tech Stack:** Claude Code commands, skills, MCP config, shell aliases

---

## File Structure

### Created
- `.claude/commands/project-setup.md` — the interactive onboarding command
- `docs/setup/SETUP_VERCEL.md` — optional dev deploy guide

### Modified
- `CLAUDE.md` — rewrite to lean CC-facing format
- `.gitignore` — add `.claude/` entries (keep commands, ignore rest)

### Moved
- `docs/SETUP_MAC.md` → `docs/setup/SETUP_MAC.md`
- `docs/SETUP_WINDOWS.md` → `docs/setup/SETUP_WINDOWS.md`
- `docs/SETUP_LINUX.md` → `docs/setup/SETUP_LINUX.md`

### Deleted
- `docs/ONBOARDING_FULL.md` — replaced by `/project-setup`
- `docs/plans/2026-03-09-note-images.md` — old completed plan
- `docs/plans/2026-03-09-note-images-design.md` — old completed design

---

## Chunk 1: Cleanup and restructure

### Task 1: Delete old files

**Files:**
- Delete: `docs/ONBOARDING_FULL.md`
- Delete: `docs/plans/2026-03-09-note-images.md`
- Delete: `docs/plans/2026-03-09-note-images-design.md`

- [ ] **Step 1: Remove old plan files and onboarding doc**

```bash
rm docs/ONBOARDING_FULL.md
rm docs/plans/2026-03-09-note-images.md
rm docs/plans/2026-03-09-note-images-design.md
```

- [ ] **Step 2: Commit**

```bash
git add -u
git commit -m "chore: remove old onboarding doc and completed plan files"
```

### Task 2: Move setup docs to docs/setup/

**Files:**
- Move: `docs/SETUP_MAC.md` → `docs/setup/SETUP_MAC.md`
- Move: `docs/SETUP_WINDOWS.md` → `docs/setup/SETUP_WINDOWS.md`
- Move: `docs/SETUP_LINUX.md` → `docs/setup/SETUP_LINUX.md`

- [ ] **Step 1: Create dir and move files**

```bash
mkdir -p docs/setup
git mv docs/SETUP_MAC.md docs/setup/
git mv docs/SETUP_WINDOWS.md docs/setup/
git mv docs/SETUP_LINUX.md docs/setup/
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: move setup docs to docs/setup/"
```

### Task 3: Rewrite CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

The new CLAUDE.md is CC-facing. It tells CC how to behave, not humans how to code. Key principles:
- No code examples (CC reads the code)
- No file structure (CC can glob)
- Only gotchas that cause real pain
- Points to `/project-setup` for onboarding
- Convex prod ops: env var commands with `--prod`, deploy with `npx convex deploy -y` (auto-targets prod, no `--prod` needed for deploy)

- [ ] **Step 1: Rewrite CLAUDE.md**

Write the file directly (not as a code block — the agent writes the actual file). Content:

- H1: SideQuest Starter
- Section "New User?": If human is new / hasn't set up / first session → run `/project-setup`. Do not guide manually.
- Section "Stack": React 19, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui, Convex, Clerk (`@clerk/react` v6), React Router v7, pnpm
- Section "Convex Production Ops": env var commands use `--prod` flag (`npx convex env set/get/list VAR --prod`). Deploys use `npx convex deploy -y` (auto-targets prod, no `--prod` needed). Never override `CONVEX_DEPLOYMENT` inline — `.env.local` silently wins.
- Section "Gotchas": Clerk v6 only (not v5 `@clerk/clerk-react`), VITE_CONVEX_URL must be added manually, Clerk Bot Protection disable/CAPTCHA, Clerk JWT template required
- Section "UI Components": shadcn/ui, add via `pnpm dlx shadcn@latest add <component>`
- Section "Frontend Design": use `/frontend-design` skill (requires frontend-design plugin)

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md as lean CC-facing reference"
```

### Task 4: Create SETUP_VERCEL.md

**Files:**
- Create: `docs/setup/SETUP_VERCEL.md`

Dev-only deploy guide. Emphasize: use dev env vars, prod Clerk/Convex requires domain setup — talk to Bartosz for that.

- [ ] **Step 1: Write SETUP_VERCEL.md**

Content should cover:
- What Vercel does (free hosting for the React frontend, no backend hosting needed — Convex runs separately)
- Create Vercel account, connect GitHub repo
- Set env vars: `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY` — use the **dev** values (same as `.env.local`)
- Auto-deploys on push to main
- Result: a `*.vercel.app` URL you can open on your phone
- **Important note:** This is dev-only. Clerk dev mode works on `*.vercel.app` domains. For a production setup with custom domain, Clerk production instance, and production Convex — talk to Bartosz.

- [ ] **Step 2: Commit**

```bash
git add docs/setup/SETUP_VERCEL.md
git commit -m "docs: add Vercel dev deploy guide"
```

---

## Chunk 2: The /project-setup command

### Task 5: Create .claude/commands/project-setup.md

**Files:**
- Create: `.claude/commands/project-setup.md`

**Dependency:** Task 7 (skill sources in `tools/skills/`) should be completed first so the command can reference those files. If implementing sequentially, at minimum confirm the `tools/skills/` structure before writing the command.

**Note:** Create `.claude/commands/` directory first: `mkdir -p .claude/commands/`

This is the core deliverable. The command is a prompt file that CC follows interactively. It should NOT contain the actual setup content — it references the docs in `docs/setup/`.

**Flow:**

#### Phase 0: Environment scan (silent, before asking anything)
Run these checks and store results for later use:
- `node -v` — is Node installed? what version?
- `pnpm -v` — is pnpm installed?
- `npx convex --version` — is Convex CLI available?
- `git --version` — is git installed?
- `gh --version` — is GitHub CLI installed?
- `claude --version` — is Claude Code installed? (yes, obviously, but check version)
- Check OS (uname / platform detection)
- Check if `.env.local` exists and has `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`
- Check if `node_modules/` exists (did they run pnpm install?)

#### Phase 1: Plugins
Check which of these marketplace plugins are installed. Detection: try invoking each plugin's known skill name (e.g., check if `superpowers:brainstorming` is in the available skills list, if `simplify` skill exists for code-simplifier, etc.). If detection is uncertain, ask the user: "Can you run `/plugin` and tell me which of these you already have?" Suggest installing missing ones:
- **superpowers** — core skills: TDD, debugging, planning, collaboration patterns
- **code-simplifier** — reviews changed code for quality, suggests simplifications
- **skill-creator** — create and manage custom skills
- **security-guidance** — auto-warns about security issues (injection, XSS, etc.) when editing files
- **frontend-design** — guides building polished, distinctive UIs (not generic AI look)

Tell user to run `/plugin` to install each missing one.

#### Phase 2: Global skills
Check if these skills exist in `~/.claude/skills/`. If missing, offer to copy them from their source:
- `convex-tips` — check for `~/.claude/skills/convex-tips/`
- `browser-debug` — check for `~/.claude/skills/browser-debug/` (NOT `chrome-debug` — we rename it)
- `excalidraw-diagram` — check for `~/.claude/skills/excalidraw-diagram/`

For each missing skill: copy from `tools/skills/<name>/` in this repo to `~/.claude/skills/<name>/`.

**Decision: option (c)** — skills are shipped in `tools/skills/` (version-controlled with the project), command copies to global `~/.claude/skills/`. No external dependencies.

#### Phase 3: Chrome MCP
Check if `chrome-devtools-visible` exists in `~/.claude.json` mcpServers. If missing, offer to add it:

```json
{
  "chrome-devtools-visible": {
    "type": "stdio",
    "command": "npx",
    "args": ["chrome-devtools-mcp@latest", "--browserUrl=http://127.0.0.1:9222"]
  }
}
```

Explain briefly: "This lets Claude see and interact with your browser for debugging. Requires launching Chrome with a debug port — that's what the `qlc` alias does (next step)."

#### Phase 4: Shell aliases
Offer to add these aliases to the user's shell rc file (`~/.zshrc` or `~/.bashrc`):

- `qlc` — launches a separate Chrome instance with debug port for Claude to connect to
  - **macOS:**
    ```
    alias qlc='nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --remote-allow-origins="*" --user-data-dir=$HOME/.config/chrome-profiles/dev --no-first-run --no-default-browser-check about:blank &>/dev/null &; disown'
    ```
  - **Linux:**
    ```
    alias qlc='nohup google-chrome --remote-debugging-port=9222 --remote-allow-origins="*" --user-data-dir=$HOME/.config/chrome-profiles/dev --no-first-run --no-default-browser-check about:blank &>/dev/null &; disown'
    ```
  - **Windows (PowerShell):** Not an alias — provide a script or function. Skip for now, note that Chrome MCP on Windows requires manual Chrome launch with `--remote-debugging-port=9222`.

  Use OS detected in Phase 0 to offer the correct variant.

- `cl` — quick launch Claude Code with auto-accept permissions (skip confirmation prompts)
  ```
  alias cl='claude --dangerously-skip-permissions'
  ```

- `ll` — enhanced file listing
  ```
  alias ll='ls -lh'
  ```

For each alias: give a one-liner explanation of what it does, then ask "These are shortcuts to open things quickly — want me to explain any of them, or just add them?"

Check which aliases already exist before offering. Skip those that are already defined.

#### Phase 5: OS setup + accounts + env vars + first run
Use the environment scan from Phase 0 to skip steps they've already completed.

1. Ask what OS they're on (or detect from Phase 0 scan)
2. Read the appropriate `docs/setup/SETUP_<OS>.md` and walk them through only the steps they haven't done yet (based on Phase 0 results)
3. The OS docs already include: prereqs, Clerk account, Convex project, JWT template, env vars, first run, troubleshooting
4. Help them verify: app running at localhost:5173, can sign in, see data

#### Phase 6: Optional Vercel deploy
Ask: "Want to deploy this so you can see it on your phone or share with others? It's free and takes ~5 minutes."

If yes: read `docs/setup/SETUP_VERCEL.md` and walk through it. Emphasize dev env vars only.

#### Phase 7: Wrap up
"You're all set! Start a new Claude Code session and tell me what you want to build."

Suggest they explore the app, look at the Notes feature as reference for how things work.

- [ ] **Step 1: Write the command file**

Write `.claude/commands/project-setup.md` following the flow above. The file is a prompt/script that CC follows — it's instructions, not code.

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/project-setup.md
git commit -m "feat: add /project-setup onboarding command"
```

### Task 6: Update .gitignore for .claude/

**Files:**
- Modify: `.gitignore`

We want to track `.claude/commands/` but ignore everything else Claude Code might create in `.claude/` (settings, memory, project data, etc.).

- [ ] **Step 1: Add .claude ignore rules**

Add to `.gitignore`:
```
# Claude Code local data (keep commands/)
.claude/*
!.claude/commands/
!.claude/commands/**
```

Note: Both the directory negation AND the content negation are needed — git requires both to track files inside an otherwise-ignored parent.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .claude/ except commands"
```

---

## Chunk 3: Shipped skills source

### Task 7: Ship skill sources in tools/skills/

**Files:**
- Create: `tools/skills/convex-tips/skill.md` (lowercase — matches source)
- Create: `tools/skills/browser-debug/SKILL.md` (uppercase — matches source `chrome-debug/SKILL.md`)
- Create: `tools/skills/excalidraw-diagram/SKILL.md` (uppercase — matches source) + `references/` subdirectory

**Note on filename casing:** The source skills use inconsistent casing (`skill.md` vs `SKILL.md`). Preserve the original casing from each source to avoid breaking any skill loader that expects exact filenames.

These are the source copies that `/project-setup` will copy to `~/.claude/skills/` during onboarding.

- [ ] **Step 1: Create tools/skills/ directory**

```bash
mkdir -p tools/skills
```

- [ ] **Step 2: Copy convex-tips skill**

Copy from `~/.claude/skills/convex-tips/` to `tools/skills/convex-tips/`.

- [ ] **Step 3: Copy browser-debug skill**

Copy from `~/.claude/skills/chrome-debug/` to `tools/skills/browser-debug/`.
Rename to `browser-debug` since that's the name we want for friends.
Exclude `.venv/` and `__pycache__/` — the command should create the venv at install time if needed.

- [ ] **Step 4: Copy excalidraw-diagram skill**

Copy from `~/.claude/skills/excalidraw-diagram/` to `tools/skills/excalidraw-diagram/`.
Exclude `.venv/`, `__pycache__/`, any large binaries.

- [ ] **Step 5: Add tools/skills to .gitignore exceptions**

We need to make sure `tools/` is tracked. It should be by default (not in .gitignore), but verify.

- [ ] **Step 6: Commit**

```bash
git add tools/skills/
git commit -m "feat: ship skill sources for project-setup to install globally"
```

---

## Summary

After all tasks:

```
CLAUDE.md                              # Lean, CC-facing
.claude/commands/project-setup.md      # Interactive onboarding
.gitignore                             # Ignores .claude/* except commands/
docs/setup/
  SETUP_MAC.md                         # OS-specific (moved)
  SETUP_WINDOWS.md                     # OS-specific (moved)
  SETUP_LINUX.md                       # OS-specific (moved)
  SETUP_VERCEL.md                      # Dev deploy guide (new)
tools/skills/
  convex-tips/                         # Source for global install
  browser-debug/                       # Source for global install
  excalidraw-diagram/                  # Source for global install
```

Deleted:
- `docs/ONBOARDING_FULL.md`
- `docs/plans/2026-03-09-note-images*.md`
