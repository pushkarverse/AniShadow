/**
 * Launches the Scrapling Python sidecar (server/scraper/sidecar.py).
 *
 * - Tries $SCRAPLING_PYTHON, then `python`, then `python3`.
 * - With --keep-alive (used by `pnpm dev`), stays alive if Python or
 *   Scrapling is unavailable so the rest of the dev chain keeps running —
 *   the Node sidecar client then transparently uses native fetch.
 * - Without --keep-alive (PM2 / `pnpm sidecar`), exits non-zero on failure
 *   so the process manager can report/restart it.
 */
import { spawn } from "node:child_process";

const keepAlive = process.argv.includes("--keep-alive");
const script = "server/scraper/sidecar.py";
const candidates = [process.env.SCRAPLING_PYTHON, "python", "python3"].filter(Boolean);

function holdOrExit(code) {
  if (keepAlive) {
    console.error(`[sidecar] staying alive without sidecar (native fetch fallback active).`);
    setInterval(() => {}, 1 << 30);
  } else {
    process.exit(code ?? 1);
  }
}

function attempt(index) {
  if (index >= candidates.length) {
    console.error("[sidecar] no working Python interpreter found (tried: " + candidates.join(", ") + ")");
    holdOrExit(1);
    return;
  }
  const cmd = candidates[index];
  const child = spawn(cmd, [script], { stdio: ["ignore", "inherit", "inherit"] });
  let spawned = false;
  child.on("spawn", () => {
    spawned = true;
    console.log(`[sidecar] Scrapling sidecar starting via "${cmd}" (${script})`);
  });
  child.on("error", () => attempt(index + 1));
  child.on("exit", (code, signal) => {
    if (!spawned) return; // 'error' will handle it
    console.error(`[sidecar] exited (code=${code}, signal=${signal})`);
    if (code === 0) process.exit(0);
    else holdOrExit(code ?? 1);
  });
}

attempt(0);
