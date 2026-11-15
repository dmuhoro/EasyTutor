import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CurriculumPackRegistry } from '../../../lib/curriculum/registry';

const TEST_DIR = join(process.cwd(), 'tests', 'tmp', 'curriculum-packs');

const validPack = {
  country: 'KE',
  level: 'tvet',
  board: 'TVET',
  subjects: [{ id: 'tvet-ke-automotive', name: 'Automotive Engineering', level: 'tvet' }],
  topics: [],
  source_status: 'DRAFT',
  version: '0.1.0',
};

const invalidPack = {
  country: 'bad-country-code',
  level: 'tvet',
  board: 'TVET',
  subjects: [],
  topics: [],
  source_status: 'DRAFT',
  version: '0.1.0',
};

const packWithOrphanTopic = {
  country: 'NG',
  level: 'tvet',
  board: 'TVET',
  subjects: [{ id: 'tvet-ng-auto', name: 'Automotive', level: 'tvet' }],
  topics: [{ id: 't-1', subject_id: 'nonexistent-subject', title: 'Topic', sort_order: 1 }],
  source_status: 'DRAFT',
  version: '0.1.0',
};

describe('CurriculumPackRegistry', () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads a valid pack', () => {
    writeFileSync(join(TEST_DIR, 'ke-tvet.json'), JSON.stringify(validPack));
    const registry = new CurriculumPackRegistry(TEST_DIR);
    const { packs, errors } = registry.loadAll();
    expect(packs.has('KE')).toBe(true);
    expect(errors).toHaveLength(0);
    const loaded = packs.get('KE');
    expect(loaded?.pack.country).toBe('KE');
    expect(loaded?.pack.source_status).toBe('DRAFT');
    expect(loaded?.sourceFile).toBe('ke-tvet.json');
  });

  it('rejects an invalid pack and records error', () => {
    writeFileSync(join(TEST_DIR, 'bad.json'), JSON.stringify(invalidPack));
    const registry = new CurriculumPackRegistry(TEST_DIR);
    const { packs, errors } = registry.loadAll();
    expect(packs.size).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].file).toBe('bad.json');
  });

  it('rejects pack with orphan topic subject_id', () => {
    writeFileSync(join(TEST_DIR, 'orphan.json'), JSON.stringify(packWithOrphanTopic));
    const registry = new CurriculumPackRegistry(TEST_DIR);
    const { packs, errors } = registry.loadAll();
    expect(packs.size).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].errors[0].message).toContain('undeclared subject_id');
  });

  it('get / getAll / has convenience methods work', () => {
    writeFileSync(join(TEST_DIR, 'ke-tvet.json'), JSON.stringify(validPack));
    const registry = new CurriculumPackRegistry(TEST_DIR);
    registry.loadAll();
    expect(registry.has('KE')).toBe(true);
    expect(registry.has('NG')).toBe(false);
    expect(registry.get('KE')?.pack.country).toBe('KE');
    expect(registry.getAll()).toHaveLength(1);
  });

  it('handles empty directory gracefully', () => {
    const registry = new CurriculumPackRegistry(TEST_DIR);
    const { packs, errors } = registry.loadAll();
    expect(packs.size).toBe(0);
    expect(errors).toHaveLength(0);
  });
});
