import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import app from "./app";
import { installScraplingInterceptors } from "./scraper/client";

// Route every scrape through the Scrapling sidecar (optional, auto-fallback).
installScraplingInterceptors();

const PORT = Number(process.env.PORT) || 3001;
const distDir = path.resolve(process.cwd(), "dist");

// Serve the built SPA (production) with an HTML5-history fallback.
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use("*", serveStatic({ root: "./dist" }));

  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api")) {
      return c.json({ error: "Not found" }, 404);
    }
    const html = await fs.promises.readFile(
      path.join(distDir, "index.html"),
      "utf8"
    );
    return c.html(html, 200, { "Cache-Control": "no-cache" });
  });
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`AniShadow server running on http://localhost:${info.port}`);
});
