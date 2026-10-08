# AniShadow

Anime streaming + manga reading app.

**Stack:** Vite + React Router (SPA frontend) · Hono (Node.js API server) · Tailwind CSS v4 · Scrapling sidecar (optional, Python)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the dev server (Vite on http://localhost:5173, API on http://localhost:3001, Scrapling sidecar on http://127.0.0.1:3002):

```bash
pnpm dev
```

Vite proxies `/api/*` to the Hono server automatically. The sidecar is
optional — if Python/Scrapling is missing, all scraping transparently falls
back to native `fetch`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev mode: Vite + API server + Scrapling sidecar (watch) |
| `pnpm build` | Production build: `vite build` + bundled server (`dist/`, `dist-server/`) |
| `pnpm start` | Run the production server (serves `dist/` + API, default port 3001) |
| `pnpm sidecar` | Run only the Scrapling sidecar (Python) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm smoke-test` | Boots the built server and exercises every page/API route (19 checks) |
| `pnpm smoke-test -- --with-sidecar` | Same, but forces every scrape through Scrapling (`SCRAPLING_REQUIRED=1`) |
| `node scripts/sidecar-check.mjs` | Verifies the sidecar (health, GET, GraphQL POST bodies) |

## Scrapling sidecar (anti-bot scraping)

All scraping (AniList, consumet providers, custom scrapers, discovery) is
routed through a small Python sidecar that uses
[Scrapling](https://github.com/D4Vinci/Scrapling) for TLS-impersonating HTTP
and escalates to a stealth browser (patchright/Chromium) when a bot-check or
Cloudflare challenge is detected. Media/video bytes never round-trip through
it (`nativeFetch` in `server/scraper/client.ts`).

```bash
pip install "scrapling[fetchers]"
python -m patchright install chromium
pnpm sidecar            # or let pnpm dev / PM2 start it
```

- The sidecar is **optional**: down ⇒ native fetch fallback (one warning at boot).
- `SCRAPLING_REQUIRED=1` makes the server fail instead of falling back (used by the sidecar smoke test).
- `SCRAPLING_URL` (default `http://127.0.0.1:3002`), `SCRAPLING_PORT` (sidecar listen port).
- Files: `server/scraper/sidecar.py` (Python), `server/scraper/client.ts` (Node client + fetch/axios interception).

## Provider registry & discovery

Providers live in `server/providers/registry.json`:

- **`main: true`** entries are the current default providers (AniKoto, Sankanime, AnimePahe, HiAnime, …; ComicK, MangaDex, MangaReader) — discovery never removes or reorders them.
- `parser: "consumet:*"` entries have a working parser; `parser: null` entries are known/discovered sites awaiting a parser.
- `regions` records reachability per region (e.g. `"IN": "blocked"` for Indian ISPs) — region-blocked providers are deprioritized, mirrors rotate in.

API:

```bash
GET  /api/providers                 # full registry, main-first ordering
GET  /api/providers?category=anime  # anime | manga | manhwa
POST /api/providers/discover        # search the live web (region-aware) + health-check candidates
     body: { "categories": ["manhwa"], "maxChecks": 20, "region": "IN" }
```

Discovery queries DuckDuckGo (`kl=in-in`) and Bing (`setmkt=en-IN`), extracts
candidate domains, verifies each one (bot-wall / parked / content-class
checks), then merges results into the registry with `lastChecked`/`regions`.
Runs are capped (≤40 checks) and guarded against concurrency.

## Architecture

```
src/
  main.tsx        Vite entry (BrowserRouter)
  App.tsx         Route table + app shell
  pages/          Route components (client-side data fetching via /api)
  components/     Shared UI (Navbar, VideoPlayer, cards, ...)
  compat/         Next.js API shims (Link, Image, router hooks) so components
                  can keep the familiar `href`/`useRouter` surface
  lib/            Client utilities + scraper libs (consumet/witchcult are
                  server-only — never import them from pages)
  styles/         globals.css (Tailwind v4)
server/
  index.ts        Node entry: installs Scrapling interceptors, static dist/,
                  HTML5-history fallback + API
  app.ts          Hono app: all /api routes
  routes/         Route handlers (data, search, stream, proxy, ...)
  providers/      Provider registry (registry.json/.ts) + discovery engine
  scraper/        Scrapling sidecar (sidecar.py) + Node client (client.ts)
```

- The frontend is a pure SPA — no SSR/hydration, so no hydration mismatches.
- Server-rendered pages were converted to client components that fetch from
  `/api/*`; the Hono handlers wrap the same scraper functions Next.js used.
- Streaming and reader fallbacks iterate the registry (main + reachable
  first), so blocked providers are skipped quickly and discovered parsers
  join the rotation automatically.
- `scripts/smoke-test.mjs` runs an end-to-end check of the SPA shell, the
  history fallback, every API endpoint, and the provider registry
  (run `pnpm build` first).

## Deploy (PM2 / VPS)

```bash
pnpm build
pm2 start ecosystem.config.cjs
```

`ecosystem.config.cjs` starts the API server **and** the optional
`ani-shadow-sidecar` app (needs `python` + `pip install "scrapling[fetchers]"`).

See `PHONE_VPS_GUIDE.md` for the full phone-VPS walkthrough.
