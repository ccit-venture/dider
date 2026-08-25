# AGENTS.md — Panduan untuk AI & Developer

Panduan kerja pada repositori **Dider**. Baca ini sebelum mengubah kode agar
tidak merusak struktur, path import, atau konvensi yang sudah ada.

## Ringkasan Proyek

Platform baca dokumen & majalah digital ala pubhtml5.com: **upload PDF** dari
area admin, pembaca membukanya dengan pengalaman **flipbook** (efek membalik
halaman) via **pdf.js** + **StPageFlip** di browser.

Stack: **Bun + Hono + Eta (template engine) + SQLite + Tailwind + vanilla JS** —
server-rendered MVC (gaya Laravel).

Arsitektur alur:
**Browser (form POST)** → **Routes** (`src/routes/web.ts`) → **Controller**
(`src/controllers/`) → **Model** (`src/models/`) → SQLite, lalu Controller
mengembalikan **View Eta** (`views/`) → HTML. File PDF disimpan di `uploads/`
dan di-serve statis.

**TIDAK ada JSON API** — semua submit via form POST + redirect (PRG).
Jangan menambahkan route `/api/*` atau `fetch()` ke endpoint JSON.

## Standar Kontribusi & Open Source

Repositori ini publik (open source) di `ccit-venture/dider`. Perhatikan:

- **Template issue/PR** ada di `.github/` — saat membuat PR wajib melengkapi
  checklist yang ada di `PULL_REQUEST_TEMPLATE.md`.
- **CONTRIBUTING.md** berisi panduan fork, clone, sinkron upstream, dan gaya
  commit. AJAK kontributor baru membaca file ini dan `AGENTS.md`.
- **Kode Etik** di `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1 — Bahasa
  Indonesia). Kontak penegakan: mhudyaramadhana@gmail.com (Hudya).
- **Keamanan**: laporkan via SECURITY.md (jangan buka issue publik).
- **CI (`.github/workflows/ci.yml`)**: `bun install` + `bun test` +
  `bun run build:css` di setiap push/PR ke `master`. Pastikan semua hijau
  sebelum merge.

## Struktur Penting

```
src/
├── index.ts                # entry: server Bun (port 3000). JANGAN taruh logika bisnis di sini
├── app.ts                  # createApp(db): middleware (logger, secureHeaders, csrf) + static
│                           #   /uploads/* → ./uploads (PDF), /vendor/* → ./node_modules (pdfjs/page-flip)
├── db.ts                   # initDb() (sqlite | supabase) + migrate() (skema: users, sessions, projects)
├── view.ts                 # setup Eta + helper view()/redirect()/flash*. Analog view() Laravel
├── models/                 # MODEL — query SQL. Satu class per tabel/domain
│   ├── user.model.ts       #   users (auth admin)
│   ├── session.model.ts    #   sessions
│   └── project.model.ts    #   projects (dokumen PDF: id, nama, pdf_path)
├── controllers/            # CONTROLLER — parse form → model → view/redirect
│   ├── auth.controller.ts  #   /admin/login, /admin/register, /admin/logout
│   ├── page.controller.ts  #   GET / (homepage), GET /baca/:id (reader flipbook)
│   └── project.controller.ts # /admin/dokumen* — upload PDF, list, hapus
├── middleware/
│   ├── auth.middleware.ts  # getUserId / createSession / destroySession / requireAuth / redirectIfAuthenticated
│   └── locals.middleware.ts # inject user + flash ke context untuk semua halaman
└── routes/
    └── web.ts              # pasang controller + injectLocals(db)
