import { computeSessionTotals, getMinuteMark } from '@/lib/services/session-calculator';
import type { SessionEvent } from '@prisma/client';

function makeEvent(
  eventType: 'STARTED' | 'PAUSED' | 'RESUMED' | 'STOPPED',
  serverTimestamp: Date
): SessionEvent {
  return {
    id: Math.random().toString(),
    sessionId: 'test-session',
    eventType,
    serverTimestamp,
    clientTimestamp: null,
    createdAt: serverTimestamp,
  };
}

describe('computeSessionTotals', () => {
  it('returns zero totals for empty events', () => {
    const result = computeSessionTotals([]);
    expect(result.activeMinutes).toBe(0);
    expect(result.idleMinutes).toBe(0);
    expect(result.netHours).toBe(0);
  });

  it('computes active time for a simple start → stop (30 min)', () => {
    const start = new Date('2026-03-17T09:00:00Z');
    const stop = new Date('2026-03-17T09:30:00Z');
    const events = [makeEvent('STARTED', start), makeEvent('STOPPED', stop)];
    const result = computeSessionTotals(events);
    expect(result.activeMinutes).toBe(30);
    expect(result.idleMinutes).toBe(0);
    expect(result.netHours).toBe(0.5);
  });

  it('computes active and idle time for start → pause → resume → stop', () => {
    const t0 = new Date('2026-03-17T09:00:00Z');
    const t1 = new Date('2026-03-17T09:20:00Z'); // pause after 20 min
    const t2 = new Date('2026-03-17T09:35:00Z'); // resume after 15 min idle
    const t3 = new Date('2026-03-17T09:55:00Z'); // stop after 20 more min
    const events = [
      makeEvent('STARTED', t0),
      makeEvent('PAUSED', t1),
      makeEvent('RESUMED', t2),
      makeEvent('STOPPED', t3),
    ];
    const result = computeSessionTotals(events);
    expect(result.activeMinutes).toBe(40); // 20 + 20
    expect(result.idleMinutes).toBe(15);
    expect(result.netHours).toBe(0.67); // 40/60 rounded to 2dp
  });

  it('handles multiple pause/resume cycles', () => {
    const events = [
      makeEvent('STARTED', new Date('2026-03-17T10:00:00Z')),
      makeEvent('PAUSED',  new Date('2026-03-17T10:10:00Z')), // 10 min active
      makeEvent('RESUMED', new Date('2026-03-17T10:15:00Z')), // 5 min idle
      makeEvent('PAUSED',  new Date('2026-03-17T10:25:00Z')), // 10 min active
      makeEvent('RESUMED', new Date('2026-03-17T10:30:00Z')), // 5 min idle
      makeEvent('STOPPED', new Date('2026-03-17T10:40:00Z')), // 10 min active
    ];
    const result = computeSessionTotals(events);
    expect(result.activeMinutes).toBe(30);
    expect(result.idleMinutes).toBe(10);
  });

  it('handles events out of order (sorts by serverTimestamp)', () => {
    const events = [
      makeEvent('STOPPED',  new Date('2026-03-17T10:30:00Z')),
      makeEvent('STARTED',  new Date('2026-03-17T10:00:00Z')),
    ];
    const result = computeSessionTotals(events);
    expect(result.activeMinutes).toBe(30);
  });

  it('returns zero for a single STARTED event (no stop yet)', () => {
    const events = [makeEvent('STARTED', new Date('2026-03-17T10:00:00Z'))];
    const result = computeSessionTotals(events);
    expect(result.activeMinutes).toBe(0); // no closed window yet
  });
});

describe('getMinuteMark', () => {
  it('returns 0 for screenshot taken at session start', () => {
    const start = new Date('2026-03-17T09:00:00Z');
    expect(getMinuteMark(start, start)).toBe(0);
  });

  it('returns correct minute mark', () => {
    const start = new Date('2026-03-17T09:00:00Z');
    const captured = new Date('2026-03-17T09:07:30Z');
    expect(getMinuteMark(start, captured)).toBe(7); // floor of 7.5
  });
});
