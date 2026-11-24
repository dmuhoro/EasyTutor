import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  BUNDLED_PACK_SOURCES,
  getBundledPack,
  hasBundledPack,
  subjectsForCountry,
  topicsForCountry,
} from '../../../lib/curriculum/runtime';
import { validatePackSources } from '../../../lib/curriculum/runtimeValidation';
import { buildSystemPrompt } from '../../../services/systemPrompts';
import { buildCurriculumPrompt } from '../../../services/curriculumPrompt';

/**
 * C26 / GT-02 / E7-T1 — curriculum packs must be usable at runtime in the
 * browser bundle. The old registry used Node `fs` and had zero consumers.
 * These tests exercise the shipped runtime module and its real consumer in the
 * system prompt; the fs-based authoring registry test remains unchanged.
 */

const validSource = {
  file: 'valid.json',
  data: {
    country: 'UG',
    level: 'secondary',
    board: 'NCDC',
    subjects: [{ id: 'ug-math', name: 'Mathematics', level: 'secondary' }],
    topics: [{ id: 't1', subject_id: 'ug-math', title: 'Algebra', sort_order: 1 }],
    source_status: 'DRAFT',
    version: '1.0.0',
  },
};

const temporaryDirs: string[] = [];

afterEach(() => {
  while (temporaryDirs.length > 0) {
    const dir = temporaryDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('bundled curriculum runtime', () => {
  it('does not import Node fs or path', () => {
    const source = readFileSync(
      join(process.cwd(), 'lib', 'curriculum', 'runtime.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/from\s+['"](fs|node:fs|path|node:path)['"]/);
  });

  it('loads and validates the shipped pack with a working directory that has no packs folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'easytutor-runtime-'));
    temporaryDirs.push(dir);
    const previous = process.cwd();
    process.chdir(dir);
    try {
      expect(existsSync(join(dir, 'lib', 'curriculum', 'packs'))).toBe(false);
      vi.resetModules();
      const fresh = await import('../../../lib/curriculum/runtime');
      expect(fresh.hasBundledPack('KE')).toBe(true);
      expect(fresh.subjectsForCountry('KE').map((entry) => entry.id)).toContain('tvet-ke-automotive');
    } finally {
      process.chdir(previous);
    }
  });

  it('exposes country/subject queries and fails closed for unknown codes', () => {
    expect(validatePackSources(BUNDLED_PACK_SOURCES).errors).toEqual([]);
    expect(hasBundledPack('ke')).toBe(true);
    expect(getBundledPack('KE')?.country).toBe('KE');
    expect(subjectsForCountry('KE').map((s) => s.id)).toContain('tvet-ke-automotive');
    expect(topicsForCountry('KE', 'tvet-ke-automotive')).toEqual([]);
    expect(subjectsForCountry('ZZ')).toEqual([]);
    expect(topicsForCountry('ZZ', 'anything')).toEqual([]);
  });

  it('rejects malformed packs and orphan topic references at the real validation boundary', () => {
    const malformed = validatePackSources([{ file: 'bad.json', data: { country: 'KE' } }]);
    expect(malformed.packs.size).toBe(0);
    expect(malformed.errors[0].file).toBe('bad.json');

    const orphan = validatePackSources([{
      file: 'orphan.json',
      data: {
        ...validSource.data,
        topics: [{ id: 't2', subject_id: 'not-declared', title: 'Orphan' }],
      },
    }]);
    expect(orphan.packs.size).toBe(0);
    expect(orphan.errors[0].errors[0].message).toContain('undeclared subject_id');

    const accepted = validatePackSources([validSource]);
    expect(accepted.errors).toEqual([]);
    expect(accepted.packs.get('UG')?.pack.subjects[0].name).toBe('Mathematics');
  });

  it('is consumed by the live system prompt without claiming an official syllabus', () => {
    const withPack = buildSystemPrompt({
      mode: 'high_school',
      localeCountry: 'KE',
      subject: 'tvet-ke-automotive',
      curriculumText: buildCurriculumPrompt('KE', 'tvet-ke-automotive'),
    });
    expect(withPack).toContain('CURRICULUM PACK INDEX (DRAFT');
    expect(withPack).toContain('Automotive Engineering');
    expect(withPack).toContain('NOT an official syllabus');

    const withoutPack = buildSystemPrompt({
      mode: 'high_school',
      localeCountry: 'ZZ',
      curriculumText: buildCurriculumPrompt('ZZ'),
    });
    expect(withoutPack).not.toContain('CURRICULUM PACK INDEX');
  });
});
