# Mulia Investor Portal Simple V1

Versi ini sengaja dibuat lebih sederhana.

## Yang dihapus

- Tidak ada folder `/api`
- Tidak ada Vercel Serverless Function
- Tidak ada `package.json`
- Tidak ada environment variable Vercel
- Tidak memakai Supabase Auth

GitHub/Vercel hanya menyajikan file HTML, CSS, dan JavaScript biasa.

## Yang masih digunakan

- Supabase Database
- Fungsi SQL aman (`security definer`)
- Password di-hash dengan `pgcrypto`
- Session token disimpan di database
- Owner dan investor tetap dapat login dari perangkat berbeda

## Langkah pemasangan

### 1. Buat project Supabase

Buka Supabase dan buat project baru.

### 2. Ubah kode setup di SQL

Buka:

`supabase/schema.sql`

Cari:

`GANTI-KODE-SETUP-INI`

Ganti dengan kode pilihan Anda, misalnya:

`Mulia-Setup-2026`

Jangan memakai tanda petik tambahan.

### 3. Jalankan SQL

Salin seluruh isi `supabase/schema.sql` ke Supabase SQL Editor lalu klik **Run**.

### 4. Isi config.js

Buka:

`config.js`

Isi:

```js
export const SUPABASE_URL = 'https://xxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';
```

Keduanya ada di:

**Supabase > Project Settings > API**

Anon key aman diletakkan di browser karena akses tabel langsung sudah ditutup. Aplikasi hanya menggunakan fungsi SQL yang telah dibatasi.

### 5. Upload ke GitHub

Hapus isi repository lama lalu upload hanya:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `vercel.json`

Folder `supabase` dan `README.md` boleh ikut di-upload, tetapi tidak wajib.

### 6. Buka portal

Buka link Vercel Anda.

Klik:

**Buat Akun Owner Pertama**

Masukkan kode setup yang sama dengan kode pada file SQL.

## Catatan

Versi ini tidak akan memanggil `/api/config`, sehingga error:

`Respons server tidak valid (404)`

tidak akan muncul lagi.
