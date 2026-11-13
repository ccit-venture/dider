import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

export type Project = {
  id: string;
  nama: string;
  pdf_path: string;
  kategori: string;
  views: number;
  uploader_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProjectSummary = Pick<
  Project,
  "id" | "nama" | "pdf_path" | "kategori" | "views" | "uploader_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  /** Nama tampilan uploader (full_name atau username). NULL kalau data lama. */
  uploader: string | null;
};

/** Urutan rak buku: 'latest' = terbaru, 'popular' = paling banyak dibaca. */
export type ShelfSort = "latest" | "popular";

const SHELF_SELECT = `
  SELECT p.id, p.nama, p.pdf_path, p.kategori, p.views, p.uploader_id,
         p.created_at, p.updated_at, p.deleted_at,
         COALESCE(u.full_name, u.username) AS uploader
  FROM projects p
  LEFT JOIN users u ON u.id = p.uploader_id
`;

/** Model: tabel projects — dokumen PDF yang di-upload. */
export class ProjectModel {
  constructor(private db: Database) {}

  /** List dokumen aktif (belum di-trash), terbaru dulu. */
  list(): ProjectSummary[] {
    return this.db
      .query(`${SHELF_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC`)
      .all() as ProjectSummary[];
  }

  /** List dokumen untuk rak: sort 'latest' (terbaru) atau 'popular' (paling dibaca). */
  listShelf(sort: ShelfSort = "latest"): ProjectSummary[] {
    if (sort === "popular") {
      return this.db
        .query(
          `${SHELF_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.views DESC, p.updated_at DESC`
        )
        .all() as ProjectSummary[];
    }
    return this.list();
  }

  /** List dokumen di trash (deleted_at terisi), terbaru di-trash dulu. */
  listTrashed(): ProjectSummary[] {
    return this.db
      .query(
        `${SHELF_SELECT} WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`
      )
      .all() as ProjectSummary[];
  }

  /** Ambil satu dokumen lengkap (termasuk yang di-trash + nama uploader). */
  findById(id: string): (Project & { uploader: string | null }) | null {
    return this.db
      .query(`${SHELF_SELECT} WHERE p.id = ?`)
      .get(id) as (Project & { uploader: string | null }) | null;
  }

  /** Simpan dokumen baru (PDF sudah ditulis ke uploads/), return id. */
  create(
    nama: string,
    pdfPath: string,
    id: string = randomUUID(),
    uploaderId: string | null = null
  ): string {
    this.db
      .query(
        "INSERT INTO projects (id, nama, pdf_path, kategori, uploader_id) VALUES (?, ?, ?, 'latest', ?)"
      )
      .run(id, nama, pdfPath, uploaderId);
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
