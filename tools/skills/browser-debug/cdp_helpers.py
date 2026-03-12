"""
CDP Helpers for Chrome Extension Development
=============================================
Drop these into a temp script when you need low-level Chrome DevTools Protocol access.

Requirements: pip install websockets
Python 3.9+

Usage: copy relevant functions into a Bash tool python3 -c "..." block or a temp .py file.
"""

import asyncio
import json
import urllib.request
import websockets


# ─── Target Discovery ─────────────────────────────────────────────────────────

def get_targets(port=9222):
    """List all debuggable targets (pages, service workers, etc.)"""
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list") as r:
        return json.loads(r.read())


def find_target(type_hint=None, url_hint=None, port=9222):
    """Find a specific target by type and/or URL substring. Returns WS URL or None."""
    for t in get_targets(port):
        if type_hint and t.get("type") != type_hint:
            continue
        if url_hint and url_hint not in t.get("url", ""):
            continue
        return t.get("webSocketDebuggerUrl")
    return None


def list_targets(port=9222):
    """Print all targets — useful for discovery."""
    for t in get_targets(port):
        print(f"[{t.get('type')}] {t.get('url', '')[:80]}  →  {t.get('webSocketDebuggerUrl', '')}")


def find_extension_sw(ext_id, port=9222):
    """Find service worker for a specific extension."""
    return find_target(type_hint="service_worker", url_hint=ext_id, port=port)


def find_extension_page(page_name, ext_id=None, port=9222):
    """Find a named extension page (e.g. 'options.html', 'popup.html')."""
    hint = ext_id or "chrome-extension://"
    for t in get_targets(port):
        url = t.get("url", "")
        if hint in url and page_name in url:
            return t.get("webSocketDebuggerUrl")
    return None


def find_page(url_hint, port=9222):
    """Find a regular browser tab by URL substring."""
    return find_target(type_hint="page", url_hint=url_hint, port=port)


# ─── Core CDP Eval ────────────────────────────────────────────────────────────

async def cdp_eval(ws_url, expression, timeout=8, await_promise=True):
    """
    Evaluate a JS expression in any CDP target context.
    Returns the result value, or the raw CDP response dict on error.
    """
    async with websockets.connect(ws_url, open_timeout=5) as ws:
        await ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": expression,
                "awaitPromise": await_promise,
                "returnByValue": True,
            }
        }))
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                data = json.loads(msg)
                if data.get("id") == 1:
                    result = data.get("result", {})
                    if "exceptionDetails" in result:
                        return {"error": result["exceptionDetails"]}
                    return result.get("result", {}).get("value", data)
        except asyncio.TimeoutError:
            return "(timeout)"


def eval_in(ws_url, expression, timeout=8):
    """Synchronous wrapper for cdp_eval."""
    return asyncio.run(cdp_eval(ws_url, expression, timeout))


# ─── chrome.storage Helpers ───────────────────────────────────────────────────

def read_storage(ws_url, keys=None):
    """
    Read chrome.storage.local from a service worker or extension page context.
    Pass keys=None to read everything, or keys=["key1","key2"] for specific keys.
    """
    if keys is None:
        expr = "new Promise(r => chrome.storage.local.get(null, r))"
    else:
        key_str = json.dumps(keys)
        expr = f"new Promise(r => chrome.storage.local.get({key_str}, r))"
    return eval_in(ws_url, expr)


def write_storage(ws_url, data: dict):
    """Write to chrome.storage.local."""
    data_str = json.dumps(data)
    expr = f"new Promise(r => chrome.storage.local.set({data_str}, r))"
    return eval_in(ws_url, expr)


def clear_storage(ws_url):
    """Clear all chrome.storage.local."""
    return eval_in(ws_url, "new Promise(r => chrome.storage.local.clear(r))")


# ─── Extension Lifecycle ──────────────────────────────────────────────────────

def reload_extension(sw_ws_url):
    """
    Reload the extension via its service worker.
    NOTE: After this, the SW WS URL is dead. Re-discover via find_extension_sw().
    """
    return eval_in(sw_ws_url, "chrome.runtime.reload()", timeout=3)


def reload_page(page_ws_url):
    """Reload a browser tab."""
    return eval_in(page_ws_url, "location.reload()")


def open_extension_page(sw_ws_url, page_name, ext_id):
    """Open an extension page as a new tab (wakes SW too)."""
    url = f"chrome-extension://{ext_id}/{page_name}"
    return eval_in(sw_ws_url, f"chrome.tabs.create({{url: '{url}'}})")


