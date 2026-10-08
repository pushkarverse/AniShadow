import fs from "node:fs";
import path from "node:path";

export type ProviderCategory = "anime" | "manga" | "manhwa";
export type ProviderStatus = "active" | "degraded" | "down";
export type RegionStatus = "ok" | "blocked" | "unknown";

export interface ProviderMirror {
  url: string;
  status: "active" | "down";
  lastChecked?: string;
}

export interface ProviderEntry {
  id: string;
  name: string;
  baseUrl: string;
  categories: ProviderCategory[];
  /** "consumet:<key>" or "custom:<key>"; null = discovered but no parser yet */
  parser: string | null;
  /** Main providers are always tried first and are never removed by discovery. */
  main: boolean;
  status: ProviderStatus;
  source: "seed" | "discovery";
  /** Per-region reachability, e.g. { "IN": "blocked" } */
  regions?: Record<string, RegionStatus>;
  lastChecked?: string;
  firstSeen?: string;
  mirrors?: ProviderMirror[];
  notes?: string;
}

export interface ProviderRegistry {
  version: number;
  updatedAt: string;
  providers: ProviderEntry[];
}

export const DEFAULT_REGION = process.env.ANISHADOW_REGION || "IN";

let cachedPath: string | null = null;
let cache: { mtimeMs: number; data: ProviderRegistry } | null = null;

function findRegistryPath(): string {
  if (cachedPath) return cachedPath;
  const candidates = [
    path.resolve(process.cwd(), "server", "providers", "registry.json"),
    path.resolve(process.cwd(), "registry.json"),
    path.resolve(process.cwd(), "..", "server", "providers", "registry.json"),
  ];
  cachedPath = candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
  return cachedPath;
}

export function registryPath(): string {
  return findRegistryPath();
}

export function loadRegistry(): ProviderRegistry {
  const file = findRegistryPath();
  try {
    const stat = fs.statSync(file);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.data;
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as ProviderRegistry;
    if (!data || !Array.isArray(data.providers)) throw new Error("invalid registry shape");
    cache = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch (err) {
    console.warn("[Registry] failed to load registry.json:", (err as Error).message);
    return { version: 0, updatedAt: new Date().toISOString(), providers: [] };
  }
}

export function saveRegistry(reg: ProviderRegistry): void {
  const file = findRegistryPath();
  reg.updatedAt = new Date().toISOString();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(reg, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
  cache = null;
}

const STATUS_RANK: Record<ProviderStatus, number> = { active: 0, degraded: 1, down: 2 };

/**
 * Providers for a category in request order:
 * main first, region-blocked deprioritized, then active > degraded > down.
 */
export function orderedProviders(
  category?: ProviderCategory,
  region: string = DEFAULT_REGION
): ProviderEntry[] {
  const reg = loadRegistry();
  const list = category ? reg.providers.filter((p) => p.categories.includes(category)) : [...reg.providers];
  return list.sort((a, b) => {
    if (a.main !== b.main) return a.main ? -1 : 1;
    const aBlocked = a.regions?.[region] === "blocked";
    const bBlocked = b.regions?.[region] === "blocked";
    if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
    const sa = STATUS_RANK[a.status] ?? 3;
    const sb = STATUS_RANK[b.status] ?? 3;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
}

/** Base URL to hit for this provider in the given region (mirror rotation when blocked). */
export function runtimeUrl(entry: ProviderEntry, region: string = DEFAULT_REGION): string {
  if (entry.regions?.[region] === "blocked" && entry.mirrors) {
    const mirror = entry.mirrors.find((m) => m.status === "active");
    if (mirror) return mirror.url;
  }
  return entry.baseUrl;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Merge freshly discovered/checked entries. Existing providers keep `main`,
 * `parser`, `source` and gain updated status/regions/lastChecked.
 */
export function mergeDiscovered(
  found: ProviderEntry[]
): { added: number; updated: number } {
  const reg = loadRegistry();
  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const inc of found) {
    const host = hostOf(inc.baseUrl);
    const existing = reg.providers.find(
      (p) => p.id === inc.id || (!!host && hostOf(p.baseUrl) === host)
    );
    if (existing) {
      if (inc.regions) existing.regions = { ...(existing.regions || {}), ...inc.regions };
      if (inc.status) existing.status = inc.status;
      existing.lastChecked = now;
      updated++;
      continue;
    }
    reg.providers.push({ ...inc, firstSeen: now, lastChecked: now });
    added++;
  }

  if (added || updated) saveRegistry(reg);
  return { added, updated };
}

/** Attach an alternate domain to an existing provider (mirror discovery). */
export function addMirror(providerId: string, url: string): boolean {
  const reg = loadRegistry();
  const entry = reg.providers.find((p) => p.id === providerId);
  if (!entry || hostOf(entry.baseUrl) === hostOf(url)) return false;
  entry.mirrors = entry.mirrors || [];
  if (entry.mirrors.some((m) => hostOf(m.url) === hostOf(url))) return false;
  entry.mirrors.push({ url, status: "active", lastChecked: new Date().toISOString() });
  saveRegistry(reg);
  return true;
}
