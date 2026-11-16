import { createReadStream, watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
const liveReload = !preview && !process.argv.includes('--no-reload');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || (preview ? 4174 : 4173));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const routes = JSON.parse(await readFile(join(root, 'tools/routes.json'), 'utf8'));
const directory = preview ? join(root, 'dist') : root;
if (preview) await stat(join(directory, 'index.html')).catch(() => { throw new Error('Run npm run build before npm run preview'); });
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
const clients = new Set();
const reload = '<script>const updates=new EventSource("/__dev_events");updates.onmessage=()=>location.reload();</script>';

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (liveReload && pathname === '/__dev_events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      response.write(': connected\n\n');
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    const route = routes.find(item => item.url === pathname || '/' + item.output === pathname || (item.url !== '/' && item.url.slice(0, -1) === pathname));
    if (route && pathname !== route.url) { response.writeHead(302, { Location: route.url + url.search }).end(); return; }
    if (!route && !pathname.startsWith('/assets/') && !pathname.startsWith('/src/')) { response.writeHead(404).end('Not found'); return; }
    const target = resolve(directory, route ? preview ? route.output : route.source : '.' + pathname);
    const local = relative(directory, target);
    if (local.startsWith('..' + sep) || local === '..' || isAbsolute(local)) { response.writeHead(403).end(); return; }
    const info = await stat(target);
    if (!info.isFile()) { response.writeHead(404).end('Not found'); return; }
    const headers = { 'Content-Type': types[extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (!preview && extname(target) === '.html') {
      const html = (await readFile(target, 'utf8')).replace('</body>', (liveReload ? reload : '') + '</body>');
      response.writeHead(200, { ...headers, 'Content-Length': Buffer.byteLength(html) });
      response.end(request.method === 'HEAD' ? undefined : html);
      return;
    }
    let start = 0, end = info.size - 1;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      if (!range[1]) start = Math.max(0, info.size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    response.writeHead(request.headers.range ? 206 : 200, { ...headers, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') response.end();
    else createReadStream(target, { start, end }).on('error', () => response.destroy()).pipe(response);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500).end('Unable to load this file');
  }
});

if (liveReload) {
  let timer;
  for (const folder of ['pages', 'src', 'assets']) {
    watch(join(root, folder), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { for (const client of clients) client.write('data: reload\n\n'); }, 150);
    });
  }
}
server.listen(port, '127.0.0.1', () => console.log(`${preview ? 'Preview' : 'Development'}: http://localhost:${port}/ — Hobby: /hobby/`));
