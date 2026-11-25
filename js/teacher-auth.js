// Gerbang PIN lokal untuk dashboard guru.
// PIN disimpan sebagai hash + salt di IndexedDB — BUKAN teks biasa, dan BUKAN akun Google.
// Tujuannya hanya mengunci dashboard jika komputer dipakai bersama. Status "terbuka"
// disimpan di sessionStorage, sehingga tab ditutup = terkunci lagi.
// Tidak ada data ini yang dikirim ke Google Sheets atau dibagikan ke siswa.
import { getConfig, setConfig } from './database.js';
import { escapeHtml } from './utils.js';

const KEY = 'teacherPin';
const OPEN = 'labmatTeacherUnlocked';
const FAILS = 'labmatTeacherFails';
const BLOCK = 'labmatTeacherBlockUntil';
const MAX_FAILS = 5;
const BLOCK_MS = 30000;
const POLA = /^\d{4,8}$/;

/* ---------- hash ---------- */

function hashLokal(teks) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < teks.length; i++) {
    const c = teks.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ (c + i + 1), 0x811c9dc5);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

async function hashPIN(pin, salt) {
  const bahan = `${salt}|${pin}|labmat-teacher-gate-v1`;
  // SHA-256 dipakai jika tersedia (localhost/HTTPS). Untuk akses LAN lewat IP
  // (bukan secure context) pakai hash lokal agar tetap berfungsi offline.
  if (globalThis.crypto && crypto.subtle && crypto.subtle.digest && typeof TextEncoder !== 'undefined') {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bahan));
      return 's:' + [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* lanjut ke hash lokal */ }
  }
  return 'f:' + hashLokal(bahan);
}

