import { describe, expect, test } from "bun:test";
import {
  createTestApp,
  cookieFrom,
  formHeaders,
  formPostHeaders,
  registerUser,
} from "./helpers";

describe("Web — homepage", () => {
  test("GET / → 200, landing ter-render", async () => {
    const app = createTestApp();
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("dokumen & majalah");
    expect(html).toContain("/admin/login");
  });

  test("GET /health → driver sqlite", async () => {
    const app = createTestApp();
    const res = await app.request("/health");
    expect((await res.json()).driver).toBe("sqlite");
  });
});

describe("Web — auth", () => {
  test("GET /admin/login → form ter-render", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/login");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('action="/admin/login"');
    expect(html).toContain('name="username"');
  });

  test("GET /admin/register → form ter-render", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/register");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('action="/admin/register"');
  });

  test("POST /admin/register → 302 /admin/editor + cookie session", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/register", {
      method: "POST",
      headers: formPostHeaders,
      body: new URLSearchParams({
        username: "admin",
        password: "rahasia123",
        full_name: "Admin Dider",
      }).toString(),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/editor");
    expect(cookieFrom(res)).toContain("sid=");
  });

  test("POST /admin/register username duplikat → re-render dengan error", async () => {
    const app = createTestApp();
    const body = new URLSearchParams({ username: "admin", password: "rahasia123" }).toString();
    await app.request("/admin/register", { method: "POST", headers: formPostHeaders, body });

    const res = await app.request("/admin/register", {
      method: "POST",
      headers: formPostHeaders,
      body,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("sudah dipakai");
  });

  test("POST /admin/register password pendek → error, tidak redirect", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/register", {
      method: "POST",
      headers: formPostHeaders,
      body: new URLSearchParams({ username: "admin", password: "123" }).toString(),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("minimal 6 karakter");
  });

  test("POST /admin/login salah → re-render dengan error", async () => {
    const app = createTestApp();
    await registerUser(app);

    const res = await app.request("/admin/login", {
      method: "POST",
      headers: formPostHeaders,
      body: new URLSearchParams({ username: "admin", password: "salah" }).toString(),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Username atau password salah");
  });

  test("POST /admin/login benar → 302 + cookie session", async () => {
    const app = createTestApp();
    await registerUser(app);

    const res = await app.request("/admin/login", {
      method: "POST",
      headers: formPostHeaders,
      body: new URLSearchParams({ username: "admin", password: "rahasia123" }).toString(),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/editor");
    expect(cookieFrom(res)).toContain("sid=");
  });

  test("sudah login → GET /admin/login redirect ke editor", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const res = await app.request("/admin/login", { headers: { cookie } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/editor");
  });

  test("POST /admin/logout → 302 ke /, session terhapus", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const logout = await app.request("/admin/logout", {
      method: "POST",
      headers: { cookie, ...formHeaders },
    });
    expect(logout.status).toBe(302);
    expect(logout.headers.get("location")).toBe("/");

    const editor = await app.request("/admin/editor", { headers: { cookie } });
    expect(editor.status).toBe(302);
    expect(editor.headers.get("location")).toBe("/admin/login");
  });
});

describe("Web — editor (wajib login)", () => {
  test("GET /admin/editor tanpa login → 302 ke /admin/login", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/editor");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");
  });

  test("flow lengkap: buat → buka → simpan → hapus", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    // POST /admin/editor — buat proyek
    const create = await app.request("/admin/editor", {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
      body: new URLSearchParams({
        nama: "Majalah Angkatan",
        ukuran: JSON.stringify({ lebar: 794, tinggi: 1123 }),
        halaman: "[]",
      }).toString(),
    });
    expect(create.status).toBe(302);
    const loc = create.headers.get("location") ?? "";
    expect(loc).toMatch(/^\/admin\/editor\/[0-9a-f-]+$/);
    const id = loc.split("/").pop()!;

    // GET /admin/editor/:id — buka editor
    const page = await app.request(loc, { headers: { cookie } });
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("Majalah Angkatan");
    expect(html).toContain(`action="/admin/editor/${id}"`);
    expect(html).toContain("/editor.js");

    // POST /admin/editor/:id — simpan perubahan
    const halaman = JSON.stringify([
      { id: "h1", blok: [{ id: "b1", type: "text", x: 10, y: 10, w: 100, h: 50, text: "Halo" }] },
    ]);
    const up = await app.request(loc, {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
      body: new URLSearchParams({
        nama: "Majalah v2",
        ukuran: JSON.stringify({ lebar: 595, tinggi: 842 }),
        halaman,
      }).toString(),
    });
    expect(up.status).toBe(302);
    expect(up.headers.get("location")).toBe(loc);

    const page2 = await app.request(loc, { headers: { cookie } });
    const html2 = await page2.text();
    expect(html2).toContain("Majalah v2");
    expect(html2).toContain("Halo");

    // POST /admin/editor/:id/delete — hapus
    const del = await app.request(`${loc}/delete`, {
      method: "POST",
      headers: { cookie, ...formHeaders },
    });
    expect(del.status).toBe(302);
    expect(del.headers.get("location")).toBe("/admin/editor");

    const list = await app.request("/admin/editor", { headers: { cookie } });
    expect(await list.text()).toContain("Belum ada proyek");
  });

  test("POST simpan dengan halaman invalid → flash error", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const create = await app.request("/admin/editor", {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
      body: new URLSearchParams({
        nama: "Proyek",
        ukuran: JSON.stringify({ lebar: 794, tinggi: 1123 }),
        halaman: "[]",
      }).toString(),
    });
    const loc = create.headers.get("location")!;
    const post = await app.request(loc, {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
      body: new URLSearchParams({
        nama: "Proyek",
        ukuran: JSON.stringify({ lebar: 794, tinggi: 1123 }),
        halaman: "bukan-json",
      }).toString(),
    });
    expect(post.status).toBe(302);
    expect(post.headers.get("location")).toBe(loc);

    // Simulasi browser: sid dari register + flash baru dari response POST
    const sidCookie = cookie.split(";")[0];
    const page = await app.request(loc, {
      headers: { cookie: `${sidCookie}; ${cookieFrom(post)}` },
    });
    expect(await page.text()).toContain("Format halaman tidak valid");
  });

  test("GET /admin/editor/:id tidak ada → redirect ke /admin/editor", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const res = await app.request("/admin/editor/id-ngasal", { headers: { cookie } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/editor");
  });

  test("POST /admin/editor/:id tanpa login → 302 ke login", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/editor/id-ngasal", {
      method: "POST",
      headers: formHeaders,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");
  });
});