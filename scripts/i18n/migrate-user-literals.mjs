#!/usr/bin/env node
/**
 * One-time Sprint 85 codemod. Converts every literal rejected by
 * `check-no-user-literals.mjs` into a `t()` call and adds the key to en/sw/fr.
 * Kept in history so the mechanical transform is auditable.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { scanAll, scanSource } from './check-no-user-literals.mjs';

const ROOT = process.cwd();
const PACKS = ['en', 'sw', 'fr'];

function keyFor(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'literal';
  const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 8);
  return `screen.${slug}__${hash}`;
}

function relativeLocalePath(file) {
  const dir = path.dirname(file);
  const target = path.join(ROOT, 'src', 'locales');
  const rel = path.relative(dir, target).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function ensureImport(source, file) {
  if (/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*['"][^'"]*locales['"]/.test(source)) return source;
  return `import { t } from '${relativeLocalePath(file)}';\n${source}`;
}

function replacementFor(node, sourceFile, key) {
  if (node.kind === 'jsx-text') {
    const raw = sourceFile.text.slice(node.node.getStart(sourceFile), node.node.getEnd());
    const leading = raw.match(/^\s*/)?.[0] ?? '';
    const trailing = raw.match(/\s*$/)?.[0] ?? '';
    return `${leading}{t('${key}')}${trailing}`;
  }
  if (node.kind.startsWith('prop:')) return `{t('${key}')}`;
  return `t('${key}')`;
}

function main() {
  const { files } = scanAll(ROOT);
  const packs = Object.fromEntries(PACKS.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', `${locale}.json`), 'utf8')),
  ]));
  let changedFiles = 0;
  let replacements = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const detailed = scanSource(file, source, true);
    if (detailed.length === 0) continue;

    const edits = detailed.map((v) => {
      const key = keyFor(v.value);
      for (const locale of PACKS) packs[locale][key] = v.value;
      return {
        start: v.node.getStart(sf),
        end: v.node.getEnd(),
        text: replacementFor(v, sf, key),
      };
    });
    const sorted = edits.sort((a, b) => b.start - a.start);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i - 1].start < sorted[i].end) {
        throw new Error(`Overlapping i18n edits in ${path.relative(ROOT, file)}`);
      }
    }
    let next = source;
    for (const edit of sorted) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
    next = ensureImport(next, file);
    if (next !== source) fs.writeFileSync(file, next);
    changedFiles += 1;
    replacements += edits.length;
  }

  for (const locale of PACKS) {
    fs.writeFileSync(
      path.join(ROOT, 'src', 'locales', `${locale}.json`),
      `${JSON.stringify(packs[locale], null, 2)}\n`,
    );
  }
  console.log(`[I18N MIGRATE] ${replacements} literal(s) in ${changedFiles} file(s); keys added to ${PACKS.join(', ')}.`);
}

main();
