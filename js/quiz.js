// Asesmen HOTS: 20 soal, jurnal proses, variasi seed, kunci awal dikunci, verifikasi.
// Revisi v2: waktu monotonik, batas per soal/total, auto-lock, indikator proses, umpan balik aturan.
import { QUESTIONS, VERIFICATION, renderQuestion, hashString } from '../data/questions.js';
import { get, put, getAll, getByIndex, getConfig, newSessionId } from './database.js';
import { enqueue } from './sync.js';
import { scoreOne, summarize } from './scoring.js';
import { assessmentGate, markStage } from './flow.js';
import * as timing from './timing.js';
import { analyzeSession, getAnomalyConfig } from './anomaly.js';
import { createAlert, publishTiming } from './realtime.js';
import { generatePersonalFeedback } from './feedback.js';
import { escapeHtml, nowISO, uid, formatDurasi, toast, parseNum, confirmDialog, formatDateTime } from './utils.js';

let active = null, rendered = [], index = 0, answers = {}, journals = {}, follows = {}, locks = {}, flags = {}, telemetry = {}, reflections = {}, verifyAnswers = {}, phase = 'intro';
let timer = null, timeLocked = {}, overallLocked = false, autoLockNotice = false;

const byId = id => QUESTIONS.find(q => q.id === id);
const responseId = (sid, qid) => `RSP-${sid}-${qid}`;
const minJournal = { informasi: 10, konsep: 5, strategi: 8, perhitungan: 8, interpretasi: 10 };

function seededOrder(seed) {
  return ['aritmetika', 'geometri', 'lingkaran'].flatMap(m => {
    const ids = QUESTIONS.filter(q => q.materi === m).map(q => q.id);
    const rot = hashString(seed + m) % ids.length;
    return [...ids.slice(rot), ...ids.slice(0, rot)];
  });
}

export async function getActiveSession() {
  const cfg = await getConfig('activeSession');
  if (!cfg.value) return null;
  const s = await get('sessions', cfg.value);
  return s && s.status === 'in_progress' ? s : null;
}

export async function startSession(identity) {
  const prev = await getActiveSession();
  if (prev) return prev;
  const id = newSessionId(identity.student_id);
  const seedNum = hashString(identity.student_id + nowISO());
  const seed = `SISWA-${identity.student_id}-${seedNum}`;
  const session = {
    id, student_id: identity.student_id, seed, seed_num: seedNum,
    waktu_mulai: nowISO(), waktu_selesai: null, status: 'in_progress',
    question_order: seededOrder(seed), jawaban: {}, phase: 'asesmen'
  };
  await put('sessions', session);
  await put('config', { key: 'activeSession', value: id });
  await enqueue('SESI_BELAJAR', session, `sesi:${id}`);
  for (const qid of session.question_order) {
    await put('responses', {
      response_id: responseId(id, qid), student_id: identity.student_id, session_id: id,
      question_id: qid, materi: byId(qid).materi, tipe_soal: byId(qid).tipe,
      jawaban: null, skor: 0, status: 'draft', seed, waktu_mulai: nowISO(), waktu_selesai: null, durasi: 0
    });
  }
  active = session;
  rendered = session.question_order.map(qid => renderQuestion(byId(qid), seed));
  answers = {}; journals = {}; follows = {}; locks = {}; flags = {}; telemetry = {}; reflections = {}; verifyAnswers = {}; timeLocked = {}; autoLockNotice = false;
  index = 0; phase = 'asesmen'; overallLocked = false;
  timing.startActivityWatcher();
  return session;
}

export async function resumeState() {
  active = await getActiveSession();
  if (!active) return false;
  rendered = active.question_order.map(qid => renderQuestion(byId(qid), active.seed));
  const recs = await getByIndex('responses', 'bySession', active.id);
  for (const r of recs) {
    if (r.jawaban != null) answers[r.question_id] = r.jawaban;
    if (r.jurnal) journals[r.question_id] = r.jurnal;
    if (r.follow_up) follows[r.question_id] = r.follow_up;
    if (r.locked) locks[r.question_id] = true;
    if (r.flag) flags[r.question_id] = true;
    if (r.telemetri) telemetry[r.question_id] = r.telemetri;
    if (r.refleksi) reflections[r.question_id] = r.refleksi;
  }
  index = 0; phase = 'asesmen'; overallLocked = false;
  timing.startActivityWatcher();
  return true;
}

export function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

