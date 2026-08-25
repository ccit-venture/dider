import type { Context, Next } from "hono";
import type { Db } from "../db";
import { UserModel, type PublicUser } from "../models/user.model";
import { getUserId } from "./auth.middleware";
import { consumeFlash, type Flash } from "../view";

/**
 * Middleware lokasi (Laravel-like): resolve user login + flash message untuk
 * tiap request web, lalu simpan ke context supaya `view()` bisa menggunakannya.
 */
export function injectLocals(db: Db) {
  return async (c: Context, next: Next) => {
    let user: PublicUser | null = null;
    const userId = getUserId(c, db);
    if (userId && db.sqlite) {
      user = new UserModel(db.sqlite).findPublic(userId);
    }
    const flash: Flash = consumeFlash(c);
    c.set("user" as never, user);
    c.set("flash" as never, flash);
    await next();
  };
}
