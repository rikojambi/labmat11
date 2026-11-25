// Labmat SMK XI — server statis + bus pengingat ringan (tanpa dependency).
// Penggunaan: node server.js [port] [--lan]
// --lan membuka akses di jaringan lokal (untuk peringatan guru ↔ siswa satu LAN).
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname);
const args = process.argv.slice(2);
const port = Number(args.find(a => /^\d+$/.test(a)) || 8765);
const lan = args.includes('--lan');
const host = lan ? '0.0.0.0' : '127.0.0.1';
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.pdf': 'application/pdf'
};

// Bus memori: hanya pesan pengingat/tindakan, BUKAN jawaban siswa.
// Jawaban tetap tersimpan di IndexedDB dan Google Sheets.
const bus = { alerts: [], actions: [], warnings: [] };
const CAP = 5000;
const push = (kind, item) => {
  if (!item || !item.id) return;
  const now = new Date().toISOString();
  bus[kind].push({ ...item, diterima_server: now });
  if (bus[kind].length > CAP) bus[kind].splice(0, bus[kind].length - CAP);
};
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 2e6) reject(new Error('Permintaan terlalu besar')); });
    req.on('end', () => { try { resolveBody(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}

http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) { res.writeHead(204, cors).end(); return; }

  if (pathname.startsWith('/api/')) {
    try {
      if (req.method === 'GET' && pathname === '/api/live') {
        const since = url.searchParams.get('since') || '';
        const sid = url.searchParams.get('student_id') || '';
        // Gunakan cap waktu penerimaan server agar perbedaan jam perangkat tidak membuat pesan terlewat.
        const fresh = k => bus[k].filter(x => !since || String(x.diterima_server || x.waktu || x.created_at || '') > since);
        json(res, 200, {
          ok: true, server_time: new Date().toISOString(),
          alerts: fresh('alerts'), actions: fresh('actions'),
          warnings: sid ? fresh('warnings').filter(x => !x.student_id || x.student_id === sid) : fresh('warnings')
        });
        return;
      }
      if (req.method === 'POST' && ['/api/alerts', '/api/actions', '/api/warnings'].includes(pathname)) {
        const item = await body(req);
        const kind = pathname.split('/').pop();
        push(kind, item);
        json(res, 200, { ok: true, id: item.id, diterima_server: bus[kind].at(-1).diterima_server });
        return;
      }
      json(res, 404, { ok: false, error: 'Endpoint tidak ditemukan' });
    } catch (e) { json(res, 400, { ok: false, error: String(e.message || e) }); }
    return;
  }

  let file = pathname === '/' ? join(root, 'index.html') : resolve(join(root, normalize(pathname).replace(/^([/\\])+/, '')));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const st = statSync(file);
    if (st.isDirectory()) file = join(file, 'index.html');
    statSync(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*'
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 — tidak ditemukan: ' + pathname);
  }
}).listen(port, host, () => console.log(`LABMAT SMK XI aktif di http://localhost:${port}/ ${lan ? '(LAN)' : '(lokal)'}`))
  .on('error', e => { console.error('Port dipakai atau Error:', e.message); process.exitCode = 1; });
