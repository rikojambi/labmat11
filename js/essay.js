// Lembar uraian terstruktur: 8 langkah, validasi per langkah, autosave, dapat diedit sebelum kirim.
import { ESSAYS, essaysFor, essayById } from '../data/essays.js';
import { get, put, getByIndex } from './database.js';
import { enqueue } from './sync.js';
import { markStage } from './flow.js';
import { escapeHtml, nowISO, parseNum, toast, formatDateTime } from './utils.js';

const responseId = (sid, itemId) => `ESS-${sid}-${itemId}`;
const normalize = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const angka = v => parseNum(String(v ?? '').replace(/rp\s*/i, ''));

function checkStep(step, value) {
  if (step.mode === 'number') {
    const v = parseNum(value);
    return Number.isFinite(v) && Math.abs(v - Number(step.answer)) <= (step.tolerance ?? 0.02);
  }
  if (step.mode === 'choice') return normalize(value) === normalize(step.answer);
  if (step.id === 's8') return String(value || '').trim().length >= 20;
  const accepted = [step.answer, ...(step.accept || [])].filter(v => v !== '' && v != null).map(normalize);
  if (accepted.includes(normalize(value))) return true;
  // Nilai rupiah boleh ditulis dengan/ tanpa titik ribuan dan satuan "Rp".
  const a = angka(step.answer), b = angka(value);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.02;
}

async function loadState(identity, item) {
  const key = responseId(identity.student_id, item.id);
  const old = await get('essayResponses', key);
  if (old) {
    const steps = item.steps.map(s => old.steps?.find(x => x.id === s.id) || {
      id: s.id, label: s.label, jawaban: '', validation: 'belum', teacherScore: null, teacherNote: ''
    });
    return { ...old, steps };
  }
  return {
    response_id: key, student_id: identity.student_id, item_id: item.id, module: item.module,
    steps: item.steps.map(s => ({ id: s.id, label: s.label, jawaban: '', validation: 'belum', teacherScore: null, teacherNote: '' })),
    status: 'draft', waktu_mulai: nowISO(), waktu_selesai: null, updated_at: nowISO()
  };
}

export async function renderEssayList(container, filter = '') {
  const identity = await get('identity', 'current');
  if (!identity) return;
  const rows = await getByIndex('essayResponses', 'byStudent', identity.student_id);
  const items = filter ? essaysFor(filter) : ESSAYS;
  const selesai = new Set(rows.filter(r => r.status === 'selesai').map(r => r.item_id));
  container.innerHTML = `<div class="grid cols-2">${items.map(e => `<div class="card module-card" data-essay="${e.id}">
    <div class="row between"><span class="tag teal">${escapeHtml(e.module)}</span><span class="tag ${selesai.has(e.id) ? 'ok' : ''}">${selesai.has(e.id) ? 'Selesai' : 'Belum'}</span></div>
    <h3>${e.icon} ${escapeHtml(e.title)}</h3><p class="muted">${escapeHtml(e.context)}</p>
    <span class="hint-text">8 langkah terpandu · validasi tiap langkah · dapat diedit sebelum kirim</span></div>`).join('')}</div>`;
  container.querySelectorAll('[data-essay]').forEach(c => c.onclick = () => location.hash = `#/uraian/${c.dataset.essay}`);
}

