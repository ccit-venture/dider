# Kebijakan Keamanan — Dider

## Laporkan Kerentanan

Jika kamu menemukan kerentanan keamanan pada Dider, **jangan** membuka issue
publik. Kirim laporan langsung ke maintainer agar bisa diperbaiki sebelum
diungkap.

**Kontak keamanan:** **Hudya** (Industrial Lecturer CCIT-FTUI) —
**mhudyaramadhana@gmail.com**

Sertakan dalam laporan:

- Deskripsi kerentanan dan potensi dampaknya
- Langkah reproduksi (sebaiknya minimal, tanpa data sensitif)
- Versi/branch yang terpengaruh
- (Opsional) usulan perbaikan

## Proses Penanganan

1. Maintainer menerima laporan dan mengonfirmasi dalam **48 jam**.
2. Kerentanan divalidasi dan kerentanan serupa diperiksa.
3. Perbaikan dikembangkan secara privat bila diperlukan.
4. Setelah diperbaiki, maintainer mengumumkan rilis/perbaikan dan mengkredit
   pelapor (jika diinginkan).

## Area yang Perlu Diperhatikan

- **Auth & sesi** — saat ini `requireAuth` memakai session cookie `sid`; saat
  auth lengkap dibangun, pastikan password di-hash argon2 (`Bun.password`),
  cookie `httpOnly`, dan session dihapus saat logout.
- **JSON proyek** — kolom `ukuran`/`halaman` di-parse dari body; validasi ukuran
  payload agar tidak ada payload raksasa membanjiri DB.
- **CSRF / CORS** — batasi `origin` sesuai domain aplikasi.
- **Supabase** — jangan commit `SUPABASE_URL` / `SUPABASE_ANON_KEY`; jangan
  aktifkan public RLS tanpa kebijakan yang jelas.

## Rujukan

- [CONTRIBUTING.md](CONTRIBUTING.md) — panduan kontribusi & keamanan
- [README.md](README.md) — quickstart & struktur proyek
