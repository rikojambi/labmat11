# LABMAT SMK XI

**Laboratorium Matematika Digital** — aplikasi PWA offline-first untuk pembelajaran matematika siswa SMK kelas XI (Barisan/Deret Aritmatika, Barisan/Deret Geometri, Lingkaran), lengkap dengan antarmuka guru dan sinkronisasi Google Sheets gratis.

> Bahasa pengantar: Bahasa Indonesia. Tanpa build step, tanpa dependency runtime, tanpa biaya langganan, tanpa server 24/7.

---

## 1. Menjalankan aplikasi (Windows)

Cara paling mudah:

1. Pastikan **Node.js** terpasang (disarankan) atau Python 3.
2. Klik dua kali **`start.bat`**.
3. Browser akan terbuka di `http://localhost:8765/index.html`.

`start.bat` akan:
- memilih Node.js (`server.js`), fallback ke `py -3 -m http.server`, lalu `python -m http.server`;
- menjalankan server lokal di port 8765;
- membuka halaman awal di browser.

Alternatif manual:

```bat
node server.js 8765
```

Lalu buka:
- `http://localhost:8765/index.html` — halaman pilihan peran
- `http://localhost:8765/student.html` — antarmuka siswa
- `http://localhost:8765/teacher.html` — dashboard guru

### Instalasi PWA (offline)

Buka aplikasi di Chrome/Edge, lalu pilih **Install app** dari menu browser. Setelah terpasang, seluruh shell aplikasi (HTML, CSS, JS, data soal, ikon) tersedia dari Cache Storage service worker. Data belajar tersimpan di **IndexedDB**, sehingga tetap ada saat internet mati.

---

## 2. Daftar fitur

### Siswa
- **Registrasi sekali**: nama, NIS/NISN, kelas, program keahlian, sekolah. Identitas terkunci; perubahan wajib lewat persetujuan guru.
- **3 modul materi** dengan visualisasi interaktif (grafik canvas & diagram SVG), contoh kontekstual SMK, dan penerapan dunia kerja.
- **9 latihan terpandu** (3 per modul), masing-masing 5 tahap: memahami → strategi → perhitungan → interpretasi → refleksi. Petunjuk 3 tingkat tidak langsung memberi jawaban akhir.
- **20 soal HOTS**: 6 aritmetika, 6 geometri, 8 lingkaran; 10 pilihan ganda, 6 multiple response, 4 completion satu kata; C3=4, C4=7, C5=6, C6=3.
- **Anti-ketergantungan AI**: angka diacak per siswa (deterministik dari seed), jurnal proses wajib pada soal tertentu, kunci jawaban awal + pertanyaan lanjutan, refleksi, dan telemetri transparan (durasi, perubahan, urutan, petunjuk, percobaan). Tanpa kamera/keylogger/pengawasan tersembunyi.
- **Penilaian**: jawaban, partial credit multiple response, proses, interpretasi, refleksi; bobot dapat diatur guru; penguasaan per indikator dan rekomendasi remedial.
- **Enrichment**: peta kompetensi, tantangan dunia kerja (TSM/Pemasaran/PPLG), kalkulator eksplorasi, catatan, sertifikat cetak/PDF.

### Guru
- **PIN lokal** saat membuka dashboard: dibuat sendiri pada pemakaian pertama (4–8 digit), disimpan sebagai hash + salt di IndexedDB, terkunci otomatis saat tab ditutup, tombol **Kunci** untuk mengunci segera. Lupa PIN? Masukkan kode sinkronisasi Sheets pada layar kunci. PIN ini **bukan** kata sandi Google dan tidak dikirim ke Sheets.
- Dashboard ringkasan kelas: rata-rata, tertinggi, terendah, ketuntasan, distribusi nilai, soal tersulit, capaian indikator, siswa perlu pendampingan.
- Tabel siswa + drill-down jawaban, jurnal proses, telemetri, pembahasan, dan rincian penilaian.
- Umpan balik per siswa/soal, penilaian terbuka perlu tinjauan, persetujuan/penolakan perubahan identitas.
- Ekspor CSV rekap nilai.
- Pengaturan bobot penilaian dan pengaktifan verifikasi pemahaman yang dikirim ke semua siswa lewat Sheets.

### Sinkronisasi
- Antrean IndexedDB dengan `idempotency_key`, retry eksponensial, indikator status, sinkronisasi manual & otomatis.
- **Kirim otomatis setiap 30 menit** (dapat diubah ke 5/15/60 menit di Pengaturan). Setiap jadwal mengirim antrean **dan draf yang sedang diketik** (jawaban asesmen, uraian, refleksi buku tulis, waktu sesi). Draf berstatus `draf` dan tidak dihitung sebagai nilai akhir; saat siswa menekan "kirim", baris yang sama diperbarui bukan diduplikat.
- Pekerjaan tetap tersimpan di IndexedDB **seketika** saat diketik; tombol **Sinkronisasi manual** bisa dipakai kapan saja tanpa menunggu jadwal.
- Data lokal **tidak dihapus** sebelum server mengonfirmasi penerimaan.
- Backend Apps Script gratis → Google Sheets (16 sheet). Lihat [`google-apps-script/README.md`](google-apps-script/README.md).

