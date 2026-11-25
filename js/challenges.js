// Tantangan dunia kerja + kalkulator eksplorasi (terpisah dari asesmen).
import { challengesFor, programKeys } from '../data/challenges.js';
import { escapeHtml, parseNum } from './utils.js';

const nfmt = (n, d = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(n);

export function renderExploration(container, identity) {
  const program = identity?.program_keahlian || 'UMUM';
  const list = challengesFor(program);
  container.innerHTML = `<div class="reader">
    <div class="card mb-2"><span class="pill">Bebas bereksperimen · tidak dinilai</span><h2 class="mt-1">🧪 Kalkulator eksplorasi</h2>
      <div class="step-tabs" id="calcTabs">${[['arith', 'Aritmetika'], ['geo', 'Geometri'], ['circle', 'Lingkaran & Juring']].map(([k, l], i) => `<button data-calc="${k}" class="${i === 0 ? 'active' : ''}">${l}</button>`).join('')}</div>
      <div id="calcBody"></div></div>
    <div class="card"><div class="row between"><div><h2>🏭 Tantangan dunia kerja</h2><p class="muted">Disesuaikan dengan program keahlian: ${escapeHtml(program)}</p></div>
      <select id="programSelect" class="input" style="width:auto">${[...programKeys, 'UMUM'].map(k => `<option ${k.toUpperCase() === program.toUpperCase() ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div id="challengeList" class="mt-2"></div></div></div>`;

  function calcBody(kind) {
    if (kind === 'arith') return `<div class="grid cols-2"><div>
      ${fld('a', 'Suku pertama (a)', 20)}${fld('b', 'Beda (b)', 5)}${fld('n', 'Jumlah suku (n)', 10)}
      <button class="btn btn-primary" id="calcGo">Hitung</button></div><div id="calcOut"><div class="notice">Un = a + (n−1)b · Sn = ½n(a + Un)</div></div></div>`;
    if (kind === 'geo') return `<div class="grid cols-2"><div>
      ${fld('a', 'Nilai awal (a)', 100)}${fld('r', 'Rasio (r)', 1.2)}${fld('n', 'Jumlah suku (n)', 6)}
      <button class="btn btn-primary" id="calcGo">Hitung</button></div><div id="calcOut"><div class="notice">Un = a·r^(n−1) · Sn = a(rⁿ−1)/(r−1)</div></div></div>`;
    return `<div class="grid cols-2"><div>
      ${fld('r', 'Jari-jari (cm)', 10)}${fld('alpha', 'Sudut pusat (°)', 90)}
      <button class="btn btn-primary" id="calcGo">Hitung</button></div><div id="calcOut"><div class="notice">π = 3,14 · K = 2πr · L = πr²</div></div></div>`;
  }
  const fld = (id, label, val) => `<div class="field"><label>${label}</label><input type="number" step="any" id="calc_${id}" value="${val}"></div>`;
  function mountCalc(kind) {
    container.querySelectorAll('#calcTabs button').forEach(b => b.classList.toggle('active', b.dataset.calc === kind));
    const body = container.querySelector('#calcBody'); body.innerHTML = calcBody(kind);
    container.querySelector('#calcGo').onclick = () => {
      const v = id => parseNum(container.querySelector('#calc_' + id).value);
      let out = '';
      if (kind === 'arith') {
        const a = v('a'), b = v('b'), n = v('n'), u = a + (n - 1) * b, s = n * (a + u) / 2;
        out = `<div class="kpi-grid"><div class="stat"><span>U<sub>${n}</sub></span><strong>${nfmt(u)}</strong></div><div class="stat"><span>S<sub>${n}</sub></span><strong>${nfmt(s)}</strong></div></div><div class="mathbox">U = ${nfmt(a)} + ${nfmt(n - 1, 0)}×${nfmt(b)}<br>S = ½×${nfmt(n, 0)}×(${nfmt(a)}+${nfmt(u)})</div>`;
      } else if (kind === 'geo') {
        const a = v('a'), r = v('r'), n = v('n'), u = a * r ** (n - 1), s = r === 1 ? a * n : a * (r ** n - 1) / (r - 1);
        out = `<div class="kpi-grid"><div class="stat"><span>U<sub>${n}</sub></span><strong>${nfmt(u)}</strong></div><div class="stat"><span>S<sub>${n}</sub></span><strong>${nfmt(s)}</strong></div></div><div class="notice ${Math.abs(r) < 1 ? 'ok' : 'warn'}">${Math.abs(r) < 1 ? `Konvergen: S∞ = ${nfmt(a / (1 - r))}` : 'Divergen untuk deret tak hingga.'}</div>`;
      } else {
        const r = v('r'), al = v('alpha'), K = 2 * 3.14 * r, L = 3.14 * r ** 2;
        out = `<div class="kpi-grid"><div class="stat"><span>Diameter</span><strong>${nfmt(2 * r)} cm</strong></div><div class="stat"><span>Keliling</span><strong>${nfmt(K)} cm</strong></div><div class="stat"><span>Luas</span><strong>${nfmt(L)} cm²</strong></div><div class="stat"><span>Busur</span><strong>${nfmt(al / 360 * K)} cm</strong></div><div class="stat"><span>Juring</span><strong>${nfmt(al / 360 * L)} cm²</strong></div></div>`;
      }
      container.querySelector('#calcOut').innerHTML = out;
    };
  }
  function mountChallenges(prog) {
    const arr = challengesFor(prog);
    container.querySelector('#challengeList').innerHTML = arr.map(c => `<div class="card" style="box-shadow:none" data-ch="${c.id}">
      <div class="row between"><h3>${escapeHtml(c.judul)}</h3><span class="tag teal">${c.materi}</span></div><p>${escapeHtml(c.prompt)}</p>
      <div class="row"><input class="input" style="max-width:220px" type="number" step="any" placeholder="Jawaban ${escapeHtml(c.satuan)}" data-answer="${c.id}">
      <button class="btn btn-primary btn-sm" data-check="${c.id}">Cek</button></div><div class="feedback-box"></div></div>`).join('');
    container.querySelectorAll('[data-check]').forEach(b => b.onclick = () => {
      const c = arr.find(x => x.id === b.dataset.check);
      const val = parseNum(container.querySelector(`[data-answer="${c.id}"]`).value);
      const box = b.closest('[data-ch]').querySelector('.feedback-box');
      if (Number.isFinite(val) && Math.abs(val - c.answer) <= Math.max(0.01, Math.abs(c.answer) * 0.02)) {
        box.innerHTML = `<div class="feedback">✅ Benar! ${escapeHtml(c.pembahasan)}</div>`;
      } else box.innerHTML = `<div class="feedback bad">Belum tepat. Pikirkan konsep yang dipakai, lalu coba lagi.</div>`;
    });
  }
  container.querySelectorAll('#calcTabs button').forEach(b => b.onclick = () => mountCalc(b.dataset.calc));
  mountCalc('arith');
  container.querySelector('#programSelect').onchange = e => mountChallenges(e.target.value);
  mountChallenges(program);
}
