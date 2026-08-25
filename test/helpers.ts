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

/** Gabungkan semua cookie dari response ("sid=...; flash=..."). Skip cookie hapus (nilai kosong). */
export function cookieFrom(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""].filter(Boolean);
  return cookies
    .map((c) => c.split(";")[0])
    .filter((c) => {
      const value = c.slice(c.indexOf("=") + 1);
      return value.length > 0;
    })
    .join("; ");
}

/** Header dasar untuk form POST (origin wajib untuk csrf). */
export const formHeaders = {
  origin: "http://localhost:3000",
};

/** Header form POST lengkap (urlencoded). */
export const formPostHeaders = {
  ...formHeaders,
  "content-type": "application/x-www-form-urlencoded",
};

/** Register user + return cookie session. */
export async function registerUser(
  app: { request: (path: string, init?: RequestInit) => Promise<Response> },
  username = "admin",
  password = "rahasia123"
): Promise<string> {
  const res = await app.request("/admin/register", {
    method: "POST",
    headers: formPostHeaders,
    body: new URLSearchParams({ username, password }).toString(),
  });
  return cookieFrom(res);
}