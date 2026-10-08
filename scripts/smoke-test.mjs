/**
 * End-to-end smoke test for the built server (dist-server/index.mjs).
 *
 * Boots the server on SMOKE_PORT (default 3145) with the production static
 * bundle, then verifies the SPA shell, history fallback, JSON 404s, every
 * data endpoint, and the provider registry endpoints.
 *
 * Usage: pnpm build && pnpm smoke-test
 *        pnpm smoke-test -- --with-sidecar   (route all scrapes through Python)
 */
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = String(process.env.SMOKE_PORT || 3145);
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = process.cwd();
const SERVER = path.join(ROOT, "dist-server", "index.mjs");
const WITH_SIDECAR =
  process.argv.includes("--with-sidecar") || process.env.SMOKE_SIDECAR === "1";
const SIDECAR_PORT = String(process.env.SMOKE_SIDECAR_PORT || 3146);
const SIDECAR_PY = process.env.SCRAPLING_PYTHON || "python";

let pass = 0;
let fail = 0;
const failed = [];

async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    fail++;
    failed.push(name);
    console.log(`  FAIL  ${name} — ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function getJson(url, timeoutMs = 60_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function getText(url, timeoutMs = 20_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

async function waitForReady() {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
      if (res.status === 200) {
        await res.arrayBuffer();
        return;
      }
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error("server did not become ready in 60s");
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main() {
  console.log(`[smoke] building checks against ${BASE} (${SERVER})`);

  let sidecar = null;
  if (WITH_SIDECAR) {
    console.log(`[smoke] starting Scrapling sidecar on ${SIDECAR_PORT}...`);
    sidecar = spawn(SIDECAR_PY, ["server/scraper/sidecar.py"], {
      cwd: ROOT,
      env: { ...process.env, SCRAPLING_PORT: SIDECAR_PORT },
      stdio: ["ignore", "pipe", "pipe"],
    });
    sidecar.stdout.on("data", (d) => process.stdout.write(`[side] ${d}`));
    sidecar.stderr.on("data", (d) => process.stderr.write(`[serr] ${d}`));
    const healthDeadline = Date.now() + 60_000;
    let healthy = false;
    while (Date.now() < healthDeadline && !healthy) {
      try {
        const res = await fetch(`http://127.0.0.1:${SIDECAR_PORT}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        healthy = res.ok;
        if (healthy) await res.arrayBuffer();
      } catch { /* not up */ }
      if (!healthy) await new Promise((r) => setTimeout(r, 500));
    }
    if (!healthy) throw new Error("sidecar did not become healthy in 60s");
    console.log("[smoke] sidecar ready (all scrapes → Scrapling)\n");
  }

  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: "production",
      ...(WITH_SIDECAR
        ? { SCRAPLING_URL: `http://127.0.0.1:${SIDECAR_PORT}`, SCRAPLING_REQUIRED: "1" }
        : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[derr] ${d}`));
  let exited = null;
  child.on("exit", (code) => { exited = code; });

  try {
    await waitForReady();
    console.log("[smoke] server ready\n");

    // ── Shell & routing ────────────────────────────────────────────
    await check("SPA shell served at /", async () => {
      const { status, text, headers } = await getText(`${BASE}/`);
      assert(status === 200, `status ${status}`);
      assert((headers.get("content-type") || "").includes("text/html"), "not html");
      assert(text.includes('id="root"'), "missing #root mount");
    });

    await check("history fallback for deep routes", async () => {
      const { status, text } = await getText(`${BASE}/watch/some/deep/route`);
      assert(status === 200, `status ${status}`);
      assert(text.includes('id="root"'), "missing #root mount");
    });

    await check("unknown /api/* returns JSON 404", async () => {
      const { status, json } = await getJson(`${BASE}/api/definitely-not-a-route`);
      assert(status === 404, `status ${status}`);
      assert(json && json.error === "Not found", `body: ${JSON.stringify(json)}`);
    });

    // ── Anime data ─────────────────────────────────────────────────
    await check("GET /api/search?q=naruto", async () => {
      const { status, json } = await getJson(`${BASE}/api/search?q=naruto`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.results), "results not an array");
      assert(json.results.length > 0, "empty results");
    });

    await check("GET /api/trending", async () => {
      const { status, json } = await getJson(`${BASE}/api/trending`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.results) && json.results.length > 0, "no results");
    });

    await check("GET /api/random", async () => {
      const { status, json } = await getJson(`${BASE}/api/random`, 60_000);
      assert(status === 200, `status ${status}`);
      assert(json && (json.id || json.title), `unexpected body: ${JSON.stringify(json).slice(0, 120)}`);
    });

    await check("GET /api/anime/16498/info", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/16498/info`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(json?.id && json?.title, `unexpected body: ${JSON.stringify(json).slice(0, 120)}`);
    });

    await check("GET /api/anime/home", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/home`, 120_000);
      assert(status === 200, `status ${status}`);
      for (const key of ["trending", "popular", "ongoing"]) {
        assert(Array.isArray(json?.[key]), `${key} not an array`);
      }
    });

    await check("GET /api/anime/list?kind=trending", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/list?kind=trending`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.results), "results not an array");
    });

    await check("GET /api/anime/advanced-search?q=naruto", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/advanced-search?q=naruto`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.results), "results not an array");
    });

    await check("GET /api/anime/16498/details", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/16498/details`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(json?.anime?.title, "missing anime");
    });

    await check("GET /api/anime/16498/related?genres=Action", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/16498/related?genres=Action`, 90_000);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.results), "results not an array");
    });

    await check("GET /api/anime/16498/watch?ep=1", async () => {
      const { status, json } = await getJson(`${BASE}/api/anime/16498/watch?ep=1`, 180_000);
      assert(status === 200, `status ${status}`);
      assert(json?.anime?.title, "missing anime");
      assert("stream" in json, "missing stream key");
      console.log(`        (stream: ${json.stream ? "resolved" : "null"})`);
    });

    // ── Reader ─────────────────────────────────────────────────────
    await check("GET /api/reader/home?tab=manga", async () => {
      const { status, json } = await getJson(`${BASE}/api/reader/home?tab=manga`, 120_000);
      assert(status === 200, `status ${status}`);
      assert(json?.trendingManga, "missing trendingManga");
    });

    let chapterId = null;
    await check("GET /api/reader/details/30002", async () => {
      const { status, json } = await getJson(`${BASE}/api/reader/details/30002`, 120_000);
      assert(status === 200, `status ${status}`);
      assert(json?.details?.title, "missing details");
      assert(Array.isArray(json.details.chapters), "chapters not an array");
      assert(json.details.chapters.length > 0, "no chapters resolved");
      chapterId = json.details.chapters[0].id;
    });

    await check("GET /api/reader/chapter (dynamic chapter id)", async () => {
      assert(chapterId, "no chapter id from previous check");
      const { status, json } = await getJson(
        `${BASE}/api/reader/chapter?chapter=${encodeURIComponent(chapterId)}`,
        120_000
      );
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.pages) && json.pages.length > 0, "no pages");
    });

    // ── Provider registry ──────────────────────────────────────────
    await check("GET /api/providers (main-first ordering)", async () => {
      const { status, json } = await getJson(`${BASE}/api/providers`);
      assert(status === 200, `status ${status}`);
      assert(Array.isArray(json?.providers) && json.providers.length >= 20, `count ${json?.count}`);
      const anime = json.providers.filter((p) => p.categories.includes("anime"));
      const firstNonMain = anime.findIndex((p) => !p.main);
      const lastMain = anime.map((p) => p.main).lastIndexOf(true);
      assert(lastMain < firstNonMain, "main providers not first within anime");
      assert(json.providers.every((p) => typeof p.parser !== "undefined"), "missing parser field");
    });

    await check("GET /api/providers?category=manhwa", async () => {
      const { status, json } = await getJson(`${BASE}/api/providers?category=manhwa`);
      assert(status === 200, `status ${status}`);
      assert(json.providers.length > 0, "no manhwa providers");
      assert(json.providers.every((p) => p.categories.includes("manhwa")), "category leak");
    });

    await check("GET /api/providers?category=bogus → 400", async () => {
      const { status, json } = await getJson(`${BASE}/api/providers?category=bogus`);
      assert(status === 400, `status ${status}`);
      assert(json?.error, "missing error");
    });

    console.log(`\n[smoke] ${pass} passed, ${fail} failed`);
    if (failed.length) console.log(`[smoke] failed: ${failed.join(", ")}`);
    process.exitCode = fail === 0 ? 0 : 1;
  } catch (err) {
    console.error(`[smoke] fatal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (exited === null) child.kill();
    if (sidecar) sidecar.kill();
    // give the children a moment to die
    await new Promise((r) => setTimeout(r, 500));
  }
}

main();
