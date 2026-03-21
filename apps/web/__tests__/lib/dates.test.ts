import { getWeekStart, getWeekEnd, hasDrift } from '@/lib/dates';

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday input (Phoenix time)', () => {
    // Wednesday 2026-03-18 in UTC
    const wednesday = new Date('2026-03-18T12:00:00Z');
    const weekStart = getWeekStart(wednesday);
    // Should be Monday 2026-03-16 at 00:00 Phoenix time
    // Phoenix is UTC-7, so Monday midnight Phoenix = 07:00 UTC
    expect(weekStart.toISOString()).toBe('2026-03-16T07:00:00.000Z');
  });

  it('returns Monday for a Monday input', () => {
    const monday = new Date('2026-03-16T14:00:00Z');
    const weekStart = getWeekStart(monday);
    expect(weekStart.toISOString()).toBe('2026-03-16T07:00:00.000Z');
  });

  it('returns correct Monday for Sunday (end of week)', () => {
    const sunday = new Date('2026-03-22T20:00:00Z');
    const weekStart = getWeekStart(sunday);
    expect(weekStart.toISOString()).toBe('2026-03-16T07:00:00.000Z');
  });
});

describe('getWeekEnd', () => {
  it('returns Sunday 6 days after Monday', () => {
    const monday = new Date('2026-03-16T07:00:00.000Z');
    const weekEnd = getWeekEnd(monday);
    // Should be Sunday 2026-03-22
    expect(weekEnd.toISOString().startsWith('2026-03-22')).toBe(true);
  });
});

describe('hasDrift', () => {
  it('returns false when clientTimestamp is null', () => {
    expect(hasDrift(new Date(), null)).toBe(false);
  });

  it('returns false for < 30s drift', () => {
    const server = new Date('2026-03-17T10:00:00Z');
    const client = new Date('2026-03-17T10:00:25Z');
    expect(hasDrift(server, client)).toBe(false);
  });

  it('returns true for > 30s drift', () => {
    const server = new Date('2026-03-17T10:00:00Z');
    const client = new Date('2026-03-17T10:01:00Z');
    expect(hasDrift(server, client)).toBe(true);
  });

  it('returns true for negative drift (client behind)', () => {
    const server = new Date('2026-03-17T10:01:00Z');
    const client = new Date('2026-03-17T10:00:00Z');
    expect(hasDrift(server, client)).toBe(true);
  });
});
