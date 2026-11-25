// Latihan lanjutan di buku tulis: 2 soal per modul, berjenjang, kontekstual SMK.
// Jawaban SENGAJA tidak disimpan/ditampilkan di aplikasi siswa.

export const NOTEBOOK = [
  {
    id: 'N-A1', module: 'aritmetika', level: 'Dasar', title: 'Cadangan bahan praktik', icon: '🧵',
    prompt: 'Lab sekolah menyimpan 18 rol kawat di bulan pertama, lalu menambah 4 rol lebih banyak setiap bulan. Hitung jumlah rol selama 8 bulan dan tuliskan langkahnya di buku tulis.',
    instructions: [
      'Tulis kembali informasi yang diketahui dengan bahasamu sendiri.',
      'Tandai besaran yang tetap (beda/rasio).',
      'Tentukan apakah soal ini aritmatika atau geometri beserta alasannya.',
      'Tulis rumus yang dipakai sebelum memasukkan angka.',
      'Kerjakan substitusi dan perhitungan secara rapi.',
      'Tulis hasil akhir beserta satuan yang benar.',
      'Tulis satu kalimat penjelasan: kapan lab perlu menambah stok.'
    ],
    reflection: 'Bagian mana yang paling mudah salah saat menghitung deret? Mengapa?'
  },
  {
    id: 'N-A2', module: 'aritmetika', level: 'Lanjutan', title: 'Perbandingan dua skema upah magang', icon: '💼',
    prompt: 'Skema A memberi Rp 80.000 hari pertama dan naik Rp 10.000 per hari. Skema B memberi Rp 60.000 hari pertama dan naik 12% per hari. Bandingkan pendapatan hari ke-7. Tulis alasan pilihanmu untuk siswa kelas XI.',
    instructions: [
      'Tulis data kedua skema dalam tabel kecil di buku.',
      'Untuk setiap skema, tulis pola kenaikan (tetap atau persentase).',
      'Pilih rumus yang sesuai untuk masing-masing skema.',
      'Hitung suku ke-7 kedua skema secara terpisah.',
      'Bandingkan kedua hasil dengan tanda <, >, atau =.',
      'Tulis kesimpulan disertai alasan matematis.',
      'Tuliskan satu kalimat saran untuk teman yang memilih skema.'
    ],
    reflection: 'Mengapa kenaikan persentase bisa mengalahkan kenaikan tetap pada periode tertentu?'
  },
  {
    id: 'N-G1', module: 'geometri', level: 'Dasar', title: 'Diskon bertingkat di toko kelas', icon: '🏷️',
    prompt: 'Harga paket alat gambar Rp 120.000. Toko memberikan diskon 10% setiap minggu selama 4 minggu berturut-turut (dari harga minggu sebelumnya). Hitung harga minggu ke-4.',
    instructions: [
      'Tulis harga awal dan persentase diskon.',
      'Tentukan faktor pengali harga setelah diskon.',
      'Tulis rumus barisan geometri yang dipakai.',
      'Substitusikan nilai awal, rasio, dan n.',
      'Hitung harga minggu ke-4 dengan teliti.',
      'Tulis hasil akhir dalam rupiah.',
      'Bandingkan dengan diskon 40% sekali saja; tulis komentarmu.'
    ],
    reflection: 'Mengapa diskon bertingkat tidak sama dengan diskon langsung yang dijumlahkan?'
  },
  {
    id: 'N-G2', module: 'geometri', level: 'Lanjutan', title: 'Nilai jual mesin bubut', icon: '🔧',
    prompt: 'Mesin bubut dibeli Rp 35.000.000. Nilai jualnya turun 8% tiap tahun. Setelah 5 tahun, hitung nilai jualnya dan selisihnya terhadap harga beli. Tulis di buku tulis.',
    instructions: [
      'Tulis nilai awal dan faktor penyusutan.',
      'Tentukan suku ke berapa yang dicari.',
      'Tuliskan rumus barisan geometri.',
      'Hitung pangkat yang diperlukan langkah demi langkah.',
      'Hitung nilai akhir mesin.',
      'Hitung selisih harga beli dan nilai akhir.',
      'Tulis saran waktu terbaik untuk menjual mesin.'
    ],
    reflection: 'Bagaimana rasio kurang dari 1 memengaruhi nilai barang?'
  },
  {
    id: 'N-L1', module: 'lingkaran', level: 'Dasar', title: 'Keliling roda gerobak', icon: '🛒',
    prompt: 'Roda gerobak berdiameter 56 cm. Jika roda berputar 40 kali, berapa meter gerobak bergerak? Gunakan π = 3,14 dan tulis langkah perhitungan di buku tulis.',
    instructions: [
      'Tulis diameter dan jari-jari roda.',
      'Pilih apakah memakai rumus keliling atau luas.',
      'Tuliskan rumus keliling lingkaran.',
      'Substitusikan nilai π dan jari-jari.',
      'Hitung keliling satu putaran.',
      'Kalikan dengan banyak putaran dan ubah ke meter.',
      'Tulis kalimat penjelasan untuk pengguna gerobak.'
    ],
    reflection: 'Apa yang berubah jika roda diameter dua kali lebih besar?'
  },
  {
    id: 'N-L2', module: 'lingkaran', level: 'Lanjutan', title: 'Area taman dan jalur tanam', icon: '🌱',
    prompt: 'Taman berbentuk lingkaran jari-jari 7 m. Di dalamnya dibuat jalur cincin antara jari-jari 3 m dan 5 m untuk tanaman. Hitung luas jalur dan sisa area taman di luar jalur.',
    instructions: [
      'Gambar dua lingkaran konsentris di buku tulis.',
      'Tulis jari-jari dalam, tengah, dan luar.',
      'Tentukan rumus luas cincin.',
      'Hitung luas jalur tanam.',
      'Hitung luas seluruh taman.',
      'Hitung sisa area di luar jalur.',
      'Tulis alasan mengapa jalur cincin lebih efisien dari jalur persegi.'
    ],
    reflection: 'Kesalahan apa yang sering terjadi saat mengurangi luas dua lingkaran?'
  }
];

export const notebookById = id => NOTEBOOK.find(n => n.id === id);
export const notebookFor = module => NOTEBOOK.filter(n => n.module === module);
