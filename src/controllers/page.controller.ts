import { Hono } from "hono";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { view, redirect, flashError } from "../view";

/** Controller web: halaman publik — homepage + reader flipbook (/baca/:id). */
export function pageController(db: Db) {
  const app = new Hono();

  app.get("/", (c) => {
    const dokumen = db.sqlite ? new ProjectModel(db.sqlite).list() : [];
    return view(c, "homepage/index", { dokumen });
  });

  app.get("/baca/:id", (c) => {
    if (!db.sqlite) return c.text("mode supabase belum diimplementasikan", 501);
    const doc = new ProjectModel(db.sqlite).findById(c.req.param("id"));
    if (!doc) {
      flashError(c, "Dokumen tidak ditemukan.");
      return redirect(c, "/");
    }
    return view(c, "homepage/baca", { dokumen: doc });
  });

  return app;
}