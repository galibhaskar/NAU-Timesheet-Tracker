import type { SessionEvent } from '@prisma/client';

export interface SessionTotals {
  activeMinutes: number;
  idleMinutes: number;
  netHours: number;
}

/**
 * Recomputes active and idle minutes from the SessionEvent log.
 * Events must be ordered by serverTimestamp ASC.
 *
 * Algorithm:
 * - Walk events pairwise
 * - STARTED/RESUMED starts an "active window"
 * - PAUSED/STOPPED ends the active window → add elapsed to activeMinutes
 * - Time between PAUSED and next RESUMED → idle time
 */
export function computeSessionTotals(events: SessionEvent[]): SessionTotals {
  const sorted = [...events].sort(
    (a, b) => a.serverTimestamp.getTime() - b.serverTimestamp.getTime()
  );

  let activeMs = 0;
  let idleMs = 0;
  let activeWindowStart: Date | null = null;
  let pauseWindowStart: Date | null = null;

  for (const event of sorted) {
    const ts = event.serverTimestamp;

    switch (event.eventType) {
      case 'STARTED':
      case 'RESUMED':
        if (pauseWindowStart) {
          idleMs += ts.getTime() - pauseWindowStart.getTime();
          pauseWindowStart = null;
        }
        activeWindowStart = ts;
        break;

      case 'PAUSED':
        if (activeWindowStart) {
          activeMs += ts.getTime() - activeWindowStart.getTime();
          activeWindowStart = null;
        }
        pauseWindowStart = ts;
        break;

      case 'STOPPED':
        if (activeWindowStart) {
          activeMs += ts.getTime() - activeWindowStart.getTime();
          activeWindowStart = null;
        }
        if (pauseWindowStart) {
          idleMs += ts.getTime() - pauseWindowStart.getTime();
          pauseWindowStart = null;
        }
        break;
    }
  }

  const activeMinutes = Math.floor(activeMs / 60_000);
  const idleMinutes = Math.floor(idleMs / 60_000);
  const netHours = Math.round((activeMinutes / 60) * 100) / 100;

  return { activeMinutes, idleMinutes, netHours };
}

/** Returns minute mark (minutes elapsed since session start) for a screenshot timestamp */
export function getMinuteMark(sessionStartedAt: Date, capturedAt: Date): number {
  return Math.floor((capturedAt.getTime() - sessionStartedAt.getTime()) / 60_000);
}
