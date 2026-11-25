// Bootstrap aplikasi siswa — router halaman, identitas, progres, catatan, sertifikat, pengaturan.
import { openDB, seedDefaults, get, getAll, put, del, exportBackup, importBackup, getConfig, setConfig } from './database.js';
import { getIdentity, registerIdentity, requestIdentityChange, pendingChange, identityCardHTML } from './auth.js';
import { setHeader, refreshSyncIndicator, setSyncStatus, updateIdentityChip } from './ui.js';
import { renderModuleList, renderModule, mountVisualization } from './learning.js';
import { renderPracticeList, renderPractice } from './guided-practice.js';
import { renderEssayList, renderEssay } from './essay.js';
import { renderNotebookList, renderNotebook } from './notebook.js';
import { flowStatus, nextRequiredStage } from './flow.js';
import { generatePersonalFeedback } from './feedback.js';
import { startStudentPolling, markWarningRead, applyPulledRealtime } from './realtime.js';
import * as quiz from './quiz.js';
import { studentAnalytics } from './analytics.js';
import { renderExploration } from './challenges.js';
import { MODULES } from '../data/materials.js';
import { MASTERY_MIN } from '../data/rubrics.js';
import { processQueue, pull, queueSummary, getSyncConfig, setSyncConfig, startAutoSync, testConnection, enqueue } from './sync.js';
import { escapeHtml, openModal, closeModal, confirmDialog, toast, nowISO, uid, formatDateTime, formatDurasi, progressBar, downloadFile, field } from './utils.js';

const view = document.getElementById('view');
let identity = null;

const ROUTES = ['beranda', 'materi', 'latihan', 'uraian', 'asesmen', 'umpanbalik', 'bukutulis', 'alur', 'progres', 'eksporasi', 'catatan', 'sertifikat', 'pengaturan'];

async function boot() {
  try { await openDB(); await seedDefaults(); }
  catch (e) { view.innerHTML = `<div class="notice bad">Gagal membuka penyimpanan lokal: ${escapeHtml(e.message)}. Pastikan browser mengizinkan IndexedDB.</div>`; return; }
  identity = await getIdentity();
  if (!identity) { showRegistration(); return; }
  updateIdentityChip(identity);
  document.getElementById('identityChip').onclick = showIdentity;
  document.getElementById('syncChip').onclick = manualSync;
  document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  window.addEventListener('hashchange', route);
  startAutoSync(setSyncStatus);
  startStudentWarnings();
  await route();
  refreshSyncIndicator();
}

function startStudentWarnings() {
  if (!identity || window.__labmatWarningPoll) return;
  window.__labmatWarningPoll = startStudentPolling(identity.student_id, renderWarningBanner, 8, tampilkanNotifikasiCadangan);
}

/** Siswa diberi tahu saat guru mengambil salinan data lokal — tidak ada pengambilan diam-diam. */
function tampilkanNotifikasiCadangan(request, backup) {
  const data = backup?.data || {};
  const jumlah = Object.values(data).reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0);
  openModal('Data lokal diambil guru', `<div class="notice warn">Guru meminta salinan pekerjaanmu dari perangkat ini. Permintaan ini terlihat dan tercatat. Tidak ada kamera, screenshot tersembunyi, atau perekaman keyboard.</div>
    <p>Dikirim <b>${jumlah}</b> data dari <b>${Object.keys(data).length}</b> penyimpanan aplikasi pada ${escapeHtml(formatDateTime(nowISO()))}.</p>
    <p class="hint-text">ID permintaan: ${escapeHtml(request?.id || '')} · Tujuan: server lokal sekolah (bukan pihak ketiga).</p>
    <div class="row mt-2"><button class="btn btn-primary" data-close-modal>Mengerti</button></div>`);
  toast('Cadangan data lokalmu dikirim ke guru.', 'ok');
}

