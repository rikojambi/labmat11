// Alur pembelajaran 12 tahap. Guru menentukan tahap wajib/opsional.
// Gate mencegah siswa melompat ke asesmen sebelum tahap wajib selesai.
import { getConfig, setConfig, get, getAll, getByIndex, put } from './database.js';
import { queueSummary } from './sync.js';
import { ESSAYS } from '../data/essays.js';
import { NOTEBOOK } from '../data/notebook.js';

export async function getFlowConfig() {
  const c = await getConfig('flow');
  return { ...c, stages: Array.isArray(c.stages) && c.stages.length ? c.stages : (await getConfig('flow')).stages || [] };
}

export async function setFlowConfig(stages) {
  if (!Array.isArray(stages) || !stages.length) throw new Error('Daftar tahap tidak valid.');
  const cur = await getFlowConfig();
  return setConfig('flow', { stages: stages.map(s => ({ ...s, required: !!s.required })), teacherControlled: true });
}

export async function markStage(stageId, extra = {}) {
  await put('progress', { key: `flow:${stageId}`, completed: true, waktu: new Date().toISOString(), ...extra });
}

async function stageDone(id, identity) {
  if (!identity) return false;
  const sid = identity.student_id;
  const flag = await get('progress', `flow:${id}`);
  if (flag?.completed) return true;
  const progress = await getAll('progress');
  const countPrefix = p => progress.filter(x => String(x.key).startsWith(p)).length;
  if (id === 'materi') return countPrefix('module:') >= 3;
  if (id === 'latihan') return progress.filter(p => String(p.key).startsWith('practice:') && p.state?.completed).length >= 9;
  if (id === 'asesmen') return !!(await get('progress', 'assessment:last'));
  if (id === 'analisis') return !!(await get('progress', 'assessment:last'));
  if (id === 'uraian') {
    const rows = await getByIndex('essayResponses', 'byStudent', sid);
    return new Set(rows.filter(r => r.status === 'selesai').map(r => r.item_id)).size >= ESSAYS.length;
  }
  if (id === 'bukutulis') {
    const rows = await getByIndex('notebook', 'byStudent', sid);
    return new Set(rows.filter(r => r.status === 'selesai').map(r => r.item_id)).size >= NOTEBOOK.length;
  }
  if (id === 'refleksi') {
    const refs = await getAll('reflections');
    return refs.some(r => r.student_id === sid && /refleksi_akhir|refleksi_latihan/.test(r.jenis || ''));
  }
  if (id === 'sinkronisasi') return (await queueSummary()).unsynced === 0;
  return false;
}

export async function flowStatus(identity) {
  const cfg = await getFlowConfig();
  const stages = [];
  for (const s of cfg.stages) stages.push({ ...s, done: await stageDone(s.id, identity) });
  return { stages, completed: stages.filter(s => s.done).length, total: stages.length,
    requiredPending: stages.filter(s => s.required && !s.done).map(s => s.id) };
}

/** Gate asesmen: hanya tahap wajib sebelum asesmen yang diperiksa. */
export async function assessmentGate(identity) {
  const status = await flowStatus(identity);
  const urutan = status.stages.map(s => s.id);
  const before = urutan.slice(0, urutan.indexOf('asesmen'));
  const missing = status.stages.filter(s => before.includes(s.id) && s.required && !s.done);
  return {
    allowed: missing.length === 0,
    missing,
    labels: missing.map(s => s.label),
    message: missing.length ? `Selesaikan dulu: ${missing.map(s => s.label).join(', ')}.` : ''
  };
}

export async function nextRequiredStage(identity) {
  const status = await flowStatus(identity);
  return status.stages.find(s => s.required && !s.done) || null;
}
