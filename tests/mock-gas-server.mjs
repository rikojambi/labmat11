// Mock Google Apps Script Web App untuk pengujian sinkronisasi lokal (v1 + v2).
// Meniru upsert berdasarkan idempotency key dan primary key, serta doGet pull/JSONP.
// Jalankan: node tests/mock-gas-server.mjs [port]
import http from 'node:http';

const port = Number(process.argv[2] || 8766);
const TOKEN = '_TOKEN_UJI_12345';

const SHEET_OF = {
  SISWA: 'SISWA', SESI_BELAJAR: 'SESI_BELAJAR', HASIL_MODUL: 'HASIL_MODUL',
  JAWABAN_SOAL: 'JAWABAN_SOAL', PROSES_PENGERJAAN: 'PROSES_PENGERJAAN', REFLEKSI: 'REFLEKSI',
  VERIFIKASI: 'VERIFIKASI', UMPAN_BALIK_GURU: 'UMPAN_BALIK_GURU',
  IDENTITY_CHANGE: 'KONFIGURASI', SET_CONFIG: 'KONFIGURASI',
  WAKTU_SOAL: 'WAKTU_SOAL', ANOMALI: 'ANOMALI', PERINGATAN: 'PERINGATAN',
  TINDAKAN_GURU: 'TINDAKAN_GURU', URAIAN_TERPANDU: 'URAIAN_TERPANDU',
  LATIHAN_BUKU: 'LATIHAN_BUKU', UMPAN_BALIK_SISWA: 'UMPAN_BALIK_SISWA'
};
const KEY_OF = {
  SISWA: 'student_id', SESI_BELAJAR: 'session_id', HASIL_MODUL: 'id', JAWABAN_SOAL: 'response_id',
  PROSES_PENGERJAAN: 'process_id', REFLEKSI: 'reflection_id', VERIFIKASI: 'verification_id',
  UMPAN_BALIK_GURU: 'id', KONFIGURASI: 'kunci', WAKTU_SOAL: 'key', ANOMALI: 'id',
  PERINGATAN: 'id', TINDAKAN_GURU: 'id', URAIAN_TERPANDU: 'response_id',
  LATIHAN_BUKU: 'id', UMPAN_BALIK_SISWA: 'id'
};
const REQUIRED = {
  SISWA: ['student_id', 'nama', 'nisn'], SESI_BELAJAR: ['id', 'student_id'],
  HASIL_MODUL: ['id', 'student_id', 'materi'], JAWABAN_SOAL: ['response_id', 'student_id', 'question_id'],
  PROSES_PENGERJAAN: ['process_id', 'student_id', 'question_id'], REFLEKSI: ['reflection_id', 'student_id'],
  VERIFIKASI: ['verification_id', 'student_id'], UMPAN_BALIK_GURU: ['id', 'student_id', 'komentar'],
  IDENTITY_CHANGE: ['id', 'student_id', 'changes'], SET_CONFIG: ['key'],
  WAKTU_SOAL: ['key', 'session_id', 'question_id'], ANOMALI: ['id', 'student_id', 'question_id'],
  PERINGATAN: ['id', 'student_id'], TINDAKAN_GURU: ['id', 'student_id', 'type'],
  URAIAN_TERPANDU: ['response_id', 'student_id', 'item_id'],
  LATIHAN_BUKU: ['id', 'student_id', 'item_id'], UMPAN_BALIK_SISWA: ['id', 'student_id']
};
const JSON_COLS = {
  KONFIGURASI: ['nilai'], JAWABAN_SOAL: ['jawaban', 'parameter', 'rincian', 'jurnal', 'telemetri'],
  PROSES_PENGERJAAN: ['telemetri'], ANOMALI: ['indikator'], PERINGATAN: ['indikator', 'kode_indikator'],
  URAIAN_TERPANDU: ['steps'], LATIHAN_BUKU: ['instruksi_centang', 'foto'],
  UMPAN_BALIK_SISWA: ['kategori', 'hal_dikuasai', 'kesalahan_diperbaiki', 'materi_diulang', 'saran_belajar', 'bukti', 'ringkasan']
};

const store = new Map();       // sheet -> Map(primary key -> row)
const acceptedIdem = new Map(); // idempotency_key -> 'processed'
const sheetOf = name => { if (!store.has(name)) store.set(name, new Map()); return store.get(name); };
const asJson = v => v === undefined || v === null ? '' : (typeof v === 'string' ? v : JSON.stringify(v));
const parse = v => { try { return JSON.parse(v); } catch { return v; } };

function rowFor(op, p) {
  if (op === 'IDENTITY_CHANGE') return { kunci: `PERMINTAAN_UBAH_IDENTITAS:${p.id}`, nilai: asJson({ ...p, status: p.status || 'menunggu_guru' }) };
  if (op === 'SET_CONFIG') return { kunci: p.key, nilai: asJson(p.approval || p) };
  return { ...p };
}

