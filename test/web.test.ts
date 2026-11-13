import { describe, expect, test } from "bun:test";
import { unlinkSync, existsSync } from "fs";
import {
  createTestApp,
  cookieFrom,
  mergeCookies,
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

  test("GET / → rak buku tampil, section 'Dokumen Terbaru' hilang", async () => {
    const app = createTestApp();
    const html = await (await app.request("/")).text();
    expect(html).toContain("Rak Buku");
    expect(html).not.toContain("Dokumen Terbaru");
    expect(html).toContain("?rak=latest");
    expect(html).toContain("?rak=popular");
  });

  test("GET /?rak=popular → filter popular aktif", async () => {
    const app = createTestApp();
    const html = await (await app.request("/?rak=popular")).text();
    expect(html).toContain("bg-indigo-600 text-white");
  });

  test("GET /health → driver sqlite", async () => {
    const app = createTestApp();
    const res = await app.request("/health");
    expect((await res.json()).driver).toBe("sqlite");
  });

  test("navbar homepage tamu → tampil Login & Register", async () => {
    const app = createTestApp();
    const html = await (await app.request("/")).text();
    const nav = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
    expect(nav).toContain('href="/admin/login"');
    expect(nav).toContain('href="/admin/register"');
    expect(nav).not.toContain("Logout");
  });

  test("navbar homepage user login → tampil Dokumen & Logout, tanpa tombol Register", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const html = await (await app.request("/", { headers: { cookie } })).text();
    const nav = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
    expect(nav).toContain('href="/admin/dokumen"');
    expect(nav).toContain('action="/admin/logout"');
    expect(nav).not.toContain('href="/admin/register"');
    expect(nav).toContain("Halo, admin");
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

  test("POST /admin/register → 302 /admin/dokumen + cookie session", async () => {
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

  test("sudah login → GET /admin/login redirect ke /admin/dokumen", async () => {
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

    const dokumen = await app.request("/admin/dokumen", { headers: { cookie } });
    expect(dokumen.status).toBe(302);
    expect(dokumen.headers.get("location")).toBe("/admin/login");
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
    expect(bacaHtml).not.toContain("/uploads/uploads/");
    expect(bacaHtml).toContain("page-flip");
    expect(bacaHtml).toContain("pdf.min.mjs");
    expect(bacaHtml).toContain("getDocument({ url:");

    // Reader menaikkan views (untuk rak 'popular')
    const listAfter = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(listAfter).toContain("Majalah Angkatan");

    // POST /admin/dokumen/:id/trash-and-delete — hapus permanen dari list
    const del = await app.request(`/admin/dokumen/${id}/trash-and-delete`, {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
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

  test("file PDF hilang → list admin menandai & reader redirect ramah", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);

    // Upload dulu
    const form = new FormData();
    form.append("nama", "Majalah Hilang");
    form.append("pdf", new File([pdfBody], "hilang.pdf", { type: "application/pdf" }));
    await app.request("/admin/dokumen", {
      method: "POST",
      headers: { cookie, ...formHeaders },
      body: form,
    });

    const list = await app.request("/admin/dokumen", { headers: { cookie } });
    const listHtml = await list.text();
    const id = listHtml.match(/\/baca\/([0-9a-f-]+)/)![1];
    expect(listHtml).not.toContain("File hilang");

    // Simulasikan file terhapus dari disk
    unlinkSync(`uploads/${id}.pdf`);

    // List admin menandai file hilang
    const list2 = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(list2).toContain("File hilang — upload ulang");

    // Reader tidak 404 mentah: redirect ke / + flash error
    const baca = await app.request(`/baca/${id}`);
    expect(baca.status).toBe(302);
    expect(baca.headers.get("location")).toBe("/");

    const page = await app.request("/", { headers: { cookie: cookieFrom(baca) } });
    expect(await page.text()).toContain("File PDF tidak ditemukan");

    // Bersihkan record via trash-and-delete (unlink file gagal di-swallow)
    await app.request(`/admin/dokumen/${id}/trash-and-delete`, {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
    });
  });
});

describe("Web — soft delete & trash", () => {
  const pdfBody = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";

  async function upload(app: ReturnType<typeof createTestApp>, cookie: string) {
    const form = new FormData();
    form.append("nama", "Dokumen Trash");
    form.append("pdf", new File([pdfBody], "trash.pdf", { type: "application/pdf" }));
    await app.request("/admin/dokumen", {
      method: "POST",
      headers: { cookie, ...formHeaders },
      body: form,
    });
    const list = await app.request("/admin/dokumen", { headers: { cookie } });
    return (await list.text()).match(/\/baca\/([0-9a-f-]+)/)![1];
  }

  const post = (app: ReturnType<typeof createTestApp>, path: string, cookie: string, mode?: string) =>
    app.request(path, {
      method: "POST",
      headers: { cookie, ...formPostHeaders },
      body: new URLSearchParams(mode ? { mode } : {}).toString(),
    });

  test("soft delete → hilang dari list, muncul di trash, file tetap ada", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const del = await post(app, `/admin/dokumen/${id}/delete`, cookie, "soft");
    expect(del.status).toBe(302);
    expect(del.headers.get("location")).toBe("/admin/dokumen");

    const list = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(list).not.toContain("Dokumen Trash");

    const trash = await (await app.request("/admin/dokumen/trash", { headers: { cookie } })).text();
    expect(trash).toContain("Dokumen Trash");
    expect(trash).toContain(`/admin/dokumen/${id}/restore`);

    expect(existsSync(`uploads/${id}.pdf`)).toBe(true);

    // Reader publik menolak dokumen di trash
    const baca = await app.request(`/baca/${id}`);
    expect(baca.status).toBe(302);
    expect(baca.headers.get("location")).toBe("/");

    await post(app, `/admin/dokumen/${id}/hard-delete`, cookie);
  });

  test("restore → kembali ke list, hilang dari trash", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);
    await post(app, `/admin/dokumen/${id}/delete`, cookie, "soft");

    const res = await post(app, `/admin/dokumen/${id}/restore`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen/trash");

    const list = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(list).toContain("Dokumen Trash");

    const trash = await (await app.request("/admin/dokumen/trash", { headers: { cookie } })).text();
    expect(trash).not.toContain(`/admin/dokumen/${id}/restore`);

    const baca = await app.request(`/baca/${id}`);
    expect(baca.status).toBe(200);

    await post(app, `/admin/dokumen/${id}/trash-and-delete`, cookie);
  });

  test("hard delete dari trash → baris & file hilang permanen", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);
    await post(app, `/admin/dokumen/${id}/delete`, cookie, "soft");

    const res = await post(app, `/admin/dokumen/${id}/hard-delete`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen/trash");

    const trash = await (await app.request("/admin/dokumen/trash", { headers: { cookie } })).text();
    expect(trash).not.toContain(`/admin/dokumen/${id}/restore`);
    expect(existsSync(`uploads/${id}.pdf`)).toBe(false);
  });

  test("restore dokumen yang tidak di-trash → flash error, tidak crash", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const res = await post(app, `/admin/dokumen/${id}/restore`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen/trash");

    await post(app, `/admin/dokumen/${id}/trash-and-delete`, cookie);
  });

  test("POST /delete abaikan mode=hard → tetap soft delete (tidak bisa bypass trash)", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const del = await post(app, `/admin/dokumen/${id}/delete`, cookie, "hard");
    expect(del.status).toBe(302);
    expect(del.headers.get("location")).toBe("/admin/dokumen");

    // Masih ada (soft) — file tetap & muncul di trash
    expect(existsSync(`uploads/${id}.pdf`)).toBe(true);
    const trash = await (await app.request("/admin/dokumen/trash", { headers: { cookie } })).text();
    expect(trash).toContain(`/admin/dokumen/${id}/restore`);

    await post(app, `/admin/dokumen/${id}/hard-delete`, cookie);
  });

  test("hard-delete dokumen aktif → ditolak, tidak dihapus", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const res = await post(app, `/admin/dokumen/${id}/hard-delete`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen");

    // Masih ada di list aktif
    const list = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(list).toContain("Dokumen Trash");
    expect(existsSync(`uploads/${id}.pdf`)).toBe(true);

    await post(app, `/admin/dokumen/${id}/trash-and-delete`, cookie);
  });

  test("trash-and-delete dari list → baris & file hilang, redirect ke list", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const res = await post(app, `/admin/dokumen/${id}/trash-and-delete`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin/dokumen");

    expect(existsSync(`uploads/${id}.pdf`)).toBe(false);
    const list = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(list).not.toContain(`/baca/${id}`);
  });

  test("popup hapus menawarkan soft delete & hard delete (wiring form benar)", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    const html = await (await app.request("/admin/dokumen", { headers: { cookie } })).text();
    expect(html).toContain(`action="/admin/dokumen/${id}/delete"`);
    expect(html).toContain(`formaction="/admin/dokumen/${id}/trash-and-delete"`);
    expect(html).toContain('name="mode" value="soft"');
    expect(html).toContain(`id="delete-${id}"`);

    await post(app, `/admin/dokumen/${id}/trash-and-delete`, cookie);
  });

  test("restore dokumen yang file PDF-nya hilang → tetap dipulihkan, beri peringatan", async () => {
    const app = createTestApp();
    const cookie = await registerUser(app);
    const id = await upload(app, cookie);

    await post(app, `/admin/dokumen/${id}/delete`, cookie, "soft");
    unlinkSync(`uploads/${id}.pdf`);

    const res = await post(app, `/admin/dokumen/${id}/restore`, cookie);
    expect(res.status).toBe(302);

    const page = await app.request("/admin/dokumen", {
      headers: { cookie: mergeCookies(cookie, cookieFrom(res)) },
    });
    expect(await page.text()).toContain("file PDF-nya tidak ditemukan");
  });
});