import { Hono } from "hono";
import type { Db } from "../db";
import { injectLocals } from "../middleware/locals.middleware";
import { authController } from "../controllers/auth.controller";
import { pageController } from "../controllers/page.controller";
import { projectController } from "../controllers/project.controller";

/** Router web: semua halaman browser (server-rendered, form POST). */
export function web(db: Db) {
  const app = new Hono();

  // Locals: user login + flash message untuk semua halaman
  app.use("*", injectLocals(db));

  app.route("/", pageController(db)); // homepage
  app.route("/admin", authController(db)); // /admin/login, /admin/register, /admin/logout
  app.route("/admin", projectController(db)); // /admin/editor*

  return app;
}
