// Materi pembelajaran LABMAT SMK XI — disimpan lokal, dapat dibaca offline.
export const MODULES = [
  {
    id: 'aritmetika', no: 1, title: 'Barisan & Deret Aritmatika', icon: '📈', cls: '',
    subtitle: 'Pola pertambahan tetap dalam tabungan, produksi, dan susunan kursi.',
    objectives: [
      'Mengidentifikasi pola barisan aritmatika dari situasi nyata',
      'Menentukan suku ke-n dengan rumus Un = a + (n−1)b',
      'Menghitung jumlah n suku pertama deret aritmatika',
      'Menginterpretasikan hasil perhitungan dalam konteks dunia kerja'
    ],
    indicators: ['Mengidentifikasi beda barisan', 'Menentukan suku ke-n', 'Menghitung jumlah deret', 'Mengevaluasi keputusan berdasarkan deret'],
    sections: [
      { title: 'Pengertian Pola Bilangan', html: `<p>Pola bilangan adalah keteraturan yang dapat diamati pada sekumpulan bilangan. Di bengkel, pola muncul pada jumlah komponen yang dibuat tiap minggu; di toko, pola muncul pada target penjualan bulanan.</p><div class="mathbox">Contoh pola: 12, 19, 26, 33, 40, … (bertambah 7 setiap langkah)</div><p>Dengan mengenali pola, kita dapat memprediksi nilai berikutnya tanpa menghitung satu per satu.</p>` },
      { title: 'Barisan Aritmatika dan Beda', html: `<p><strong>Barisan aritmatika</strong> adalah barisan bilangan yang selisih dua suku berurutan selalu tetap. Selisih tetap ini disebut <strong>beda</strong> atau <strong>selisih</strong>, dilambangkan <em>b</em>.</p><div class="mathbox">b = U<sub>n</sub> − U<sub>n−1</sub> &nbsp; dan &nbsp; U<sub>n</sub> = a + (n − 1)b</div><p><em>a</em> adalah suku pertama, <em>n</em> adalah nomor suku yang dicari.</p>` },
      { title: 'Deret Aritmatika', html: `<p><strong>Deret aritmatika</strong> adalah jumlah suku-suku barisan aritmatika. Jika barisan menjawab “berapa pada periode tertentu?”, deret menjawab “berapa total seluruh periode?”.</p><div class="mathbox">S<sub>n</sub> = 1/2 · n · (2a + (n − 1)b) = 1/2 · n · (a + U<sub>n</sub>)</div><div class="notice">Hubungan barisan dan deret: deret dibentuk dari penjumlahan barisan. S<sub>n</sub> − S<sub>n−1</sub> = U<sub>n</sub>.</div>` },
      { title: 'Kapan Dipakai?', html: `<p>Gunakan aritmatika jika perubahan tiap periode <strong>sama besarnya</strong>, bukan sama persentasenya. Contoh: menabung Rp 200.000 setiap bulan (tetap), kenaikan gaji Rp 350.000 per tahun, atau produksi bengkel yang naik 8 unit per hari.</p>` }
    ],
    applications: [
      { icon: '💰', title: 'Tabungan rutin', text: 'Setiap bulan menyisihkan nominal tetap, total tabungan membentuk deret.' },
      { icon: '📈', title: 'Kenaikan gaji berkala', text: 'Kenaikan Rp tetap tiap tahun → barisan aritmatika.' },
      { icon: '🔧', title: 'Produksi bengkel', text: 'Jumlah komponen dirakit naik tetap tiap hari.' },
      { icon: '🪑', title: 'Susunan kursi aula', text: 'Baris kursi bertambah tetap agar tetap rapi.' },
      { icon: '📦', title: 'Barang di gudang', text: 'Stok masuk bertambah tetap tiap minggu.' },
      { icon: '🏪', title: 'Target penjualan toko', text: 'Target naik tetap per bulan untuk perencanaan omzet.' },
      { icon: '🏍️', title: 'Biaya perawatan kendaraan', text: 'Biaya servis rutin dapat diprediksi dengan pola tetap.' }
    ],
    examples: [
      { title: 'Tabungan untuk modal usaha', known: 'Andi menabung Rp 150.000 pada bulan pertama. Setiap bulan berikutnya ia menambah Rp 25.000 lebih banyak dari bulan sebelumnya.', asked: 'Berapa tabungan_ANDI pada bulan ke-12 dan berapa total tabungan selama 12 bulan?', strategy: 'Kenaikan tetap Rp 25.000 → barisan aritmatika dengan a = 150.000, b = 25.000, n = 12. Cari U12 lalu S12.', calc: 'U<sub>12</sub> = 150.000 + 11 × 25.000 = Rp 425.000<br>S<sub>12</sub> = ½ × 12 × (150.000 + 425.000) = Rp 3.450.000', conclude: 'Pada bulan ke-12 Andi menabung Rp 425.000, dan total tabungan 12 bulan Rp 3.450.000 — cukup untuk modal awal usaha jasa servis.' },
      { title: 'Susunan kursi aula sekolah', known: 'Baris pertama aula berisi 18 kursi. Setiap baris berikutnya ditambah 3 kursi hingga baris ke-15.', asked: 'Berapa kursi pada baris terakhir dan berapa kapasitas aula?', strategy: 'a = 18, b = 3, n = 15. Suku ke-15 memberi kursi baris terakhir; deret memberi kapasitas.', calc: 'U<sub>15</sub> = 18 + 14 × 3 = 60 kursi<br>S<sub>15</sub> = ½ × 15 × (18 + 60) = 585 kursi', conclude: 'Baris terakhir berisi 60 kursi dan kapasitas aula 585 kursi, lebih dari cukup untuk 540 peserta workshop.' },
      { title: 'Target produksi bengkel', known: 'Sebuah bengkel memproduksi 40 komponen pada minggu pertama dan menaikkan produksi 12 komponen tiap minggu.', asked: 'Pada minggu ke berapa produksi pertama kali mencapai minimal 150 komponen?', strategy: 'U<sub>n</sub> = 40 + (n−1)12. Selesaikan pertidaksamaan 40 + 12(n−1) ≥ 150.', calc: '12(n−1) ≥ 110 → n−1 ≥ 9,17 → n ≥ 10,17.<br>Karena n bilangan bulat, diambil n = 11.<br>U<sub>10</sub> = 148; U<sub>11</sub> = 160.', conclude: 'Target baru tercapai pada minggu ke-11 dengan produksi 160 komponen. Minggu ke-10 masih kurang 2 komponen.' }
    ]
  },
  {
    id: 'geometri', no: 2, title: 'Barisan & Deret Geometri', icon: '🧬', cls: 'geo',
    subtitle: 'Pola perkalian tetap: pertumbuhan, penyusutan, dan penyebaran informasi.',
    objectives: [
      'Mengidentifikasi rasio pada barisan geometri',
      'Menentukan suku ke-n dan jumlah n suku pertama',
      'Menjelaskan syarat konvergensi deret geometri tak hingga',
      'Mengambil keputusan dari simulasi pertumbuhan atau penyusutan'
    ],
    indicators: ['Mengidentifikasi rasio', 'Menentukan suku ke-n geometri', 'Menghitung deret geometri', 'Mengevaluasi konvergensi dan keputusan'],
    sections: [
      { title: 'Barisan Geometri dan Rasio', html: `<p><strong>Barisan geometri</strong> adalah barisan yang setiap sukunya diperoleh dengan mengalikan suku sebelumnya dengan suatu bilangan tetap. Bilangan tetap itu disebut <strong>rasio</strong> (<em>r</em>).</p><div class="mathbox">r = U<sub>n</sub> / U<sub>n−1</sub> &nbsp; dan &nbsp; U<sub>n</sub> = a · r<sup>n−1</sup></div><p>Contoh: 3, 6, 12, 24, … memiliki a = 3 dan r = 2. Pertumbuhan bakteri dan penyebaran informasi mengikuti pola ini.</p>` },
      { title: 'Deret Geometri', html: `<p><strong>Deret geometri</strong> adalah jumlah suku-suku barisan geometri.</p><div class="mathbox">S<sub>n</sub> = a(r<sup>n</sup> − 1)/(r − 1), &nbsp; r ≠ 1</div><p>Jika r = 1, berlaku S<sub>n</sub> = n · a.</p>` },
      { title: 'Deret Geometri Tak Hingga', html: `<p>Deret geometri tak hingga dapat dijumlahkan jika <strong>|r| &lt; 1</strong> (konvergen). Jika |r| ≥ 1, jumlahnya tidak hingga (divergen).</p><div class="mathbox">S<sub>∞</sub> = a/(1 − r), &nbsp; untuk |r| &lt; 1</div><div class="notice warn">Contoh penyusutan nilai barang dengan faktor 0,8 tiap tahun termasuk konvergen, tetapi jumlah tak hingga tidak bermakna fisik jika periode dibatasi umur pakai.</div>` },
      { title: 'Aritmatika atau Geometri?', html: `<p>Tanyakan: perubahannya <strong>tetap besarnya</strong> (aritmatika) atau <strong>tetap persentasenya</strong> (geometri)? Bunga 5% per tahun → geometri. Diskon Rp 50.000 per bulan → aritmatika.</p>` }
    ],
    applications: [
      { icon: '🦠', title: 'Pertumbuhan bakteri', text: 'Jumlah bakteri berlipat setiap periode tertentu.' },
      { icon: '📉', title: 'Penyusutan nilai barang', text: 'Nilai jual mesin turun persentase tetap tiap tahun.' },
      { icon: '💹', title: 'Pertumbuhan investasi', text: 'Modal berkembang dengan bunga majemuk.' },
      { icon: '📱', title: 'Penyebaran informasi', text: 'Satu orang memberitahu beberapa orang, dan seterusnya.' },
      { icon: '🏭', title: 'Pelipatan produksi', text: 'Kapasitas produksi naik kelipatan tiap shift.' },
      { icon: '🏀', title: 'Pantulan bola', text: 'Tinggi pantulan menjadi pecahan tetap dari tinggi sebelumnya.' },
      { icon: '🔋', title: 'Kapasitas baterai', text: 'Kapasitas tersisa turun persentase tetap tiap siklus.' }
    ],
    examples: [
      { title: 'Pertumbuhan bakteri di laboratorium', known: 'Awalnya ada 5 koloni bakteri. Setiap jam jumlahnya menjadi 2 kali lipat.', asked: 'Berapa koloni setelah 6 jam dan kapan jumlah melebihi 1.000 koloni?', strategy: 'a = 5, r = 2 → U<sub>n</sub> = 5 · 2<sup>n−1</sup>. Uji beberapa nilai n.', calc: 'U<sub>7</sub> = 5 · 2<sup>6</sup> = 320 koloni (setelah 6 jam).<br>U<sub>9</sub> = 5 · 2<sup>8</sup> = 1.280 koloni.', conclude: 'Setelah 6 jam ada 320 koloni; jumlah melebihi 1.000 pada jam ke-8.' },
      { title: 'Penyusutan nilai mesin bubut', known: 'Mesin bubut bernilai Rp 100 juta dibeli tahun 2024. Nilainya turun 20% setiap tahun.', asked: 'Berapa nilai mesin setelah 3 tahun?', strategy: 'Penyusutan persentase tetap → geometri dengan a = 100, r = 0,8, n = 4 suku (tahun 0, 1, 2, 3).', calc: 'U<sub>4</sub> = 100 · 0,8<sup>3</sup> = 51,2 juta rupiah.', conclude: 'Nilai mesin setelah 3 tahun sekitar Rp 51,2 juta. Selisih penyusutannya tidak tetap tiap tahun, sehingga bukan aritmatika.' },
      { title: 'Penyebaran info lowongan magang', known: 'Ketua kelas memberitahu 2 teman. Setiap teman yang menerima info memberitahu 2 teman baru pada tahap berikutnya.', asked: 'Berapa total orang yang mengetahui setelah 5 tahap jika target 60 orang?', strategy: 'a = 1, r = 2, n = 5. Hitung deret geometri S<sub>5</sub>.', calc: 'S<sub>5</sub> = 1(2<sup>5</sup> − 1)/(2 − 1) = 31 orang.<br>Tahap ke-6: S<sub>6</sub> = 63 orang.', conclude: 'Setelah 5 tahap baru 31 orang tahu, jadi target 60 belum tercapai. Tahap ke-6 akan melampaui target.' }
    ]
  },
  {
    id: 'lingkaran', no: 3, title: 'Lingkaran & Penerapannya', icon: '⚙️', cls: 'circle',
    subtitle: 'Unsur lingkaran, keliling, luas, busur, dan juring pada roda serta mesin.',
    objectives: [
      'Menjelaskan unsur-unsur lingkaran dan hubungannya',
      'Menghitung keliling dan luas lingkaran',
      'Menghitung panjang busur dan luas juring',
      'Menyelesaikan masalah kontekstual roda, puli, dan tangki'
    ],
    indicators: ['Mengidentifikasi unsur lingkaran', 'Menghubungkan jari-jari, diameter, keliling, luas', 'Menghitung busur dan juring', 'Mengevaluasi solusi dunia kerja'],
    sections: [
      { title: 'Unsur-Unsur Lingkaran', html: `<p><strong>Lingkaran</strong> adalah kumpulan titik yang berjarak sama dari satu titik tetap bernama <strong>titik pusat (O)</strong>. Jarak tetap itu disebut <strong>jari-jari (r)</strong>.</p><ul><li><strong>Diameter (d)</strong>: tali busur melalui pusat; d = 2r.</li><li><strong>Tali busur</strong>: ruas garis yang menghubungkan dua titik pada lingkaran.</li><li><strong>Busur</strong>: bagian keliling lingkaran yang dibatasi dua titik.</li><li><strong>Juring</strong>: daerah yang dibatasi dua jari-jari dan sebuah busur.</li><li><strong>Tembereng</strong>: daerah antara tali busur dan busurnya.</li><li><strong>Sudut pusat</strong>: sudut dengan titik puncak di pusat; <strong>sudut keliling</strong>: titik puncak di keliling, besarnya setengah sudut pusat yang menghadap busur sama.</li></ul>` },
      { title: 'Keliling & Luas', html: `<div class="mathbox">K = 2πr = πd &nbsp;&nbsp;·&nbsp;&nbsp; L = πr²</div><p>Dalam aplikasi sekolah gunakan π ≈ 3,14 kecuali soal menentukan lain. Satuan keliling cm/m, satuan luas cm²/m².</p>` },
      { title: 'Busur & Juring', html: `<p>Jika sudut pusat <em>α</em> (derajat), maka panjang busur dan luas juring merupakan bagian proporsional dari lingkaran penuh (360°).</p><div class="mathbox">Panjang busur = α/360° × 2πr &nbsp;&nbsp;·&nbsp;&nbsp; Luas juring = α/360° × πr²</div><div class="notice">Perbandingan dua juring pada lingkaran yang sama sama dengan perbandingan sudut pusatnya.</div>` },
      { title: 'Di Dunia Kerja', html: `<p>Jarak yang ditempuh kendaraan = keliling roda × jumlah putaran. Panjang sabuk yang berputar pada puli dihitung dengan cara sama. Untuk tangki silinder, luas penampang lingkaran dikali tinggi memberi volume.</p>` }
    ],
    applications: [
      { icon: '🏍️', title: 'Roda sepeda motor', text: 'Jarak tempuh = keliling ban × putaran roda.' },
      { icon: '🚚', title: 'Roda kendaraan', text: 'Ukuran ban memengaruhi pembacaan odometer.' },
      { icon: '⚙️', title: 'Puli dan sabuk mesin', text: 'Putaran puli menentukan panjang sabuk yang bergerak.' },
      { icon: '🔩', title: 'Gear & transmisi', text: 'Perbandingan jari-jari gear menentukan rasio putaran.' },
      { icon: '🧯', title: 'Pipa & tangki silinder', text: 'Luas penampang menentukan kapasitas tangki.' },
      { icon: '🪑', title: 'Meja bundar', text: 'Keliling menentukan panjang tepi meja.' },
      { icon: '🌳', title: 'Taman berbentuk lingkaran', text: 'Luas menentukan kebutuhan rumput dan pupuk.' },
      { icon: '🛠️', title: 'Komponen mesin bubut', text: 'Diameter benda kerja menentukan putaran spindle.' }
    ],
    examples: [
      { title: 'Jarak tempuh sepeda motor', known: 'Ban sepeda motor berdiameter 60 cm. Gunakan π = 3,14. Odometer mencatat 150 putaran roda.', asked: 'Berapa jarak yang ditempuh dalam meter?', strategy: 'Satu putaran = keliling ban. Hitung K = πd, kalikan putaran, lalu ubah cm ke m.', calc: 'K = 3,14 × 60 = 188,4 cm<br>Jarak = 188,4 × 150 = 28.260 cm = 282,6 m', conclude: 'Sepeda motor menempuh sekitar 282,6 m. Jika dikira-kira dengan diameter langsung, hasilnya salah.' },
      { title: 'Sabuk puli mesin produksi', known: 'Puli mesin berjari-jari 14 cm berputar 100 kali per menit. Gunakan π = 3,14.', asked: 'Berapa panjang sabuk yang bergerak per menit?', strategy: 'Keliling puli dikali jumlah putaran.', calc: 'K = 2 × 3,14 × 14 = 87,92 cm<br>Panjang sabuk = 87,92 × 100 = 8.792 cm = 87,92 m', conclude: 'Sabuk bergerak 87,92 m per menit. Teknisi dapat memakai angka ini untuk memilih panjang sabuk cadangan.' },
      { title: 'Luas juring taman sekolah', known: 'Taman berbentuk lingkaran berjari-jari 20 m. Sudut pusat area bunga 90°. Gunakan π = 3,14.', asked: 'Berapa luas area bunga dan panjang tepi busurnya?', strategy: '90° = ¼ × 360°, jadi luas juring dan busur seperempat dari lingkaran penuh.', calc: 'L lingkaran = 3,14 × 20² = 1.256 m²<br>L juring = ¼ × 1.256 = 314 m²<br>K = 2 × 3,14 × 20 = 125,6 m<br>Busur = ¼ × 125,6 = 31,4 m', conclude: 'Area bunga seluas 314 m² dengan panjang tepi busur 31,4 m, sehingga dibutuhkan pagi atau pot bunga sepanjang itu.' }
    ]
  }
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));
export const getModule = id => MODULE_BY_ID[id] || MODULES[0];
