// IndexedDB — penyimpanan UTAMA seluruh data pekerjaan siswa (bukan localStorage).
import { nowISO, uid } from './utils.js';

const DB_NAME = 'labmat-db';
const VERSION = 3;
let dbPromise = null;

// Store lama dipertahankan persis; store baru ditambahkan pada migrasi v2.
export const STORES = [
  'identity', 'sessions', 'responses', 'processes', 'reflections', 'notes', 'progress', 'config', 'syncQueue', 'outbox', 'feedback',
  'timing', 'alerts', 'anomalies', 'teacherActions', 'warnings', 'essayResponses', 'notebook', 'monitor'
];

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Browser tidak mendukung IndexedDB')); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const make = (name, key, indexes = {}) => {
        if (db.objectStoreNames.contains(name)) return; // aman saat migrasi v1 → v2
        const s = db.createObjectStore(name, { keyPath: key });
        for (const [idx, field] of Object.entries(indexes)) s.createIndex(idx, field, { unique: false });
      };
      make('identity', 'key');
      make('sessions', 'id', { byStudent: 'student_id', byStatus: 'status' });
      make('responses', 'response_id', { bySession: 'session_id', byQuestion: 'question_id', byStudent: 'student_id' });
      make('processes', 'process_id', { byQuestion: 'question_id', byStudent: 'student_id' });
      make('reflections', 'reflection_id', { bySession: 'session_id' });
      make('notes', 'note_id', { byStudent: 'student_id' });
      make('progress', 'key');
      make('config', 'key');
      make('syncQueue', 'idempotency_key', { byStatus: 'status' });
      make('outbox', 'id');
      make('feedback', 'id', { byStudent: 'student_id' });
      // --- Fitur revisi v2 ---
      make('timing', 'key', { bySession: 'session_id', byStudent: 'student_id' });
      make('alerts', 'id', { byStudent: 'student_id', byStatus: 'status' });
      make('anomalies', 'id', { byStudent: 'student_id', bySession: 'session_id' });
      make('teacherActions', 'id', { byAlert: 'alert_id', byStudent: 'student_id' });
      make('warnings', 'id', { byStudent: 'student_id', byStatus: 'status' });
      make('essayResponses', 'response_id', { byStudent: 'student_id', byItem: 'item_id' });
      make('notebook', 'id', { byStudent: 'student_id', byItem: 'item_id' });
      make('monitor', 'student_id');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB diblokir aplikasi lain. Tutup tab lain lalu muat ulang.'));
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error || new Error('Transaksi dibatalkan'));
  });
}
export const get = (store, key) => run(store, 'readonly', s => s.get(key));
export const getAll = store => run(store, 'readonly', s => s.getAll());
export const put = (store, value) => run(store, 'readwrite', s => s.put(value));
export const del = (store, key) => run(store, 'readwrite', s => s.delete(key));
export const clear = store => run(store, 'readwrite', s => s.clear());
export const count = store => run(store, 'readonly', s => s.count());
export async function putMany(store, values) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite'), s = tx.objectStore(store);
    values.forEach(v => s.put(v));
    tx.oncomplete = () => resolve(values.length); tx.onerror = () => reject(tx.error);
  });
}
export async function getByIndex(store, index, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).index(index).getAll(value);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}

const DEFAULTS = {
  sync: { key: 'sync', url: '', token: '', autoSync: true, intervalSec: 60, lastSync: null },
  weights: { key: 'weights', jawaban: 60, proses: 20, interpretasi: 10, refleksi: 10 },
  features: { key: 'features', verificationEnabled: false, teacherControlled: false },
  activeSession: { key: 'activeSession', value: null },
  // Waktu: 30 dtk s.d. 5 mnt per soal, dapat berbeda tiap soal; total asesmen; kunci otomatis.
  timing: {
    key: 'timing', defaultSec: 120, perQuestion: {}, overallSec: 3600, autoLock: false,
    allowedSec: [30, 60, 120, 180, 240, 300], idleThresholdSec: 15, teacherControlled: false
  },
  // Ambang anomali TIDAK universal: per jenis soal → per soal → hasil uji coba kelas.
  anomaly: {
    key: 'anomaly',
    reasonableByType: { single: 60, multiple: 90, completion: 30 },
    reasonableByModule: { aritmetika: 75, geometri: 85, lingkaran: 80 },
    reasonableByQuestion: {},
    weights: { A1: 2, A2: 3, A3: 2, B1: 3, B2: 1, B3: 2, C1: 3, C2: 2, C3: 2 },
    thresholds: { perluPerhatian: 2, anomaliTinggi: 5 },
    classTrial: {}, teacherControlled: false
  },
  // Alur belajar: guru menentukan tahap wajib/opsional.
  flow: {
    key: 'flow',
    stages: [
      { id: 'pembukaan', label: 'Pembukaan & tujuan belajar', required: true },
      { id: 'materi', label: 'Materi interaktif', required: true },
      { id: 'simulasi', label: 'Simulasi & eksplorasi', required: false },
      { id: 'contoh', label: 'Contoh penyelesaian', required: false },
      { id: 'latihan', label: 'Latihan terpandu', required: true },
      { id: 'uraian', label: 'Soal uraian terstruktur', required: true },
      { id: 'asesmen', label: 'Asesmen HOTS', required: true },
      { id: 'analisis', label: 'Analisis hasil pengerjaan', required: true },
      { id: 'umpanbalik', label: 'Umpan balik personal', required: true },
      { id: 'bukutulis', label: 'Latihan lanjutan di buku tulis', required: true },
      { id: 'refleksi', label: 'Refleksi', required: true },
      { id: 'sinkronisasi', label: 'Sinkronisasi ke guru', required: false }
    ],
    teacherControlled: false
  },
  realtime: { key: 'realtime', lanUrl: '', pollSec: 8, enabled: true },
  // Foto latihan buku tulis HANYA diminta jika guru mengaktifkan; tidak ada kamera tersembunyi.
  notebook: { key: 'notebook', fotoDiminta: false, teacherControlled: false, catatanGuru: '' }
};

export async function getConfig(key) {
  const found = await get('config', key);
  const base = DEFAULTS[key] || { key };
  return { ...base, ...(found || {}) };
}
export async function setConfig(key, value) {
  // Gabungkan dengan nilai tersimpan agar pembaruan sebagian (mis. lastSync)
  // tidak menghapus pengaturan lain seperti URL/token sinkronisasi.
  const existing = await get('config', key);
  return put('config', { ...(DEFAULTS[key] || {}), ...(existing || {}), ...value, key });
}

export async function seedDefaults() {
  for (const [key, val] of Object.entries(DEFAULTS)) if (!(await get('config', key))) await put('config', val);
}

export async function exportBackup() {
  const data = {};
  for (const s of STORES) data[s] = await getAll(s);
  return { app: 'LABMAT-SMK-XI', version: 1, exported_at: nowISO(), data };
}
export async function importBackup(json) {
  const obj = typeof json === 'string' ? JSON.parse(json) : json;
  if (obj.app !== 'LABMAT-SMK-XI' || !obj.data) throw new Error('Format backup tidak dikenali');
  let n = 0;
  for (const s of STORES) if (Array.isArray(obj.data[s])) n += await putMany(s, obj.data[s]);
  return n;
}

export const newStudentId = () => uid('STU');
export const newSessionId = (studentId) => `SES-${studentId}-${Date.now().toString(36).toUpperCase()}`;
