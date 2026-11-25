// Dashboard guru LABMAT SMK XI — membaca hasil sinkronisasi Google Sheets.
import { openDB, seedDefaults, get, getAll, put, importBackup, getConfig, setConfig } from '../js/database.js';
import { classAnalytics, csvFromStudents } from '../js/analytics.js';
import { getSyncConfig, setSyncConfig, pull, processQueue, enqueue } from '../js/sync.js';
import { QUESTIONS } from '../data/questions.js';
import { escapeHtml, formatDateTime, formatDurasi, openModal, closeModal, confirmDialog, toast, downloadFile, field, statusChip } from '../js/utils.js';
import { getFlowConfig, setFlowConfig } from '../js/flow.js';
import { getTimingConfig, setTimingConfig, ALLOWED_SECONDS } from '../js/timing.js';
import { getAnomalyConfig, setAnomalyConfig } from '../js/anomaly.js';
import { teacherAction, startTeacherPolling, setRealtimeConfig, applyPulledRealtime, requestLocalBackup } from '../js/realtime.js';
import { ensureTeacherGate, lock as lockTeacher, hasPin, setPin, hapusPin } from '../js/teacher-auth.js';

let data = null, stats = null, pollStop = null;
const backupDilihat = new Set(); // cegah render ulang tanpa henti saat polling menemukan cadangan lama
const view = document.getElementById('teacherView');
const routes = ['ringkasan', 'siswa', 'nilai', 'jawaban', 'proses', 'umpan', 'monitoring', 'pengaturan'];

