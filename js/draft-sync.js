// Kirim draf pekerjaan siswa secara berkala tanpa mengubah penilaian akhir.
// Data tetap tersimpan di IndexedDB lebih dulu; draf dikirim dengan status "draf"
// dan idempotency key bertanda "draf:" agar tidak bentrok dengan pengiriman final.
// Saat siswa menekan "kirim", baris yang sama di Sheets diperbarui oleh server
// (upsert berdasarkan response_id / id), bukan dibuat duplikat.
import { getByIndex, get } from './database.js';
import { enqueue } from './sync.js';
import { nowISO } from './utils.js';

function adaIsi(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function jawabanPunyaIsi(r) {
  return ['jawaban', 'jurnal', 'follow_up', 'refleksi', 'telemetri'].some(k => adaIsi(r[k]));
}

const kunciValid = k => /^[A-Za-z0-9_:.-]{4,120}$/.test(k);

/**
 * Antrekan draf milik satu siswa. `bucket` (biasanya nomor periode 30 menit)
 * membuat satu baris per periode; pengiriman final memakai kunci berbeda.
 */
export async function enqueueDrafts(studentId, bucket = '') {
  if (!studentId) return { drafts: 0 };
  const suffix = bucket ? ':' + bucket : '';
  let drafts = 0;

  async function kirim(op, payload, key) {
    if (!kunciValid(key)) return;
    await enqueue(op, payload, key);
    drafts++;
  }

  // Draf asesmen sudah ditulis quiz.js pada setiap interaksi (status "draft").
  for (const r of await getByIndex('responses', 'byStudent', studentId)) {
    if (!['draft', 'draf'].includes(String(r.status || '').toLowerCase())) continue;
    if (!adaIsi(r.response_id) || !jawabanPunyaIsi(r)) continue;
    await kirim('JAWABAN_SOAL', {
      ...r,
      status: 'draf',
      skor: null,
      benar: null,
      draft_snapshot: true,
      waktu_draf: nowISO()
    }, `draf:jwb:${r.response_id}${suffix}`);
  }

  // Uraian terstruktur: tiap langkah sudah disimpan saat siswa mengetik.
  for (const r of await getByIndex('essayResponses', 'byStudent', studentId)) {
    if (String(r.status || '').toLowerCase() === 'selesai') continue;
    if (!(r.steps || []).some(s => adaIsi(s.jawaban))) continue;
    await kirim('URAIAN_TERPANDU', { ...r, status: 'draf', updated_at: nowISO() },
      `draf:uraian:${r.response_id}${suffix}`);
  }

  // Latihan buku tulis: refleksi/centang instruksi ikut dikirim sebagai draf.
  for (const r of await getByIndex('notebook', 'byStudent', studentId)) {
    if (String(r.status || '').toLowerCase() === 'selesai') continue;
    const adaCentang = (r.instruksi_centang || []).some(Boolean);
    if (!adaIsi(r.refleksi) && !adaCentang && !adaIsi(r.foto)) continue;
    await kirim('LATIHAN_BUKU', {
      ...r,
      status: 'draf',
      // Jangan mengirim base64 foto pada draf — kirim metadata saja.
      foto: r.foto ? { name: r.foto.name, type: r.foto.type } : null
    }, `draf:nb:${r.id}${suffix}`);
  }

  // Waktu pengerjaan sesi aktif ikut dikirim agar guru melihat progres, bukan vonis.
  const active = await get('config', 'activeSession');
  const sessionId = active?.value;
  if (sessionId) {
    const { sessionTiming } = await import('./timing.js');
    for (const row of await sessionTiming(sessionId)) {
      if (!row || !adaIsi(row.key)) continue;
      await kirim('WAKTU_SOAL', { ...row, status: 'draf' }, `draf:waktu:${row.key}${suffix}`);
    }
  }

  return { drafts };
}
