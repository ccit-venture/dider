import { Hono } from "hono";
import type { Db } from "../db";
import { UserModel } from "../models/user.model";
import {
  createSession,
  destroySession,
  redirectIfAuthenticated,
  requireAuth,
} from "../middleware/auth.middleware";
import { view, redirect, flashSuccess, flashError } from "../view";

/** Controller web: /admin/auth — register, login, logout (form POST). */
export function authController(db: Db) {
  const app = new Hono();

  if (!db.sqlite) {
    app.all("*", (c) => c.text("mode supabase belum diimplementasikan", 501));
    return app;
  }

  const users = new UserModel(db.sqlite);

  app.get("/login", redirectIfAuthenticated(db), (c) =>
    view(c, "admin/auth/login", { errors: null, old: {} })
  );

  app.post("/login", redirectIfAuthenticated(db), async (c) => {
    const body = await c.req.parseBody();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const id = await users.verifyPassword(username, password);
    if (!id) {
      return view(c, "admin/auth/login", {
        errors: ["Username atau password salah."],
        old: { username },
      });
    }

    await createSession(c, db, id);
    flashSuccess(c, "Selamat datang!");
    return redirect(c, "/admin/editor");
  });

  app.get("/register", redirectIfAuthenticated(db), (c) =>
    view(c, "admin/auth/register", { errors: null, old: {} })
  );

  app.post("/register", redirectIfAuthenticated(db), async (c) => {
    const body = await c.req.parseBody();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();

    const errors: string[] = [];
    if (!username || username.length < 3) errors.push("Username minimal 3 karakter.");
    if (!password || password.length < 6) errors.push("Password minimal 6 karakter.");
    if (users.findByUsername(username)) errors.push("Username sudah dipakai.");

    if (errors.length) {
      return view(c, "admin/auth/register", {
        errors,
        old: { username, full_name: fullName },
      });
    }

    const id = await users.create(username, password, fullName || undefined);
    await createSession(c, db, id);
    flashSuccess(c, "Akun berhasil dibuat. Selamat datang!");
    return redirect(c, "/admin/editor");
  });

  app.post("/logout", requireAuth(db), (c) => {
    destroySession(c, db);
    flashSuccess(c, "Berhasil logout.");
    return redirect(c, "/");
  });

  return app;
}