async function boot() {
  try { await openDB(); await seedDefaults(); }
  catch (e) { view.innerHTML = `<div class="notice bad">IndexedDB tidak tersedia: ${escapeHtml(e.message)}</div>`; return; }

  // Gerbang PIN lokal — jalankan sebelum data apa pun dimuat atau ditampilkan.
  document.getElementById('lockBtn').onclick = () => { lockTeacher(); location.reload(); };
  if (!(await ensureTeacherGate(document.getElementById('teacherGate')))) {
    view.innerHTML = '<div class="notice bad">Gerbang PIN gagal dimuat. Muat ulang halaman.</div>';
    return;
  }

  document.getElementById('refreshBtn').onclick = () => load(true);
  document.getElementById('exportBtn').onclick = () => {
    if (!stats) { toast('Muat data terlebih dahulu.', 'bad'); return; }
    downloadFile(`rekap-labmat-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + csvFromStudents(stats.students), 'text/csv;charset=utf-8');
  };
  document.getElementById('teacherMenuBtn').onclick = () => document.getElementById('teacherSidebar').classList.toggle('open');
  window.addEventListener('hashchange', route);
  const cfg = await getSyncConfig();
  if (!cfg.url || !cfg.token) { setupModal(); return; }
  await load(false);
}

function setupModal() {
  openModal('Hubungkan dashboard guru', `<p>Masukkan URL Web App Google Apps Script dan kode sinkronisasi dari sheet <b>KONFIGURASI</b>.</p>
    ${field('URL Web App', '<input id="tUrl" placeholder="https://script.google.com/macros/s/…/exec">')}
    ${field('Kode sinkronisasi', '<input id="tToken" type="password">')}
    <button class="btn btn-primary" id="tConnect">Simpan &amp; muat data</button>
    <button class="btn btn-ghost" id="tOffline">Lanjut tanpa koneksi (impor cadangan)</button>`,
    { root: 'teacherModalRoot', onMount: modal => {
      modal.querySelector('#tConnect').onclick = async () => {
        await setSyncConfig({ url: modal.querySelector('#tUrl').value.trim(), token: modal.querySelector('#tToken').value.trim() });
        closeModal('teacherModalRoot'); await load(true);
      };
      modal.querySelector('#tOffline').onclick = async () => { closeModal('teacherModalRoot'); location.hash = '#/pengaturan'; await route(); };
    } });
}

async function load(force) {
  const cfg = await getSyncConfig();
  try {
    if (cfg.url && cfg.token && navigator.onLine !== false) {
      const fresh = await pull({ full: true });
      await applyPulledRealtime(fresh);
      await put('config', { key: 'teacherCache', ...fresh, cached_at: new Date().toISOString() });
      data = fresh; toast('Data terbaru berhasil dimuat dari Google Sheets.', 'ok');
    } else throw new Error('Offline atau belum terhubung');
  } catch (e) {
    data = await get('config', 'teacherCache');
    toast(data ? `Menggunakan data tersimpan lokal (${formatDateTime(data.cached_at)}).` : 'Belum ada data. Impor cadangan siswa di menu Pengaturan.', data ? 'ok' : 'bad');
  }
  stats = classAnalytics(data);
  await route();
}

async function route() {
  const raw = location.hash.replace(/^#\/?/, '') || 'ringkasan';
  const name = routes.includes(raw) ? raw : 'ringkasan';
  document.getElementById('teacherPageTitle').textContent = ({
    ringkasan: 'Ringkasan Kelas', siswa: 'Data Siswa', nilai: 'Nilai & Modul', jawaban: 'Jawaban Siswa',
    proses: 'Proses & Refleksi', umpan: 'Umpan Balik', monitoring: 'Pemantauan Pengerjaan Langsung', pengaturan: 'Koneksi & Aturan'
  })[name];
  document.querySelectorAll('#teacherNav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  if (pollStop) { pollStop(); pollStop = null; }
  if (name === 'monitoring') { await pageMonitoring(); return; }
  if (!data) { view.innerHTML = `<div class="notice warn">Belum ada data. Hubungkan Google Apps Script atau impor cadangan di menu Pengaturan.</div>`; await pagePengaturan(); return; }
  if (name === 'ringkasan') pageRingkasan();
  else if (name === 'siswa') pageSiswa();
  else if (name === 'nilai') pageNilai();
  else if (name === 'jawaban') pageJawaban();
  else if (name === 'proses') pageProses();
  else if (name === 'umpan') pageUmpan();
  else await pagePengaturan();
}

const kpi = (label, val, sub = '') => `<div class="stat"><span>${label}</span><strong>${val}</strong>${sub ? `<span>${sub}</span>` : ''}</div>`;
const indikatorTeks = rows => (rows || []).map(i => typeof i === 'string' ? i : [i.kode, i.label].filter(Boolean).join(': ')).filter(Boolean).join('; ');

async function pageMonitoring() {
  if (pollStop) { pollStop(); pollStop = null; }
  const [alerts, anomalies, actions, warnings, timingRows, responses, sessions, essays, notebook, queue, localBackups, rtCfg] = await Promise.all([
    getAll('alerts'), getAll('anomalies'), getAll('teacherActions'), getAll('warnings'), getAll('timing'), getAll('responses'),
    getAll('sessions'), getAll('essayResponses'), getAll('notebook'), getAll('syncQueue'), getAll('localBackups'), getConfig('realtime')
  ]);
  const cadangan = localBackups.filter(x => x.jenis === 'cadangan').sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)));
  for (const x of cadangan) backupDilihat.add(x.id);
  const siswa = data?.siswa || await getAll('identity');
  const nameOf = sid => siswa.find(s => s.student_id === sid)?.nama || sid;
  const classOf = sid => siswa.find(s => s.student_id === sid)?.kelas || '—';
  const unsynced = sid => queue.filter(q => q.status !== 'synced' && (q.payload?.student_id === sid || q.payload?.id === sid)).length;
  const latestAlert = sid => alerts.filter(a => a.student_id === sid).sort((a, b) => String(b.waktu).localeCompare(String(a.waktu)))[0];
  const grid =siswa.map(s => {
    const sid = s.student_id;
    const sesi = sessions.filter(x => x.student_id === sid).sort((a, b) => String(b.waktu_mulai).localeCompare(String(a.waktu_mulai)))[0];
    const active = sesi?.status === 'in_progress';
    const q = responses.filter(r => r.student_id === sid && r.status === 'selesai').length;
    const tm = timingRows.filter(t => t.student_id === sid).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
    const alert = latestAlert(sid);
    const level = alert?.tingkat === 'ANOMALI TINGGI' ? 'merah'
      : alert && alert.status !== 'diperiksa' && alert.status !== 'diabaikan' ? 'kuning' : 'hijau';
    const dur = tm ? Math.round(((tm.elapsed_ms || 0) - (tm.idle_ms || 0)) / 1000) : 0;
    return `<div class="monitor-card ${level}"><div class="row between"><span class="tag ${level === 'hijau' ? 'ok' : level === 'kuning' ? 'warn' : 'bad'}">${level === 'hijau' ? 'Normal' : level === 'kuning' ? 'Perlu diperhatikan' : 'Anomali tinggi'}</span><span class="hint-text">${escapeHtml(s.kelas || '')}</span></div>
      <h4>${escapeHtml(s.nama || sid)}</h4>
      <div class="hint-text">Status: <b>${active ? 'Sedang mengerjakan' : sesi ? 'Selesai asesmen' : 'Belum mulai'}</b><br>
      Soal saat ini: ${escapeHtml(tm?.question_id || '—')} · Durasi: ${formatDurasi(dur)}<br>
      Selesai: ${q}/20 soal · Sinkronisasi: ${unsynced(sid) ? unsynced(sid) + ' antrean' : 'tersinkronisasi'}<br>
      Indikator: ${alert ? escapeHtml(alert.tingkat) : 'tidak ada'}</div>
      <div class="row mt-1"><button class="btn btn-soft btn-sm" data-monitor="${escapeHtml(sid)}">Lihat detail &amp; tindakan</button></div></div>`;
  }).join('');
  view.innerHTML = `<div class="reader"><div class="row between"><div><span class="pill">Pemantauan satu LAN + cadangan Sheets</span><h2 class="mt-1">Pemantauan Pengerjaan Langsung</h2></div>
    <div class="row"><button class="btn btn-ghost btn-sm" id="monitorRefresh">Muat ulang</button>
      <button class="btn btn-primary btn-sm" id="bkRequest">Ambil data lokal siswa</button>
      <button class="btn btn-primary btn-sm" id="monitorSync">Sinkronkan antrean</button></div></div>
    <div class="notice">Indikator hanya nasihat pedagogis, bukan vonis otomatis. Setiap tindakan guru dicatat dan dapat dikomentari siswa. Tidak ada kamera, screenshot tersembunyi, atau perekaman keyboard.</div>
    <div class="grid cols-4 mt-2"><div class="stat"><span>Siswa dipantau</span><strong>${siswa.length}</strong></div><div class="stat"><span>Peringatan aktif</span><strong>${alerts.filter(a => a.status !== 'diperiksa' && a.status !== 'diabaikan').length}</strong></div>
      <div class="stat"><span>Tindakan guru</span><strong>${actions.length}</strong></div><div class="stat"><span>Cadangan diterima</span><strong>${cadangan.length}</strong></div></div>
    <div class="card mt-2"><div class="row between"><div><h3>Cadangan data lokal siswa</h3>
      <p class="muted">Ambil salinan seluruh IndexedDB dari perangkat siswa yang sedang membuka aplikasi pada server lokal yang sama. Siswa melihat notifikasi dan riwayat permintaan; tidak ada pengambilan diam-diam.</p></div></div>
      ${cadangan.length ? `<div>${cadangan.map(x => `<div class="log-row"><b>${escapeHtml(x.nama || nameOf(x.student_id))}</b> · ${escapeHtml(x.student_id)} · ${escapeHtml(formatDateTime(x.waktu))}
        · ${x.jumlah_store || Object.keys(x.backup?.data || {}).length} penyimpanan
        <div class="row mt-1"><button class="btn btn-ghost btn-sm" data-bk-download="${escapeHtml(x.id)}">⬇ Unduh JSON</button>
          <button class="btn btn-soft btn-sm" data-bk-detail="${escapeHtml(x.id)}">Lihat ringkasan</button></div></div>`).join('')}</div>`
        : '<p class="hint-text">Belum ada cadangan. Klik “Ambil data lokal siswa”, lalu tunggu perangkat siswa merespons.</p>'}</div>
    <h3 class="mt-3">Status siswa</h3><div class="monitor-grid">${grid || '<div class="notice">Belum ada siswa.</div>'}</div>
    <div class="grid cols-2 mt-3"><div class="card"><h3>Log peringatan</h3><div>${alerts.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu))).slice(0, 30).map(a => `<div class="log-row"><b>${escapeHtml(nameOf(a.student_id))}</b> · ${escapeHtml(a.question_id || '')} · <span class="tag ${a.tingkat === 'ANOMALI TINGGI' ? 'bad' : 'warn'}">${escapeHtml(a.tingkat)}</span><br>
      ${escapeHtml(indikatorTeks(a.indikator))}${a.penjelasan_siswa ? `<br><i>Penjelasan siswa: ${escapeHtml(a.penjelasan_siswa)}</i>` : ''}</div>`).join('') || '<div class="hint-text">Belum ada peringatan.</div>'}</div></div>
      <div class="card"><h3>Riwayat tindakan guru</h3><div>${actions.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu))).slice(0, 30).map(a => `<div class="log-row"><b>${escapeHtml(a.label || a.type)}</b> · ${escapeHtml(nameOf(a.student_id))}<br><span class="hint-text">${formatDateTime(a.waktu)}${a.catatan ? ' · ' + escapeHtml(a.catatan) : ''}</span></div>`).join('') || '<div class="hint-text">Belum ada tindakan.</div>'}</div></div>
      <div class="card"><h3>Bukti proses (nasihat)</h3><div>${anomalies.sort((a, b) => String(b.waktu).localeCompare(String(a.waktu))).slice(0, 30).map(a => `<div class="log-row"><b>${escapeHtml(nameOf(a.student_id))}</b> · ${escapeHtml(a.question_id || '')} · <span class="tag ${a.kategori === 'ANOMALI TINGGI' ? 'bad' : 'warn'}">${escapeHtml(a.kategori || '')}</span><br>
        ${escapeHtml(indikatorTeks(a.indikator))}<br><span class="hint-text">${escapeHtml((a.indikator || []).map(i => typeof i === 'object' ? i.bukti : '').filter(Boolean).join('; '))}</span></div>`).join('') || '<div class="hint-text">Belum ada catatan proses.</div>'}</div></div></div>
    <div class="grid cols-2 mt-2"><div class="card"><h3>Uraian terstruktur</h3><div>${essays.slice(0, 20).map(e => `<div class="log-row"><b>${escapeHtml(nameOf(e.student_id))}</b> · ${escapeHtml(e.item_id)} · ${e.status === 'selesai' ? 'Selesai' : 'Draft'}
      <button class="btn btn-ghost btn-sm" data-essay-grade="${escapeHtml(e.response_id)}">Nilai langkah</button></div>`).join('') || '<div class="hint-text">Belum ada uraian.</div>'}</div></div>
      <div class="card"><h3>Latihan buku tulis</h3><div>${notebook.slice(0, 20).map(n => `<div class="log-row"><b>${escapeHtml(nameOf(n.student_id))}</b> · ${escapeHtml(n.item_id)} · ${n.status === 'selesai' ? 'Sudah dikerjakan' : 'Belum'}
      <button class="btn btn-ghost btn-sm" data-nb-grade="${escapeHtml(n.id)}">Periksa</button></div>`).join('') || '<div class="hint-text">Belum ada latihan buku.</div>'}</div></div></div></div>`;

  view.querySelector('#monitorRefresh').onclick = () => load(true);
  view.querySelector('#monitorSync').onclick = async () => {
    const res = await processQueue({ manual: true });
    toast(res.message, res.ok ? 'ok' : 'bad'); await load(true);
  };
  view.querySelector('#bkRequest').onclick = () => mintaCadangan(siswa);
  view.querySelectorAll('[data-bk-download]').forEach(b => b.onclick = async () => {
    const x = await get('localBackups', b.dataset.bkDownload);
    if (!x?.backup) return;
    downloadFile(`cadangan-${x.student_id}-${String(x.waktu).slice(0, 10)}.json`, JSON.stringify(x.backup, null, 2), 'application/json');
    toast('Cadangan diunduh ke perangkat guru.', 'ok');
  });
  view.querySelectorAll('[data-bk-detail]').forEach(b => b.onclick = async () => {
    const x = await get('localBackups', b.dataset.bkDetail);
    if (!x?.backup) return;
    const baris = Object.entries(x.backup.data || {}).map(([k, rows]) => `<tr><td>${escapeHtml(k)}</td><td>${Array.isArray(rows) ? rows.length : 0}</td></tr>`).join('');
    openModal('Ringkasan cadangan ' + escapeHtml(x.nama || x.student_id), `<p class="hint-text">${escapeHtml(formatDateTime(x.waktu))} · permintaan ${escapeHtml(x.request_id || '')}</p>
      <div class="table-wrap"><table><thead><tr><th>Penyimpanan</th><th>Jumlah data</th></tr></thead><tbody>${baris}</tbody></table></div>
      <div class="notice">Ini salinan penuh dari perangkat siswa. Jangan diimpor ke dashboard karena dapat menimpa identitas/PIN guru; unduh untuk arsip atau tinjauan.</div>
      <div class="row mt-2"><button class="btn btn-primary" data-close-modal>Tutup</button></div>`, { root: 'teacherModalRoot', wide: true });
  });
  view.querySelectorAll('[data-monitor]').forEach(b => b.onclick = () => showStudentDrawer(b.dataset.monitor, { alerts, anomalies, actions, warnings, responses, timingRows }));
  view.querySelectorAll('[data-essay-grade]').forEach(b => b.onclick = () => showEssayGrading(b.dataset.essayGrade));
  view.querySelectorAll('[data-nb-grade]').forEach(b => b.onclick = () => showNotebookReview(b.dataset.nbGrade));

  pollStop = startTeacherPolling(snap => {
    // Jangan menimpa halaman lain (misalnya Pengaturan) bila polling masih berjalan.
    if ((location.hash.replace(/^#\/?/, '') || 'ringkasan') !== 'monitoring') return;
    if (document.querySelector('#teacherModalRoot .modal-backdrop')) return;
    const cadanganBaru = (snap?.backups || []).filter(b => b?.id && !backupDilihat.has(b.id));
    for (const b of cadanganBaru) backupDilihat.add(b.id);
    const adaBaru = cadanganBaru.length > 0 || ['alerts', 'actions', 'warnings'].some(k => Array.isArray(snap?.[k]) && snap[k].length > 0);
    if (adaBaru) pageMonitoring();
  }, rtCfg.pollSec || 8);
}

/** Tombol guru: meminta salinan seluruh data lokal dari perangkat siswa yang sedang membuka aplikasi. */
function mintaCadangan(siswa) {
  const daftar = siswa.map(s => `<option value="${escapeHtml(s.student_id)}">${escapeHtml(s.nama || s.student_id)} — ${escapeHtml(s.student_id)}</option>`).join('');
  openModal('Ambil data lokal siswa', `<div class="notice warn">Perangkat siswa harus membuka LABMAT dan terhubung ke server lokal yang sama. Siswa akan melihat notifikasi saat salinan diambil.</div>
    ${field('Siswa', `<input id="bkSid" list="bkDaftar" placeholder="Pilih atau ketik student_id" autocomplete="off"><datalist id="bkDaftar">${daftar}</datalist>`)}
    ${field('Catatan untuk siswa (opsional)', '<input id="bkCatatan" placeholder="Misalnya: klarifikasi progres belajar">')}
    <div class="row mt-2"><button class="btn btn-primary" id="bkKirim">Minta cadangan sekarang</button><button class="btn btn-ghost" data-close-modal>Batal</button></div>`,
    { root: 'teacherModalRoot', onMount: modal => {
      modal.querySelector('#bkKirim').onclick = async () => {
        const sid = modal.querySelector('#bkSid').value.trim();
        if (!sid) { toast('Pilih siswa terlebih dahulu.', 'bad'); return; }
        const rec = siswa.find(s => s.student_id === sid);
        try {
          const req = await requestLocalBackup({ student_id: sid, nama: rec?.nama || '', catatan: modal.querySelector('#bkCatatan').value.trim() });
          closeModal('teacherModalRoot');
          toast(req ? 'Permintaan terkirim. Cadangan muncul otomatis di halaman ini.' : 'Gagal mengirim permintaan. Periksa koneksi ke server lokal.', req ? 'ok' : 'bad');
        } catch (e) { toast('Gagal: ' + e.message, 'bad'); }
      };
    } });
}

function showStudentDrawer(sid, store) {
  const list = store.alerts.filter(a => a.student_id === sid);
  const studentActions = store.actions.filter(a => a.student_id === sid);
  const jaw = store.responses.filter(r => r.student_id === sid);
  const body = `<div class="detail-backdrop" data-drawer-close></div><div class="detail-drawer"><div class="row between"><h2>${escapeHtml(nameFrom(sid))}</h2><button class="icon-btn" data-drawer-close>×</button></div>
    <p class="muted">Kelas ${escapeHtml(classFrom(sid))} · ${escapeHtml(sid)}</p>
    <h3>Peringatan</h3>${list.map(a => `<div class="card" style="box-shadow:none"><b>${escapeHtml(a.tingkat)}</b> · ${escapeHtml(a.question_id || '')}<br>
      <span class="hint-text">${escapeHtml(indikatorTeks(a.indikator))}</span><br><span class="hint-text">Durasi ${formatDurasi(a.durasi || 0)} · ${formatDateTime(a.waktu)}</span>
      ${a.penjelasan_siswa ? `<div class="notice ok">Penjelasan siswa: ${escapeHtml(a.penjelasan_siswa)}</div>` : ''}
      <div class="row mt-1"><button class="btn btn-soft btn-sm" data-act="lihat_jawaban" data-id="${a.id}">Lihat jawaban</button>
        <button class="btn btn-soft btn-sm" data-act="lihat_proses" data-id="${a.id}">Lihat proses</button>
        <button class="btn btn-primary btn-sm" data-act="peringatan" data-id="${a.id}">Berikan peringatan</button>
        <button class="btn btn-primary btn-sm" data-act="penjelasan" data-id="${a.id}">Minta penjelasan</button>
        <button class="btn btn-ghost btn-sm" data-act="diperiksa" data-id="${a.id}">Tandai diperiksa</button>
        <button class="btn btn-ghost btn-sm" data-act="abaikan" data-id="${a.id}">Abaikan indikator</button></div></div>`).join('') || '<div class="notice ok">Tidak ada peringatan untuk siswa ini.</div>'}
    <h3 class="mt-2">Tindakan tercatat</h3>${studentActions.map(a => `<div class="log-row">${escapeHtml(a.label)} · ${formatDateTime(a.waktu)} ${a.catatan ? '· ' + escapeHtml(a.catatan) : ''}</div>`).join('') || '<div class="hint-text">Belum ada tindakan.</div>'}
    <h3 class="mt-2">Ringkasan jawaban</h3><div class="table-wrap"><table><thead><tr><th>Soal</th><th>Skor</th><th>Durasi</th></tr></thead><tbody>${jaw.map(r => `<tr><td>${r.question_id}</td><td>${r.skor ?? '—'}</td><td>${formatDurasi(r.durasi || 0)}</td></tr>`).join('')}</tbody></table></div>
    <div class="row mt-2"><button class="btn btn-primary" id="closeDrawer">Tutup</button></div></div>`;
  const host = document.getElementById('modalRoot') || document.getElementById('teacherModalRoot');
  host.innerHTML = body;
  host.querySelectorAll('[data-drawer-close]').forEach(el => el.onclick = () => { host.innerHTML = ''; });
  host.querySelector('#closeDrawer').onclick = () => { host.innerHTML = ''; };
  host.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    const type = b.dataset.act, alert = list.find(a => a.id === b.dataset.id);
    if (type === 'lihat_jawaban') {
      const r = jaw.find(x => x.question_id === alert?.question_id);
      openModal('Jawaban ' + (alert?.question_id || ''), r ? `<pre style="font-size:.8rem">${escapeHtml(JSON.stringify({ jawaban: r.jawaban, skor: r.skor, kunci: r.jawaban_benar, rincian: r.rincian }, null, 2))}</pre>` : '<p class="muted">Jawaban belum tersedia.</p>', { root: 'teacherModalRoot', wide: true });
      return;
    }
    if (type === 'lihat_proses') {
      const r = jaw.find(x => x.question_id === alert?.question_id);
      const bukti = (store.anomalies || []).filter(x => x.student_id === sid && x.question_id === alert?.question_id);
      openModal('Proses ' + (alert?.question_id || ''), `<pre style="font-size:.8rem">${escapeHtml(JSON.stringify({ jurnal: r?.jurnal || {}, telemetri: r?.telemetri || {}, buktiProses: bukti }, null, 2))}</pre>`, { root: 'teacherModalRoot', wide: true });
      return;
    }
    if (type === 'peringatan' || type === 'penjelasan') {
      openModal(type === 'peringatan' ? 'Berikan peringatan' : 'Minta penjelasan siswa', `<p class="notice warn">Pesan akan muncul di layar siswa tanpa menyebut tuduhan. Gunakan bahasa yang membangun.</p>
        ${field('Catatan untuk siswa', `<textarea id="actCatatan" rows="3" placeholder="Contoh: Tunjukkan kembali langkah substitusimu…"></textarea>`)}
        <button class="btn btn-primary" id="actSend">Kirim</button>`, { root: 'teacherModalRoot', onMount: modal => {
          modal.querySelector('#actSend').onclick = async () => {
            const catatan = modal.querySelector('#actCatatan').value.trim();
            if (catatan.length < 5) { toast('Catatan minimal 5 karakter.', 'bad'); return; }
            const res = await teacherAction({ alert_id: alert.id, type, catatan, guru: 'Guru XI' });
            const sync = await processQueue({ manual: true });
            closeModal('teacherModalRoot'); toast(res.warning ? `Pesan terkirim ke siswa. ${sync.message}` : `Tindakan tercatat. ${sync.message}`, sync.ok ? 'ok' : 'bad'); pageMonitoring();
          };
        } });
      return;
    }
    await teacherAction({ alert_id: alert.id, type, catatan: '', guru: 'Guru XI' });
    const sync = await processQueue({ manual: true });
    toast(`Tindakan tercatat. ${sync.message}`, sync.ok ? 'ok' : 'bad'); host.innerHTML = ''; pageMonitoring();
  });
}
function nameFrom(sid) { return data?.siswa?.find(s => s.student_id === sid)?.nama || sid; }
function classFrom(sid) { return data?.siswa?.find(s => s.student_id === sid)?.kelas || '—'; }

async function showEssayGrading(responseId) {
  const e = await get('essayResponses', responseId);
  if (!e) return;
  const steps = e.steps || [];
  openModal('Menilai uraian — ' + e.item_id, `<p class="muted">Nilai setiap langkah 0 atau 1. Catatan guru akan tampil pada sinkronisasi.</p>
    ${steps.map((s, i) => `<div class="log-row"><b>${i + 1}. ${escapeHtml(s.label)}</b><br><span>${escapeHtml(s.jawaban || '—')}</span><br>
      <span class="hint-text">Validasi awal: ${escapeHtml(s.validation)}</span>
      <div class="row"><select class="input" data-score="${i}" style="max-width:90px"><option value="0" ${s.teacherScore === 0 ? 'selected' : ''}>0</option><option value="1" ${s.teacherScore === 1 ? 'selected' : ''}>1</option></select>
      <input class="input" data-note="${i}" value="${escapeHtml(s.teacherNote || '')}" placeholder="Catatan singkat"></div></div>`).join('')}
    <button class="btn btn-primary mt-2" id="saveEssayGrade">Simpan penilaian</button>`,
    { root: 'teacherModalRoot', wide: true, onMount: modal => {
      modal.querySelector('#saveEssayGrade').onclick = async () => {
        e.steps = steps.map((s, i) => ({ ...s, teacherScore: Number(modal.querySelector(`[data-score="${i}"]`).value), teacherNote: modal.querySelector(`[data-note="${i}"]`).value.trim() }));
        e.graded_at = new Date().toISOString(); e.graded_by = 'guru';
        await put('essayResponses', e);
        await enqueue('URAIAN_TERPANDU', e, `uraian:nilai:${e.response_id}`);
        await processQueue({ manual: true });
        closeModal('teacherModalRoot'); toast('Penilaian uraian tersimpan dan dikirim.', 'ok'); pageMonitoring();
      };
    } });
}

async function showNotebookReview(id) {
  const n = await get('notebook', id);
  if (!n) return;
  openModal('Periksa latihan buku — ' + n.item_id, `<p><b>Refleksi siswa:</b> ${escapeHtml(n.refleksi || '—')}</p>
    <p class="hint-text">Instruksi tercentang: ${(n.instruksi_centang || []).filter(Boolean).length}/7</p>
    ${n.foto ? `<div class="notice">Foto dilampirkan (hanya jika diminta guru): ${escapeHtml(n.foto.name || '')}</div>` : '<p class="hint-text">Tidak ada foto.</p>'}
    <div class="grid cols-2">${field('Nilai manual (0–100)', `<input type="number" id="nbNilai" min="0" max="100" value="${n.nilai_guru ?? 0}">`)}
      ${field('Status', `<select id="nbStatus"><option value="selesai" ${n.status_guru === 'selesai' ? 'selected' : ''}>Selesai</option><option value="perlu_perbaikan" ${n.status_guru === 'perlu_perbaikan' ? 'selected' : ''}>Perlu perbaikan</option></select>`)}</div>
    ${field('Komentar guru', `<textarea id="nbKomentar" rows="3">${escapeHtml(n.komentar_guru || '')}</textarea>`)}
    <button class="btn btn-primary mt-2" id="saveNb">Simpan pemeriksaan</button>`,
    { root: 'teacherModalRoot', onMount: modal => {
      modal.querySelector('#saveNb').onclick = async () => {
        n.nilai_guru = Number(modal.querySelector('#nbNilai').value);
        n.status_guru = modal.querySelector('#nbStatus').value;
        n.komentar_guru = modal.querySelector('#nbKomentar').value.trim();
        n.diperiksa_guru = true; n.waktu_pemeriksaan = new Date().toISOString();
        await put('notebook', n);
        await enqueue('LATIHAN_BUKU', n, `nb:nilai:${n.id}`);
        await processQueue({ manual: true });
        closeModal('teacherModalRoot'); toast('Pemeriksaan latihan buku tersimpan.', 'ok'); pageMonitoring();
      };
    } });
}

function pageRingkasan() {
  const s = stats;
  const colors = ['#dc4c5c', '#e58a21', '#ffd166', '#20c7b7', '#22a06b'];
  view.innerHTML = `<div class="reader"><div class="welcome"><span class="pill">Analisis ketuntasan kelas</span><h2 class="mt-1">Ringkasan Kelas</h2>
    <p>${s.jumlahSiswa} siswa terdaftar · ${s.jumlahSesi} sesi asesmen tercatat</p></div>
    <div class="grid cols-4 mt-2">${kpi('Rata-rata kelas', s.rata)}${kpi('Nilai tertinggi', s.tertinggi)}${kpi('Nilai terendah', s.terendah)}${kpi('Persentase tuntas', s.ketuntasan + '%')}</div>
    <div class="grid cols-2 mt-2"><div class="card"><h3>Distribusi nilai</h3>
      ${s.distribusi.map((n, i) => `<div class="competency"><span style="width:100px">${['<50', '50–64', '65–74', '75–89', '≥90'][i]}</span><span class="bar"><i style="width:${s.students.length ? n / s.students.length * 100 : 0}%;background:${colors[i]}"></i></span><b>${n}</b></div>`).join('')}</div>
      <div class="card"><h3>Soal dengan kesalahan tertinggi</h3><div class="table-wrap"><table><thead><tr><th>ID</th><th>Materi</th><th>Rata</th><th>Salah</th></tr></thead><tbody>
        ${s.soalTersulit.map(q => `<tr><td>${q.id}</td><td>${q.materi}</td><td>${q.rata}</td><td>${q.salah}/${q.n}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Belum ada jawaban.</td></tr>'}</tbody></table></div></div></div>
    <div class="card mt-2"><h3>Capaian indikator</h3>${s.indikator.map(i => `<div class="competency"><span style="width:300px">${escapeHtml(i.indikator)}</span><span class="bar"><i style="width:${i.rata}%"></i></span><b>${i.rata}</b><span class="tag ${i.tuntas ? 'ok' : 'bad'}">${i.tuntas ? 'Tuntas' : 'Perlu pendampingan'}</span></div>`).join('') || '<p class="muted">Belum ada data indikator.</p>'}</div>
    <div class="card mt-2"><h3>Siswa membutuhkan pendampingan</h3>${s.butuhPendampingan.length ? `<div class="grid cols-3">${s.butuhPendampingan.map(st => `<div class="notice warn"><b>${escapeHtml(st.nama)}</b><br>Nilai ${st.nilai} · proses ${st.proses} · refleksi ${st.refleksi}</div>`).join('')}</div>` : '<div class="notice ok">Tidak ada siswa di bawah ambang batas.</div>'}</div></div>`;
}

function pageSiswa() {
  view.innerHTML = `<div class="reader"><span class="pill">${stats.students.length} siswa</span><h2 class="mt-1">Data Siswa &amp; Progres</h2>
    <div class="table-wrap"><table><thead><tr><th>Nama</th><th>NISN</th><th>Kelas</th><th>Program</th><th>Nilai</th><th>Soal</th><th>Proses</th><th>Refleksi</th><th>Verifikasi</th><th></th></tr></thead><tbody>
    ${stats.students.map(s => `<tr><td><b>${escapeHtml(s.nama)}</b></td><td>${escapeHtml(s.nisn)}</td><td>${escapeHtml(s.kelas)}</td><td>${escapeHtml(s.program_keahlian)}</td>
      <td><span class="tag ${s.nilai >= 75 ? 'ok' : 'bad'}">${s.nilai}</span></td><td>${s.selesai}</td><td>${s.proses}</td><td>${s.refleksi}</td><td>${s.verifikasi_benar}/${s.verifikasi}</td>
      <td><button class="btn btn-ghost btn-sm" data-detail="${escapeHtml(s.student_id)}">Detail</button></td></tr>`).join('') || '<tr><td colspan="10" class="muted">Belum ada siswa.</td></tr>'}</tbody></table></div></div>`;
  view.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => {
    const s = stats.students.find(x => x.student_id === b.dataset.detail);
    const jaw = (data.jawaban || []).filter(r => r.student_id === s.student_id);
    const pro = (data.proses || []).filter(r => r.student_id === s.student_id);
    openModal('Detail ' + s.nama, `<div class="grid cols-2">
      <div><h3>Profil</h3><p>NISN: ${escapeHtml(s.nisn)}<br>Kelas: ${escapeHtml(s.kelas)}<br>Program: ${escapeHtml(s.program_keahlian)}<br>Sekolah: ${escapeHtml(s.sekolah)}<br>ID: ${s.student_id}</p></div>
      <div><h3>Ringkasan</h3><p>Nilai: ${s.nilai} (${s.grade})<br>Soal selesai: ${s.selesai}<br>Jurnal proses: ${pro.length}<br>Refleksi: ${s.refleksi}<br>Verifikasi benar: ${s.verifikasi_benar}/${s.verifikasi}</p></div></div>
      <h3>Jawaban</h3><div class="table-wrap"><table><thead><tr><th>Soal</th><th>Jawaban</th><th>Skor</th><th>Durasi</th></tr></thead><tbody>
      ${jaw.map(r => `<tr><td>${r.question_id}</td><td>${escapeHtml(JSON.stringify(r.jawaban))}</td><td>${r.skor}</td><td>${formatDurasi(r.durasi)}</td></tr>`).join('') || '<tr><td colspan="4">Belum ada jawaban.</td></tr>'}</tbody></table></div>`,
      { root: 'teacherModalRoot', wide: true });
  });
}