async function renderWarningBanner(list = []) {
  const host = document.getElementById('warningHost');
  if (!host) return;
  const aktif = list.filter(w => w.status !== 'dibaca' && !w.dibaca);
  if (!aktif.length) { host.innerHTML = ''; return; }
  host.innerHTML = aktif.slice(0, 3).map(w => `<div class="warning-card">
    <div><b>💬 ${escapeHtml(w.judul || 'Pesan dari guru')}</b><p>${escapeHtml(w.pesan || w.catatan_guru || '')}</p>
      <p class="hint-text">${escapeHtml(w.nama || '')} · NISN ${escapeHtml(w.nisn || '—')} · ${escapeHtml(w.kelas || '—')} · Soal ${escapeHtml(String(w.nomor_soal ?? w.question_id ?? '—'))} · ${escapeHtml(w.materi || '')} · ${formatDurasi(w.durasi)} · ${escapeHtml(w.tingkat || '')} · ${formatDateTime(w.waktu)}</p></div>
    <div class="row"><button class="btn btn-soft btn-sm" data-warn-detail="${w.id}">Lihat detail</button>
      <button class="btn btn-ghost btn-sm" data-warn-explain="${w.id}">Tulis penjelasan</button>
      <button class="icon-btn" data-warn-close="${w.id}" title="Tutup">×</button></div></div>`).join('');
  host.querySelectorAll('[data-warn-close]').forEach(b => b.onclick = async () => {
    await markWarningRead(b.dataset.warnClose); renderWarningBanner([]);
  });
  host.querySelectorAll('[data-warn-detail]').forEach(b => b.onclick = async () => {
    const { get } = await import('./database.js');
    const w = await get('warnings', b.dataset.warnDetail);
    const ind = (w?.indikator || []).map(i => typeof i === 'string' ? i : [i.kode, i.label].filter(Boolean).join(': ')).filter(Boolean).join('; ');
    const meta = [
      ['Nama siswa', w?.nama], ['NISN', w?.nisn], ['Kelas', w?.kelas],
      ['Nomor soal', w?.nomor_soal ?? w?.question_id], ['Materi', w?.materi],
      ['Durasi pengerjaan', formatDurasi(w?.durasi)], ['Indikator', ind],
      ['Tingkat', w?.tingkat], ['Waktu kejadian', formatDateTime(w?.waktu)]
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');
    openModal(w?.judul || 'Pesan guru', `<p>${escapeHtml(w?.pesan || '')}</p>${w?.catatan_guru ? `<div class="notice warn">Catatan guru: ${escapeHtml(w.catatan_guru)}</div>` : ''}
      <div class="card" style="box-shadow:none"><h3>Informasi kejadian</h3><div class="grid cols-2">${meta.map(([k, v]) => `<p><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}</p>`).join('')}</div></div>
      <div class="feedback">Pesan ini berkaitan dengan proses belajarmu. Kamu tidak dinyatakan melakukan pelanggaran; guru hanya ingin melihat langkah kerjamu.</div>
      <div class="row mt-2"><button class="btn btn-primary" data-close-modal>Tutup</button></div>`);
  });
  host.querySelectorAll('[data-warn-explain]').forEach(b => b.onclick = async () => {
    const { get, put } = await import('./database.js');
    const w = await get('warnings', b.dataset.warnDetail || b.dataset.warnExplain);
    openModal('Tulis penjelasanmu', `<p class="muted">Ceritakan langkah yang kamu lakukan pada soal ini dengan bahasamu sendiri.</p>
      <textarea class="input" id="studentExplanation" rows="5" placeholder="Saya mulai dengan …"></textarea>
      <button class="btn btn-primary mt-2" id="sendExplanation">Kirim penjelasan</button>`,
      { onMount: modal => {
        modal.querySelector('#sendExplanation').onclick = async () => {
          const teks = modal.querySelector('#studentExplanation').value.trim();
          if (teks.length < 10) { toast('Penjelasan minimal 10 karakter.', 'bad'); return; }
          if (w) await put('warnings', { ...w, penjelasan_siswa: teks, status: 'dijelaskan', dibaca: true });
          if (w?.alert_id) {
            const { get: g, put: p } = await import('./database.js');
            const alert = await g('alerts', w.alert_id);
            if (alert) await p('alerts', { ...alert, penjelasan_siswa: teks, status: 'dijelaskan' });
          }
          // Gunakan id baru agar baris penjelasan tidak menimpa baris peringatan di Sheets.
          const penjelasan = {
            id: uid('PNJ'), student_id: identity.student_id, alert_id: w?.alert_id || '',
            warning_id: w?.id || '', penjelasan_siswa: teks, op: 'PENJELASAN_SISWA', waktu: nowISO()
          };
          await enqueue('PERINGATAN', penjelasan, `penjelasan:${w?.id || Date.now()}`);
          closeModal(); toast('Penjelasanmu terkirim ke guru.', 'ok'); renderWarningBanner([]);
        };
      } });
  });
}

function showRegistration() {
  view.innerHTML = `<div class="reader"><div class="welcome"><h2>👋 Selamat datang di LABMAT SMK XI</h2>
    <p>Isi identitas siswa sekali saja. Data ini dipakai untuk seluruh aktivitas belajar dan terkunci setelah disimpan.</p></div>
    <div class="card mt-2"><h3>Identitas siswa</h3><form id="regForm">
      <div class="grid cols-2">
        ${field('Nama lengkap', '<input name="nama" required minlength="3" placeholder="Nama sesuai rapor">')}
        ${field('NIS / NISN', '<input name="nisn" required minlength="5" placeholder="Contoh: 2025010123">')}
        ${field('Kelas', '<select name="kelas"><option>XI</option><option>XI A</option><option>XI B</option><option>XI C</option><option>XI D</option></select>')}
        ${field('Program keahlian', `<select name="program_keahlian"><option>TSM</option><option>Pemasaran</option><option>PPLG</option><option>Teknik Komputer dan Jaringan</option><option>Akuntansi</option><option>Lainnya</option></select>`)}
      </div>
      ${field('Nama sekolah', '<input name="sekolah" required minlength="3" placeholder="SMK Negeri …">')}
      <label class="row"><input type="checkbox" id="agree" required> Saya menyetujui data identitas dan hasil belajar disimpan lokal serta dapat dikirim ke guru.</label>
      <button class="btn btn-primary mt-2" type="submit">Simpan identitas &amp; mulai belajar →</button></form></div></div>`;
  document.getElementById('regForm').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      identity = await registerIdentity(d); updateIdentityChip(identity);
      document.getElementById('identityChip').onclick = showIdentity;
      document.getElementById('syncChip').onclick = manualSync;
      document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
      window.addEventListener('hashchange', route);
      startAutoSync(setSyncStatus);
      startStudentWarnings();
      toast('Identitas tersimpan. Selamat belajar!', 'ok');
      await route();
    } catch (err) { toast(err.message, 'bad'); }
  };
}

