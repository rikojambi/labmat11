// Bank soal HOTS LABMAT SMK XI — tepat 20 soal.
// Distribusi: Aritmetika 6, Geometri 6, Lingkaran 8.
// Tipe: 10 pilihan ganda (single), 6 multiple response, 4 completion.
// Kognitif: C3=4, C4=7, C5=6, C6=3.
// Setiap soal punya >=1 varian parameter. Kunci dihitung dari parameter, bukan ditulis manual.

const PI = 3.14;
export const fmt = (n, digits = 0) => new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: digits, maximumFractionDigits: digits
}).format(Number(n.toFixed ? n.toFixed(digits + 2) : n));
const fmt2 = n => fmt(n, 2);

// Susun pilihan ganda; nilai indeks 0 adalah kunci, ditempatkan di posisi rot.
function single(values, rot = 0) {
  const arr = new Array(4); arr[rot % 4] = values[0];
  let j = 0; for (let i = 0; i < 4; i++) if (arr[i] === undefined) arr[i] = values[++j];
  return { options: arr.map((v, i) => ({ key: 'ABCD'[i], label: v })), correct: 'ABCD'[rot % 4] };
}
function multi(items, rot = 0) {
  const arr = [...items];
  const shift = rot % arr.length;
  const ordered = [...arr.slice(shift), ...arr.slice(0, shift)];
  return {
    options: ordered.map((it, i) => ({ key: 'ABCD'[i], label: it.text })),
    correct: ordered.map((it, i) => it.correct ? 'ABCD'[i] : null).filter(Boolean)
  };
}
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const journal = `Lengkapi jurnal proses: informasi diketahui, konsep, strategi, perhitungan, dan interpretasi.`

