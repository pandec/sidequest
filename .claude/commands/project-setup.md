# Project Setup

Interactive onboarding for new SideQuest Starter users. Follow this flow step by step, asking questions and waiting for answers. Be conversational, not lecture-y. Adjust depth based on user's experience.

---

## Phase 0: Environment Scan

Run these checks silently before asking anything. Store results — use them to skip completed steps later.

```bash
node -v
pnpm -v
npx convex --version
git --version
gh --version
claude --version
uname -s   # detect OS: Darwin = macOS, Linux = Linux, MINGW/MSYS = Windows
```

Also check:
- Does `.env.local` exist? Does it contain `VITE_CONVEX_URL` and `VITE_CLERK_PUBLISHABLE_KEY`?
- Does `node_modules/` exist?
- Is there a `convex/_generated/` directory? (indicates convex dev has been run)

Summarize to the user: "Let me check what you already have set up..." then report what's ready and what's missing. This sets the tone — they know you're aware of their current state.

---

## Phase 1: Plugins

Check which of these marketplace plugins are available by looking at the skills/agents loaded in this session. Detection hints:
- **superpowers** — look for skills like `superpowers:brainstorming`, `superpowers:writing-plans`
- **code-simplifier** — look for `simplify` skill
- **skill-creator** — look for `skill-creator:skill-creator` skill
- **security-guidance** — look for security-related hooks/agents
- **frontend-design** — look for `frontend-design` skill

If detection is uncertain, ask: "Can you run `/plugin` and tell me which of these you already have?"

For each missing plugin, explain in one line what it does and tell them to run `/plugin` to install it:

- **superpowers** — core skills library: planning, TDD, debugging, collaboration patterns. Makes Claude much better at structured work.
- **code-simplifier** — after you write code, reviews it for quality and suggests simplifications
- **skill-creator** — lets you create and manage custom skills (reusable instructions for Claude)
- **security-guidance** — automatically warns about security issues (injection, XSS, etc.) when you edit files
- **frontend-design** — guides Claude to build polished, distinctive UIs instead of generic-looking ones

After they've installed plugins, tell them to run `/reload-plugins` to activate.

---

## Phase 2: Global Skills

Check if these skills exist in `~/.claude/skills/`:
- `~/.claude/skills/convex-tips/` — Convex CLI gotchas
- `~/.claude/skills/browser-debug/` — Chrome debugging with MCP/CDP
- `~/.claude/skills/excalidraw-diagram/` — visual diagram creation

For each missing skill, offer to install it by copying from the repo:

```bash
cp -r tools/skills/<skill-name> ~/.claude/skills/<skill-name>
```

Briefly explain each:
- **convex-tips** — prevents common mistakes with Convex CLI (like accidentally targeting dev instead of prod)
- **browser-debug** — lets Claude see and interact with your browser for testing and debugging
- **excalidraw-diagram** — Claude can create visual diagrams (architecture, flows, etc.)

---

## Phase 3: Chrome MCP

Read `~/.claude.json` and check if `mcpServers` contains `chrome-devtools-visible`.

If missing, offer to add it. Explain: "This lets Claude see and interact with your browser for debugging. It connects to a Chrome instance running with a debug port — we'll set up a shortcut for that next."

Add to `~/.claude.json` under `mcpServers`:

```json
"chrome-devtools-visible": {
  "type": "stdio",
  "command": "npx",
  "args": ["chrome-devtools-mcp@latest", "--browserUrl=http://127.0.0.1:9222"]
}
```

If `~/.claude.json` doesn't exist or has no `mcpServers` key, create/add it. Be careful not to overwrite existing content.

---

## Phase 3.5: Status Line

Check if the user has a statusline configured. Read their `~/.claude/settings.json` and look for a `statusLine` key.

If no statusline is configured, offer to set one up: "Claude Code can show useful info at the bottom of your terminal — current directory, git branch, model, context usage. Want me to set that up?"

