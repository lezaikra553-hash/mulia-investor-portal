# Mulia Group Investor Portal

Prototype portal investor statis yang siap diunggah ke GitHub dan dideploy ke Vercel.

## Akun demo

- Investor: `sentot` / `123456`
- Owner: `owner` / `owner123`

## Fitur

- Login Owner dan Investor
- Dashboard modal, hak profit, pembayaran, saldo profit, dan ROI
- Riwayat transaksi
- Project yang diizinkan untuk investor
- Dokumen investor
- Panel Owner untuk menambah investor dan transaksi
- Backup/restore JSON
- Data demo tersimpan di browser menggunakan LocalStorage

## Deploy ke Vercel

1. Buat repository GitHub baru.
2. Upload seluruh isi folder ini.
3. Masuk ke Vercel dan pilih **Add New Project**.
4. Hubungkan repository.
5. Framework preset: **Other**.
6. Klik **Deploy**.

## Catatan keamanan

Versi ini adalah prototype untuk pengujian konsep dan alur. Password serta data masih berada di browser. Untuk penggunaan produksi multi-user, lanjutkan ke database terpusat dan autentikasi server-side, misalnya Supabase, Firebase, atau backend khusus.
