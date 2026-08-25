import { Hono } from "hono";
import { randomUUID } from "crypto";
import { unlinkSync, existsSync } from "fs";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { requireAuth } from "../middleware/auth.middleware";
import { view, redirect, flashSuccess, flashError } from "../view";

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = "uploads"; // harus sinkron dengan serveStatic /uploads/* di app.ts

/** Controller web: /admin/dokumen — upload PDF, daftar, hapus. */
export function projectController(db: Db) {
  const app = new Hono();

  if (!db.sqlite) {
    app.all("*", (c) => c.text("mode supabase belum diimplementasikan", 501));
    return app;
  }

  const projects = new ProjectModel(db.sqlite);

  // GET /admin/dokumen — daftar dokumen + form upload
  app.get("/dokumen", requireAuth(db), (c) => {
    const dokumen = projects.list().map((d) => ({
      ...d,
      missing: !existsSync(d.pdf_path),
    }));
    return view(c, "admin/dokumen/index", { dokumen });
  });

  // POST /admin/dokumen — upload PDF
  app.post("/dokumen", requireAuth(db), async (c) => {
    const body = await c.req.parseBody();
    const nama = String(body.nama ?? "").trim() || "Tanpa judul";
    const file = body.pdf;

    if (!(file instanceof File)) {
      flashError(c, "Pilih file PDF untuk di-upload.");
      return redirect(c, "/admin/dokumen");
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      flashError(c, "Hanya file PDF yang diizinkan.");
      return redirect(c, "/admin/dokumen");
    }
    if (file.size > MAX_PDF_SIZE) {
      flashError(c, "Ukuran PDF maksimal 50MB.");
      return redirect(c, "/admin/dokumen");
    }

    const id = randomUUID();
    const pdfPath = `${UPLOAD_DIR}/${id}.pdf`;
    await Bun.write(pdfPath, file);
    if (!existsSync(pdfPath)) {
      flashError(c, "Gagal menyimpan file PDF di server. Coba lagi.");
      return redirect(c, "/admin/dokumen");
    }
    projects.create(nama, pdfPath, id);
    flashSuccess(c, `Dokumen "${nama}" berhasil di-upload.`);
    return redirect(c, "/admin/dokumen");
  });

  // POST /admin/dokumen/:id/delete — hapus dokumen (+ file)
  app.post("/dokumen/:id/delete", requireAuth(db), (c) => {
    const id = c.req.param("id");
    const doc = projects.findById(id);
    if (!doc) {
      flashError(c, "Dokumen tidak ditemukan.");
      return redirect(c, "/admin/dokumen");
    }
    projects.delete(id);
    try {
      unlinkSync(doc.pdf_path);
    } catch {
      // file sudah tidak ada — abaikan
    }
    flashSuccess(c, `Dokumen "${doc.nama}" dihapus.`);
    return redirect(c, "/admin/dokumen");
  });

  return app;
}