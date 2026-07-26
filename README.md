# Mulia Group Investor Portal — Production V1

Portal produksi menggunakan:
- GitHub + Vercel
- Supabase Database
- Supabase Authentication
- Row Level Security
- Vercel Serverless Functions

Link Owner dan investor tetap sama:
`https://mulia-investor-portal.vercel.app/`

## 1. Buat Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase/schema.sql`.
4. Buka **Project Settings > API**.
5. Simpan:
   - Project URL
   - anon/public key
   - service_role key

## 2. Environment Variables Vercel

Buka Vercel:
**Project > Settings > Environment Variables**

Tambahkan:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_SETUP_CODE`

Contoh `OWNER_SETUP_CODE`:
`Mulia-Setup-2026-Aman`

Kode tersebut hanya digunakan sekali saat membuat Owner pertama dan tidak ditulis di aplikasi.

Setelah menambahkan environment variable, lakukan **Redeploy**.

## 3. Deploy

1. Hapus isi repository lama.
2. Upload seluruh isi paket ini ke repository yang sama.
3. Commit dan push.
4. Vercel otomatis deploy.
5. URL tetap:
   `https://mulia-investor-portal.vercel.app/`

## 4. Membuat Owner Pertama

1. Buka portal.
2. Tombol **Buat Akun Owner Pertama** akan muncul jika belum ada Owner.
3. Isi nama, username, password dan Kode Setup.
4. Kode Setup harus sama dengan `OWNER_SETUP_CODE` di Vercel.
5. Setelah berhasil, login menggunakan username dan password Owner tersebut.

## 5. Membuat Investor

1. Login sebagai Owner.
2. Klik **Admin**.
3. Klik **Tambah Investor**.
4. Isi nama, username, password, perusahaan dan persentase.
5. Total Investor + Owner + Tabungan Bersama harus 100%.
6. Klik **Simpan**.
7. Investor dapat login dari perangkat mana pun menggunakan URL yang sama.

## 6. Sinkron Data

1. Download JSON backup dari aplikasi Berkah, Dwi, atau Azkia.
2. Buka **Admin > Sinkron Data**.
3. Pilih investor dan tahun.
4. Upload JSON.
5. Periksa preview.
6. Klik **Simpan ke Portal Investor**.

## 7. Yang Dibagikan ke Investor

Kirim:
- Link: `https://mulia-investor-portal.vercel.app/`
- Username investor
- Password investor

Investor hanya melihat:
- Rekap Bulanan Lengkap
- Rekap Bagi Hasil Otomatis
- Print / Save PDF

## Keamanan

- Password tidak ada di source code.
- Password dikelola Supabase Auth.
- Service Role Key hanya ada di server Vercel.
- Investor dibatasi oleh Row Level Security.
- Investor tidak dapat membaca laporan investor lain.