export const QUESTIONS = [
  // ---------- A. ARITMETIKA (6) ----------
  {
    id: 'A01', materi: 'aritmetika', tipe: 'single', level: 'C3',
    indikator: 'Mengidentifikasi beda dan menentukan suku ke-n barisan aritmatika',
    bobot: 5, topik: 'Produksi bengkel', journalRequired: false,
    variants: [{ a: 40, b: 12, n: 7, rot: 0 }, { a: 32, b: 15, n: 8, rot: 2 }, { a: 55, b: 9, n: 6, rot: 1 }],
    build(p) {
      const u = p.a + (p.n - 1) * p.b;
      return {
        prompt: `Bengkel "Roda Jaya" memproduksi <b>${p.a}</b> komponen pada bulan pertama. Setiap bulan produksinya naik tetap <b>${p.b}</b> komponen. Berapa komponen yang diproduksi pada bulan ke-${p.n}?`,
        ...single([`${fmt(u)} komponen`, `${fmt(p.a + p.n * p.b)} komponen`, `${fmt(p.a + (p.n - 2) * p.b)} komponen`, `${fmt((p.a + u) * p.n / 2)} komponen`], p.rot)
      };
    },
    pembahasan: p => `Kenaikan tetap ${p.b} berarti beda b = ${p.b}, a = ${p.a}. U${p.n} = a + (n−1)b = ${p.a} + ${p.n - 1} × ${p.b} = ${p.a + (p.n - 1) * p.b} komponen. Pilihan ${p.a + p.n * p.b} berasal dari kesalahan memakai n bukan n−1; angka ${(p.a + p.a + (p.n - 1) * p.b) * p.n / 2} adalah jumlah deret, bukan suku ke-n.`,
    rubrik: '2 poin: mengenali beda tetap; 2 poin: rumus Un = a+(n−1)b; 1 poin: perhitungan dan satuan benar.'
  },
  {
    id: 'A02', materi: 'aritmetika', tipe: 'single', level: 'C4',
    indikator: 'Menghitung jumlah n suku pertama deret aritmatika dari informasi suku awal dan akhir',
    bobot: 5, topik: 'Susunan kursi aula', journalRequired: false,
    variants: [{ a: 18, u: 45, n: 10, rot: 1 }, { a: 22, u: 58, n: 10, rot: 3 }, { a: 16, u: 46, n: 11, rot: 0 }],
    build(p) {
      const s = p.n * (p.a + p.u) / 2;
      return {
        prompt: `Baris pertama aula sekolah berisi <b>${p.a}</b> kursi dan baris ke-${p.n} berisi <b>${p.u}</b> kursi. Setiap baris bertambah tetap. Berapa total kursi pada ${p.n} baris?`,
        ...single([`${fmt(s)} kursi`, `${fmt(p.n * (p.a + p.u))} kursi`, `${fmt(p.n * p.u)} kursi`, `${fmt(p.n * p.a + (p.u - p.a))} kursi`], p.rot)
      };
    },
    pembahasan: p => `Diketahui a = ${p.a}, U${p.n} = ${p.u}. Rumus deret memakai suku pertama dan terakhir: S${p.n} = ½·n·(a + U n) = ½ × ${p.n} × (${p.a} + ${p.u}) = ${fmt(p.n * (p.a + p.u) / 2)} kursi. Kesalahan umum adalah lupa membagi dua atau menganggap semua baris sejumlah baris terakhir.`,
    rubrik: '2 poin: memilih rumus Sn dengan a dan Un; 2 poin: substitusi; 1 poin: hasil dan satuan kursi.'
  },
  {
    id: 'A03', materi: 'aritmetika', tipe: 'multiple', level: 'C4',
    indikator: 'Membedakan suku ke-n dan jumlah deret aritmatika dalam konteks tabungan',
    bobot: 6, topik: 'Tabungan rutin', journalRequired: false,
    reflection: 'Mengapa kamu membedakan suku ke-n dengan jumlah n suku pada kasus tabungan ini?',
    variants: [{ a: 150000, b: 25000, n: 12, rot: 1 }, { a: 120000, b: 35000, n: 10, rot: 2 }, { a: 200000, b: 50000, n: 8, rot: 0 }],
    build(p) {
      const u = p.a + (p.n - 1) * p.b, s = p.n * (p.a + u) / 2;
      return {
        prompt: `Siswa menabung Rp <b>${fmt(p.a)}</b> pada bulan pertama dan menambah Rp <b>${fmt(p.b)}</b> lebih banyak setiap bulan berikutnya. Pilih <b>semua</b> pernyataan yang benar untuk ${p.n} bulan!`,
        ...multi([
          { text: `Tabungan bulan ke-${p.n} = Rp ${fmt(u)}`, correct: true },
          { text: `Total tabungan ${p.n} bulan = Rp ${fmt(s)}`, correct: true },
          { text: `Tabungan bulan ke-${p.n} = Rp ${fmt(p.a + p.n * p.b)}`, correct: false },
          { text: `Total tabungan ${p.n} bulan = Rp ${fmt(p.n * (p.a + u))}`, correct: false }
        ], p.rot)
      };
    },
    pembahasan: p => { const u = p.a + (p.n - 1) * p.b; return `a = ${fmt(p.a)}, b = ${fmt(p.b)}. U${p.n} = ${fmt(p.a)} + ${p.n - 1}×${fmt(p.b)} = Rp ${fmt(u)}. S${p.n} = ½×${p.n}×(${fmt(p.a)}+${fmt(u)}) = Rp ${fmt(p.n * (p.a + u) / 2)}. Dua pernyataan lain salah karena memakai n sebagai pengali beda dan lupa faktor ½.`; },
    rubrik: '3 poin: dua pernyataan benar terpilih; 2 poin: tidak memilih distraktor; 1 poin: alasan pemilihan.'
  },
  {
    id: 'A04', materi: 'aritmetika', tipe: 'completion', level: 'C3',
    indikator: 'Menyebutkan nama selisih tetap pada barisan aritmatika',
    bobot: 4, topik: 'Pola bilangan', journalRequired: false,
    variants: [{ x: 12, y: 19, z: 26 }, { x: 7, y: 11, z: 15 }, { x: 45, y: 52, z: 59 }],
    build(p) { return { prompt: `Pada barisan ${p.x}, ${p.y}, ${p.z}, … selisih setiap dua suku berurutan disebut ...`, accepted: ['beda', 'selisih'] }; },
    pembahasan: p => `Selisih ${p.y} − ${p.x} = ${p.z} − ${p.y} tetap, sehingga disebut beda (selisih) barisan aritmatika.`,
    rubrik: '4 poin: satu kata/istilah tepat (beda atau selisih); jawaban panjang tidak diterima.'
  },
  {
    id: 'A05', materi: 'aritmetika', tipe: 'single', level: 'C5',
    indikator: 'Mengevaluasi pencapaian target produksi menggunakan suku ke-n',
    bobot: 6, topik: 'Target penjualan toko', journalRequired: true,
    variants: [{ a: 34, b: 6, n: 12, target: 90, rot: 2 }, { a: 28, b: 7, n: 12, target: 100, rot: 0 }, { a: 40, b: 5, n: 12, target: 95, rot: 3 }],
    build(p) {
      const u = p.a + (p.n - 1) * p.b, d = u - p.target;
      const correct = d === 0 ? `Tepat ${p.target} unit` : d > 0 ? `Tercapai, kelebihan ${d} unit` : `Tidak tercapai, kurang ${-d} unit`;
      const opposite = d >= 0 ? `Tidak tercapai, kurang ${Math.abs(d) + 2} unit` : `Tercapai, kelebihan ${-d + 2} unit`;
      return {
        prompt: `Toko "Mandiri" menjual <b>${p.a}</b> unit pada bulan pertama. Target penjualan naik <b>${p.b}</b> unit setiap bulan. Manajer menargetkan minimal <b>${p.target}</b> unit pada bulan ke-${p.n}. Apakah target tercapai?`,
        ...single([correct, opposite, `Tepat ${p.target + 1} unit`, 'Tidak dapat ditentukan dari data'], p.rot)
      };
    },
    followUp(p) {
      return {
        prompt: `Jika kenaikan tiap bulan ditambah 1 unit, berapa selisih penjualan bulan ke-${p.n} dibanding rencana semula? (dalam unit)`,
        answer: p.n - 1, satuan: 'unit',
        explanation: `Setiap kenaikan tambah 1 unit, suku ke-${p.n} bertambah (${p.n}−1)×1 = ${p.n - 1} unit, karena beda dikali n−1, bukan dikali n.`
      };
    },
    pembahasan: p => { const u = p.a + (p.n - 1) * p.b; return `U${p.n} = ${p.a} + ${p.n - 1}×${p.b} = ${u} unit. Dibanding target ${p.target} unit: ${u === p.target ? 'tepat sama' : u > p.target ? `lebih ${u - p.target} unit` : `kurang ${p.target - u} unit`}. Ini menuntut keputusan, bukan sekadar menghitung suku.`; },
    rubrik: '2 poin: U12 benar; 2 poin: perbandingan dengan target; 1 poin: keputusan disertai satuan; 1 poin: jurnal proses lengkap.'
  },
  {
    id: 'A06', materi: 'aritmetika', tipe: 'multiple', level: 'C5',
    indikator: 'Mengevaluasi pernyataan barisan dan deret pada pengelolaan persediaan',
    bobot: 6, topik: 'Persediaan gudang', journalRequired: true,
    reflection: 'Bagian mana yang paling sulit? Bagaimana kamu memeriksa kembali jumlah deretmu?',
    variants: [{ a: 120, b: 25, n: 8, rot: 1 }, { a: 90, b: 20, n: 10, rot: 3 }, { a: 150, b: 30, n: 6, rot: 0 }],
    build(p) {
      const u = p.a + (p.n - 1) * p.b, s = p.n * (p.a + u) / 2;
      return {
        prompt: `Barang masuk gudang minggu pertama sebanyak <b>${p.a}</b> unit dan bertambah <b>${p.b}</b> unit tiap minggu. Pilih <b>semua</b> pernyataan yang benar untuk ${p.n} minggu!`,
        ...multi([
          { text: `Jumlah barang minggu ke-${p.n} = ${fmt(u)} unit`, correct: true },
          { text: `Total barang masuk ${p.n} minggu = ${fmt(s)} unit`, correct: true },
          { text: `Total barang masuk ${p.n} minggu = ${fmt(p.n * (p.a + u))} unit`, correct: false },
          { text: 'Barisan ini geometri karena rasionya tetap', correct: false }
        ], p.rot)
      };
    },
    pembahasan: p => { const u = p.a + (p.n - 1) * p.b; return `Beda tetap ${p.b} → aritmatika, bukan geometri. U${p.n} = ${u} unit. S${p.n} = ½×${p.n}×(${p.a}+${u}) = ${fmt(p.n * (p.a + u) / 2)} unit.`; },
    rubrik: '3 poin: dua pernyataan benar; 2 poin: menolak distraktor; 1 poin: jurnal proses benar.'
  },

  // ---------- B. GEOMETRI (6) ----------
  {
    id: 'G01', materi: 'geometri', tipe: 'single', level: 'C3',
    indikator: 'Menentukan suku ke-n barisan geometri pada pertumbuhan bakteri',
    bobot: 5, topik: 'Pertumbuhan bakteri', journalRequired: false,
    variants: [{ a: 5, r: 2, n: 6, rot: 0 }, { a: 3, r: 3, n: 5, rot: 2 }, { a: 4, r: 2, n: 7, rot: 1 }],
    build(p) {
      const v = p.a * p.r ** p.n;
      return {
        prompt: `Laboratorium sekolah memiliki <b>${p.a}</b> koloni bakteri. Setiap jam jumlahnya menjadi <b>${p.r}</b> kali lipat. Berapa koloni pada akhir jam ke-${p.n}?`,
        ...single([`${fmt(v)} koloni`, `${fmt(p.a * p.r ** (p.n - 1))} koloni`, `${fmt(p.a * p.r * p.n)} koloni`, `${fmt(p.a + p.n * p.a * p.r)} koloni`], p.rot)
      };
    },
    pembahasan: p => `Awal (jam ke-0) = ${p.a}, rasio r = ${p.r}. Akhir jam ke-${p.n} berarti suku ke-${p.n + 1}: U = a·r^${p.n} = ${p.a}×${p.r}^${p.n} = ${fmt(p.a * p.r ** p.n)} koloni. Kesalahan umum: memakai pangkat ${p.n - 1} atau mengalikan, bukan memangkatkan.`,
    rubrik: '2 poin: mengenali rasio; 2 poin: pangkat n; 1 poin: hasil dan satuan koloni.'
  },
  {
    id: 'G02', materi: 'geometri', tipe: 'single', level: 'C4',
    indikator: 'Menghitung nilai akhir penyusutan dengan faktor pengali tetap',
    bobot: 5, topik: 'Penyusutan nilai mesin', journalRequired: false,
    variants: [{ a: 100, r: 0.8, n: 3, rot: 1 }, { a: 120, r: 0.9, n: 3, rot: 3 }, { a: 200, r: 0.5, n: 4, rot: 0 }],
    build(p) {
      const v = p.a * p.r ** p.n;
      return {
        prompt: `Mesin bernilai Rp <b>${p.a}</b> juta. Setiap tahun nilainya menjadi <b>${p.r * 100}%</b> dari nilai tahun sebelumnya. Berapa nilai mesin setelah ${p.n} tahun?`,
        ...single([`Rp ${fmt2(v)} juta`, `Rp ${fmt2(p.a * (1 - (1 - p.r) * p.n))} juta`, `Rp ${fmt2(p.a * p.r * p.n)} juta`, `Rp ${fmt2(p.a * p.r ** (p.n - 1))} juta`], p.rot)
      };
    },
    pembahasan: p => `Faktor tetap ${p.r} → geometri. Nilai setelah ${p.n} tahun = ${p.a} × ${p.r}^${p.n} = ${fmt2(p.a * p.r ** p.n)} juta. Penyusutan ${(1 - p.r) * 100}% dari nilai tahun berjalan, bukan dari nilai awal, sehingga model aritmetika ${fmt2(p.a * (1 - (1 - p.r) * p.n))} juta salah.`,
    rubrik: '2 poin: mengenali faktor pengali; 2 poin: pangkat n benar; 1 poin: pembuluhan dan satuan juta rupiah.'
  },
  {
    id: 'G03', materi: 'geometri', tipe: 'multiple', level: 'C4',
    indikator: 'Membedakan suku dan deret geometri pada investasi',
    bobot: 6, topik: 'Pertumbuhan investasi', journalRequired: false,
    reflection: 'Mengapa kamu memilih metode deret geometri untuk pertumbuhan investasi ini?',
    variants: [{ a: 1000000, r: 1.2, n: 5, rot: 2 }, { a: 500000, r: 1.1, n: 6, rot: 0 }, { a: 2000000, r: 1.5, n: 4, rot: 1 }],
    build(p) {
      const u = p.a * p.r ** (p.n - 1), s = p.a * (p.r ** p.n - 1) / (p.r - 1);
      return {
        prompt: `Modal investasi Rp <b>${fmt(p.a)}</b> berkembang dengan faktor <b>${p.r}</b> setiap periode. Pilih <b>semua</b> pernyataan yang benar untuk ${p.n} periode!`,
        ...multi([
          { text: `Nilai periode ke-${p.n} ≈ Rp ${fmt2(u)}`, correct: true },
          { text: `Total nilai ${p.n} periode ≈ Rp ${fmt2(s)}`, correct: true },
          { text: `Nilai periode ke-${p.n} ≈ Rp ${fmt2(p.a * p.r ** p.n)}`, correct: false },
          { text: `Total ${p.n} periode ≈ Rp ${fmt2(p.a * (p.r ** p.n - 1) / p.r)}`, correct: false }
        ], p.rot)
      };
    },
    pembahasan: p => `U${p.n} = a·r^${p.n - 1} = ${fmt2(p.a * p.r ** (p.n - 1))}. S${p.n} = a(r^${p.n}−1)/(r−1) = ${fmt2(p.a * (p.r ** p.n - 1) / (p.r - 1))}. Pangkat pada suku adalah n−1; penyebut deret adalah r−1, bukan r.`,
    rubrik: '3 poin: dua pernyataan benar; 2 poin: menolak distraktor pangkat/penyebut; 1 poin: refleksi singkat.'
  },
  {
    id: 'G04', materi: 'geometri', tipe: 'completion', level: 'C3',
    indikator: 'Menyebutkan nama perbandingan tetap pada barisan geometri',
    bobot: 4, topik: 'Pola bilangan', journalRequired: false,
    variants: [{ a: 3, b: 6, c: 12 }, { a: 5, b: 10, c: 20 }, { a: 7, b: 21, c: 63 }],
    build(p) { return { prompt: `Pada barisan ${p.a}, ${p.b}, ${p.c}, … perbandingan setiap suku terhadap suku sebelumnya disebut ...`, accepted: ['rasio', 'ratio'] }; },
    pembahasan: p => `${p.b}/${p.a} = ${p.c}/${p.b}, tetap. Perbandingan tetap ini disebut rasio.`,
    rubrik: '4 poin: satu kata tepat (rasio/ratio); kalimat panjang tidak diterima.'
  },
  {
    id: 'G05', materi: 'geometri', tipe: 'single', level: 'C5',
    indikator: 'Mengevaluasi hasil deret geometri terhadap target penyebaran informasi',
    bobot: 6, topik: 'Penyebaran informasi', journalRequired: true,
    variants: [{ a: 2, r: 3, n: 5, target: 200, rot: 1 }, { a: 1, r: 4, n: 4, target: 80, rot: 3 }, { a: 3, r: 2, n: 6, target: 150, rot: 0 }],
    build(p) {
      const s = p.a * (p.r ** p.n - 1) / (p.r - 1), d = s - p.target;
      const correct = d === 0 ? `Tepat ${p.target} orang` : d > 0 ? `Tercapai, lebih ${d} orang` : `Belum, kurang ${-d} orang`;
      const wrong = d >= 0 ? `Belum, kurang ${Math.abs(d) + 3} orang` : `Tercapai, lebih ${-d + 3} orang`;
      return {
        prompt: `Sebuah info lowongan dibagikan oleh <b>${p.a}</b> siswa. Setiap penerima meneruskan kepada <b>${p.r}</b> teman pada tahap berikutnya. Termasuk penyebar awal, apakah total orang yang mengetahui setelah ${p.n} tahap mencapai target <b>${p.target}</b> orang?`,
        ...single([correct, wrong, `Tepat ${fmt(p.a * p.r ** (p.n - 1))} orang`, 'Tidak dapat disimpulkan'], p.rot)
      };
    },
    followUp(p) {
      return {
        prompt: `Jika ditambah satu tahap lagi, berapa orang <b>baru</b> yang menerima info pada tahap tersebut? (dalam orang)`,
        answer: p.a * p.r ** p.n, satuan: 'orang',
        explanation: `Orang baru pada tahap berikutnya adalah suku ke-${p.n + 1} = a·r^${p.n} = ${p.a}×${p.r}^${p.n} = ${p.a * p.r ** p.n} orang. Ini berbeda dengan total kumulatif.`
      };
    },
    pembahasan: p => { const s = p.a * (p.r ** p.n - 1) / (p.r - 1); return `S${p.n} = ${p.a}(${p.r}^${p.n}−1)/(${p.r}−1) = ${s} orang. Dibanding target ${p.target}: ${s < p.target ? `kurang ${p.target - s} orang` : `lebih ${s - p.target} orang`}.`; },
    rubrik: '2 poin: model deret geometri tepat; 2 poin: perbandingan target; 1 poin: jurnal proses; 1 poin: konsistensi lanjutan.'
  },
  {
    id: 'G06', materi: 'geometri', tipe: 'multiple', level: 'C5',
    indikator: 'Menilai model geometri pada penyusutan kapasitas baterai',
    bobot: 6, topik: 'Kapasitas baterai', journalRequired: true,
    reflection: 'Apa arti hasil ini dalam kehidupan nyata bagi pemakaian baterai?',
    variants: [{ start: 100, keep: 0.95, n: 10, rot: 2 }, { start: 100, keep: 0.9, n: 8, rot: 0 }, { start: 200, keep: 0.85, n: 6, rot: 1 }],
    build(p) {
      const v = p.start * p.keep ** p.n;
      return {
        prompt: `Kapasitas baterai awal <b>${p.start}%</b>. Setiap siklus pengisian, kapasitas tersisa menjadi <b>${p.keep * 100}%</b> dari sebelumnya. Pilih <b>semua</b> pernyataan yang benar!`,
        ...multi([
          { text: `Kapasitas setelah ${p.n} siklus ≈ ${fmt2(v)}%`, correct: true },
          { text: `Barisan ini geometri dengan rasio r = ${p.keep}`, correct: true },
          { text: `Kapasitas turun ${fmt((1 - p.keep) * 100)}% dari kapasitas awal setiap siklus (model aritmetika)`, correct: false },
          { text: `Setelah ${p.n * 2} siklus kapasitas masih di atas 50%`, correct: false }
        ], p.rot)
      };
    },
    pembahasan: p => `Model geometri: U = ${p.start}×${p.keep}^${p.n} ≈ ${fmt2(p.start * p.keep ** p.n)}%. Penurunan persentase dihitung dari nilai sebelumnya, bukan nilai awal. Setelah ${p.n * 2} siklus: ${fmt2(p.start * p.keep ** (p.n * 2))}%, sudah di bawah 50%.`,
    rubrik: '3 poin: dua pernyataan benar; 2 poin: menolak model aritmetika; 1 poin: jurnal proses lengkap.'
  },

  // ---------- C. LINGKARAN (8) ----------
  {
    id: 'L01', materi: 'lingkaran', tipe: 'single', level: 'C4',
    indikator: 'Menghitung jarak tempuh roda dari keliling lingkaran',
    bobot: 5, topik: 'Roda sepeda motor', journalRequired: false,
    variants: [{ d: 60, put: 100, rot: 2 }, { d: 80, put: 50, rot: 0 }, { d: 50, put: 120, rot: 1 }],
    build(p) {
      const k = PI * p.d, m = k * p.put / 100;
      return {
        prompt: `Ban sepeda motor berdiameter <b>${p.d} cm</b>. Gunakan π = 3,14. Berapa jarak tempuh setelah <b>${p.put}</b> putaran penuh (dalam meter)?`,
        ...single([`${fmt(m, 1)} m`, `${fmt(k * p.put, 1)} cm`, `${fmt(m / 2, 1)} m`, `${fmt(m * 2, 1)} m`], p.rot)
      };
    },
    pembahasan: p => `K = πd = 3,14 × ${p.d} = ${fmt(PI * p.d)} cm. Jarak = ${fmt(PI * p.d)} × ${p.put} = ${fmt(PI * p.d * p.put)} cm = ${fmt(PI * p.d * p.put / 100)} m. Kesalahan umum: lupa mengubah cm menjadi m atau memakai jari-jari sebagai diameter.`,
    rubrik: '2 poin: keliling benar; 2 poin: dikali putaran; 1 poin: konversi cm ke m.'
  },
  {
    id: 'L02', materi: 'lingkaran', tipe: 'multiple', level: 'C4',
    indikator: 'Menghubungkan jari-jari, diameter, keliling, dan luas lingkaran',
    bobot: 6, topik: 'Komponen mesin', journalRequired: false,
    reflection: 'Bagaimana kamu memeriksa hasil perhitungan keliling dan luas lingkaran ini?',
    variants: [{ r: 10, rot: 1 }, { r: 12, rot: 3 }, { r: 8, rot: 0 }],
    build(p) {
      return {
        prompt: `Sebuah komponen mesin berbentuk lingkaran dengan jari-jari <b>${p.r} cm</b>. Gunakan π = 3,14. Pilih <b>semua</b> pernyataan yang benar!`,
        ...multi([
          { text: `Diameter komponen = ${2 * p.r} cm`, correct: true },
          { text: `Keliling komponen ≈ ${fmt(2 * PI * p.r)} cm`, correct: true },
          { text: `Luas komponen ≈ ${fmt(2 * PI * p.r * p.r)} cm²`, correct: false },
          { text: `Jari-jari komponen = ${2 * p.r} cm`, correct: false }
        ], p.rot)
      };
    },
    pembahasan: p => `d = 2r = ${2 * p.r} cm; K = 2πr = ${fmt(2 * PI * p.r)} cm; L = πr² = ${fmt(PI * p.r * p.r)} cm². Luas bukan 2πr² (itu dua kali luas), dan jari-jari tetap ${p.r} cm.`,
    rubrik: '3 poin: dua pernyataan benar; 2 poin: menolak distraktor; 1 poin: refleksi pemeriksaan.'
  },
  {
    id: 'L03', materi: 'lingkaran', tipe: 'single', level: 'C4',
    indikator: 'Menentukan jari-jari dari luas lingkaran yang diketahui',
    bobot: 5, topik: 'Taman sekolah', journalRequired: false,
    variants: [{ r: 10, rot: 0 }, { r: 15, rot: 2 }, { r: 20, rot: 3 }],
    build(p) {
      const L = PI * p.r * p.r;
      return {
        prompt: `Taman berbentuk lingkaran memiliki luas <b>${fmt(L)} m²</b>. Dengan π = 3,14, berapa jari-jari taman tersebut?`,
        ...single([`${p.r} m`, `${2 * p.r} m`, `${p.r / 2} m`, `${fmt(PI * p.r)} m`], p.rot)
      };
    },
    pembahasan: p => `L = πr² → r² = ${fmt(PI * p.r * p.r)}/3,14 = ${p.r * p.r}, sehingga r = ${p.r} m. Nilai ${2 * p.r} m adalah diameter, bukan jari-jari.`,
    rubrik: '2 poin: rumus L = πr²; 2 poin: akar kuadrat benar; 1 poin: satuan meter.'
  },
  {
    id: 'L04', materi: 'lingkaran', tipe: 'completion', level: 'C5',
    indikator: 'Mengidentifikasi unsur lingkaran berdasarkan definisinya',
    bobot: 4, topik: 'Unsur lingkaran', journalRequired: false,
    variants: [{ r: 10 }, { r: 14 }, { r: 25 }],
    build(p) { return { prompt: `Sebuah komponen lingkaran berjari-jari ${p.r} cm. Garis lurus melalui titik pusat yang menghubungkan dua titik pada lingkaran disebut ...`, accepted: ['diameter', 'diametar'] }; },
    pembahasan: () => 'Tali busur yang melalui pusat adalah diameter, panjangnya dua kali jari-jari.',
    rubrik: '4 poin: satu kata tepat (diameter); jawaban kalimat tidak diterima.'
  },
  {
    id: 'L05', materi: 'lingkaran', tipe: 'single', level: 'C5',
    indikator: 'Mengevaluasi kebenaran perhitungan panjang sabuk pada puli',
    bobot: 6, topik: 'Puli dan sabuk mesin', journalRequired: true,
    variants: [{ d: 28, put: 120, rot: 1 }, { d: 40, put: 100, rot: 3 }, { d: 20, put: 150, rot: 0 }],
    build(p) {
      const total = PI * p.d * p.put;
      return {
        prompt: `Puli mesin berdiameter <b>${p.d} cm</b>. Setelah <b>${p.put}</b> putaran, teknisi menuliskan panjang sabuk yang bergerak <b>${fmt(total)} cm</b>. Dengan π = 3,14, apakah catatan teknisi benar?`,
        ...single([
          `Benar, karena keliling × putaran = ${fmt(total)} cm`,
          `Salah, seharusnya ${fmt(total / 2)} cm`,
          `Salah, seharusnya ${fmt(total * 2)} cm`,
          `Benar, karena diameter × putaran = ${fmt(p.d * p.put)} cm`
        ], p.rot)
      };
    },
    pembahasan: p => `Keliling puli K = πd = 3,14 × ${p.d} = ${fmt(PI * p.d)} cm. Panjang sabuk = K × putaran = ${fmt(PI * p.d * p.put)} cm. Jadi catatan ${fmt(PI * p.d * p.put)} cm benar; mengalikan diameter langsung dengan putaran mengabaikan π.`,
    rubrik: '2 poin: keliling puli; 2 poin: kali putaran; 1 poin: keputusan benar/salah; 1 poin: jurnal proses.'
  },
  {
    id: 'L06', materi: 'lingkaran', tipe: 'multiple', level: 'C6',
    indikator: 'Menganalisis hubungan keliling, luas, dan putaran dua roda yang disambung sabuk',
    bobot: 7, topik: 'Sistem transmisi', journalRequired: true,
    reflection: 'Mengapa kamu memilih strategi perbandingan keliling, bukan perbandingan luas, untuk putaran?',
    variants: [{ r1: 10, r2: 20, rot: 2 }, { r1: 8, r2: 16, rot: 0 }, { r1: 12, r2: 24, rot: 1 }],
    build(p) {
      const k1 = 2 * PI * p.r1, k2 = 2 * PI * p.r2;
      return {
        prompt: `Dua roda berjari-jari <b>${p.r1} cm</b> dan <b>${p.r2} cm</b> disambung satu sabuk. Gunakan π = 3,14. Pilih <b>semua</b> pernyataan yang benar!`,
        ...multi([
          { text: 'Keliling roda kedua dua kali keliling roda pertama', correct: true },
          { text: `Jika sabuk bergerak ${fmt(k2)} cm, roda pertama berputar 2 kali`, correct: true },
          { text: 'Roda kedua berputar lebih banyak daripada roda pertama untuk jarak yang sama', correct: false },
          { text: 'Luas roda kedua empat kali luas roda pertama', correct: true }
        ], p.rot)
      };
    },
    pembahasan: p => `Keliling berbanding lurus dengan jari-jari: K₂/K₁ = ${p.r2}/${p.r1} = 2. Untuk jarak ${fmt(2 * PI * p.r2)} cm, roda pertama berputar ${fmt(2 * PI * p.r2)}/${fmt(2 * PI * p.r1)} = 2 kali. Luas berbanding lurus dengan kuadrat jari-jari: (${p.r2}/${p.r1})² = 4. Roda besar justru berputar lebih sedikit.`,
    rubrik: '4 poin: tiga pernyataan benar; 2 poin: menolak distraktor putaran; 1 poin: jurnal proses; 1 poin: refleksi.'
  },
  {
    id: 'L07', materi: 'lingkaran', tipe: 'completion', level: 'C6',
    indikator: 'Menganalisis perbandingan luas juring dari sudut pusat berbeda',
    bobot: 5, topik: 'Juring & sudut pusat', journalRequired: true,
    variants: [{ a1: 60, a2: 120 }, { a1: 40, a2: 80 }, { a1: 30, a2: 90 }],
    build(p) {
      const k = p.a2 / p.a1, words = { 2: 'dua', 3: 'tiga', 4: 'empat', 5: 'lima' };
      return {
        prompt: `Dua juring pada lingkaran yang sama berturut-turut memiliki sudut pusat <b>${p.a1}°</b> dan <b>${p.a2}°</b>. Luas juring kedua adalah <b>...</b> kali luas juring pertama. Isi dengan satu kata atau angka.`,
        accepted: [`${k}`, words[k] || `${k}`]
      };
    },
    pembahasan: p => `Pada lingkaran yang sama, L juring = (α/360°)πr², sehingga perbandingan luas juring sama dengan perbandingan sudut pusat: ${p.a2}°/${p.a1}° = ${p.a2 / p.a1}.`,
    rubrik: '3 poin: perbandingan sudut benar; 1 poin: jawaban satu kata/angka; 1 poin: jurnal proses.'
  },
  {
    id: 'L08', materi: 'lingkaran', tipe: 'single', level: 'C6',
    indikator: 'Mengambil keputusan kecukupan bahan tepi meja bundar',
    bobot: 7, topik: 'Meja bundar', journalRequired: true,
    variants: [{ d: 160, avail: 500, rot: 1 }, { d: 120, avail: 380, rot: 3 }, { d: 200, avail: 628, rot: 0 }],
    build(p) {
      const k = PI * p.d, diff = p.avail - k;
      const correct = diff === 0 ? 'Pas tepat, tidak ada sisa' : diff > 0 ? `Cukup, lebih ${fmt(diff, 1)} cm` : `Kurang ${fmt(-diff, 1)} cm`;
      const wrong = diff >= 0 ? `Kurang ${fmt(Math.abs(diff) + 10, 1)} cm` : `Cukup, lebih ${fmt(Math.abs(diff) + 10, 1)} cm`;
      return {
        prompt: `Meja bundar berdiameter <b>${p.d} cm</b> akan dipasang tepi kayu sepanjang <b>${p.avail} cm</b>. Dengan π = 3,14, apakah tepi kayu itu cukup?`,
        ...single([correct, wrong, `Kurang ${fmt(k, 1)} cm`, `Kurang ${fmt(Math.abs(diff) * 10, 1)} cm`], p.rot)
      };
    },
    pembahasan: p => `Keliling meja = πd = 3,14 × ${p.d} = ${fmt(PI * p.d, 1)} cm. Tersedia ${p.avail} cm, sehingga ${PI * p.d === p.avail ? 'pas tepat' : p.avail > PI * p.d ? `ada sisa ${fmt(p.avail - PI * p.d, 1)} cm` : `kurang ${fmt(PI * p.d - p.avail, 1)} cm`}. Keputusan harus berdasarkan keliling, bukan luas.`,
    rubrik: '3 poin: keliling benar; 2 poin: perbandingan dengan panjang tersedia; 1 poin: keputusan; 1 poin: jurnal proses.'
  }
];

