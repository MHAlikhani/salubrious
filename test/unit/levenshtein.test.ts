import { describe, it, expect } from 'vitest';
import { levenshtein } from '../../src/signals/signal-registry.ts';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('calculates distance correctly', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('handles single character differences', () => {
    expect(levenshtein('react', 'reat')).toBe(1);
    expect(levenshtein('lodash', 'lodash')).toBe(0);
  });
});