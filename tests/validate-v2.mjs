// Validasi fitur revisi v2: waktu, anomali, uraian, buku tulis, alur, umpan balik, backend, PWA.
import { readFileSync } from 'node:fs';
import { ESSAYS, essaysFor } from '../data/essays.js';
import { NOTEBOOK, notebookFor } from '../data/notebook.js';
import { QUESTIONS } from '../data/questions.js';
import { ALLOWED_SECONDS, normalizeLimit } from '../js/timing.js';
import { CATEGORIES, analyzeQuestion, fairSeconds, anomalySummary } from '../js/anomaly.js';
import { feedbackFromData } from '../js/feedback.js';
import { STORES } from '../js/database.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('✗', msg); } };
const src = file => readFileSync(new URL(file, import.meta.url), 'utf8');

// --- Batas waktu: hanya 30 dtk / 1 / 2 / 3 / 4 / 5 menit ---
ok(JSON.stringify(ALLOWED_SECONDS) === JSON.stringify([30, 60, 120, 180, 240, 300]), 'batas waktu harus tepat 6 nilai yang diizinkan');
for (const s of ALLOWED_SECONDS) ok(normalizeLimit(s) === s, `normalizeLimit(${s}) berubah`);
for (const v of [31, 45, 90, 150, 299, 9999]) ok(ALLOWED_SECONDS.includes(normalizeLimit(v)), `normalizeLimit(${v}) menghasilkan nilai terlarang`);
ok(normalizeLimit('abc') === 120 && normalizeLimit(0) === 120, 'nilai waktu tidak valid jatuh ke 120 detik');

// --- Alur 12 tahap & store v2 ---
ok(STORES.includes('timing') && STORES.includes('alerts') && STORES.includes('anomalies') && STORES.includes('teacherActions') && STORES.includes('warnings'), 'store realtime v2 belum ada');
ok(STORES.includes('essayResponses') && STORES.includes('notebook') && STORES.includes('monitor'), 'store v2 lainnya belum ada');
const flowSrc = src('../js/database.js'); // daftar 12 tahap ada pada DEFAULT config 'flow'
for (const id of ['pembukaan', 'materi', 'simulasi', 'contoh', 'latihan', 'uraian', 'asesmen', 'analisis', 'umpanbalik', 'bukutulis', 'refleksi', 'sinkronisasi']) {
  ok(flowSrc.includes(`'${id}'`), `tahap alur ${id} tidak ditemukan`);
}

// --- Uraian terstruktur: 2 per modul, 8 langkah, sebagian isian ---
ok(ESSAYS.length >= 6, 'uraian terpandu minimal 6 soal');
for (const module of ['aritmetika', 'geometri', 'lingkaran']) {
  ok(essaysFor(module).length >= 2, `uraian ${module} kurang dari 2 soal`);
}
for (const e of ESSAYS) {
  ok(e.steps.length === 8, `${e.id} harus 8 langkah`);
  ok(e.steps.every(s => s.id && s.label && s.given && s.blank && s.guide), `${e.id} ada langkah tanpa teks panduan/isian`);
  ok(e.steps.filter(s => s.mode === 'text').length >= 2, `${e.id} kurang isian teks`);
  ok(e.steps.filter(s => s.mode === 'choice' || s.mode === 'number').length >= 2, `${e.id} kurang isian pilihan/angka`);
  ok(e.steps.filter(s => s.id === 's8').every(s => s.answer === ''), `${e.id} langkah interpretasi tidak boleh diberi kunci`);
}

// --- Buku tulis: 2 per modul, 7 instruksi, kunci tidak ditampilkan ---
ok(NOTEBOOK.length >= 6, 'latihan buku tulis minimal 6 soal');
for (const module of ['aritmetika', 'geometri', 'lingkaran']) {
  ok(notebookFor(module).length >= 2, `buku tulis ${module} kurang dari 2 soal`);
}
for (const n of NOTEBOOK) {
  ok(n.instructions.length === 7, `${n.id} harus 7 instruksi tertulis`);
  ok(!!n.prompt && !!n.reflection, `${n.id} prompt/refleksi kosong`);
  ok(!Object.keys(n).some(k => /^(answer|jawaban|kunci|solusi)$/i.test(k)), `${n.id} menyimpan kunci jawaban`);
  ok(!n.instructions.some(s => /jawaban (ada|tercantum|ditampilkan)/i.test(s)), `${n.id} instruksi membocorkan jawaban`);
}
const notebookUi = src('../js/notebook.js');
ok(notebookUi.includes('LANJUTKAN PEMBELAJARANMU DI BUKU TULIS'), 'judul wajib buku tulis tidak ada');
ok(notebookUi.includes('SAYA SUDAH MENGERJAKAN DI BUKU'), 'tombol konfirmasi buku tulis tidak ada');

