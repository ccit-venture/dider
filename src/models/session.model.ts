import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";

/** Model: tabel sessions — session cookie. */
export class SessionModel {
  constructor(private db: Database) {}

  /** Buat session baru, return sid. */
  create(userId: string): string {
    const sid = randomUUID();
    this.db
      .query("INSERT INTO sessions (id, user_id) VALUES (?, ?)")
      .run(sid, userId);
    return sid;
  }

  /** Cari userId dari sid (null kalau tidak ada). */
  findBySid(sid: string): string | null {
    const row = this.db
      .query("SELECT user_id FROM sessions WHERE id = ?")
      .get(sid) as { user_id: string } | null;
    return row?.user_id ?? null;
  }

  /** Hapus session (logout). */
  delete(sid: string) {
    this.db.query("DELETE FROM sessions WHERE id = ?").run(sid);
  }
}
