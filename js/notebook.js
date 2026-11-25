// Latihan lanjutan di buku tulis — wajib, kontekstual, jawaban tidak ditampilkan aplikasi.
import { NOTEBOOK, notebookFor, notebookById } from '../data/notebook.js';
import { get, put, getByIndex, getConfig } from './database.js';
import { enqueue } from './sync.js';
import { markStage } from './flow.js';
import { escapeHtml, nowISO, uid, toast, formatDateTime } from './utils.js';

const recordId = (sid, itemId) => `NB-${sid}-${itemId}`;

export async function renderNotebookList(container, filter = '') {
  const identity = await get('identity', 'current');
  if (!identity) return;
  const rows = await getByIndex('notebook', 'byStudent', identity.student_id);
  const done = new Set(rows.filter(r => r.status === 'selesai').map(r => r.item_id));
  const items = filter ? notebookFor(filter) : NOTEBOOK;
  container.innerHTML = `<div class="notice warn">Latihan ini dikerjakan <b>di buku tulis</b>. Aplikasi tidak menampilkan kunci jawaban. Tulis langkahmu sendiri, lalu centang setelah selesai.</div>
    <div class="grid cols-2 mt-2">${items.map(n => `<div class="card module-card" data-nb="${n.id}">
      <div class="row between"><span class="tag">${escapeHtml(n.level)}</span><span class="tag ${done.has(n.id) ? 'ok' : ''}">${done.has(n.id) ? 'Sudah dikerjakan' : 'Belum'}</span></div>
      <h3>${n.icon} ${escapeHtml(n.title)}</h3><p class="muted">${escapeHtml(n.prompt)}</p>
      <span class="hint-text">${escapeHtml(n.module)} · 7 instruksi tertulis</span></div>`).join('')}</div>`;
  container.querySelectorAll('[data-nb]').forEach(c => c.onclick = () => location.hash = `#/bukutulis/${c.dataset.nb}`);
}

export async function renderNotebook(container, itemId) {
  const identity = await get('identity', 'current');
  const item = notebookById(itemId);
  if (!identity || !item) { container.innerHTML = '<div class="notice bad">Latihan buku tulis tidak ditemukan.</div>'; return; }
  const key = recordId(identity.student_id, item.id);
  let state = await get('notebook', key);
  if (!state) {
    state = { id: key, student_id: identity.student_id, item_id: item.id, module: item.module, judul: item.title,
      instruksi_centang: Array(item.instructions.length).fill(false), refleksi: '', foto: null, status: 'draft', waktu: nowISO() };
  }
  const cfg = await getConfig('notebook');
  const draw = () => {
    container.innerHTML = `<div class="reader"><div class="row between"><div><span class="pill">LANJUTKAN PEMBELAJARANMU DI BUKU TULIS</span>
      <h2 class="mt-1">${item.icon} ${escapeHtml(item.title)}</h2></div><button class="btn btn-ghost btn-sm" data-back>Kembali</button></div>
      <div class="card"><h3>Soal untuk dikerjakan di buku tulis</h3><p>${escapeHtml(item.prompt)}</p>
        <div class="notice warn">Jawaban tidak tersedia di aplikasi. Guru dapat memeriksa langsung di kelas atau meminta foto jika memang diperlukan.</div></div>
      <div class="card mt-2"><h3>7 instruksi tertulis</h3>${item.instructions.map((ins, i) => `<label class="row"><input type="checkbox" data-instruksi="${i}" ${state.instruksi_centang[i] ? 'checked' : ''}> <span>${i + 1}. ${escapeHtml(ins)}</span></label>`).join('')}</div>
      <div class="card mt-2"><h3>Refleksi singkat</h3><p class="muted">${escapeHtml(item.reflection)}</p>
        <textarea class="input" id="nbRefleksi" rows="3" placeholder="Tuliskan refleksimu di sini…">${escapeHtml(state.refleksi)}</textarea>
        ${cfg.fotoDiminta ? `<div class="field mt-2"><label>Foto hasil tulisan (opsional, diminta guru)</label><input class="input" type="file" id="nbFoto" accept="image/*"><span class="hint-text">Foto hanya disimpan jika kamu memilih untuk mengunggahnya.</span></div>` : '<p class="hint-text mt-2">Guru tidak meminta foto pada latihan ini.</p>'}
        <label class="row mt-2"><input type="checkbox" id="nbSelesai" ${state.status === 'selesai' ? 'checked' : ''}> <b>SAYA SUDAH MENGERJAKAN DI BUKU</b></label>
        <button class="btn btn-primary mt-2" id="nbSave">Simpan &amp; kirim ke guru</button>
        <p class="hint-text">Terakhir disimpan: ${formatDateTime(state.waktu)} ${state.foto ? '· foto terlampir' : ''}</p></div></div>`;

    const save = async () => {
      state.instruksi_centang = item.instructions.map((_, i) => !!container.querySelector(`[data-instruksi="${i}"]`)?.checked);
      state.refleksi = container.querySelector('#nbRefleksi').value;
      state.waktu = nowISO();
      await put('notebook', state);
    };
    container.querySelectorAll('[data-instruksi]').forEach(el => el.addEventListener('change', save));
    container.querySelector('#nbRefleksi').addEventListener('input', save);
    container.querySelector('#nbFoto')?.addEventListener('change', async e => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => { state.foto = { name: file.name, type: file.type, dataUrl: String(reader.result) }; await save(); toast('Foto tersimpan lokal.', 'ok'); };
      reader.readAsDataURL(file);
    });
    container.querySelector('[data-back]').onclick = () => location.hash = '#/bukutulis';
    container.querySelector('#nbSave').onclick = async () => {
      await save();
      const checked = container.querySelector('#nbSelesai').checked;
      if (!checked) { toast('Centang pernyataan setelah selesai menulis di buku.', 'bad'); return; }
      if (state.refleksi.trim().length < 10) { toast('Tulis refleksi singkat, minimal 10 karakter.', 'bad'); return; }
      state.status = 'selesai'; state.waktu_selesai = nowISO();
      await put('notebook', state);
      await enqueue('LATIHAN_BUKU', { ...state, foto: state.foto ? { name: state.foto.name, type: state.foto.type } : null }, `nb:${state.id}`);
      const all = await getByIndex('notebook', 'byStudent', identity.student_id);
      if (all.filter(r => r.status === 'selesai').length >= NOTEBOOK.length) await markStage('bukutulis');
      toast('Latihan buku tulis tercatat. Guru dapat memeriksa atau memberi komentar.', 'ok');
      location.hash = '#/bukutulis';
    };
  };
  draw();
}
