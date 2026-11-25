// Pengujian otomatis bank soal: struktur, distribusi, kunci matematis, variasi, duplikasi.
import { QUESTIONS, VALIDATION, renderQuestion, VERIFICATION, hashString } from '../data/questions.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.error('  ✗', msg); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;

console.log('=== VALIDASI BANK SOAL LABMAT ===');
ok(VALIDATION.total === 20, `total soal ${VALIDATION.total} ≠ 20`);
ok(VALIDATION.aritmetika === 6, `aritmetika ${VALIDATION.aritmetika} ≠ 6`);
ok(VALIDATION.geometri === 6, `geometri ${VALIDATION.geometri} ≠ 6`);
ok(VALIDATION.lingkaran === 8, `lingkaran ${VALIDATION.lingkaran} ≠ 8`);
ok(VALIDATION.single === 10, `single ${VALIDATION.single} ≠ 10`);
ok(VALIDATION.multiple === 6, `multiple ${VALIDATION.multiple} ≠ 6`);
ok(VALIDATION.completion === 4, `completion ${VALIDATION.completion} ≠ 4`);
ok(JSON.stringify(VALIDATION.levels) === JSON.stringify({ C3: 4, C4: 7, C5: 6, C6: 3 }),
  `distribusi kognitif salah: ${JSON.stringify(VALIDATION.levels)}`);
ok(new Set(QUESTIONS.map(q => q.id)).size === 20, 'ID soal duplikat');

