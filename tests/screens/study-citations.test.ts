import { describe, expect, it } from 'vitest';
import { citedSources } from '../../lib/citations';

describe('tutor citations', () => {
  it('only exposes retrieved sources explicitly cited in the answer', () => {
    const sources = [
      {
        reference: '[Bird Ch15 p.171]',
        source: 'Bird',
        chapter: '15',
        page: '171',
        excerpt: 'Friction resists motion.',
      },
      {
        reference: '[Zammit Ch4 p.44]',
        source: 'Zammit',
        chapter: '4',
        page: '44',
        excerpt: 'The coefficient of friction is dimensionless.',
      },
    ];

    expect(citedSources('The resistance is friction [Bird Ch15 p.171].', sources)).toEqual([
      {
        source: 'Bird',
        chapter: '15',
        page: '171',
        excerpt: 'Friction resists motion.',
      },
    ]);
  });

  it('does not invent citations when the answer contains no source marker', () => {
    expect(citedSources('Friction resists motion.', [{
      reference: '[Bird Ch15 p.171]',
      source: 'Bird',
      chapter: '15',
      page: '171',
      excerpt: 'Friction resists motion.',
    }])).toEqual([]);
  });
});
