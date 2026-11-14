import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const routes = JSON.parse(await readFile(join(root, 'tools/routes.json'), 'utf8'));
// Only the generated dist/ directory may be replaced.
if (dirname(output) !== root || output !== join(root, 'dist')) throw new Error('Invalid output directory');
const pages = await Promise.all(routes.map(async route => ({ ...route, html: await readFile(join(root, route.source)) })));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const folder of ['assets', 'src']) await cp(join(root, folder), join(output, folder), { recursive: true });
for (const page of pages) {
  const target = resolve(output, page.output);
  if (!target.startsWith(output + sep)) throw new Error('Invalid route output');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, page.html);
}
console.log(`Built ${routes.length} pages in dist/. Hobby is available at /hobby/.`);
