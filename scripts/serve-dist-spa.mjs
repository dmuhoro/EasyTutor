// Serves the exported SPA (dist/) the way Vercel does, and proves the
// platform contract the app depends on: every client route returns the app
// shell, while a missing asset still 404s.
//
//   node scripts/serve-dist-spa.mjs            # verify, exit non-zero on failure
//   node scripts/serve-dist-spa.mjs --serve    # keep serving (Playwright, manual QA)
//   PORT=4173 node scripts/serve-dist-spa.mjs --serve
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const INDEX = join(DIST, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(INDEX)) {
  console.error('[SPA] dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

/** Resolve a URL path to a file inside dist/, or null. Never escapes dist/. */
function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const abs = join(DIST, clean);
  if (abs !== DIST && !abs.startsWith(DIST + sep)) return null;
  if (!existsSync(abs)) return null;
  const st = statSync(abs);
  if (st.isDirectory()) {
    const nested = join(abs, 'index.html');
    return existsSync(nested) ? nested : null;
  }
  return abs;
}

export function createSpaServer() {
  return createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain' });
      return res.end('Method Not Allowed');
    }

    const file = resolveFile(pathname);
    if (file) {
      res.writeHead(200, {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      if (req.method === 'HEAD') return res.end();
      return createReadStream(file).pipe(res);
    }

    // A path that names a file (has an extension) must 404 — the SPA fallback
    // must never turn a missing chunk into HTML, or the app boots to a blank
    // page with a JSON parse error instead of a real 404.
    if (extname(pathname)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    // Client route → app shell.
    res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(INDEX).pipe(res);
  });
}

const CLIENT_ROUTES = ['/', '/login', '/study', '/update-password', '/quiz', '/profile', '/settings'];
const ASSET_404 = '/_expo/static/js/web/does-not-exist-0000.js';

async function verify(port) {
  const base = `http://127.0.0.1:${port}`;
  const shell = await (await fetch(base + '/')).text();
  const failures = [];
  const rows = [];

  for (const route of CLIENT_ROUTES) {
    const res = await fetch(base + route);
    const body = await res.text();
    const isShell = body === shell;
    const ok = res.status === 200 && (res.headers.get('content-type') || '').startsWith('text/html') && isShell;
    rows.push({ route, status: res.status, shell: isShell, ok });
    if (!ok) failures.push(`${route} → ${res.status} shell=${isShell}`);
  }

  const missing = await fetch(base + ASSET_404);
  rows.push({ route: ASSET_404, status: missing.status, shell: false, ok: missing.status === 404 });
  if (missing.status !== 404) failures.push(`${ASSET_404} → ${missing.status} (expected 404)`);

  for (const asset of ['/manifest.json', '/service-worker.js']) {
    const res = await fetch(base + asset);
    const ok = res.status === 200;
    rows.push({ route: asset, status: res.status, shell: false, ok });
    if (!ok) failures.push(`${asset} → ${res.status}`);
  }

  const width = Math.max(...rows.map((r) => r.route.length));
  console.log('\n[SPA] dist/ route contract\n');
  for (const r of rows) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.route.padEnd(width)}  ${r.status}${r.shell ? '  (app shell)' : ''}`);
  }

  if (failures.length) {
    console.error(`\n[SPA] ${failures.length} failure(s):`);
    for (const f of failures) console.error('  - ' + f);
    return false;
  }
  console.log(`\n[SPA] OK — ${CLIENT_ROUTES.length} client routes serve the app shell, assets keep their status.`);
  return true;
}

const argv = process.argv.slice(2);
const serveMode = argv.includes('--serve');
const port = Number(process.env.PORT || (serveMode ? 4173 : 0));

const server = createSpaServer();
server.listen(port, '127.0.0.1', async () => {
  const actual = server.address().port;
  if (serveMode) {
    console.log(`[SPA] serving dist/ with SPA fallback → http://127.0.0.1:${actual}`);
    return;
  }
  const ok = await verify(actual);
  server.close(() => process.exit(ok ? 0 : 1));
});
