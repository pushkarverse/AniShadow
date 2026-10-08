import { Hono } from "hono";
import { searchHandler } from "./routes/search";
import { trendingHandler } from "./routes/trending";
import { randomHandler } from "./routes/random";
import { animeInfoHandler } from "./routes/animeInfo";
import { streamRoute } from "./routes/stream";
import { proxyRoute } from "./routes/proxy";
import {
  advancedSearchHandler,
  animeDetailsHandler,
  animeHomeHandler,
  animeListHandler,
  animeRelatedHandler,
  readerChapterHandler,
  readerDetailsHandler,
  readerHomeHandler,
  watchHandler,
} from "./routes/data";
import { DEFAULT_REGION, loadRegistry, orderedProviders, type ProviderCategory } from "./providers/registry";
import { runDiscovery } from "./providers/discover";

const app = new Hono();

// ── Existing API routes ─────────────────────────────────────────────
app.get("/api/search", (c) => searchHandler(c.req.raw));
app.get("/api/trending", (c) => trendingHandler(c.req.raw));
app.get("/api/random", () => randomHandler());
app.get("/api/anime/:id/info", (c) =>
  animeInfoHandler(c.req.param("id"), c.req.raw)
);
app.all("/api/stream", (c) => streamRoute(c.req.raw));
app.all("/api/proxy", (c) => proxyRoute(c.req.raw));

// ── Page data endpoints (replace Next.js server components) ────────
app.get("/api/anime/home", () => animeHomeHandler());
app.get("/api/anime/list", (c) => animeListHandler(c.req.raw));
app.get("/api/anime/advanced-search", (c) => advancedSearchHandler(c.req.raw));
app.get("/api/anime/:id/details", (c) =>
  animeDetailsHandler(c.req.param("id"))
);
app.get("/api/anime/:id/related", (c) =>
  animeRelatedHandler(c.req.param("id"), c.req.raw)
);
app.get("/api/anime/:id/watch", (c) =>
  watchHandler(c.req.param("id"), c.req.raw)
);
app.get("/api/reader/home", (c) => readerHomeHandler(c.req.raw));
app.get("/api/reader/details/:id", (c) =>
  readerDetailsHandler(c.req.param("id"))
);
app.get("/api/reader/chapter", (c) => readerChapterHandler(c.req.raw));

// ── Provider registry + internet discovery ──────────────────────────
app.get("/api/providers", (c) => {
  const category = c.req.query("category") as ProviderCategory | undefined;
  if (category && !["anime", "manga", "manhwa"].includes(category)) {
    return c.json({ error: "invalid category (anime|manga|manhwa)" }, 400);
  }
  const providers = orderedProviders(category);
  const registry = loadRegistry();
  return c.json({
    updatedAt: registry.updatedAt,
    region: DEFAULT_REGION,
    count: providers.length,
    providers,
  });
});

app.post("/api/providers/discover", async (c) => {
  let body: Record<string, any> = {};
  try {
    body = await c.req.json();
  } catch { /* no body = defaults */ }
  try {
    const result = await runDiscovery({
      categories: Array.isArray(body.categories) ? body.categories : undefined,
      maxChecks: typeof body.maxChecks === "number" ? body.maxChecks : undefined,
      region: typeof body.region === "string" ? body.region : undefined,
    });
    return c.json(result, result.ok ? 200 : result.error === "discovery already running" ? 409 : 500);
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// 404 for unknown API routes
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
