/**
 * LABMAT SMK XI — API sinkronisasi Google Apps Script (v1 + revisi v2).
 * Deployment: Web App, akses "Anyone" (token diverifikasi di dalam skrip).
 * Token admin dibuat oleh setup() dan disimpan di sheet KONFIGURASI — TIDAK ada di frontend.
 * Sheet v1 dipertahankan; sheet v2 ditambahkan tanpa menghapus data lama.
 */
var SS = SpreadsheetApp.getActiveSpreadsheet();

var HEADERS = {
  SISWA: ['student_id', 'nisn', 'nama', 'kelas', 'program_keahlian', 'sekolah', 'tanggal_daftar', 'idempotency_key', 'timestamp'],
  SESI_BELAJAR: ['session_id', 'student_id', 'seed', 'waktu_mulai', 'waktu_selesai', 'durasi', 'status', 'skor', 'idempotency_key', 'timestamp'],
  HASIL_MODUL: ['id', 'student_id', 'session_id', 'materi', 'nilai', 'tuntas', 'jumlah_soal', 'waktu', 'idempotency_key', 'timestamp'],
  JAWABAN_SOAL: ['response_id', 'student_id', 'session_id', 'question_id', 'materi', 'tipe_soal', 'jawaban', 'jawaban_benar', 'skor', 'waktu_mulai', 'waktu_selesai', 'durasi', 'status', 'seed', 'varian', 'parameter', 'rincian', 'jurnal', 'telemetri', 'idempotency_key', 'timestamp'],
  PROSES_PENGERJAAN: ['process_id', 'student_id', 'question_id', 'informasi_diketahui', 'konsep', 'strategi', 'perhitungan', 'interpretasi', 'telemetri', 'waktu', 'idempotency_key', 'timestamp'],
  REFLEKSI: ['reflection_id', 'student_id', 'session_id', 'question_id', 'jenis', 'teks', 'benar', 'waktu', 'idempotency_key', 'timestamp'],
  VERIFIKASI: ['verification_id', 'student_id', 'session_id', 'question_id', 'konsep', 'jawaban', 'benar', 'pembahasan', 'waktu', 'idempotency_key', 'timestamp'],
  UMPAN_BALIK_GURU: ['id', 'student_id', 'topik', 'komentar', 'remedial', 'guru', 'waktu', 'idempotency_key', 'timestamp'],
  KONFIGURASI: ['kunci', 'nilai', 'idempotency_key', 'timestamp'],
  // --- Revisi v2 ---
  WAKTU_SOAL: ['key', 'session_id', 'student_id', 'question_id', 'displayed_at', 'first_interaction_at', 'first_answer_at', 'submitted_at', 'elapsed_ms', 'idle_ms', 'changes', 'hints', 'attempts', 'limit_sec', 'expired', 'locked', 'status', 'visits', 'updated_at', 'idempotency_key', 'timestamp'],
  ANOMALI: ['id', 'student_id', 'session_id', 'question_id', 'materi', 'nomor_soal', 'durasi', 'idle_ms', 'elapsed_ms', 'perubahan', 'petunjuk', 'waktu_wajar', 'indikator', 'skor', 'kategori', 'penjelasan_siswa', 'status', 'waktu', 'idempotency_key', 'timestamp'],
  PERINGATAN: ['id', 'op', 'student_id', 'nama', 'nisn', 'kelas', 'session_id', 'question_id', 'materi', 'nomor_soal', 'durasi', 'indikator', 'kode_indikator', 'tingkat', 'skor', 'judul', 'pesan', 'catatan_guru', 'alert_id', 'warning_id', 'dibaca', 'status', 'penjelasan_siswa', 'waktu', 'idempotency_key', 'timestamp'],
  TINDAKAN_GURU: ['id', 'alert_id', 'student_id', 'type', 'label', 'catatan', 'guru', 'status', 'waktu', 'idempotency_key', 'timestamp'],
  URAIAN_TERPANDU: ['response_id', 'student_id', 'item_id', 'module', 'steps', 'status', 'waktu_mulai', 'waktu_selesai', 'updated_at', 'graded_at', 'graded_by', 'idempotency_key', 'timestamp'],
  LATIHAN_BUKU: ['id', 'student_id', 'item_id', 'module', 'judul', 'instruksi_centang', 'refleksi', 'foto', 'status', 'waktu', 'waktu_selesai', 'nilai_guru', 'status_guru', 'komentar_guru', 'diperiksa_guru', 'waktu_pemeriksaan', 'idempotency_key', 'timestamp'],
  UMPAN_BALIK_SISWA: ['id', 'student_id', 'jenis', 'tingkat', 'kategori', 'hal_dikuasai', 'kesalahan_diperbaiki', 'materi_diulang', 'saran_belajar', 'bukti', 'ringkasan', 'catatan', 'waktu', 'idempotency_key', 'timestamp']
};

