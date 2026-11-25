// Uraian terstruktur: 2 soal per modul, 8 langkah, sebagian teks disediakan, sebagian diisi siswa.
// mode: 'text' | 'number' | 'choice'. accept/answer dipakai validasi langkah awal; guru tetap menilai final.

const step = (id, label, given, blank, mode, answer, guide, accept = []) =>
  ({ id, label, given, blank, mode, answer, accept, guide });

export const ESSAYS = [
  {
    id: 'E-A1', module: 'aritmetika', title: 'Uraian: tabungan koperasi siswa', icon: '🧾',
    context: 'Koperasi siswa menyetor Rp 150.000 pada bulan pertama. Setiap bulan berikutnya setoran bertambah tetap Rp 25.000. Setoran dilakukan selama 10 bulan.',
    steps: [
      step('s1', 'Memahami masalah', 'Diketahui: setoran pertama a = 150 ribu, beda b = 25 ribu, n = 10 bulan.', 'Tuliskan besaran yang ditanyakan.',
        'text', 'jumlah setoran 10 bulan', 'Apa yang ingin diketahui koperasi?', ['total setoran 10 bulan', 'jumlah setoran sepuluh bulan']),
      step('s2', 'Diketahui', 'a = 150; b = 25; n = 10 (dalam ribuan rupiah).', 'Tulis nilai b dan n dalam ribuan rupiah.', 'text', '25; 10', 'Bedanya konstan, sehingga ini barisan aritmatika.', ['25, 10', 'b=25 n=10']),
      step('s3', 'Ditanyakan', 'Jumlah seluruh setoran selama 10 bulan.', 'Pilih rumus yang sesuai.', 'choice', 'S_n', 'Deret aritmatika memakai jumlah n suku.', []),
      step('s4', 'Konsep / rumus', 'Barisan aritmatika: U_n = a + (n−1)b; deret: S_n = n/2 (a + U_n).', 'Tuliskan rumus S_n.', 'text', 'S_n = n/2(a + U_n)', 'Rumus jumlah deret aritmatika.', ['s_n = n/2 (a + u_n)', 'sn = n/2(a+un)']),
      step('s5', 'Substitusi', 'U_10 = 150 + (10−1)·25.', 'Hitung nilai U_10 (ribuan rupiah).', 'number', 375, '9 × 25 = 225, lalu tambahkan 150.', []),
      step('s6', 'Perhitungan', 'S_10 = 10/2 × (150 + 375).', 'Hitung S_10 (ribuan rupiah).', 'number', 2625, '5 × 525.', []),
      step('s7', 'Hasil', 'S_10 = 2.625 (ribuan rupiah).', 'Nyatakan dalam rupiah.', 'text', 'Rp 2.625.000', 'Kalikan 2.625 dengan 1.000.', ['rp 2625000', 'rp2.625.000']),
      step('s8', 'Interpretasi', 'Koperasi mengumpulkan Rp 2.625.000 dalam 10 bulan.', 'Tulis satu kalimat keputusan untuk koperasi.', 'text', '', 'Apakah dana cukup untuk membeli mesin seharga Rp 2.500.000?', [])
    ]
  },
  {
    id: 'E-A2', module: 'aritmetika', title: 'Uraian: target produksi bengkel', icon: '🏭',
    context: 'Bengkel memproduksi 40 komponen pada hari pertama. Orientasi baru menaikkan produksi 6 komponen setiap hari selama 12 hari kerja.',
    steps: [
      step('s1', 'Memahami masalah', 'Produksi hari pertama 40, kenaikan tetap 6 per hari, 12 hari kerja.', 'Tuliskan yang ditanyakan.', 'text', 'produksi hari ke-12', 'Fokus pada hari terakhir, bukan jumlah total.', ['produksi hari ke 12', 'banyak komponen hari ke-12']),
      step('s2', 'Diketahui', 'a = 40, b = 6, n = 12.', 'Tulis nilai a, b, n.', 'text', '40; 6; 12', 'Data sudah lengkap.', ['40,6,12', 'a=40 b=6 n=12']),
      step('s3', 'Ditanyakan', 'Banyak komponen pada hari ke-12.', 'Pilih besaran yang dicari.', 'choice', 'U_12', 'Suku ke-n barisan aritmatika.', []),
      step('s4', 'Konsep / rumus', 'U_n = a + (n−1)b.', 'Tuliskan rumus suku ke-n.', 'text', 'U_n = a + (n-1)b', 'Rumus barisan aritmatika.', ['un = a + (n-1)b', 'u_n=a+(n-1)b']),
      step('s5', 'Substitusi', 'U_12 = 40 + (12−1)·6.', 'Hitung U_12.', 'number', 106, '11 × 6 = 66.', []),
      step('s6', 'Perhitungan', '40 + 66 = 106 komponen.', 'Tulis hasil perhitungan tanpa satuan.', 'number', 106, 'Periksa kembali 40 + 66.', []),
      step('s7', 'Hasil', 'Produksi hari ke-12 = 106 komponen.', 'Tulis hasil beserta satuan.', 'text', '106 komponen', 'Sertakan satuan.', ['106 komponen']),
      step('s8', 'Interpretasi', 'Target hari ke-12 terlampaui jika lebih dari 100 komponen.', 'Tulis kesimpulan untuk supervisor bengkel.', 'text', '', 'Bandingkan 106 dengan target 100.', [])
    ]
  },
  {
    id: 'E-G1', module: 'geometri', title: 'Uraian: pertumbuhan omzet online', icon: '📈',
    context: 'Omzet penjualan online sebuah usaha sebesar Rp 1.000.000 pada bulan pertama dan meningkat 20% setiap bulan selama 5 bulan.',
    steps: [
      step('s1', 'Memahami masalah', 'Omzet awal 1.000 ribu, kenaikan tetap 20% per bulan.', 'Apakah ini aritmatika atau geometri?', 'choice', 'geometri', 'Persentase tetap berarti rasio tetap.', []),
      step('s2', 'Diketahui', 'a = 1.000 (ribu), r = 1,2, n = 5.', 'Tulis rasio r.', 'number', 1.2, '100% + 20% = 120% = 1,2.', []),
      step('s3', 'Ditanyakan', 'Omzet bulan kelima.', 'Pilih rumus yang tepat.', 'choice', 'U_5', 'Bukan jumlah, melainkan suku ke-5.', []),
      step('s4', 'Konsep / rumus', 'Barisan geometri: U_n = a·r^(n−1).', 'Tuliskan rumusnya.', 'text', 'U_n = a r^(n-1)', 'Perhatikan pangkat n−1.', ['un = a*r^(n-1)', 'u_n = a r (n-1)']),
      step('s5', 'Substitusi', 'U_5 = 1.000 × 1,2^4.', 'Hitung 1,2^4.', 'number', 2.0736, '1,2 × 1,2 × 1,2 × 1,2.', []),
      step('s6', 'Perhitungan', '1.000 × 2,0736 = 2.073,6 ribu.', 'Hitung U_5 dalam ribuan rupiah.', 'number', 2073.6, 'Kalikan dengan 1.000.', []),
      step('s7', 'Hasil', 'Omzet bulan kelima Rp 2.073.600.', 'Tulis omzet dalam rupiah.', 'text', 'Rp 2.073.600', '2.073,6 ribu = 2.073.600 rupiah.', ['rp 2073600', 'rp2.073.600']),
      step('s8', 'Interpretasi', 'Omzet naik sekitar dua kali lipat dalam lima bulan.', 'Tulis saran untuk pemilik usaha.', 'text', '', 'Apakah kenaikan ini konsisten dengan tren?', [])
    ]
  },
  {
    id: 'E-G2', module: 'geometri', title: 'Uraian: penyusutan nilai mesin', icon: '⚙️',
    context: 'Sebuah mesin bernilai Rp 20.000.000. Nilainya menyusut 10% setiap tahun selama 4 tahun.',
    steps: [
      step('s1', 'Memahami masalah', 'Nilai awal 20.000 ribu, penyusutan 10%/tahun.', 'Tulis faktor penyusutan r.', 'number', 0.9, '100% − 10% = 90%.', []),
      step('s2', 'Diketahui', 'a = 20.000, r = 0,9, n = 4 tahun.', 'Tulis nilai a dan n.', 'text', '20000; 4', 'Dalam ribuan rupiah.', ['20000,4', 'a=20000 n=4']),
      step('s3', 'Ditanyakan', 'Nilai mesin setelah 4 tahun.', 'Pilih suku yang dicari.', 'choice', 'U_4', 'Nilai akhir adalah suku ke-4, jika tahun pertama=a.', []),
      step('s4', 'Konsep / rumus', 'U_n = a·r^(n−1).', 'Tuliskan rumus barisan geometri.', 'text', 'U_n = a r^(n-1)', 'Rasio kurang dari 1.', ['un=a*r^(n-1)']),
      step('s5', 'Substitusi', 'U_4 = 20.000 × 0,9³.', 'Hitung 0,9³.', 'number', 0.729, '0,9 × 0,9 × 0,9.', []),
      step('s6', 'Perhitungan', '20.000 × 0,729 = 14.580 ribu.', 'Hitung nilai dalam ribuan rupiah.', 'number', 14580, '20.000 dikali 0,729.', []),
      step('s7', 'Hasil', 'Nilai mesin Rp 14.580.000.', 'Tulis nilai akhir mesin.', 'text', 'Rp 14.580.000', 'Ubah ribuan ke rupiah.', ['rp 14580000', 'rp14.580.000']),
      step('s8', 'Interpretasi', 'Penyusutan sebesar 27,1% dari nilai awal.', 'Tulis catatan untuk bagian keuangan.', 'text', '', 'Bandingkan nilai awal dan akhir.', [])
    ]
  },
  {
    id: 'E-L1', module: 'lingkaran', title: 'Uraian: desain roda mesin', icon: '🛞',
    context: 'Sebuah roda mesin berjari-jari 14 cm. Roda tersebut berputar 25 kali untuk menggerakkan sabuk conveyor.',
    steps: [
      step('s1', 'Memahami masalah', 'jari-jari 14 cm, putaran 25 kali.', 'Tuliskan yang ditanyakan.', 'text', 'jarak tempuh sabuk', 'Putaran roda menempuh keliling.', ['jarak tempuh', 'panjang sabuk yang bergerak']),
      step('s2', 'Diketahui', 'r = 14 cm, putaran = 25, π = 3,14.', 'Tulis diameter roda.', 'number', 28, 'd = 2r.', []),
      step('s3', 'Ditanyakan', 'Jarak tempuh sabuk setelah 25 putaran.', 'Pilih konsep yang dipakai.', 'choice', 'keliling', 'Gunakan keliling lingkaran.', []),
      step('s4', 'Konsep / rumus', 'Keliling K = 2πr = πd.', 'Tuliskan rumus keliling.', 'text', 'K = 2πr', 'Bisa juga K = πd.', ['k = 2πr', 'k = pi d']),
      step('s5', 'Substitusi', 'K = 2 × 3,14 × 14.', 'Hitung keliling dalam cm.', 'number', 87.92, '2 × 3,14 × 14.', []),
      step('s6', 'Perhitungan', 'Jarak = 87,92 × 25.', 'Hitung jarak total (cm).', 'number', 2198, '87,92 dikali 25.', []),
      step('s7', 'Hasil', 'Jarak tempuh 2.198 cm = 21,98 m.', 'Tulis hasil dalam meter.', 'text', '21,98 m', 'Bagi 100.', ['21.98 m', '21,98 meter']),
      step('s8', 'Interpretasi', 'Sabuk bergerak sekitar 22 meter.', 'Tulis implikasi untuk panjang conveyor.', 'text', '', 'Apakah conveyor perlu panjang lebih dari 22 m?', [])
    ]
  },
  {
    id: 'E-L2', module: 'lingkaran', title: 'Uraian: luas area servis', icon: '🧰',
    context: 'Area servis berbentuk lingkaran dengan diameter 10 m. Di tengah area terdapat tiang penyangga berjari-jari 1 m yang tidak bisa dipakai.',
    steps: [
      step('s1', 'Memahami masalah', 'diameter luar 10 m, jari-jari tiang 1 m.', 'Tulis jari-jari area luar.', 'number', 5, 'r = d/2.', []),
      step('s2', 'Diketahui', 'R = 5 m, r = 1 m, π = 3,14.', 'Tuliskan yang diketahui.', 'text', 'R=5; r=1', 'Dua jari-jari berbeda.', ['r=5, r=1', 'r luar 5 r dalam 1']),
      step('s3', 'Ditanyakan', 'Luas area yang bisa dipakai.', 'Pilih konsep.', 'choice', 'luas cincin', 'Luas lingkaran besar dikurangi kecil.', []),
      step('s4', 'Konsep / rumus', 'Luas cincin L = π(R² − r²).', 'Tuliskan rumus luas cincin.', 'text', 'L = π(R²-r²)', 'Selisih dua luas lingkaran.', ['l = π(r^2 - r^2)', 'l = pi (r² - r²)']),
      step('s5', 'Substitusi', 'L = 3,14 × (25 − 1).', 'Hitung R² − r².', 'number', 24, '25 − 1.', []),
      step('s6', 'Perhitungan', '3,14 × 24.', 'Hitung luas (m²).', 'number', 75.36, '3,14 dikali 24.', []),
      step('s7', 'Hasil', 'Luas area terpakai 75,36 m².', 'Tulis hasil beserta satuan.', 'text', '75,36 m²', 'Sertakan m².', ['75.36 m2', '75,36 meter persegi']),
      step('s8', 'Interpretasi', 'Area cukup untuk 12 meja kerja @ 6 m².', 'Tulis keputusan untuk penataan workshop.', 'text', '', '75,36 dibagi 6 hasilnya 12,56.', [])
    ]
  }
];

export const essayById = id => ESSAYS.find(e => e.id === id);
export const essaysFor = module => ESSAYS.filter(e => e.module === module);
