import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

export type Project = {
  id: string;
  nama: string;
  pdf_path: string;
  created_at: string;
  updated_at: string;
};

/** Model: tabel projects — dokumen PDF yang di-upload. */
export class ProjectModel {
  constructor(private db: Database) {}

  /** List dokumen ringkas (id, nama, pdf_path, updated_at). */
  list() {
    return this.db
      .query(
        "SELECT id, nama, pdf_path, updated_at FROM projects ORDER BY updated_at DESC"
      )
      .all() as Array<Pick<Project, "id" | "nama" | "pdf_path" | "updated_at">>;
  }

  /** Ambil satu dokumen lengkap. */
  findById(id: string): Project | null {
    return this.db
      .query("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | null;
  }

  /** Simpan dokumen baru (PDF sudah ditulis ke uploads/), return id. */
  create(nama: string, pdfPath: string, id: string = randomUUID()): string {
    this.db
      .query("INSERT INTO projects (id, nama, pdf_path) VALUES (?, ?, ?)")
      .run(id, nama, pdfPath);
    return id;
  }

  /** Hapus dokumen. */
  delete(id: string) {
    this.db.query("DELETE FROM projects WHERE id = ?").run(id);
  }
}