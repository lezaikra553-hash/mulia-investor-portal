# Mulia Group Investor Center — Final Architecture

Portal yang digunakan Owner/Admin dan investor melalui link yang sama:

`https://mulia-investor-portal.vercel.app/`

## Hak akses

### Owner
- Login dari URL yang sama.
- Membuat username dan password investor.
- Mengubah akun investor.
- Upload JSON hasil backup aplikasi Berkah, Dwi, atau Azkia.
- Memublikasikan atau menyembunyikan laporan per bulan.

### Investor
- Login dari URL yang sama.
- Hanya melihat data miliknya.
- Hanya melihat dua laporan:
  1. Rekap Bulanan Lengkap.
  2. Rekap Bagi Hasil Otomatis.
- Bisa Print atau Save as PDF.

## Password

Password **tidak ditulis di `index.html`, `app.js`, atau repository GitHub**.

- Password disimpan dan diverifikasi oleh **Supabase Auth**.
- Pembuatan akun investor dijalankan oleh Vercel Function di server.
- `SUPABASE_SERVICE_ROLE_KEY` hanya ditempatkan di Environment Variables Vercel.
- Jangan pernah menaruh Service Role Key di source code atau browser.

## Isi paket

- `index.html` — tampilan portal.
- `styles.css` — desain laporan premium.
- `app.js` — login, laporan, admin, importer.
- `api/config.js` — menyediakan URL dan anon key untuk browser.
- `api/admin/investor.js` — membuat/mengubah akun investor secara server-side.
- `supabase/schema.sql` — tabel dan Row Level Security.
- `.env.example` — daftar environment variable.
- `vercel.json` — konfigurasi Vercel.
- `package.json` — dependensi Vercel Function.

## Setup Supabase

1. Buat project Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase/schema.sql`.
4. Buka **Authentication > Users > Add user**.
5. Buat user Owner dengan email:
   `owner@mulia-investor.local`
6. Gunakan password Owner pilihan Anda.
7. Salin UUID Owner.
8. Jalankan query terakhir yang dicontohkan di `schema.sql` untuk memasukkan profil Owner.

## Environment Variables Vercel

Tambahkan di **Vercel > Project Settings > Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Nilainya diperoleh dari Supabase Project Settings/API.

Setelah menambahkan atau mengubah environment variable, lakukan redeploy.

## Deploy ke link yang sudah ada

1. Backup repository Vercel lama.
2. Ganti isi repository dengan isi paket ini.
3. Commit dan push ke GitHub.
4. Vercel akan melakukan deployment otomatis.
5. URL tetap:
   `https://mulia-investor-portal.vercel.app/`

## Cara Admin Membuat Username dan Password Investor

1. Buka link portal.
2. Login sebagai Owner:
   - Username: username yang dimasukkan pada tabel `profiles`.
   - Password: password user Owner di Supabase.
3. Klik **Admin**.
4. Klik **Tambah Investor**.
5. Isi nama, username, password minimal 8 karakter, perusahaan dan persentase.
6. Klik **Simpan**.
7. Kirim hanya URL, username dan password kepada investor.

## Cara sinkron dari aplikasi Berkah/Dwi/Azkia

1. Dari aplikasi admin perusahaan, lakukan backup/sinkronisasi dan download JSON.
2. Di Investor Center buka **Admin > Sinkron Data Admin**.
3. Pilih investor dan tahun.
4. Upload JSON.
5. Periksa preview.
6. Klik **Simpan ke Portal Investor**.

Importer mengenali key utama:
- Berkah: `BM_KAS_BESAR_IMPORT_EXCEL_V1`, `BM_KAS_BESAR_ACTIVE_DB`.
- Dwi: `DMA_KAS_BESAR_ACTIVE_DB`, `dwiMuliaKas_V8_ENTERPRISE`.
- Azkia: `AP_KAS_BESAR_ACTIVE_DB`, `AP_KAS_V8_ENTERPRISE`.

## Pesan WhatsApp untuk investor

Yth. Bapak/Ibu [Nama Investor],

Berikut akses Mulia Group Investor Center:

Link:
https://mulia-investor-portal.vercel.app/

Username:
[username]

Password:
[dikirim secara pribadi]

Portal menampilkan rekap bulanan dan laporan pembagian hasil investasi sesuai akun Bapak/Ibu.

Terima kasih atas kepercayaan yang diberikan kepada Mulia Group.

## Catatan

Versi ini menggunakan database dan autentikasi online. Berbeda dari prototype LocalStorage, akun yang dibuat Owner dapat digunakan investor dari HP atau komputer lain.
