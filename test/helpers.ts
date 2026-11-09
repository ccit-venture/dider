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
  const byName = new Map<string, string>();
  for (const c of cookies) {
    const pair = c.split(";")[0];
    const name = pair.slice(0, pair.indexOf("="));
    const value = pair.slice(pair.indexOf("=") + 1);
    if (value.length > 0) byName.set(name, pair);
  }
  return [...byName.values()].join("; ");
}

/** Gabung string cookie, last-wins per nama (seperti browser saat Set-Cookie berulang). */
export function mergeCookies(...parts: string[]): string {
  const byName = new Map<string, string>();
  for (const part of parts) {
    for (const pair of part.split(/;\s*/)) {
      if (!pair) continue;
      byName.set(pair.slice(0, pair.indexOf("=")), pair);
    }
  }
  return [...byName.values()].join("; ");
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