export async function renderQuizPage(container) {
  stopTimer();
  if (!active) await resumeState();
  if (!active) {
    const prev = await get('progress', 'assessment:last');
    const gate = await assessmentGate(identityFromStorage());
    container.innerHTML = `<div class="reader"><div class="card welcome"><h2>🔥 Asesmen HOTS — 20 soal</h2>
      <p>Soal kontekstual aritmetika (6), geometri (6), dan lingkaran (8). Ada pilihan ganda, multiple response, dan completion satu kata.</p>
      <p>Nomor dan nilai angka diacak per siswa, tetapi indikator dan tingkat kesulitan tetap sama. Untuk sebagian soal, kamu wajib mengisi <b>jurnal proses</b> sebelum jawaban akhir dianggap lengkap.</p>
      <div class="row"><button class="btn btn-primary btn-lg" id="startQuiz">Mulai asesmen sekarang</button>${prev?.summary ? `<button class="btn btn-ghost" id="seeLast">Lihat hasil terakhir</button>` : ''}</div></div>
      <div class="notice ${gate.allowed ? 'ok' : 'warn'} mt-2">${gate.allowed
        ? 'Waktu pengerjaan tercatat dengan jam monotonik perangkat untuk evaluasi belajar. Perubahan jam sistem tidak mengubah durasi. Tidak ada kamera, perekaman layar, atau pengawasan tersembunyi.'
        : escapeHtml(gate.message)}</div>
      ${!gate.allowed ? '<div class="row mt-2"><a class="btn btn-soft" href="#/beranda">Lihat alur belajar</a></div>' : ''}
      ${prev?.summary ? `<div class="card mt-2"><h3>Hasil terakhir</h3><p>Nilai: <b>${prev.summary.overall}</b> · ${prev.summary.grade.label}</p></div>` : ''}</div>`;
    container.querySelector('#startQuiz').onclick = async () => {
      const identity = await get('identity', 'current');
      if (!identity) { toast('Isi identitas siswa terlebih dahulu.', 'bad'); return; }
      const check = await assessmentGate(identity);
      if (!check.allowed) { toast(check.message, 'bad'); return; }
      await startSession(identity); await renderQuizPage(container);
    };
    container.querySelector('#seeLast')?.addEventListener('click', () => showResults(container, prev.summary, prev.sessionId));
    return;
  }
  await renderQuiz(container);
}

async function identityFromStorage() { return get('identity', 'current'); }