If yes:
1. Copy `tools/statusline-command.sh` to `~/.claude/statusline-command.sh`
2. Make it executable: `chmod +x ~/.claude/statusline-command.sh`
3. Add to `~/.claude/settings.json`:
   ```json
   "statusLine": {
     "type": "command",
     "command": "bash ~/.claude/statusline-command.sh"
   }
   ```
   Be careful not to overwrite existing settings — merge into the existing JSON.

If they already have a statusline configured, skip this step entirely.

---

## Phase 4: Shell Aliases

Offer to add useful shortcuts. Present them as: "I can add a few shell shortcuts that make things easier. These are just aliases — quick ways to open things:"

List them with one-liner explanations:
- `qlc` — opens a separate Chrome window that Claude can connect to (for browser debugging)
- `cl` — launches Claude Code with auto-accept permissions (skips confirmation prompts)
- `ll` — shows files in a nice list format

Then ask: "Want me to explain any of these in more detail, or just add them all?"

Before adding, check which already exist in the user's shell rc file. Skip any that are already defined.

Detect shell rc file: `~/.zshrc` for zsh, `~/.bashrc` for bash.

### Alias definitions

**`cl`:**
```bash
alias cl='claude --dangerously-skip-permissions'
```

**`ll`:**
```bash
alias ll='ls -lh'
```

**`qlc` (OS-dependent, use OS from Phase 0):**

macOS:
```bash
alias qlc='nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --remote-allow-origins="*" --user-data-dir=$HOME/.config/chrome-profiles/dev --no-first-run --no-default-browser-check about:blank &>/dev/null &; disown'
```

Linux:
```bash
alias qlc='nohup google-chrome --remote-debugging-port=9222 --remote-allow-origins="*" --user-data-dir=$HOME/.config/chrome-profiles/dev --no-first-run --no-default-browser-check about:blank &>/dev/null &; disown'
```

Windows: Skip `qlc` alias. Note that Chrome MCP on Windows requires manually launching Chrome with `--remote-debugging-port=9222` flag.

After adding aliases, remind them to run `source ~/.zshrc` (or `~/.bashrc`) or open a new terminal.

---

## Phase 5: Project Setup (OS-specific)

Use the OS detected in Phase 0.

1. Read the appropriate setup doc:
   - macOS: `docs/setup/SETUP_MAC.md`
   - Windows: `docs/setup/SETUP_WINDOWS.md`
   - Linux: `docs/setup/SETUP_LINUX.md`

2. Walk through the doc interactively, BUT skip steps the user has already completed (based on Phase 0 scan). For example:
   - Node installed? Skip Node install steps.
   - pnpm installed? Skip pnpm install.
   - `node_modules/` exists? Skip `pnpm install`.
   - `.env.local` has both VITE_ vars? Skip env var setup.
   - `convex/_generated/` exists? They've already run convex dev.

3. The setup docs cover everything: prereqs, Clerk account, Convex project, JWT template, env vars, first run, troubleshooting.

4. At the end, verify together:
   - App running at localhost:5173
   - Can sign in with Clerk
   - Can create a note and see it appear
   - Data persists on refresh

If something doesn't work, use the troubleshooting table at the end of the setup doc.

---

## Phase 6: Optional Vercel Deploy

Ask: "Want to deploy this so you can see it on your phone or share with others? It's free and takes about 5 minutes."

If yes:
1. Read `docs/setup/SETUP_VERCEL.md`
2. Walk through it step by step
3. Emphasize: use the same env var values as `.env.local` (dev values). This is a dev deployment.
4. Important: For production with a custom domain — talk to Bartosz.

If no: skip, move to wrap up.

---

## Phase 7: Wrap Up

Tell them:
"You're all set! Here's what to do next:
- Start a **new Claude Code session** (this one was just setup)
- Explore the app — the Notes feature is a good reference for how things work
- When you want to build something, just describe it to Claude
- Use `/frontend-design` when building UI for better-looking results"

---

## Important Notes

- Be patient. These users are mildly technical, not developers.
- One step at a time. Don't dump walls of text.
- If they seem confused, offer to explain.
- If something fails, troubleshoot with them — don't just say "check the docs."
- Celebrate small wins ("Nice, Node is installed!" / "Your app is running!").
