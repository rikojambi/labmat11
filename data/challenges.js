// Tantangan dunia kerja berdasarkan program keahlian + preset kalkulator eksplorasi.
export const CHALLENGES = {
  TSM: [
    { id: 'C-TSM1', judul: 'Putaran roda bengkel', materi: 'lingkaran', prompt: 'Ban mobil berdiameter 64 cm. Teknisi ingin mengetahui jarak setelah 250 putaran. Berapa jaraknya dalam meter? (π = 3,14)', answer: 502.4, satuan: 'm', pembahasan: 'K = 3,14 × 64 = 200,96 cm; × 250 = 50.240 cm = 502,4 m.' },
    { id: 'C-TSM2', judul: 'Puli dan sabuk', materi: 'lingkaran', prompt: 'Puli berjari-jari 12 cm berputar 80 kali. Berapa panjang sabuk yang bergerak? (π = 3,14, cm)', answer: 6030.72, satuan: 'cm', pembahasan: 'K = 2 × 3,14 × 12 = 75,36 cm; × 80 = 6.030,72 cm.' },
    { id: 'C-TSM3', judul: 'Produksi bengkel', materi: 'aritmetika', prompt: 'Bengkel membuat 18 komponen hari pertama dan naik 6 komponen tiap hari. Berapa produksi hari ke-12?', answer: 84, satuan: 'komponen', pembahasan: 'U12 = 18 + 11 × 6 = 84 komponen.' },
    { id: 'C-TSM4', judul: 'Rasio transmisi', materi: 'geometri', prompt: 'Gear kecil berjari-jari 5 cm menggerakkan gear besar 15 cm. Jika gear kecil 90 putaran, berapa putaran gear besar?', answer: 30, satuan: 'putaran', pembahasan: 'Perbandingan jari-jari 5:15 = 1:3, sehingga putaran gear besar = 90/3 = 30.' }
  ],
  PEMASARAN: [
    { id: 'C-PM1', judul: 'Target omzet', materi: 'aritmetika', prompt: 'Omzet bulan pertama Rp 40 juta dan naik tetap Rp 6 juta tiap bulan. Berapa omzet bulan ke-9? (juta Rp)', answer: 88, satuan: 'juta Rp', pembahasan: 'U9 = 40 + 8 × 6 = 88 juta.' },
    { id: 'C-PM2', judul: 'Total penjualan', materi: 'aritmetika', prompt: 'Barisan penjualan a = 25 unit, U8 = 53 unit. Berapa total 8 bulan?', answer: 312, satuan: 'unit', pembahasan: 'S8 = ½ × 8 × (25 + 53) = 312 unit.' },
    { id: 'C-PM3', judul: 'Pertumbuhan omzet', materi: 'geometri', prompt: 'Omzet Rp 10 juta naik 10% tiap bulan. Berapa omzet bulan ke-4? (juta Rp, 2 angka desimal)', answer: 13.31, satuan: 'juta Rp', pembahasan: '10 × 1,1³ = 13,31 juta.' },
    { id: 'C-PM4', judul: 'Persediaan gudang', materi: 'aritmetika', prompt: 'Stok awal 80 unit dan bertambah 12 unit tiap minggu. Berapa total stok masuk 6 minggu?', answer: 660, satuan: 'unit', pembahasan: 'U6 = 80 + 5×12 = 140; S6 = ½×6×(80+140) = 660 unit.' }
  ],
  PPLG: [
    { id: 'C-PPLG1', judul: 'Pertumbuhan pengguna', materi: 'geometri', prompt: 'Pengguna aplikasi 500 orang dan bertambah 20% tiap bulan. Berapa pengguna bulan ke-5?', answer: 1036.8, satuan: 'orang', pembahasan: '500 × 1,2⁴ = 1.036,8 ≈ 1.037 orang.' },
    { id: 'C-PPLG2', judul: 'Kapasitas penyimpanan', materi: 'geometri', prompt: 'Kapasitas data 100 GB dan berkembang faktor 1,5 tiap bulan. Berapa kapasitas bulan ke-4? (GB)', answer: 337.5, satuan: 'GB', pembahasan: '100 × 1,5³ = 337,5 GB.' },
    { id: 'C-PPLG3', judul: 'Pola log harian', materi: 'aritmetika', prompt: 'Log harian hari pertama 120 baris dan naik 15 baris tiap hari. Berapa total 10 hari?', answer: 1875, satuan: 'baris', pembahasan: 'U10 = 120 + 9×15 = 255; S10 = ½×10×(120+255) = 1.875 baris.' },
    { id: 'C-PPLG4', judul: 'Cache berbentuk cincin', materi: 'lingkaran', prompt: 'Buffer melingkar jari-jari 8 cm. Berapa kelilingnya? (π = 3,14, cm)', answer: 50.24, satuan: 'cm', pembahasan: 'K = 2 × 3,14 × 8 = 50,24 cm.' }
  ],
  UMUM: [
    { id: 'C-U1', judul: 'Tabungan semester', materi: 'aritmetika', prompt: 'Menabung Rp 100.000 awal dan naik Rp 25.000 tiap minggu. Berapa tabungan minggu ke-8?', answer: 275000, satuan: 'Rp', pembahasan: '100.000 + 7 × 25.000 = 275.000.' },
    { id: 'C-U2', judul: 'Meja bundar', materi: 'lingkaran', prompt: 'Meja berdiameter 120 cm. Berapa panjang tepi yang dibutuhkan? (π = 3,14, cm)', answer: 376.8, satuan: 'cm', pembahasan: 'K = 3,14 × 120 = 376,8 cm.' },
    { id: 'C-U3', judul: 'Pantulan bola', materi: 'geometri', prompt: 'Bola dijatuhkan dari 200 cm, setiap pantulan 0,5 kali tinggi sebelumnya. Berapa tinggi pantulan ke-3?', answer: 25, satuan: 'cm', pembahasan: '200 × 0,5³ = 25 cm.' }
  ]
};

export const programKeys = Object.keys(CHALLENGES);
export const challengesFor = program => {
  const key = String(program || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (CHALLENGES[key]) return CHALLENGES[key];
  if (key.includes('TSM') || key.includes('OTO') || key.includes('MEKANIK')) return CHALLENGES.TSM;
  if (key.includes('PEMASARAN') || key.includes('MARKETING') || key.includes('BISNIS')) return CHALLENGES.PEMASARAN;
  if (key.includes('PPLG') || key.includes('INFORMATIKA') || key.includes('RPL') || key.includes('TI')) return CHALLENGES.PPLG;
  return CHALLENGES.UMUM;
};

export const CALC_PRESETS = [
  { id: 'arith', label: 'Barisan Aritmatika', fields: ['a', 'b', 'n'], hint: 'Un = a + (n−1)b; Sn = ½n(a + Un)' },
  { id: 'geo', label: 'Barisan Geometri', fields: ['a', 'r', 'n'], hint: 'Un = a·r^(n−1); Sn = a(rⁿ−1)/(r−1)' },
  { id: 'circle', label: 'Lingkaran & Juring', fields: ['r', 'α'], hint: 'K = 2πr; L = πr²; busur = α/360·K; juring = α/360·L' }
];
