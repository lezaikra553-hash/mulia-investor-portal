# Mulia Investor Portal Standalone Final

Versi pengganti total yang paling sederhana.

## Login Owner awal

- Username: `owner`
- Password: `Mulia2026!`

## Cara deploy

1. Hapus semua file lama di repository GitHub.
2. Upload hanya `index.html`.
3. Commit.
4. Tunggu Vercel selesai deploy.
5. Buka kembali link portal.
6. Login memakai akun Owner awal.

## Fitur

- Login Owner
- Login Investor
- Tambah dan edit investor
- Input laporan bulanan manual
- Perhitungan bagi hasil otomatis
- Print / Save PDF
- Backup JSON
- Import backup
- Ganti password Owner
- Reset seluruh data

## Catatan penting

Versi ini tidak memakai database online. Data tersimpan di browser masing-masing.

Agar data dapat dipindahkan ke perangkat lain:
1. Download Backup dari browser Owner.
2. Buka portal pada perangkat lain.
3. Login Owner awal.
4. Import Backup.

Versi ini sengaja dipilih agar tidak ada lagi masalah Supabase, API, environment variable, atau error 404.
