import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

export type Project = {
  id: string;
  nama: string;
  pdf_path: string;
  kategori: string;
  views: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProjectSummary = Pick<
  Project,
  "id" | "nama" | "pdf_path" | "kategori" | "views" | "updated_at" | "deleted_at"
>;

/** Urutan rak buku: 'latest' = terbaru, 'popular' = paling banyak dibaca, lainnya = filter kategori. */
export type ShelfSort = "latest" | "popular" | string;

/** Model: tabel projects — dokumen PDF yang di-upload. */
export class ProjectModel {
  constructor(private db: Database) {}

  /** List dokumen aktif (belum di-trash), terbaru dulu. */
  list(): ProjectSummary[] {
    return this.db
      .query(
        "SELECT id, nama, pdf_path, kategori, views, updated_at, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC"
      )
      .all() as ProjectSummary[];
  }

  /** List dokumen untuk rak: sort 'latest'/'popular' atau filter kategori. */
  listShelf(sort: ShelfSort = "latest"): ProjectSummary[] {
    if (sort === "popular") {
      return this.db
        .query(
          "SELECT id, nama, pdf_path, kategori, views, updated_at, deleted_at FROM projects WHERE deleted_at IS NULL ORDER BY views DESC, updated_at DESC"
        )
        .all() as ProjectSummary[];
    }
    if (sort === "latest") {
      return this.list();
    }
    return this.db
      .query(
        "SELECT id, nama, pdf_path, kategori, views, updated_at, deleted_at FROM projects WHERE deleted_at IS NULL AND kategori = ? ORDER BY updated_at DESC"
      )
      .all(sort) as ProjectSummary[];
  }

  /** Daftar kategori yang tersedia (unik, dari dokumen aktif). */
  categories(): string[] {
    return (
      this.db
        .query(
          "SELECT DISTINCT kategori FROM projects WHERE deleted_at IS NULL ORDER BY kategori"
        )
        .all() as { kategori: string }[]
    ).map((r) => r.kategori);
  }

  /** List dokumen di trash (deleted_at terisi), terbaru di-trash dulu. */
  listTrashed(): ProjectSummary[] {
    return this.db
      .query(
        "SELECT id, nama, pdf_path, kategori, views, updated_at, deleted_at FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
      )
      .all() as ProjectSummary[];
  }

  /** Ambil satu dokumen lengkap (termasuk yang di-trash). */
  findById(id: string): Project | null {
    return this.db
      .query("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | null;
  }

  /** Simpan dokumen baru (PDF sudah ditulis ke uploads/), return id. */
  create(
    nama: string,
    pdfPath: string,
    id: string = randomUUID(),
    kategori = "latest"
  ): string {
    this.db
      .query("INSERT INTO projects (id, nama, pdf_path, kategori) VALUES (?, ?, ?, ?)")
      .run(id, nama, pdfPath, kategori || "latest");
    return id;
  }

  /** Tambah hitungan tampil (dipanggil saat dokumen dibuka di reader). */
  incrementViews(id: string) {
    this.db.query("UPDATE projects SET views = views + 1 WHERE id = ?").run(id);
  }

  /** Soft delete: tandai deleted_at, file tetap di disk. */
  softDelete(id: string) {
    this.db
      .query(
        "UPDATE projects SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
      )
      .run(id);
  }

  /** Restore dari trash: kosongkan deleted_at. */
  restore(id: string) {
    this.db
      .query(
        "UPDATE projects SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NOT NULL"
      )
      .run(id);
  }

  /** Hard delete: hapus baris permanen (file dihapus oleh controller). */
  delete(id: string) {
    this.db.query("DELETE FROM projects WHERE id = ?").run(id);
  }
}
