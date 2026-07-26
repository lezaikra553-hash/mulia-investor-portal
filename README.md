# Mulia Group Investor Center — Secure Prototype V2

Versi evaluasi portal investor yang siap diunggah ke GitHub dan Vercel.

## Perubahan keamanan utama

- Tidak ada username/password demo di dalam source.
- Tidak ada password bawaan pada form login.
- Penggunaan pertama meminta pembuatan akun Owner.
- Password diproses menjadi hash PBKDF2-SHA256 melalui Web Crypto.
- LocalStorage hanya menyimpan `passwordHash` dan `passwordSalt`, bukan password asli.
- Owner membuat akses investor dari Panel Owner.
- Saat mengedit investor, password dapat dibiarkan kosong agar password lama tidak berubah.

## Cara penggunaan pertama

1. Buka aplikasi.
2. Klik **Buat Akun Owner Pertama**.
3. Buat username dan password Owner minimal 8 karakter.
4. Login sebagai Owner.
5. Buka **Panel Owner**.
6. Edit investor contoh atau tambahkan investor baru, lalu buat username dan password akses.
7. Logout dan uji login investor.

## Deploy ke Vercel

1. Upload seluruh isi folder ini ke repository GitHub.
2. Di Vercel pilih **Add New Project**.
3. Hubungkan repository.
4. Framework preset: **Other**.
5. Klik **Deploy**.

## Batas versi ini

Ini masih prototype evaluasi. Hash password di browser lebih baik daripada password teks biasa, tetapi belum setara sistem login produksi karena:
- data masih terikat pada satu browser/perangkat,
- belum ada server/database terpusat,
- belum ada pemulihan password,
- belum ada pembatasan akses berbasis server,
- pengguna yang menguasai browser tetap dapat mengubah LocalStorage.

Sebelum dikirim ke investor sungguhan, lanjutkan ke backend seperti Supabase/Firebase atau server sendiri dengan autentikasi server-side.
