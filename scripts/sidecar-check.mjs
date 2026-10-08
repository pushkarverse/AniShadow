/**
 * Verifies the Scrapling sidecar end-to-end:
 *   1. spawns `python server/scraper/sidecar.py` on SCRAPLING_CHECK_PORT
 *   2. GET  /health
 *   3. POST /fetch plain GET (example.com)
 *   4. POST /fetch with bodyBytes → AniList GraphQL POST (proves bodies survive)
 *
 * Usage: node scripts/sidecar-check.mjs
 */
import { spawn } from "node:child_process";

const PORT = String(process.env.SCRAPLING_CHECK_PORT || 3099);
const BASE = `http://127.0.0.1:${PORT}`;
const SIDE = process.env.SCRAPLING_PYTHON || "python";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail++;
    console.log(`  FAIL  ${name} — ${err.message}`);
  }
}

function waitForHealth(deadlineMs = 60_000) {
  const deadline = Date.now() + deadlineMs;
  return new Promise((resolve, reject) => {
    (async function poll() {
      for (;;) {
        try {
          const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            await res.arrayBuffer();
            return resolve();
          }
        } catch { /* not up yet */ }
        if (Date.now() > deadline) return reject(new Error("sidecar health timeout"));
        await new Promise((r) => setTimeout(r, 500));
      }
    })();
  });
}

async function postFetch(payload) {
  const res = await fetch(`${BASE}/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
  return res.json();
}

async function main() {
  const child = spawn(SIDE, ["server/scraper/sidecar.py"], {
    env: { ...process.env, SCRAPLING_PORT: PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[sidecar] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[serr] ${d}`));
  let exited = null;
  child.on("exit", (code) => { exited = code; });

  try {
    await waitForHealth();

    await check("GET /health reports scrapling", async () => {
      const res = await fetch(`${BASE}/health`);
      const json = await res.json();
      assert(json.ok, JSON.stringify(json));
    });

    await check("plain GET via /fetch (example.com)", async () => {
      const json = await postFetch({ url: "https://example.com/", method: "GET", timeoutMs: 15000 });
      assert(json.ok, JSON.stringify(json).slice(0, 200));
      assert(json.status === 200, `status ${json.status}`);
      const body = Buffer.from(json.bodyBase64, "base64").toString("utf8");
      assert(body.includes("Example Domain"), "unexpected body");
    });

    await check("GraphQL POST via /fetch bodyBytes (AniList)", async () => {
      const query = `query ($page: Int) { Page(page: $page, perPage: 3) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji } } } }`;
      const bytes = Array.from(
        new TextEncoder().encode(JSON.stringify({ query, variables: { page: 1 } }))
      );
      const json = await postFetch({
        url: "https://graphql.anilist.co",
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        bodyBytes: bytes,
        timeoutMs: 20000,
        mode: "auto",
      });
      assert(json.ok, JSON.stringify(json).slice(0, 200));
      assert(json.status === 200, `status ${json.status} — body dropped?`);
      const body = Buffer.from(json.bodyBase64, "base64").toString("utf8");
      const parsed = JSON.parse(body);
      assert(parsed?.data?.Page?.media?.length > 0, `no media: ${body.slice(0, 160)}`);
    });

    console.log(`\n[sidecar-check] ${pass} passed, ${fail} failed`);
    process.exitCode = fail === 0 ? 0 : 1;
  } catch (err) {
    console.error(`[sidecar-check] fatal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (exited === null) child.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
}

main();
