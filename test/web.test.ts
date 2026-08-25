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
    expect(res.headers.get("location")).toBe("/admin/dokumen");
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
    expect(res.headers.get("location")).toBe("/admin/dokumen");
    expect(cookieFrom(res)).toContain("sid=");
  });

  test("sudah login → GET /admin/login redirect ke editor", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const res = await app.request("/admin/login", { headers: { cookie } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen");
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

    const editor = await app.request("/admin/dokumen", { headers: { cookie } });
    expect(editor.status).toBe(302);
    expect(editor.headers.get("location")).toBe("/admin/login");
  });
});

describe("Web — dokumen (upload PDF, wajib login)", () => {
  const pdfBody = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";

  test("GET /admin/dokumen tanpa login → 302 ke /admin/login", async () => {
    const app = createTestApp();
    const res = await app.request("/admin/dokumen");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/login");
  });

  test("flow lengkap: upload PDF → tampil di list → halaman baca → hapus", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    // GET /admin/dokumen — kosong
    const awal = await app.request("/admin/dokumen", { headers: { cookie } });
    expect(await awal.text()).toContain("Belum ada dokumen");

    // POST /admin/dokumen — upload PDF
    const form = new FormData();
    form.append("nama", "Majalah Angkatan");
    form.append("pdf", new File([pdfBody], "majalah.pdf", { type: "application/pdf" }));
    const up = await app.request("/admin/dokumen", {
      method: "POST",
      headers: { cookie, ...formHeaders },
      body: form,
    });
    expect(up.status).toBe(302);
    expect(up.headers.get("location")).toBe("/admin/dokumen");

    // List menampilkan dokumen
    const list = await app.request("/admin/dokumen", { headers: { cookie } });
    const listHtml = await list.text();
    expect(listHtml).toContain("Majalah Angkatan");
    const match = listHtml.match(/\/baca\/([0-9a-f-]+)/);
    expect(match).not.toBeNull();
    const id = match![1];

    // Halaman baca (reader) publik
    const baca = await app.request(`/baca/${id}`);
    expect(baca.status).toBe(200);
    const bacaHtml = await baca.text();
    expect(bacaHtml).toContain("Majalah Angkatan");
    expect(bacaHtml).toContain("/uploads/");
    expect(bacaHtml).toContain("page-flip");
    expect(bacaHtml).toContain("pdf.min.mjs");
    expect(bacaHtml).toContain("getDocument({ url:");

    // POST /admin/dokumen/:id/delete — hapus
    const del = await app.request(`/admin/dokumen/${id}/delete`, {
      method: "POST",
      headers: { cookie, ...formHeaders },
    });
    expect(del.status).toBe(302);
    expect(del.headers.get("location")).toBe("/admin/dokumen");

    const list2 = await app.request("/admin/dokumen", { headers: { cookie } });
    expect(await list2.text()).toContain("Belum ada dokumen");
  });

  test("upload file non-PDF → flash error", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const form = new FormData();
    form.append("nama", "Bukan PDF");
    form.append("pdf", new File(["hello"], "catatan.txt", { type: "text/plain" }));
    const res = await app.request("/admin/dokumen", {
      method: "POST",
      headers: { cookie, ...formHeaders },
      body: form,
    });
    expect(res.status).toBe(302);

    const sidCookie = cookie.split(";")[0];
    const page = await app.request("/admin/dokumen", {
      headers: { cookie: `${sidCookie}; ${cookieFrom(res)}` },
    });
    expect(await page.text()).toContain("Hanya file PDF");
  });

  test("upload tanpa file → flash error", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    const form = new FormData();
    form.append("nama", "Tanpa File");
    const res = await app.request("/admin/dokumen", {
      method: "POST",
      headers: { cookie, ...formHeaders },
      body: form,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen");
  });

  test("GET /baca/:id tidak ada → redirect ke /", async () => {
    const app = createTestApp();
    const res = await app.request("/baca/id-ngasal");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });
});