// Pemantauan waktu pengerjaan berbasis jam MONOTONIK (performance.now).
// Durasi dihitung dari selisih monotonik, lalu diakumulasikan ke IndexedDB.
// Perubahan jam sistem tidak dapat memanipulasi durasi. Tidak ada perekaman tombol:
// aktivitas hanya berupa cap waktu "ada aktivitas", bukan isi ketikan.
import { get, put, getAll, getConfig, setConfig } from './database.js';
import { nowISO } from './utils.js';

export const ALLOWED_SECONDS = [30, 60, 120, 180, 240, 300];
const MEM = new Map();          // key -> { anchor, lastActivity, idlePending }
const LOCKS = new Map();        // key -> promise, checkpoint berurutan
let currentKey = null, watcherStarted = false;
const ACTIVITY = { last: performance.now() };

const keyOf = (sessionId, qid) => `${sessionId}::${qid}`;
export const normalizeLimit = n => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 30) return 120;
  // Hanya enam nilai yang diizinkan guru: 30 detik, 1, 2, 3, 4, 5 menit.
  return ALLOWED_SECONDS.reduce((best, s) => Math.abs(s - v) < Math.abs(best - v) ? s : best, ALLOWED_SECONDS[0]);
};

export async function getTimingConfig() {
  const c = await getConfig('timing');
  return {
    ...c,
    allowedSec: Array.isArray(c.allowedSec) && c.allowedSec.length ? c.allowedSec : ALLOWED_SECONDS,
    perQuestion: c.perQuestion || {}, idleThresholdSec: Number(c.idleThresholdSec) || 15
  };
}

export async function setTimingConfig(patch = {}) {
  const cur = await getTimingConfig();
  const next = {
    ...cur, ...patch,
    defaultSec: normalizeLimit(patch.defaultSec ?? cur.defaultSec),
    overallSec: Math.max(60, Math.min(7200, Number(patch.overallSec ?? cur.overallSec) || 3600)),
    perQuestion: { ...(cur.perQuestion || {}), ...(patch.perQuestion || {}) },
    autoLock: !!patch.autoLock, teacherControlled: patch.teacherControlled ?? cur.teacherControlled
  };
  for (const [qid, sec] of Object.entries(next.perQuestion)) next.perQuestion[qid] = normalizeLimit(sec);
  await setConfig('timing', next);
  return next;
}

export async function limitFor(qid) {
  const cfg = await getTimingConfig();
  return normalizeLimit(cfg.perQuestion?.[qid] || cfg.defaultSec);
}

/** Dipanggil TEPAT saat soal ditampilkan dan siap dikerjakan. */
export async function beginQuestion(sessionId, qid, opts = {}) {
  const key = keyOf(sessionId, qid);
  const limit = normalizeLimit(opts.limitSec || await limitFor(qid));
  // Simpan dulu waktu soal yang sebelumnya masih berjalan agar tidak hilang saat pindah soal.
  if (MEM.has(key)) await checkpoint(qid);
  let rec = await get('timing', key);
  if (!rec || rec.session_id !== sessionId) {
    rec = {
      key, session_id: sessionId, question_id: qid,
      displayed_at: nowISO(), first_interaction_at: null, first_answer_at: null, submitted_at: null,
      elapsed_ms: 0, idle_ms: 0, changes: 0, hints: 0, attempts: 0,
      limit_sec: limit, expired: false, locked: false, status: 'displayed', visits: 0,
      updated_at: nowISO()
    };
  } else {
    rec = { ...rec, status: 'displayed', limit_sec: limit, visits: (rec.visits || 0) + 1, updated_at: nowISO() };
  }
  MEM.set(key, { anchor: performance.now(), lastActivity: performance.now(), idlePending: 0 });
  currentKey = key;
  ACTIVITY.last = performance.now();
  await put('timing', rec);
  return rec;
}

function stateFor(qid) {
  if (!currentKey || !currentKey.endsWith('::' + qid)) {
    // Bisa terjadi saat meresume sesi; cari entri memori yang cocok.
    for (const [k, st] of MEM) if (k.endsWith('::' + qid)) return { key: k, st };
  }
  return { key: currentKey, st: MEM.get(currentKey) };
}

function pendingIdle(st, thresholdSec) {
  const now = performance.now();
  const quiet = now - (st.lastActivity || ACTIVITY.last);
  const threshold = Math.max(1, thresholdSec) * 1000;
  return quiet > threshold ? Math.min(now - st.anchor, quiet - threshold) : 0;
}

/** Ambil kondisi waktu terkini tanpa menulis ke DB. */
export async function live(qid) {
  const { key, st } = stateFor(qid);
  if (!key || !st) return null;
  const rec = await get('timing', key);
  if (!rec) return null;
  const cfg = await getTimingConfig();
  const now = performance.now();
  const delta = Math.max(0, now - st.anchor);
  const elapsedMs = (rec.elapsed_ms || 0) + delta;
  const idleMs = (rec.idle_ms || 0) + pendingIdle(st, cfg.idleThresholdSec);
  const limitMs = (rec.limit_sec || 120) * 1000;
  return {
    ...rec, elapsedMs, idleMs, limitMs,
    remainingMs: Math.max(0, limitMs - elapsedMs),
    expired: elapsedMs >= limitMs,
    activeMs: Math.max(0, elapsedMs - idleMs)
  };
}

async function withLock(key, fn) {
  const prev = LOCKS.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  LOCKS.set(key, run);
  try { return await run; } finally { if (LOCKS.get(key) === run) LOCKS.delete(key); }
}

