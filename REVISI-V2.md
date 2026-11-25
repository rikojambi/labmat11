# LABMAT SMK XI — Integrasi Revisi Spesifikasi Versi 2

Semua fitur versi 1 dipertahankan. Penambahan berikut diintegrasikan tanpa mengubah kontrak data lama.

## Fase A — Fondasi data & waktu
- [x] `js/database.js`: DB version 3 + store baru (`timing`, `alerts`, `anomalies`, `teacherActions`, `warnings`, `essayResponses`, `notebook`, `monitor`), migrasi aman dari v1.
- [x] `js/timing.js`: jam monotonik (`performance.now`), timer per soal (30/60/120/180/240/300 dtk), timer total, auto-lock, idle detection tanpa keylogger, persist & resume setelah reload.
- [x] `js/flow.js`: 12 tahapan alur belajar, wajib/opsional diatur guru, gate sebelum asesmen.

## Fase B — Deteksi & umpan balik
- [x] `js/anomaly.js`: 9 indikator (A1–A3, B1–B3, C1–C3), skor terbobot, ambang per jenis/soal (bukan universal), kategori NORMAL / PERLU DIPERHATIKAN / ANOMALI TINGGI. Tanpa vonis otomatis.
- [x] `js/feedback.js`: aturan + rubrik (konsep, perhitungan, penalaran, manajemen), hanya pernyataan bersumber data.
- [x] `data/essays.js`: 6 soal uraian terpandu (2/modul), 8 langkah, campuran teks panduan & isian siswa.
- [x] `data/notebook.js`: 6 latihan buku tulis (2/modul), bertahap, kontekstual, tanpa jawaban di tampilan siswa.

## Fase C — Antarmuka siswa
- [x] `js/essay.js` + rute `#/uraian`: lembar kerja digital, validasi per langkah, autosave, edit sebelum kirim.
- [x] `js/notebook.js` + rute `#/bukutulis`: instruksi 7 langkah, refleksi, tombol "SAYA SUDAH MENGERJAKAN DI BUKU", foto opsional hanya jika diminta guru.
- [x] `js/quiz.js`: integrasi timing (ganti timer lama), auto-lock, telemetri lengkap, kirim alert anomali, halaman hasil + umpan balik + latihan buku.
- [x] `js/app.js`: rute baru, gate alur, pengumuman etika waktu, penerimaan peringatan guru + kolom penjelasan siswa.

## Fase D — Waktu nyata & guru
- [x] `server.js`: bus alert ringan (`/api/alerts`, `/api/actions`, `/api/live`) + opsi `--lan`.
- [x] `js/realtime.js`: publish alert ke server lokal + antrean Sheets; polling guru & siswa; fallback sinkronisasi.
- [x] `teacher/dashboard.js`: halaman `#/monitoring` (status siswa, warna, detail tanpa pindah halaman), log alert & tindakan, 6 aksi guru, pengaturan waktu/anomali/alur.
- [x] `student.html` / `teacher.html` / `css`: rute & gaya baru.

## Fase E — Backend & pengujian
- [x] `google-apps-script/Code.gs`: 9 sheet lama dipertahankan + sheet baru; op baru; pull ringan & penuh.
- [x] `tests/`: validator soal uraian & buku tulis; `npm test`; uji browser E2E (timer, reload, anomaly, alert, peringatan, uraian, umpan balik, buku tulis, monitoring, Sheets).
- [x] Dokumentasi: `README.md`, `google-apps-script/README.md`.

## Status akhir — terverifikasi 25 Nov 2026

### Otomasisasi
- `npm test` → **Lulus: 397 | Gagal: 0**; distribusi soal `{total:20, aritmetika:6, geometri:6, lingkaran:8, single:10, multiple:6, completion:4, C3:4, C4:7, C5:6, C6:3}`.
- `validate-v2.mjs` lulus: waktu, indikator, uraian, buku tulis, alur, umpan balik, backend, PWA.
- `check-syntax.mjs` lulus: 32 file JavaScript.

### Uji browser end-to-end (localhost:8765 + mock GAS 8766)
- **Timer & telemetri**: timer mulai saat soal tampil, bertahan setelah reload, idle tercatat, auto-lock berjalan; alert + anomali (`A1`, `C3`, PERLU DIPERHATIKAN, skor 4) dihasilkan dan tersinkronisasi.
- **Tindakan guru**: peringatan dicatat, dikirim ke bus LAN dan Sheets, serta diterima siswa lewat polling.
- **Peringatan siswa**: banner detail menampilkan nama/NISN/kelas/nomor soal/materi/durasi/indikator/tingkat/waktu; penjelasan siswa dikirim sebagai baris `PENJELASAN_SISWA` terpisah (tidak menimpa peringatan), dibaca guru di monitoring, dan dijemput kembali siswa lewat pull tanpa notifikasi ganda.
- **Gate alur**: ketika tahap wajib belum selesai, halaman asesmen menampilkan pesan "Selesaikan dulu: …", tautan "Lihat alur belajar", dan tombol mulai menolak dengan toast; tidak ada sesi yang dibuat. Konfigurasi guru dari Sheets diterapkan siswa saat auto-sync.
- **Uraian terstruktur**: 8/8 langkah divalidasi, autosave, tombol kirim aktif setelah langkah terakhir, terkirim ke guru; penilaian per langkah (0/1) + catatan guru tersimpan dan tersinkronisasi.
- **Buku tulis**: 7 instruksi tertulis, konfirmasi "SAYA SUDAH MENGERJAKAN DI BUKU", refleksi, foto opsional; pemeriksaan guru (nilai, status, komentar) tersimpan dan terlihat siswa lewat pull.
- **Umpan balik**: hanya kalimat bersumber data (uraian 100%, 1 buku tulis, indikator waktu/proses), tanpa AI eksternal; riwayat tersimpan.
- **Pengaturan guru**: kartu koneksi, bobot, WAKTU_SOAL, AMBANG_ANOMALI, ALUR_BELAJAR, REALTIME, BUKU_TULIS tersimpan ke antrean dan tampil di `pull&full=1` dengan kunci yang benar; student pull menerapkannya.
- **PWA & etika**: service worker `labmat-smk-xi-v5` precache 37 berkas; localStorage kosong (tidak ada pekerjaan siswa tersimpan di sana); 12 rute siswa dan 4 rute guru tanpa error konsol; tidak ada keylogger, screenshot diam-diam, kamera, atau pemantauan di luar aplikasi; data proses tidak dihapus.

### Catatan operasional
- `setup()` di Apps Script membuat token di sheet `KONFIGURASI`; web app `ANYONE_ANONYMOUS`; URL + token diisi di UI pengaturan.
- `server.js [port] [--lan]` menyediakan bus LAN berbasis polling; Sheets tetap cadangan awet. Bus dalam memori direset saat server restart — sinkronisasi Sheets memulihkan data.
- Rute `#/eksporasi` sengaja ejaan lama agar sesuai `student.html` dan `js/ui.js`.
