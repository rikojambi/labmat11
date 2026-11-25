// Materi + visualisasi matematika interaktif (canvas & SVG, tanpa library).
import { MODULES, getModule } from '../data/materials.js';
import { escapeHtml, $ } from './utils.js';

const PI = 3.14;
const fmt = (n, d = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export function renderModuleList() {
  return `<div class="grid cols-3">${MODULES.map(m => `
    <article class="card module-card ${m.cls}" data-module="${m.id}" tabindex="0" role="button">
      <div class="icon">${m.icon}</div><h3>Modul ${m.no}: ${escapeHtml(m.title)}</h3>
      <p>${escapeHtml(m.subtitle)}</p>
      <div class="badge-row">${m.indicators.slice(0, 2).map(i => `<span class="tag">${escapeHtml(i)}</span>`).join('')}</div>
      <button class="btn btn-soft btn-sm">Pelajari modul →</button>
    </article>`).join('')}</div>`;
}

export function renderModule(moduleId) {
  const m = getModule(moduleId);
  return `<div class="reader">
    <div class="row between mb-2"><div><span class="pill">Modul ${m.no}</span><h2 class="mt-1">${m.icon} ${escapeHtml(m.title)}</h2><p class="muted">${escapeHtml(m.subtitle)}</p></div>
      <button class="btn btn-ghost btn-sm" data-back-materi>← Daftar modul</button></div>
    <div class="card mb-2"><h3>Tujuan pembelajaran</h3><ul>${m.objectives.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
      <div class="badge-row">${m.indicators.map(i => `<span class="tag teal">${escapeHtml(i)}</span>`).join('')}</div></div>
    ${m.sections.map(s => `<div class="card mb-2"><h3>${escapeHtml(s.title)}</h3>${s.html}</div>`).join('')}
    <div class="card mb-2" id="vizCard"><h3>🔬 Laboratorium interaktif</h3>${vizMarkup(m.id)}</div>
    <div class="card mb-2"><h3>🌍 Penerapan dalam kehidupan & dunia kerja</h3>
      <div class="grid cols-3">${m.applications.map(a => `<div class="notice" style="margin:0"><strong>${a.icon} ${escapeHtml(a.title)}</strong><br><span class="muted">${escapeHtml(a.text)}</span></div>`).join('')}</div></div>
    <div class="card"><h3>✍️ Contoh penyelesaian kontekstual</h3>
      ${m.examples.map((e, i) => `<div class="example"><h4>Contoh ${i + 1}. ${escapeHtml(e.title)}</h4>
        <p><b>Diketahui:</b> ${e.known}</p><p><b>Pertanyaan:</b> ${e.asked}</p>
        <p><b>Strategi:</b> ${e.strategy}</p><div class="mathbox"><b>Perhitungan:</b><br>${e.calc}</div>
        <div class="notice ok"><b>Kesimpulan:</b> ${e.conclude}</div></div>`).join('')}</div>
  </div>`;
}

function vizMarkup(id) {
  if (id === 'aritmetika') return `<p class="muted">Ubah suku pertama, beda, dan jumlah periode. Grafik, tabel, dan ringkasan berubah otomatis.</p>
    <div class="grid cols-2"><div>
      ${slider('aArt', 'Suku pertama (a)', -50, 200, 20)}
      ${slider('bArt', 'Beda (b)', -20, 50, 8)}
      ${slider('nArt', 'Jumlah periode (n)', 3, 20, 10)}
      <div class="mathbox">U<sub>n</sub> = a + (n−1)b · S<sub>n</sub> = ½n(a + U<sub>n</sub>)</div></div>
      <div><div class="chart-box"><canvas id="chartArt" width="720" height="340"></canvas></div><div id="sumArt" class="mt-1"></div></div></div>
    <div id="tableArt" class="table-wrap mt-2"></div>`;
  if (id === 'geometri') return `<p class="muted">Eksplorasi pertumbuhan (r &gt; 1) dan penurunan (0 &lt; r &lt; 1).</p>
    <div class="grid cols-2"><div>
      ${slider('aGeo', 'Nilai awal (a)', 1, 100, 5)}
      ${slider('rGeo', 'Rasio (r)', 0.5, 2.5, 1.5)}
      ${slider('nGeo', 'Jumlah periode (n)', 3, 15, 8)}
      <div class="mathbox">U<sub>n</sub> = a·r<sup>n−1</sup> · S<sub>n</sub> = a(r<sup>n</sup>−1)/(r−1)</div>
      <div id="convGeo" class="notice"></div></div>
      <div><div class="chart-box"><canvas id="chartGeo" width="720" height="340"></canvas></div><div id="sumGeo" class="mt-1"></div></div></div>
    <div id="tableGeo" class="table-wrap mt-2"></div>`;
  return `<p class="muted">Geser jari-jari dan sudut pusat untuk melihat perubahan diameter, keliling, luas, busur, dan juring.</p>
    <div class="grid cols-2"><div>
      ${slider('rCir', 'Jari-jari r (cm)', 1, 30, 10)}
      ${slider('angCir', 'Sudut pusat α (°)', 10, 360, 90)}
      <div class="mathbox">d = 2r · K = 2πr · L = πr²</div>
      <div class="mathbox">Busur = α/360° × K · Juring = α/360° × L</div>
      <label class="row"><input type="checkbox" id="chordCir" checked> Tampilkan tali busur &amp; tembereng</label></div>
      <div><div class="chart-box"><svg id="circleSvg" viewBox="0 0 440 400" style="width:100%;height:auto"></svg></div>
      <div id="sumCir" class="mt-1"></div></div></div>`;
}
const slider = (id, label, min, max, value) => `<div class="field"><label>${label}: <b id="${id}Val">${value}</b></label><input class="slider" type="range" id="${id}" min="${min}" max="${max}" value="${value}"></div>`;

export function mountVisualization(root, moduleId) {
  if (moduleId === 'aritmetika') mountArithmetic(root);
  else if (moduleId === 'geometri') mountGeometric(root);
  else mountCircle(root);
}

function drawChart(canvas, values, color = '#20c7b7') {
  if (!canvas) return;
  const x = canvas.getContext('2d'), W = canvas.width, H = canvas.height, pad = 42;
  x.clearRect(0, 0, W, H); x.fillStyle = '#fbfdff'; x.fillRect(0, 0, W, H);
  const min = Math.min(0, ...values), max = Math.max(1, ...values), range = max - min || 1;
  const px = i => pad + i * (W - pad * 2) / Math.max(1, values.length - 1);
  const py = v => H - pad - (v - min) / range * (H - pad * 2);
  x.strokeStyle = '#dfe9f3'; x.lineWidth = 1; x.font = '12px Segoe UI'; x.fillStyle = '#647992';
  for (let i = 0; i <= 4; i++) { const y = pad + i * (H - 2 * pad) / 4; x.beginPath(); x.moveTo(pad, y); x.lineTo(W - pad, y); x.stroke(); x.fillText(fmt(max - i * range / 4, 0), 4, y + 4); }
  x.beginPath(); values.forEach((v, i) => i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)));
  if (values.length > 1) { x.lineTo(px(values.length - 1), H - pad); x.lineTo(px(0), H - pad); x.closePath(); x.fillStyle = color + '22'; x.fill(); }
  x.beginPath(); values.forEach((v, i) => i ? x.lineTo(px(i), py(v)) : x.moveTo(px(i), py(v)));
  x.strokeStyle = color; x.lineWidth = 3; x.stroke();
  values.forEach((v, i) => { x.beginPath(); x.arc(px(i), py(v), 4, 0, 7); x.fillStyle = '#ffd166'; x.fill(); if (i < 20) x.fillText(i + 1, px(i) - 5, H - 22); });
}

