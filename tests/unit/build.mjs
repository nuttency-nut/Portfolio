import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const routes = JSON.parse(await readFile('tools/routes.json', 'utf8'));
execFileSync(process.execPath, ['tools/build.mjs'], { stdio: 'inherit', windowsHide: true });
assert.equal(routes.length, 8);
for (const route of routes) {
  assert.deepEqual(await readFile(route.source), await readFile(join('dist', route.output)), route.url);
}
assert.ok(routes.some(route => route.url === '/hobby/' && route.source === 'pages/hobby.html'));
assert.ok(!(await stat('dist/about/hobby').catch(() => null)), 'Old Hobby route is absent');
assert.ok(!(await stat('dist/pages').catch(() => null)), 'Authoring pages are not deployed');
assert.ok(!(await stat('dist/tools').catch(() => null)), 'Development tools are not deployed');
let files = 0;
for (const folder of ['assets', 'src']) {
  for (const name of await readdir(folder, { recursive: true })) {
    const path = join(folder, name);
    if (!(await stat(path)).isFile()) continue;
    const hash = data => createHash('sha256').update(data).digest('hex');
    assert.equal(hash(await readFile(path)), hash(await readFile(join('dist', path))), path);
    files++;
  }
}
console.log(`PASS: eight output routes, unchanged contents of ${files} assets/source files, /hobby/ and no authoring/tool files in dist.`);
