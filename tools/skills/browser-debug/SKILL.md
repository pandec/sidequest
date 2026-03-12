---
name: browser-debug
description: Debug, test, and interact with Chrome browser — web apps, extensions, service workers, storage, console, network. Orchestrates four approaches (playwright-cli, Chrome DevTools MCP, MCP-indirect, raw CDP) and guides which to use when. Use this skill whenever working with Chrome — checking pages, reading console errors, testing UI, inspecting storage, monitoring network, reloading extensions, screenshots, verifying browser behavior, headless testing, session persistence. Trigger on mentions of MCP, CDP, service workers, chrome.storage, browser debugging, or when the user says "check the browser", "test this page", "what's in storage", "read console logs", "take a screenshot", etc.
argument-hint: [topic or task]
user-invocable: true
---

# Chrome Debug & Test Guide

Use this skill when working with Chrome in any capacity — web apps, Chrome extensions, or general browser debugging.

## Project-Specific Notes

When working on a Chrome extension project, check for a local notes file at `.claude/skills/chrome-debug/notes.md`. If it exists, read it — it contains project-specific details (extension ID, page URLs, build commands, gotchas).

**When to create one:** If you're doing extension work and there's no `notes.md` yet, create `.claude/skills/chrome-debug/notes.md` (NOT `SKILL.md`) with the project's extension ID, page names, build command, and any project-specific patterns discovered during debugging. Keep it short — just the facts needed to avoid re-discovering things.

**Template:**
```markdown
# Chrome Debug — Project Notes
- Extension ID: <from manifest key>
- Pages: popup.html, options.html, etc.
- Build: <build command>
- SW log prefix: <if any>
- Known gotchas: <project-specific issues>
```

For plain web app work (no extension), this file isn't needed — just use the tools below directly.

## Quick Decision

```
What do I need?
│
├── Web app: test UI / fill forms / screenshots / headless?
│   └── playwright-cli  → invoke /playwright-cli for full command ref
│
├── Web app: check console errors on user's Chrome?
│   └── MCP: list_pages → select_page → list_console_messages
│
├── Extension: interact with ext pages / click / fill?
│   └── MCP on user's qlc Chrome (port 9222)
│
├── Extension: read/write chrome.storage?
│   └── MCP-indirect (open ext page → evaluate_script)
│
├── Extension: trigger background action?
│   └── MCP-indirect (sendMessage from ext page)
│
├── Extension: service worker console logs?
│   └── CDP (Runtime.enable on SW target)
│
├── Extension: reload after code change?
│   └── CDP (chrome.runtime.reload() on SW)
│
├── Network monitoring (detailed)?
│   └── CDP (Network.enable) or playwright-cli network
│
├── Headless + real sessions (Google, Outlook)?
│   └── playwright-cli --persistent (sessions survive headed→headless)
│
└── Not sure → playwright-cli for web, MCP/CDP for extensions
```

## Tool Comparison

| | playwright-cli | Chrome DevTools MCP | Raw CDP |
|---|---|---|---|
| **What** | CLI browser automation | MCP server wrapping DevTools | Direct WebSocket to Chrome |
| **Chrome instance** | Its own (real Chrome) | User's `qlc` (port 9222) | User's `qlc` (port 9222) |
| **Headless** | Yes (default) | No | No |
| **Best for** | E2E, web apps, sessions, CI | Extension pages, a11y snapshots | SW logs, ext reload, network |
| **Docs** | `/playwright-cli` skill | MCP tools (built-in) | cdp_helpers.py (this skill) |
| Extension pages | No | **Yes** | **Yes** |
| chrome.storage | No | **Yes** (via ext page) | **Yes** (via SW) |
| SW console logs | No | No | **Yes** |
| Extension reload | No | No | **Yes** |
| Google/Outlook sign-in | **Yes** | Manual only | Manual only |
| Session persistence | **Yes** (--persistent) | No | No |
| CI-ready | **Yes** | No | No |

---

## playwright-cli

For web app testing, sessions, headless automation. Refer to `/playwright-cli` skill for full command reference.