function showIdentity() {
  openModal('Identitas siswa', `${identityCardHTML(identity)}<div class="row mt-2"><button class="btn btn-ghost" data-close-modal>Tutup</button><a class="btn btn-primary" href="#/pengaturan">Buka pengaturan</a></div>`);
}

async function route() {
  if (!identity) return;
  quiz.stopTimer();
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, param] = raw.split('/');
  const routeName = ROUTES.includes(name) ? name : 'beranda';
  setHeader(routeName);
  document.getElementById('sidebar').classList.remove('open');
  try {
    if (routeName === 'beranda') await pageBeranda();
    else if (routeName === 'materi') await pageMateri(param);
    else if (routeName === 'latihan') await pageLatihan(param);
    else if (routeName === 'uraian') param ? await renderEssay(view, param) : await renderEssayList(view);
    else if (routeName === 'asesmen') await quiz.renderQuizPage(view);
    else if (routeName === 'umpanbalik') await pageUmpanBalik();
    else if (routeName === 'bukutulis') param ? await renderNotebook(view, param) : await renderNotebookList(view);
    else if (routeName === 'alur') await pageAlur();
    else if (routeName === 'progres') await pageProgres();
    else if (routeName === 'eksporasi') renderExploration(view, identity);
    else if (routeName === 'catatan') await pageCatatan();
    else if (routeName === 'sertifikat') await pageSertifikat();
    else if (routeName === 'pengaturan') await pagePengaturan();
  } catch (err) {
    view.innerHTML = `<div class="notice bad">Halaman gagal dimuat: ${escapeHtml(err.message)}</div>`;
    console.error(err);
  }
}

