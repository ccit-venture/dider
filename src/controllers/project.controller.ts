import { Hono } from "hono";
import type { Db } from "../db";
import { ProjectModel } from "../models/project.model";
import { requireAuth } from "../middleware/auth.middleware";

/** Controller: /api/projects — CRUD dokumen/majalah. */
export function projectController(db: Db) {
  const api = new Hono();

  if (!db.sqlite) {
    api.all("*", (c) => c.json({ error: "mode supabase belum diimplementasikan" }, 501));
    return api;
  }

  const projects = new ProjectModel(db.sqlite);

  // POST /api/projects — simpan proyek baru {nama, ukuran, halaman} (wajib login)
  api.post("/", requireAuth(db), async (c) => {
    const body = await c.req.json();
    const id = projects.create(
      body.nama ?? "Tanpa judul",
      body.ukuran ?? { lebar: 794, tinggi: 1123 },
      body.halaman ?? []
    );
    return c.json({ ok: true, id }, 201);
  });

  // GET /api/projects — daftar proyek ringkas
  api.get("/", (c) => {
    return c.json({ projects: projects.list() });
  });

  // GET /api/projects/:id — ambil satu proyek lengkap (buka editor)
  api.get("/:id", (c) => {
    const project = projects.findById(c.req.param("id"));
    if (!project) return c.json({ error: "proyek tidak ditemukan" }, 404);
    return c.json({ project });
  });

  // PUT /api/projects/:id — update/autosave (wajib login)
  api.put("/:id", requireAuth(db), async (c) => {
    const body = await c.req.json();
    if (!projects.findById(c.req.param("id"))) {
      return c.json({ error: "proyek tidak ditemukan" }, 404);
    }
    projects.update(
      c.req.param("id"),
      body.nama ?? "Tanpa judul",
      body.ukuran ?? {},
      body.halaman ?? []
    );
    return c.json({ ok: true });
  });

  return api;
}
