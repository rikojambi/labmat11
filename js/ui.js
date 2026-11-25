// Komponen UI bersama untuk shell siswa.
import { escapeHtml, progressBar } from './utils.js';
import { queueSummary } from './sync.js';

const TITLES = {
  beranda: ['Beranda', 'Laboratorium Matematika Digital'],
  materi: ['Materi & Simulasi', 'Belajar konsep dengan visualisasi interaktif'],
  latihan: ['Latihan Terpandu', 'Lima tahap berpikir, dengan petunjuk bertingkat'],
  uraian: ['Uraian Terstruktur', 'Delapan langkah penyelesaian, dapat diedit sebelum kirim'],
  asesmen: ['Asesmen HOTS', '20 soal kontekstual untuk menguji penalaran'],
  umpanbalik: ['Umpan Balik Personal', 'Masukan berbasis data pekerjaanmu'],
  bukutulis: ['Latihan Buku Tulis', 'Lanjutkan pembelajaranmu di buku'],
  alur: ['Alur Belajar', 'Tahapan wajib dan opsional sesuai pengaturan guru'],
  progres: ['Progres & Kompetensi', 'Peta penguasaan dan rekomendasi remedial'],
  eksporasi: ['Kalkulator & Tantangan', 'Bereksperimen dan terapkan ke dunia kerja'],
  catatan: ['Catatan Belajar', 'Rumus, tips, dan refleksi pribadimu'],
  sertifikat: ['Sertifikat', 'Bukti penyelesaian seluruh program'],
  pengaturan: ['Pengaturan', 'Identitas, sinkronisasi, dan data lokal']
};
export function setHeader(route) {
  const [title, sub] = TITLES[route] || ['LABMAT', 'SMK XI'];
  const t = document.getElementById('pageTitle'), s = document.getElementById('pageSubtitle');
  if (t) t.textContent = title; if (s) s.textContent = sub;
  document.querySelectorAll('#sideNav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  document.querySelectorAll('.side-bottom a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
}
export async function refreshSyncIndicator() {
  const chip = document.getElementById('syncChip'), label = document.getElementById('syncLabel');
  if (!chip) return;
  const q = await queueSummary().catch(() => ({ unsynced: 0, failed: 0 }));
  const offline = navigator.onLine === false;
  chip.className = 'sync-chip' + (q.failed ? ' bad' : q.unsynced ? '' : ' ok');
  label.textContent = offline ? 'Offline · ' + q.unsynced + ' antrean' : q.unsynced ? q.unsynced + ' belum dikirim' : 'Tersinkronisasi';
  chip.title = `${q.pending} menunggu, ${q.sending} mengirim, ${q.failed} gagal, ${q.synced} berhasil. Klik untuk sinkronisasi manual.`;
}
export function setSyncStatus({ state, text }) {
  const chip = document.getElementById('syncChip'), label = document.getElementById('syncLabel');
  if (!chip || !label) return;
  chip.className = 'sync-chip ' + (state === 'busy' ? 'busy' : state === 'bad' ? 'bad' : '');
  label.textContent = text;
}
export function updateIdentityChip(identity) {
  const label = document.getElementById('identityLabel');
  if (label) label.textContent = identity ? identity.nama.split(' ')[0] : 'Siswa';
}
export function sectionTitle(title, subtitle = '') {
  return `<div class="mb-2"><h2>${escapeHtml(title)}</h2>${subtitle ? `<p class="muted">${escapeHtml(subtitle)}</p>` : ''}</div>`;
}
export function progressWidget(percent, label) { return progressBar(percent, label); }
