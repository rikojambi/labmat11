// Latihan terpandu 5 tahap + petunjuk bertingkat + umpan balik formatif.
import { PRACTICE, practiceByModule, practiceById } from '../data/practice.js';
import { get, put } from './database.js';
import { escapeHtml, parseNum, nowISO, uid, toast } from './utils.js';
import { enqueue } from './sync.js';

const stageNames = ['Memahami masalah', 'Menentukan strategi', 'Melakukan perhitungan', 'Menafsirkan hasil', 'Refleksi'];
const stateKey = id => `practice:${id}`;

export async function renderPracticeList(container, moduleId = null) {
  const list = moduleId ? practiceByModule(moduleId) : PRACTICE;
  container.innerHTML = `<div class="grid cols-3">${list.map(p => `
    <article class="card module-card ${p.module === 'geometri' ? 'geo' : p.module === 'lingkaran' ? 'circle' : ''}" data-practice="${p.id}" tabindex="0" role="button">
      <div class="icon">${p.icon}</div><h3>${escapeHtml(p.title)}</h3><p class="muted">${escapeHtml(p.context.slice(0, 105))}…</p>
      <div class="row"><span class="tag teal">5 tahap</span><span class="tag">${p.module}</span></div>
    </article>`).join('')}</div>`;
  container.querySelectorAll('[data-practice]').forEach(card => {
    const open = () => location.hash = `#/latihan/${card.dataset.practice}`;
    card.addEventListener('click', open); card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });
}