var JSON_COLS = {
  JAWABAN_SOAL: ['jawaban', 'parameter', 'rincian', 'jurnal', 'telemetri'],
  PROSES_PENGERJAAN: ['telemetri'],
  KONFIGURASI: ['nilai'],
  ANOMALI: ['indikator'],
  PERINGATAN: ['indikator', 'kode_indikator'],
  URAIAN_TERPANDU: ['steps'],
  LATIHAN_BUKU: ['instruksi_centang', 'foto'],
  UMPAN_BALIK_SISWA: ['kategori', 'hal_dikuasai', 'kesalahan_diperbaiki', 'materi_diulang', 'saran_belajar', 'bukti', 'ringkasan']
};

var OPS = {
  SISWA: { sheet: 'SISWA', key: 'student_id', map: function (p) { return { student_id: p.student_id, nisn: p.nisn, nama: p.nama, kelas: p.kelas, program_keahlian: p.program_keahlian, sekolah: p.sekolah, tanggal_daftar: p.tanggal_daftar }; }, required: ['student_id', 'nama', 'nisn'] },
  SESI_BELAJAR: { sheet: 'SESI_BELAJAR', key: 'session_id', map: function (p) { return { session_id: p.id, student_id: p.student_id, seed: p.seed, waktu_mulai: p.waktu_mulai, waktu_selesai: p.waktu_selesai, durasi: p.durasi || 0, status: p.status, skor: p.skor || 0 }; }, required: ['id', 'student_id'] },
  HASIL_MODUL: { sheet: 'HASIL_MODUL', key: 'id', map: function (p) { return { id: p.id, student_id: p.student_id, session_id: p.session_id, materi: p.materi, nilai: p.nilai, tuntas: p.tuntas, jumlah_soal: p.jumlah_soal, waktu: p.waktu }; }, required: ['id', 'student_id', 'materi'] },
  JAWABAN_SOAL: { sheet: 'JAWABAN_SOAL', key: 'response_id', map: function (p) { return { response_id: p.response_id, student_id: p.student_id, session_id: p.session_id, question_id: p.question_id, materi: p.materi, tipe_soal: p.tipe_soal, jawaban: json(p.jawaban), jawaban_benar: String(p.jawaban_benar || ''), skor: p.skor, waktu_mulai: p.waktu_mulai, waktu_selesai: p.waktu_selesai, durasi: p.durasi, status: p.status, seed: p.seed, varian: p.varian, parameter: json(p.parameter), rincian: json(p.rincian), jurnal: json(p.jurnal), telemetri: json(p.telemetri) }; }, required: ['response_id', 'student_id', 'question_id'] },
  PROSES_PENGERJAAN: { sheet: 'PROSES_PENGERJAAN', key: 'process_id', map: function (p) { return { process_id: p.process_id, student_id: p.student_id, question_id: p.question_id, informasi_diketahui: p.informasi_diketahui, konsep: p.konsep, strategi: p.strategi, perhitungan: p.perhitungan, interpretasi: p.interpretasi, telemetri: json(p.telemetri), waktu: p.waktu }; }, required: ['process_id', 'student_id', 'question_id'] },
  REFLEKSI: { sheet: 'REFLEKSI', key: 'reflection_id', map: function (p) { return { reflection_id: p.reflection_id, student_id: p.student_id, session_id: p.session_id, question_id: p.question_id, jenis: p.jenis, teks: p.teks, benar: p.benar, waktu: p.waktu }; }, required: ['reflection_id', 'student_id'] },
  VERIFIKASI: { sheet: 'VERIFIKASI', key: 'verification_id', map: function (p) { return { verification_id: p.verification_id, student_id: p.student_id, session_id: p.session_id, question_id: p.question_id, konsep: p.konsep, jawaban: p.jawaban, benar: p.benar, pembahasan: p.pembahasan, waktu: p.waktu }; }, required: ['verification_id', 'student_id'] },
  UMPAN_BALIK_GURU: { sheet: 'UMPAN_BALIK_GURU', key: 'id', map: function (p) { return { id: p.id, student_id: p.student_id, topik: p.topik, komentar: p.komentar, remedial: p.remedial, guru: p.guru, waktu: p.waktu }; }, required: ['id', 'student_id', 'komentar'] },
  IDENTITY_CHANGE: { sheet: 'KONFIGURASI', key: 'kunci', map: function (p) { return { kunci: 'PERMINTAAN_UBAH_IDENTITAS:' + p.id, nilai: json({ id: p.id, student_id: p.student_id, changes: p.changes, alasan: p.alasan, status: p.status || 'menunggu_guru', created_at: p.created_at }) }; }, required: ['id', 'student_id', 'changes'] },
  SET_CONFIG: { sheet: 'KONFIGURASI', key: 'kunci', map: function (p) { return { kunci: p.key, nilai: json(p.approval || p) }; }, required: ['key'] },
  WAKTU_SOAL: { sheet: 'WAKTU_SOAL', key: 'key', map: function (p) { return pick(HEADERS.WAKTU_SOAL, p); }, required: ['key', 'session_id', 'question_id'] },
  ANOMALI: { sheet: 'ANOMALI', key: 'id', map: function (p) { var r = pick(HEADERS.ANOMALI, p); r.indikator = json(p.indikator); return r; }, required: ['id', 'student_id', 'question_id'] },
  PERINGATAN: { sheet: 'PERINGATAN', key: 'id', map: function (p) { var r = pick(HEADERS.PERINGATAN, p); r.op = p.op || (String(p.id || '').indexOf('WRN') === 0 ? 'WARNING' : 'ALERT'); r.indikator = json(p.indikator); r.kode_indikator = json(p.kode_indikator); return r; }, required: ['id', 'student_id'] },
  TINDAKAN_GURU: { sheet: 'TINDAKAN_GURU', key: 'id', map: function (p) { return pick(HEADERS.TINDAKAN_GURU, p); }, required: ['id', 'student_id', 'type'] },
  URAIAN_TERPANDU: { sheet: 'URAIAN_TERPANDU', key: 'response_id', map: function (p) { var r = pick(HEADERS.URAIAN_TERPANDU, p); r.steps = json(p.steps); return r; }, required: ['response_id', 'student_id', 'item_id'] },
  LATIHAN_BUKU: { sheet: 'LATIHAN_BUKU', key: 'id', map: function (p) { var r = pick(HEADERS.LATIHAN_BUKU, p); r.instruksi_centang = json(p.instruksi_centang); r.foto = json(p.foto); return r; }, required: ['id', 'student_id', 'item_id'] },
  UMPAN_BALIK_SISWA: { sheet: 'UMPAN_BALIK_SISWA', key: 'id', map: function (p) {
    var r = pick(HEADERS.UMPAN_BALIK_SISWA, p);
    ['kategori', 'hal_dikuasai', 'kesalahan_diperbaiki', 'materi_diulang', 'saran_belajar', 'bukti', 'ringkasan'].forEach(function (k) { r[k] = json(p[k]); });
    return r;
  }, required: ['id', 'student_id'] }
};