/** Tulis akumulasi waktu berjalan ke IndexedDB (aman dipanggil berulang). */
export async function checkpoint(qid) {
  const { key, st } = stateFor(qid);
  if (!key || !st) return null;
  return withLock(key, async () => {
    const rec = await get('timing', key);
    if (!rec) return null;
    const cfg = await getTimingConfig();
    const now = performance.now();
    const delta = Math.max(0, now - st.anchor);
    const idle = pendingIdle(st, cfg.idleThresholdSec);
    const updated = {
      ...rec,
      elapsed_ms: (rec.elapsed_ms || 0) + delta,
      idle_ms: (rec.idle_ms || 0) + idle,
      expired: ((rec.elapsed_ms || 0) + delta) >= (rec.limit_sec || 120) * 1000,
      updated_at: nowISO()
    };
    // Jika sedang tidak aktif, pertahankan "start idle" agar idle berikutnya terus terakumulasi.
    const threshold = Math.max(1, cfg.idleThresholdSec) * 1000;
    const nextActivity = idle > 0 ? now - threshold : now;
    MEM.set(key, { ...st, anchor: now, lastActivity: nextActivity, idlePending: 0 });
    await put('timing', updated);
    return updated;
  });
}

function touch(st) { if (st) { st.lastActivity = performance.now(); ACTIVITY.last = st.lastActivity; } }

export async function markInteraction(qid) {
  await checkpoint(qid); // cap waktu tidak aktif sebelum aktivitas baru
  const { st } = stateFor(qid); touch(st);
  const rec = await currentRecord(qid);
  if (rec && !rec.first_interaction_at) {
    const updated = { ...rec, first_interaction_at: nowISO() };
    await put('timing', updated);
  }
}

export async function currentRecord(qid) {
  const { key } = stateFor(qid);
  return key ? get('timing', key) : null;
}

export async function markFirstAnswer(qid) {
  await checkpoint(qid);
  const { st } = stateFor(qid); touch(st);
  const rec = await currentRecord(qid);
  if (rec && !rec.first_answer_at) await put('timing', { ...rec, first_answer_at: nowISO() });
}

export async function addChange(qid, n = 1) {
  await checkpoint(qid);
  const { st } = stateFor(qid); touch(st);
  const rec = await currentRecord(qid);
  if (rec) await put('timing', { ...rec, changes: (rec.changes || 0) + n, attempts: (rec.attempts || 0) + n });
}

export async function addHint(qid) {
  await checkpoint(qid);
  const { st } = stateFor(qid); touch(st);
  const rec = await currentRecord(qid);
  if (rec) await put('timing', { ...rec, hints: (rec.hints || 0) + 1 });
}

export async function markSubmit(qid) {
  await checkpoint(qid);
  const rec = await currentRecord(qid);
  if (!rec) return null;
  const updated = {
    ...rec, submitted_at: nowISO(), status: rec.expired ? 'expired' : 'selesai',
    first_interaction_at: rec.first_interaction_at || nowISO(),
    first_answer_at: rec.first_answer_at || nowISO(), locked: !!rec.expired,
    updated_at: nowISO()
  };
  await put('timing', updated);
  return updated;
}

export async function isExpired(qid) {
  const l = await live(qid);
  return !!(l && l.expired);
}

/** Total asesmen: akumulasi semua soal + delta soal aktif. */
export async function overall(sessionId) {
  const cfg = await getTimingConfig();
  const rows = (await getAll('timing')).filter(r => r.session_id === sessionId);
  let elapsed = rows.reduce((s, r) => s + (r.elapsed_ms || 0), 0);
  let activeKey = null;
  for (const [k, st] of MEM) if (k.startsWith(sessionId + '::') && currentKey === k) {
    elapsed += Math.max(0, performance.now() - st.anchor); activeKey = k;
  }
  const totalMs = cfg.overallSec * 1000;
  return { elapsedMs: elapsed, totalMs, remainingMs: Math.max(0, totalMs - elapsed), expired: elapsed >= totalMs, activeKey };
}

export async function sessionTiming(sessionId) {
  return (await getAll('timing')).filter(r => r.session_id === sessionId)
    .sort((a, b) => String(a.question_id).localeCompare(String(b.question_id)));
}

/** Catatan aktivitas pasif — tidak merekaman isi keyboard/layar. */
export function startActivityWatcher() {
  if (watcherStarted || typeof document === 'undefined') return;
  watcherStarted = true;
  const events = ['pointerdown', 'mousemove', 'keydown', 'input', 'scroll', 'touchstart'];
  events.forEach(type => document.addEventListener(type, () => {
    ACTIVITY.last = performance.now();
    if (currentKey && MEM.has(currentKey)) MEM.get(currentKey).lastActivity = ACTIVITY.last;
  }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ACTIVITY.last = performance.now();
      if (currentKey && MEM.has(currentKey)) MEM.get(currentKey).lastActivity = ACTIVITY.last;
    }
  });
  // Checkpoint berkala agar reload/crash tidak kehilangan durasi.
  setInterval(() => { if (currentKey) checkpoint(currentKey.split('::').pop()).catch(() => {}); }, 5000);
}

/** Hentikan akumulasi waktu untuk sesi yang sudah selesai. */
export async function finishSession(sessionId) {
  for (const key of [...MEM.keys()]) {
    if (!key.startsWith(sessionId + '::')) continue;
    await checkpoint(key.split('::').pop());
    MEM.delete(key);
    LOCKS.delete(key);
  }
  if (currentKey?.startsWith(sessionId + '::')) currentKey = null;
}

export function formatMs(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)} mnt ${String(s % 60).padStart(2, '0')} dtk` : `${s} dtk`;
}