async function pageBeranda() {
  const stats = await studentAnalytics(identity);
  const q = await queueSummary();
  const pending = await pendingChange();
  view.innerHTML = `<div class="reader">
    <section class="welcome"><span class="pill">Selamat belajar, ${escapeHtml(identity.nama.split(' ')[0])}! 👋</span>
      <h2 class="mt-1">Laboratorium Matematika Digital</h2>
      <p>${escapeHtml(identity.kelas)} · ${escapeHtml(identity.program_keahlian)} · ${escapeHtml(identity.sekolah)}</p>
      <div class="mt-2">${progressBar(stats.readiness, 'Kesiapan menyelesaikan program')}</div>
      <div class="row mt-2"><a class="btn btn-primary" href="#/materi">📚 Lanjut belajar</a><a class="btn btn-ghost" style="color:#fff;border-color:#ffffff55" href="#/asesmen">🔥 Asesmen HOTS</a></div></section>
    <div class="grid cols-4 mt-2">
      <div class="stat"><span>Nilai asesmen</span><strong>${stats.overall}</strong></div>
      <div class="stat"><span>Materi dibaca</span><strong>${stats.materialsSeen}/${stats.materialsTotal}</strong></div>
      <div class="stat"><span>Latihan selesai</span><strong>${stats.practiceDone}/${stats.practiceTotal}</strong></div>
      <div class="stat"><span>Data belum kirim</span><strong>${q.unsynced}</strong></div>
    </div>
    ${await (async () => {
      const flow = await flowStatus(identity);
      return `<div class="card mt-3"><div class="row between"><h3>🪜 Alur belajar (${flow.completed}/${flow.total})</h3><a class="btn btn-soft btn-sm" href="#/alur">Lihat alur</a></div>
        ${progressBar(Math.round(flow.completed / Math.max(1, flow.total) * 100), 'Tahap selesai')}
        <div class="row mt-2"><a class="btn btn-ghost btn-sm" href="#/uraian">✍️ Uraian terstruktur</a><a class="btn btn-ghost btn-sm" href="#/bukutulis">📓 Buku tulis</a><a class="btn btn-ghost btn-sm" href="#/umpanbalik">💬 Umpan balik</a></div></div>`;
    })()}
    <div class="notice mt-2">Untuk evaluasi belajar, aplikasi mencatat waktu pengerjaan dan langkah proses menggunakan jam monotonik perangkat. Tidak ada keylogger, screenshot diam-diam, kamera, atau pemantauan di luar aplikasi. Jika ada indikator yang perlu ditinjau, guru akan menyampaikannya sebagai pertanyaan, bukan vonis.</div>
    <h2 class="mt-3">📚 Materi yang harus dipelajari</h2>${renderModuleList()}
    <div class="grid cols-2 mt-3">
      <div class="card"><h3>🪜 Latihan terpandu</h3><p class="muted">Lima tahap berpikir dengan petunjuk bertingkat.</p>
        <div class="mini-list">${(await getAll('progress')).filter(p => p.key.startsWith('practice:')).slice(-4).map(p => `<li>${p.state?.completed ? '✅' : '◻️'} ${escapeHtml(p.key.replace('practice:', ''))} · tahap ${(p.state?.stage || 0) + 1}/5</li>`).join('') || '<li>Belum ada latihan dikerjakan.</li>'}</div>
        <a class="btn btn-soft btn-sm mt-2" href="#/latihan">Buka latihan →</a></div>
      <div class="card"><h3>📶 Status sinkronisasi</h3>
        <div class="notice ${q.unsynced ? 'warn' : 'ok'}">${q.unsynced ? `${q.unsynced} data menunggu pengiriman. Aman tersimpan di perangkat.` : 'Semua data sudah tersinkronisasi.'}</div>
        <div class="mini-list mt-2"><li>Menunggu: ${q.pending}</li><li>Berhasil: ${q.synced}</li><li>Gagal: ${q.failed}</li>${pending ? '<li>Perubahan identitas menunggu guru</li>' : ''}</div>
        <button class="btn btn-ghost btn-sm mt-2" id="syncNow">Sinkronisasi sekarang</button></div>
    </div>
    ${(await getAll('feedback')).length ? `<div class="card mt-3"><h3>💬 Pesan dari guru</h3>${(await getAll('feedback')).map(f => `<div class="notice ${f.remedial ? 'warn' : ''} mb-1"><b>${escapeHtml(f.topik || 'Umpan balik')}:</b> ${escapeHtml(f.komentar || f.teks || '')}</div>`).join('')}</div>` : ''}
    <div class="card mt-3"><h3>🕘 Riwayat hasil belajar</h3><div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Jenis</th><th>Hasil</th><th>Status</th></tr></thead><tbody>
      ${stats.lastSession ? `<tr><td>${formatDateTime(stats.lastSession.waktu_mulai)}</td><td>Asesmen HOTS</td><td>${stats.lastSession.skor ?? '—'}</td><td>${stats.lastSession.status}</td></tr>` : ''}
      ${(await getAll('progress')).filter(p => p.key.startsWith('assessment:')).map(p => `<tr><td>${formatDateTime(p.waktu)}</td><td>Ringkasan asesmen</td><td>${p.summary?.overall ?? '—'}</td><td>selesai</td></tr>`).join('')}
      ${!stats.lastSession ? '<tr><td colspan="4" class="muted">Belum ada riwayat. Mulai dari materi atau latihan.</td></tr>' : ''}
    </tbody></table></div></div></div>`;
  view.querySelectorAll('.module-card[data-module]').forEach(c => c.onclick = () => location.hash = `#/materi/${c.dataset.module}`);
  view.querySelector('#syncNow').onclick = manualSync;
}

async function pageMateri(id) {
  if (!id) {
    view.innerHTML = `<div class="reader"><span class="pill">3 modul pembelajaran</span><h2 class="mt-1">Materi &amp; Simulasi Interaktif</h2>
      <p class="muted">Pilih modul. Setiap modul memuat materi, simulasi, penerapan dunia kerja, dan contoh penyelesaian.</p>
      <div class="mt-2">${renderModuleList()}</div></div>`;
    view.querySelectorAll('.module-card[data-module]').forEach(c => c.onclick = () => location.hash = `#/materi/${c.dataset.module}`);
    return;
  }
  view.innerHTML = renderModule(id);
  await put('progress', { key: `module:${id}`, seen_at: nowISO(), student_id: identity.student_id });
  mountVisualization(view, id);
  view.querySelector('[data-back-materi]').onclick = () => location.hash = '#/materi';
}

async function pageLatihan(id) {
  if (!id) {
    view.innerHTML = `<div class="reader"><span class="pill">9 soal · 5 tahap</span><h2 class="mt-1">Latihan Terpandu</h2>
      <p class="muted">Pahami masalah → tentukan strategi → hitung → tafsirkan → refleksi. Petunjuk tersedia bertahap.</p>
      <div class="mt-2" id="practiceList"></div>
      <div class="row mt-2">${MODULES.map(m => `<button class="btn btn-ghost btn-sm" data-filter="${m.id}">${m.icon} ${m.title}</button>`).join('')}</div></div>`;
    await renderPracticeList(view.querySelector('#practiceList'));
    view.querySelectorAll('[data-filter]').forEach(b => b.onclick = async () => {
      await renderPracticeList(view.querySelector('#practiceList'), b.dataset.filter);
    });
    return;
  }
  await renderPractice(view, id);
}

