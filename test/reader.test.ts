import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import vm from "vm";
import {
  createTestApp,
  cookieFrom,
  formHeaders,
  registerUser,
} from "./helpers";

const PDF_BODY = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";

/** Jalankan bundle browser dalam sandbox tanpa module (simulasi <script> biasa). */
function evalBrowserBundle(file: string): Record<string, unknown> {
  const code = readFileSync(file, "utf8");
  const sandbox: Record<string, unknown> = {};
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx);
  return sandbox;
}

/** Render halaman /baca/:id lengkap (register → upload → baca). */
async function renderBacaPage(): Promise<string> {
  const app = createTestApp();
  const cookie = await registerUser(app);

  const form = new FormData();
  form.append("nama", "Majalah Tes");
  form.append("pdf", new File([PDF_BODY], "majalah.pdf", { type: "application/pdf" }));
  await app.request("/admin/dokumen", {
    method: "POST",
    headers: { cookie, ...formHeaders },
    body: form,
  });

  const list = await app.request("/admin/dokumen", { headers: { cookie } });
  const id = (await list.text()).match(/\/baca\/([0-9a-f-]+)/)?.[1];
  expect(id).toBeTruthy();

  const baca = await app.request(`/baca/${id}`);
  expect(baca.status).toBe(200);
  return baca.text();
}

describe("Reader — bundle page-flip (flipbook)", () => {
  test("page-flip.browser.js expose global St.PageFlip sebagai constructor", () => {
    const sandbox = evalBrowserBundle(
      "node_modules/page-flip/dist/js/page-flip.browser.js"
    );
    const St = sandbox.St as Record<string, unknown>;
    expect(St).toBeDefined();
    expect(typeof St.PageFlip).toBe("function");
  });

  test("halaman /baca/:id memakai nama global yang benar (St.PageFlip)", async () => {
    const html = await renderBacaPage();
    expect(html).toContain("St.PageFlip");
    expect(html).not.toContain("St.StPageFlip");
  });

  test("halaman /baca/:id memuat semua aset vendor yang dibutuhkan", async () => {
    const html = await renderBacaPage();
    expect(html).toContain("/vendor/page-flip/dist/js/page-flip.browser.js");
    expect(html).toContain("/vendor/pdfjs-dist/build/pdf.min.mjs");
    expect(html).toContain("pdf.worker.min.mjs");
    expect(html).toContain("/page-flip.css");
    expect(html).toContain('getDocument({ url: "/uploads/');
    expect(html).not.toContain("/uploads/uploads/");
  });
});