// Umpan balik personal berbasis ATURAN & RUBRIK — tanpa AI eksternal.
// Setiap kalimat hanya dibuat jika ada bukti data siswa; tidak ada dugaan motivasi/sikap.
import { getByIndex, getAll } from './database.js';
import { MASTERY_MIN } from '../data/rubrics.js';
import { anomalySummary } from './anomaly.js';

const pct = n => Math.round(Number(n) || 0);
const uniq = a => [...new Set(a.filter(Boolean))];

/** Versi murni untuk pengujian: semua argumen sudah berupa data siswa. */
export function feedbackFromData({ responses = [], essays = [], notebook = [], anomalies = [], summary = null } = {}) {
  // Draft asesmen juga punya skor 0 awal; jangan sampai ikut dinilai.
  const selesai = responses.filter(r => r.status === 'selesai' || (!r.status && r.skor != null));
  const dikuasai = [], diperbaiki = [], diulang = [], saran = [], bukti = [];
  const kategori = { pemahamanKonsep: [], prosesPerhitungan: [], penalaran: [], manajemen: [] };
  const add = (bucket, teks, source) => { bucket.push(teks); bukti.push(source); };

  byModuleLoop: for (const m of ['aritmetika', 'geometri', 'lingkaran']) {
    const rows = selesai.filter(r => r.materi === m);
    if (!rows.length) continue;
    const rata = rows.reduce((s, r) => s + (Number(r.skor) || 0), 0) / rows.length;
    if (rata >= MASTERY_MIN) add(kategori.pemahamanKonsep, `Konsep ${m} sudah kuat: rata-rata ${pct(rata)} dari ${rows.length} soal.`, `skor ${m}: ${pct(rata)}`);
    else {
      add(kategori.pemahamanKonsep, `Penguasaan ${m} masih perlu diperkuat: rata-rata ${pct(rata)} dari ${rows.length} soal.`, `skor ${m}: ${pct(rata)}`);
      add(diulang, `Ulangi konsep ${m}, terutama indikator dengan skor terendah.`, `rata-rata ${m} ${pct(rata)} < ${MASTERY_MIN}`);
    }
  }

  const lemah = selesai.filter(r => r.skor != null && r.skor < 60);
  if (lemah.length) {
    add(diperbaiki, `${lemah.length} soal masih di bawah 60: ${uniq(lemah.map(r => r.question_id)).join(', ')}. Periksa kembali langkah perhitungannya.`, `skor soal ${lemah.map(r => `${r.question_id}:${pct(r.skor)}`).join(', ')}`);
    add(kategori.prosesPerhitungan, 'Proses perhitungan perlu lebih rapi pada soal dengan skor rendah.', `${lemah.length} soal skor <60`);
  } else if (selesai.length) {
    add(kategori.prosesPerhitungan, 'Tidak ditemukan soal dengan skor sangat rendah dalam asesmen ini.', `${selesai.length} soal dinilai`);
  }

  const review = selesai.filter(r => r.needs_teacher_review);
  if (review.length) add(kategori.penalaran, `${review.length} jurnal perlu tinjauan guru. Pastikan langkah perhitungan dapat dibaca ulang.`, `needs_teacher_review: ${review.length}`);

  const selesaiEssay = essays.filter(e => e.status === 'selesai');
  if (selesaiEssay.length) {
    const benarLangkah = selesaiEssay.reduce((s, e) => s + (e.steps || []).filter(x => x.validation === 'benar').length, 0);
    const totalLangkah = selesaiEssay.reduce((s, e) => s + (e.steps || []).filter(x => x.guide !== 's8').length, 0) || 1;
    const persen = pct(benarLangkah / totalLangkah * 100);
    if (persen >= 75) add(dikuasai, `Uraian terstruktur: ${persen}% langkah awal sudah tepat.`, `${benarLangkah}/${totalLangkah} langkah uraian`);
    else add(kategori.penalaran, `Uraian terstruktur perlu latihan: ${persen}% langkah awal tepat.`, `${benarLangkah}/${totalLangkah} langkah uraian`);
  }

  const notebookDone = notebook.filter(n => n.status === 'selesai');
  if (notebookDone.length) add(dikuasai, `${notebookDone.length} latihan buku tulis sudah dikerjakan dan direfleksikan.`, `notebook selesai: ${notebookDone.length}`);

  const anom = anomalySummary(anomalies);
  if (anom.perhatian || anom.tinggi) {
    add(kategori.manajemen, `Ada ${anom.perhatian + anom.tinggi} soal dengan indikator waktu/proses untuk ditinjau bersama guru. Ini bukan penilaian otomatis.`, `anomali: ${JSON.stringify(anom.indikatorTerbanyak)}`);
    add(saran, 'Saat meninjau bersama guru, tunjukkan langkah kerjamu agar waktu dan proses dapat dibaca dengan jelas.', 'indikator waktu/proses tercatat');
  }
  const totalDurasi = selesai.reduce((s, r) => s + (Number(r.durasi) || 0), 0);
  if (selesai.length && totalDurasi > 0) {
    const rata = Math.round(totalDurasi / selesai.length);
    add(kategori.manajemen, `Rata-rata durasi per soal ${rata} detik dari ${selesai.length} soal.`, `total durasi ${totalDurasi} dtk`);
  }

  if (!dikuasai.length && selesai.length) add(dikuasai, `${selesai.length} soal asesmen selesai dikerjakan.`, `${selesai.length} respons selesai`);
  if (!saran.length && diulang.length) add(saran, 'Kerjakan latihan buku tulis yang sesuai materi yang diulang, lalu bandingkan langkahmu dengan uraian terstruktur.', `${diulang.length} materi diulang`);

  const all = [...dikuasai, ...diperbaiki, ...diulang, ...saran];
  const tingkat = summary?.overall >= 90 ? 'Sangat baik' : summary?.overall >= MASTERY_MIN ? 'Baik / tuntas'
    : summary?.overall >= 60 ? 'Cukup' : selesai.length ? 'Perlu pendampingan' : 'Belum ada data penilaian';
  return {
    id: `FB-RULE-${Date.now().toString(36).toUpperCase()}`,
    jenis: 'rule_based', tingkat, kategori,
    hal_dikuasai: dikuasai, kesalahan_diperbaiki: diperbaiki, materi_diulang: diulang,
    saran_belajar: saran, bukti, ringkasan: all.slice(0, 6),
    catatan: 'Umpan balik ini dibuat dari data pekerjaanmu sendiri dan bukan penilaian otomatis terhadap sikap atau kejujuran.',
    waktu: new Date().toISOString()
  };
}

export async function generatePersonalFeedback(identity) {
  if (!identity) return null;
  const sid = identity.student_id;
  const [responses, essays, notebook, anomalies, sessions] = await Promise.all([
    getByIndex('responses', 'byStudent', sid),
    getByIndex('essayResponses', 'byStudent', sid),
    getByIndex('notebook', 'byStudent', sid),
    getByIndex('alerts', 'byStudent', sid),
    getByIndex('sessions', 'byStudent', sid)
  ]);
  const last = sessions.filter(s => s.status === 'selesai').sort((a, b) => String(b.waktu_selesai).localeCompare(String(a.waktu_selesai)))[0];
  const fb = feedbackFromData({
    responses, essays, notebook,
    anomalies: anomalies.map(a => ({ ...a, kategori: a.tingkat || a.kategori, indikator: a.indikator || [] })),
    summary: last?.summary || null
  });
  fb.student_id = sid;
  await putFeedback(fb);
  return fb;
}

async function putFeedback(fb) {
  const { put } = await import('./database.js');
  await put('feedback', { ...fb, id: fb.id, topik: 'Umpan balik otomatis (berbasis aturan)', komentar: fb.ringkasan.join(' '), waktu: fb.waktu });
}
