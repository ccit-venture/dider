import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { csrf } from "hono/csrf";
import { serveStatic } from "hono/bun";
import type { Db } from "./db";
import { api } from "./routes";

/** Bangun aplikasi Hono lengkap dari instance DB — dipakai server & unit test. */
export function createApp(db: Db) {
  const app = new Hono();

  // --- middleware ---
  app.use("*", logger());
  app.use("*", secureHeaders());
  app.use("/api/*", cors());
  app.use("/api/*", csrf({ origin: ["http://localhost:3000"] }));

  // --- health check ---
  app.get("/health", (c) => c.json({ ok: true, driver: db.driver }));

  // --- routes API ---
  app.route("/api", api(db));

  // --- static files ---
  app.use("/uploads/*", serveStatic({ root: "./" }));
  app.use("*", serveStatic({ root: "./public" }));

  return app;
}