async function pageProgres() {
  const s = await studentAnalytics(identity);
  view.innerHTML = `<div class="reader"><span class="pill">Peta kompetensi</span><h2 class="mt-1">Progres Belajarmu</h2>
    <div class="grid cols-3 mt-2"><div class="stat"><span>Kesiapan program</span><strong>${s.readiness}%</strong></div><div class="stat"><span>Nilai asesmen</span><strong>${s.overall}</strong></div><div class="stat"><span>Kompetensi dikuasai</span><strong>${s.mastered}/${s.competencies.length}</strong></div></div>
    <div class="card mt-2"><h3>Penguasaan per indikator</h3>${s.competencies.map(c => `<div class="competency"><span style="width:260px">${escapeHtml(c.indikator)}</span><span class="bar"><i style="width:${c.nilai}%"></i></span><b>${c.nilai}</b>${c.dikuasai ? '<span class="tag ok">Dikuasai</span>' : '<span class="tag bad">Perlu latihan</span>'}</div>`).join('') || '<p class="muted">Selesaikan asesmen untuk melihat peta kompetensi.</p>'}</div>
    <div class="grid cols-2 mt-2"><div class="card"><h3>Nilai per modul</h3>${Object.entries(s.byModule).map(([m, v]) => `<div class="competency"><span style="width:120px">${m}</span><span class="bar"><i style="width:${v.rata}%"></i></span><b>${Math.round(v.rata)}</b></div>`).join('') || '<p class="muted">Belum ada data.</p>'}</div>
      <div class="card"><h3>Rekomendasi remedial</h3>${s.remedial.length ? s.remedial.map(r => `<div class="notice warn mb-1">${escapeHtml(r)}</div>`).join('') : '<div class="notice ok">Belum ada rekomendasi khusus.</div>'}</div></div>
    <div class="card mt-2"><h3>Status kelengkapan program</h3>
      <div class="mini-list"><li>${s.materialsSeen >= 3 ? '✅' : '◻️'} Baca 3 modul (${s.materialsSeen}/3)</li>
      <li>${s.practiceDone >= 9 ? '✅' : '◻️'} Selesaikan 9 latihan terpandu (${s.practiceDone}/9)</li>
      <li>${s.completed >= 20 ? '✅' : '◻️'} Kerjakan 20 soal asesmen (${s.completed}/20)</li></div></div></div>`;
}

async function pageAlur() {
  const flow = await flowStatus(identity);
  view.innerHTML = `<div class="reader"><span class="pill">${flow.completed}/${flow.total} tahap selesai</span><h2 class="mt-1">Alur Belajarmu</h2>
    <p class="muted">Tahap wajib ditentukan guru. Tahap opsional boleh dilakukan kapan saja, tetapi tidak boleh melompat ke asesmen sebelum tahap wajib selesai.</p>
    <div class="card mt-2">${flow.stages.map((s, i) => `<div class="row between" style="padding:.6rem 0;border-bottom:1px solid var(--line)">
      <div><b>${i + 1}. ${escapeHtml(s.label)}</b><br><span class="hint-text">${s.required ? 'Wajib' : 'Opsional'}</span></div>
      <span class="tag ${s.done ? 'ok' : s.required ? 'gold' : ''}">${s.done ? 'Selesai' : 'Belum'}</span></div>`).join('')}</div>
    <div class="notice ${flow.requiredPending.length ? 'warn' : 'ok'} mt-2">${flow.requiredPending.length ? `Masih perlu diselesaikan sebelum asesmen: ${escapeHtml(flow.requiredPending.join(', '))}.` : 'Semua tahap wajib sebelum asesmen sudah selesai.'}</div>
    <div class="row mt-2"><a class="btn btn-primary" href="#/${nextRouteFor(flow)}">Lanjutkan tahap berikutnya →</a></div></div>`;
}
function nextRouteFor(flow) {
  const map = { pembukaan: 'beranda', materi: 'materi', simulasi: 'eksporasi', contoh: 'materi', latihan: 'latihan', uraian: 'uraian', asesmen: 'asesmen', analisis: 'progres', umpanbalik: 'umpanbalik', bukutulis: 'bukutulis', refleksi: 'catatan', sinkronisasi: 'pengaturan' };
  const next = flow.stages.find(s => s.required && !s.done) || flow.stages.find(s => !s.done);
  return next ? map[next.id] || 'beranda' : 'beranda';
}

