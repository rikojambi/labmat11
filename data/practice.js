// Latihan terpandu: 3 soal per modul, 5 tahap scaffolding + 3 tingkat petunjuk.
export const PRACTICE = [
  {
    id: 'P-A1', module: 'aritmetika', title: 'Tabungan untuk modal usaha', icon: '💰',
    context: 'Rani menyisihkan Rp 200.000 pada bulan pertama. Setiap bulan berikutnya ia menambah Rp 50.000 lebih banyak dari bulan sebelumnya. Ia ingin membeli mesin jahit bekas setelah 12 bulan.',
    given: [
      { text: 'Tabungan bulan pertama Rp 200.000', correct: true },
      { text: 'Kenaikan tetap Rp 50.000 per bulan', correct: true },
      { text: 'Rencana menabung 12 bulan', correct: true },
      { text: 'Harga mesin jahit Rp 5.000.000', correct: false },
      { text: 'Tabungan bulan pertama Rp 250.000', correct: false }
    ],
    askedKeywords: ['bulan ke-12', 'total', 'tabungan'],
    conceptOptions: ['Barisan aritmatika', 'Barisan geometri', 'Lingkaran', 'Deret geometri tak hingga'],
    concept: 'Barisan aritmatika',
    strategyOptions: ['Cari U12 lalu S12 dengan rumus aritmatika', 'Pakai rumus bunga majemuk', 'Hitung keliling lingkaran', 'Cari rasio dengan pembagian'],
    strategy: 'Cari U12 lalu S12 dengan rumus aritmatika',
    fields: [
      { key: 'a', label: 'Suku pertama a (Rp)', answer: 200000, tolerance: 0 },
      { key: 'b', label: 'Beda b (Rp)', answer: 50000, tolerance: 0 },
      { key: 'u', label: 'U12 = tabungan bulan ke-12 (Rp)', answer: 750000, tolerance: 0 },
      { key: 's', label: 'S12 = total tabungan 12 bulan (Rp)', answer: 5700000, tolerance: 0 }
    ],
    conclusions: [
      { text: 'Tabungan bulan ke-12 Rp 750.000 dan total Rp 5.700.000', correct: true },
      { text: 'Tabungan bulan ke-12 Rp 800.000 dan total Rp 6.000.000', correct: false },
      { text: 'Tabungan bulan ke-12 Rp 750.000 dan total Rp 4.950.000', correct: false },
      { text: 'Total tabungan tidak dapat dihitung', correct: false }
    ],
    reflection: 'Mengapa kenaikan yang tetap membuat kasus ini termasuk aritmatika, bukan geometri?',
    hints: {
      concept: ['Perhatikan apakah yang bertambah tetap besarnya atau tetap persentasenya.', 'Rp 50.000 adalah jumlah tetap, bukan persentase.'],
      strategy: ['Suku ke-n menjawab "bulan tertentu"; deret menjawab "total seluruh bulan".', 'Gunakan Un = a + (n−1)b dahulu, lalu Sn = ½n(a + Un).'],
      calc: ['Substitusi: U12 = 200.000 + 11 × 50.000.', 'S12 = ½ × 12 × (200.000 + U12).']
    }
  },
  {
    id: 'P-A2', module: 'aritmetika', title: 'Kapasitas kursi aula', icon: '🪑',
    context: 'Panitia pertemuan orang tua menata kursi. Baris pertama berisi 20 kursi, setiap baris berikutnya 4 kursi lebih banyak. Aula akan diisi 15 baris.',
    given: [
      { text: 'Baris pertama 20 kursi', correct: true },
      { text: 'Tiap baris bertambah 4 kursi', correct: true },
      { text: 'Jumlah baris 15', correct: true },
      { text: 'Setiap baris berisi 4 kursi', correct: false },
      { text: 'Baris terakhir 20 kursi', correct: false }
    ],
    askedKeywords: ['baris ke-15', 'kapasitas', 'total'],
    conceptOptions: ['Barisan aritmatika', 'Barisan geometri', 'Juring lingkaran', 'Deret tak hingga'],
    concept: 'Barisan aritmatika',
    strategyOptions: ['Hitung U15 untuk baris akhir, lalu S15 untuk kapasitas', 'Hitung 20 × 15 saja', 'Gunakan rumus luas lingkaran', 'Cari rasio 4/20'],
    strategy: 'Hitung U15 untuk baris akhir, lalu S15 untuk kapasitas',
    fields: [
      { key: 'a', label: 'Kursi baris pertama a', answer: 20, tolerance: 0 },
      { key: 'b', label: 'Beda b', answer: 4, tolerance: 0 },
      { key: 'u', label: 'U15 (kursi baris terakhir)', answer: 76, tolerance: 0 },
      { key: 's', label: 'S15 (kapasitas aula)', answer: 720, tolerance: 0 }
    ],
    conclusions: [
      { text: 'Baris terakhir 76 kursi dan kapasitas 720 kursi', correct: true },
      { text: 'Baris terakhir 80 kursi dan kapasitas 750 kursi', correct: false },
      { text: 'Baris terakhir 76 kursi dan kapasitas 300 kursi', correct: false },
      { text: 'Kapasitas aula 15 × 20 = 300 kursi', correct: false }
    ],
    reflection: 'Bagaimana kamu memeriksa bahwa kapasitas 720 kursi masuk akal?',
    hints: {
      concept: ['Setiap baris bertambah jumlah yang sama.', 'Beda b = 4, sehingga ini barisan aritmatika.'],
      strategy: ['Baris terakhir = suku ke-15; kapasitas = jumlah 15 suku.', 'Sn = ½ × 15 × (20 + U15).'],
      calc: ['U15 = 20 + 14 × 4.', 'S15 = ½ × 15 × (20 + 76).']
    }
  },
  {
    id: 'P-A3', module: 'aritmetika', title: 'Target produksi bengkel', icon: '🔧',
    context: 'Bengkel Sejahtera membuat 45 komponen pada hari pertama dan menambah 8 komponen tiap hari. Pihak manajemen menargetkan minimal 110 komponen pada hari ke-10.',
    given: [
      { text: 'Produksi hari pertama 45 komponen', correct: true },
      { text: 'Kenaikan 8 komponen per hari', correct: true },
      { text: 'Target hari ke-10 minimal 110 komponen', correct: true },
      { text: 'Target 110 komponen setiap hari', correct: false },
      { text: 'Produksi turun 8 komponen tiap hari', correct: false }
    ],
    askedKeywords: ['hari ke-10', 'target', 'tercapai'],
    conceptOptions: ['Barisan aritmatika', 'Barisan geometri', 'Busur lingkaran', 'Tembereng'],
    concept: 'Barisan aritmatika',
    strategyOptions: ['Hitung U10, lalu bandingkan dengan target', 'Hitung S10, lalu bandingkan dengan target', 'Bagi 110 dengan 45', 'Hitung luas juring'],
    strategy: 'Hitung U10, lalu bandingkan dengan target',
    fields: [
      { key: 'a', label: 'Produksi hari pertama a', answer: 45, tolerance: 0 },
      { key: 'b', label: 'Beda b', answer: 8, tolerance: 0 },
      { key: 'u', label: 'U10 (produksi hari ke-10)', answer: 117, tolerance: 0 },
      { key: 'selisih', label: 'Selisih terhadap target (komponen)', answer: 7, tolerance: 0 }
    ],
    conclusions: [
      { text: 'Target tercapai dengan kelebihan 7 komponen', correct: true },
      { text: 'Target belum tercapai, kurang 7 komponen', correct: false },
      { text: 'Target tercapai tepat 110 komponen', correct: false },
      { text: 'Tidak bisa ditentukan', correct: false }
    ],
    reflection: 'Apakah kamu memakai suku ke-n atau deret? Jelaskan alasanmu.',
    hints: {
      concept: ['Kenaikan 8 komponen tetap tiap hari.', 'Itu beda tetap → aritmatika.'],
      strategy: ['Yang ditanya adalah produksi pada satu hari, bukan total.', 'Gunakan U10, bukan S10.'],
      calc: ['U10 = 45 + 9 × 8.', 'Selisih = 117 − 110.']
    }
  },
  {
    id: 'P-G1', module: 'geometri', title: 'Pertumbuhan bakteri', icon: '🦠',
    context: 'Laboratorium memiliki 4 koloni bakteri. Setiap jam jumlahnya berlipat 2 kali. Petugas ingin tahu jumlah koloni akhir jam ke-5 dan total pengamatan 6 suku (jam ke-0 sampai ke-5).',
    given: [
      { text: 'Awal 4 koloni', correct: true },
      { text: 'Rasio 2 kali lipat setiap jam', correct: true },
      { text: 'Pengamatan hingga jam ke-5', correct: true },
      { text: 'Pertambahan 2 koloni setiap jam', correct: false },
      { text: 'Awal 8 koloni', correct: false }
    ],
    askedKeywords: ['jam ke-5', 'total', 'koloni'],
    conceptOptions: ['Barisan geometri', 'Barisan aritmatika', 'Lingkaran', 'Juring'],
    concept: 'Barisan geometri',
    strategyOptions: ['Hitung U6 = a·r⁵ lalu S6', 'Hitung 4 + 5 × 2', 'Hitung keliling lingkaran', 'Hitung 4 × 2 × 5'],
    strategy: 'Hitung U6 = a·r⁵ lalu S6',
    fields: [
      { key: 'a', label: 'Koloni awal a', answer: 4, tolerance: 0 },
      { key: 'r', label: 'Rasio r', answer: 2, tolerance: 0 },
      { key: 'u', label: 'Koloni jam ke-5 (U6)', answer: 128, tolerance: 0 },
      { key: 's', label: 'Total 6 suku (S6)', answer: 252, tolerance: 0 }
    ],
    conclusions: [
      { text: 'Jam ke-5 ada 128 koloni dan total 252 koloni', correct: true },
      { text: 'Jam ke-5 ada 128 koloni dan total 124 koloni', correct: false },
      { text: 'Jam ke-5 ada 14 koloni dan total 60 koloni', correct: false },
      { text: 'Jam ke-5 ada 64 koloni dan total 252 koloni', correct: false }
    ],
    reflection: 'Mengapa pangkat yang dipakai 5, bukan 6?',
    hints: {
      concept: ['Jumlah berlipat, bukan bertambah tetap.', 'Rasio r = 2.'],
      strategy: ['Jam ke-0 adalah suku pertama.', 'Jam ke-5 adalah suku ke-6 → pangkat 5.'],
      calc: ['U6 = 4 × 2⁵.', 'S6 = 4(2⁶ − 1)/(2 − 1).']
    }
  },
  {
    id: 'P-G2', module: 'geometri', title: 'Penyusutan nilai mesin', icon: '📉',
    context: 'Mesin broach dibeli seharga Rp 120 juta. Setiap tahun nilainya menjadi 80% dari nilai tahun sebelumnya. Setelah 3 tahun, mesin akan dijual.',
    given: [
      { text: 'Nilai awal Rp 120 juta', correct: true },
      { text: 'Faktor penyusutan 80% per tahun', correct: true },
      { text: 'Waktu pengamatan 3 tahun', correct: true },
      { text: 'Nilai turun Rp 24 juta setiap tahun', correct: false },
      { text: 'Nilai awal Rp 100 juta', correct: false }
    ],
    askedKeywords: ['nilai', '3 tahun', 'juta'],
    conceptOptions: ['Barisan geometri', 'Barisan aritmatika', 'Deret aritmatika', 'Luas juring'],
    concept: 'Barisan geometri',
    strategyOptions: ['Hitung 120 × 0,8³', 'Hitung 120 − 3 × 24', 'Hitung 120 × 0,2³', 'Hitung 120 + 3 × 24'],
    strategy: 'Hitung 120 × 0,8³',
    fields: [
      { key: 'a', label: 'Nilai awal a (juta Rp)', answer: 120, tolerance: 0.01 },
      { key: 'r', label: 'Rasio r', answer: 0.8, tolerance: 0.001 },
      { key: 'u', label: 'Nilai setelah 3 tahun (juta Rp)', answer: 61.44, tolerance: 0.01 }
    ],
    conclusions: [
      { text: 'Nilai mesin setelah 3 tahun sekitar Rp 61,44 juta', correct: true },
      { text: 'Nilai mesin setelah 3 tahun Rp 48 juta', correct: false },
      { text: 'Nilai mesin setelah 3 tahun Rp 76,8 juta', correct: false },
      { text: 'Nilai mesin tidak dapat ditentukan', correct: false }
    ],
    reflection: 'Mengapa model aritmatika tidak tepat untuk penyusutan ini?',
    hints: {
      concept: ['Persentase penyusutan dihitung dari nilai tahun berjalan.', 'Faktor pengali 0,8 tetap → geometri.'],
      strategy: ['Nilai setelah n tahun = a × rⁿ.', 'Gunakan pangkat 3, bukan dikali 3.'],
      calc: ['120 × 0,8 = 96; 96 × 0,8 = 76,8.', '76,8 × 0,8 = 61,44.']
    }
  },
  {
    id: 'P-G3', module: 'geometri', title: 'Penyebaran-info magang', icon: '📱',
    context: 'Dua siswa menyebarkan info lowongan magang. Setiap penerima meneruskan kepada 3 teman baru pada tahap berikutnya. Target panitia: 200 orang mengetahui dalam 5 tahap.',
    given: [
      { text: 'Penyebar awal 2 siswa', correct: true },
      { text: 'Setiap orang meneruskan ke 3 orang', correct: true },
      { text: 'Jumlah tahap 5', correct: true },
      { text: 'Target 200 orang', correct: true },
      { text: 'Penyebar awal 3 siswa', correct: false }
    ],
    askedKeywords: ['total', '200', 'tercapai'],
    conceptOptions: ['Deret geometri', 'Deret aritmatika', 'Luas lingkaran', 'Sudut keliling'],
    concept: 'Deret geometri',
    strategyOptions: ['Hitung S5 dengan a = 2, r = 3', 'Hitung 2 + 5 × 3', 'Hitung U5 saja', 'Hitung 2 × 3 × 5'],
    strategy: 'Hitung S5 dengan a = 2, r = 3',
    fields: [
      { key: 'a', label: 'Penyebar awal a', answer: 2, tolerance: 0 },
      { key: 'r', label: 'Rasio r', answer: 3, tolerance: 0 },
      { key: 's', label: 'S5 = total orang', answer: 242, tolerance: 0 },
      { key: 'selisih', label: 'Selisih dengan target (orang)', answer: 42, tolerance: 0 }
    ],
    conclusions: [
      { text: 'Tercapai, ada kelebihan 42 orang', correct: true },
      { text: 'Belum tercapai, kurang 42 orang', correct: false },
      { text: 'Tepat 200 orang', correct: false },
      { text: 'Total hanya 162 orang', correct: false }
    ],
    reflection: 'Apa bedanya "orang baru pada tahap tertentu" dengan "total orang yang tahu"?',
    hints: {
      concept: ['Setiap tahap mengalikan jumlah sebelumnya dengan 3.', 'Ini barisan geometri dengan r = 3.'],
      strategy: ['Yang diinginkan adalah kumulatif selama 5 tahap.', 'Gunakan S5 = a(r⁵−1)/(r−1).'],
      calc: ['S5 = 2(3⁵ − 1)/(3 − 1).', '3⁵ = 243, jadi S5 = 242.']
    }
  },
  {
    id: 'P-L1', module: 'lingkaran', title: 'Komponen mesin bubut', icon: '⚙️',
    context: 'Sebuah komponen mesin bubut berbentuk lingkaran dengan jari-jari 14 cm. Gunakan π = 3,14 untuk semua perhitungan.',
    given: [
      { text: 'Jari-jari 14 cm', correct: true },
      { text: 'Gunakan π = 3,14', correct: true },
      { text: 'Bentuk lingkaran', correct: true },
      { text: 'Diameter 14 cm', correct: false },
      { text: 'Jari-jari 28 cm', correct: false }
    ],
    askedKeywords: ['diameter', 'keliling', 'luas'],
    conceptOptions: ['Unsur dan rumus lingkaran', 'Barisan geometri', 'Deret aritmatika', 'Sudut keliling saja'],
    concept: 'Unsur dan rumus lingkaran',
    strategyOptions: ['Hitung d = 2r, K = 2πr, L = πr²', 'Hitung K = πr²', 'Hitung d = r/2', 'Hitung L = 2πr'],
    strategy: 'Hitung d = 2r, K = 2πr, L = πr²',
    fields: [
      { key: 'r', label: 'Jari-jari r (cm)', answer: 14, tolerance: 0 },
      { key: 'd', label: 'Diameter d (cm)', answer: 28, tolerance: 0 },
      { key: 'k', label: 'Keliling K (cm)', answer: 87.92, tolerance: 0.01 },
      { key: 'l', label: 'Luas L (cm²)', answer: 615.44, tolerance: 0.01 }
    ],
    conclusions: [
      { text: 'd = 28 cm, K ≈ 87,92 cm, L ≈ 615,44 cm²', correct: true },
      { text: 'd = 28 cm, K ≈ 43,96 cm, L ≈ 307,72 cm²', correct: false },
      { text: 'd = 14 cm, K ≈ 87,92 cm, L ≈ 615,44 cm²', correct: false },
      { text: 'd = 28 cm, K ≈ 615,44 cm, L ≈ 87,92 cm²', correct: false }
    ],
    reflection: 'Bagaimana cara kamu mengingat beda rumus keliling dan luas lingkaran?',
    hints: {
      concept: ['Diameter selalu dua kali jari-jari.', 'Keliling satu dimensi (cm), luas dua dimensi (cm²).'],
      strategy: ['K = 2πr; L = π × r × r.', 'Hitung r² dulu sebelum mengalikan π.'],
      calc: ['d = 2 × 14.', 'K = 2 × 3,14 × 14; L = 3,14 × 14 × 14.']
    }
  },
  {
    id: 'P-L2', module: 'lingkaran', title: 'Jarak tempuh roda kendaraan', icon: '🛵',
    context: 'Roda sepeda motor berdiameter 60 cm. Gunakan π = 3,14. Kendaraan menempuh 200 putaran penuh.',
    given: [
      { text: 'Diameter roda 60 cm', correct: true },
      { text: 'Putaran roda 200 kali', correct: true },
      { text: 'Gunakan π = 3,14', correct: true },
      { text: 'Jari-jari roda 60 cm', correct: false },
      { text: 'Putaran roda 20 kali', correct: false }
    ],
    askedKeywords: ['jarak', 'meter', 'putaran'],
    conceptOptions: ['Keliling lingkaran', 'Luas lingkaran', 'Deret geometri', 'Rasio barisan'],
    concept: 'Keliling lingkaran',
    strategyOptions: ['Hitung K = πd lalu × 200, lalu ubah ke meter', 'Hitung L = πr² lalu × 200', 'Hitung 60 × 200', 'Hitung d/2 × 200'],
    strategy: 'Hitung K = πd lalu × 200, lalu ubah ke meter',
    fields: [
      { key: 'd', label: 'Diameter (cm)', answer: 60, tolerance: 0 },
      { key: 'k', label: 'Keliling K (cm)', answer: 188.4, tolerance: 0.01 },
      { key: 'jarak', label: 'Jarak tempuh (m)', answer: 376.8, tolerance: 0.01 }
    ],
    conclusions: [
      { text: 'Jarak tempuh 376,8 m', correct: true },
      { text: 'Jarak tempuh 37.680 m', correct: false },
      { text: 'Jarak tempuh 188,4 m', correct: false },
      { text: 'Jarak tempuh 753,6 m', correct: false }
    ],
    reflection: 'Mengapa hasil akhir dinyatakan dalam meter, bukan sentimeter?',
    hints: {
      concept: ['Satu putaran roda = satu keliling.', 'K = πd, bukan πr².'],
      strategy: ['Jarak = keliling × banyak putaran.', '100 cm = 1 m.'],
      calc: ['K = 3,14 × 60 = 188,4 cm.', '188,4 × 200 = 37.680 cm = 376,8 m.']
    }
  },
  {
    id: 'P-L3', module: 'lingkaran', title: 'Juring taman sekolah', icon: '🌳',
    context: 'Taman lingkaran berjari-jari 20 m. Satu bagian berbentuk juring dengan sudut pusat 90° akan ditanami bunga. Gunakan π = 3,14.',
    given: [
      { text: 'Jari-jari 20 m', correct: true },
      { text: 'Sudut pusat juring 90°', correct: true },
      { text: 'Gunakan π = 3,14', correct: true },
      { text: 'Sudut pusat 180°', correct: false },
      { text: 'Diameter 20 m', correct: false }
    ],
    askedKeywords: ['busur', 'juring', 'luas'],
    conceptOptions: ['Busur dan juring', 'Barisan aritmatika', 'Geometri tak hingga', 'Tali busur'],
    concept: 'Busur dan juring',
    strategyOptions: ['Gunakan perbandingan 90/360 terhadap keliling dan luas', 'Gunakan 90 × 2πr', 'Gunakan luas lingkaran penuh saja', 'Bagi luas dengan 20'],
    strategy: 'Gunakan perbandingan 90/360 terhadap keliling dan luas',
    fields: [
      { key: 'r', label: 'Jari-jari (m)', answer: 20, tolerance: 0 },
      { key: 'busur', label: 'Panjang busur (m)', answer: 31.4, tolerance: 0.01 },
      { key: 'juring', label: 'Luas juring (m²)', answer: 314, tolerance: 0.01 }
    ],
    conclusions: [
      { text: 'Panjang busur 31,4 m dan luas juring 314 m²', correct: true },
      { text: 'Panjang busur 125,6 m dan luas juring 1.256 m²', correct: false },
      { text: 'Panjang busur 31,4 m dan luas juring 1.256 m²', correct: false },
      { text: 'Panjang busur 62,8 m dan luas juring 628 m²', correct: false }
    ],
    reflection: 'Mengapa luas juring 90° seperempat luas lingkaran penuh?',
    hints: {
      concept: ['90° adalah seperempat dari 360°.', 'Juring sebanding dengan sudut pusatnya.'],
      strategy: ['Panjang busur = (90/360) × 2πr.', 'Luas juring = (90/360) × πr².'],
      calc: ['2πr = 125,6 m; πr² = 1.256 m².', 'Bagi keduanya dengan 4.']
    }
  }
];

export const practiceByModule = id => PRACTICE.filter(p => p.module === id);
export const practiceById = id => PRACTICE.find(p => p.id === id);