async function renderQuiz(container) {
  const q = rendered[index];
  const t = telemetry[q.id] ||= { start: nowISO(), visits: 0, changes: 0, attempts: 0, hints: 0, orderIndex: index };
  t.visits++;
  // Timer DIMULAI tepat di sini: soal tampil dan siap dikerjakan.
  await timing.beginQuestion(active.id, q.id);
  const rec = await timing.currentRecord(q.id);
  if (rec?.expired) timeLocked[q.id] = true;
  const cfg = await timing.getTimingConfig();
  const total = await timing.overall(active.id);
  if (cfg.autoLock && total.expired) overallLocked = true;
  const limitLabel = timing.formatMs((rec?.limit_sec || cfg.defaultSec) * 1000);
  container.innerHTML = `<div class="reader">
    <div class="row between mb-2"><div><span class="pill">Asesmen berjalan · ${index + 1}/${rendered.length}</span><h2 class="mt-1">${escapeHtml(q.topik)}</h2></div>
      <div class="row"><span class="tag">${q.level}</span><span class="tag teal">Bobot ${q.bobot}</span><button class="btn btn-ghost btn-sm" id="quitQuiz">Simpan &amp; keluar</button></div></div>
    <div class="card mb-2"><div class="progress-label"><span>Progres pengerjaan</span><span>${Object.keys(answers).filter(k => answers[k] != null).length}/${rendered.length} terjawab</span></div>
      <div class="progress"><span style="width:${Object.keys(answers).filter(k => answers[k] != null).length / rendered.length * 100}%"></span></div>
      <div class="row between mt-1"><span class="muted" style="font-size:.8rem">Batas soal ini: <b>${limitLabel}</b>${cfg.autoLock ? ' · kunci otomatis aktif' : ''}</span>
        <span class="tag ${timeLocked[q.id] ? 'bad' : 'teal'}" id="timer">⏱ 0 dtk / ${limitLabel}</span></div>
      <div class="mt-1"><span class="muted" style="font-size:.78rem">Total asesmen: <b id="timerOverall">0 dtk</b></span></div></div>
    <div class="card"><div class="question-head"><span class="tag">${q.id}</span><span class="muted" style="font-size:.8rem">${escapeHtml(q.indikator)}</span><span class="spacer"></span>
        <span class="tag">${escapeHtml(q.materi)}</span></div>
      <div class="mb-2">${q.prompt}</div>
      ${answerMarkup(q, !!timeLocked[q.id])}
      ${q.journalRequired ? journalMarkup(q, !!timeLocked[q.id]) : ''}
      ${(q.followUp || byId(q.id).followUp) ? followUpMarkup(q, !!timeLocked[q.id]) : ''}
      ${q.reflection ? reflectionMarkup(q, !!timeLocked[q.id]) : ''}
      ${timeLocked[q.id] ? '<div class="notice bad mt-2">Waktu soal ini habis. Jawaban dikunci; kamu masih dapat melihat soal dan menulis penjelasan di buku tulis.</div>' : ''}
      ${overallLocked ? '<div class="notice bad mt-2">Total waktu asesmen habis dan kunci otomatis aktif. Simpan progres lalu hubungi guru jika memerlukan penyesuaian.</div>' : ''}
      <div class="row mt-2"><button class="btn btn-primary" id="nextQ" ${timeLocked[q.id] || overallLocked ? 'disabled' : ''}>${index === rendered.length - 1 ? 'Selesaikan asesmen →' : 'Simpan & lanjut →'}</button>
        <button class="btn btn-ghost" id="flagQ">${flags[q.id] ? '🚩 Ditandai' : 'Tandai untuk ditinjau'}</button>
        <button class="btn btn-ghost" id="hintQ" ${timeLocked[q.id] || overallLocked ? 'disabled' : ''}>💡 Petunjuk umum (tercatat)</button>
        <button class="btn btn-ghost" id="prevQ">← Sebelumnya</button></div>
      <div id="qFeedback"></div></div>
    <div class="card mt-2"><h3>Navigasi soal</h3><div class="q-nav">${rendered.map((r, i) => `<button class="${i === index ? 'current' : ''} ${answers[r.id] != null ? 'done' : ''} ${flags[r.id] ? 'flagged' : ''} ${timeLocked[r.id] ? 'flagged' : ''}" data-jump="${i}">${i + 1}</button>`).join('')}</div>
      <p class="muted" style="font-size:.78rem">Hijau = terjawab · Kuning = ditandai/terkunci · Biru = sedang dibuka</p></div></div>`;
  bindQuiz(container, q);
  startTimer(q);
}

function answerMarkup(q, disabled) {
  const a = answers[q.id];
  if (q.tipe === 'single') return `<div>${q.options.map(o => `<label class="choice ${a === o.key ? 'selected' : ''}"><input type="radio" name="jawab" value="${o.key}" ${a === o.key ? 'checked' : ''} ${locks[q.id] || disabled ? 'disabled' : ''}><span class="key">${o.key}.</span><span>${o.label}</span></label>`).join('')}</div>`;
  if (q.tipe === 'multiple') return `<p class="muted">Pilih semua jawaban yang benar (boleh lebih dari satu).</p><div>${q.options.map(o => `<label class="choice ${Array.isArray(a) && a.includes(o.key) ? 'selected' : ''}"><input type="checkbox" name="jawab" value="${o.key}" ${Array.isArray(a) && a.includes(o.key) ? 'checked' : ''} ${locks[q.id] || disabled ? 'disabled' : ''}><span class="key">${o.key}.</span><span>${o.label}</span></label>`).join('')}</div>`;
  return `<div class="field"><label>Jawaban satu kata/angka</label><input id="jawabCompletion" maxlength="24" value="${escapeHtml(a || '')}" placeholder="Ketik satu kata…" ${disabled ? 'disabled' : ''}><span class="hint-text">Spasi awal/akhir dan kapitalisasi diabaikan. Kalimat panjang ditolak.</span></div>`;
}
function journalMarkup(q, disabled) {
  const j = journals[q.id] || {};
  const labels = {
    informasi: '1. Informasi penting yang diketahui', konsep: '2. Konsep matematika yang digunakan',
    strategi: '3. Strategi yang dipilih', perhitungan: '4. Langkah perhitungan', interpretasi: '5. Interpretasi hasil'
  };
  return `<div class="card mt-2" style="box-shadow:none;background:#f8fcff"><h3>📝 Jurnal proses (wajib)</h3>
    <p class="muted" style="font-size:.85rem">Isi sebelum jawaban final. Jawaban benar tanpa proses tidak mendapat skor proses.</p>
    <div class="grid cols-2">${Object.entries(labels).map(([k, label]) => `<div class="field"><label>${label}</label><textarea data-journal="${k}" rows="3" placeholder="Tulis singkat…" ${disabled ? 'disabled' : ''}>${escapeHtml(j[k] || '')}</textarea></div>`).join('')}</div></div>`;
}
function followUpMarkup(q, disabled) {
  const fu = byId(q.id).followUp?.(q.params);
  if (!fu) return '';
  if (!locks[q.id]) return `<div class="notice warn mt-2">Soal ini memiliki pertanyaan lanjutan. Kunci jawaban awal dahulu dengan tombol "Kunci &amp; lanjut".</div>`;
  return `<div class="card mt-2" style="box-shadow:none;border-color:var(--gold)"><h3>🔒 Pertanyaan lanjutan</h3><p>${fu.prompt}</p>
    ${field('Jawaban (angka)', `<input type="number" step="any" id="followAnswer" value="${escapeHtml(follows[q.id] ?? '')}" placeholder="…" ${disabled ? 'disabled' : ''}>`, `Satuan: ${fu.satuan}. Jawaban awal sudah dikunci.`)}
    <button class="btn btn-soft btn-sm" id="checkFollow" ${disabled ? 'disabled' : ''}>Periksa lanjutan</button><div id="followFeedback"></div></div>`;
}
function reflectionMarkup(q, disabled) {
  return `<div class="card mt-2" style="box-shadow:none;background:#fffcf3"><h3>💬 Refleksi</h3><p>${q.reflection}</p>
    ${field('Tanggapanmu', `<textarea id="reflectionText" rows="3" placeholder="Tuliskan alasanmu…" ${disabled ? 'disabled' : ''}>${escapeHtml(reflections[q.id] || '')}</textarea>`)}</div>`;
}
const field = (label, input, hint = '') => `<div class="field"><label>${label}</label>${input}${hint ? `<span class="hint-text">${hint}</span>` : ''}</div>`;

