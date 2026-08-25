import { Hono } from "hono";
import { env } from "bun";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { csrf } from "hono/csrf";
import { serveStatic } from "hono/bun";
import type { Db } from "./db";
import { web } from "./routes/web";

/** Bangun aplikasi Hono lengkap dari instance DB — dipakai server & unit test. */
export function createApp(db: Db) {
  const app = new Hono();

  // --- middleware ---
  app.use("*", logger());
  app.use("*", secureHeaders());
  const origin = env.CSRF_ORIGIN || "http://localhost:3000";
  app.use("*", csrf({ origin: [origin] }));

  // --- health check ---
  app.get("/health", (c) => c.json({ ok: true, driver: db.driver }));

  // --- routes web (server-rendered, form POST) ---
  app.route("/", web(db));

  // --- static files ---
  app.use(
    "/uploads/*",
    serveStatic({ root: "./", rewriteRequestPath: (p) => p.replace(/^\/uploads/, "uploads") })
  );
  app.use(
    "/vendor/*",
    serveStatic({
      root: "./node_modules",
      rewriteRequestPath: (p) => p.replace(/^\/vendor/, ""),
    })
  );
  app.use("*", serveStatic({ root: "./public" })); // style.css, page-flip.css

  return app;
}
