// Sinkronisasi antrean → Google Apps Script → Google Sheets.
// Prinsip: data lokal TIDAK pernah dihapus sebelum server mengonfirmasi penerimaan.
import { getAll, get, put, del, getConfig, setConfig } from './database.js';
import { nowISO } from './utils.js';

const PUSH_OPS = new Set([
  // Operasi versi 1 — dipertahankan.
  'SISWA', 'SESI_BELAJAR', 'HASIL_MODUL', 'JAWABAN_SOAL', 'PROSES_PENGERJAAN', 'REFLEKSI', 'VERIFIKASI', 'UMPAN_BALIK_GURU', 'IDENTITY_CHANGE', 'SET_CONFIG',
  // Operasi revisi versi 2.
  'WAKTU_SOAL', 'ANOMALI', 'PERINGATAN', 'TINDAKAN_GURU', 'URAIAN_TERPANDU', 'LATIHAN_BUKU', 'UMPAN_BALIK_SISWA'
]);

// Data v2 yang ditarik dari server disimpan ke store lokal yang sesuai.
const PULL_STORES = {
  timing: ['waktu_soal', 'timing'],
  alerts: ['alerts', 'peringatan'],
  anomalies: ['anomali', 'anomalies'],
  teacherActions: ['tindakan_guru', 'actions'],
  warnings: ['peringatan_siswa', 'warnings'],
  essayResponses: ['uraian', 'essays'],
  notebook: ['buku_tulis', 'notebook'],
  monitor: ['monitor', 'monitoring']
};

export async function getSyncConfig() { return getConfig('sync'); }
export const setSyncConfig = values => setConfig('sync', values);
export const isOnline = () => navigator.onLine !== false;

export async function enqueue(op, payload, idempotencyKey) {
  if (!PUSH_OPS.has(op)) throw new Error('Operasi sinkronisasi tidak dikenali: ' + op);
  const key = String(idempotencyKey || `${op}:${payload?.id || payload?.response_id || Date.now()}`);
  const existing = await get('syncQueue', key);
  const item = {
    idempotency_key: key, op, payload, status: 'pending', attempts: existing?.attempts || 0,
    created_at: existing?.created_at || nowISO(), updated_at: nowISO(), next_retry: 0
  };
  await put('syncQueue', item);
  return item;
}

export async function queueSummary() {
  const all = await getAll('syncQueue');
  return {
    total: all.length,
    pending: all.filter(x => x.status === 'pending').length,
    sending: all.filter(x => x.status === 'sending').length,
    failed: all.filter(x => x.status === 'failed').length,
    synced: all.filter(x => x.status === 'synced').length,
    unsynced: all.filter(x => x.status !== 'synced').length
  };
}

function backoff(attempts) { return Math.min(15 * 60 * 1000, 15000 * Math.pow(2, Math.max(0, attempts - 1))); }
function dedupeById(rows) {
  const map = new Map();
  for (const row of rows || []) if (row?.id) map.set(row.id, { ...(map.get(row.id) || {}), ...row });
  return [...map.values()];
}

export async function processQueue({ manual = false, onStatus } = {}) {
  const cfg = await getSyncConfig();
  if (!cfg.url || !cfg.token) return { ok: false, sent: 0, message: 'URL/token sinkronisasi belum diisi di Pengaturan.' };
  if (!isOnline()) return { ok: false, sent: 0, message: 'Perangkat offline. Antrean tetap aman di perangkat.' };
  const all = await getAll('syncQueue');
  const now = Date.now();
  const due = all.filter(x => x.status === 'pending' || (x.status === 'failed' && (x.next_retry || 0) <= now));
  if (!due.length) { onStatus?.({ state: 'ok', text: 'Semua tersinkronisasi' }); return { ok: true, sent: 0, message: 'Tidak ada data yang perlu dikirim.' }; }
  for (const item of due) await put('syncQueue', { ...item, status: 'sending', updated_at: nowISO() });
  onStatus?.({ state: 'busy', text: `Mengirim ${due.length} data…` });
  try {
    const res = await fetch(cfg.url, {
      method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ token: cfg.token, action: 'push', ops: due.map(x => ({ op: x.op, idempotency_key: x.idempotency_key, payload: x.payload })) })
    });
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('Balasan server bukan JSON: ' + text.slice(0, 120)); }
    if (!res.ok || !result.ok) throw new Error(result?.error || 'Server menolak pengiriman (' + res.status + ')');
    // Server mengembalikan 'skipped' untuk idempotency key yang sudah diterima;
    // tetap dianggap berhasil agar antrean lokal tidak macet.
    const accepted = new Set([...(result.processed || []), ...(result.skipped || [])]);
    for (const item of due) {
      await put('syncQueue', { ...item, status: accepted.has(item.idempotency_key) ? 'synced' : 'failed', attempts: item.attempts, updated_at: nowISO(), last_result: result.message || '' });
    }
    await setConfig('sync', { lastSync: nowISO() });
    const sent = due.filter(x => accepted.has(x.idempotency_key)).length;
    onStatus?.({ state: 'ok', text: sent ? `${sent} data terkirim` : 'Semua tersinkronisasi' });
    return { ok: true, sent, message: `${sent} data berhasil dikirim.` };
  } catch (err) {
    for (const item of due) {
      const attempts = (item.attempts || 0) + 1;
      await put('syncQueue', { ...item, status: 'failed', attempts, next_retry: Date.now() + backoff(attempts), last_error: String(err.message || err), updated_at: nowISO() });
    }
    onStatus?.({ state: 'bad', text: 'Gagal, menunggu percobaan ulang' });
    return { ok: false, sent: 0, message: 'Gagal mengirim: ' + (err.message || err) + '. Data tetap tersimpan lokal.' };
  }
}