**Key things to know:**
- Uses its own real Chrome (separate from user's `qlc` Chrome) — Google sign-in works
- `--persistent` keeps sessions between runs — sign in headed once, test headless after
- `--headed` to see the browser (headless by default)
- `state-save`/`state-load` for portable auth snapshots

```bash
# First time: sign in
playwright-cli open --persistent --headed
playwright-cli goto https://example.com
# ... user signs in ...
playwright-cli state-save auth-state.json
playwright-cli close

# Later: headless with sessions
playwright-cli open --persistent
playwright-cli goto https://example.com  # signed in
playwright-cli console error
playwright-cli close
```

**Limitation:** Cannot load Chrome extensions (`--load-extension` not supported). For extension pages, chrome.storage, or service workers → use MCP/CDP.

---

## Chrome DevTools MCP (user's Chrome)

For interacting with the user's `qlc` Chrome instance (port 9222). MCP tools: `list_pages`, `new_page`, `evaluate_script`, `take_screenshot`, `click`, `fill`.

### Quick Console Check (any web app)
1. `list_pages` → `select_page` (by pageId)
2. `list_console_messages` with `types: ["error", "warn"]`
3. `get_console_message` with msgid for details

### Project-Specific Info
Each project should store extension ID, page URLs, and debug notes in its `CLAUDE.md` or `docs/chrome-ext-dev-workflow.md`. This skill is generic — project docs add specifics.

### MCP-Indirect (preferred for extension debugging)

Open an extension page via MCP, then use `evaluate_script` to access extension APIs:

```javascript
// Open extension page (get EXT_ID from project's CLAUDE.md)
mcp__chrome-devtools-visible__new_page({ url: "chrome-extension://EXT_ID/popup.html" })

// Read chrome.storage
mcp__chrome-devtools-visible__evaluate_script({
  function: `async () => {
    const data = await chrome.storage.local.get(null);
    return Object.keys(data);
  }`
})

// Trigger background action
mcp__chrome-devtools-visible__evaluate_script({
  function: `async () => {
    return await chrome.runtime.sendMessage({type: 'some-action'});
  }`
})

// Check DOM rendering
mcp__chrome-devtools-visible__evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('table tr');
    return [...rows].slice(0, 5).map(r => r.textContent);
  }`
})
```

### Setup
- Chrome on port 9222 via `qlc` alias (must be running BEFORE Claude Code starts)
- Extensions loaded manually: `chrome://extensions` > Load unpacked
- Fixed extension ID via `key` field in `manifest.json`

### MCP Configuration (`~/.claude.json`)
```json
"mcpServers": {
  "chrome-devtools-visible": {
    "type": "stdio",
    "command": "npx",
    "args": ["chrome-devtools-mcp@latest", "--browserUrl=http://127.0.0.1:9222"]
  }
}
```

---

## Raw CDP (Service Workers & Network)

For SW console logs, extension reload, detailed network monitoring. Requires WebSocket to Chrome targets on port 9222.

### CDP Python Venv

A dedicated venv with `websockets` is pre-installed at:
```
~/.claude/skills/chrome-debug/.venv/bin/python3
```
Use this Python for all CDP scripts — system Python on macOS blocks pip install.

```bash
CDP_PY=~/.claude/skills/chrome-debug/.venv/bin/python3
CDP_PORT=${CDP_PORT:-9222}  # override: CDP_PORT=9333
```

### Target Discovery
```bash
curl -s http://127.0.0.1:${CDP_PORT:-9222}/json/list | python3 -c "
import sys,json; targets=json.load(sys.stdin)
for t in targets:
    print(f'{t[\"type\"]:20s} {(t.get(\"title\",\"\"))[:50]:50s} {t[\"url\"][:80]}')"
```

