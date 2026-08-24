# Dider

> Dider (Digital Reader) — aplikasi web pembuat dokumen & majalah digital yang
> diekspor ke PDF. Terinspirasi dari [pubhtml5.com](https://pubhtml5.com/).

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Stack](https://img.shields.io/badge/stack-Bun%20%7C%20Hono%20%7C%20Eta%20%7C%20SQLite-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Latar Belakang

Membuat dokumen atau majalah digital biasanya butuh aplikasi desktop yang berat.
Dider hadir sebagai editor berbasis web yang ringan: susun **halaman** dari
**blok-blok** konten, atur **ukuran halaman**, simpan (autosave), dan export ke
**PDF** siap cetak — semuanya dari browser.

## Arsitektur

Server-rendered MVC (gaya Laravel): Hono controller mengembalikan **view Eta**
(HTML), semua submit via **form POST** + redirect (PRG). Tidak ada JSON API
terpisah.

```mermaid
flowchart LR
    Browser["Browser<br/>form POST · Tailwind + vanilla JS"]
    Web["Hono Web Routes<br/>/ · /admin/*"]
    Ctrl["Controllers<br/>auth · page · project"]
    Model["Models<br/>user · session · project"]
    View["Eta Views<br/>views/ · layouts + partials"]
    DB[("SQLite<br/>data/app.db")]

    Browser -->|POST form| Web
    Web --> Ctrl
    Ctrl --> Model
    Model --> DB
    Ctrl --> View
    View --> Browser
```

**Keamanan terpasang:** cookie session `httpOnly` + `sameSite=Lax`, password
di-hash argon2 (`Bun.password`), `hono/csrf` (origin) di semua request,
escape default Eta (`<%=`).

---

## Struktur Repository (MVC)

```
dider/
├── src/
│   ├── index.ts                # entry: server Bun (port 3000, hot reload)
│   ├── app.ts                  # build Hono app + middleware global + static
│   ├── db.ts                   # koneksi DB (sqlite | supabase) + migrasi
│   ├── view.ts                 # setup Eta + helper view()/redirect()/flash
│   ├── models/                 # MODEL — akses data / query SQL
│   │   ├── user.model.ts       #   users: register, verifyPassword (argon2)
│   │   ├── session.model.ts    #   sessions: create/find/delete session cookie
│   │   └── project.model.ts    #   projects: create, list, findById, update, delete
│   ├── controllers/            # CONTROLLER — form POST → model → view/redirect
│   │   ├── auth.controller.ts  #   /admin/login, /admin/register, /admin/logout
│   │   ├── page.controller.ts  #   GET / (homepage publik)
│   │   └── project.controller.ts # /admin/editor* — CRUD proyek (auth)
│   ├── middleware/
│   │   ├── auth.middleware.ts  # session helpers + requireAuth + guest
│   │   └── locals.middleware.ts # inject user login + flash ke context
│   └── routes/
│       └── web.ts              # router web: pasang controller + injectLocals
├── views/                      # VIEW — template Eta (Blade/EJS-like)
│   ├── layouts/                #   layout admin & homepage
│   ├── partials/               #   navbar + error list
│   ├── admin/                  #   tampilan admin (auth + editor)
│   └── homepage/               #   tampilan depan user
├── public/                     # aset statis (style.css Tailwind, editor.js)
├── supabase/migrations/        # skema SQL versi Supabase (opsional)
├── test/                       # unit test (`bun test`, SQLite in-memory)
└── .github/                    # template issue/PR + CI
```

---

## Quickstart

```bash
bun install
bun run dev        # terminal 1: server di http://localhost:3000 (hot reload)
bun run dev:css    # terminal 2: compile Tailwind (watch)
```

Build CSS produksi: `bun run build:css` — hasilnya `public/style.css`.

---

## Rute

| Method | Path | View / Aksi | Auth |
|--------|------|-------------|------|
| GET | `/` | `homepage/index` — landing | - |
| GET | `/health` | health check | - |
| GET | `/admin/login` | `admin/auth/login` | guest |
| POST | `/admin/login` | login → `/admin/editor` | guest |
| GET | `/admin/register` | `admin/auth/register` | guest |
| POST | `/admin/register` | buat user → `/admin/editor` | guest |
| POST | `/admin/logout` | logout → `/` | ✓ |
| GET | `/admin/editor` | `admin/editor/index` — daftar proyek | ✓ |
| POST | `/admin/editor` | buat proyek → `/admin/editor/:id` | ✓ |
| GET | `/admin/editor/:id` | `admin/editor/show` — editor | ✓ |
| POST | `/admin/editor/:id` | simpan/autosave proyek | ✓ |
| POST | `/admin/editor/:id/delete` | hapus proyek → `/admin/editor` | ✓ |

Semua mutasi via form POST (PRG). Validasi payload proyek di controller
(JSON `ukuran`/`halaman`, batas ukuran halaman 50–5000px, maks 500 halaman).

---

## Testing

```bash
bun test
```

Unit test pakai `bun test` (folder `test/`). DB test memakai SQLite **in-memory** —
tidak menyentuh `data/app.db`. Cakupan saat ini:

| File | Menguji |
|---|---|
| `test/session.model.test.ts` | create/find/delete session |
| `test/user.model.test.ts` | register, verifyPassword, tanpa bocor hash |
| `test/project.model.test.ts` | CRUD proyek, JSON parse halaman/ukuran |
| `test/web.test.ts` | integrasi web: render view, auth flow, editor CRUD, validasi, flash |

CI otomatis menjalankan `bun test` + `bun run build:css` di setiap push/PR ke
`master`.

---

## Ganti ke Supabase

1. `bun add @supabase/supabase-js`
2. Apply `supabase/migrations/001_init.sql` di Supabase (SQL Editor / `supabase db push`)
3. Copy `.env.example` → `.env`, set:
   ```
   DB_DRIVER=supabase
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```

Catatan: route saat ini **sqlite-first**. Saat pindah Supabase, tambahkan branch
`db.supabase` di tiap controller (pola `if (db.sqlite) { ... } else { ... }`).

---

## Roadmap

- **Reader (mode baca)** — halaman publik untuk membaca dokumen ala pubhtml5.
- **Export PDF** — generate PDF dari proyek.
- **Supabase driver** — implementasikan branch `db.supabase` di controller.

Lihat [issue-issue](https://github.com/ccit-venture/dider/issues) untuk daftar
pekerjaan yang sedang/akan dikerjakan.

---

## Kontribusi

Project ini **open source** — kontribusi sangat terbuka! Cara paling cepat:

1. **Fork** repository
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Jalankan test: `bun test`
4. Buat **Pull Request** dengan mengisi template yang sudah disediakan

Panduan lengkap (fork, sinkron upstream, gaya commit) →
[CONTRIBUTING.md](CONTRIBUTING.md). Sebelum mengubah kode, baca juga
[AGENTS.md](AGENTS.md) untuk konvensi struktur & hal yang sering salah.

Komunitas berpegang pada [Kode Etik](CODE_OF_CONDUCT.md). Untuk masalah
keamanan, jangan buka issue publik — lihat [SECURITY.md](SECURITY.md).

---

## Kontributor

| Nama | Peran |
|------|-------|
| Muhammad Hudya Ramadhana | Maintainer, backend & API |

**Institusi:** CEP CCIT-FTUI

---

## Lisensi

MIT License — bebas digunakan dengan menyertakan atribusi.

---

<p align="center">
  <sub>Dider · Venture Studio CCIT-FTUI</sub>
</p>