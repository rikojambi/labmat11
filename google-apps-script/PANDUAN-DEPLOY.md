# Panduan Deploy Backend Google Sheets — LABMAT SMK XI

Panduan ini untuk guru/admin yang menyiapkan backend sinkronisasi dari nol. Total waktu ±10 menit. Tidak perlu install apa pun di komputer.

---

## Langkah 1 — Buat Spreadsheet

1. Buka <https://sheets.google.com> dengan akun Google sekolah/guru.
2. Klik **+** untuk membuat spreadsheet baru, beri nama **LABMAT SMK XI**.
3. Biarkan sheet bawaan (`Sheet1`) apa adanya — nanti akan ditambah 16 sheet oleh skrip.

## Langkah 2 — Pasang skrip

1. Di spreadsheet, buka menu **Extensions → Apps Script**.
2. Akan ada file `Code.gs` bawaan berisi `function myFunction() {}`.
3. Hapus seluruh isinya, lalu salin-tempel seluruh isi file:

   ```text
   LABMAT-SMK-XI/google-apps-script/Code.gs
   ```

4. Klik ikon **Save** (💾) atau tekan `Ctrl+S`.
5. Jika dimintamanifest: buka **Project Settings** (⚙️), centang **Show appsscript.json**, lalu timpa isinya dengan file `appsscript.json` dari repositori. Jika tidak diminta, langkah ini boleh dilewati — nilai default sudah sesuai.

## Langkah 3 — Jalankan setup

1. Di toolbar editor Apps Script, pada dropdown fungsi, pilih **`setup`**.
   - Jika `setup` tidak muncul, tunggu beberapa detik sampai editor selesai mem-parsing file, atau klik **Reload**.
2. Klik **Run**.
3. Saat pertama kali, Google akan meminta izin:
   - Pilih akun guru.
   - Klik **Advanced** → **Go to LABMAT SMK XI (unsafe)** → **Allow**.
   - Ini normal karena skrip dibuat sendiri, bukan dari verified publisher.
4. Tunggu hingga selesai. Akan muncul dialog:

   ```text
   Setup selesai: 16 sheet siap, 6 konfigurasi awal ditambahkan.
   Token baru dibuat (lihat Log & sheet KONFIGURASI).
   ```

5. Kembali ke spreadsheet, buka sheet **KONFIGURASI**. Akan terlihat baris:

   | kunci | nilai |
   |---|---|
   | `token` | `xxxxxxxx-xxxx-...-xxxx` |
   | `PENILAIAN` | `{"weights":...}` |
   | `WAKTU_SOAL` | `{"timing":...}` |
   | `AMBANG_ANOMALI` | `{"anomaly":...}` |
   | `ALUR_BELAJAR` | `{"flow":...}` |
   | `REALTIME` | `{"realtime":...}` |
   | `BUKU_TULIS` | `{"notebook":...}` |

6. **Salin nilai pada baris `token` kolom `nilai`.** Simpan sementara di notepad. Ini kode sinkronisasi.

> `setup()` aman dijalankan ulang. Ia tidak menimpa token lama, tidak menghapus data, dan hanya menambah konfigurasi yang belum ada. Jika struktur sheet lama belum memiliki kolom v2 (misalnya `warning_id`), skrip akan menambah/menyusun ulang kolom tanpa menghilangkan data.

## Langkah 4 — Deploy Web App

1. Klik tombol **Deploy** (kanan atas) → **New deployment**.
2. Klik ikon ⚙️ di samping "Select type" → pilih **Web app**.
3. Isi kolom:

   | Kolom | Nilai |
   |---|---|
   | Description | `LABMAT API v2` (bebas) |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

4. Klik **Deploy**.
5. Izinkan akses lagi jika diminta.
6. Salin **Web app URL** yang muncul, bentuknya:

   ```text
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> **Penting:** "Who has access = Anyone" wajib agar browser siswa dapat memanggil API tanpa login Google. Keamanan tidak bergantung pada visibility URL, melainkan pada token yang diverifikasi di dalam `doGet`/`doPost`.

## Langkah 5 — Isi URL & token di aplikasi

### Di komputer guru

1. Jalankan aplikasi: klik `start.bat` di folder `LABMAT-SMK-XI`.
2. Buka `http://localhost:8765/teacher.html`.
3. **Pemakaian pertama:** buat PIN guru (4–8 digit angka), ulangi, lalu klik **Simpan PIN & masuk**. PIN ini mengunci dashboard di komputer tersebut; disimpan sebagai hash di IndexedDB, bukan di Google Sheets. Saat tab ditutup atau tombol **🔒 Kunci** ditekan, dashboard terkunci lagi. Jika lupa PIN, klik **Lupa PIN?** dan masukkan kode sinkronisasi dari Langkah 3.
4. Isi modal **Hubungkan dashboard guru** (atau buka menu **Koneksi & Aturan**).
5. Isi **URL Web App** dengan URL dari Langkah 4.
6. Isi **Kode sinkronisasi** dengan token dari Langkah 3.
7. Klik **Simpan & muat data**.

