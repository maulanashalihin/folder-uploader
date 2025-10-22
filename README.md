# s3-uploader

Uploader sederhana untuk meng-scan folder lokal secara rekursif dan mengunggah semua file ke Wasabi S3. Mendukung upload paralel (concurrency) dan logging progres.

## Fitur
- Scan folder `UPLOAD_DIR` secara rekursif.
- Upload semua file ke bucket Wasabi S3.
- Concurrency dapat diatur via env `CONCURRENCY` (default 5).
- Penentuan `Content-Type` berdasarkan ekstensi file umum.
- Progress log dan ringkasan hasil (jumlah berhasil/gagal, durasi).

## Prasyarat
- Node.js 18+ disarankan.
- Paket manager: `pnpm` (atau bisa pakai `npm`/`yarn`).
- Akun Wasabi S3 dan kredensial yang valid.

## Instalasi
1. Install dependency:
   ```bash
   pnpm install
   ```
2. Salin variabel lingkungan:
   ```bash
   cp env.example .env
   ```
3. Edit `.env` dan isi nilai yang sesuai (lihat bagian Environment Variables).

## Environment Variables
Wajib:
- `UPLOAD_DIR` — path folder lokal yang akan diupload (contoh: `/Users/username/Documents/files`).
- `WASABI_ACCESS_KEY` — akses key Wasabi.
- `WASABI_SECRET_KEY` — secret key Wasabi.
- `WASABI_BUCKET` — nama bucket Wasabi.
- `WASABI_REGION` — region Wasabi (contoh: `ap-southeast-1`).
- `WASABI_ENDPOINT` — endpoint Wasabi (contoh: `https://s3.ap-southeast-1.wasabisys.com`).

Opsional:
- `CONCURRENCY` — jumlah worker paralel untuk upload (default: `5`).
- `CDN_URL` — jika diisi, URL publik file akan menggunakan CDN ini.

Contoh `env.example` sudah disediakan. Jangan commit `.env` Anda ke repository.

## Cara Menjalankan
Build TypeScript dan jalankan script:
```bash
pnpm build
node dist/index.js
```

Saat berjalan, uploader akan:
- Validasi `UPLOAD_DIR` adalah folder.
- Mengumpulkan semua file secara rekursif.
- Melakukan upload paralel ke Wasabi S3.
- Menampilkan progres seperti `[x/total] Uploaded: <key>` dan ringkasan akhir.

## Mapping Key dan Content-Type
- Key S3 ditentukan dari path relatif terhadap `UPLOAD_DIR` lalu dinormalisasi ke forward slash (`/`). Contoh: `UPLOAD_DIR=a/b`, file `a/b/c/d.png` menjadi key `c/d.png`.
- `Content-Type` ditentukan dari ekstensi umum: `jpg/jpeg`, `png`, `gif`, `webp`, `svg`, `mp4`, `mov`, `pdf`, `txt`, `html`, `css`, `js/mjs`, `json`. Jika tidak dikenali, digunakan `application/octet-stream`.

## Perilaku Overwrite
Script saat ini akan menimpa (overwrite) objek S3 jika key yang sama sudah ada. Jika Anda ingin skip file yang sudah ada, Anda bisa memodifikasi `index.ts` untuk mengecek `exists(key)` sebelum upload.

## Troubleshooting
- "UPLOAD_DIR tidak diset di .env": pastikan variabel telah diisi.
- "UPLOAD_DIR bukan sebuah folder": perbaiki path ke folder.
- Error kredensial/akses: cek `WASABI_ACCESS_KEY`, `WASABI_SECRET_KEY`, `WASABI_BUCKET`, `WASABI_REGION`, `WASABI_ENDPOINT`.
- Timeout/Network error: coba kurangi `CONCURRENCY` atau pastikan koneksi stabil.

## Struktur Proyek
```
├── .env                  # variabel lingkungan lokal (jangan commit)
├── env.example           # contoh konfigurasi lingkungan
├── index.ts              # script utama (scan + upload)
├── services/S3.ts        # inisialisasi S3 client dan helper upload
├── package.json
├── tsconfig.json
└── dist/                 # hasil build (index.js, services/S3.js)
```

## Catatan Keamanan
- `.env` berisi kredensial; jangan commit ke git (sudah diabaikan via `.gitignore`).
- Audit dan putuskan akses yang tepat untuk `WASABI_ACCESS_KEY`/`SECRET_KEY`.