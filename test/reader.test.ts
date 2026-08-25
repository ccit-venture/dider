import { describe, expect, test } from "bun:test";
import { readFileSync, unlinkSync } from "fs";
import vm from "vm";
import {
  createTestApp,
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

/** Upload PDF test → kembalikan id + HTML halaman baca. File ikut dibersihkan. */
async function uploadAndRead(): Promise<{ id: string; html: string }> {
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
  return { id: id!, html: await baca.text() };
}

/** Hapus file upload hasil test (jangan sampai mencemari uploads/). */
function cleanupUpload(id: string) {
  try {
    unlinkSync(`uploads/${id}.pdf`);
  } catch {
    // sudah tidak ada — abaikan
  }
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
    const { id, html } = await uploadAndRead();
    try {
      expect(html).toContain("St.PageFlip");
      expect(html).not.toContain("St.StPageFlip");
    } finally {
      cleanupUpload(id);
    }
  });

  test("halaman /baca/:id memuat semua aset vendor yang dibutuhkan", async () => {
    const { id, html } = await uploadAndRead();
    try {
      expect(html).toContain("/vendor/page-flip/dist/js/page-flip.browser.js");
      expect(html).toContain("/vendor/pdfjs-dist/build/pdf.min.mjs");
      expect(html).toContain("pdf.worker.min.mjs");
      expect(html).toContain("/page-flip.css");
      expect(html).toContain('getDocument({ url: "/uploads/');
      expect(html).not.toContain("/uploads/uploads/");
      // Mode gambar: loadFromImages TANPA updateFromHtml (updateFromHtml butuh
      // array elemen HTML — tanpa argumen memicu "pagesElement is not iterable")
      expect(html).toContain("loadFromImages(images)");
      expect(html).not.toContain("updateFromHtml");
      // Sampul & halaman terakhir: halaman tunggal ukuran penuh di-tengahkan (translate)
      expect(html).toContain("applyBookWidth");
expect(html).toContain("translateX(");
      // Separuh kosong buku ter-clip (overflow-hidden) agar tidak ada area putih besar
      expect(html).toContain('id="flipbook-clip"');
      expect(html).toContain("overflow-hidden");
      expect(html).toContain('flipbookEl.style.width = flipbookEl.clientWidth + "px"');
      expect(html).toContain("drawBookShadow = function");
      // Scroll mouse: maju/mundur halaman (wheel + cooldown)
      expect(html).toContain('"wheel"');
      expect(html).toContain("wheelCooldown");
      expect(html).toContain("e.deltaY");
      // Suara kertas saat flip (Web Audio API sintesis)
      expect(html).toContain("AudioContext");
      expect(html).toContain("playFlipSound");
      // Suara dipicu event "flip" (berlaku untuk drag/scroll/tombol),
      // BUKAN "changeState" (yang tidak terpicu saat drag)
      expect(html).toContain("playFlipSound()");
      expect(html).not.toContain("changeState");
      // Nomor halaman ikut berubah saat ditarik (event flip)
      expect(html).toContain('flip.on("flip"');
      expect(html).toContain('flip.on("init"');
      // Tidak ada hook debug tersisa
      expect(html).not.toContain("__flip");
    } finally {
      cleanupUpload(id);
    }
  });
});