// --- Indikator proses: nasihat, punya id, tidak vonis ---
const cfg = {
  weights: { A1: 2, A2: 3, A3: 2, B1: 3, B2: 1, B3: 2, C1: 3, C2: 2, C3: 2 },
  thresholds: { perluPerhatian: 2, anomaliTinggi: 5 },
  reasonableByType: { single: 60, multiple: 90, completion: 30 },
  reasonableByModule: { aritmetika: 75 }, reasonableByQuestion: {}
};
const timingRow = {
  session_id: 'SES-UJI', student_id: 'STU-UJI', question_id: 'A01',
  elapsed_ms: 4000, idle_ms: 0, changes: 0, hints: 0,
  first_interaction_at: '2026-01-01T00:00:00.000Z', first_answer_at: '2026-01-01T00:00:01.000Z'
};
const analysis = analyzeQuestion({
  timing: timingRow,
  response: { student_id: 'STU-UJI', session_id: 'SES-UJI', question_id: 'A01', materi: 'aritmetika', tipe: 'single', benar: true, jurnal: {} },
  question: { question_id: 'A01', materi: 'aritmetika', tipe: 'single' }, cfg
});
ok(analysis.id === 'ANM-SES-UJI-A01', 'hasil analisis harus memiliki id untuk Sheet ANOMALI');
ok(Object.values(CATEGORIES).includes(analysis.kategori), 'kategori anomali tidak dikenali');
ok(analysis.kategori !== CATEGORIES.NORMAL && analysis.indikator.some(i => i.kode === 'A1'), 'durasi sangat singkat tidak terdeteksi');
ok(!/menyontek|vonis|curiga/i.test(JSON.stringify(analysis)), 'indikator tidak boleh berisi vonis otomatis');
ok(fairSeconds('A01', { materi: 'aritmetika', tipe: 'single' }, cfg, {}) === 75, 'urutan ambang per soal → kelas → modul → jenis salah');
ok(anomalySummary([analysis]).perhatian + anomalySummary([analysis]).tinggi === 1, 'ringkasan anomali salah');

// --- Umpan balik aturan: setiap kalimat punya bukti ---
const fb = feedbackFromData({
  responses: [
    { status: 'selesai', materi: 'aritmetika', skor: 90, question_id: 'A01' },
    { status: 'selesai', materi: 'lingkaran', skor: 55, question_id: 'L01' }
  ],
  essays: [{ status: 'selesai', steps: [{ validation: 'benar' }, { validation: 'benar' }] }],
  notebook: [{ status: 'selesai' }],
  anomalies: [analysis],
  summary: { overall: 75 }
});
ok(fb.jenis === 'rule_based', 'umpan balik harus berbasis aturan');
for (const k of ['pemahamanKonsep', 'prosesPerhitungan', 'penalaran', 'manajemen']) ok(Array.isArray(fb.kategori[k]), `kategori ${k} tidak ada`);
ok(fb.bukti.length > 0 && fb.ringkasan.length > 0, 'setiap umpan balik harus memiliki bukti');
ok(/bukan penilaian otomatis/.test(fb.catatan), 'catatan umpan balik harus menjelaskan batasan aturan');

// --- Backend Sheets: 9 sheet lama + 8 sheet v2, operasi dan pull v2 ---
const gas = src('../google-apps-script/Code.gs');
for (const sheet of ['SISWA', 'SESI_BELAJAR', 'HASIL_MODUL', 'JAWABAN_SOAL', 'PROSES_PENGERJAAN', 'REFLEKSI', 'VERIFIKASI', 'UMPAN_BALIK_GURU', 'KONFIGURASI',
  'WAKTU_SOAL', 'ANOMALI', 'PERINGATAN', 'TINDAKAN_GURU', 'URAIAN_TERPANDU', 'LATIHAN_BUKU', 'UMPAN_BALIK_SISWA']) {
  ok(gas.includes(`${sheet}: [`), `header sheet ${sheet} tidak ada di Code.gs`);
}
for (const op of ['WAKTU_SOAL', 'ANOMALI', 'PERINGATAN', 'TINDAKAN_GURU', 'URAIAN_TERPANDU', 'LATIHAN_BUKU', 'UMPAN_BALIK_SISWA']) {
  ok(gas.includes(`${op}: { sheet:`), `operasi push ${op} tidak ada di Code.gs`);
}
for (const alias of ['waktu_soal', 'anomali', 'tindakan_guru', 'uraian', 'buku_tulis', 'umpan_siswa', 'peringatan_siswa']) {
  ok(gas.includes(alias), `alias pull ${alias} tidak ada di Code.gs`);
}
ok(!/localStorage/.test(gas), 'backend tidak boleh bergantung pada localStorage');
const app = src('../js/app.js');
ok(!/localStorage/.test(app), 'frontend tidak boleh menyimpan pekerjaan siswa di localStorage');

// --- Service worker mutakhir ---
const sw = src('../sw.js');
ok(sw.includes('labmat-smk-xi-v5'), 'versi cache service worker harus v5');
for (const f of ['flow.js', 'timing.js', 'anomaly.js', 'realtime.js', 'feedback.js', 'essay.js', 'notebook.js', 'data/essays.js', 'data/notebook.js']) {
  ok(sw.includes(f), `precache service worker belum memuat ${f}`);
}

// --- Bank soal tetap 20 ---
ok(QUESTIONS.length === 20, 'bank soal harus tetap 20 soal');

console.log(fail ? `VALIDASI V2 GAGAL: ${fail} pemeriksaan` : 'VALIDASI V2 LULUS: waktu, indikator, uraian, buku tulis, alur, umpan balik, backend, PWA');
if (fail) process.exit(1);
