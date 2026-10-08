"""AniShadow scraping sidecar.

A tiny HTTP service that exposes Scrapling's fetchers to the Node server:

    GET  /health  -> {ok, scrapling, stealth, uptime}
    POST /fetch   -> {status, headers, bodyBase64, url, mode, elapsedMs, blocked}

Request body for /fetch:
    {url, method?, headers?, body?, json?, timeoutMs?, mode?, cookies?}
      mode: "auto" (default) | "http" | "stealth"

auto  = HTTP fetch with browser TLS impersonation; when a bot-check/challenge
        is detected the request is retried through the stealth browser.
http  = fast HTTP only (curl_cffi TLS fingerprinting)
stealth = headless stealth browser (solves Cloudflare Turnstile)

Run:  python server/scraper/sidecar.py     (SCRAPLING_PORT, default 3002)
"""
from __future__ import annotations

import base64
import json
import os
import sys
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

# patchright/greenlets are bound to the thread that spawned the browser:
# every stealth call must run on ONE persistent worker thread.
_STEALTH_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="stealth")

PORT = int(os.environ.get("SCRAPLING_PORT", "3002"))
HTTP_TIMEOUT_DEFAULT = 20.0
STEALTH_TIMEOUT_DEFAULT = 60.0
MAX_BODY_BYTES = 15 * 1024 * 1024  # never ship >15MB through JSON

# 429 is deliberately absent: a rate limit is not a bot challenge — a browser
# retry cannot fix it and the Node client handles 429 with its own backoff.
BLOCK_STATUSES = {401, 403, 503, 520, 521, 522, 523, 525, 526, 530}
BLOCK_MARKERS = (
    b"just a moment",
    b"cf-chl",
    b"/cdn-cgi/challenge-platform",
    b"challenge-platform",
    b"checking your browser",
    b"attention required",
    b"enable javascript and cookies",
    b"ddos-guard",
    b"ddosguard",
    b"verify you are human",
    b"are you a robot",
    b"cf_chl",
    b"_cf_chl",
    b"cloudflare ray id",
    b"cf-browser-verification",
    b"turnstile",
    b"protected by addguard",
    b"please turn javascript on",
)

_STARTED_AT = time.time()
_LAZY = threading.Lock()

# ── lazily-created shared resources ─────────────────────────────────────────
_sessions: dict[str, object] = {}
_session_locks: dict[str, threading.Lock] = {}
_sessions_guard = threading.Lock()

_stealth_session = None
_stealth_cm = None
_stealth_ok: bool | None = None  # None = unknown, False = unavailable
_stealth_lock = threading.Lock()


def _get_http_session(host: str):
    """Per-host persistent FetcherSession (cookies + connection reuse)."""
    with _sessions_guard:
        if host not in _sessions:
            from scrapling.fetchers import FetcherSession

            _sessions[host] = FetcherSession(impersonate="chrome")
            _session_locks[host] = threading.Lock()
        return _sessions[host], _session_locks[host]


def _get_stealth_session():
    global _stealth_session, _stealth_cm, _stealth_ok
    with _stealth_lock:
        if _stealth_session is not None:
            return _stealth_session
        if _stealth_ok is False:
            return None
        try:
            from scrapling.fetchers import StealthySession

            cm = StealthySession(
                headless=True,
                solve_cloudflare=True,
                block_ads=True,
                max_pages=2,
            )
            entered = cm.__enter__()  # opens the browser and keeps it alive
            _stealth_cm = cm
            _stealth_session = entered if entered is not None else cm
            _stealth_ok = True
            return _stealth_session
        except Exception:
            traceback.print_exc(file=sys.stderr)
            _stealth_ok = False
            _stealth_session = None
            _stealth_cm = None
            return None


def _reset_stealth_session():
    global _stealth_session, _stealth_cm
    with _stealth_lock:
        cm, _stealth_cm = _stealth_cm, None
        _stealth_session = None
        if cm is not None:
            try:
                cm.__exit__(None, None, None)
            except Exception:
                pass  # browser may already be dead; it respawns on demand


