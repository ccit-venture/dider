import { Hono } from "hono";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { requireAuth } from "../middleware/auth.middleware";
import { view, redirect, flashSuccess, flashError } from "../view";

const MAX_HALAMAN = 500;
const MIN_SIZE = 50;
const MAX_SIZE = 5000;

type Parsed =
  | { ok: true; nama: string; ukuran: unknown; halaman: unknown }
  | { ok: false; errors: string[] };

/** Validasi + parse input form proyek (nama, ukuran JSON, halaman JSON). */
function parseProject(body: Record<string, unknown>): Parsed {
  const errors: string[] = [];
  const nama = String(body.nama ?? "").trim() || "Tanpa judul";

  let ukuran: unknown = { lebar: 794, tinggi: 1123 };
  let halaman: unknown = [];

  try {
    ukuran = JSON.parse(String(body.ukuran ?? ""));
  } catch {
    errors.push("Format ukuran halaman tidak valid.");
  }
  try {
    halaman = JSON.parse(String(body.halaman ?? ""));
  } catch {
    errors.push("Format halaman tidak valid.");
  }

  if (!Array.isArray(halaman)) errors.push("Halaman harus berupa array.");
  if (Array.isArray(halaman) && halaman.length > MAX_HALAMAN) {
    errors.push(`Terlalu banyak halaman (maks ${MAX_HALAMAN}).`);
  }

  const u = ukuran as { lebar?: unknown; tinggi?: unknown };
  if (
    typeof u.lebar !== "number" ||
    typeof u.tinggi !== "number" ||
    u.lebar < MIN_SIZE ||
    u.tinggi < MIN_SIZE ||
    u.lebar > MAX_SIZE ||
    u.tinggi > MAX_SIZE
  ) {
    errors.push(`Ukuran halaman harus antara ${MIN_SIZE}–${MAX_SIZE}px.`);
  }

  return errors.length ? { ok: false, errors } : { ok: true, nama, ukuran, halaman };
}

/** Controller web: /admin/editor — CRUD proyek via form POST (PRG). */
export function projectController(db: Db) {
  const app = new Hono();

  if (!db.sqlite) {
    app.all("*", (c) => c.text("mode supabase belum diimplementasikan", 501));
    return app;
  }

  const projects = new ProjectModel(db.sqlite);

  // GET /admin/editor — daftar proyek
  app.get("/editor", requireAuth(db), (c) => {
    return view(c, "admin/editor/index", { projects: projects.list() });
  });

  // POST /admin/editor — buat proyek baru
  app.post("/editor", requireAuth(db), async (c) => {
    const body = await c.req.parseBody();
    const parsed = parseProject(body as Record<string, unknown>);
    if (!parsed.ok) {
      flashError(c, parsed.errors.join(" "));
      return redirect(c, "/admin/editor");
    }
    const id = projects.create(parsed.nama, parsed.ukuran, parsed.halaman);
    flashSuccess(c, "Proyek baru dibuat.");
    return redirect(c, `/admin/editor/${id}`);
  });

  // GET /admin/editor/:id — buka editor
  app.get("/editor/:id", requireAuth(db), (c) => {
    const project = projects.findById(c.req.param("id"));
    if (!project) {
      flashError(c, "Proyek tidak ditemukan.");
      return redirect(c, "/admin/editor");
    }
    return view(c, "admin/editor/show", { project });
  });

  // POST /admin/editor/:id — simpan/autosave
  app.post("/editor/:id", requireAuth(db), async (c) => {
    const id = c.req.param("id");
    if (!projects.findById(id)) {
      flashError(c, "Proyek tidak ditemukan.");
      return redirect(c, "/admin/editor");
    }
    const body = await c.req.parseBody();
    const parsed = parseProject(body as Record<string, unknown>);
    if (!parsed.ok) {
      flashError(c, parsed.errors.join(" "));
      return redirect(c, `/admin/editor/${id}`);
    }
    projects.update(id, parsed.nama, parsed.ukuran, parsed.halaman);
    flashSuccess(c, "Proyek tersimpan.");
    return redirect(c, `/admin/editor/${id}`);
  });

  // POST /admin/editor/:id/delete — hapus proyek
  app.post("/editor/:id/delete", requireAuth(db), (c) => {
    const id = c.req.param("id");
    if (!projects.findById(id)) {
      flashError(c, "Proyek tidak ditemukan.");
      return redirect(c, "/admin/editor");
    }
    projects.delete(id);
    flashSuccess(c, "Proyek dihapus.");
    return redirect(c, "/admin/editor");
  });

  return app;
}
