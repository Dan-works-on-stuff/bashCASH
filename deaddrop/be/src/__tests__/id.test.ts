import { describe, it, expect } from 'vitest';
import { generateId } from '../services/id.js';

describe('generateId', () => {
  it('returns a 12-character string', () => {
    const id = generateId();
    expect(id).toHaveLength(12);
  });

  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
