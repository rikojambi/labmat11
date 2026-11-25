# Google Apps Script — Backend LABMAT SMK XI

Backend sinkronisasi gratis berbasis **Google Sheets + Apps Script**. Berfungsi sebagai "database pusat" tempat hasil belajar siswa dikirim dan dibaca guru. **Tidak ada rahasia/admin kata sandi yang disimpan di aplikasi frontend.**

## Isi paket

| File | Fungsi |
|---|---|
| `Code.gs` | Seluruh backend: 16 sheet, API `doGet`/`doPost`/`doOptions`, setup, migrasi, token, diagnosa. Tempel sebagai satu file di editor Apps Script. |
| `appsscript.json` | Manifest: timezone `Asia/Jakarta`, V8, scope Spreadsheet + external request, web app `ANYONE_ANONYMOUS`. |
| `PANDUAN-DEPLOY.md` | Langkah deploy lengkap dari nol sampai aplikasi bisa sinkron. |

## 1. Membuat spreadsheet

1. Buka https://sheets.google.com → buat spreadsheet baru bernama **LABMAT SMK XI**.
2. Buka **Extensions → Apps Script**.
3. Timpa isi `Code.gs` bawaan dengan seluruh isi file `google-apps-script/Code.gs` dari repositori ini.
4. (Opsional) Aktifkan `Project Settings → Show appsscript.json` dan timpa manifest dengan `appsscript.json`.
5. Simpan.

## 2. Inisialisasi sheet, token, dan konfigurasi awal

1. Di editor Apps Script, pilih fungsi **`setup`** pada dropdown toolbar.
2. Klik **Run**. Berikan izin OAuth saat diminta (akun Google guru sendiri).
3. `setup()` akan:
   - membuat/migrasi **16 sheet** beserta header kolomnya (termasional kolom baru v2 seperti `warning_id`);
   - membuat **token sinkronisasi** jika belum ada (token lama tidak ditimpa);
   - mengisi 6 baris **konfigurasi awal** jika belum ada (bobot, waktu, ambang anomali, alur 12 tahap, realtime, buku tulis).
4. Buka sheet `KONFIGURASI`, baris `kunci = token`. **Salin nilai kolom `nilai`** — inilah kode sinkronisasi.

> Aman menjalankan `setup()` berulang kali: ia tidak menghapus data dan tidak menimpa token atau pengaturan guru yang sudah ada.

### Sheet yang dibuat

**Versi 1 (dipertahankan):** `SISWA`, `SESI_BELAJAR`, `HASIL_MODUL`, `JAWABAN_SOAL`, `PROSES_PENGERJAAN`, `REFLEKSI`, `VERIFIKASI`, `UMPAN_BALIK_GURU`, `KONFIGURASI`.

**Revisi v2 (ditambahkan):** `WAKTU_SOAL`, `ANOMALI`, `PERINGATAN`, `TINDAKAN_GURU`, `URAIAN_TERPANDU`, `LATIHAN_BUKU`, `UMPAN_BALIK_SISWA`.

## 3. Deploy Web App

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. Isi:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Klik **Deploy**, lalu izinkan akses.
5. Salin **Web app URL** (berakhir dengan `/exec`).

> Akses "Anyone" diperlukan agar browser siswa bisa memanggil API tanpa login Google. Keamanan dijaga oleh token yang diverifikasi di dalam `doGet`/`doPost`. Jangan bagikan token kepada siswa.

Setiap kali `Code.gs` diubah, buat **New deployment** (bukan sekadar klik Update pada deployment lama) lalu perbarui URL di aplikasi jika URL berubah.

## 4. Mengisi URL & token di aplikasi

- **Siswa:** menu **Pengaturan → Koneksi Google Sheets**.
- **Guru:** dashboard → **Koneksi & Aturan** (atau modal saat pertama membuka `teacher.html`).

Keduanya menyimpan URL/token hanya di IndexedDB perangkat masing-masing.

## 5. Fungsi admin tambahan (jalankan dari editor)

| Fungsi | Kegunaan |
|---|---|
| `setup()` | Inisialisasi + migrasi kolom + token + konfigurasi awal. |
| `rotateToken()` | Ganti kode sinkronisasi (misalnya jika token perlu dicabut). Token lama langsung tidak berlaku. |
| `seedDefaults()` | Tambah konfigurasi awal yang belum ada tanpa menimpa pengaturan guru. |
| `healthCheck()` | Laporan jumlah baris/kolom semua sheet + status token; mendeteksi kolom yang kurang. |
| `testPushPull()` | Uji tulis-baca memakai operasi `SISWA`, lalu baris uji dihapus otomatis. |

Semua fungsi mencatat hasil ke **Log** (`View → Logs`) dan sebagian menampilkan dialog di editor.

## 6. Cara kerja sinkronisasi

- **Push (`doPost`)**: aplikasi mengirim antrean operasi beserta `idempotency_key`. Skrip memeriksa kunci tersebut; jika sudah ada, operasi dilewati (`skipped`). Pengiriman ulang aman dan tidak membuat duplikat.
- **Pull (`doGet`)**:
  - `action=pull&full=0` → konfigurasi ringan, umpan balik, keputusan persetujuan identitas, dan pesan untuk siswa.
  - `action=pull&full=1` → seluruh sheet (dipakai guru).
  - `PERINGATAN` dipisahkan menjadi `peringatan` (alert guru) dan `peringatan_siswa` (pesan untuk siswa).
  - Mendukung JSONP lewat parameter `callback` sebagai cadangan jika CORS bermasalah.
- **Penanganan gagal**: data lokal **tidak pernah dihapus** sebelum server membalas `ok: true`. Item gagal diberi status `failed` dan dijadwalkan ulang dengan backoff eksponensial (maksimal 15 menit).
- **CORS**: header ditambahkan pada semua balasan; `doOptions` menangani preflight.

## 7. Pengujian tanpa Google

`tests/mock-gas-server.mjs` menyediakan tiruan endpoint dengan protokol yang sama:

```bat
node tests\mock-gas-server.mjs 8766
```

Token uji: `_TOKEN_UJI_12345`, URL: `http://localhost:8766/`.

Jalankan `npm test` untuk memvalidasi bank soal, data, revisi v2, dan sintaks 32 file JavaScript.

## 8. Catatan keamanan

- Token bukan pengganti autentikasi pengguna; ini hanya kode akses aplikasi. Simpan di sheet dan gunakan HTTPS (Apps Script otomatis HTTPS).
- Batasi akses spreadsheet hanya kepada akun guru.
- Perubahan identitas siswa **tidak langsung berlaku** — masuk antrean, menunggu persetujuan guru di dashboard, lalu tersebar saat siswa sinkronisasi.
- Tidak ada kamera, perekaman layar, atau penekan tombol yang direkam. Telemetri hanya: durasi, jumlah perubahan jawaban, urutan soal, petunjuk dibuka, dan jumlah percobaan.
- `token` sengaja tidak dikirim dalam hasil `pull` — `configFrom()` hanya membaca kunci konfigurasi yang dikenal.