function mountArithmetic(root) {
  const a = $('#aArt', root), b = $('#bArt', root), n = $('#nArt', root);
  const update = () => {
    const A = +a.value, B = +b.value, N = +n.value;
    ['aArt', 'bArt', 'nArt'].forEach(id => { const el = $('#' + id + 'Val', root); if (el) el.textContent = $('#' + id, root).value; });
    const values = Array.from({ length: N }, (_, i) => A + i * B);
    const u = values[N - 1], s = values.reduce((x, y) => x + y, 0);
    drawChart($('#chartArt', root), values);
    $('#sumArt', root).innerHTML = `<div class="kpi-grid"><div class="stat"><span>Suku ke-${N}</span><strong>${fmt(u, 0)}</strong></div><div class="stat"><span>Jumlah ${N} suku</span><strong>${fmt(s, 0)}</strong></div><div class="stat"><span>Beda</span><strong>${fmt(B, 0)}</strong></div></div>`;
    $('#tableArt', root).innerHTML = `<table><thead><tr><th>Periode</th>${values.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr></thead><tbody><tr><td><b>Nilai</b></td>${values.map(v => `<td>${fmt(v, 0)}</td>`).join('')}</tr></tbody></table>`;
  };
  [a, b, n].forEach(el => el?.addEventListener('input', update)); update();
}
function mountGeometric(root) {
  const a = $('#aGeo', root), r = $('#rGeo', root), n = $('#nGeo', root);
  const update = () => {
    const A = +a.value, R = +r.value, N = +n.value;
    ['aGeo', 'rGeo', 'nGeo'].forEach(id => { const el = $('#' + id + 'Val', root); if (el) el.textContent = $('#' + id, root).value; });
    const values = Array.from({ length: N }, (_, i) => A * R ** i);
    const u = values[N - 1], s = R === 1 ? A * N : A * (R ** N - 1) / (R - 1);
    drawChart($('#chartGeo', root), values, '#5b8def');
    $('#sumGeo', root).innerHTML = `<div class="kpi-grid"><div class="stat"><span>Suku ke-${N}</span><strong>${fmt(u, 2)}</strong></div><div class="stat"><span>Jumlah ${N} suku</span><strong>${fmt(s, 2)}</strong></div><div class="stat"><span>Rasio</span><strong>${fmt(R, 2)}</strong></div></div>`;
    $('#convGeo', root).innerHTML = Math.abs(R) < 1
      ? `|r| &lt; 1 → deret tak hingga konvergen, S∞ = a/(1−r) ≈ <b>${fmt(A / (1 - R), 2)}</b>.`
      : `|r| ≥ 1 → deret tak hingga divergen (jumlah tidak hingga).`;
    $('#convGeo', root).className = 'notice ' + (Math.abs(R) < 1 ? 'ok' : 'warn');
    $('#tableGeo', root).innerHTML = `<table><thead><tr><th>Periode</th>${values.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr></thead><tbody><tr><td><b>Nilai</b></td>${values.map(v => `<td>${fmt(v, 2)}</td>`).join('')}</tr></tbody></table>`;
  };
  [a, r, n].forEach(el => el?.addEventListener('input', update)); update();
}
function mountCircle(root) {
  const r = $('#rCir', root), ang = $('#angCir', root), chord = $('#chordCir', root);
  const update = () => {
    const R = +r.value, ALPHA = +ang.value;
    $('#rCirVal', root).textContent = R; $('#angCirVal', root).textContent = ALPHA;
    const scale = 140 / 30, rad = R * scale, cx = 220, cy = 200;
    const theta = ALPHA * Math.PI / 180;
    const x1 = cx + rad, y1 = cy, x2 = cx + rad * Math.cos(theta), y2 = cy - rad * Math.sin(theta);
    const large = ALPHA > 180 ? 1 : 0;
    const arc = `M ${cx} ${cy} L ${x1} ${y1} A ${rad} ${rad} 0 ${large} 0 ${x2} ${y2} Z`;
    const circumferencePath = `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 0 ${x2} ${y2}`;
    const seg = chord.checked ? `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 0 ${x2} ${y2} L ${x1} ${y1} Z` : '';
    $('#circleSvg', root).innerHTML = `
      <defs><linearGradient id="jg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20c7b7" stop-opacity=".55"/><stop offset="1" stop-color="#20c7b7" stop-opacity=".12"/></linearGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${rad}" fill="#f2f8fd" stroke="#0b2a4f" stroke-width="3"/>
      <path d="${arc}" fill="url(#jg)"/>
      ${seg ? `<path d="${seg}" fill="#ffd16655" stroke="#e58a21" stroke-width="1.5"/>` : ''}
      <path d="${circumferencePath}" fill="none" stroke="#0e9c91" stroke-width="6" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke="#0b2a4f" stroke-width="2"/>
      <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#0b2a4f" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="#dc4c5c"/><text x="${cx - 16}" y="${cy + 22}" font-size="14" fill="#0b2a4f">O</text>
      <text x="${x1 + 8}" y="${y1 + 5}" font-size="14" fill="#0b2a4f">A</text>
      <text x="${x2 + 8}" y="${y2 - 5}" font-size="14" fill="#0b2a4f">B</text>
      <text x="${cx + 26}" y="${cy - 14}" font-size="13" fill="#0e9c91">${ALPHA}°</text>`;
    const d = 2 * R, K = 2 * PI * R, L = PI * R * R;
    $('#sumCir', root).innerHTML = `<div class="kpi-grid">
      <div class="stat"><span>Diameter</span><strong>${fmt(d, 1)} cm</strong></div>
      <div class="stat"><span>Keliling</span><strong>${fmt(K, 2)} cm</strong></div>
      <div class="stat"><span>Luas</span><strong>${fmt(L, 2)} cm²</strong></div>
      <div class="stat"><span>Panjang busur</span><strong>${fmt(ALPHA / 360 * K, 2)} cm</strong></div>
      <div class="stat"><span>Luas juring</span><strong>${fmt(ALPHA / 360 * L, 2)} cm²</strong></div></div>`;
  };
  [r, ang, chord].forEach(el => el?.addEventListener('input', update)); update();
}