export async function renderPractice(container, id) {
  const p = practiceById(id);
  if (!p) { renderPracticeList(container); return; }
  const saved = await get('progress', stateKey(id));
  const state = saved?.state || { stage: 0, completed: false, attempts: [0, 0, 0, 0, 0], hints: { concept: 0, strategy: 0, calc: 0 }, answers: {} };
  let stage = state.completed ? 4 : state.stage;

  function page() {
    container.innerHTML = `<div class="reader">
      <div class="row between mb-2"><div><span class="pill">Latihan terpandu</span><h2 class="mt-1">${p.icon} ${escapeHtml(p.title)}</h2></div>
        <button class="btn btn-ghost btn-sm" data-back-practice>← Daftar latihan</button></div>
      <div class="card mb-2">${escapeHtml(p.context)}</div>
      <div class="step-tabs">${stageNames.map((s, i) => `<button data-stage="${i}" class="${i === stage ? 'active' : ''}" ${i > state.stage && !state.completed ? 'disabled' : ''}>${i + 1}. ${s}</button>`).join('')}</div>
      <div class="card"><div id="stageBody">${stageBody()}</div><div id="stageFeedback">${state.completed ? `<div class="feedback">✅ Latihan selesai. Jurnal proses telah disimpan dan siap disinkronisasi.</div><button class="btn btn-primary mt-2" data-back-practice>Kembali ke daftar</button>` : ''}</div></div>
      <div class="card mt-2"><div class="row between"><h3 class="mb-1">🆘 Petunjuk bertahap</h3><span class="muted" style="font-size:.8rem">Petunjuk tidak langsung memberikan jawaban akhir</span></div>
        <div class="row">${[['concept', '1. Petunjuk konsep'], ['strategy', '2. Petunjuk strategi'], ['calc', '3. Petunjuk perhitungan']].map(([k, label]) => `<button class="btn btn-ghost btn-sm" data-hint="${k}" ${state.hints[k] >= 2 ? 'disabled' : ''}>${label}</button>`).join('')}</div>
        <div id="hintBox" class="mt-1">${hintHTML()}</div></div>
    </div>`;
    bind();
  }

  function stageBody() {
    if (stage === 0) return `<h3>Tahap 1 — Memahami masalah</h3><p class="muted">Centang semua informasi yang diketahui, lalu tuliskan hal yang ditanyakan.</p>
      ${p.given.map((g, i) => `<label class="choice"><input type="checkbox" data-given="${i}" ${state.answers['g' + i] ? 'checked' : ''}><span>${escapeHtml(g.text)}</span></label>`).join('')}
      ${field('Hal yang ditanyakan', `<textarea id="asked" placeholder="Tuliskan dengan bahasamu sendiri…">${escapeHtml(state.answers.asked || '')}</textarea>`)}
      <button class="btn btn-primary" data-check>Cek pemahaman →</button>`;
    if (stage === 1) return `<h3>Tahap 2 — Menentukan strategi</h3><p class="muted">Pilih konsep yang tepat, lalu strategi yang sesuai.</p>
      <b>Konsep matematika</b>${p.conceptOptions.map((c, i) => `<label class="choice"><input type="radio" name="concept" value="${i}" ${state.answers.concept == i ? 'checked' : ''}><span>${escapeHtml(c)}</span></label>`).join('')}
      <b class="mt-2" style="display:block">Strategi penyelesaian</b>${p.strategyOptions.map((c, i) => `<label class="choice"><input type="radio" name="strategy" value="${i}" ${state.answers.strategy == i ? 'checked' : ''}><span>${escapeHtml(c)}</span></label>`).join('')}
      <button class="btn btn-primary mt-1" data-check>Cek strategi →</button>`;
    if (stage === 2) return `<h3>Tahap 3 — Melakukan perhitungan</h3><p class="muted">Isi langkah perhitungan. Jika ragu, buka petunjuk bertahap di bawah.</p>
      <div class="grid cols-2">${p.fields.map(f => field(f.label, `<input type="number" step="any" data-field="${f.key}" value="${state.answers[f.key] ?? ''}" placeholder="…">`)).join('')}</div>
      <div class="mathbox">${escapeHtml(p.hints.calc[0])}</div>
      <button class="btn btn-primary" data-check>Cek perhitungan →</button>`;
    if (stage === 3) return `<h3>Tahap 4 — Menafsirkan hasil</h3><p class="muted">Pilih kesimpulan yang paling sesuai dengan konteks soal.</p>
      ${p.conclusions.map((c, i) => `<label class="choice"><input type="radio" name="conclusion" value="${i}" ${state.answers.conclusion == i ? 'checked' : ''}><span>${escapeHtml(c.text)}</span></label>`).join('')}
      <button class="btn btn-primary mt-1" data-check>Cek interpretasi →</button>`;
    return `<h3>Tahap 5 — Refleksi</h3><p class="muted">Jelaskan alasanmu, bagian yang sulit, dan cara kamu memeriksa hasil.</p>
      ${field('Refleksi singkat (minimal 20 karakter)', `<textarea id="reflection" rows="5" placeholder="Saya memilih strategi ini karena…">${escapeHtml(state.answers.reflection || '')}</textarea>`)}
      <button class="btn btn-primary" data-check>Selesaikan latihan →</button>`;
  }
  const field = (label, input) => `<div class="field"><label>${label}</label>${input}</div>`;

  function hintHTML() {
    const all = Object.entries(state.hints).flatMap(([k, n]) => p.hints[k].slice(0, n).map(h => `<div class="feedback"><b>${k === 'concept' ? 'Konsep' : k === 'strategy' ? 'Strategi' : 'Perhitungan'}:</b> ${escapeHtml(h)}</div>`));
    return all.length ? all.join('') : `<p class="muted">Belum ada petunjuk dibuka. Klik tombol di atas jika diperlukan.</p>`;
  }
  async function save() { await put('progress', { key: stateKey(p.id), state, updated_at: nowISO() }); }

  function validate() {
    if (stage === 0) {
      p.given.forEach((g, i) => { state.answers['g' + i] = !!container.querySelector(`[data-given="${i}"]`)?.checked; });
      state.answers.asked = container.querySelector('#asked')?.value || '';
      const selected = p.given.map((g, i) => state.answers['g' + i] === g.correct);
      const asked = state.answers.asked.toLowerCase();
      return selected.every(Boolean) && p.askedKeywords.some(k => asked.includes(k.toLowerCase()));
    }
    if (stage === 1) {
      state.answers.concept = +container.querySelector('[name=concept]:checked')?.value;
      state.answers.strategy = +container.querySelector('[name=strategy]:checked')?.value;
      return p.conceptOptions[state.answers.concept] === p.concept && p.strategyOptions[state.answers.strategy] === p.strategy;
    }
    if (stage === 2) {
      p.fields.forEach(f => { state.answers[f.key] = container.querySelector(`[data-field="${f.key}"]`)?.value || ''; });
      return p.fields.every(f => Math.abs(parseNum(state.answers[f.key]) - f.answer) <= f.tolerance);
    }
    if (stage === 3) {
      state.answers.conclusion = +container.querySelector('[name=conclusion]:checked')?.value;
      return !!p.conclusions[state.answers.conclusion]?.correct;
    }
    state.answers.reflection = container.querySelector('#reflection')?.value || '';
    return state.answers.reflection.trim().length >= 20;
  }

  function feedback(okFlag) {
    const fb = container.querySelector('#stageFeedback'); if (!fb) return;
    if (okFlag) {
      const messages = [
        '✅ Informasi dan pertanyaan sudah teridentifikasi dengan tepat.',
        '✅ Strategi sudah sesuai dengan pola masalah.',
        '✅ Perhitungan benar. Nilai yang kamu isi konsisten dengan rumus.',
        '✅ Interpretasi sudah sesuai konteks.',
        '✅ Refleksi tersimpan.'
      ];
      fb.innerHTML = `<div class="feedback">${messages[stage]}</div>${stage < 4 ? `<button class="btn btn-primary mt-2" data-next>Lanjut tahap ${stage + 2} →</button>` : '<div class="notice ok mt-2">Latihan selesai! Jurnal proses dikirim ke antrean sinkronisasi.</div>'}`;
      // Tombol dibuat dinamis oleh feedback(), jadi handler dipasang di sini juga.
      fb.querySelector('[data-next]')?.addEventListener('click', goNext);
    } else {
      const tries = ++state.attempts[stage];
      const level = tries >= 4 ? 3 : tries >= 3 ? 2 : tries >= 2 ? 1 : 0;
      if (level > 0) { const k = ['concept', 'strategy', 'calc'][level - 1]; state.hints[k] = Math.min(2, state.hints[k] + 1); }
      fb.innerHTML = `<div class="feedback bad">Belum tepat pada tahap ini. Coba periksa kembali—belum saya berikan jawaban akhir.
        ${level ? `<br>Petunjuk tambahan dibuka di bawah (tingkat ${level}).` : ''}</div>`;
      const hintBox = container.querySelector('#hintBox'); if (hintBox) hintBox.innerHTML = hintHTML();
    }
  }

  async function goNext() {
    if (stage < state.stage) { stage = state.stage; page(); return; }
    state.stage = Math.min(4, state.stage + 1); stage = state.stage; await save(); page();
  }

  async function complete() {
    state.completed = true; state.stage = 4;
    const process = {
      process_id: uid('PRC'), student_id: (await get('identity', 'current'))?.student_id || 'anon',
      question_id: p.id, materi: p.module,
      informasi_diketahui: p.given.filter((_, i) => state.answers['g' + i]).map(g => g.text).join('; '),
      konsep: p.conceptOptions[state.answers.concept] || '', strategi: p.strategyOptions[state.answers.strategy] || '',
      perhitungan: p.fields.map(f => `${f.label}: ${state.answers[f.key]}`).join('; '),
      interpretasi: p.conclusions[state.answers.conclusion]?.text || '',
      waktu: nowISO(), status: 'selesai'
    };
    await put('processes', process); await enqueue('PROSES_PENGERJAAN', process, `prc:${process.process_id}`);
    const refl = { reflection_id: uid('REF'), student_id: process.student_id, question_id: p.id, jenis: 'refleksi_latihan', teks: state.answers.reflection, waktu: nowISO() };
    await put('reflections', refl); await enqueue('REFLEKSI', refl, `ref:${refl.reflection_id}`);
    await save(); toast('Latihan selesai dan tersimpan di perangkat.', 'ok');
  }

  function bind() {
    container.querySelectorAll('[data-back-practice]').forEach(b => b.onclick = () => location.hash = '#/latihan');
    container.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => {
      if (b.disabled) return; stage = +b.dataset.stage; page();
    });
    container.querySelectorAll('[data-hint]').forEach(b => b.onclick = () => {
      const k = b.dataset.hint;
      state.hints[k] = Math.min(2, state.hints[k] + 1); save();
      const box = container.querySelector('#hintBox'); if (box) box.innerHTML = hintHTML();
      b.disabled = state.hints[k] >= 2;
    });
    container.querySelector('[data-check]')?.addEventListener('click', async () => {
      const okFlag = validate(); await save(); feedback(okFlag);
      if (okFlag && stage === 4) await complete();
    });
    container.querySelector('[data-next]')?.addEventListener('click', goNext);
  }
  page();
}