async function pageUmpanBalik() {
  const fb = await generatePersonalFeedback(identity);
  const riwayat = (await getAll('feedback')).filter(f => f.jenis === 'rule_based').slice(-5).reverse();
  view.innerHTML = `<div class="reader"><span class="pill">Tanpa AI eksternal · berbasis aturan</span><h2 class="mt-1">Umpan Balik Personal</h2>
    <div class="notice ok"><b>Tingkat penguasaan:</b> ${escapeHtml(fb.tingkat)} · ${escapeHtml(fb.catatan)}</div>
    <div class="grid cols-2 mt-2">
      <div class="card"><h3>✅ Hal yang dikuasai</h3>${(fb.hal_dikuasai || []).map(x => `<div class="notice ok mb-1">${escapeHtml(x)}</div>`).join('') || '<p class="muted">Belum ada bukti penguasaan.</p>'}
        <h3 class="mt-2">🔧 Kesalahan yang diperbaiki</h3>${(fb.kesalahan_diperbaiki || []).map(x => `<div class="notice warn mb-1">${escapeHtml(x)}</div>`).join('') || '<p class="muted">Belum ada data.</p>'}</div>
      <div class="card"><h3>📚 Materi diulang</h3>${(fb.materi_diulang || []).map(x => `<div class="notice mb-1">${escapeHtml(x)}</div>`).join('') || '<p class="muted">Belum ada rekomendasi.</p>'}
        <h3 class="mt-2">💡 Saran belajar</h3>${(fb.saran_belajar || []).map(x => `<div class="notice mb-1">${escapeHtml(x)}</div>`).join('') || '<p class="muted">Selesaikan asesmen untuk mendapat saran.</p>'}</div></div>
    <div class="card mt-2"><h3>Bukti data yang dipakai</h3><ul class="mini-list">${(fb.bukti || []).map(b => `<li>${escapeHtml(b)}</li>`).join('') || '<li>Belum ada data.</li>'}</ul></div>
    ${riwayat.length ? `<div class="card mt-2"><h3>Riwayat ringkas</h3>${riwayat.map(r => `<div class="hint-text">${formatDateTime(r.waktu)} · ${escapeHtml(r.komentar || '')}</div>`).join('')}</div>` : ''}
    <div class="row mt-2"><a class="btn btn-primary" href="#/bukutulis">Lanjut latihan buku tulis →</a><button class="btn btn-ghost" id="refreshFeedback">Muat ulang umpan balik</button></div></div>`;
  view.querySelector('#refreshFeedback').onclick = () => pageUmpanBalik();
}

async function pageCatatan() {
  const notes = (await getAll('notes')).filter(n => n.student_id === identity.student_id).sort((a, b) => b.waktu.localeCompare(a.waktu));
  view.innerHTML = `<div class="reader"><span class="pill">Catatan pribadi</span><h2 class="mt-1">Catatan Belajar</h2>
    <div class="card"><div class="grid cols-2">${field('Judul catatan', '<input id="noteTitle" placeholder="Contoh: Rumus deret geometri">')}
      ${field('Materi', '<select id="noteMateri"><option>aritmetika</option><option>geometri</option><option>lingkaran</option><option>umum</option></select>')}</div>
      ${field('Isi catatan', '<textarea id="noteBody" rows="4" placeholder="Tulis rumus, tips, atau pertanyaan yang ingin ditanyakan ke guru…"></textarea>')}
      <button class="btn btn-primary" id="saveNote">Simpan catatan</button></div>
    <div class="grid cols-3 mt-2">${notes.map(n => `<div class="card"><div class="row between"><span class="tag teal">${escapeHtml(n.materi)}</span><button class="icon-btn" data-del-note="${n.note_id}">🗑</button></div>
      <h3>${escapeHtml(n.judul)}</h3><p style="white-space:pre-wrap">${escapeHtml(n.isi)}</p><span class="muted" style="font-size:.75rem">${formatDateTime(n.waktu)}</span></div>`).join('') || '<div class="notice">Belum ada catatan. Tulis yang pertama!</div>'}</div></div>`;
  view.querySelector('#saveNote').onclick = async () => {
    const judul = view.querySelector('#noteTitle').value.trim(), isi = view.querySelector('#noteBody').value.trim();
    if (!judul || !isi) { toast('Judul dan isi wajib diisi.', 'bad'); return; }
    await put('notes', { note_id: uid('NOTE'), student_id: identity.student_id, judul, materi: view.querySelector('#noteMateri').value, isi, waktu: nowISO() });
    toast('Catatan tersimpan.', 'ok'); await pageCatatan();
  };
  view.querySelectorAll('[data-del-note]').forEach(b => b.onclick = () => confirmDialog('Hapus catatan ini?', async () => { await del('notes', b.dataset.delNote); await pageCatatan(); }));
}