function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const name = '__labmatCb' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout membaca data server')); }, timeoutMs);
    function cleanup() { clearTimeout(timer); delete window[name]; script.remove(); }
    window[name] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('Gagal memuat data server (CORS/jaringan)')); };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + name;
    document.head.appendChild(script);
  });
}

async function requestPull(params, allowJsonp = true) {
  const cfg = await getSyncConfig();
  const url = cfg.url + '?' + new URLSearchParams({ token: cfg.token, action: 'pull', ...params });
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    if (!allowJsonp) throw err;
    return jsonp(url);
  }
}

export async function pull({ full = false, since = null } = {}) {
  const cfg = await getSyncConfig();
  if (!cfg.url || !cfg.token) throw new Error('URL/token sinkronisasi belum diisi.');
  if (!isOnline()) throw new Error('Perangkat offline.');
  const data = await requestPull({ full: full ? '1' : '0', since: since || '' });
  if (!data || data.ok === false) throw new Error(data?.error || 'Server menolak permintaan data.');

  // Samakan nama alias Sheets dengan bentuk yang dipakai jalur realtime lokal.
  // ANOMALI adalah bukti proses (bukan peringatan) agar tidak menggandakan notifikasi.
  // PERINGATAN(op=ALERT) → alerts; (op=WARNING) → warnings; (op=PENJELASAN_SISWA) → penjelasan.
  const teksIndikator = rows => (rows || []).map(i => typeof i === 'string' ? i : [i.kode, i.label].filter(Boolean).join(': ')).filter(Boolean);
  const opOf = row => String(row?.op || '').toUpperCase();
  const isWarning = row => opOf(row) === 'WARNING';
  const isExplanation = row => opOf(row) === 'PENJELASAN_SISWA';
  data.penjelasanSiswa = dedupeById([
    ...(data.penjelasanSiswa || []),
    ...(data.peringatan || []).filter(isExplanation),
    ...(data.peringatan_siswa || []).filter(isExplanation)
  ]);
  const incomingAlerts = [...(data.alerts || []), ...(data.peringatan || []).filter(r => !isWarning(r) && !isExplanation(r))]
    .map(a => ({ ...a, indikator: teksIndikator(a.indikator), kode_indikator: teksIndikator(a.indikator).map(s => s.split(':')[0]) }));
  data.alerts = dedupeById(incomingAlerts);
  data.anomalies = (data.anomalies || []).concat(data.anomali || []);
  data.actions = dedupeById([...(data.actions || []), ...(data.tindakan_guru || [])]);
  data.warnings = dedupeById([...(data.warnings || []), ...(data.peringatan_siswa || []).filter(r => !isExplanation(r)), ...(data.peringatan || []).filter(isWarning)]);
  // Penjelasan siswa melengkapi peringatan yang sudah ada, bukan membuat notifikasi baru.
  for (const p of data.penjelasanSiswa) {
    const patch = { penjelasan_siswa: p.penjelasan_siswa, status: 'dijelaskan', dibaca: true };
    for (const a of data.alerts) if (p.alert_id && a.id === p.alert_id) Object.assign(a, patch);
    for (const w of data.warnings) if ((p.warning_id && w.id === p.warning_id) || (p.alert_id && w.alert_id === p.alert_id)) Object.assign(w, patch);
  }

  // Konfigurasi dari guru mengubah bobot/fitur jika memang ditandai teacherControlled.
  if (data.config) {
    const featOld = await getConfig('features');
    if (data.config.weights) await setConfig('weights', { key: 'weights', ...data.config.weights });
    if (typeof data.config.verificationEnabled === 'boolean') {
      await setConfig('features', { ...featOld, verificationEnabled: !!data.config.verificationEnabled, teacherControlled: true });
    }
    // Revisi v2: waktu, ambang anomali, alur, bus LAN, dan pengaturan buku tulis dari guru.
    for (const key of ['timing', 'anomaly', 'flow', 'realtime', 'notebook']) {
      const value = data.config[key] || data.config[key.toUpperCase()];
      if (value && typeof value === 'object') await setConfig(key, { ...value, key, teacherControlled: true });
    }
  }
  // Data v2: simpan hasil tarik ke store lokal masing-masing tanpa menghapus data lama.
  for (const [store, aliases] of Object.entries(PULL_STORES)) {
    const rows = aliases.map(a => data[a]).find(Array.isArray);
    for (const row of rows || []) {
      if (!row || typeof row !== 'object') continue;
      const keyName = { timing: 'key', alerts: 'id', anomalies: 'id', teacherActions: 'id', warnings: 'id', essayResponses: 'response_id', notebook: 'id', monitor: 'student_id' }[store];
      const key = row[keyName];
      if (!key) continue;
      const old = await get(store, key);
      await put(store, { ...(old || {}), ...row, [keyName]: key, pulled_at: nowISO() });
    }
  }
  for (const p of data.penjelasanSiswa || []) {
    const patch = { penjelasan_siswa: p.penjelasan_siswa, status: 'dijelaskan', dibaca: true, waktu_penjelasan: p.waktu || nowISO() };
    if (p.alert_id) {
      const a = await get('alerts', p.alert_id);
      if (a) await put('alerts', { ...a, ...patch });
    }
    if (p.warning_id) {
      const w = await get('warnings', p.warning_id);
      if (w) await put('warnings', { ...w, ...patch });
    }
  }
  // Migrasi v2: versi awal menyimpan baris ANOMALI ke store alerts. Pindahkan ke
  // store anomalies setelah baris tersebut dikonfirmasi ada di Sheets, agar tidak
  // menggandakan notifikasi. Data proses tetap utuh.
  for (const row of await getAll('alerts')) {
    if (row?.kategori && !row.tingkat) {
      if (row.id) await put('anomalies', { ...row, pulled_at: row.pulled_at || nowISO() });
      if (row.id) await del('alerts', row.id);
    }
  }
  const me = await get('identity', 'current');
  for (const f of data.feedback || []) {
    if (!f.id || (me && f.student_id && f.student_id !== me.student_id)) continue;
    await put('feedback', { ...f, pulled_at: nowISO() });
  }
  for (const approval of (data.approvals || [])) {
    const current = await get('identity', 'current');
    if (approval.status === 'ditolak') {
      const outbox = await getAll('outbox');
      for (const item of outbox.filter(x => x.student_id === approval.student_id && x.status === 'menunggu_guru')) {
        await put('outbox', { ...item, status: 'ditolak', decided_at: nowISO() });
      }
      continue;
    }
    if (current && approval.student_id === current.student_id) {
      await put('identity', { ...current, ...approval.changes, locked: true, update_requested: false, updated_at: nowISO() });
      const outbox = await getAll('outbox');
      for (const item of outbox.filter(x => x.student_id === current.student_id && x.status === 'menunggu_guru')) {
        await put('outbox', { ...item, status: 'disetujui', decided_at: nowISO() });
      }
    }
  }
  await setConfig('sync', { lastSync: nowISO() });
  return data;
}

let timer = null;
export function startAutoSync(onStatus) {
  const tick = async () => {
    const cfg = await getSyncConfig();
    if (!cfg.autoSync || !cfg.url || !cfg.token) return;
    const q = await queueSummary();
    if (q.unsynced) await processQueue({ onStatus });
    if (isOnline()) await pull().catch(() => {});
  };
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 60000);
  window.addEventListener('online', () => tick());
  tick();
  return () => { if (timer) clearInterval(timer); timer = null; };
}

export async function testConnection() {
  const data = await requestPull({ full: '0' }, false);
  return data?.ok !== false;
}
