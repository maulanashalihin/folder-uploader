# s3-uploader Go — Release (Ubuntu)

Paket ini berisi binary uploader untuk Ubuntu. Pilih binary sesuai arsitektur mesin Anda dan sediakan file `.env` pada folder yang sama.

## Isi Paket
- `s3-uploader-go-linux-amd64` — untuk Ubuntu x86_64
- `s3-uploader-go-linux-arm64` — untuk Ubuntu ARM64
- `env.example` — contoh konfigurasi environment

## Persiapan
1. Tentukan arsitektur mesin:
   ```bash
   uname -m
   # x86_64 → gunakan binary amd64
   # aarch64 → gunakan binary arm64
   ```
2. Salin `env.example` menjadi `.env` lalu isi nilai yang sesuai.
3. Pastikan file binary dapat dieksekusi:
   ```bash
   chmod +x s3-uploader-go-linux-amd64
   chmod +x s3-uploader-go-linux-arm64
   ```

## Menjalankan
Jalankan dari dalam folder `release` agar `.env` otomatis terbaca:
```bash
./s3-uploader-go-linux-amd64
# atau
./s3-uploader-go-linux-arm64
```

Variabel yang dibutuhkan:
- `UPLOAD_DIR` — path folder lokal yang akan diupload.
- `WASABI_ACCESS_KEY`, `WASABI_SECRET_KEY` — kredensial Wasabi.
- `WASABI_BUCKET` — nama bucket.
- `WASABI_REGION` — region (contoh: `ap-southeast-1`).
- `WASABI_ENDPOINT` — endpoint Wasabi (contoh: `https://s3.ap-southeast-1.wasabisys.com`).
- Opsional `CONCURRENCY` — jumlah worker paralel (default `5`).

## Catatan
- Program otomatis trim spasi pada variabel environment.
- Objek yang sudah ada akan ditimpa (overwrite). Jika ingin skip, modifikasi kode dengan pengecekan `HeadObject`.
- Pastikan izin jaringan keluar (egress) ke endpoint Wasabi tersedia.

## Catatan CentOS

- Biner Linux (amd64/arm64) kompatibel dengan CentOS 7/8/Stream.
- Gunakan arsip: `s3-uploader-go-centos-amd64.tar.gz` atau `s3-uploader-go-centos-arm64.tar.gz`.
- Instalasi sama dengan Ubuntu: ekstrak, `cd release`, lalu `sudo bash install.sh`.
- Service menggunakan systemd, tersedia di CentOS 7/8/Stream.
- Cek log: `journalctl -u s3-uploader -f`. Hapus service lewat langkah uninstall di atas.

## Instalasi sebagai service (Ubuntu)

- Ekstrak arsip sesuai arsitektur dan masuk ke folder `release`.
- Jalankan installer sebagai root:
  - `sudo bash install.sh` (opsional tambahkan path install, default `/opt/s3-uploader`)
- Edit env di: `/opt/s3-uploader/.env`.
- Cek status dan log:
  - `systemctl status s3-uploader`
  - `journalctl -u s3-uploader -f`

Untuk uninstall:
- `sudo systemctl disable --now s3-uploader`
- `sudo rm /etc/systemd/system/s3-uploader.service`
- `sudo rm -rf /opt/s3-uploader`
- `sudo systemctl daemon-reload`