---

## 3. Struktur folder

```
LABMAT-SMK-XI/
├── index.html              # Halaman awal / pilihan peran
├── student.html            # SPA siswa
├── teacher.html            # SPA guru
├── start.bat               # Peluncur Windows satu klik
├── server.js               # Server statis localhost (tanpa dependency)
├── sw.js                   # Service worker offline-first
├── manifest.json           # Manifest PWA
├── css/styles.css          # Sistem desain responsif navy/putih/teal
├── data/
│   ├── materials.js        # 3 modul + simulasi kontekstual
│   ├── practice.js         # 9 latihan terpandu 5 tahap
│   ├── questions.js        # 20 soal HOTS + varian + kunci dinamis
│   ├── rubrics.js          # Bobot, rubrik, ambang ketuntasan
│   └── challenges.js       # Tantangan dunia kerja + preset kalkulator
├── js/
│   ├── app.js              # Router & halaman siswa
│   ├── auth.js             # Identitas sekali daftar + permintaan ubah
│   ├── database.js         # IndexedDB (semua store + backup/restore)
│   ├── utils.js            # Utilitas DOM, format, modal, toast
│   ├── ui.js               # Header, chip sinkronisasi, komponen UI
│   ├── learning.js         # Materi + visualisasi canvas/SVG
│   ├── guided-practice.js  # Latihan 5 tahap + petunjuk bertingkat
│   ├── quiz.js             # Asesmen HOTS, jurnal, lock, verifikasi
│   ├── scoring.js          # Penilaian otomatis + partial credit
│   ├── sync.js             # Antrean push/pull, retry, JSONP fallback
│   ├── analytics.js        # Analitik siswa & kelas + CSV
│   └── challenges.js       # Kalkulator & tantangan dunia kerja
├── teacher/dashboard.js    # Dashboard guru
├── google-apps-script/
│   ├── Code.gs             # API Web App + inisialisasi 9 sheet
│   ├── appsscript.json     # Konfigurasi runtime & webapp
│   └── README.md           # Panduan deploy lengkap
├── assets/                 # Ikon PWA (SVG + PNG 192/512/maskable)
├── tools/make_icons.py     # Generator ikon (opsional)
└── tests/                  # Validasi soal, data, sintaks, mock GAS
```

---

## 4. Pengujian

```bat
npm test
```

Menjalankan:
- `validate-questions.mjs` — 397 pemeriksaan bank soal (jumlah, tipe, level, kunci, varian, rubrik, pembahasan);
- `validate-data.mjs` — konsistensi modul, latihan, tantangan, rubrik;
- `check-syntax.mjs` — `node --check` pada semua file JS.

Pengujian browser yang telah dilakukan:
- registrasi identitas → terkunci di IndexedDB;
- navigasi seluruh halaman siswa dan guru tanpa error konsol;
- visualisasi aritmetika, geometri, lingkaran merespons perubahan parameter;
- latihan terpandu 5 tahap selesai + jurnal/refleksi masuk antrean;
- asesmen 20 soal: validasi jurnal, kunci jawaban awal, pertanyaan lanjutan, finalisasi, hasil & remedial;
- dashboard guru: impor cadangan, ringkasan, tabel, drill-down, umpan balik, CSV;
- sinkronisasi ke mock Apps Script: push 37+ operasi, pull konfigurasi & umpan balik;
- kegagalan jaringan: antrean tetap utuh berstatus `failed` dan dijadwalkan ulang;
- offline nyata (server dimatikan): PWA tetap terbuka dari cache, data dari IndexedDB;
- service worker cache berisi 28 berkas shell.

Untuk menguji sinkronisasi tanpa Google:

```bat
node tests\mock-gas-server.mjs 8766
```

---

## 5. Konfigurasi awal (penting)

1. **Siswa** mengisi identitas sekali saat pertama membuka `student.html`.
2. **Guru** men-deploy Apps Script sesuai panduan, lalu memasukkan **URL Web App** dan **token** di dashboard (menu Koneksi & Bobot) dan/atau siswa memasukkannya di Pengaturan.
3. tanpa URL/token, aplikasi tetap berfungsi penuh secara offline; sinkronisasi menunjukkan "belum dikonfigurasi" dan antrean terus bertambah dengan aman.

---

## 6. Prinsip privasi

- Penyimpanan utama: **IndexedDB**. **Tidak ada localStorage** untuk data pekerjaan siswa.
- Telemetri bersifat transparan dan dapat dilihat guru: durasi per soal, jumlah perubahan jawaban, urutan pengerjaan, petunjuk yang dibuka, jumlah percobaan, dan jawaban lanjutan.
- Tidak ada kamera, mikrofon, perekaman layar, pembacaan keyboard, atau pelacakan tersembunyi.
- Identitas siswa hanya dapat diubah setelah guru menyetujui permintaan perubahan.

---

## 7. Lisensi & dukungan

Dibuat untuk penggunaan pembelajaran di SMK. Seluruh materi, soal, dan kode disimpan lokal di perangkat; tidak bergantung pada layanan AI berbayar. Untuk perubahan materi, sunting file di folder `data/` lalu jalankan `npm test` untuk memastikan validitas bank soal tetap terjaga.