function startTimer(q) {
  stopTimer();
  const el = document.getElementById('timer');
  const overallEl = document.getElementById('timerOverall');
  const tick = async () => {
    if (!active) return;
    const live = await timing.live(q.id).catch(() => null);
    const total = await timing.overall(active.id).catch(() => null);
    const cfg = await timing.getTimingConfig().catch(() => ({ autoLock: false }));
    if (live && el) {
      el.textContent = `⏱ ${timing.formatMs(live.elapsedMs)} / ${timing.formatMs(live.limitMs)}`;
      el.className = 'tag ' + (live.remainingMs < 30000 ? 'bad' : live.remainingMs < 60000 ? 'gold' : 'teal');
      if (live.expired && cfg.autoLock && !timeLocked[q.id]) {
        timeLocked[q.id] = true;
        const fb = document.getElementById('qFeedback');
        if (fb) fb.innerHTML = '<div class="feedback bad">Batas waktu soal tercapai dan kunci otomatis aktif. Pilihan jawaban dikunci.</div>';
        containerLock();
        toast('Batas waktu soal tercapai. Jawaban dikunci sesuai pengaturan guru.', 'warn');
      }
    }
    if (total && overallEl) overallEl.textContent = `${timing.formatMs(total.elapsedMs)} / ${timing.formatMs(total.totalMs)}`;
    if (total?.expired && cfg.autoLock && !overallLocked) {
      overallLocked = true;
      containerLock();
      const fb = document.getElementById('qFeedback');
      if (fb) fb.innerHTML = '<div class="feedback bad">Total waktu asesmen tercapai. Pengiriman akhir dikunci sesuai pengaturan guru.</div>';
      toast('Total waktu asesmen habis. Jawaban tersimpan, tetapi pengiriman dikunci.', 'warn');
    }
  };
  tick(); timer = setInterval(tick, 1000);
}
function containerLock() {
  document.querySelectorAll('#view input, #view textarea, #view button').forEach(el => {
    if (el.id === 'quitQuiz' || el.id === 'prevQ' || el.hasAttribute('data-jump') || el.id === 'flagQ') return;
    el.disabled = true;
  });
}

