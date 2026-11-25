// Utilitas umum LABMAT SMK XI.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const uid = (prefix = 'ID') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
export const nowISO = () => new Date().toISOString();
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const parseNum = v => { const n = Number(String(v ?? '').replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
export const round = (n, d = 2) => Number(Number(n).toFixed(d));
export const durasi = (start, end) => Math.max(0, Math.round((new Date(end) - new Date(start)) / 1000));

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(+d) ? '—' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
export function formatDurasi(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} mnt ${s} dtk` : `${s} dtk`;
}
export function downloadFile(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function toast(message, kind = '') {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const t = document.createElement('div');
  t.className = `toast ${kind}`; t.textContent = message;
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 250); }, 4200);
}

export function openModal(title, bodyHTML, { root = 'modalRoot', wide = false, onMount } = {}) {
  const host = document.getElementById(root);
  if (!host) return;
  host.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close-modal aria-label="Tutup">✕</button></div>
    <div class="modal-body">${bodyHTML}</div></div></div>`;
  host.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = () => closeModal(root));
  host.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(root); });
  onMount?.(host.querySelector('.modal'));
}
export function closeModal(root = 'modalRoot') { const host = document.getElementById(root); if (host) host.innerHTML = ''; }
export function confirmDialog(message, onYes, title = 'Konfirmasi') {
  openModal(title, `<p>${escapeHtml(message)}</p><div class="row mt-2"><button class="btn btn-danger" id="confirmYes">Ya, lanjutkan</button><button class="btn btn-ghost" data-close-modal>Batal</button></div>`,
    { onMount: modal => { modal.querySelector('#confirmYes').onclick = () => { closeModal(); onYes(); }; } });
}
export const debounce = (fn, ms = 300) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

export function field(label, inputHTML, hint = '') {
  return `<div class="field"><label>${label}</label>${inputHTML}${hint ? `<span class="hint-text">${hint}</span>` : ''}</div>`;
}
export function progressBar(value, label = '') {
  const v = clamp(Number(value) || 0, 0, 100);
  return `<div class="progress-label"><span>${label}</span><span>${Math.round(v)}%</span></div><div class="progress"><span style="width:${v}%"></span></div>`;
}
export function statusChip(status) {
  const map = { synced: ['ok', 'Berhasil'], pending: ['warn', 'Menunggu'], sending: ['teal', 'Mengirim'], failed: ['bad', 'Gagal, mencoba lagi'], draft: ['', 'Tersimpan lokal'] };
  const [cls, text] = map[status] || ['', status];
  return `<span class="tag ${cls}">${text}</span>`;
}