function pick(headers, p) {
  var out = {};
  headers.forEach(function (h) { out[h] = p[h] !== undefined && p[h] !== null ? p[h] : ''; });
  return out;
}
function json(v) { return v === undefined || v === null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)); }
function parse(v) { try { return JSON.parse(v); } catch (e) { return v; } }

/** Jalankan sekali dari editor Apps Script untuk membuat sheet & token. Aman dijalankan ulang. */
function setup() {
  Object.keys(HEADERS).forEach(function (name) { getOrCreateSheet(name, HEADERS[name]); });
  var sh = SS.getSheetByName('KONFIGURASI');
  var tokenRow = findRow(sh, 'kunci', 'token');
  if (!tokenRow) {
    var token = Utilities.getUuid() + '-' + Utilities.getUuid();
    sh.appendRow(['token', token, 'setup:' + Date.now(), new Date().toISOString()]);
    Logger.log('TOKEN SINKRONISASI: ' + token);
    SpreadsheetApp.getUi().alert('Token sinkronisasi dibuat. Lihat sheet KONFIGURASI baris kunci=token. Salin ke aplikasi.');
  } else {
    SpreadsheetApp.getUi().alert('Token sudah ada. Sheet revisi v2 sudah ditambahkan bila belum ada.');
  }
}

