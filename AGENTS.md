# AGENTS.md — Panduan untuk AI & Developer

Panduan kerja pada repositori **Dider**. Baca ini sebelum mengubah kode agar
tidak merusak struktur, path import, atau konvensi yang sudah ada.

## Ringkasan Proyek

Aplikasi web pembuat dokumen & majalah digital yang diekspor ke PDF. Susun
halaman dari blok-blok konten, atur ukuran, autosave, export PDF. Terinspirasi
dari pubhtml5.com.

Stack: **Bun + Hono + SQLite + Tailwind + vanilla JS** (MVC).

Arsitektur alur:
**View** (`public/`) → fetch → **Routes** (`src/routes/`) → **Controller**
(`src/controllers/`) → **Model** (`src/models/`) → SQLite.

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

## Struktur Penting (`src/`)

```
src/
├── index.ts                # entry: server Bun (port 3000). JANGAN taruh logika bisnis di sini
├── app.ts                  # createApp(db): middleware global + static files. Dipakai server & test
├── db.ts                   # initDb() (sqlite | supabase) + migrate(). Skema SQL ada di sini (mode sqlite)
├── models/                 # MODEL — query SQL. Satu class per tabel/domain
│   ├── project.model.ts    #   projects (nama, ukuran JSON, halaman JSON)
│   └── session.model.ts    #   sessions
├── controllers/
│   └── project.controller.ts # /api/projects: CRUD
├── middleware/
│   └── auth.middleware.ts  # getUserId / createSession / destroySession / requireAuth
├── routes/
│   └── index.ts            # api(db): pasang controller di bawah /api/*
└── styles/input.css        # sumber Tailwind (compile → public/style.css)
```

## Konvensi Penting

- **DB driver env-driven** (`src/db.ts`): `DB_DRIVER=sqlite` (default) atau
  `supabase`. Mode supabase **belum diimplementasikan** — controller mengecek
  `if (!db.sqlite)` lalu return `501`. JANGAN hapus guard ini.
- **`createApp(db)`** — aplikasi Hono dibangun dari instance `Db`. Server
  (`src/index.ts`) dan unit test (`test/helpers.ts`) sama-sama memakainya.
- **Auth belum lengkap** — `requireAuth` dipakai di POST/PUT `/api/projects`,
  tapi **belum ada** endpoint `/api/auth/*` dan tabel `users`. Konsekuensi:
  semua tulis proyek praktis 401. Saat menambah auth, buat
  `auth.controller.ts` + tabel `users` di `src/db.ts` + `user.model.ts`, dan
  ikuti pola yang sama seperti repo saudara `ccit-venture/cosign`.
- **Data proyek**: kolom `ukuran` & `halaman` disimpan sebagai **JSON string**.
  Model melakukan `JSON.stringify` saat simpan; baca kembali dengan parse.
  JANGAN menyimpan sebagai teks terpisah.
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
menyentuh `data/app.db`. Tambahkan test untuk setiap model/controller baru.

## Hal yang Sering Salah

- **Meletakkan logika bisnis di `src/index.ts`** — entry hanya inisialisasi;
  semua logika di controller/model.
- **Mengedit `public/style.css` langsung** — itu hasil compile Tailwind. Ubah
  `src/styles/input.css` lalu jalankan `bun run build:css`.
- **Menghapus guard `if (!db.sqlite)`** di controller — akan memecah mode
  sqlite-first.
- **Commit file `.env` / `data/`** — sudah di-ignore, jangan di-add paksa
  (`git add -f`).
- **Mengira auth sudah berfungsi** — cek dulu apakah session bisa dibuat
  (belum ada endpoint login). Jangan asumsi `requireAuth` lolos di test.
- **Menambah route tanpa tes** — setiap endpoint baru sebaiknya punya coverage
  di `test/`.
