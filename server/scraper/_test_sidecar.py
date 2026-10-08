import json
import sys
import threading
import time
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, "server/scraper")
import sidecar  # noqa: E402

PORT = 3902
server = ThreadingHTTPServer(("127.0.0.1", PORT), sidecar.Handler)
server.daemon_threads = True
threading.Thread(target=server.serve_forever, daemon=True).start()
time.sleep(0.2)


def get(path):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{path}", timeout=10) as r:
        return json.loads(r.read())


def post(payload):
    req = urllib.request.Request(
        f"http://127.0.0.1:{PORT}/fetch",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


# 1. health
h = get("/health")
print("HEALTH:", h)

# 2. plain http fetch
st, res = post({"url": "https://example.com/", "timeoutMs": 15000, "mode": "http"})
import base64

body = base64.b64decode(res.get("bodyBase64", "")) if res.get("ok") else b""
print("HTTP GET:", st, res.get("status"), res.get("mode"), "len:", len(body), "err:", res.get("error"))

# 3. POST with JSON body
st, res = post(
    {
        "url": "https://httpbin.org/post",
        "method": "POST",
        "json": {"ping": "pong"},
        "timeoutMs": 20000,
        "mode": "http",
    }
)
body = base64.b64decode(res.get("bodyBase64", "")) if res.get("ok") else b""
print("HTTP POST:", st, res.get("status"), "echoed:", b"ping" in body, "err:", res.get("error"))

# 4. auto mode against a real Cloudflare challenge page (stealth fallback)
t0 = time.time()
st, res = post({"url": "https://nopecha.com/demo/cloudflare", "timeoutMs": 20000, "mode": "auto"})
body = base64.b64decode(res.get("bodyBase64", "")) if res.get("ok") else b""
print(
    "AUTO CF:",
    st,
    res.get("status"),
    res.get("mode"),
    "blocked:",
    res.get("blocked"),
    "solved:",
    b"padded_content" in body,
    "elapsed:",
    round(time.time() - t0, 1),
    "err:",
    res.get("error"),
)
server.shutdown()
