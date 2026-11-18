#!/usr/bin/env node
/**
 * Stitch asset sync — pulls a Stitch project's screens into the repo as
 * design references (screenshot + exported HTML) under `docs/design/stitch/`.
 *
 * These files are REFERENCES ONLY. The product is React Native + NativeWind;
 * the Stitch HTML/Tailwind export is never imported at runtime.
 *
 * Auth: reads `STITCH_API_KEY` from the environment. Never accept the key as an
 * argument (it would land in shell history and process listings).
 *
 * Usage:
 *   STITCH_API_KEY=... node scripts/design/stitch_sync.mjs \
 *     --project 8672350964718206202 --out docs/design/stitch
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ENDPOINT = 'https://stitch.googleapis.com/mcp';

function parseArgs(argv) {
  const args = { project: null, out: 'docs/design/stitch' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--project') args.project = argv[(i += 1)];
    else if (argv[i] === '--out') args.out = argv[(i += 1)];
  }
  if (!args.project) throw new Error('--project <id> is required');
  return args;
}

const apiKey = process.env.STITCH_API_KEY;
if (!apiKey) {
  console.error('STITCH_API_KEY is not set. Refusing to run (fail closed).');
  process.exit(2);
}

let nextId = 1;
async function rpc(method, params) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  if (!res.ok) throw new Error(`${method} failed: HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`${method} failed: ${body.error.message}`);
  return body.result;
}

async function callTool(name, args) {
  const result = await rpc('tools/call', { name, arguments: args });
  const text = (result.content ?? []).map((c) => c.text ?? '').join('');
  if (!text) return result.structuredContent ?? {};
  return JSON.parse(text);
}

/** "EasyTutor - You (Profile & Settings)" -> "you-profile-settings" */
function slugify(title) {
  return title
    .replace(/^EasyTutor\s*-\s*/i, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatFromMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('html')) return 'html';
  if (mime.includes('json')) return 'json';
  return mime.split('/').pop();
}

async function main() {
  const { project, out } = parseArgs(process.argv.slice(2));
  const projectMeta = await callTool('get_project', { name: `projects/${project}` });
  const { screens = [] } = await callTool('list_screens', { projectId: project });

  const seen = new Set();
  const manifest = {
    project: `projects/${project}`,
    title: projectMeta.title ?? null,
    designTheme: projectMeta.designTheme ?? null,
    syncedAt: new Date().toISOString(),
    screens: [],
  };

  for (const screen of screens) {
    const slug = slugify(screen.title ?? screen.name);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const dir = join(out, slug);
    await mkdir(dir, { recursive: true });

    const record = {
      slug,
      title: screen.title,
      name: screen.name,
      deviceType: screen.deviceType,
      width: screen.width,
      height: screen.height,
      files: {},
    };

    for (const kind of ['screenshot', 'htmlCode']) {
      const file = screen[kind];
      if (!file?.name) continue;
      const payload = await callTool('download_file', { name: file.name });
      const data = payload.image ?? payload.html ?? payload.content;
      if (!data) {
        console.warn(`  ! ${slug}: ${kind} returned no data`);
        continue;
      }
      const ext = formatFromMime(file.mimeType) === 'html' ? 'html' : formatFromMime(file.mimeType);
      const filename = kind === 'screenshot' ? `screenshot.${ext}` : `code.${ext}`;
      const path = join(dir, filename);
      const body = ext === 'html' ? data : Buffer.from(data, 'base64');
      await writeFile(path, body);
      record.files[kind] = `${slug}/${filename}`;
    }

    manifest.screens.push(record);
    console.log(`  + ${slug}`);
  }

  await mkdir(dirname(join(out, 'manifest.json')), { recursive: true });
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${manifest.screens.length} screens -> ${out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
