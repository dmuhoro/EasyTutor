import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('[PWA] dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// 1. Copy public/ contents (manifest, service worker, icons) into dist/ so they
// are served at the root of the deployed site.
if (existsSync(PUBLIC)) {
  for (const entry of readdirSync(PUBLIC)) {
    cpSync(join(PUBLIC, entry), join(DIST, entry), { recursive: true, force: true });
  }
  console.log('[PWA] copied public/ contents -> dist/');
}

// 2. Inject manifest link + service-worker registration into dist/index.html
// so Chrome offers "Add to Home Screen" and the app works offline.
const indexPath = join(DIST, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const manifestLink = '<link rel="manifest" href="/manifest.json">';
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${manifestLink}\n  </head>`);
}

const swRegistration = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => console.log('[PWA] SW registered', reg.scope))
          .catch((err) => console.warn('[PWA] SW registration failed', err));
      });
    }
  </script>`;
if (!html.includes('service-worker.js')) {
  html = html.replace('</body>', `${swRegistration}\n  </body>`);
}

writeFileSync(indexPath, html);
console.log('[PWA] injected manifest link + service-worker registration into dist/index.html');
