import { describe, it, expect } from 'vitest';
import {
  CurriculumPackSchema,
  CurriculumPack,
  safeValidateCurriculumPack,
  validateCurriculumPack,
  packSubjectIds,
  packTopicSubjectIds,
} from '../../../lib/curriculum/schema';

const validPack: CurriculumPack = {
  country: 'KE',
  level: 'tvet',
  board: 'TVET',
  subjects: [
    { id: 'tvet-ke-automotive', name: 'Automotive Engineering', level: 'tvet', icon: '🚗' },
  ],
  topics: [],
  source_status: 'DRAFT',
  version: '0.1.0',
};

function parsePack(pack: unknown): { success: true; data: CurriculumPack } | { success: false; error: unknown } {
  try {
    const data = CurriculumPackSchema.parse(pack);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e };
  }
}

describe('CurriculumPackSchema', () => {
  it('accepts a valid minimal pack', () => {
    const result = parsePack(validPack);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('KE');
      expect(result.data.source_status).toBe('DRAFT');
    }
  });

  it('rejects missing country', () => {
    const pack = { ...validPack, country: '' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('rejects country code not exactly 2 letters', () => {
    const pack = { ...validPack, country: 'KEN' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('accepts valid levels', () => {
    for (const level of ['secondary', 'tvet', 'university', 'self_learner']) {
      const pack = { ...validPack, level };
      const result = parsePack(pack);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid level', () => {
    const pack = { ...validPack, level: 'primary' as unknown as 'tvet' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('rejects missing board', () => {
    const pack = { ...validPack, board: '' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('rejects empty subjects array', () => {
    const pack = { ...validPack, subjects: [] };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('accepts valid source_status values', () => {
    for (const status of ['OFFICIAL', 'COMMUNITY', 'DRAFT']) {
      const pack = { ...validPack, source_status: status };
      const result = parsePack(pack);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid source_status', () => {
    const pack = { ...validPack, source_status: 'UNKNOWN' as unknown as 'DRAFT' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('rejects non-semver version', () => {
    const pack = { ...validPack, version: '1' };
    const result = parsePack(pack);
    expect(result.success).toBe(false);
  });

  it('accepts semver version', () => {
    const pack = { ...validPack, version: '1.2.3' };
    const result = parsePack(pack);
    expect(result.success).toBe(true);
  });

  it('accepts topics with valid subject_id', () => {
    const packWithTopic = {
      ...validPack,
      topics: [
        { id: 'tvet-ke-auto-001', subject_id: 'tvet-ke-automotive', title: 'Engine Systems', sort_order: 1, subtopics: [] },
      ],
    };
    const result = parsePack(packWithTopic);
    expect(result.success).toBe(true);
  });
});

describe('safeValidateCurriculumPack', () => {
  it('returns ok:true for valid pack', () => {
    const result = safeValidateCurriculumPack(validPack);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.country).toBe('KE');
    }
  });

  it('returns ok:false with errors for invalid pack', () => {
    const pack = { ...validPack, country: 'bad' as unknown as string };
    const result = safeValidateCurriculumPack(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('validateCurriculumPack (throwing variant)', () => {
  it('throws on invalid pack', () => {
    const pack = { ...validPack, country: '' };
    expect(() => validateCurriculumPack(pack)).toThrow();
  });
});

describe('packSubjectIds / packTopicSubjectIds', () => {
  it('extracts subject ids from pack', () => {
    const ids = packSubjectIds(validPack);
    expect(ids.has('tvet-ke-automotive')).toBe(true);
  });

  it('extracts topic subject ids', () => {
    const packWithTopic = {
      ...validPack,
      topics: [
        { id: 't-1', subject_id: 'tvet-ke-automotive', title: 'Topic 1', sort_order: 1, subtopics: [] },
      ],
    };
    const ids = packTopicSubjectIds(packWithTopic);
    expect(ids.has('tvet-ke-automotive')).toBe(true);
  });
});