### Di komputer/HP siswa

1. Buka `http://localhost:8765/student.html` (atau alamat LAN komputer server jika mengakses dari perangkat lain).
2. Buka menu **Pengaturan → Koneksi Google Sheets**.
3. Isi URL dan token yang sama.
4. Klik **Simpan**.

> URL dan token hanya disimpan di IndexedDB perangkat masing-masing. Jangan menaruh token di file frontend, screenshots, atau dokumen yang dibagikan ke siswa.

## Langkah 6 — Uji koneksi

### Dari editor Apps Script

Jalankan fungsi berikut satu per satu dan periksa **View → Logs**:

| Fungsi | Yang diharapkan |
|---|---|
| `healthCheck()` | `Token: ada (xxxxxxxx…)` dan semua sheet menunjukkan jumlah kolom sesuai header, tanpa tulisan `KURANG`. |
| `testPushPull()` | `Uji tulis-baca: created, baris terbaca 1, data uji dibersihkan.` |

### Dari browser

1. Di dashboard guru, klik **Sinkronkan antrean**.
2. Toast harus menunjukkan `... data diterima` tanpa error.
3. Di aplikasi siswa, buka **Pengaturan → Sinkronisasi**, klik **Sinkronkan sekarang**.
4. Buka sheet `SISWA` — harus muncul baris identitas siswa uji.

### Uji manual lewat browser (opsional)

Buka URL berikut di tab baru (ganti `TOKEN` dan `URL` dengan nilai Anda):

```text
https://script.google.com/macros/s/.../exec?token=TOKEN&action=pull&full=1
```

Balasan harus berupa JSON dengan `"ok": true` dan berisi keys `siswa`, `sesi`, `jawaban`, `peringatan`, `peringatan_siswa`, `config`, `approvals`, dll.

## Langkah 7 — Perubahan skrip setelah deploy

Setiap kali file `Code.gs` diubah:

1. Simpan di editor Apps Script.
2. **Deploy → New deployment** (jangan pakai deployment lama).
3. Salin URL baru jika berbeda, lalu perbarui URL di Pengaturan aplikasi (guru & siswa).
4. Jalankan `setup()` lagi hanya jika ada sheet/kolom baru — aman karena idempoten.

## Pemecahan masalah

| Gejala | Penanganan |
|---|---|
| `Token tidak valid` | Salin ulang nilai `kunci=token` dari sheet `KONFIGURASI`. Perhatikan spasi di akhir. |
| `Aksi tidak dikenali` | URL harus diakhiri `/exec` dan permintaan memakai `?action=pull` atau POST `action=push`. |
| `Field wajib kosong: key` | Pastikan operasi `SET_CONFIG` mengirim `payload.key` (bukan hanya `payload.id`). |
| Kolom baru tidak muncul di sheet lama | Jalankan `setup()` lagi — `ensureSheet()` akan menyusun ulang kolom berdasarkan nama header tanpa menghapus data. |
| CORS error di browser | Skrip sudah mengirim header CORS + JSONP via `?callback=...`. Pastikan deploy Web App bukan berasal dari `dev` URL. |
| Ingin mencabut token lama | Jalankan `rotateToken()`, lalu perbarui token di semua perangkat. Token lama langsung ditolak. |

## Ringkasan keamanan

- Token = kode akses aplikasi, **bukan** kata sandi siswa. Jangan dibagikan ke siswa.
- Spreadsheet sebaiknya hanya bisa diakses akun guru.
- Apps Script otomatis HTTPS.
- Perubahan identitas siswa menunggu persetujuan guru lewat sheet `KONFIGURASI` (`PERMINTAAN_UBAH_IDENTITAS:...`).
- Tidak ada kamera, screenshot diam-diam, keylogger, atau pemantauan di luar aplikasi. Telemetri hanya durasi, perubahan jawaban, urutan soal, petunjuk dibuka, dan jumlah percobaan.