### Using cdp_helpers.py
```bash
# List targets
$CDP_PY -c "
import sys,os; sys.path.insert(0, '$HOME/.claude/skills/chrome-debug')
from cdp_helpers import *
list_targets(port=int(os.environ.get('CDP_PORT', 9222)))
"

# SW console logs (replace EXT_ID from project CLAUDE.md)
$CDP_PY -c "
import sys,os; sys.path.insert(0, '$HOME/.claude/skills/chrome-debug')
from cdp_helpers import *
p = int(os.environ.get('CDP_PORT', 9222))
sw = find_extension_sw('EXT_ID', port=p)
if sw: watch_logs(sw, duration=10)
"

# Read chrome.storage.local from SW
$CDP_PY -c "
import sys,os,json; sys.path.insert(0, '$HOME/.claude/skills/chrome-debug')
from cdp_helpers import *
p = int(os.environ.get('CDP_PORT', 9222))
sw = find_extension_sw('EXT_ID', port=p)
if sw: print(json.dumps(read_storage(sw), indent=2, default=str)[:3000])
"

# Reload extension
$CDP_PY -c "
import sys,os; sys.path.insert(0, '$HOME/.claude/skills/chrome-debug')
from cdp_helpers import *
p = int(os.environ.get('CDP_PORT', 9222))
sw = find_extension_sw('EXT_ID', port=p)
if sw: reload_extension(sw)
"
```

---

## Extension Dev Loop

Build → reload → test cycle:

1. Edit source → build (project-specific command)
2. Reload extension: CDP `reload_extension(sw)`
3. Re-discover WS IDs (old ones are dead after reload)
4. Test: MCP-indirect — open ext page, read storage, trigger actions
5. If needed: CDP for SW logs (start AFTER reload, not before)
6. Re-inject content scripts on open tabs: `chrome.tabs.reload(tabId, {bypassCache: true})` from ext page context

### Autonomous Build → Reload → Test
```bash
# 1. Build
node build.mjs

# 2. Reload extension via CDP
$CDP_PY -c "
import sys,os; sys.path.insert(0, '$HOME/.claude/skills/chrome-debug')
from cdp_helpers import *
p = int(os.environ.get('CDP_PORT', 9222))
sw = find_extension_sw('EXT_ID', port=p)
if sw: reload_extension(sw); print('Reloaded')
else: print('SW not found')
"

# 3. Wait for SW restart
sleep 3
```

Then use MCP-indirect to verify.

---

## Key Gotchas (Hard-Won)

### MCP
- `list_pages` doesn't show `chrome-extension://` URLs — use CDP `curl -s http://127.0.0.1:9222/json/list` to discover, then MCP `new_page` to surface
- `evaluate_script` on a regular web page has NO access to `chrome.*` APIs — must target an extension page
- Chrome must be on port 9222 BEFORE Claude Code starts (silent failure otherwise)
- Both `chrome-devtools` and `chrome-devtools-visible` MCP servers use port 9222

### CDP
- WS IDs are ephemeral — re-discover after extension reload
- Console logs are forward-only — subscribe BEFORE triggering the action
- SW goes idle after ~30s — wake via extension page or sendMessage
- SW log watcher dies silently on extension reload — always start AFTER reload
- CDP 403 Forbidden on page targets without `--remote-allow-origins=*` — SW targets work fine
- Use the skill's venv Python, not system Python

### Extension Development
- Content scripts must be IIFE, not ESM (esbuild: `format: "iife"`)
- Content script vs main world: `"world": "MAIN"` for fetch/XHR interception
- Reload doesn't re-inject content scripts on open tabs — use `chrome.tabs.reload()`
- Trusted Types blocks blob URL injection in SPAs like OWA
- GCal `events.patch` with partial `extendedProperties` deletes missing keys

### Headless Chrome (without playwright-cli)
Headless Chrome does NOT support extensions. These all fail:
- `--headless=new` + `--load-extension`
- `--headless=new` + `--enable-extensions`
- Off-screen visible Chrome + `--load-extension`

The `--load-extension` CLI flag causes `ERR_BLOCKED_BY_CLIENT` even in visible mode. Only manual loading via `chrome://extensions` works. For headless extension testing, use playwright-cli with `@playwright/test` fixtures (Playwright's Chromium supports extensions headless with `channel: 'chromium'`).
