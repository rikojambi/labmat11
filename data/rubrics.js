// Rubrik dan bobot penilaian. Bobot dapat diubah guru melalui sheet KONFIGURASI.
export const DEFAULT_WEIGHTS = { jawaban: 60, proses: 20, interpretasi: 10, refleksi: 10 };
export const MASTERY_MIN = 75;

export const PROCESS_RUBRIC = [
  { key: 'informasi', label: 'Informasi diketahui', max: 4, deskripsi: 'Mencantumkan data yang relevan dan mengabaikan data yang tidak perlu.' },
  { key: 'konsep', label: 'Konsep yang digunakan', max: 4, deskripsi: 'Menentukan konsep tepat (aritmetika/geometri/lingkaran) disertai alasan.' },
  { key: 'strategi', label: 'Strategi penyelesaian', max: 4, deskripsi: 'Memilih rumus/-langkah yang sesuai dengan pertanyaan.' },
  { key: 'perhitungan', label: 'Langkah perhitungan', max: 6, deskripsi: 'Substitusi dan operasi hitung benar serta konsisten satuannya.' },
  { key: 'interpretasi', label: 'Interpretasi hasil', max: 2, deskripsi: 'Menyatakan kesimpulan yang masuk akal dalam konteks.' }
];

export const INTERPRETATION_RUBRIC = [
  { skor: 2, deskripsi: 'Kesimpulan tepat, disertai satuan dan keputusan/implikasi nyata.' },
  { skor: 1, deskripsi: 'Kesimpulan benar tetapi belum lengkap atau kurang konteks.' },
  { skor: 0, deskripsi: 'Tidak ada interpretasi atau interpretasi bertentangan dengan hasil.' }
];

export const REFLECTION_RUBRIC = [
  { skor: 2, deskripsi: 'Menjelaskan alasan strategi, kesulitan, dan cara memeriksa hasil secara spesifik.' },
  { skor: 1, deskripsi: 'Refleksi singkat tetapi relevan.' },
  { skor: 0, deskripsi: 'Kosong, terlalu pendek, atau tidak relevan.' }
];

export const GRADE_LABELS = [
  { min: 90, label: 'Sangat Baik', color: '#22a06b' },
  { min: 75, label: 'Baik / Tuntas', color: '#20c7b7' },
  { min: 60, label: 'Cukup', color: '#e58a21' },
  { min: 0, label: 'Perlu Pendampingan', color: '#dc4c5c' }
];
export const gradeLabel = n => GRADE_LABELS.find(g => n >= g.min) || GRADE_LABELS.at(-1);

export const REMEDIAL = {
  aritmetika: 'Ulangi simulasi tabungan dan latihan P-A1. Fokus membedakan suku ke-n (U) dengan jumlah deret (S).',
  geometri: 'Ulangi simulasi pertumbuhan dengan slider rasio. Perhatikan pangkat n−1 pada suku dan penyebut r−1 pada deret.',
  lingkaran: 'Ulangi visualisasi jari-jari → diameter → keliling → luas. Latih konversi cm ke m pada soal roda.'
};
