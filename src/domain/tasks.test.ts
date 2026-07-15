import { describe, expect, it } from 'vitest';
import { normalizeDeadline } from './tasks.js';

describe('normalizeDeadline', () => {
  it('normalizes a valid date to an ISO YYYY-MM-DD string', () => {
    expect(normalizeDeadline('2026-08-01')).toBe('2026-08-01');
    expect(normalizeDeadline('2026-08-01T09:00:00Z')).toBe('2026-08-01');
  });

  it('returns null for an unparseable date', () => {
    expect(normalizeDeadline('not-a-date')).toBeNull();
    expect(normalizeDeadline('')).toBeNull();
  });
});
