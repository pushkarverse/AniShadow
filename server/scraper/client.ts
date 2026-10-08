/**
 * Scrapling sidecar client + global request interception.
 *
 * Every scrape the Node server makes (global fetch + the axios instances
 * inside @consumet/extensions) is routed through the Python sidecar, which
 * uses Scrapling's TLS-impersonating fetcher and escalates to a stealth
 * browser when a bot-check is detected. If the sidecar is not running, all
 * traffic transparently falls back to native fetch (sidecar is optional).
 *
 * Media downloads (server/routes/stream.ts, proxy.ts) import `nativeFetch`
 * explicitly so large video bodies never round-trip through Python.
 */
import { createRequire } from "node:module";

const SIDECAR_URL = (process.env.SCRAPLING_URL || "http://127.0.0.1:3002").replace(/\/+$/, "");
const REQUIRED = process.env.SCRAPLING_REQUIRED === "1";
const HEALTH_PROBE_MS = 30_000;

/** Captured before any patching — the only safe way to talk to the sidecar. */
const ORIGINAL_FETCH = globalThis.fetch.bind(globalThis);
export const nativeFetch = ORIGINAL_FETCH;

let sidecarAlive: boolean | null = null;
let lastProbe = 0;
let warnedFallback = false;

async function probeSidecar(): Promise<boolean> {
  const now = Date.now();
  if (sidecarAlive !== null && now - lastProbe < HEALTH_PROBE_MS) return sidecarAlive;
  lastProbe = now;
  try {
    const res = await ORIGINAL_FETCH(`${SIDECAR_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    sidecarAlive = res.ok;
  } catch {
    sidecarAlive = false;
  }
  if (!sidecarAlive && !warnedFallback && !REQUIRED) {
    warnedFallback = true;
    console.warn(
      `[scraper] Scrapling sidecar not reachable at ${SIDECAR_URL} — using native fetch. ` +
        `Start it with: pnpm sidecar`
    );
  }
  return sidecarAlive;
}

function headerToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers as Iterable<[string, string]>);
  return { ...(headers as Record<string, string>) };
}

function encodeBody(body: BodyInit | null | undefined): number[] | null | "stream" {
  if (body == null) return null;
  if (typeof body === "string") return Array.from(new TextEncoder().encode(body));
  if (body instanceof Uint8Array) return Array.from(body);
  if (body instanceof ArrayBuffer) return Array.from(new Uint8Array(body));
  if (body instanceof URLSearchParams) return Array.from(new TextEncoder().encode(body.toString()));
  return "stream";
}

function stripFramingHeaders(headers: Record<string, string>): Record<string, string> {
  // The sidecar returns decompressed bodies; drop framing headers that no
  // longer match the payload we are about to rebuild.
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lk = k.toLowerCase();
    if (lk === "content-encoding" || lk === "content-length" || lk === "transfer-encoding" || lk === "connection")
      continue;
    out[k] = v;
  }
  return out;
}

async function sidecarRequest(payload: Record<string, unknown>, signal: AbortSignal): Promise<any> {
  const res = await ORIGINAL_FETCH(`${SIDECAR_URL}/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function scrapledFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init.method || "GET").toUpperCase();
  const native = () => ORIGINAL_FETCH(input, init);

  // HEAD is not expressible through the sidecar's fetcher API
  if (method === "HEAD") return native();

  const headers = headerToObject(init.headers);
  const timeoutMs = Number(headers["x-scrape-timeout-ms"]) || 30_000;
  delete headers["x-scrape-timeout-ms"];

  const bodyBytes = encodeBody(init.body as BodyInit);
  if (bodyBytes === "stream") return native();

  if (!(await probeSidecar())) {
    if (REQUIRED) throw new Error(`Scrapling sidecar required but unreachable at ${SIDECAR_URL}`);
    return native();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs + 5_000);
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const { ok, json: data } = await sidecarRequest(
      { url, method, headers, bodyBytes, timeoutMs, mode: "auto" },
      controller.signal
    );
    if (!ok || !data.ok) {
      if (REQUIRED) throw new Error(`Scrapling sidecar error: ${data.error || "request failed"}`);
      sidecarAlive = null;
      return native();
    }
    const buf = Buffer.from(data.bodyBase64 || "", "base64");
    const status: number = data.status ?? 502;
    const respHeaders = stripFramingHeaders(data.headers || {});
    const empty = status === 204 || status === 304 || buf.length === 0;
    return new Response(empty ? null : buf, { status, headers: respHeaders });
  } catch (err: any) {
    if (REQUIRED) throw err;
    sidecarAlive = null;
    return native();
  } finally {
    clearTimeout(timer);
  }
}

/** Hosts that must never be routed through Python. */
function shouldProxy(url: string): boolean {
  try {
    const u = new URL(url, "http://localhost");
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    return !(host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1");
  } catch {
    return false;
  }
}

function buildAxiosResponse(config: any, status: number, hdrs: Record<string, string>, buf: Buffer): any {
  const ct = (hdrs["content-type"] || hdrs["Content-Type"] || "").toLowerCase();
  const rt: string = config.responseType || "";
  let responseData: any;
  if (rt === "arraybuffer") {
    responseData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } else if (rt === "text" || rt === "stream") {
    responseData = buf.toString("utf8");
  } else if (rt === "json" || (rt === "" && ct.includes("json"))) {
    const text = buf.toString("utf8");
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = text;
    }
  } else {
    const isBinary =
      ct.includes("image/") || ct.includes("video/") || ct.includes("audio/") || ct.includes("octet-stream");
    responseData = isBinary ? buf : buf.toString("utf8");
  }
  return { data: responseData, status, statusText: "", headers: hdrs, config, request: {} };
}