# ─── Console Log Monitor ──────────────────────────────────────────────────────

async def monitor_console(ws_url, duration=10, prefix_filter=None):
    """
    Subscribe to Runtime console messages for `duration` seconds.
    prefix_filter: if set, only print messages containing this string (e.g. "[MyExt]")

    IMPORTANT: Subscribe BEFORE triggering the action you want to observe —
    past logs are not replayed.
    """
    async with websockets.connect(ws_url, open_timeout=5) as ws:
        # Enable Runtime and Log domains
        for method in ["Runtime.enable", "Log.enable"]:
            await ws.send(json.dumps({"id": 0, "method": method}))

        print(f"[Monitoring console for {duration}s" + (f", filter='{prefix_filter}'" if prefix_filter else "") + "]")
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=duration)
                data = json.loads(msg)
                method = data.get("method", "")
                params = data.get("params", {})

                if method == "Runtime.consoleAPICalled":
                    args = params.get("args", [])
                    text = " ".join(str(a.get("value", a.get("description", ""))) for a in args)
                    if not prefix_filter or prefix_filter in text:
                        level = params.get("type", "log").upper()
                        print(f"[{level}] {text}")

                elif method == "Log.entryAdded":
                    entry = params.get("entry", {})
                    text = entry.get("text", "")
                    if not prefix_filter or prefix_filter in text:
                        level = entry.get("level", "info").upper()
                        print(f"[LOG/{level}] {text}")

        except asyncio.TimeoutError:
            print("[Monitor ended]")


def watch_logs(ws_url, duration=10, prefix_filter=None):
    """Synchronous wrapper for monitor_console."""
    asyncio.run(monitor_console(ws_url, duration, prefix_filter))


# ─── Network Monitor ──────────────────────────────────────────────────────────

async def monitor_network(ws_url, duration=15, url_filter=None):
    """
    Monitor network requests on a page target for `duration` seconds.
    url_filter: only print requests whose URL contains this string.

    Run on a page target (not SW) to see its fetch/XHR traffic.
    """
    async with websockets.connect(ws_url, open_timeout=5) as ws:
        await ws.send(json.dumps({"id": 0, "method": "Network.enable"}))
        pending = {}  # requestId -> url

        print(f"[Monitoring network for {duration}s" + (f", filter='{url_filter}'" if url_filter else "") + "]")
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=duration)
                data = json.loads(msg)
                method = data.get("method", "")
                params = data.get("params", {})

                if method == "Network.requestWillBeSent":
                    req = params.get("request", {})
                    url = req.get("url", "")
                    if not url_filter or url_filter in url:
                        req_id = params.get("requestId")
                        pending[req_id] = url
                        print(f"[→] {req.get('method', 'GET')} {url[:100]}")

                elif method == "Network.responseReceived":
                    resp = params.get("response", {})
                    url = resp.get("url", "")
                    if not url_filter or url_filter in url:
                        status = resp.get("status")
                        print(f"[←] {status} {url[:100]}")

        except asyncio.TimeoutError:
            print("[Monitor ended]")


def watch_network(ws_url, duration=15, url_filter=None):
    """Synchronous wrapper for monitor_network."""
    asyncio.run(monitor_network(ws_url, duration, url_filter))


# ─── CDP Command (generic) ────────────────────────────────────────────────────

async def cdp_command(ws_url, method, params=None, timeout=8):
    """Send any raw CDP command and return the result."""
    async with websockets.connect(ws_url, open_timeout=5) as ws:
        await ws.send(json.dumps({"id": 1, "method": method, "params": params or {}}))
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                data = json.loads(msg)
                if data.get("id") == 1:
                    return data.get("result", data)
        except asyncio.TimeoutError:
            return "(timeout)"


# ─── Example usage ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Discover all targets
    list_targets()

    # Replace with your extension ID
    EXT_ID = "YOUR_EXTENSION_ID_HERE"

    sw_ws = find_extension_sw(EXT_ID)
    if not sw_ws:
        print("Service worker not found — is the extension loaded and Chrome running on 9222?")
        exit(1)

    print("\n--- chrome.storage.local ---")
    storage = read_storage(sw_ws)
    print(json.dumps(storage, indent=2, default=str)[:2000])

    # Watch SW console logs for 10 seconds
    # watch_logs(sw_ws, duration=10)
