// Analitik belajar: progres siswa & statistik kelas untuk dashboard guru.
import { getAll, getByIndex } from './database.js';
import { summarize } from './scoring.js';
import { MODULES } from '../data/materials.js';
import { QUESTIONS } from '../data/questions.js';
import { MASTERY_MIN } from '../data/rubrics.js';

export async function studentAnalytics(identity) {
  if (!identity) return null;
  const responses = await getByIndex('responses', 'byStudent', identity.student_id);
  const progress = await getAll('progress');
  const sessions = await getByIndex('sessions', 'byStudent', identity.student_id);
  const practices = progress.filter(p => p.key?.startsWith('practice:') && p.state?.completed);
  const materials = progress.filter(p => p.key?.startsWith('module:'));
  const summary = summarize(responses.filter(r => r.status === 'selesai'));
  const totalPractice = 9;
  return {
    ...summary,
    materialsSeen: materials.length, materialsTotal: MODULES.length,
    practiceDone: practices.length, practiceTotal: totalPractice,
    sessions: sessions.length,
    lastSession: sessions.sort((a, b) => (b.waktu_mulai || '').localeCompare(a.waktu_mulai || ''))[0] || null,
    readiness: Math.round((materials.length / MODULES.length * 30) + (practices.length / totalPractice * 30) + (summary.overall / 100 * 40))
  };
}

export function classAnalytics(data = {}) {
  const siswa = data.siswa || [], jawaban = data.jawaban || [], proses = data.proses || [];
  const refleksi = data.refleksi || [], verifikasi = data.verifikasi || [], sesi = data.sesi || [];
  const byStudent = {};
  for (const s of siswa) byStudent[s.student_id] = { ...s, jawaban: [], proses: [], refleksi: [], verifikasi: [] };
  for (const r of jawaban) { byStudent[r.student_id] ||= { student_id: r.student_id, nama: r.nama || 'Siswa', jawaban: [] }; byStudent[r.student_id].jawaban.push(r); }
  for (const p of proses) { const s = byStudent[p.student_id]; if (s) (s.proses ||= []).push(p); }
  for (const r of refleksi) { const s = byStudent[r.student_id]; if (s) (s.refleksi ||= []).push(r); }
  for (const v of verifikasi) { const s = byStudent[v.student_id]; if (s) (s.verifikasi ||= []).push(v); }

  const students = Object.values(byStudent).map(s => {
    const sum = summarize(s.jawaban.filter(r => r.status === 'selesai' || r.skor != null));
    return {
      student_id: s.student_id, nama: s.nama || 'Tanpa nama', nisn: s.nisn || '', kelas: s.kelas || '',
      program_keahlian: s.program_keahlian || '', sekolah: s.sekolah || '',
      nilai: sum.overall, grade: sum.grade.label, selesai: sum.completed,
      proses: s.proses.length, refleksi: s.refleksi.length, verifikasi: s.verifikasi.length,
      verifikasi_benar: s.verifikasi.filter(v => v.benar).length,
      rataModul: Object.fromEntries(Object.entries(sum.byModule).map(([k, v]) => [k, Math.round(v.rata)])),
      perluPendampingan: sum.overall < MASTERY_MIN && sum.completed > 0
    };
  });
  const nilai = students.filter(s => s.selesai > 0).map(s => s.nilai);
  const rata = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : 0;
  const tertinggi = nilai.length ? Math.max(...nilai) : 0, terendah = nilai.length ? Math.min(...nilai) : 0;
  const distr = [0, 0, 0, 0, 0]; // <50, 50-64, 65-74, 75-89, >=90
  nilai.forEach(n => distr[n >= 90 ? 4 : n >= 75 ? 3 : n >= 65 ? 2 : n >= 50 ? 1 : 0]++);

  const questionStats = QUESTIONS.map(q => {
    const list = jawaban.filter(r => r.question_id === q.id && r.skor != null);
    const rataSkor = list.length ? list.reduce((a, r) => a + Number(r.skor || 0), 0) / list.length : 0;
    return { id: q.id, materi: q.materi, indikator: q.indikator, level: q.level, n: list.length, rata: Math.round(rataSkor), salah: list.filter(r => !r.benar).length };
  }).filter(q => q.n).sort((a, b) => a.rata - b.rata);

  const indicatorMap = {};
  for (const r of jawaban.filter(x => x.indikator && x.skor != null)) {
    indicatorMap[r.indikator] ||= []; indicatorMap[r.indikator].push(Number(r.skor));
  }
  const indikator = Object.entries(indicatorMap).map(([name, arr]) => ({
    indikator: name, rata: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), n: arr.length,
    tuntas: arr.reduce((a, b) => a + b, 0) / arr.length >= MASTERY_MIN
  }));

  const hintStats = {};
  for (const p of proses) if (p.telemetri?.hints) hintStats[p.question_id] = (hintStats[p.question_id] || 0) + p.telemetri.hints;

  return {
    students, jumlahSiswa: students.length, jumlahSesi: sesi.length,
    rata: Math.round(rata * 10) / 10, tertinggi: Math.round(tertinggi), terendah: Math.round(terendah),
    ketuntasan: nilai.length ? Math.round(nilai.filter(n => n >= MASTERY_MIN).length / nilai.length * 100) : 0,
    distribusi: distr, soalTersulit: questionStats.slice(0, 5), indikator, hintStats,
    butuhPendampingan: students.filter(s => s.perluPendampingan)
  };
}

export function csvFromStudents(students) {
  const head = ['student_id', 'nama', 'nisn', 'kelas', 'program_keahlian', 'sekolah', 'nilai', 'grade', 'selesai', 'aritmetika', 'geometri', 'lingkaran', 'proses', 'refleksi', 'verifikasi_benar'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [head.join(','), ...students.map(s => head.map(k => esc(s[k] ?? s.rataModul?.[k] ?? '')).join(','))].join('\r\n');
}