function saltBaru() {
  const arr = new Uint8Array(16);
  if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return [...arr].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- penyimpanan ---------- */

export async function hasPin() {
  const cfg = await getConfig(KEY);
  return !!(cfg.hash && cfg.salt);
}

export async function setPin(pin) {
  const nilai = String(pin || '').trim();
  if (!POLA.test(nilai)) throw new Error('PIN harus 4–8 digit angka.');
  const salt = saltBaru();
  const hash = await hashPIN(nilai, salt);
  await setConfig(KEY, { salt, hash, dibuat: new Date().toISOString() });
  return true;
}

export async function hapusPin() {
  await setConfig(KEY, { salt: '', hash: '', dihapus: new Date().toISOString() });
}

export async function verifyPin(pin) {
  const cfg = await getConfig(KEY);
  if (!cfg.hash || !cfg.salt) return false;
  return (await hashPIN(String(pin || ''), cfg.salt)) === cfg.hash;
}

/** Reset PIN memakai kode sinkronisasi guru (yang sudah ada di IndexedDB). */
export async function resetPinDenganToken(token) {
  const sync = await getConfig('sync');
  if (!sync.token || String(token || '').trim() !== sync.token) return false;
  await hapusPin();
  return true;
}

/* ---------- sesi ---------- */

export function isUnlocked() {
  try { return sessionStorage.getItem(OPEN) === '1'; } catch (e) { return false; }
}
function tandaiTerbuka() { try { sessionStorage.setItem(OPEN, '1'); } catch (e) { /* abaikan */ } }
export function lock() { try { sessionStorage.removeItem(OPEN); } catch (e) { /* abaikan */ } }

function sisaBlokir() {
  try { return Math.max(0, Number(sessionStorage.getItem(BLOCK) || 0) - Date.now()); }
  catch (e) { return 0; }
}
function catatGagal() {
  try {
    const n = Number(sessionStorage.getItem(FAILS) || 0) + 1;
    sessionStorage.setItem(FAILS, String(n));
    if (n >= MAX_FAILS) {
      sessionStorage.setItem(BLOCK, String(Date.now() + BLOCK_MS));
      sessionStorage.setItem(FAILS, '0');
      return true;
    }
  } catch (e) { /* abaikan */ }
  return false;
}
function sukses() {
  try {
    sessionStorage.removeItem(FAILS);
    sessionStorage.removeItem(BLOCK);
  } catch (e) { /* abaikan */ }
}

/* ---------- layar kunci ---------- */

/**
 * Tampilkan gerbang PIN di `host` dan selesaikan saat guru berhasil masuk.
 * Mengembalikan Promise<boolean> — false hanya jika ada error teknis.
 */
export async function ensureTeacherGate(host) {
  if (isUnlocked()) { host.innerHTML = ''; return true; }
  let perluBuat = !(await hasPin());

  return new Promise(resolve => {
    const selesai = () => { host.innerHTML = ''; tandaiTerbuka(); resolve(true); };

    const render = (pesan = '') => {
      const blokirMs = sisaBlokir();
      const duniai = blokirMs > 0;
      host.innerHTML = `<div class="gate-backdrop">
        <form class="gate-card" id="gateForm" autocomplete="off" novalidate>
          <div class="gate-icon">${perluBuat ? '🔐' : '🔒'}</div>
          <h2>${perluBuat ? 'Buat PIN guru' : 'Masuk dashboard guru'}</h2>
          <p class="muted">${perluBuat
            ? 'PIN 4–8 digit angka untuk mengunci dashboard di perangkat ini.'
            : 'Masukkan PIN guru untuk membuka dashboard.'}</p>
          ${pesan ? `<div class="notice ${duniai ? 'warn' : 'bad'}">${escapeHtml(pesan)}</div>` : ''}
          <div class="field"><label for="gatePin">PIN</label>
            <input id="gatePin" type="password" inputmode="numeric" maxlength="8" placeholder="••••" autofocus ${duniai ? 'disabled' : ''}>
          </div>
          ${perluBuat ? `<div class="field"><label for="gatePin2">Ulangi PIN</label>
            <input id="gatePin2" type="password" inputmode="numeric" maxlength="8" placeholder="••••" ${duniai ? 'disabled' : ''}></div>` : ''}
          <button class="btn btn-primary w-full" id="gateGo" ${duniai ? 'disabled' : ''}>
            ${perluBuat ? 'Simpan PIN & masuk' : 'Masuk'}
          </button>
          ${perluBuat
            ? '<p class="hint-text">PIN hanya disimpan sebagai hash di perangkat ini. Gunakan PIN yang tidak dipakai di tempat lain.</p>'
            : '<button type="button" class="gate-lupa" id="gateLupa">Lupa PIN?</button>'}
        </form>
      </div>`;

      const form = host.querySelector('#gateForm');
      form.onsubmit = async e => {
        e.preventDefault();
        if (sisaBlokir() > 0) { render('Terlalu banyak percobaan. Tunggu beberapa saat.'); return; }
        const pin = host.querySelector('#gatePin').value.trim();
        if (!POLA.test(pin)) { render('PIN harus 4–8 digit angka.'); return; }

        if (perluBuat) {
          const ulang = host.querySelector('#gatePin2').value.trim();
          if (pin !== ulang) { render('PIN dan ulangan tidak sama.'); return; }
          try {
            await setPin(pin);
            sukses(); selesai();
          } catch (err) { render(err.message); }
          return;
        }

        if (!(await verifyPin(pin))) {
          const kunci = catatGagal();
          render(kunci ? 'PIN salah. Terlalu banyak percobaan — kunci sementara 30 detik.'
            : `PIN salah. Sisa percobaan: ${Math.max(0, MAX_FAILS - Number(sessionStorage.getItem(FAILS) || 0))}.`);
          return;
        }
        sukses(); selesai();
      };

      host.querySelector('#gateLupa')?.addEventListener('click', () => {
        host.innerHTML = `<div class="gate-backdrop">
          <form class="gate-card" id="gateResetForm" autocomplete="off" novalidate>
            <div class="gate-icon">🔑</div>
            <h2>Reset PIN</h2>
            <p class="muted">Masukkan <b>kode sinkronisasi</b> guru dari sheet KONFIGURASI untuk membuat PIN baru.</p>
            <div class="field"><label for="gateToken">Kode sinkronisasi</label>
              <input id="gateToken" type="password" placeholder="Token Google Sheets"></div>
            <button class="btn btn-primary w-full" id="gateResetGo">Reset PIN</button>
            <button type="button" class="gate-lupa" id="gateBatal">Kembali</button>
          </form>
        </div>`;
        host.querySelector('#gateBatal').onclick = () => render();
        host.querySelector('#gateResetForm').onsubmit = async e => {
          e.preventDefault();
          const token = host.querySelector('#gateToken').value.trim();
          if (await resetPinDenganToken(token)) {
            perluBuat = true;
            render();
          } else {
            host.querySelector('#gateToken').value = '';
            host.querySelector('#gateToken').focus();
            const info = host.querySelector('#gateResetForm .notice');
            if (info) info.remove();
            host.querySelector('#gateResetForm').insertAdjacentHTML('afterbegin',
              '<div class="notice bad">Kode sinkronisasi tidak cocok.</div>');
          }
        };
      });
    };

    render();
  });
}
