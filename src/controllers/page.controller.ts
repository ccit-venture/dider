import { Hono } from "hono";
import { existsSync } from "fs";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { view, redirect, flashError } from "../view";

/** Controller web: halaman publik — homepage + reader flipbook (/baca/:id). */
export function pageController(db: Db) {
  const app = new Hono();

  app.get("/", (c) => {
    const projects = db.sqlite ? new ProjectModel(db.sqlite) : null;
    const rak = c.req.query("rak") || "latest";
    const dokumen = projects ? projects.listShelf(rak) : [];
    const kategori = projects ? projects.categories() : [];
    return view(c, "homepage/index", { dokumen, rak, kategori });
  });

  app.get("/baca/:id", (c) => {
    if (!db.sqlite) return c.text("mode supabase belum diimplementasikan", 501);
    const projects = new ProjectModel(db.sqlite);
    const doc = projects.findById(c.req.param("id"));
    if (!doc || doc.deleted_at) {
      flashError(c, "Dokumen tidak ditemukan.");
      return redirect(c, "/");
    }
    if (!existsSync(doc.pdf_path)) {
      flashError(c, "File PDF tidak ditemukan di server. Upload ulang dokumen ini.");
      return redirect(c, "/");
    }
    projects.incrementViews(doc.id);
    // pdf_path di DB = "uploads/x.pdf"; view butuh nama file saja untuk URL /uploads/...
    const dokumen = { ...doc, pdf_path: doc.pdf_path.replace(/^uploads\//, "") };
    return view(c, "homepage/baca", { dokumen });
  });

  return app;
}