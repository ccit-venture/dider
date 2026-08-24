import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

/** Model: tabel projects — dokumen/majalah dari editor. */
export class ProjectModel {
  constructor(private db: Database) {}

  /** List proyek ringkas (id, nama, updated_at). */
  list() {
    return this.db
      .query("SELECT id, nama, updated_at FROM projects ORDER BY updated_at DESC")
      .all();
  }

  /** Ambil satu proyek lengkap (untuk buka editor). */
  findById(id: string) {
    return this.db.query("SELECT * FROM projects WHERE id = ?").get(id);
  }

  /** Simpan proyek baru, return id. */
  create(nama: string, ukuran: unknown, halaman: unknown): string {
    const id = randomUUID();
    this.db
      .query(
        "INSERT INTO projects (id, nama, ukuran, halaman) VALUES (?, ?, ?, ?)"
      )
      .run(id, nama, JSON.stringify(ukuran), JSON.stringify(halaman));
    return id;
  }

  /** Update proyek (autosave dari editor). */
  update(id: string, nama: string, ukuran: unknown, halaman: unknown) {
    this.db
      .query(
        "UPDATE projects SET nama = ?, ukuran = ?, halaman = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(nama, JSON.stringify(ukuran), JSON.stringify(halaman), id);
  }
}