function getOrCreateSheet(name, headers) {
  var sh = SS.getSheetByName(name) || SS.insertSheet(name);
  if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}
function findRow(sh, header, value) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = headers.indexOf(header) + 1; if (!col) return 0;
  var vals = sh.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(value)) return i + 2;
  return 0;
}
function upsert(sh, headers, keyHeader, keyValue, rowObj, idemKey) {
  // Proteksi duplikasi berdasarkan idempotency key.
  var idemRow = idemKey ? findRow(sh, 'idempotency_key', idemKey) : 0;
  if (idemRow) return 'skipped';
  var row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  var idx = findRow(sh, keyHeader, keyValue);
  if (idx) {
    var hIdx = headers.indexOf('idempotency_key');
    if (hIdx >= 0) row[hIdx] = sh.getRange(idx, hIdx + 1).getValue() || idemKey;
    var tIdx = headers.indexOf('timestamp'); if (tIdx >= 0) row[tIdx] = new Date().toISOString();
    sh.getRange(idx, 1, 1, headers.length).setValues([row]);
    return 'updated';
  }
  row[headers.indexOf('idempotency_key')] = idemKey || '';
  row[headers.indexOf('timestamp')] = new Date().toISOString();
  sh.appendRow(row);
  return 'created';
}
function decodeRow(name, row) {
  var cols = JSON_COLS[name] || [];
  cols.forEach(function (k) { if (row[k] !== undefined && row[k] !== '') row[k] = parse(row[k]); });
  return row;
}
function readSheet(name) {
  var sh = SS.getSheetByName(name); if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var h = vals[0];
  return vals.slice(1).filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return decodeRow(name, o); });
}
function getToken() {
  var sh = SS.getSheetByName('KONFIGURASI'); if (!sh || sh.getLastRow() < 2) return '';
  var row = findRow(sh, 'kunci', 'token');
  return row ? String(sh.getRange(row, 2).getValue()) : '';
}
function output(obj, callback) {
  var txt = JSON.stringify(obj);
  var out;
  if (callback) out = ContentService.createTextOutput(String(callback).replace(/[^A-Za-z0-9_$]/g, '') + '(' + txt + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  else out = ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
  try {
    out.setHeader('Access-Control-Allow-Origin', '*');
    out.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    out.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    out.setHeader('Cache-Control', 'no-store');
  } catch (e) { /* versi lama ContentService tidak mendukung setHeader */ }
  return out;
}
function unauthorized(e) { return { ok: false, error: 'Kode sinkronisasi tidak valid', debug: e ? String(e.parameter && e.parameter.token).slice(0, 4) : '' }; }

var PULL_KEYS = {
  SISWA: 'siswa', SESI_BELAJAR: 'sesi', HASIL_MODUL: 'hasil_modul', JAWABAN_SOAL: 'jawaban',
  PROSES_PENGERJAAN: 'proses', REFLEKSI: 'refleksi', VERIFIKASI: 'verifikasi',
  UMPAN_BALIK_GURU: 'umpan', KONFIGURASI: 'konfigurasi',
  WAKTU_SOAL: 'waktu_soal', ANOMALI: 'anomali', TINDAKAN_GURU: 'tindakan_guru',
  URAIAN_TERPANDU: 'uraian', LATIHAN_BUKU: 'buku_tulis', UMPAN_BALIK_SISWA: 'umpan_siswa'
};

function approvalsFrom(rows) {
  return rows.filter(function (r) { return /^(APPROVE_IDENTITY|PERMINTAAN_UBAH_IDENTITAS:)/.test(String(r.kunci)); })
    .map(function (r) { var v = parse(r.nilai); return typeof v === 'object' && v ? v : {}; });
}
function configFrom(rows) {
  var cfg = {};
  rows.forEach(function (r) {
    var v = parse(r.nilai);
    if (!v || typeof v !== 'object') return;
    if (r.kunci === 'PENILAIAN') {
      cfg.weights = v.weights || v;
      cfg.verificationEnabled = !!(v.verificationEnabled);
    }
    if (r.kunci === 'WAKTU_SOAL') cfg.timing = v.timing || v;
    if (r.kunci === 'AMBANG_ANOMALI') cfg.anomaly = v.anomaly || v;
    if (r.kunci === 'ALUR_BELAJAR') cfg.flow = v.flow || v;
    if (r.kunci === 'REALTIME') cfg.realtime = v.realtime || v;
    if (r.kunci === 'BUKU_TULIS') cfg.notebook = v.notebook || v;
  });
  return cfg;
}

function doGet(e) {
  var p = e.parameter || {};
  if (!p.token || p.token !== getToken()) return output(unauthorized(e), p.callback);
  if (p.action !== 'pull') return output({ ok: false, error: 'Aksi tidak dikenali' }, p.callback);
  var result = { ok: true, server_time: new Date().toISOString() };
  var sheets = {};
  Object.keys(PULL_KEYS).forEach(function (name) { sheets[name] = readSheet(name); });
  if (p.full === '1') {
    Object.keys(PULL_KEYS).forEach(function (name) { result[PULL_KEYS[name]] = sheets[name]; });
    // PERINGATAN berisi alert guru dan pesan untuk siswa; pisahkan agar siswa tidak menerima antrean kelas.
    result.peringatan = sheets.PERINGATAN.filter(function (r) { return String(r.op || 'ALERT') !== 'WARNING'; });
    result.peringatan_siswa = sheets.PERINGATAN.filter(function (r) { return String(r.op) === 'WARNING'; });
    result.monitor = [];
    result.feedback = sheets.UMPAN_BALIK_GURU.concat(sheets.UMPAN_BALIK_SISWA);
    result.config = configFrom(sheets.KONFIGURASI);
    result.approvals = approvalsFrom(sheets.KONFIGURASI);
  } else {
    result.config = configFrom(sheets.KONFIGURASI);
    result.feedback = sheets.UMPAN_BALIK_GURU.concat(sheets.UMPAN_BALIK_SISWA);
    result.approvals = approvalsFrom(sheets.KONFIGURASI);
    result.peringatan_siswa = sheets.PERINGATAN.filter(function (r) { return String(r.op) === 'WARNING'; });
  }
  return output(result, p.callback);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (!body.token || body.token !== getToken()) return output(unauthorized());
    if (body.action !== 'push' || !Array.isArray(body.ops)) return output({ ok: false, error: 'Format permintaan salah' });
    var processed = [], skipped = [], errors = [];
    body.ops.forEach(function (op) {
      var cfg = OPS[op.op];
      if (!cfg) { errors.push({ key: op.idempotency_key, error: 'Operasi tidak dikenali' }); return; }
      var p = op.payload || {};
      for (var i = 0; i < cfg.required.length; i++) {
        if (p[cfg.required[i]] === undefined || p[cfg.required[i]] === null || p[cfg.required[i]] === '') {
          errors.push({ key: op.idempotency_key, error: 'Field wajib kosong: ' + cfg.required[i] }); return;
        }
      }
      if (!/^[A-Za-z0-9_:.-]{4,120}$/.test(String(op.idempotency_key || ''))) {
        errors.push({ key: op.idempotency_key, error: 'Idempotency key tidak valid' }); return;
      }
      var sh = getOrCreateSheet(cfg.sheet, HEADERS[cfg.sheet]);
      var mapped = cfg.map(p);
      var status = upsert(sh, HEADERS[cfg.sheet], cfg.key, mapped[cfg.key], mapped, op.idempotency_key);
      (status === 'skipped' ? skipped : processed).push(op.idempotency_key);
    });
    return output({ ok: true, processed: processed, skipped: skipped, errors: errors, message: processed.length + ' data diterima' });
  } catch (err) {
    return output({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doOptions(e) { return output({ ok: true }); }