export async function renderEssay(container, itemId) {
  const identity = await get('identity', 'current');
  const item = essayById(itemId);
  if (!identity || !item) { container.innerHTML = '<div class="notice bad">Soal uraian tidak ditemukan.</div>'; return; }
  const state = await loadState(identity, item);
  let current = 0;
  const draw = () => {
    const step = item.steps[current];
    const saved = state.steps.find(s => s.id === step.id) || { jawaban: '', validation: 'belum' };
    const checked = saved.validation === 'benar';
    const choiceOptions = [...new Set([step.answer, 'U_n', 'S_n', 'U_12', 'U_5', 'U_4', 'keliling', 'luas', 'luas cincin', 'aritmetika', 'geometri', 'deret'])];
    const input = step.mode === 'choice'
      ? `<div>${choiceOptions.map(v => `<label class="choice ${saved.jawaban === v ? 'selected' : ''}"><input type="radio" name="essayChoice" value="${escapeHtml(v)}" ${saved.jawaban === v ? 'checked' : ''}><span>${escapeHtml(v)}</span></label>`).join('')}</div>`
      : step.mode === 'number'
        ? `<input class="input" id="essayInput" type="number" step="any" value="${escapeHtml(saved.jawaban)}" placeholder="Angka…">`
        : `<textarea class="input" id="essayInput" rows="${step.id === 's8' ? 4 : 2}" placeholder="Tuliskan jawabanmu…">${escapeHtml(saved.jawaban)}</textarea>`;
    const prevOk = state.steps.slice(0, current).every(s => s.validation === 'benar');
    container.innerHTML = `<div class="reader"><div class="row between"><div><span class="pill">Uraian terpandu · ${escapeHtml(item.module)}</span><h2 class="mt-1">${escapeHtml(item.title)}</h2></div>
      <button class="btn btn-ghost btn-sm" data-back>Daftar uraian</button></div>
      <div class="notice">${escapeHtml(item.context)}</div>
      <div class="step-tabs mt-2">${item.steps.map((s, i) => `<button class="${i === current ? 'active' : ''}" data-step="${i}">${i + 1}. ${escapeHtml(s.label.split(' ')[0])}</button>`).join('')}</div>
      <div class="card mt-2"><h3>Langkah ${current + 1}/8 — ${escapeHtml(step.label)}</h3>
        <div class="mathbox"><b>Teks panduan:</b> ${escapeHtml(step.given)}</div>
        <p><b>Isianmu:</b> ${escapeHtml(step.blank)}</p>
        ${input}
        <p class="hint-text">${escapeHtml(step.guide)}</p>
        <div class="row mt-2"><button class="btn btn-primary" id="checkStep" ${!prevOk ? 'disabled' : ''}>Periksa langkah ini</button>
          <button class="btn btn-ghost" id="prevStep" ${current === 0 ? 'disabled' : ''}>← Sebelumnya</button>
          <button class="btn btn-ghost" id="nextStep" ${current === 7 ? 'disabled' : ''}>Berikutnya →</button></div>
        <div id="essayFeedback" class="mt-1">${checked ? '<div class="feedback">✓ Langkah ini sesuai panduan. Kamu masih bisa mengeditnya sebelum kirim.</div>' : ''}</div>
        <div class="notice mt-2">Status: <b>${state.status === 'selesai' ? 'Sudah dikirim (masih dapat diedit)' : 'Tersimpan otomatis di perangkat'}</b> · Terakhir: ${formatDateTime(state.updated_at)}</div>
        <div class="row mt-2"><button class="btn btn-soft" id="submitEssay" ${state.steps.every(s => s.validation === 'benar') ? '' : 'disabled'}>Kirim uraian ke guru</button></div>
      </div></div>`;

    const read = () => step.mode === 'choice' ? container.querySelector('input[name=essayChoice]:checked')?.value || '' : container.querySelector('#essayInput')?.value || '';
    const save = async () => {
      const v = read();
      const target = state.steps.find(s => s.id === step.id);
      Object.assign(target, { jawaban: v, validation: checkStep(step, v) ? 'benar' : 'perlu_perbaikan' });
      state.updated_at = nowISO();
      await put('essayResponses', state);
      // Status tombol ikut berubah saat langkah terakhir divalidasi (tanpa menggambar ulang).
      const submit = container.querySelector('#submitEssay');
      if (submit) submit.disabled = !state.steps.every(s => s.validation === 'benar');
      return target.validation === 'benar';
    };
    container.querySelector('#checkStep').onclick = async () => {
      const ok = await save();
      container.querySelector('#essayFeedback').innerHTML = ok
        ? '<div class="feedback">✓ Langkah ini sesuai panduan. Periksa langkah berikutnya.</div>'
        : '<div class="feedback bad">Belum sesuai panduan. Baca kembali teks yang disediakan lalu coba lagi.</div>';
    };
    container.querySelector('#essayInput')?.addEventListener('input', save);
    container.querySelectorAll('input[name=essayChoice]').forEach(el => el.addEventListener('change', save));
    container.querySelector('#prevStep').onclick = () => { current--; draw(); };
    container.querySelector('#nextStep').onclick = () => { current++; draw(); };
    container.querySelector('[data-back]').onclick = () => location.hash = '#/uraian';
    container.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { current = +b.dataset.step; draw(); });
    container.querySelector('#submitEssay').onclick = async () => {
      state.status = 'selesai'; state.waktu_selesai = nowISO(); state.updated_at = nowISO();
      await put('essayResponses', state);
      await enqueue('URAIAN_TERPANDU', state, `uraian:${state.response_id}`);
      const all = await getByIndex('essayResponses', 'byStudent', identity.student_id);
      if (all.filter(r => r.status === 'selesai').length >= ESSAYS.length) await markStage('uraian');
      toast('Uraian terkirim. Guru dapat melihat setiap langkah dan memberikan nilai.', 'ok');
      location.hash = '#/uraian';
    };
  };
  draw();
}