async function persist(q) {
  if (!active) return;
  await timing.checkpoint(q.id);
  const tr = await timing.currentRecord(q.id);
  const id = responseId(active.id, q.id);
  const rec = await get('responses', id);
  const t = telemetry[q.id] ||= { start: tr?.displayed_at || nowISO(), visits: 0, changes: 0, attempts: 0, hints: 0, orderIndex: index };
  if (tr) {
    t.start = tr.displayed_at || t.start;
    t.changes = tr.changes || 0; t.attempts = tr.attempts || 0; t.hints = tr.hints || 0;
  }
  t.timing = tr || null;
  const journal = journals[q.id];
  const fu = byId(q.id).followUp?.(q.params);
  const durasiDetik = tr ? Math.max(0, Math.round(((tr.elapsed_ms || 0) - (tr.idle_ms || 0)) / 1000)) : 0;
  await put('responses', {
    ...(rec || { student_id: active.student_id, session_id: active.id, question_id: q.id, materi: q.materi, tipe_soal: q.tipe, waktu_mulai: t.start }),
    response_id: id, jawaban: answers[q.id] ?? null, jurnal: journal || null, follow_up: follows[q.id] ?? null,
    locked: !!locks[q.id], flag: !!flags[q.id], telemetri: t, refleksi: reflections[q.id] || null,
    status: 'draft', waktu_selesai: nowISO(), durasi: durasiDetik,
    follow_up_benar: fu ? Number(follows[q.id]) === fu.answer : null
  });
  active.jawaban[q.id] = answers[q.id];
  await put('sessions', active);
}

function bindQuiz(container, q) {
  container.querySelectorAll('[name=jawab]').forEach(input => input.addEventListener('change', async () => {
    if (locks[q.id] || timeLocked[q.id] || overallLocked) return;
    await timing.markInteraction(q.id);
    if (q.tipe === 'single') answers[q.id] = input.value;
    else answers[q.id] = [...container.querySelectorAll('[name=jawab]:checked')].map(x => x.value);
    await timing.addChange(q.id);
    await timing.markFirstAnswer(q.id);
    container.querySelectorAll('.choice').forEach(c => c.classList.remove('selected'));
    container.querySelectorAll('[name=jawab]:checked').forEach(c => c.closest('.choice').classList.add('selected'));
    await persist(q);
  }));
  container.querySelector('#jawabCompletion')?.addEventListener('input', async e => {
    if (timeLocked[q.id] || overallLocked) return;
    await timing.markInteraction(q.id); answers[q.id] = e.target.value;
    await timing.addChange(q.id); await timing.markFirstAnswer(q.id); await persist(q);
  });
  container.querySelectorAll('[data-journal]').forEach(el => el.addEventListener('input', async () => {
    if (timeLocked[q.id] || overallLocked) return;
    await timing.markInteraction(q.id);
    (journals[q.id] ||= {})[el.dataset.journal] = el.value; await persist(q);
  }));
  container.querySelector('#followAnswer')?.addEventListener('input', async e => {
    if (timeLocked[q.id] || overallLocked) return;
    await timing.markInteraction(q.id); follows[q.id] = e.target.value; await persist(q);
  });
  container.querySelector('#checkFollow')?.addEventListener('click', async () => {
    const fu = byId(q.id).followUp(q.params), val = parseNum(container.querySelector('#followAnswer').value);
    const fb = container.querySelector('#followFeedback');
    if (Math.abs(val - fu.answer) < 1e-6) fb.innerHTML = `<div class="feedback">✅ Lanjutan benar. ${fu.explanation}</div>`;
    else { await timing.addChange(q.id); fb.innerHTML = `<div class="feedback bad">Belum tepat. Periksa kembali operasi yang diminta pada pertanyaan lanjutan ini.</div>`; }
  });
  container.querySelector('#reflectionText')?.addEventListener('input', async e => { reflections[q.id] = e.target.value; await persist(q); });
  container.querySelector('#flagQ').onclick = async () => { flags[q.id] = !flags[q.id]; await persist(q); renderQuiz(container); };
  container.querySelector('#hintQ').onclick = async () => {
    if (timeLocked[q.id] || overallLocked) return;
    await timing.addHint(q.id);
    const fb = container.querySelector('#qFeedback');
    fb.innerHTML = `<div class="feedback">Petunjuk umum (penggunaan tercatat): tanyakan apakah perubahan <b>tetap besarnya</b> (aritmatika), <b>tetap persentasenya</b> (geometri), atau menyangkut <b>keliling/luas lingkaran</b>. Jawaban akhir tetap harus kamu hitung sendiri.</div>`;
    await persist(q);
  };
  container.querySelector('#prevQ').onclick = async () => { await timing.checkpoint(q.id); if (index > 0) { index--; await renderQuiz(container); } };
  container.querySelector('#nextQ').onclick = async () => {
    if (timeLocked[q.id] || overallLocked) return;
    const fuCfg = byId(q.id).followUp;
    if (fuCfg && !locks[q.id] && answers[q.id] != null) {
      locks[q.id] = true; await timing.markSubmit(q.id); await persist(q);
      container.querySelector('#qFeedback').innerHTML = `<div class="feedback">Jawaban awal dikunci. Jawab pertanyaan lanjutan di bawah.</div>`;
      await renderQuiz(container);
      return;
    }
    const err = validateCurrent(q);
    if (err) { container.querySelector('#qFeedback').innerHTML = `<div class="feedback bad">${err}</div>`; toast('Lengkapi bagian yang ditandai sebelum lanjut.', 'bad'); return; }
    await timing.markSubmit(q.id); await persist(q);
    if (index < rendered.length - 1) { index++; await renderQuiz(container); }
    else await finalize(container);
  };
  container.querySelectorAll('[data-jump]').forEach(b => b.onclick = async () => {
    await timing.checkpoint(q.id); await persist(q); index = +b.dataset.jump; await renderQuiz(container);
  });
  container.querySelector('#quitQuiz').onclick = async () => {
    await timing.checkpoint(q.id); await persist(q); stopTimer();
    location.hash = '#/beranda'; toast('Progres asesmen disimpan. Lanjut kapan saja lewat menu Asesmen.', 'ok');
  };
}

