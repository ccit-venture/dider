import { Hono } from "hono";
import type { Db } from "../db";
import { projectController } from "../controllers/project.controller";

/** Router: pasang semua controller di bawah /api. */
export function api(db: Db) {
  const api = new Hono();

  api.get("/ping", (c) => c.json({ pong: true }));

  api.route("/projects", projectController(db)); // /api/projects*

  return api;
}
