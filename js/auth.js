// Identitas siswa: dibuat sekali, terkunci, perubahan hanya lewat persetujuan guru.
import { get, put, getAll, newStudentId } from './database.js';
import { enqueue } from './sync.js';
import { nowISO, uid, escapeHtml } from './utils.js';

const KEY = 'current';
export const getIdentity = () => get('identity', KEY);
export const isRegistered = async () => !!(await getIdentity());

export async function registerIdentity(data) {
  const existing = await getIdentity();
  if (existing) throw new Error('Identitas sudah terdaftar dan terkunci.');
  const clean = {
    key: KEY,
    student_id: newStudentId(),
    nisn: String(data.nisn || '').trim(),
    nama: String(data.nama || '').trim(),
    kelas: String(data.kelas || 'XI').trim(),
    program_keahlian: String(data.program_keahlian || '').trim(),
    sekolah: String(data.sekolah || '').trim(),
    tanggal_daftar: nowISO(),
    locked: true,
    update_requested: false
  };
  const err = validateIdentity(clean);
  if (err) throw new Error(err);
  await put('identity', clean);
  await enqueue('SISWA', clean, `siswa:${clean.student_id}`);
  return clean;
}

export function validateIdentity(d) {
  if (!d.nama || d.nama.length < 3) return 'Nama lengkap minimal 3 karakter.';
  if (!d.nisn || d.nisn.length < 5) return 'NIS/NISN minimal 5 karakter.';
  if (!d.kelas) return 'Kelas wajib diisi.';
  if (!d.program_keahlian) return 'Program keahlian wajib diisi.';
  if (!d.sekolah || d.sekolah.length < 3) return 'Nama sekolah wajib diisi.';
  return null;
}

export async function requestIdentityChange(changes, alasan) {
  const current = await getIdentity();
  if (!current) throw new Error('Siswa belum terdaftar.');
  const item = {
    id: uid('CHG'), type: 'IDENTITY_CHANGE', student_id: current.student_id,
    changes: { nama: changes.nama, kelas: changes.kelas, program_keahlian: changes.program_keahlian, sekolah: changes.sekolah, nisn: changes.nisn },
    alasan: String(alasan || '').trim(), status: 'menunggu_guru', created_at: nowISO()
  };
  if (!item.alasan || item.alasan.length < 5) throw new Error('Alasan perubahan minimal 5 karakter.');
  await put('outbox', item);
  await enqueue('IDENTITY_CHANGE', item, `chg:${item.id}`);
  await put('identity', { ...current, update_requested: true });
  return item;
}

export async function pendingChange() {
  const list = await getAll('outbox');
  return list.filter(x => x.status === 'menunggu_guru').sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
}

export async function applyIdentityApproval(approval) {
  const current = await getIdentity();
  if (!current || current.student_id !== approval.student_id) return false;
  const merged = { ...current, ...approval.changes, locked: true, update_requested: false, updated_at: nowISO(), approved_by: approval.approved_by || 'guru' };
  delete merged.key2;
  await put('identity', merged);
  const outbox = await getAll('outbox');
  for (const item of outbox.filter(x => x.student_id === approval.student_id && x.status === 'menunggu_guru')) {
    await put('outbox', { ...item, status: 'disetujui', decided_at: nowISO() });
  }
  return true;
}

export function identityCardHTML(identity, pending) {
  if (!identity) return '';
  const rows = [
    ['Nama lengkap', identity.nama], ['NIS/NISN', identity.nisn], ['Kelas', identity.kelas],
    ['Program keahlian', identity.program_keahlian], ['Sekolah', identity.sekolah],
    ['ID siswa', identity.student_id], ['Terdaftar', new Date(identity.tanggal_daftar).toLocaleDateString('id-ID')]
  ];
  return `<div class="grid cols-2">${rows.map(([k, v]) => `<div><span class="muted">${k}</span><br><strong>${escapeHtml(v)}</strong></div>`).join('')}</div>
  ${pending ? `<div class="notice warn mt-2">Permintaan perubahan identitas sedang menunggu persetujuan guru (${new Date(pending.created_at).toLocaleDateString('id-ID')}).</div>` : `<div class="notice ok mt-2">Identitas terkunci. Perubahan memerlukan persetujuan guru.</div>`}`;
}
