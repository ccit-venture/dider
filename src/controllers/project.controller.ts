import { Hono } from "hono";
import type { Context } from "hono";
import { randomUUID } from "crypto";
import { unlinkSync, existsSync } from "fs";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { requireAuth } from "../middleware/auth.middleware";
import { view, redirect, flashSuccess, flashError } from "../view";

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = "uploads"; // harus sinkron dengan serveStatic /uploads/* di app.ts

/** Controller web: /admin/dokumen — upload PDF, daftar, trash, hapus, restore. */
export function projectController(db: Db) {
  const app = new Hono();

  if (!db.sqlite) {
    app.all("*", (c) => c.text("mode supabase belum diimplementasikan", 501));
    return app;
  }

  const projects = new ProjectModel(db.sqlite);

  // GET /admin/dokumen — daftar dokumen aktif + form upload
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
    const kategori = String(body.kategori ?? "").trim() || "latest";
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
    try {
      projects.create(nama, pdfPath, id, kategori);
    } catch {
      // Jangan tinggalkan file orphan kalau insert DB gagal.
      try {
        unlinkSync(pdfPath);
      } catch {}
      flashError(c, "Gagal menyimpan data dokumen. Coba lagi.");
      return redirect(c, "/admin/dokumen");
    }
    flashSuccess(c, `Dokumen "${nama}" berhasil di-upload.`);
    return redirect(c, "/admin/dokumen");
  });

  // GET /admin/dokumen/trash — daftar dokumen di trash
  app.get("/dokumen/trash", requireAuth(db), (c) => {
    const dokumen = projects.listTrashed().map((d) => ({
      ...d,
      missing: !existsSync(d.pdf_path),
    }));
    return view(c, "admin/dokumen/trash", { dokumen });
  });

  // POST /admin/dokumen/:id/delete — soft delete (masuk trash). Hard delete
  // TIDAK lewat sini — wajib lewat /hard-delete eksplisit.
  app.post("/dokumen/:id/delete", requireAuth(db), (c) => softDelete(c, projects));

  // POST /admin/dokumen/:id/hard-delete — hard delete permanen (dari trash)
  app.post("/dokumen/:id/hard-delete", requireAuth(db), (c) => hardDelete(c, projects));

  // POST /admin/dokumen/:id/trash-and-delete — dari popup halaman utama:
  // pindahkan ke trash lalu hapus permanen dalam satu aksi eksplisit.
  app.post("/dokumen/:id/trash-and-delete", requireAuth(db), (c) =>
    hardDelete(c, projects, { allowActive: true })
  );

  // POST /admin/dokumen/:id/restore — restore dari trash
  app.post("/dokumen/:id/restore", requireAuth(db), (c) => {
    const id = c.req.param("id");
    const doc = projects.findById(id);
    if (!doc || !doc.deleted_at) {
      flashError(c, "Dokumen tidak ditemukan di trash.");
      return redirect(c, "/admin/dokumen/trash");
    }
    projects.restore(id);
    if (existsSync(doc.pdf_path)) {
      flashSuccess(c, `Dokumen "${doc.nama}" dipulihkan.`);
    } else {
      flashError(
        c,
        `Dokumen "${doc.nama}" dipulihkan, tetapi file PDF-nya tidak ditemukan di server.`
      );
    }
    return redirect(c, "/admin/dokumen/trash");
  });

  return app;
}

/** Soft delete: pindahkan ke trash. File PDF tetap di disk. */
function softDelete(c: Context, projects: ProjectModel) {
  const id = c.req.param("id");
  const doc = projects.findById(id);
  if (!doc) {
    flashError(c, "Dokumen tidak ditemukan.");
    return redirect(c, "/admin/dokumen");
  }
  if (doc.deleted_at) {
    flashError(c, "Dokumen sudah ada di trash.");
    return redirect(c, "/admin/dokumen");
  }
  projects.softDelete(id);
  flashSuccess(c, `Dokumen "${doc.nama}" dipindahkan ke trash.`);
  return redirect(c, "/admin/dokumen");
}

/** Hard delete: hapus baris DB + file permanen. Default hanya dari trash. */
function hardDelete(
  c: Context,
  projects: ProjectModel,
  opts: { allowActive?: boolean } = {}
) {
  const id = c.req.param("id");
  const doc = projects.findById(id);
  if (!doc) {
    flashError(c, "Dokumen tidak ditemukan.");
    return redirect(c, "/admin/dokumen/trash");
  }
  if (!doc.deleted_at && !opts.allowActive) {
    flashError(c, "Dokumen belum di trash. Pindahkan ke trash dulu.");
    return redirect(c, "/admin/dokumen");
  }
  const fromTrash = Boolean(doc.deleted_at);
  // Hapus baris dulu, lalu file. File orphan di-swallow (bukan kegagalan data).
  projects.delete(id);
  try {
    unlinkSync(doc.pdf_path);
  } catch {
    // file sudah tidak ada — abaikan
  }
  flashSuccess(c, `Dokumen "${doc.nama}" dihapus permanen.`);
  return redirect(c, fromTrash ? "/admin/dokumen/trash" : "/admin/dokumen");
}
