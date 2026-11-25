# LABMAT SMK XI — Arsitektur & Rencana Implementasi

## Fase 1 — Analisis & arsitektur (selesai)
- Target: aplikasi lokal offline-first untuk siswa XI + dashboard guru terpisah.
- Runtime: browser modern (Chrome/Edge), ES Modules, tanpa build step, tanpa dependency berbayar.
- Storage utama: **IndexedDB** (`labmat-db`, version 1). localStorage **tidak** dipakai untuk data pekerjaan.
- Sinkronisasi: antrean `syncQueue` dengan `idempotencyKey`, status `pending|sending|synced|failed`, retry eksponensial, dan **tidak ada penghapusan lokal sebelum server mengonfirmasi**.
- Server pusat: Google Apps Script Web App → Google Sheets (9 sheet). Token admin/disetujui guru disimpan di sheet `KONFIGURASI`, bukan di frontend.
- Komunikasi: `doGet` (JSONP + CORS) untuk pull, `doPost` (JSON/text/plain + CORS + `doOptions`) untuk push. Gagal kirim → tetap di antrean.

### Store IndexedDB
| Store | Key | Isi |
|---|---|---|
| identity | `current` | identitas siswa terkunci + `unlocked` |
| sessions | id | sesi belajar/asesmen |
| responses | responseId | jawaban + skor + status |
| processes | processId | jurnal proses 5 tahap |
| reflections | reflectionId | refleksi & verifikasi |
| notes | noteId | catatan siswa |
| progress | moduleId | progres modul/latihan |
| config | key | konfigurasi sinkronisasi, bobot, toggle verifikasi |
| syncQueue | idempotencyKey | antreian operasi sync |
| outbox | id | umpan balik guru / permintaan ubah identitas |

### Modul JS
`utils.js` (DOM, tanggal, PRNG deterministik), `database.js` (semua akses IndexedDB), `auth.js` (identitas + prosedur buka kunci via guru), `ui.js` (shell/navigasi/toast), `learning.js` (materi + visualisasi canvas/SVG), `guided-practice.js` (scaffolding 5 tahap + 3 tier petunjuk), `quiz.js` (20 soal, jurnal wajib, variasi seed, tahap lanjutan, verifikasi), `scoring.js` (penilaian + bobot), `sync.js` (antrean + retry + pull), `analytics.js` (dashboard statistik), `app.js` (bootstrap/hash router).

## Fase 2 — UI/UX: index (pilih peran), student (SPA), teacher (SPA). Desain navy/teal, kartu, progress bar, responsif.
## Fase 3 — Materi 3 modul + visualisasi interaktif (grafik aritmetik/geometri, lingkaran + sudut pusat/busur/juring).
## Fase 4 — Latihan terpandu 3 soal/modul × 5 tahap + umpan balik + petunjuk bertingkat.
## Fase 5 — Bank tepat 20 soal (6 aritmetik, 6 geometri, 8 lingkaran; 10 PG, 6 MR, 4 completion; C3=4, C4=7, C5=6, C6=3) dengan varian parameter berseed.
## Fase 6 — Asesmen + penilaian (jurnal wajib, MR penalti terkontrol, completion validasi, bobot guru).
## Fase 7 — IndexedDB + PWA (manifest, sw.js, start.bat, server.js).
## Fase 8 — Google Apps Script + sinkronisasi dua arah.
## Fase 9 — Dashboard guru (tabel, analisis, CSV, komentar, approve identitas).
## Fase 10 — Pengujian: validasi kunci 20 soal (Node), smoke test browser, offline, IndexedDB, sync retry, responsive.

## Keputusan pedagogis
- Anti-ketergantungan AI: jurnal proses wajib pada soal tertentu, variasi angka per seed, kunci jawaban awal dikunci sebelum lanjutan, refleksi, telemetri transparan (durasi/perubahan/petunjuk/urutan), verifikasi pemahaman opsional guru. Tidak ada pengawasan tersembunyi.
- Nilai akhir = kombinasi jawaban (bobot default 60%), proses (20%), interpretasi (10%), refleksi (10%); guru dapat mengatur bobot lewat sheet `KONFIGURASI`.
- Identitas berubah hanya jika guru menyetujui permintaan lewat dashboard (idempotent, tersinkron), bukan dengan kata sandi tersembunyi di frontend.