def _is_blocked(status: int, body: bytes) -> bool:
    if status in BLOCK_STATUSES:
        return True
    if not body:
        return status >= 400
    low = body[:600_000].lower()
    return any(marker in low for marker in BLOCK_MARKERS)


def _request_kwargs(req: dict, timeout_s: float) -> dict:
    kwargs: dict = {"timeout": timeout_s, "follow_redirects": True, "stealthy_headers": True}
    headers = req.get("headers") or {}
    # curl_cffi sets its own encoding headers; letting both fight breaks bodies
    headers = {
        k: v
        for k, v in headers.items()
        if k.lower() not in ("host", "content-length", "accept-encoding", "connection")
    }
    if headers:
        kwargs["headers"] = headers
    if req.get("cookies"):
        kwargs["cookies"] = req["cookies"]
    return kwargs


def _do_http(req: dict, timeout_s: float):
    from scrapling.fetchers import Fetcher

    url = req["url"]
    method = (req.get("method") or "GET").upper()
    kwargs = _request_kwargs(req, timeout_s)
    kwargs.setdefault("impersonate", "chrome")

    body = req.get("body")
    json_body = req.get("json")
    if method != "GET":
        if json_body is not None:
            kwargs["json"] = json_body
        elif body is not None:
            if isinstance(body, str):
                kwargs["data"] = body.encode("utf-8")
            elif isinstance(body, list):  # raw bytes arrive as int arrays through JSON
                kwargs["data"] = bytes(body)
            else:
                kwargs["data"] = str(body).encode("utf-8")

    if method == "GET":
        return Fetcher.get(url, **kwargs)
    if method == "POST":
        return Fetcher.post(url, **kwargs)
    if method == "PUT":
        return Fetcher.put(url, **kwargs)
    if method == "DELETE":
        return Fetcher.delete(url, **kwargs)
    # fallback: session-style generic call if available
    return Fetcher.get(url, **kwargs)


def _do_stealth(req: dict, timeout_s: float):
    session = _get_stealth_session()
    if session is None:
        raise RuntimeError("stealth browser unavailable")
    url = req["url"]
    method = (req.get("method") or "GET").upper()
    kwargs: dict = {
        "timeout": min(timeout_s, STEALTH_TIMEOUT_DEFAULT),
        "headless": True,
        "solve_cloudflare": True,
        "network_idle": True,
        "google_search": False,
        "block_ads": True,
    }
    headers = {
        k: v
        for k, v in (req.get("headers") or {}).items()
        if k.lower() not in ("host", "content-length", "accept-encoding", "connection")
    }
    if headers:
        kwargs["extra_headers"] = headers
    if req.get("cookies"):
        kwargs["cookies"] = req["cookies"]

    body = req.get("body")
    json_body = req.get("json")
    if json_body is not None:
        kwargs["json"] = json_body
    elif body is not None:
        kwargs["data"] = body.encode("utf-8") if isinstance(body, str) else bytes(body)

    try:
        if method == "GET":
            return session.fetch(url, **kwargs)
        return session.fetch(url, method=method, **kwargs)
    except Exception:
        # browser may have crashed — drop it so the next call respawns
        _reset_stealth_session()
        raise


def _run_stealth(req: dict, timeout_s: float):
    """Run stealth work on the single persistent worker thread.

    The browser (greenlets inside patchright) is bound to the thread that
    created it — calling from HTTP handler threads would crash with
    "cannot switch to a different thread". The executor serializes all
    stealth jobs on one long-lived thread.
    """
    return _STEALTH_EXECUTOR.submit(_do_stealth, req, timeout_s).result()


def _serialize_response(resp, mode: str, elapsed_ms: int) -> dict:
    body: bytes = resp.body or b""
    truncated = False
    if len(body) > MAX_BODY_BYTES:
        body = body[:MAX_BODY_BYTES]
        truncated = True
    headers = {}
    try:
        headers = {str(k): str(v) for k, v in dict(resp.headers).items()}
    except Exception:
        try:
            headers = {str(k): str(v) for k, v in resp.headers.items()}
        except Exception:
            pass
    return {
        "ok": True,
        "status": int(resp.status),
        "headers": headers,
        "bodyBase64": base64.b64encode(body).decode("ascii"),
        "truncated": truncated,
        "url": str(getattr(resp, "url", "") or ""),
        "mode": mode,
        "elapsedMs": elapsed_ms,
    }


