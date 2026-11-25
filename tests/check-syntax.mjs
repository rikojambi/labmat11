import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { relative } from 'node:path';

const files = ['js', 'teacher', 'data', 'tests'].flatMap(dir => globSync(`${dir}/**/*.{js,mjs}`));
let fail = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { fail++; console.error('✗', relative('.', f), r.stderr.split('\n').slice(0, 4).join('\n')); }
}
console.log(fail ? `SINTAKS GAGAL: ${fail} file` : `SINTAKS LULUS: ${files.length} file JavaScript`);
if (fail) process.exit(1);
