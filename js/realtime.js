// Peringatan waktu nyata satu LAN (polling ringan) + jalur cadangan lewat Google Sheets.
// Tidak merekam layar/kamera/keyboard; hanya membawa indikator proses dan tindakan guru.
import { get, getAll, put, getConfig, setConfig, exportBackup } from './database.js';
import { enqueue, isOnline } from './sync.js';
import { nowISO, uid } from './utils.js';

const busUrl = async () => {
  const cfg = await getConfig('realtime');
  return String(cfg.lanUrl || (location?.origin || '')).replace(/\/$/, '');
};

async function post(path, payload) {
  const base = await busUrl();
  if (!base || !isOnline()) return null;
  try {
    const res = await fetch(base + path, {
      method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    });
    return res.ok ? await res.json() : null;
  } catch { return null; } // offset: antrean Sheets tetap berjalan
}

/** Guru meminta salinan data lokal siswa yang sedang membuka aplikasi (satu LAN). */
export async function requestLocalBackup({ student_id, nama = '', catatan = '' } = {}) {
  if (!student_id) throw new Error('Pilih siswa terlebih dahulu.');
  const req = { id: uid('REQ'), student_id, nama, catatan, waktu: nowISO(), diminta_oleh: 'Guru XI' };
  const res = await post('/api/requests', req);
  return res?.ok ? req : null;
}

/** Siswa menjawab permintaan guru dengan salinan seluruh IndexedDB-nya. */
async function jawabPermintaanCadangan(req, studentId) {
  if (!req?.id || !studentId || String(req.student_id) !== String(studentId)) return null;
  const penanda = `REQ-${req.id}`;
  if (await get('localBackups', penanda)) return null; // idempoten: satu permintaan satu pengiriman
  if (!isOnline()) return null; // dicoba lagi pada polling berikutnya setelah online
  const me = await get('identity', 'current');
  const backup = await exportBackup();
  const hasil = await post('/api/backups', {
    id: `BAK-${req.id}`, request_id: req.id, student_id: studentId,
    nama: me?.nama || req.nama || '', waktu: nowISO(),
    jumlah_store: Object.keys(backup.data || {}).length, backup
  });
  if (!hasil?.ok) return null;
  await put('localBackups', { id: penanda, jenis: 'permintaan', student_id: studentId, request_id: req.id, waktu: nowISO(), dikirim: true });
  return { request: req, backup };
}

export async function createAlert(analysis, identity, question = {}) {
  if (!analysis || analysis.kategori === 'NORMAL') return null;
  const alert = {
    id: uid('ALR'),
    student_id: identity?.student_id || analysis.student_id || '',
    nama: identity?.nama || '', nisn: identity?.nisn || '', kelas: identity?.kelas || '',
    session_id: analysis.session_id || '', question_id: analysis.question_id || '',
    materi: analysis.materi || question.materi || '', nomor_soal: analysis.nomor_soal || null,
    durasi: analysis.durasi || 0, indikator: (analysis.indikator || []).map(i => `${i.kode}: ${i.label}`),
    kode_indikator: (analysis.indikator || []).map(i => i.kode),
    tingkat: analysis.kategori, skor: analysis.skor || 0,
    waktu: analysis.waktu || nowISO(), status: 'baru', penjelasan_siswa: ''
  };
  await put('alerts', alert);
  await enqueue('ANOMALI', analysis, `anomali:${analysis.session_id || 'x'}:${analysis.question_id || uid('Q')}`);
  await enqueue('PERINGATAN', alert, `alert:${alert.id}`);
  await post('/api/alerts', alert);
  return alert;
}

export async function publishTiming(rows) {
  for (const r of rows || []) await enqueue('WAKTU_SOAL', r, `waktu:${r.key || uid('W')}`);
}

export async function publishAlertToBus(alert) { return post('/api/alerts', alert); }

const ACTION_LABELS = {
  peringatan: 'Memberikan peringatan',
  penjelasan: 'Meminta penjelasan siswa',
  diperiksa: 'Menandai sudah diperiksa',
  abaikan: 'Mengabaikan indikator',
  lihat_jawaban: 'Melihat jawaban',
  lihat_proses: 'Melihat proses'
};

/** Semua tindakan guru dicatat; peringatan/penjelasan juga dikirim ke siswa. */
export async function teacherAction({ alert_id, type, catatan = '', guru = 'Guru' }) {
  if (!alert_id || !ACTION_LABELS[type]) throw new Error('Tindakan guru tidak dikenali.');
  const alert = await get('alerts', alert_id);
  if (!alert) throw new Error('Peringatan tidak ditemukan.');
  const action = {
    id: uid('ACT'), alert_id, student_id: alert.student_id, type, label: ACTION_LABELS[type],
    catatan, guru, waktu: nowISO(), status: 'dilakukan'
  };
  await put('teacherActions', action);
  const nextStatus = type === 'abaikan' ? 'diabaikan' : type === 'diperiksa' ? 'diperiksa' : 'ditindaklanjuti';
  await put('alerts', { ...alert, status: nextStatus, tindakan_terakhir: action.id });
  await enqueue('TINDAKAN_GURU', action, `tindakan:${action.id}`);
  await post('/api/actions', action);

  if (type === 'peringatan' || type === 'penjelasan') {
    const warning = {
      id: uid('WRN'), student_id: alert.student_id, alert_id, type,
      judul: type === 'peringatan' ? 'Pesan dari guru' : 'Guru meminta penjelasan',
      pesan: type === 'peringatan'
        ? 'Guru melihat bagian dari proses pengerjaanmu dan menyarankan agar langkah perhitungan ditulis lebih jelas.'
        : 'Guru ingin mendengar penjelasanmu tentang langkah pengerjaan pada soal ini.',
      catatan_guru: catatan, question_id: alert.question_id, nomor_soal: alert.nomor_soal,
      materi: alert.materi, nama: alert.nama, nisn: alert.nisn, kelas: alert.kelas,
      session_id: alert.session_id, durasi: alert.durasi, indikator: alert.indikator,
      kode_indikator: alert.kode_indikator, tingkat: alert.tingkat, skor: alert.skor,
      waktu: nowISO(), status: 'aktif', dibaca: false
    };
    await put('warnings', warning);
    await enqueue('PERINGATAN', { ...warning, op: 'WARNING' }, `warning:${warning.id}`);
    await post('/api/warnings', warning);
    return { action, warning };
  }
  return { action, warning: null };
}

