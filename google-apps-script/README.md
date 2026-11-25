# Google Apps Script — LABMAT SMK XI

Backend sinkronisasi gratis berbasis Google Sheets + Apps Script. Berfungsi sebagai "database pusat" tempat hasil belajar siswa dikirim dan dibaca guru. **Tidak ada rahasia/admin kata sandi yang disimpan di aplikasi frontend.**

## 1. Membuat spreadsheet

1. Buka https://sheets.google.com → buat spreadsheet baru bernama **LABMAT SMK XI**.
2. Buka **Extensions → Apps Script**.
3. Salin seluruh isi `Code.gs` ke editor (ganti `Code.gs` bawaan).
4. Salin isi `appsscript.json` ke `Project Settings → Show appsscript.json` (jika diperlukan).
5. Simpan.

## 2. Inisialisasi sheet & token

1. Di editor Apps Script, pilih fungsi `setup` pada dropdown toolbar.
2. Klik **Run**. Berikan izin OAuth saat diminta (akun Google Anda sendiri).
3. `setup()` akan membuat 9 sheet berikut beserta header kolomnya:

| Sheet | Isi |
|---|---|
| `SISWA` | Identitas siswa (ID unik, NIS/NISN, kelas, program, sekolah) |
| `SESI_BELAJAR` | Sesi asesmen, seed, waktu, status, skor |
| `HASIL_MODUL` | Nilai per modul per sesi |
| `JAWABAN_SOAL` | Jawaban, skor, rincian, jurnal, telemetri, parameter soal |
| `PROSES_PENGERJAAN` | Jurnal proses 5 tahap + telemetri |
| `REFLEKSI` | Refleksi siswa & hasil verifikasi |
| `VERIFIKASI` | Jawaban verifikasi pemahaman |
| `UMPAN_BALIK_GURU` | Komentar guru |
| `KONFIGURASI` | Token, bobot penilaian, permintaan/keputusan ubah identitas |

4. Buka sheet `KONFIGURASI`, baris dengan `kunci = token`. **Salin nilai kolom `nilai`** — inilah kode sinkronisasi.

> Jika `setup()` dijalankan ulang, token lama tidak ditimpa. Untuk mengganti token, hapus baris `token` lalu jalankan `setup()` lagi.

## 3. Deploy Web App

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. Isi:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Klik **Deploy**, lalu izinkan akses.
5. Salin **Web app URL** (berakhir dengan `/exec`).

> Akses "Anyone" diperlukan agar browser siswa bisa memanggil API tanpa login Google. Keamanan dijaga oleh token yang diverifikasi di dalam `doGet`/`doPost`. Jangan bagikan token kepada siswa.

## 4. Mengisi URL & token di aplikasi

- **Siswa:** menu **Pengaturan → Koneksi Google Sheets**.
- **Guru:** dashboard → menu **Koneksi & Bobot** (atau modal saat pertama membuka `teacher.html`).

Keduanya menyimpan URL/token hanya di IndexedDB perangkat masing-masing.

## 5. Cara kerja sinkronisasi

- **Push (`doPost`)**: aplikasi mengirim antrean operasi beserta `idempotency_key`. Skrip memeriksa kunci tersebut; jika sudah ada, operasi dilewati (`skipped`). Jadi pengiriman ulang aman dan tidak membuat duplikat.
- **Pull (`doGet`)**: 
  - `action=pull&full=0` → konfigurasi ringan, umpan balik, dan keputusan persetujuan identitas (dipakai siswa).
  - `action=pull&full=1` → seluruh sheet (dipakai guru).
  - Mendukung JSONP lewat parameter `callback` sebagai cadangan jika CORS bermasalah.
- **Penanganan gagal**: data lokal **tidak pernah dihapus** sebelum server membalas `ok: true`. Item gagal diberi status `failed` dan dijadwalkan ulang dengan backoff eksponensial (maksimal 15 menit).
- **CORS**: header ditambahkan pada semua balasan; `doOptions` menangani preflight.

## 6. Pengujian tanpa Google

`tests/mock-gas-server.mjs` menyediakan tiruan endpoint dengan protokol yang sama:

```bat
node tests\mock-gas-server.mjs 8766
```

Token uji: `_TOKEN_UJI_12345`, URL: `http://localhost:8766/`.

## 7. Catatan keamanan

- Token bukan pengganti autentikasi pengguna; ini hanya kode akses aplikasi. Simpan di sheet dan gunakan HTTPS (Apps Script otomatis HTTPS).
- Batasi akses spreadsheet hanya kepada akun guru.
- Perubahan identitas siswa **tidak langsung berlaku** — masuk antrean, menunggu persetujuan guru di dashboard, lalu tersebar saat siswa sinkronisasi.
- Tidak ada kamera, perekaman layar, atau penekan tombol yang direkam. Telemetri hanya: durasi, jumlah perubahan jawaban, urutan soal, petunjuk dibuka, dan jumlah percobaan.