async function pageSertifikat() {
  const s = await studentAnalytics(identity);
  const syarat = [
    [s.materialsSeen >= 3, 'Membaca ketiga modul materi'],
    [s.practiceDone >= 9, 'Menyelesaikan 9 latihan terpandu'],
    [s.completed >= 20, 'Mengerjakan 20 soal asesmen'],
    [s.overall >= MASTERY_MIN, `Nilai asesmen minimal ${MASTERY_MIN} (nilaimu ${s.overall})`]
  ];
  const layak = syarat.every(([ok]) => ok);
  view.innerHTML = `<div class="reader"><span class="pill">Sertifikat digital</span><h2 class="mt-1">Sertifikat Penyelesaian</h2>
    ${layak ? `<div class="certificate"><div class="seal">🏅</div><h1>SERTIFIKAT</h1><p>Diberikan kepada</p><div class="name">${escapeHtml(identity.nama)}</div>
      <p>NIS/NISN ${escapeHtml(identity.nisn)} · Kelas ${escapeHtml(identity.kelas)}<br>${escapeHtml(identity.program_keahlian)}</p>
      <p>Atas penyelesaian seluruh program LABMAT SMK XI:<br><b>Barisan &amp; Deret Aritmatika, Barisan &amp; Deret Geometri, Lingkaran &amp; Penerapannya</b></p>
      <p>Nilai akhir: <b>${s.overall}</b> · ${escapeHtml(s.grade.label)}</p>
      <div class="row between mt-3"><span>____________________<br><small>Guru Matematika</small></span><span>${escapeHtml(identity.sekolah)}<br><small>${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</small></span></div></div>
      <div class="row mt-2"><button class="btn btn-primary" onclick="window.print()">🖨 Cetak / Simpan PDF</button><button class="btn btn-ghost" id="downloadCert">⬇ Unduh bukti JSON</button></div>`
      : `<div class="card"><h3>Belum memenuhi syarat</h3><div class="mini-list">${syarat.map(([ok, t]) => `<li>${ok ? '✅' : '◻️'} ${escapeHtml(t)}</li>`).join('')}</div>
          <a class="btn btn-primary mt-2" href="#/beranda">Lanjutkan belajar</a></div>`}</div>`;
  view.querySelector('#downloadCert')?.addEventListener('click', () => downloadFile(`sertifikat-${identity.student_id}.json`, JSON.stringify({ identity, summary: s, issued_at: nowISO() }, null, 2), 'application/json'));
}

async function pagePengaturan() {
  const sync = await getSyncConfig();
  const weights = await getConfig('weights');
  const feat = await getConfig('features');
  const pending = await pendingChange();
  const q = await queueSummary();
  const riwayatCadangan = (await getAll('localBackups')).filter(x => x.jenis === 'permintaan')
    .sort((a, b) => String(b.waktu).localeCompare(String(a.waktu))).slice(0, 10);
  view.innerHTML = `<div class="reader"><span class="pill">Pengaturan</span><h2 class="mt-1">Identitas &amp; Sinkronisasi</h2>
    <div class="card mb-2"><div class="row between"><h3>Data identitas siswa</h3><span class="tag ${identity.locked ? 'ok' : 'bad'}">${identity.locked ? 'Terkunci' : 'Terbuka'}</span></div>
      ${identityCardHTML(identity, pending)}
      <button class="btn btn-ghost btn-sm mt-2" id="requestChange">Ajukan perubahan identitas ke guru</button></div>
    <div class="card mb-2"><h3>Koneksi Google Sheets</h3><p class="muted">URL Web App dan kode sinkronisasi diberikan oleh guru. Keduanya disimpan lokal di perangkat ini, bukan di kode aplikasi.</p>
      <div class="grid cols-2">${field('URL Web App Apps Script', `<input id="syncUrl" value="${escapeHtml(sync.url)}" placeholder="https://script.google.com/macros/s/…/exec">`)}
        ${field('Kode sinkronisasi (token)', `<input id="syncToken" type="password" value="${escapeHtml(sync.token)}" placeholder="Dari sheet KONFIGURASI">`)}</div>
      <label class="row"><input type="checkbox" id="autoSync" ${sync.autoSync ? 'checked' : ''}> Sinkronisasi otomatis saat internet tersedia</label>
      ${field('Kirim inputan ke guru setiap', `<select id="syncInterval" class="input">
        ${[[300, '5 menit'], [900, '15 menit'], [1800, '30 menit'], [3600, '60 menit']]
          .map(([v, l]) => `<option value="${v}" ${Number(sync.intervalSec || 1800) === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>`)}
      <div class="row mt-2"><button class="btn btn-primary" id="saveSync">Simpan pengaturan</button><button class="btn btn-ghost" id="testSync">Uji koneksi</button><button class="btn btn-soft" id="manualSync">Sinkronisasi manual</button></div>
      <div class="notice mt-2">Jadwal pengiriman: <b>setiap ${Math.round((sync.intervalSec || 1800) / 60)} menit</b>. Jawaban dan draf tetap tersimpan di perangkat seketika saat diketik; tombol <b>Sinkronisasi manual</b> dapat dipakai kapan saja.<br>
        Status: ${q.unsynced ? q.unsynced + ' data belum terkirim' : 'semua terkirim'} · Terakhir sinkron: ${formatDateTime(sync.lastSync)}<br>
        Verifikasi pemahaman: <b>${feat.verificationEnabled ? 'AKTIF (diatur guru)' : 'nonaktif'}</b>${feat.teacherControlled ? ' · terkontrol guru' : ''}</div></div>
    <div class="card mb-2"><h3>Bobot penilaian</h3><p class="muted">Bobot lokal saat ini. Jika guru mengirim bobot lewat Google Sheets, nilai guru yang dipakai.</p>
      <div class="kpi-grid">${Object.entries(weights).filter(([k]) => k !== 'key').map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}%</strong></div>`).join('')}</div></div>
    <div class="card mb-2"><h3>Riwayat permintaan cadangan guru</h3><p class="muted">Setiap kali guru mengambil salinan data lokal, kejadian ini dicatat di perangkatmu.</p>
      ${riwayatCadangan.length ? `<div class="mini-list">${riwayatCadangan.map(r => `<li>${escapeHtml(formatDateTime(r.waktu))} · ${escapeHtml(r.student_id)} · ${escapeHtml(r.request_id)}</li>`).join('')}</div>` : '<p class="hint-text">Belum ada permintaan.</p>'}</div>
    <div class="card"><h3>Data lokal &amp; cadangan</h3><p class="muted">Seluruh pekerjaan tersimpan di IndexedDB. Unduh cadangan untuk berpindah perangkat atau Import di dashboard guru.</p>
      <div class="row"><button class="btn btn-ghost" id="exportBackup">⬇ Unduh cadangan JSON</button><label class="btn btn-ghost">⬆ Impor cadangan<input type="file" id="importBackup" accept="application/json" hidden></label>
        <button class="btn btn-danger" id="resetLocal">Hapus semua data lokal</button></div></div></div>`;

  view.querySelector('#saveSync').onclick = async () => {
    await setSyncConfig({
      url: view.querySelector('#syncUrl').value.trim(),
      token: view.querySelector('#syncToken').value.trim(),
      autoSync: view.querySelector('#autoSync').checked,
      intervalSec: Number(view.querySelector('#syncInterval').value) || 1800
    });
    await startAutoSync(setSyncStatus); // terapkan jeda baru tanpa muat ulang halaman
    toast('Pengaturan sinkronisasi disimpan. Jadwal baru mulai berlaku.', 'ok');
    await pagePengaturan();
  };
  view.querySelector('#testSync').onclick = async () => {
    try { await testConnection(); toast('Koneksi ke Google Sheets berhasil.', 'ok'); } catch (e) { toast('Gagal: ' + e.message, 'bad'); }
  };
  view.querySelector('#manualSync').onclick = manualSync;
  view.querySelector('#requestChange').onclick = () => {
    openModal('Ajukan perubahan identitas', `<p class="notice warn">Identitas akan berubah setelah guru menyetujui permintaan ini di dashboard guru.</p>
      <div class="grid cols-2">${field('Nama lengkap', `<input id="chNama" value="${escapeHtml(identity.nama)}">`)}${field('NIS/NISN', `<input id="chNisn" value="${escapeHtml(identity.nisn)}">`)}
      ${field('Kelas', `<input id="chKelas" value="${escapeHtml(identity.kelas)}">`)}${field('Program keahlian', `<input id="chProgram" value="${escapeHtml(identity.program_keahlian)}">`)}</div>
      ${field('Alasan perubahan', '<textarea id="chAlasan" placeholder="Minimal 5 karakter…"></textarea>')}
      <button class="btn btn-primary" id="sendChange">Kirim permintaan</button>`,
      { onMount: modal => { modal.querySelector('#sendChange').onclick = async () => {
        try {
          await requestIdentityChange({ nama: modal.querySelector('#chNama').value, nisn: modal.querySelector('#chNisn').value, kelas: modal.querySelector('#chKelas').value, program_keahlian: modal.querySelector('#chProgram').value, sekolah: identity.sekolah }, modal.querySelector('#chAlasan').value);
          closeModal(); toast('Permintaan terkirim ke antrean sinkronisasi.', 'ok'); await pagePengaturan();
        } catch (e) { toast(e.message, 'bad'); }
      }; } });
  };
  view.querySelector('#exportBackup').onclick = async () => downloadFile(`labmat-backup-${identity.student_id}.json`, JSON.stringify(await exportBackup(), null, 2), 'application/json');
  view.querySelector('#importBackup').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { const n = await importBackup(await file.text()); toast(`${n} data berhasil diimpor.`, 'ok'); await pagePengaturan(); }
    catch (err) { toast('Impor gagal: ' + err.message, 'bad'); }
  };
  view.querySelector('#resetLocal').onclick = () => confirmDialog('Hapus SEMUA data lokal (identitas, jawaban, catatan, antrean)? Tindakan ini tidak dapat dibatalkan.', async () => {
    const { clear, STORES } = await import('./database.js');
    for (const s of STORES) await clear(s);
    toast('Data lokal dihapus.', 'ok'); location.reload();
  });
}

async function manualSync() {
  setSyncStatus({ state: 'busy', text: 'Menyinkronisasi…' });
  const push = await processQueue({ manual: true, onStatus: setSyncStatus });
  let pullMsg = '';
  try { const data = await pull(); await applyPulledRealtime(data); pullMsg = ' · data guru diperbarui'; } catch (e) { pullMsg = ' · tarik data gagal: ' + e.message; }
  toast(push.message + pullMsg, push.ok ? 'ok' : 'bad');
  refreshSyncIndicator();
}

boot();