export async function markWarningRead(id) {
  const w = await get('warnings', id);
  if (!w) return;
  const updated = { ...w, dibaca: true, status: 'dibaca' };
  await put('warnings', updated);
  await enqueue('PERINGATAN', { ...updated, op: 'WARNING' }, `warning:${w.id}:dibaca`);
  await post('/api/warnings', updated);
}

/** Terapkan data yang sudah tiba lewat sinkronisasi Sheets (jalur cadangan offline). */
export async function applyPulledRealtime(data = {}) {
  for (const a of data.alerts || []) {
    if (!a?.id) continue;
    const old = await get('alerts', a.id);
    await put('alerts', { ...(old || {}), ...a });
  }
  for (const a of data.actions || []) {
    if (!a?.id) continue;
    const old = await get('teacherActions', a.id);
    await put('teacherActions', { ...(old || {}), ...a });
  }
  for (const w of data.warnings || []) {
    if (!w?.id) continue;
    const old = await get('warnings', w.id);
    await put('warnings', { ...(old || {}), ...w });
  }
}

export async function liveSnapshot({ studentId = '', since = '', role = '' } = {}) {
  const base = await busUrl();
  if (!base || !isOnline()) return null;
  try {
    const q = new URLSearchParams({ since });
    if (studentId) q.set('student_id', studentId);
    if (role) q.set('role', role);
    const res = await fetch(`${base}/api/live?${q}`, { mode: 'cors' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

async function persistSnapshot(snap, { studentOnly = false } = {}) {
  if (!snap) return;
  if (!studentOnly) {
    for (const item of snap.alerts || []) if (item?.id && !(await get('alerts', item.id))) await put('alerts', item);
    for (const item of snap.actions || []) if (item?.id && !(await get('teacherActions', item.id))) await put('teacherActions', item);
    // Cadangan lokal hanya diterima dashboard guru, disimpan terpisah dari konfigurasi/PIN.
    for (const item of snap.backups || []) {
      if (!item?.id || !item?.backup) continue;
      if (!(await get('localBackups', item.id))) await put('localBackups', { ...item, jenis: 'cadangan' });
    }
  }
  // Siswa hanya menyimpan pesan untuk dirinya, bukan peringatan seluruh kelas.
  for (const item of snap.warnings || []) if (item?.id && !(await get('warnings', item.id))) await put('warnings', item);
}

const posisi = snap => (snap?.seq != null ? String(snap.seq) : snap?.server_time || '');

/** Polling guru: alerts + tindakan + cadangan data lokal siswa. */
export function startTeacherPolling(onUpdate, intervalSec = 8) {
  let last = '';
  const tick = async () => {
    const snap = await liveSnapshot({ since: last, role: 'teacher' });
    if (snap) last = posisi(snap);
    await persistSnapshot(snap);
    onUpdate?.(snap);
  };
  tick();
  const id = setInterval(tick, Math.max(3, intervalSec) * 1000);
  return () => clearInterval(id);
}

/**
 * Polling siswa: hanya pesan untuk identity siswa ini. Permintaan cadangan guru
 * dijawab otomatis, lalu diumumkan lewat onBackup agar tidak ada pengambilan diam-diam.
 */
export function startStudentPolling(studentId, onUpdate, intervalSec = 8, onBackup = null) {
  let last = '';
  const tick = async () => {
    const snap = await liveSnapshot({ studentId, since: last, role: 'student' });
    if (snap) last = posisi(snap);
    await persistSnapshot(snap, { studentOnly: true });
    const local = (await getAll('warnings')).filter(w => !studentId || w.student_id === studentId);
    onUpdate?.(local);
    for (const req of snap?.requests || []) {
      try {
        const hasil = await jawabPermintaanCadangan(req, studentId);
        if (hasil) onBackup?.(hasil.request, hasil.backup);
      } catch (e) { console.warn('Gagal mengirim cadangan lokal:', e); }
    }
  };
  tick();
  const id = setInterval(tick, Math.max(3, intervalSec) * 1000);
  return () => clearInterval(id);
}

export async function setRealtimeConfig(patch = {}) {
  const cur = await getConfig('realtime');
  const next = { ...cur, ...patch, lanUrl: String(patch.lanUrl ?? cur.lanUrl ?? '').replace(/\/$/, ''), pollSec: Math.max(3, Number(patch.pollSec ?? cur.pollSec) || 8) };
  await setConfig('realtime', next);
  return next;
}