// Validasi struktur bank soal (dipakai pengujian).
export const VALIDATION = {
  total: QUESTIONS.length,
  aritmetika: QUESTIONS.filter(q => q.materi === 'aritmetika').length,
  geometri: QUESTIONS.filter(q => q.materi === 'geometri').length,
  lingkaran: QUESTIONS.filter(q => q.materi === 'lingkaran').length,
  single: QUESTIONS.filter(q => q.tipe === 'single').length,
  multiple: QUESTIONS.filter(q => q.tipe === 'multiple').length,
  completion: QUESTIONS.filter(q => q.tipe === 'completion').length,
  levels: QUESTIONS.reduce((a, q) => (a[q.level] = (a[q.level] || 0) + 1, a), {})
};

export function renderQuestion(q, seed = 'LABMAT') {
  const idx = hashString(seed + '|' + q.id) % q.variants.length;
  const p = q.variants[idx];
  const content = q.build(p);
  return {
    id: q.id, materi: q.materi, tipe: q.tipe, level: q.level, indikator: q.indikator,
    bobot: q.bobot, topik: q.topik, journalRequired: q.journalRequired,
    reflection: q.reflection || null, rubrik: q.rubrik, variantIndex: idx, params: p,
    ...content
  };
}

export const VERIFICATION = [
  { id: 'V01', materi: 'aritmetika', konsep: 'Suku ke-n aritmatika', prompt: 'Sebuah usaha menyetor Rp 25.000 pada hari pertama dan menambah Rp 8.000 tiap hari. Berapa setoran hari ke-10 (dalam rupiah)?', answer: 97000, explanation: '25.000 + 9 × 8.000 = 97.000' },
  { id: 'V02', materi: 'aritmetika', konsep: 'Deret aritmatika', prompt: 'Barisan aritmatika memiliki a = 12 dan U9 = 48. Berapa S9?', answer: 270, explanation: 'S9 = ½ × 9 × (12 + 48) = 270' },
  { id: 'V03', materi: 'geometri', konsep: 'Suku ke-n geometri', prompt: 'Barisan geometri dengan a = 4 dan r = 3. Berapa suku ke-5?', answer: 324, explanation: '4 × 3⁴ = 324' },
  { id: 'V04', materi: 'lingkaran', konsep: 'Keliling lingkaran', prompt: 'Lingkaran berjari-jari 9 cm. Berapa kelilingnya? (π = 3,14, dalam cm)', answer: 56.52, explanation: '2 × 3,14 × 9 = 56,52 cm' },
  { id: 'V05', materi: 'lingkaran', konsep: 'Luas juring', prompt: 'Lingkaran jari-jari 10 cm memiliki juring bersudut 90°. Berapa luas juring itu? (π = 3,14, dalam cm²)', answer: 78.5, explanation: '(90/360) × 3,14 × 100 = 78,5 cm²' }
];
