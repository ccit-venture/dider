# Pull Request

## Deskripsi

Jelaskan secara singkat apa yang diubah dan mengapa. Sertakan konteks yang cukup
supaya reviewer memahami tanpa harus menebak.

## Issue Terkait

- Fixes #`<nomor-issue>` (jika ada)
- Closes #`<nomor-issue>` (jika ada)

Jika tidak berkaitan dengan issue, tulis **Tidak ada** dan jelaskan alasannya.

## Tipe Perubahan

Pilih salah satu (hapus yang tidak relevan):

- [ ] 🐛 Bug fix
- [ ] ✨ Fitur baru
- [ ] 📝 Dokumentasi
- [ ] ♻️ Refactor (tidak mengubah perilaku)
- [ ] 🧪 Test
- [ ] 🔧 Konfigurasi / CI / Infra

## Checklist

Sebelum submit, pastikan semua poin berikut terpenuhi:

- [ ] ✅ `bun test` lulus (semua unit test hijau)
- [ ] ✅ `bun run build:css` tidak error (jika menyentuh class Tailwind)
- [ ] 📝 Dokumentasi diperbarui jika ada perubahan struktur/API
- [ ] 📄 Jika mengubah skema DB — migrasi & `src/db.ts` sinkron
- [ ] 🧹 Tidak ada perubahan yang tidak disengaja di file lain
- [ ] 🔒 Tidak ada secret/key yang ter-commit (`.env`, `SUPABASE_*`, dll.)

## Screenshot (opsional)

Untuk perubahan UI/editor, lampirkan screenshot:
- Sebelum:
- Sesudah:

## Catatan Tambahan

Hal-hal lain yang perlu diketahui reviewer (misal: dependensi baru, cara test
manual, trade-off):
