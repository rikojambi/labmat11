// Deteksi indikator anomali — BUKAN vonis menyontek.
// Seluruh keluaran bersifat nasihat pedagogis dan wajib memberi ruang penjelasan siswa.
// Ambang bersifat kontekstual: per soal → uji coba kelas → modul → jenis soal.
import { getConfig, getByIndex } from './database.js';
import { QUESTIONS } from '../data/questions.js';

export const CATEGORIES = { NORMAL: 'NORMAL', PERHATIAN: 'PERLU DIPERHATIKAN', TINGGI: 'ANOMALI TINGGI' };

const LABELS = {
  A1: 'Durasi sangat singkat dibanding waktu wajar soal',
  A2: 'Beberapa durasi singkat berturut-turut',
  A3: 'Rentetan jawaban benar dengan durasi sangat singkat',
  B1: 'Perubahan jawaban sangat cepat berulang kali',
  B2: 'Jawaban akhir dikirim hampir tanpa jeda',
  B3: 'Tidak ada aktivitas pada soal berhitung',
  C1: 'Jawaban benar tetapi langkah proses kosong atau tidak relevan',
  C2: 'Pola durasi/jawaban terlalu seragam',
  C3: 'Waktu tidak aktif secara konsisten tinggi'
};

const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const text = v => String(v || '').trim();

export async function getAnomalyConfig() {
  const c = await getConfig('anomaly');
  return {
    ...c,
    reasonableByType: { single: 60, multiple: 90, completion: 30, ...(c.reasonableByType || {}) },
    reasonableByModule: { aritmetika: 75, geometri: 85, lingkaran: 80, ...(c.reasonableByModule || {}) },
    reasonableByQuestion: c.reasonableByQuestion || {},
    classTrial: c.classTrial || {},
    weights: { A1: 2, A2: 3, A3: 2, B1: 3, B2: 1, B3: 2, C1: 3, C2: 2, C3: 2, ...(c.weights || {}) },
    thresholds: { perluPerhatian: 2, anomaliTinggi: 5, ...(c.thresholds || {}) }
  };
}

export async function setAnomalyConfig(patch = {}) {
  const cur = await getAnomalyConfig();
  const next = {
    ...cur, ...patch,
    reasonableByType: { ...cur.reasonableByType, ...(patch.reasonableByType || {}) },
    reasonableByModule: { ...cur.reasonableByModule, ...(patch.reasonableByModule || {}) },
    reasonableByQuestion: { ...cur.reasonableByQuestion, ...(patch.reasonableByQuestion || {}) },
    classTrial: { ...cur.classTrial, ...(patch.classTrial || {}) },
    weights: { ...cur.weights, ...(patch.weights || {}) },
    thresholds: { ...cur.thresholds, ...(patch.thresholds || {}) },
    teacherControlled: patch.teacherControlled ?? cur.teacherControlled
  };
  const { setConfig } = await import('./database.js');
  await setConfig('anomaly', next);
  return next;
}

export function fairSeconds(qid, q = {}, cfg, classTrial = {}) {
  const sources = [
    cfg.reasonableByQuestion?.[qid],
    classTrial[qid],
    cfg.reasonableByModule?.[q.materi],
    cfg.reasonableByType?.[q.tipe]
  ];
  const chosen = sources.find(v => Number(v) > 0);
  return Math.max(5, Number(chosen) || 60);
}

function mark(code, bobot, bukti) {
  return { kode: code, label: LABELS[code], bobot: num(bobot), bukti };
}

