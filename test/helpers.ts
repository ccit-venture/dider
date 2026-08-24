import { Database } from "bun:sqlite";
import { migrate } from "../src/db";
import { createApp } from "../src/app";
import type { Db } from "../src/db";

/** DB SQLite in-memory — tidak menyentuh data/app.db. */
export function createTestDb(): Database {
  const db = new Database(":memory:");
  migrate(db);
  return db;
}

/** Aplikasi Hono lengkap dengan DB in-memory. */
export function createTestApp() {
  const sqlite = createTestDb();
  const db: Db = { driver: "sqlite", sqlite, supabase: null };
  return createApp(db);
}

export const jsonHeaders = {
  "content-type": "application/json",
  origin: "http://localhost:3000",
};
