import { describe, it, expect } from 'vitest';
import { safeEval } from '../../lib/safeEval';

describe('safeEval — deterministic calculation verification', () => {
  describe('valid arithmetic', () => {
    it('evaluates simple addition', () => {
      expect(safeEval('2 + 3')).toEqual({ ok: true, value: 5 });
    });

    it('evaluates subtraction', () => {
      expect(safeEval('10 - 4')).toEqual({ ok: true, value: 6 });
    });

    it('evaluates multiplication', () => {
      expect(safeEval('6 * 7')).toEqual({ ok: true, value: 42 });
    });

    it('evaluates division', () => {
      expect(safeEval('100 / 4')).toEqual({ ok: true, value: 25 });
    });

    it('evaluates decimals', () => {
      expect(safeEval('3.5 + 2.5')).toEqual({ ok: true, value: 6 });
    });

    it('respects operator precedence', () => {
      expect(safeEval('2 + 3 * 4')).toEqual({ ok: true, value: 14 });
    });

    it('respects parentheses', () => {
      expect(safeEval('(2 + 3) * 4')).toEqual({ ok: true, value: 20 });
    });

    it('handles nested parentheses', () => {
      expect(safeEval('((1 + 2) * (3 + 4))')).toEqual({ ok: true, value: 21 });
    });

    it('handles unary minus', () => {
      expect(safeEval('-5 + 3')).toEqual({ ok: true, value: -2 });
    });

    it('handles complex expression', () => {
      expect(safeEval('10 / 2 + 3 * (4 - 1)')).toEqual({ ok: true, value: 14 });
    });
  });

  describe('rejected / unsafe input', () => {
    it('rejects empty string', () => {
      expect(safeEval('')).toEqual({ ok: false });
    });

    it('rejects whitespace only', () => {
      expect(safeEval('   ')).toEqual({ ok: false });
    });

    it('rejects letters / variables', () => {
      expect(safeEval('x + 1')).toEqual({ ok: false });
      expect(safeEval('abc')).toEqual({ ok: false });
    });

    it('rejects function calls', () => {
      expect(safeEval('sqrt(4)')).toEqual({ ok: false });
      expect(safeEval('pow(2, 3)')).toEqual({ ok: false });
    });

    it('rejects exponentiation', () => {
      expect(safeEval('2 ^ 3')).toEqual({ ok: false });
      expect(safeEval('2 ** 3')).toEqual({ ok: false });
    });

    it('rejects division by zero', () => {
      expect(safeEval('1 / 0')).toEqual({ ok: false });
      expect(safeEval('1 / (5 - 5)')).toEqual({ ok: false });
    });

    it('rejects malformed syntax', () => {
      expect(safeEval('+ + 1')).toEqual({ ok: false });
      expect(safeEval('1 +')).toEqual({ ok: false });
      expect(safeEval('(1 + 2')).toEqual({ ok: false });
      expect(safeEval('1 + 2)')).toEqual({ ok: false });
      expect(safeEval('()')).toEqual({ ok: false });
    });

    it('rejects null / undefined input', () => {
      expect(safeEval(null as any)).toEqual({ ok: false });
      expect(safeEval(undefined as any)).toEqual({ ok: false });
    });
  });
});