/** Analisis satu soal. history = array hasil analyzeQuestion sebelumnya. */
export function analyzeQuestion({ timing = {}, response = {}, question = {}, cfg, classTrial = {}, history = [] }) {
  const config = cfg || {};
  const weights = config.weights || {};
  const qid = question.question_id || timing.question_id || response.question_id || '';
  const sid = response.student_id || timing.student_id || '';
  const sesi = response.session_id || timing.session_id || '';
  const fair = fairSeconds(qid, question, config, classTrial);
  const idle = num(timing.idle_ms ?? timing.idleMs ?? 0);
  const elapsed = Math.max(idle, num(timing.elapsed_ms ?? timing.elapsedMs ?? 0));
  // Durasi aktif = total waktu dikurangi jeda tidak aktif; indikator tidak menghukum jeda.
  const durasi = Math.max(0, num(timing.active_ms ?? timing.activeMs ?? timing.durasi ?? (elapsed - idle) / 1000));
  const changes = num(timing.changes);
  const hints = num(timing.hints);
  const benar = !!response.benar;
  const jurnal = response.jurnal || {};
  const bank = QUESTIONS.find(q => q.id === (question.question_id || timing.question_id || response.question_id));
  const calculation = !!(bank?.journalRequired ?? question.journalRequired) || ['completion', 'multiple'].includes(question.tipe);
  const indikator = [];
  const veryShort = durasi > 0 && durasi <= Math.max(3, fair * 0.25);

  if (veryShort) indikator.push(mark('A1', weights.A1, `Durasi ${durasi.toFixed(1)} dtk; waktu wajar ${fair} dtk.`));
  const prev = (history || []).slice(-2);
  const shortRun = prev.length === 2 && prev.every(h => h.durasi > 0 && h.durasi <= Math.max(4, fair * 0.3));
  if (veryShort && shortRun) indikator.push(mark('A2', weights.A2, 'Tiga soal berurutan dengan durasi sangat singkat.'));
  const fastCorrect = benar && veryShort ? prev.filter(h => h.benar && h.durasi <= Math.max(5, fair * 0.35)).length : 0;
  if (fastCorrect >= 2) indikator.push(mark('A3', weights.A3, `${fastCorrect + 1} jawaban benar berurutan dengan durasi singkat.`));

  const firstInteraction = timing.first_interaction_at ? Date.parse(timing.first_interaction_at) : NaN;
  const firstAnswer = timing.first_answer_at ? Date.parse(timing.first_answer_at) : NaN;
  const submitted = timing.submitted_at ? Date.parse(timing.submitted_at) : NaN;
  const jeda = Number.isFinite(firstAnswer) && Number.isFinite(firstInteraction) ? (firstAnswer - firstInteraction) / 1000 : null;
  if (jeda !== null && jeda >= 0 && jeda <= 1) indikator.push(mark('B2', weights.B2, `Jeda pertama menjawab hanya ${jeda.toFixed(1)} dtk.`));
  if (changes >= 5 && durasi > 0 && durasi / changes <= 4) indikator.push(mark('B1', weights.B1, `${changes} perubahan jawaban dalam ${durasi.toFixed(1)} dtk.`));
  if (calculation && idle > 10000 && idle / Math.max(elapsed, 1) > 0.6) indikator.push(mark('B3', weights.B3, `Tidak ada aktivitas ${Math.round(idle / 1000)} dtk dari ${Math.round(elapsed / 1000)} dtk pada soal berhitung.`));

  const penting = ['informasi', 'konsep', 'strategi', 'perhitungan'].map(k => text(jurnal[k])).filter(Boolean);
  const relevan = /rumus|nilai|beda|rasio|hitung|keliling|luas|suku|deret|persen|m|cm|rp|rupiah|hari|bulan/i;
  if (benar && calculation && (penting.length < 2 || !penting.some(v => relevan.test(v)))) indikator.push(mark('C1', weights.C1, 'Jawaban akhir benar, tetapi langkah proses tidak memadai untuk ditinjau.'));
  const pola = (history || []).slice(-2).map(h => h.durasi).filter(v => v > 0);
  if (pola.length === 2 && pola.every(v => Math.abs(v - durasi) <= 0.5) && durasi < fair * 0.5) indikator.push(mark('C2', weights.C2, 'Durasi tiga soal berbeda hampir identik.'));
  if (idle > 15000 && elapsed > 0 && idle / elapsed > 0.75) indikator.push(mark('C3', weights.C3, `Waktu tidak aktif ${Math.round(idle / 1000)} dtk dari total ${Math.round(elapsed / 1000)} dtk.`));

  const skor = indikator.reduce((s, i) => s + i.bobot, 0);
  const t = config.thresholds || {};
  const kategori = !indikator.length ? CATEGORIES.NORMAL
    : skor >= (num(t.anomaliTinggi) || 5) ? CATEGORIES.TINGGI
      : skor >= (num(t.perluPerhatian) || 2) ? CATEGORIES.PERHATIAN : CATEGORIES.NORMAL;
  return {
    id: `ANM-${sesi || 'S'}-${qid || 'Q'}`,
    student_id: sid, session_id: sesi,
    question_id: qid,
    materi: question.materi || response.materi || '', durasi, idle_ms: idle, elapsed_ms: elapsed,
    perubahan: changes, petunjuk: hints, waktu_wajar: fair, indikator, skor, kategori,
    penjelasan_siswa: response.penjelasan || '', status: kategori === CATEGORIES.NORMAL ? 'normal' : 'menunggu_tinjauan',
    waktu: new Date().toISOString()
  };
}

/** Analisis seluruh sesi setelah finalisasi. Tidak mengubah status 'selesai'. */
export async function analyzeSession(sessionId, { responses = null, cfg = null } = {}) {
  const config = cfg || await getAnomalyConfig();
  const [timingRows, responseRows] = await Promise.all([
    getByIndex('timing', 'bySession', sessionId),
    responses ? Promise.resolve(responses) : getByIndex('responses', 'bySession', sessionId)
  ]);
  const tMap = new Map(timingRows.map(t => [t.question_id, t]));
  const history = [];
  const hasil = [];
  for (const r of responseRows) {
    const timing = tMap.get(r.question_id) || {};
    const q = { question_id: r.question_id, materi: r.materi, tipe: r.tipe_soal, journalRequired: !!r.jurnal };
    const a = analyzeQuestion({ timing, response: r, question: q, cfg: config, classTrial: config.classTrial, history: [...history] });
    hasil.push(a);
    history.push({ benar: !!r.benar, durasi: a.durasi });
  }
  return hasil;
}

export function anomalySummary(list = []) {
  return {
    total: list.length,
    normal: list.filter(a => a.kategori === CATEGORIES.NORMAL).length,
    perhatian: list.filter(a => a.kategori === CATEGORIES.PERHATIAN).length,
    tinggi: list.filter(a => a.kategori === CATEGORIES.TINGGI).length,
    indikatorTerbanyak: list.flatMap(a => (a.indikator || []).map(i => typeof i === 'string' ? i.split(':')[0].trim() : i.kode)).reduce((acc, k) => (acc[k] = (acc[k] || 0) + 1, acc), {})
  };
}