def handle_fetch(req: dict) -> tuple[int, dict]:
    url = req.get("url") or ""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return 400, {"ok": False, "error": "invalid url"}

    if req.get("bodyBytes") is not None:
        req["body"] = req["bodyBytes"]

    mode = (req.get("mode") or "auto").lower()
    timeout_ms = float(req.get("timeoutMs") or 20000)
    http_timeout = max(3.0, min(timeout_ms / 1000.0, 60.0))
    t0 = time.time()

    try:
        try:
            resp = _do_http(req, http_timeout)
        except Exception as http_exc:
            # DNS/SNI/connection-level block: give the browser a chance too
            if mode != "auto":
                raise
            sys.stderr.write(f"[sidecar] http failed ({http_exc}), trying stealth\n")
            sys.stderr.flush()
            resp2 = _run_stealth(req, STEALTH_TIMEOUT_DEFAULT)
            elapsed = int((time.time() - t0) * 1000)
            out = _serialize_response(resp2, "stealth", elapsed)
            out["blocked"] = True
            return 200, out

        elapsed = int((time.time() - t0) * 1000)
        body = resp.body or b""
        blocked = _is_blocked(int(resp.status), body)

        if blocked and mode == "auto":
            try:
                resp2 = _run_stealth(req, STEALTH_TIMEOUT_DEFAULT)
                body2 = resp2.body or b""
                # Accept the browser result only if it clearly beat the HTTP
                # response: a success, or the same status with a real body.
                # (Never swap an error for a different, longer error page —
                # e.g. a 404 HTML page is longer than an AniList 429 body.)
                if resp2.status < 400 or (
                    resp2.status == int(resp.status) and len(body2) > len(body)
                ):
                    elapsed = int((time.time() - t0) * 1000)
                    out = _serialize_response(resp2, "stealth", elapsed)
                    out["blocked"] = True
                    return 200, out
            except Exception as exc:
                sys.stderr.write(f"[sidecar] stealth fallback failed: {exc}\n")
                sys.stderr.flush()

        out = _serialize_response(resp, "http", elapsed)
        out["blocked"] = blocked
        return 200, out
    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        sys.stderr.flush()
        return 502, {"ok": False, "error": f"{type(exc).__name__}: {exc}", "mode": mode}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # quiet default access log
        sys.stderr.write("[sidecar] %s\n" % (fmt % args))
        sys.stderr.flush()

    def _send(self, status: int, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # client aborted mid-response — nothing to do
        except OSError:
            pass

    def do_GET(self):
        if self.path == "/health":
            try:
                import scrapling

                version = getattr(scrapling, "__version__", "unknown")
            except Exception:
                version = "missing"
            stealth: bool | str
            if _stealth_ok is True:
                stealth = True
            elif _stealth_ok is False:
                stealth = False
            else:
                stealth = "unknown"
            self._send(
                200,
                {
                    "ok": version != "missing",
                    "scrapling": version,
                    "stealth": stealth,
                    "uptime": int(time.time() - _STARTED_AT),
                    "pid": os.getpid(),
                },
            )
        else:
            self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/fetch":
            self._send(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            req = json.loads(raw.decode("utf-8"))
        except Exception as exc:
            self._send(400, {"ok": False, "error": f"bad request: {exc}"})
            return
        status, payload = handle_fetch(req)
        self._send(status, payload)


def main():
    # Accept larger connection bursts (consumet fires many parallel fetches).
    ThreadingHTTPServer.request_queue_size = 64
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    sys.stderr.write(f"[sidecar] AniShadow Scrapling sidecar on http://127.0.0.1:{PORT}\n")
    sys.stderr.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
