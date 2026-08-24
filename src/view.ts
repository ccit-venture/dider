import { Eta } from "eta";
import path from "path";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import type { PublicUser } from "./models/user.model";

/** Instansi Eta — template engine (Blade/EJS-like). View di folder `views/`. */
const eta = new Eta({
  views: path.join(import.meta.dir, "..", "views"),
  defaultExtension: ".eta.html",
  cache: false,
  autoEscape: true,
});

export type Flash = { type: "success" | "error"; message: string } | null;

/** Render template Eta → response HTML. Analog `return view(...)` di Laravel. */
export function view(
  c: Context,
  template: string,
  data: Record<string, unknown> = {}
) {
  const user = c.get("user" as never) as PublicUser | null;
  const flash = c.get("flash" as never) as Flash;
  return c.html(
    eta.render(template, {
      user,
      flash,
      path: c.req.path,
      ...data,
    })
  );
}

/** Redirect (PRG — Post/Redirect/Get). */
export function redirect(c: Context, to: string, status: 301 | 302 = 302) {
  return c.redirect(to, status);
}

/** Set flash message via cookie (dibaca sekali, lalu dihapus). */
function setFlash(c: Context, type: "success" | "error", message: string) {
  setCookie(c, "flash", JSON.stringify({ type, message }), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60,
  });
}

export function flashSuccess(c: Context, message: string) {
  setFlash(c, "success", message);
}

export function flashError(c: Context, message: string) {
  setFlash(c, "error", message);
}

/** Baca + hapus flash dari cookie (dipanggil di middleware locals). */
export function consumeFlash(c: Context): Flash {
  const raw = getCookie(c, "flash");
  if (!raw) return null;
  deleteCookie(c, "flash");
  try {
    const parsed = JSON.parse(raw);
    return parsed.type && parsed.message ? parsed : null;
  } catch {
    return null;
  }
}