const prompts = new Set();
for (const q of QUESTIONS) {
  ok(q.variants.length >= 1, `${q.id} tidak punya varian`);
  ok(typeof q.pembahasan === 'function', `${q.id} tanpa pembahasan`);
  ok(!!q.rubrik, `${q.id} tanpa rubrik`);
  for (let vi = 0; vi < q.variants.length; vi++) {
    const p = q.variants[vi], r = q.build(p), tag = `${q.id}[${vi}]`;
    ok(typeof r.prompt === 'string' && r.prompt.length > 30, `${tag} prompt kosong`);
    if (!prompts.has(r.prompt.replace(/<[^>]+>/g, ''))) prompts.add(r.prompt.replace(/<[^>]+>/g, ''));
    else ok(false, `${tag} prompt duplikat`);
    if (q.tipe === 'single' || q.tipe === 'multiple') {
      ok(r.options?.length === 4, `${tag} bukan 4 opsi`);
      ok(new Set(r.options.map(o => o.label)).size === 4, `${tag} ada opsi label sama`);
      ok(new Set(r.options.map(o => o.key)).size === 4, `${tag} kunci opsi duplikat`);
      if (q.tipe === 'single') ok(r.correct?.length === 1 && r.options.some(o => o.key === r.correct), `${tag} kunci PG invalid`);
      if (q.tipe === 'multiple') ok(r.correct?.length >= 2 && r.correct.every(k => r.options.some(o => o.key === k)), `${tag} kunci MR invalid`);
    }
    if (q.tipe === 'completion') ok(Array.isArray(r.accepted) && r.accepted.length >= 1, `${tag} accepted kosong`);
    // ---- Verifikasi kunci matematis independen ----
    if (q.id === 'A01') {
      const u = p.a + (p.n - 1) * p.b;
      ok(r.options.find(o => o.key === r.correct).label.startsWith(String(u).replace(/\B(?=(\d{3})+(?!\d))/g, '.')), `${tag} kunci A01 salah`);
    }
    if (q.id === 'A02') {
      const s = p.n * (p.a + p.u) / 2;
      ok(r.options.find(o => o.key === r.correct).label.includes(new Intl.NumberFormat('id-ID').format(s)), `${tag} kunci A02 salah`);
    }
    if (q.id === 'A03') {
      const u = p.a + (p.n - 1) * p.b, s = p.n * (p.a + u) / 2;
      const f = n => new Intl.NumberFormat('id-ID').format(n);
      ok(r.correct.length === 2 && r.correct.every(k => [f(u), f(s)].some(v => r.options.find(o => o.key === k).label.includes(v))), `${tag} kunci A03 salah`);
    }
    if (q.id === 'A05') {
      const u = p.a + (p.n - 1) * p.b, d = u - p.target;
      const expected = d === 0 ? `Tepat ${p.target} unit` : d > 0 ? `Tercapai, kelebihan ${d} unit` : `Tidak tercapai, kurang ${-d} unit`;
      ok(r.options.find(o => o.key === r.correct).label === expected, `${tag} kunci A05 salah`);
      ok(q.followUp(p).answer === p.n - 1, `${tag} followUp A05 salah`);
    }
    if (q.id === 'A06') ok(r.correct.length === 2, `${tag} kunci A06 bukan 2`);
    if (q.id === 'G01') {
      const v = p.a * p.r ** p.n;
      ok(r.options.find(o => o.key === r.correct).label.startsWith(new Intl.NumberFormat('id-ID').format(v)), `${tag} kunci G01 salah`);
    }
    if (q.id === 'G02') {
      const v = p.a * p.r ** p.n;
      ok(r.options.find(o => o.key === r.correct).label.includes(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v)), `${tag} kunci G02 salah`);
    }
    if (q.id === 'G03') ok(r.correct.length === 2, `${tag} kunci G03 bukan 2`);
    if (q.id === 'G05') {
      const s = p.a * (p.r ** p.n - 1) / (p.r - 1), d = s - p.target;
      const expected = d === 0 ? `Tepat ${p.target} orang` : d > 0 ? `Tercapai, lebih ${d} orang` : `Belum, kurang ${-d} orang`;
      ok(r.options.find(o => o.key === r.correct).label === expected, `${tag} kunci G05 salah`);
      ok(q.followUp(p).answer === p.a * p.r ** p.n, `${tag} followUp G05 salah`);
    }
    if (q.id === 'G06') ok(r.correct.length === 2, `${tag} kunci G06 bukan 2`);
    if (q.id === 'L01') {
      const m = 3.14 * p.d * p.put / 100;
      ok(r.options.find(o => o.key === r.correct).label.startsWith(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(m)), `${tag} kunci L01 salah`);
    }
    if (q.id === 'L02') ok(r.correct.length === 2, `${tag} kunci L02 bukan 2`);
    if (q.id === 'L03') {
      ok(near(3.14 * p.r * p.r, PI_R(p.r)) && r.options.find(o => o.key === r.correct).label.startsWith(`${p.r} m`), `${tag} kunci L03 salah`);
    }
    if (q.id === 'L05') ok(r.correct ? r.options.find(o => o.key === r.correct).label.startsWith('Benar, karena keliling') : false, `${tag} kunci L05 salah`);
    if (q.id === 'L06') ok(r.correct.length === 3, `${tag} kunci L06 bukan 3`);
    if (q.id === 'L07') {
      const k = p.a2 / p.a1;
      ok(r.accepted.includes(`${k}`), `${tag} kunci L07 salah`);
    }
    if (q.id === 'L08') {
      const k = 3.14 * p.d, diff = p.avail - k;
      const f1 = n => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n);
      const expected = diff === 0 ? 'Pas tepat, tidak ada sisa' : diff > 0 ? `Cukup, lebih ${f1(diff)} cm` : `Kurang ${f1(-diff)} cm`;
      ok(r.options.find(o => o.key === r.correct).label === expected, `${tag} kunci L08 salah: ${r.options.find(o => o.key === r.correct).label} vs ${expected}`);
    }
  }
}
function PI_R(r) { return 3.14 * r * r; }

// Seed deterministik menghasilkan varian berbeda untuk seed berbeda pada beberapa soal.
const varied = QUESTIONS.filter(q => new Set(Array.from({ length: 30 }, (_, i) => renderQuestion(q, 'SISWA-' + i).variantIndex)).size > 1);
ok(varied.length >= 12, `terlalu sedikit soal bervariasi: ${varied.length}`);

// Verifikasi pemahaman
const vChecks = { V01: 25000 + 9 * 8000, V02: 9 * (12 + 48) / 2, V03: 4 * 3 ** 4, V04: 2 * 3.14 * 9, V05: 0.25 * 3.14 * 100 };
for (const v of VERIFICATION) ok(near(v.answer, vChecks[v.id]), `kunci verifikasi ${v.id} salah`);
ok(hashString('abc') === hashString('abc') && hashString('abc') !== hashString('abd'), 'hashString tidak deterministik');

console.log(`Lulus: ${pass} | Gagal: ${fail}`);
console.log('Distribusi:', JSON.stringify(VALIDATION));
if (fail) process.exit(1);
