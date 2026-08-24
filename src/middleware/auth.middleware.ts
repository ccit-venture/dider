import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import type { Db } from "../db";
import { SessionModel } from "../models/session.model";

function sessions(db: Db) {
  return new SessionModel(db.sqlite!);
}

/** Ambil userId dari session cookie (null kalau belum login). */
export function getUserId(c: Context, db: Db): string | null {
  const sid = getCookie(c, "sid");
  if (!sid || !db.sqlite) return null;
  return sessions(db).findBySid(sid);
}

/** Buat session baru (cookie httpOnly, 7 hari). */
export async function createSession(c: Context, db: Db, userId: string) {
  if (!db.sqlite) return;
  const sid = sessions(db).create(userId);
  setCookie(c, "sid", sid, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Hapus session dari DB + cookie. */
export function destroySession(c: Context, db: Db) {
  const sid = getCookie(c, "sid");
  if (sid && db.sqlite) sessions(db).delete(sid);
  deleteCookie(c, "sid");
}

/** Middleware: wajib login. Simpan userId di c.set("userId"). */
export function requireAuth(db: Db) {
  return async (c: Context, next: Next) => {
    const userId = getUserId(c, db);
    if (!userId) return c.json({ error: "harus login" }, 401);
    c.set("userId", userId);
    await next();
  };
}
