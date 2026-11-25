// Sistem penilaian otomatis + rubrik terbuka untuk pemeriksaan guru.
import { DEFAULT_WEIGHTS, PROCESS_RUBRIC, MASTERY_MIN, REMEDIAL, gradeLabel } from '../data/rubrics.js';
import { clamp } from './utils.js';

export function scoreAnswer(rendered, answer, followUpAnswer = null) {
  if (rendered.tipe === 'single') return { benar: answer === rendered.correct, skor: answer === rendered.correct ? 1 : 0 };
  if (rendered.tipe === 'completion') {
    const text = String(answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const valid = text.length <= 24 && text.split(' ').length <= 2 && rendered.accepted.some(a => String(a).toLowerCase() === text);
    return { benar: valid, skor: valid ? 1 : 0 };
  }
  if (rendered.tipe === 'multiple') {
    const chosen = new Set(Array.isArray(answer) ? answer : []);
    const keys = new Set(rendered.correct);
    const hits = [...chosen].filter(k => keys.has(k)).length;
    const falseHits = [...chosen].filter(k => !keys.has(k)).length;
    // Penalti terkontrol: setiap jawaban salah mengurangi 0,5 bobot jawaban benar; minimum 0.
    const skor = clamp((hits - 0.5 * falseHits) / keys.size, 0, 1);
    return { benar: hits === keys.size && falseHits === 0, skor, hits, falseHits, missed: keys.size - hits };
  }
  return { benar: false, skor: 0 };
}

export function scoreJournal(journal = {}, rendered = {}) {
  const j = {
    informasi: String(journal.informasi || ''), konsep: String(journal.konsep || ''),
    strategi: String(journal.strategi || ''), perhitungan: String(journal.perhitungan || ''),
    interpretasi: String(journal.interpretasi || '')
  };
  const len = s => s.trim().length;
  const rubricPoints = {
    informasi: len(j.informasi) >= 25 ? 4 : len(j.informasi) >= 10 ? 2 : 0,
    konsep: len(j.konsep) >= 8 ? 4 : len(j.konsep) >= 3 ? 2 : 0,
    strategi: len(j.strategi) >= 12 ? 4 : len(j.strategi) >= 5 ? 2 : 0,
    perhitungan: len(j.perhitungan) >= 10 ? 6 : len(j.perhitungan) >= 4 ? 3 : 0,
    interpretasi: len(j.interpretasi) >= 15 ? 2 : len(j.interpretasi) >= 5 ? 1 : 0
  };
  const proses = rubricPoints.informasi + rubricPoints.konsep + rubricPoints.strategi + rubricPoints.perhitungan + rubricPoints.interpretasi; // maks 20
  const konteks = /\b(cm|m|kg|rupiah|rp|unit|orang|komponen|jam|hari|minggu|bulan|°|persen|%)\b/i.test(j.interpretasi);
  const interpretasi = len(j.interpretasi) >= 20 && konteks ? 2 : len(j.interpretasi) >= 8 ? 1 : 0;
  const kataKunci = /(karena|strategi|rumus|cek|sulit|hasil|pangkat|beda|rasio|keliling)/i.test(String(journal.refleksi || ''));
  const refleksi = len(String(journal.refleksi || '')) >= 40 && kataKunci ? 2 : len(String(journal.refleksi || '')) >= 15 ? 1 : 0;
  const lengkap = !!rendered.journalRequired;
  return {
    proses: lengkap ? proses / 20 : 1, // soal tanpa jurnal wajib tidak dihukum
    interpretasi: lengkap ? interpretasi / 2 : 1,
    refleksi: lengkap ? refleksi / 2 : 1,
    rubricPoints, needsTeacherReview: lengkap && len(j.perhitungan) > 0
  };
}

export function scoreOne(rendered, answer, journal, followUp, followUpCorrect, weights = DEFAULT_WEIGHTS) {
  const a = scoreAnswer(rendered, answer);
  let jawaban = a.skor;
  if (rendered.followUp || followUp) jawaban = 0.7 * a.skor + 0.3 * (followUpCorrect ? 1 : 0);
  const j = scoreJournal(journal, rendered);
  const w = {
    jawaban: Number(weights.jawaban ?? 60), proses: Number(weights.proses ?? 20),
    interpretasi: Number(weights.interpretasi ?? 10), refleksi: Number(weights.refleksi ?? 10)
  };
  const totalBobot = w.jawaban + w.proses + w.interpretasi + w.refleksi || 100;
  const skor = 100 * (jawaban * w.jawaban + j.proses * w.proses + j.interpretasi * w.interpretasi + j.refleksi * w.refleksi) / totalBobot;
  return {
    skor: Math.round(skor * 10) / 10, benar: a.benar, rincian: {
      jawaban: Math.round(jawaban * 1000) / 10, proses: Math.round(j.proses * 1000) / 10,
      interpretasi: Math.round(j.interpretasi * 1000) / 10, refleksi: Math.round(j.refleksi * 1000) / 10,
      rubricPoints: j.rubricPoints, multiple: a.tipe === 'multiple' ? { hits: a.hits, falseHits: a.falseHits, missed: a.missed } : null
    }, needsTeacherReview: j.needsTeacherReview
  };
}

export function summarize(responses, weights = DEFAULT_WEIGHTS) {
  const list = responses.filter(r => r.status !== 'draft');
  const totalMax = list.length * 100;
  const totalSkor = list.reduce((s, r) => s + (Number(r.skor) || 0), 0);
  const overall = totalMax ? totalSkor / totalMax * 100 : 0;
  const byModule = {};
  for (const r of list) {
    byModule[r.materi] ||= { skor: 0, n: 0, benar: 0 };
    byModule[r.materi].skor += Number(r.skor) || 0; byModule[r.materi].n++;
    if (r.benar) byModule[r.materi].benar++;
  }
  for (const k of Object.keys(byModule)) byModule[k].rata = byModule[k].n ? byModule[k].skor / byModule[k].n : 0;
  const indicators = {};
  for (const r of list) {
    indicators[r.indikator] ||= { skor: 0, n: 0 };
    indicators[r.indikator].skor += Number(r.skor) || 0; indicators[r.indikator].n++;
  }
  const competencies = Object.entries(indicators).map(([indikator, v]) => ({
    indikator, nilai: Math.round(v.skor / v.n), dikuasai: v.skor / v.n >= MASTERY_MIN
  }));
  const belum = competencies.filter(c => !c.dikuasai).map(c => c.indikator);
  const modulesRemedial = Object.entries(byModule).filter(([, v]) => v.rata < MASTERY_MIN).map(([k]) => REMEDIAL[k]).filter(Boolean);
  return {
    overall: Math.round(overall * 10) / 10, grade: gradeLabel(overall),
    byModule, competencies, mastered: competencies.filter(c => c.dikuasai).length,
    belum, remedial: modulesRemedial, completed: list.length,
    needsReview: list.filter(r => r.needs_teacher_review).length
  };
}
