import { Database } from "bun:sqlite";
import { env } from "bun";
import { mkdirSync } from "fs";

export type Driver = "sqlite" | "supabase";

export interface Db {
  driver: Driver;
  sqlite: Database | null;
  supabase: any; // dari @supabase/supabase-js (opsional, null di mode sqlite)
}

/**
 * Init database berdasarkan env DB_DRIVER:
 * - "sqlite" (default)  → bun:sqlite, file di DB_FILE
 * - "supabase"          → @supabase/supabase-js (jalankan `bun add @supabase/supabase-js`)
 */
export async function initDb(): Promise<Db> {
  const driver = (env.DB_DRIVER || "sqlite") as Driver;

  if (driver === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
    return { driver, sqlite: null, supabase };
  }

  // default: SQLite
  mkdirSync("data", { recursive: true });
  mkdirSync("uploads", { recursive: true });
  const sqlite = new Database(env.DB_FILE || "data/app.db", { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  migrate(sqlite);
  return { driver, sqlite, supabase: null };
}

export function migrate(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrasi skema lama → baru: projects lama (ukuran/halaman JSON) di-drop,
  // diganti skema dokumen PDF (pdf_path).
  const cols = db.query("PRAGMA table_info(projects)").all() as { name: string }[];
  if (cols.length > 0 && !cols.some((c) => c.name === "pdf_path")) {
    db.exec("DROP TABLE projects;");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