function upsert(op, p, idemKey) {
  const sheetName = SHEET_OF[op];
  const keyField = KEY_OF[sheetName];
  const row = rowFor(op, p);
  const key = row[keyField] ?? (op === 'SESI_BELAJAR' ? p.id : undefined);
  if (key === undefined || key === null || key === '') return { error: `Field wajib kosong: ${keyField}` };
  const table = sheetOf(sheetName);
  const stamped = { ...row, idempotency_key: idemKey || '', timestamp: new Date().toISOString() };
  const old = table.get(String(key));
  if (old) stamped.idempotency_key = old.idempotency_key || idemKey || '';
  table.set(String(key), stamped);
  return { status: old ? 'updated' : 'created' };
}

function read(name) {
  return [...sheetOf(name).values()].map(raw => {
    const row = { ...raw };
    for (const col of JSON_COLS[name] || []) if (row[col] !== undefined && row[col] !== '') row[col] = parse(row[col]);
    return row;
  });
}

function configFrom(rows) {
  const cfg = {};
  for (const r of rows) {
    const v = parse(r.nilai);
    if (!v || typeof v !== 'object') continue;
    if (r.kunci === 'PENILAIAN') { cfg.weights = v.weights || v; cfg.verificationEnabled = !!v.verificationEnabled; }
    if (r.kunci === 'WAKTU_SOAL') cfg.timing = v.timing || v;
    if (r.kunci === 'AMBANG_ANOMALI') cfg.anomaly = v.anomaly || v;
    if (r.kunci === 'ALUR_BELAJAR') cfg.flow = v.flow || v;
    if (r.kunci === 'REALTIME') cfg.realtime = v.realtime || v;
    if (r.kunci === 'BUKU_TULIS') cfg.notebook = v.notebook || v;
  }
  return cfg;
}

function pull(full) {
  const konfigurasi = read('KONFIGURASI');
  const peringatan = read('PERINGATAN').filter(r => String(r.op || 'ALERT') !== 'WARNING');
  const peringatan_siswa = read('PERINGATAN').filter(r => String(r.op) === 'WARNING');
  const result = {
    ok: true, server_time: new Date().toISOString(),
    config: configFrom(konfigurasi),
    feedback: read('UMPAN_BALIK_GURU').concat(read('UMPAN_BALIK_SISWA')),
    approvals: konfigurasi
      .filter(r => /^(APPROVE_IDENTITY|PERMINTAAN_UBAH_IDENTITAS:)/.test(String(r.kunci)))
      .map(r => ({ kunci: r.kunci, ...(parse(r.nilai) || {}) })),
    peringatan_siswa
  };
  if (full) {
    Object.assign(result, {
      siswa: read('SISWA'), sesi: read('SESI_BELAJAR'), hasil_modul: read('HASIL_MODUL'),
      jawaban: read('JAWABAN_SOAL'), proses: read('PROSES_PENGERJAAN'), refleksi: read('REFLEKSI'),
      verifikasi: read('VERIFIKASI'), umpan: read('UMPAN_BALIK_GURU'), konfigurasi,
      waktu_soal: read('WAKTU_SOAL'), anomali: read('ANOMALI'), tindakan_guru: read('TINDAKAN_GURU'),
      uraian: read('URAIAN_TERPANDU'), buku_tulis: read('LATIHAN_BUKU'), umpan_siswa: read('UMPAN_BALIK_SISWA'),
      peringatan, monitor: []
    });
  }
  return result;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}
function send(res, obj, callback) {
  const text = JSON.stringify(obj);
  const cb = callback ? String(callback).replace(/[^A-Za-z0-9_$]/g, '') : '';
  res.writeHead(200, { 'Content-Type': cb ? 'application/javascript' : 'application/json' })
    .end(cb ? `${cb}(${text});` : text);
}

http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.token !== TOKEN) { send(res, { ok: false, error: 'token invalid' }); return; }
        if (data.action !== 'push' || !Array.isArray(data.ops)) { send(res, { ok: false, error: 'format salah' }); return; }
        const processed = [], skipped = [], errors = [];
        for (const op of data.ops) {
          const key = String(op.idempotency_key || '');
          if (!/^[A-Za-z0-9_:.-]{4,120}$/.test(key)) { errors.push({ key, error: 'Idempotency key tidak valid' }); continue; }
          if (acceptedIdem.has(key)) { skipped.push(key); continue; }
          const cfg = SHEET_OF[op.op];
          if (!cfg) { errors.push({ key, error: 'Operasi tidak dikenali' }); continue; }
          const p = op.payload || {};
          const missing = (REQUIRED[op.op] || []).find(f => p[f] === undefined || p[f] === null || p[f] === '');
          if (missing) { errors.push({ key, error: `Field wajib kosong: ${missing}` }); continue; }
          const result = upsert(op.op, p, key);
          if (result.error) { errors.push({ key, error: result.error }); continue; }
          acceptedIdem.set(key, result.status);
          processed.push(key);
        }
        send(res, { ok: true, processed, skipped, errors, message: `${processed.length} data diterima mock server` });
      } catch (e) { send(res, { ok: false, error: String(e) }); }
      return;
    });
    return;
  }
  const token = url.searchParams.get('token');
  const callback = url.searchParams.get('callback');
  if (token !== TOKEN) { send(res, { ok: false, error: 'token invalid' }, callback); return; }
  send(res, pull(url.searchParams.get('full') === '1'), callback);
}).listen(port, '127.0.0.1', () => {
  console.log(`Mock GAS aktif di http://localhost:${port}/ (token: ${TOKEN})`);
});
