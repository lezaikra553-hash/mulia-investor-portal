# Mulia Group Investor Center Static V1

File ini dibuat sebagai versi langsung pakai tanpa Supabase dan tanpa API.

## Cara deploy

1. Upload `index.html` ke repository GitHub yang terhubung dengan:
   `https://mulia-investor-portal.vercel.app/`
2. Vercel akan melakukan deploy otomatis.
3. Saat pertama dibuka, klik **Buat Akun Owner Pertama**.
4. Buat username dan password Owner.
5. Login sebagai Owner, buka **Admin**, lalu tambah investor.
6. Untuk mengisi laporan, buka **Admin > Sinkron JSON** dan upload JSON backup dari Berkah, Dwi, atau Azkia.

## Keamanan

Password tidak ditulis di source dan tidak disimpan sebagai teks biasa. Browser menyimpan hash PBKDF2-SHA256.

## Batas penting versi static

Data dan akun tersimpan di LocalStorage browser. Artinya:
- Akun yang dibuat di laptop Owner tidak otomatis muncul di HP investor.
- Agar investor pada perangkat lain bisa login menggunakan link yang sama, dibutuhkan database online seperti Supabase/Firebase.
- Versi ini cocok untuk pengecekan tampilan, alur, print PDF, dan sinkron JSON lokal.

## File

Cukup satu file:
- `index.html`