function validateCurrent(q) {
  const a = answers[q.id];
  const answered = q.tipe === 'multiple' ? Array.isArray(a) && a.length > 0 : a != null && String(a).trim().length > 0;
  if (!answered) return 'Jawaban belum diisi.';
  if (q.tipe === 'completion' && String(a).trim().length > 24) return 'Jawaban completion maksimal 24 karakter (satu kata).';
  if (q.journalRequired) {
    const j = journals[q.id] || {};
    for (const [k, min] of Object.entries(minJournal)) if (!j[k] || j[k].trim().length < min) return `Jurnal proses bagian "${k}" belum lengkap (minimal ${min} karakter).`;
  }
  if (byId(q.id).followUp && !locks[q.id]) return 'Kunci jawaban awal dahulu.';
  if (byId(q.id).followUp && (follows[q.id] == null || String(follows[q.id]).trim() === '')) return 'Jawaban pertanyaan lanjutan wajib diisi.';
  return null;
}

async function finalize(container) {
  const invalid = rendered.find(q => validateCurrent(q));
  if (invalid) {
    index = rendered.indexOf(invalid); await renderQuiz(container);
    container.querySelector('#qFeedback').innerHTML = `<div class="feedback bad">${validateCurrent(invalid)}</div>`;
    toast('Masih ada soal yang belum lengkap.', 'bad'); return;
  }
  confirmDialog('Kirim jawaban akhir asesmen? Jurnal proses dan jawaban lanjutan sudah lengkap.', async () => {
    const weights = await getConfig('weights');
    const identity = await get('identity', 'current');
    const detail = [];
    for (const q of rendered) {
      await timing.markSubmit(q.id);
      const tr = await timing.currentRecord(q.id);
      const fuCfg = byId(q.id).followUp, fu = fuCfg?.(q.params);
      const fol = fu ? Number(follows[q.id]) : null;
      const folBenar = fu ? Math.abs(fol - fu.answer) < 1e-6 : null;
      const sc = scoreOne(q, answers[q.id], journals[q.id] || {}, fu, folBenar, weights);
      const t = telemetry[q.id] || {};
      if (tr) { t.timing = tr; t.start = tr.displayed_at || t.start; t.changes = tr.changes || 0; t.hints = tr.hints || 0; }
      const durasiDetik = tr ? Math.max(0, Math.round(((tr.elapsed_ms || 0) - (tr.idle_ms || 0)) / 1000)) : 0;
      const rec = {
        response_id: responseId(active.id, q.id), student_id: active.student_id, session_id: active.id,
        question_id: q.id, materi: q.materi, tipe_soal: q.tipe, indikator: q.indikator, level: q.level,
        jawaban: answers[q.id], jawaban_benar: q.tipe === 'completion' ? q.accepted.join('|') : q.correct,
        skor: sc.skor, benar: sc.benar, rincian: sc.rincian, bobot: q.bobot,
        jurnal: journals[q.id] || null, follow_up: follows[q.id] ?? null, follow_up_benar: folBenar,
        refleksi: reflections[q.id] || null, telemetri: t,
        seed: active.seed, varian: q.variantIndex, parameter: q.params,
        waktu_mulai: tr?.displayed_at || t.start || active.waktu_mulai, waktu_selesai: nowISO(),
        durasi: durasiDetik, status: 'selesai', needs_teacher_review: sc.needsTeacherReview,
        penjelasan_siswa: ''
      };
      await put('responses', rec);
      await enqueue('JAWABAN_SOAL', rec, `jwb:${rec.response_id}`);
      if (rec.jurnal) {
        const proc = {
          process_id: `PRC-${active.id}-${q.id}`, student_id: active.student_id, question_id: q.id,
          informasi_diketahui: rec.jurnal.informasi, konsep: rec.jurnal.konsep, strategi: rec.jurnal.strategi,
          perhitungan: rec.jurnal.perhitungan, interpretasi: rec.jurnal.interpretasi,
          telemetri: t, waktu: nowISO()
        };
        await put('processes', proc); await enqueue('PROSES_PENGERJAAN', proc, `prc:${proc.process_id}`);
      }
      if (rec.refleksi) {
        const refl = { reflection_id: `REF-${active.id}-${q.id}`, student_id: active.student_id, session_id: active.id, question_id: q.id, jenis: 'refleksi_asesmen', teks: rec.refleksi, waktu: nowISO() };
        await put('reflections', refl); await enqueue('REFLEKSI', refl, `ref:${refl.reflection_id}`);
      }
      detail.push(rec);
    }

    // Analisis waktu/proses bersifat nasihat. Tidak mengubah skor dan tidak menyvontekkan siswa.
    const timingRows = await timing.sessionTiming(active.id);
    await publishTiming(timingRows);
    await timing.finishSession(active.id);
    const anomalyCfg = await getAnomalyConfig();
    const analyses = await analyzeSession(active.id, { responses: detail, cfg: anomalyCfg });
    for (let i = 0; i < analyses.length; i++) {
      const a = analyses[i];
      a.nomor_soal = i + 1;
      a.student_id = active.student_id;
      await enqueue('ANOMALI', a, `anomali:${active.id}:${a.question_id}`);
      await createAlert(a, identity, { materi: a.materi });
    }

    const summary = summarize(detail, weights);
    const session = { ...active, waktu_selesai: nowISO(), status: 'selesai', summary, skor: summary.overall };
    await put('sessions', session);
    await enqueue('SESI_BELAJAR', session, `sesi:${session.id}:final`);
    for (const [materi, v] of Object.entries(summary.byModule)) {
      const hasil = { id: `HM-${session.id}-${materi}`, student_id: active.student_id, session_id: session.id, materi, nilai: Math.round(v.rata), tuntas: v.rata >= 75, jumlah_soal: v.n, waktu: nowISO() };
      await put('progress', { key: hasil.id, ...hasil });
      await enqueue('HASIL_MODUL', hasil, `hm:${hasil.id}`);
    }
    await put('progress', { key: 'assessment:last', sessionId: session.id, summary, waktu: nowISO() });
    await put('config', { key: 'activeSession', value: null });
    await markStage('asesmen', { session_id: session.id });
    await markStage('analisis', { session_id: session.id });
    active = null; stopTimer();

    const fb = await generatePersonalFeedback(identity);
    if (fb) { await markStage('umpanbalik', { feedback_id: fb.id }); await enqueue('UMPAN_BALIK_SISWA', fb, `fb-otomatis:${fb.id}`); }
    const feat = await getConfig('features');
    if (feat.verificationEnabled) showVerification(container, summary, session.id, identity, fb);
    else showResults(container, summary, session.id, fb);
    toast('Asesmen selesai. Data waktu, proses, dan umpan balik tersimpan lokal serta masuk antrean sinkronisasi.', 'ok');
  }, 'Kirim asesmen');
}