views/                      # VIEW — template Eta
├── layouts/                # admin.eta.html & homepage.eta.html (pakai it.body)
├── partials/               # navbar + errors.eta.html
├── admin/                  # auth/ (login, register) + dokumen/ (index: list + upload)
└── homepage/               # index.eta.html (daftar) + baca.eta.html (reader flipbook)
public/                     # aset statis: style.css (hasil Tailwind), page-flip.css
uploads/                    # file PDF hasil upload (di-gitignore)
test/                       # unit test
```

## Konvensi Penting

### View Eta (kritis!)

- File template bernama `*.eta.html` — jangan ubah ekstensi (konfigurasi
  `defaultExtension` di `src/view.ts`).
- Setiap halaman diawali `<% layout("/layouts/admin") %>` (atau homepage).
  **Path layout/include WAJIB diawali `/`** agar relatif ke root `views/`
  (misal `include("/partials/errors", {...})`) — tanpa `/`, Eta resolve relatif
  ke folder template dan gagal.
- **Konten halaman masuk ke layout via `it.body`** (bukan `it.content`).
- Escape otomatis default (`<%=`). Gunakan `<%~` HANYA untuk HTML mentah
  (contoh: flash/navbar via include).
- Judul halaman: `<% it.title = "..." %>` di baris atas halaman.
- Render di controller via `view(c, "admin/dokumen/index", { dokumen })` dari
  `src/view.ts`.

### Upload PDF & Reader

- Upload di `POST /admin/dokumen` (multipart, wajib login). Validasi:
  `file.type === "application/pdf"` ATAU ekstensi `.pdf`, maks **50MB**.
  JANGAN pindahkan validasi ini tanpa tes.
- File disimpan `uploads/<uuid>.pdf` (folder di-gitignore; path dari env
  `UPLOAD_DIR`, default `uploads`). Metadata (nama, path) di tabel `projects`.
- File di-serve via `serveStatic` `/uploads/*` (lihat `src/app.ts`).
- Reader publik di `GET /baca/:id` → view `homepage/baca` memakai:
  - `/vendor/pdfjs-dist/build/pdf.min.mjs` (ESM) + worker `pdf.worker.min.mjs`
  - `/vendor/page-flip/dist/js/page-flip.browser.js` (global `St.StPageFlip`)
  - `/page-flip.css`
  Ketiga path vendor ini TIDAK boleh diubah — route `/vendor/*` menunjuk
  `./node_modules`.
- Hapus dokumen = hapus baris DB **dan** file (`unlinkSync(pdf_path)`).

### Form & Request

- Semua mutasi pakai `<form method="post">` → controller → `redirect(c, ...)`
  (PRG). Jangan buat JSON API / fetch.
- `c.req.parseBody()` untuk baca form (urlencoded/multipart; field file
  kembali sebagai `File`).
- Flash message: `flashSuccess` / `flashError` sebelum redirect; tampilkan di
  layout via `it.flash`.

### Auth & Middleware

- `requireAuth(db)` redirect ke `/admin/login` (bukan 401 JSON).
- `redirectIfAuthenticated(db)` untuk halaman guest (login/register).
- `injectLocals(db)` dipasang sekali di `web.ts` — resolve `it.user` + `it.flash`.
- Session cookie `sid` (httpOnly, 7 hari). Password wajib `Bun.password`
  (argon2).
- **DB driver env-driven** (`src/db.ts`): `DB_DRIVER=sqlite` (default) atau
  `supabase`. Mode supabase **belum diimplementasikan** — controller mengecek
  `if (!db.sqlite)` lalu return `501`. JANGAN hapus guard ini.
- CSRF: `hono/csrf` origin-check via `CSRF_ORIGIN` env (default
  `http://localhost:3000`). Form POST dari origin lain → 403.
- **`.env`** TIDAK pernah di-commit (sudah di `.gitignore`). Cukup ikuti
  `.env.example`.

## Cara Menjalankan

```bash
bun install
bun run dev        # terminal 1: server http://localhost:3000 (hot reload)
bun run dev:css    # terminal 2: compile Tailwind (watch)
```

## Menjalankan Test

```bash
bun test
```

DB test memakai SQLite **in-memory** (`:memory:` di `test/helpers.ts`) — tidak
menyentuh `data/app.db`. Request test form POST wajib menyertakan header
`origin: http://localhost:3000` (csrf) — lihat `formHeaders` di
`test/helpers.ts`. Upload test memakai `FormData` + `File`.

## Hal yang Sering Salah

- **Menambahkan JSON API / fetch** — project ini murni form POST (PRG).
- **`layout`/`include` tanpa prefix `/`** — template gagal ditemukan.
- **Pakai `it.content` di layout** — Eta v4 mengirim body sebagai `it.body`.
- **Menghidupkan kembali editor blok** — konsep Dider = upload PDF + reader
  flipbook. Tabel `projects` hanya `id, nama, pdf_path` (skema lama dengan
  `ukuran`/`halaman` otomatis di-drop oleh migrasi).
- **Mengubah path vendor pdfjs/page-flip** — reader akan rusak.
- **Upload tanpa validasi PDF/ukuran** — wajib lewat `parseProject`-style
  validasi di `project.controller.ts` (hanya PDF, ≤ 50MB).
- **Mengedit `public/style.css` langsung** — itu hasil compile Tailwind. Ubah
  `src/styles/input.css` lalu `bun run build:css`.
- **Menghapus guard `if (!db.sqlite)`** di controller — memecah mode
  sqlite-first.
- **POST tanpa Origin header di test** — kena 403 csrf.
- **Commit file `.env` / `data/` / `uploads/`** — sudah di-ignore, jangan
  di-add paksa (`git add -f`).
- **Menambah route tanpa tes** — setiap halaman/aksi baru sebaiknya punya
  coverage di `test/web.test.ts`.