import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

const SESSION_TTL_DAYS = 7;

/** Model: tabel sessions — session cookie (berlaku 7 hari). */
export class SessionModel {
  constructor(private db: Database) {}

  /** Buat session baru, return sid. Sekalian bersihkan session kedaluwarsa. */
  create(userId: string): string {
    this.db
      .query(`DELETE FROM sessions WHERE created_at <= datetime('now', '-${SESSION_TTL_DAYS} days')`)
      .run();
    const sid = randomUUID();
    this.db
      .query("INSERT INTO sessions (id, user_id) VALUES (?, ?)")
      .run(sid, userId);
    return sid;
  }

  /** Cari userId dari sid; null kalau tidak ada atau sudah kedaluwarsa. */
  findBySid(sid: string): string | null {
    const row = this.db
      .query(
        `SELECT user_id FROM sessions WHERE id = ? AND created_at > datetime('now', '-${SESSION_TTL_DAYS} days')`
      )
      .get(sid) as { user_id: string } | null;
    return row?.user_id ?? null;
  }

  /** Hapus session (logout). */
  delete(sid: string) {
    this.db.query("DELETE FROM sessions WHERE id = ?").run(sid);
  }
}