/**
 * axios adapter used by the @consumet/extensions providers. Their
 * `this.client = axios.create()` instances inherit `defaults.adapter`, so
 * patching the module they resolve covers every provider automatically.
 */
function makeAxiosAdapter() {
  return async function scraplingAdapter(config: any): Promise<any> {
    const base = config.baseURL;
    let url: string = config.url || "";
    if (base && !/^https?:\/\//i.test(url)) {
      url = base.replace(/\/+$/, "") + "/" + String(url).replace(/^\/+/, "");
    }
    if (config.params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(config.params as Record<string, any>)) {
        if (v == null) continue;
        if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
        else qs.append(k, String(v));
      }
      const q = qs.toString();
      if (q) url += (url.includes("?") ? "&" : "?") + q;
    }

    const rawHeaders =
      config.headers && typeof config.headers.toJSON === "function"
        ? config.headers.toJSON()
        : { ...(config.headers || {}) };
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (v == null) continue;
      headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }
    delete headers["Host"];
    delete headers["host"];

    let bodyBytes: number[] | undefined;
    const data = config.data;
    if (data != null) {
      if (typeof data === "string") bodyBytes = Array.from(new TextEncoder().encode(data));
      else if (data instanceof Uint8Array) bodyBytes = Array.from(data);
      else if (Buffer.isBuffer(data)) bodyBytes = Array.from(data);
      else if (data instanceof URLSearchParams) bodyBytes = Array.from(new TextEncoder().encode(data.toString()));
      else if (typeof data === "object") {
        const s = JSON.stringify(data);
        bodyBytes = Array.from(new TextEncoder().encode(s));
        if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/json";
      }
    }

    const method = (config.method || "get").toUpperCase();
    const timeoutMs = typeof config.timeout === "number" && config.timeout > 0 ? config.timeout : 30_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs + 5_000);
    if (config.signal?.aborted) controller.abort();
    else config.signal?.addEventListener?.("abort", () => controller.abort(), { once: true });

    const viaNative = async (): Promise<any> => {
      const res = await ORIGINAL_FETCH(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : (config.data as any),
        signal: controller.signal,
      });
      const hdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => (hdrs[k] = v));
      const ab = await res.arrayBuffer();
      return buildAxiosResponse(config, res.status, stripFramingHeaders(hdrs), Buffer.from(ab));
    };

    try {
      if ((await probeSidecar()) && method !== "HEAD") {
        try {
          const { ok, json } = await sidecarRequest(
            { url, method, headers, bodyBytes, timeoutMs, mode: "auto" },
            controller.signal
          );
          if (ok && json.ok) {
            const buf = Buffer.from(json.bodyBase64 || "", "base64");
            return buildAxiosResponse(
              config,
              json.status ?? 502,
              stripFramingHeaders(json.headers || {}),
              buf
            );
          }
          throw new Error(json.error || "sidecar request failed");
        } catch (sidecarErr) {
          sidecarAlive = null;
          if (REQUIRED) throw sidecarErr;
          // fall through to native
        }
      } else if (REQUIRED && method !== "HEAD") {
        throw new Error(`Scrapling sidecar required but unreachable at ${SIDECAR_URL}`);
      }
      return await viaNative();
    } finally {
      clearTimeout(timer);
    }
  };
}

let installed = false;

/**
 * Patch global fetch and the consumet axios module once, at server boot.
 * MUST run before any provider instance is created (providers are lazy).
 */
export function installScraplingInterceptors(): void {
  if (installed) return;
  installed = true;

  // 1) global fetch — covers scrapeRequest, witchcult, AniList, comick, discovery
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const headers = headerToObject(init?.headers);
    if (headers["x-native-fetch"]) {
      const cleaned: Record<string, string> = { ...headers };
      delete cleaned["x-native-fetch"];
      return ORIGINAL_FETCH(input, { ...init, headers: cleaned });
    }
    if (!shouldProxy(url)) return ORIGINAL_FETCH(input, init);
    return scrapledFetch(input, init!);
  }) as typeof fetch;

  // 2) axios inside @consumet/extensions — resolve *their* module instance
  try {
    const req = createRequire(import.meta.url);
    const consumetPkg = req.resolve("@consumet/extensions/package.json", { paths: [process.cwd()] });
    const axiosPath = req.resolve("axios", { paths: [consumetPkg] });
    const axiosModule = req(axiosPath);
    const axios = axiosModule?.default ?? axiosModule;
    if (axios?.defaults) {
      axios.defaults.adapter = makeAxiosAdapter();
      console.log("[scraper] axios adapter patched → Scrapling sidecar");
    } else {
      console.warn("[scraper] consumet axios module has no defaults; axios not patched");
    }
  } catch (err) {
    console.warn("[scraper] could not patch consumet axios adapter:", (err as Error).message);
  }

  console.log(
    `[scraper] fetch interceptor installed (sidecar: ${SIDECAR_URL}${REQUIRED ? ", required" : ", optional"})`
  );
}
