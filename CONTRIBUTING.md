# Contributing — Dider

Terima kasih sudah ingin berkontribusi! 🎉

Project ini adalah aplikasi web pembuat dokumen & majalah digital
(Bun + Hono + SQLite). Sebelum mulai, baca dulu **[AGENTS.md](AGENTS.md)** —
berisi konvensi struktur folder, alur MVC, dan hal-hal yang sering salah dipahami.

Daftar isi:
1. [Cara Fork & Clone](#cara-fork--clone)
2. [Buat Branch](#buat-branch)
3. [Menjalankan Test](#menjalankan-test)
4. [Gaya Commit Message](#gaya-commit-message)
5. [Membuat Pull Request](#membuat-pull-request)
6. [Laporkan Bug / Usulkan Fitur](#laporkan-bug--usulkan-fitur)

---

## Cara Fork & Clone

1. Klik tombol **Fork** di kanan atas halaman repo `github.com/ccit-venture/dider`.

2. Clone hasil fork ke lokal:

```bash
git clone https://github.com/<username-kamu>/dider.git
cd dider
```

3. Tambahkan repo asli sebagai `upstream` (untuk sinkronisasi):

```bash
git remote add upstream https://github.com/ccit-venture/dider.git
```

Pastikan remote sudah benar:

```bash
git remote -v
# origin   → repo fork kamu
# upstream → ccit-venture/dider
```

4. Sinkronkan branch `master` kamu dengan upstream:

```bash
git checkout master
git pull upstream master
```

> Selalu `pull upstream master` sebelum mulai bekerja supaya tidak bentrok saat
> review.

---

## Buat Branch

Gunakan nama branch yang deskriptif dan mengikuti pola:

| Jenis | Contoh nama branch |
|-------|--------------------|
| Fitur baru | `feat/editor-visual` |
| Perbaikan bug | `fix/autosave-gagal` |
| Dokumentasi | `docs/update-readme` |
| Refactor | `refactor/pisah-route` |
| Test | `test/tambah-project-model` |

```bash
git checkout -b feat/nama-fitur
```

Kerjakan perubahan di branch ini, lalu commit.

---

## Menjalankan Test

**Wajib** menjalankan test sebelum submit PR:

```bash
bun test
```

DB test memakai SQLite **in-memory** (`:memory:`) — tidak menyentuh `data/app.db`.
Jika menyentuh class Tailwind, jalankan juga:

```bash
bun run build:css
```

CI otomatis juga menjalankan `bun test` + `bun run build:css` di setiap push/PR.

---

## Gaya Commit Message

Ikuti gaya repo saat ini (Conventional-ish short subject):

```
<tipe>: <deskripsi singkat>
```

Tipe yang dipakai:

- `feat:` — fitur baru
- `fix:` — perbaikan bug
- `refactor:` — perubahan struktur tanpa mengubah perilaku
- `docs:` — dokumentasi (README, AGENTS.md)
- `test:` — test / CI

Contoh:

```bash
git add src/models/project.model.ts test/project.model.test.ts
git commit -m "feat: tambah export PDF"
```

> Satu commit sedapat mungkin mewakili satu perubahan logis. Jangan commit
> perubahan yang tidak saling berhubungan.

---

## Membuat Pull Request

1. Push branch kamu ke fork:

```bash
git push origin feat/nama-fitur
```

2. Di GitHub, buka halaman repo asli → tombol **Compare & pull request**.

3. Isi template PR yang otomatis muncul. Lengkapi:
   - Deskripsi perubahan
   - Issue yang di-fix (`closes #<nomor>`)
   - Checklist (pastikan test lulus)

4. Setelah submit, CI akan berjalan otomatis. Pastikan semua job hijau.

5. Maintainer akan me-review. Perbaiki masukan dengan menambahkan commit baru
   pada branch yang sama (bukan force-push ke branch yang sudah di-review).

---

## Laporkan Bug / Usulkan Fitur

Gunakan template issue yang sudah disediakan:

- 🐛 [Laporan Bug](.github/ISSUE_TEMPLATE/bug_report.md)
- ✨ [Permintaan Fitur](.github/ISSUE_TEMPLATE/feature_request.md)

Untuk masalah keamanan, JANGAN buka issue publik — ikuti petunjuk di
[SECURITY.md](SECURITY.md).
