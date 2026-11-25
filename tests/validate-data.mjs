import { MODULES } from '../data/materials.js';
import { PRACTICE } from '../data/practice.js';
import { CHALLENGES, challengesFor } from '../data/challenges.js';
import { DEFAULT_WEIGHTS, PROCESS_RUBRIC } from '../data/rubrics.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('✗', m); } };
ok(MODULES.length === 3, 'harus 3 modul');
for (const m of MODULES) {
  ok(m.sections.length >= 3, `${m.id} materi kurang`);
  ok(m.examples.length >= 3, `${m.id} contoh kurang dari 3`);
  ok(m.applications.length >= 5, `${m.id} aplikasi kurang`);
  ok(m.indicators.length >= 3, `${m.id} indikator kurang`);
}
ok(PRACTICE.length === 9, 'latihan terpandu harus 9 soal');
for (const p of PRACTICE) {
  ok(p.given.filter(g => g.correct).length >= 2, `${p.id} informasi benar kurang`);
  ok(p.fields.length >= 2, `${p.id} field kurang`);
  ok(p.conclusions.filter(c => c.correct).length === 1, `${p.id} harus tepat 1 kesimpulan benar`);
  ok(p.hints.concept.length && p.hints.strategy.length && p.hints.calc.length, `${p.id} petunjuk tidak lengkap`);
  ok(!!p.reflection, `${p.id} tanpa refleksi`);
}
for (const p of PRACTICE) for (const f of p.fields) ok(Number.isFinite(f.answer), `${p.id}.${f.key} jawaban bukan angka`);
ok(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0) === 100, 'bobot tidak 100');
ok(PROCESS_RUBRIC.reduce((a, r) => a + r.max, 0) === 20, 'rubrik proses bukan 20');
for (const [k, arr] of Object.entries(CHALLENGES)) {
  ok(arr.length >= 3, `tantangan ${k} kurang`);
  for (const c of arr) ok(Number.isFinite(c.answer) && !!c.pembahasan && !!c.prompt, `tantangan ${c.id} tidak lengkap`);
}
ok(challengesFor('Teknik Otomotif').length === 4, 'deteksi TSM gagal');
ok(challengesFor('PPLG').length === 4, 'deteksi PPLG gagal');
console.log(fail ? `VALIDASI DATA GAGAL: ${fail}` : 'VALIDASI DATA LULUS: 3 modul, 9 latihan, 4 kelompok tantangan, rubrik valid.');
if (fail) process.exit(1);
