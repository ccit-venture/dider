import { Hono } from "hono";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { view } from "../view";

/** Controller web: halaman publik (homepage) — tampilan depan untuk user. */
export function pageController(db: Db) {
  const app = new Hono();

  app.get("/", (c) => {
    const projects = db.sqlite ? new ProjectModel(db.sqlite).list() : [];
    return view(c, "homepage/index", { projects });
  });

  return app;
}