function pageNilai() {
  view.innerHTML = `<div class="reader"><span class="pill">Nilai per modul</span><h2 class="mt-1">Nilai &amp; Modul</h2>
    <div class="table-wrap"><table><thead><tr><th>Siswa</th><th>Aritmetika</th><th>Geometri</th><th>Lingkaran</th><th>Akhir</th><th>Status</th></tr></thead><tbody>
    ${stats.students.filter(s => s.selesai).map(s => `<tr><td>${escapeHtml(s.nama)}</td>
      ${['aritmetika', 'geometri', 'lingkaran'].map(m => `<td>${s.rataModul[m] ?? '—'}</td>`).join('')}
      <td><b>${s.nilai}</b></td><td><span class="tag ${s.nilai >= 75 ? 'ok' : 'bad'}">${s.grade}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Belum ada nilai.</td></tr>'}</tbody></table></div></div>`;
}

function pageJawaban() {
  const jaw = [...(data.jawaban || [])].sort((a, b) => String(b.waktu_selesai || '').localeCompare(String(a.waktu_selesai || '')));
  const filterSiswa = view.dataset.filterSiswa || '';
  view.innerHTML = `<div class="reader"><span class="pill">${jaw.length} jawaban</span><h2 class="mt-1">Jawaban Siswa</h2>
    <div class="row mb-2"><select id="filterSiswa" class="input" style="max-width:260px"><option value="">Semua siswa</option>
      ${stats.students.map(s => `<option value="${escapeHtml(s.student_id)}" ${filterSiswa === s.student_id ? 'selected' : ''}>${escapeHtml(s.nama)}</option>`).join('')}</select>
      <input id="filterSoal" class="input" placeholder="Cari ID soal…" style="max-width:180px"></div>
    <div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Siswa</th><th>Soal</th><th>Jawaban</th><th>Benar</th><th>Skor</th><th>Durasi</th><th>Seed</th><th></th></tr></thead><tbody id="jawRows"></tbody></table></div></div>`;
  const renderRows = () => {
    const fS = view.querySelector('#filterSiswa').value, fQ = view.querySelector('#filterSoal').value.toLowerCase();
    view.dataset.filterSiswa = fS;
    const list = jaw.filter(r => (!fS || r.student_id === fS) && (!fQ || r.question_id.toLowerCase().includes(fQ)));
    view.querySelector('#jawRows').innerHTML = list.map(r => `<tr><td>${formatDateTime(r.waktu_selesai)}</td><td>${escapeHtml(r.nama || r.student_id)}</td>
      <td>${r.question_id} <span class="tag">${r.level || ''}</span></td><td>${escapeHtml(JSON.stringify(r.jawaban))}</td><td>${r.benar ? '✅' : '❌'}</td><td>${r.skor}</td><td>${formatDurasi(r.durasi)}</td>
      <td><span class="tag teal">${String(r.seed || '').slice(0, 16)}</span></td><td><button class="btn btn-ghost btn-sm" data-detail="${escapeHtml(r.response_id)}">Lihat</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">Tidak ada data sesuai filter.</td></tr>';
    view.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => {
      const r = jaw.find(x => x.response_id === b.dataset.detail);
      const q = QUESTIONS.find(x => x.id === r.question_id);
      openModal(`Jawaban ${r.question_id}`, `<div class="grid cols-2"><div><h3>Jawaban</h3>
        <p><b>Pilihan siswa:</b> ${escapeHtml(JSON.stringify(r.jawaban))}<br><b>Kunci:</b> ${escapeHtml(String(r.jawaban_benar))}<br><b>Skor:</b> ${r.skor}<br><b>Status:</b> ${statusChip(r.status || 'selesai')}</p>
        <p><b>Parameter soal siswa:</b><br>${escapeHtml(JSON.stringify(r.parameter || {}, null, 2))}</p></div>
        <div><h3>Rincian nilai</h3><pre style="font-size:.8rem">${escapeHtml(JSON.stringify(r.rincian || {}, null, 2))}</pre></div></div>
        <h3>Pembahasan (bank soal)</h3><div class="notice">${q ? escapeHtml(q.pembahasan(r.parameter || {})) : 'Soal tidak ditemukan.'}</div>
        <h3 class="mt-2">Jurnal proses</h3><div class="card" style="box-shadow:none">${r.jurnal ? Object.entries(r.jurnal).map(([k, v]) => `<p><b>${k}:</b> ${escapeHtml(v)}</p>`).join('') : '<p class="muted">Tidak diwajibkan pada soal ini.</p>'}</div>
        <h3 class="mt-2">Telemetri transparan</h3><pre style="font-size:.78rem">${escapeHtml(JSON.stringify(r.telemetri || {}, null, 2))}</pre>`,
        { root: 'teacherModalRoot', wide: true });
    });
  };
  view.querySelector('#filterSiswa').onchange = renderRows;
  view.querySelector('#filterSoal').oninput = renderRows;
  renderRows();
}

function pageProses() {
  const proses = data.proses || [], refl = data.refleksi || [], ver = data.verifikasi || [];
  view.innerHTML = `<div class="reader"><span class="pill">Proses berpikir siswa</span><h2 class="mt-1">Proses &amp; Refleksi</h2>
    <div class="notice">Data ini untuk ditinjau, bukan vonis otomatis penggunaan AI. Perhatikan durasi, perubahan jawaban, urutan, dan penggunaan petunjuk secara bersamaan.</div>
    <div class="table-wrap mt-2"><table><thead><tr><th>Siswa</th><th>Soal</th><th>Diketahui</th><th>Konsep</th><th>Strategi</th><th>Perhitungan</th><th>Interpretasi</th><th>Petunjuk</th></tr></thead><tbody>
    ${proses.map(p => `<tr><td>${escapeHtml(p.nama || p.student_id)}</td><td>${p.question_id}</td><td>${escapeHtml(p.informasi_diketahui || '')}</td><td>${escapeHtml(p.konsep || '')}</td>
      <td>${escapeHtml(p.strategi || '')}</td><td>${escapeHtml(p.perhitungan || '')}</td><td>${escapeHtml(p.interpretasi || '')}</td><td>${p.telemetri?.hints || 0}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Belum ada jurnal proses.</td></tr>'}</tbody></table></div>
    <div class="grid cols-2 mt-2"><div class="card"><h3>Refleksi siswa</h3><div class="mini-list">${refl.map(r => `<li><b>${escapeHtml(r.question_id || r.jenis || '')}:</b> ${escapeHtml(r.teks || JSON.stringify(r))}</li>`).join('') || '<li>Belum ada refleksi.</li>'}</div></div>
      <div class="card"><h3>Verifikasi pemahaman</h3><div class="table-wrap"><table><thead><tr><th>Siswa</th><th>Konsep</th><th>Jawaban</th><th>Hasil</th></tr></thead><tbody>
      ${ver.map(v => `<tr><td>${escapeHtml(v.student_id)}</td><td>${escapeHtml(v.konsep || v.question_id)}</td><td>${escapeHtml(v.jawaban)}</td><td>${v.benar ? '✅' : '❌'}</td></tr>`).join('') || '<tr><td colspan="4">Belum ada verifikasi.</td></tr>'}</tbody></table></div></div></div></div>`;
}

function pageUmpan() {
  const umpan = data.umpan || [], approvals = (data.approvals || []).filter(a => a.status !== 'disetujui' && a.status !== 'ditolak');
  view.innerHTML = `<div class="reader"><span class="pill">Interaksi guru–siswa</span><h2 class="mt-1">Umpan Balik &amp; Persetujuan</h2>
    <div class="card"><h3>Berikan umpan balik</h3><div class="grid cols-2">
      ${field('Siswa', `<select id="fbSiswa">${stats.students.map(s => `<option value="${escapeHtml(s.student_id)}">${escapeHtml(s.nama)}</option>`).join('')}</select>`)}
      ${field('ID soal / topik (opsional)', '<input id="fbTopik" placeholder="Contoh: A05 atau Lingkaran">')}</div>
      ${field('Komentar untuk siswa', '<textarea id="fbTeks" rows="3" placeholder="Tulis umpan balik spesifik dan actionable…"></textarea>')}
      <label class="row"><input type="checkbox" id="fbRemedial"> Tandai perlu remedial</label>
      <button class="btn btn-primary mt-2" id="fbSend">Kirim umpan balik</button></div>
    <div class="card mt-2"><h3>Permintaan perubahan identitas</h3>
      ${approvals.length ? approvals.map(a => `<div class="notice warn mb-1"><b>${escapeHtml(a.student_id)}</b> · ${escapeHtml(a.alasan || '')}
        <br>Perubahan: ${escapeHtml(JSON.stringify(a.changes || {}))}
        <div class="row mt-1"><button class="btn btn-primary btn-sm" data-approve="${escapeHtml(a.id)}">Setujui</button><button class="btn btn-ghost btn-sm" data-reject="${escapeHtml(a.id)}">Tolak</button></div></div>`).join('') : '<p class="muted">Tidak ada permintaan menunggu.</p>'}</div>
    <div class="card mt-2"><h3>Umpan balik terkirim</h3><div class="mini-list">${umpan.map(u => `<li><b>${escapeHtml(u.student_id)}</b> · ${escapeHtml(u.komentar || u.teks || '')} ${u.remedial ? '<span class="tag bad">remedial</span>' : ''}</li>`).join('') || '<li>Belum ada umpan balik.</li>'}</div></div></div>`;
  view.querySelector('#fbSend').onclick = async () => {
    const item = {
      id: `FB-${Date.now().toString(36).toUpperCase()}`, student_id: view.querySelector('#fbSiswa').value,
      topik: view.querySelector('#fbTopik').value.trim(), komentar: view.querySelector('#fbTeks').value.trim(),
      remedial: view.querySelector('#fbRemedial').checked, guru: 'guru', waktu: new Date().toISOString()
    };
    if (item.komentar.length < 5) { toast('Komentar minimal 5 karakter.', 'bad'); return; }
    await enqueue('UMPAN_BALIK_GURU', item, `fb:${item.id}`);
    await processQueue({ manual: true }); toast('Umpan balik masuk antrean pengiriman.', 'ok');
  };
  view.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => confirmDialog('Setujui perubahan identitas siswa ini?', async () => {
    const a = approvals.find(x => x.id === b.dataset.approve);
    await enqueue('SET_CONFIG', { key: a.kunci || `PERMINTAAN_UBAH_IDENTITAS:${a.id}`, approval: { ...a, status: 'disetujui', approved_by: 'guru', decided_at: new Date().toISOString() } }, `approval:${a.id}:setujui`);
    await processQueue({ manual: true }); toast('Persetujuan dikirim. Siswa akan menerima saat sinkronisasi.', 'ok');
  }));
  view.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => confirmDialog('Tolak permintaan ini?', async () => {
    const a = approvals.find(x => x.id === b.dataset.reject);
    await enqueue('SET_CONFIG', { key: a.kunci || `PERMINTAAN_UBAH_IDENTITAS:${a.id}`, approval: { ...a, status: 'ditolak', approved_by: 'guru', decided_at: new Date().toISOString() } }, `approval:${a.id}:tolak`);
    await processQueue({ manual: true }); toast('Penolakan dikirim.', 'ok');
  }));
}

async function pagePengaturan() {
  const [cfg, weights, feat, tcfg, acfg, fcfg, rcfg, ncfg, pinAktif] = await Promise.all([
    getSyncConfig(), getConfig('weights'), getConfig('features'), getTimingConfig(),
    getAnomalyConfig(), getFlowConfig(), getConfig('realtime'), getConfig('notebook'), hasPin()
  ]);
  const opt = (values, selected) => values.map(v => `<option value="${v}" ${Number(selected) === Number(v) ? 'selected' : ''}>${v} detik</option>`).join('');
  const kirim = async (key, payload, pesan) => {
    const item = { id: `CFG-${Date.now().toString(36).toUpperCase()}-${key}`, key, ...payload, waktu: new Date().toISOString() };
    await enqueue('SET_CONFIG', item, `cfg:${item.id}`);
    const res = await processQueue({ manual: true });
    toast(res.ok ? pesan : `${pesan} (tersimpan lokal, menunggu sinkronisasi)`, 'ok');
  };
  const parseObj = (text, label) => {
    if (!text.trim()) return {};
    const val = JSON.parse(text);
    if (!val || typeof val !== 'object' || Array.isArray(val)) throw new Error(label + ' harus berupa objek JSON.');
    return val;
  };

  view.innerHTML = `<div class="reader"><span class="pill">Pengaturan guru</span><h2 class="mt-1">Koneksi &amp; Aturan Pembelajaran</h2>
    <div class="card mb-2"><div class="grid cols-2">${field('URL Web App', `<input id="gUrl" value="${escapeHtml(cfg.url)}">`)}
      ${field('Kode sinkronisasi', `<input id="gToken" type="password" value="${escapeHtml(cfg.token)}">`)}</div>
      <button class="btn btn-primary" id="gSave">Simpan koneksi</button></div>

    <div class="card mb-2"><h3>Bobot penilaian</h3>
      <div class="grid cols-4">${['jawaban', 'proses', 'interpretasi', 'refleksi'].map(k => field(k, `<input type="number" min="0" max="100" id="w_${k}" value="${weights[k]}">`)).join('')}</div>
      <label class="row"><input type="checkbox" id="wVerify" ${feat.verificationEnabled ? 'checked' : ''}> Aktifkan verifikasi pemahaman setelah asesmen</label>
      <button class="btn btn-primary mt-2" id="wSave">Kirim bobot &amp; pengaturan</button></div>

    <div class="card mb-2"><h3>Waktu pengerjaan &amp; kunci otomatis</h3>
      <p class="muted">Batas hanya boleh 30 detik, 1, 2, 3, 4, atau 5 menit per soal. Timer dimulai saat soal tampil dan siap dikerjakan.</p>
      <div class="grid cols-3">${field('Batas default per soal', `<select id="tDefault">${opt(ALLOWED_SECONDS, tcfg.defaultSec)}</select>`)}
        ${field('Total waktu asesmen (detik)', `<input type="number" id="tOverall" min="60" max="7200" step="60" value="${tcfg.overallSec}">`)}
        ${field('Ambang tidak aktif (detik)', `<input type="number" id="tIdle" min="5" max="120" value="${tcfg.idleThresholdSec}">`)}</div>
      <label class="row"><input type="checkbox" id="tAutoLock" ${tcfg.autoLock ? 'checked' : ''}> Kunci pengiriman otomatis bila total waktu habis</label>
      <h4 class="mt-2">Batas per soal</h4>
      <div class="grid cols-4">${QUESTIONS.map(q => field(q.id, `<select data-waktu="${q.id}">${opt(ALLOWED_SECONDS, tcfg.perQuestion?.[q.id] || tcfg.defaultSec)}</select>`)).join('')}</div>
      <button class="btn btn-primary mt-2" id="tSave">Simpan &amp; kirim pengaturan waktu</button></div>

    <div class="card mb-2"><h3>Ambang indikator proses (nasihat, bukan vonis)</h3>
      <div class="grid cols-4">${Object.entries(acfg.weights).map(([k, v]) => field(`Bobot ${k}`, `<input type="number" min="0" max="10" data-bobot="${k}" value="${v}">`)).join('')}</div>
      <div class="grid cols-3 mt-1">${field('Perlu diperhatikan', `<input type="number" min="1" max="20" id="aPerhatian" value="${acfg.thresholds.perluPerhatian}">`)}
        ${field('Anomali tinggi', `<input type="number" min="2" max="30" id="aTinggi" value="${acfg.thresholds.anomaliTinggi}">`)}
        ${field('Waktu wajar single (dtk)', `<input type="number" min="5" id="aSingle" value="${acfg.reasonableByType.single}">`)}</div>
      <div class="grid cols-3">${field('Waktu wajar multiple (dtk)', `<input type="number" min="5" id="aMultiple" value="${acfg.reasonableByType.multiple}">`)}
        ${field('Waktu wajar completion (dtk)', `<input type="number" min="5" id="aCompletion" value="${acfg.reasonableByType.completion}">`)}
        ${field('Uji coba kelas per soal (JSON)', `<textarea id="aTrial" rows="2">${escapeHtml(JSON.stringify(acfg.classTrial || {}))}</textarea>`)}</div>
      ${field('Waktu wajar khusus per soal (JSON)', `<textarea id="aPerSoal" rows="2">${escapeHtml(JSON.stringify(acfg.reasonableByQuestion || {}))}</textarea>`)}
      <button class="btn btn-primary mt-2" id="aSave">Simpan &amp; kirim ambang</button></div>

    <div class="card mb-2"><h3>Alur belajar (tahap wajib)</h3>
      <p class="muted">Tahap wajib harus selesai sebelum siswa masuk asesmen. Tahap opsional tetap dapat dikerjakan kapan saja.</p>
      <div class="grid cols-2">${fcfg.stages.map((s, i) => `<label class="row"><input type="checkbox" data-stage="${i}" ${s.required ? 'checked' : ''}> ${escapeHtml(s.label)}</label>`).join('')}</div>
      <button class="btn btn-primary mt-2" id="fSave">Simpan &amp; kirim alur belajar</button></div>

    <div class="card mb-2"><h3>Pemantauan satu LAN</h3>
      <div class="grid cols-2">${field('Alamat bus lokal', `<input id="rUrl" value="${escapeHtml(rcfg.lanUrl)}" placeholder="http://192.168.1.10:8765">`)}
        ${field('Jeda polling (detik, minimal 3)', `<input type="number" id="rPoll" min="3" max="120" value="${rcfg.pollSec}">`)}</div>
      <label class="row"><input type="checkbox" id="rEnabled" ${rcfg.enabled ? 'checked' : ''}> Aktifkan polling realtime satu LAN</label>
      <button class="btn btn-primary mt-2" id="rSave">Simpan &amp; kirim pengaturan realtime</button></div>

    <div class="card mb-2"><h3>Latihan buku tulis</h3>
      <label class="row"><input type="checkbox" id="nFoto" ${ncfg.fotoDiminta ? 'checked' : ''}> Izinkan siswa mengunggah foto hasil tulisan (opsional)</label>
      ${field('Catatan guru', `<textarea id="nCatatan" rows="2">${escapeHtml(ncfg.catatanGuru || '')}</textarea>`)}
      <button class="btn btn-primary mt-2" id="nSave">Simpan &amp; kirim pengaturan buku tulis</button></div>

    <div class="card"><h3>Data lokal &amp; cadangan</h3><p class="muted">Jika guru belum terhubung internet, siswa dapat mengekspor cadangan JSON dari menu Pengaturan, lalu impor di sini.</p>
      <div class="row"><label class="btn btn-ghost">⬆ Impor cadangan siswa<input type="file" id="imp" accept="application/json" hidden></label>
      <button class="btn btn-ghost" id="downloadCache">⬇ Unduh data dashboard (JSON)</button></div></div>

    <div class="card"><h3>🔒 PIN guru</h3>
      <p class="muted">PIN mengunci dashboard di perangkat ini. Disimpan sebagai hash di IndexedDB, tidak dikirim ke Google Sheets. Status: <b id="pinStatus">${pinAktif ? 'PIN aktif' : 'Belum ada PIN'}</b>.</p>
      <div class="grid cols-2">
        ${field('PIN baru (4–8 digit)', '<input id="pinBaru" type="password" inputmode="numeric" maxlength="8" placeholder="••••">')}
        ${field('Ulangi PIN', '<input id="pinUlang" type="password" inputmode="numeric" maxlength="8" placeholder="••••">')}
      </div>
      <div class="row mt-2"><button class="btn btn-primary" id="pinSave">Simpan PIN</button>
        <button class="btn btn-ghost" id="pinHapus">Hapus PIN</button></div>
      <p class="hint-text">Lupa PIN? Klik "Lupa PIN?" pada layar kunci, lalu masukkan kode sinkronisasi guru.</p></div></div>`;

  view.querySelector('#gSave').onclick = async () => { await setSyncConfig({ url: view.querySelector('#gUrl').value.trim(), token: view.querySelector('#gToken').value.trim() }); toast('Koneksi disimpan.', 'ok'); };
  view.querySelector('#wSave').onclick = async () => {
    const w = Object.fromEntries(['jawaban', 'proses', 'interpretasi', 'refleksi'].map(k => [k, Number(view.querySelector('#w_' + k).value)]));
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    if (total !== 100) { toast('Total bobot harus 100 (sekarang ' + total + ').', 'bad'); return; }
    await setConfig('weights', { ...w, key: 'weights' });
    await kirim('PENILAIAN', { weights: w, verificationEnabled: view.querySelector('#wVerify').checked }, 'Konfigurasi penilaian dikirim.');
  };
  view.querySelector('#tSave').onclick = async () => {
    const perQuestion = Object.fromEntries(QUESTIONS.map(q => [q.id, Number(view.querySelector(`[data-waktu="${q.id}"]`).value)]));
    const next = await setTimingConfig({
      defaultSec: Number(view.querySelector('#tDefault').value), overallSec: Number(view.querySelector('#tOverall').value),
      idleThresholdSec: Number(view.querySelector('#tIdle').value), autoLock: view.querySelector('#tAutoLock').checked,
      perQuestion, teacherControlled: true
    });
    await kirim('WAKTU_SOAL', { timing: next }, 'Pengaturan waktu dikirim.');
  };
  view.querySelector('#aSave').onclick = async () => {
    try {
      const weights = Object.fromEntries(Object.keys(acfg.weights).map(k => [k, Number(view.querySelector(`[data-bobot="${k}"]`).value)]));
      const classTrial = parseObj(view.querySelector('#aTrial').value, 'Uji coba kelas');
      const reasonableByQuestion = parseObj(view.querySelector('#aPerSoal').value, 'Waktu wajar per soal');
      const next = await setAnomalyConfig({
        weights, classTrial, reasonableByQuestion, teacherControlled: true,
        thresholds: { perluPerhatian: Number(view.querySelector('#aPerhatian').value), anomaliTinggi: Number(view.querySelector('#aTinggi').value) },
        reasonableByType: {
          single: Number(view.querySelector('#aSingle').value), multiple: Number(view.querySelector('#aMultiple').value),
          completion: Number(view.querySelector('#aCompletion').value)
        }
      });
      await kirim('AMBANG_ANOMALI', { anomaly: next }, 'Ambang indikator dikirim.');
    } catch (err) { toast('Data JSON tidak valid: ' + err.message, 'bad'); }
  };
  view.querySelector('#fSave').onclick = async () => {
    const stages = fcfg.stages.map((s, i) => ({ ...s, required: view.querySelector(`[data-stage="${i}"]`).checked }));
    await setFlowConfig(stages);
    await kirim('ALUR_BELAJAR', { flow: await getFlowConfig() }, 'Alur belajar dikirim.');
  };
  view.querySelector('#rSave').onclick = async () => {
    await setRealtimeConfig({
      lanUrl: view.querySelector('#rUrl').value.trim(), pollSec: Number(view.querySelector('#rPoll').value),
      enabled: view.querySelector('#rEnabled').checked
    });
    await kirim('REALTIME', { realtime: await getConfig('realtime') }, 'Pengaturan realtime dikirim.');
  };
  view.querySelector('#nSave').onclick = async () => {
    await setConfig('notebook', {
      ...ncfg, fotoDiminta: view.querySelector('#nFoto').checked,
      catatanGuru: view.querySelector('#nCatatan').value.trim(), teacherControlled: true
    });
    await kirim('BUKU_TULIS', { notebook: await getConfig('notebook') }, 'Pengaturan buku tulis dikirim.');
  };
  view.querySelector('#imp').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      await importBackup(await file.text());
      const local = {
        ok: true, siswa: await getAll('identity'), sesi: await getAll('sessions'),
        jawaban: await getAll('responses'), proses: await getAll('processes'),
        refleksi: await getAll('reflections'), verifikasi: [], umpan: await getAll('feedback'), approvals: []
      };
      data = local; stats = classAnalytics(data);
      toast('Cadangan diimpor. Data siswa tersedia offline di dashboard.', 'ok');
      await route();
    } catch (err) { toast('Gagal impor: ' + err.message, 'bad'); }
  };
  view.querySelector('#downloadCache').onclick = () => downloadFile('dashboard-labmat.json', JSON.stringify(data || {}, null, 2), 'application/json');
  view.querySelector('#pinSave').onclick = async () => {
    const a = view.querySelector('#pinBaru').value.trim();
    const b = view.querySelector('#pinUlang').value.trim();
    if (!/^\d{4,8}$/.test(a)) { toast('PIN harus 4–8 digit angka.', 'bad'); return; }
    if (a !== b) { toast('PIN dan ulangan tidak sama.', 'bad'); return; }
    await setPin(a);
    view.querySelector('#pinBaru').value = ''; view.querySelector('#pinUlang').value = '';
    view.querySelector('#pinStatus').textContent = 'PIN aktif';
    toast('PIN guru tersimpan.', 'ok');
  };
  view.querySelector('#pinHapus').onclick = async () => {
    await hapusPin();
    view.querySelector('#pinStatus').textContent = 'Belum ada PIN';
    toast('PIN dihapus. Layar kunci muncul lagi saat halaman dibuka ulang.', 'ok');
  };
}

boot();