function showVerification(container, summary, sessionId, identity, fb) {
  phase = 'verifikasi'; stopTimer();
  container.innerHTML = `<div class="reader"><div class="card welcome"><h2>✅ Verifikasi pemahaman</h2>
    <p>Lima soal singkat dengan konsep sama tetapi angka berbeda. Ini membantu guru memastikan pemahaman, bukan sekadar hafalan jawaban.</p></div>
    <div class="card mt-2">${VERIFICATION.map(v => `<div class="mb-2"><h3>${v.id}. ${escapeHtml(v.konsep)}</h3><p>${v.prompt}</p>
      ${field('Jawaban (angka)', `<input type="number" step="any" data-verify="${v.id}" placeholder="…">`)}</div>`).join('')}
      <button class="btn btn-primary" id="submitVerify">Kirim verifikasi</button><div id="verifyFeedback"></div></div></div>`;
  container.querySelector('#submitVerify').onclick = async () => {
    const who = identity || await get('identity', 'current');
    const recs = VERIFICATION.map(v => {
      const val = parseNum(container.querySelector(`[data-verify="${v.id}"]`).value);
      return { verification_id: `VER-${sessionId}-${v.id}`, student_id: who?.student_id || '', session_id: sessionId, question_id: v.id, jawaban: val, benar: Number.isFinite(val) && Math.abs(val - v.answer) <= Math.max(0.01, Math.abs(v.answer) * 0.01), konsep: v.konsep, pembahasan: v.explanation, waktu: nowISO() };
    });
    for (const r of recs) { await put('reflections', { reflection_id: r.verification_id, ...r, jenis: 'verifikasi' }); await enqueue('VERIFIKASI', r, `ver:${r.verification_id}`); }
    container.querySelector('#verifyFeedback').innerHTML = `<div class="feedback">Verifikasi tersimpan. ${recs.filter(r => r.benar).length} dari ${recs.length} jawaban sesuai.</div><button class="btn btn-primary mt-2" id="showResultBtn">Lihat hasil asesmen →</button>`;
    container.querySelector('#showResultBtn').onclick = () => showResults(container, summary, sessionId, fb);
  };
}

