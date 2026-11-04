import { describe, it, expect } from 'vitest';
import { MATH_SKILLS, MATH_PREREQ_EDGES } from '../../src/domain/mathematics/skillGraph';
import { hasCycle, allPrerequisites } from '../../src/domain/learning/prerequisites';

describe('math skill graph', () => {
  it('is acyclic', () => expect(hasCycle([...MATH_SKILLS], MATH_PREREQ_EDGES)).toBe(false));
  it('equations has prereqs', () => expect(allPrerequisites('equations', MATH_PREREQ_EDGES).size).toBeGreaterThan(1));
});