function showResults(container, summary, sessionId, fb = null) {
  stopTimer();
  container.innerHTML = `<div class="reader"><div class="welcome"><span class="pill">Asesmen selesai</span>
    <h2 class="mt-1">Nilai kamu: ${summary.overall}</h2><p>${summary.grade.label} · ${summary.completed} soal dinilai · ${summary.needsReview} jurnal menunggu tinjauan guru</p></div>
    <div class="grid cols-3 mt-2">${Object.entries(summary.byModule).map(([m, v]) => `<div class="card stat"><span>Modul ${m}</span><strong>${Math.round(v.rata)}</strong><span>${v.benar}/${v.n} jawaban tepat</span></div>`).join('')}</div>
    <div class="card mt-2"><h3>Penguasaan kompetensi</h3>${summary.competencies.map(c => `<div class="competency"><span style="width:230px">${escapeHtml(c.indikator)}</span><span class="bar"><i style="width:${c.nilai}%"></i></span><b>${c.nilai}</b> ${c.dikuasai ? '<span class="tag ok">Dikuasai</span>' : '<span class="tag bad">Perlu latihan</span>'}</div>`).join('')}</div>
    <div class="card mt-2"><h3>Rekomendasi remedial</h3>${summary.remedial.length ? summary.remedial.map(r => `<div class="notice warn">${escapeHtml(r)}</div>`).join('') : '<div class="notice ok">Semua modul sudah tuntas. Pertahankan!</div>'}
      <div class="row mt-2"><button class="btn btn-soft" id="seeFeedback">💬 Lihat umpan balik pribadi</button><a class="btn btn-primary" href="#/bukutulis">✍️ Lanjut di buku tulis</a></div>
      <p class="muted mt-2">Sesi: ${sessionId}</p></div>
    ${fb ? `<div class="card mt-2" id="feedbackCard"><h3>Umpan balik berbasis aturan</h3><p class="muted">${escapeHtml(fb.catatan)}</p>
      <div class="notice ok"><b>Hal yang dikuasai:</b> ${escapeHtml((fb.hal_dikuasai || []).join(' ') || '—')}</div>
      <div class="notice warn mt-1"><b>Materi diulang:</b> ${escapeHtml((fb.materi_diulang || []).join(' ') || '—')}</div>
      <div class="notice mt-1"><b>Saran belajar:</b> ${escapeHtml((fb.saran_belajar || []).join(' ') || '—')}</div></div>` : ''}
    <div class="row mt-2"><button class="btn btn-ghost" id="backHome">Kembali ke beranda</button><button class="btn btn-primary" id="downloadSummary">Unduh ringkasan JSON</button></div></div>`;
  container.querySelector('#seeFeedback')?.addEventListener('click', () => location.hash = '#/umpanbalik');
  container.querySelector('#backHome').onclick = () => location.hash = '#/beranda';
  container.querySelector('#downloadSummary').onclick = () => {
    import('./utils.js').then(({ downloadFile }) => downloadFile(`labmat-hasil-${sessionId}.json`, JSON.stringify({ summary, feedback: fb }, null, 2), 'application/json'));
  };
}
