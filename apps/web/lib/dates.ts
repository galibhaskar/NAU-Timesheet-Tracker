import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

export const NAU_TIMEZONE = 'America/Phoenix';

/** Get the Monday (week start) for a given date in Phoenix timezone */
export function getWeekStart(date: Date): Date {
  const zonedDate = toZonedTime(date, NAU_TIMEZONE);
  // date-fns weekStartsOn: 1 = Monday
  const mondayZoned = startOfWeek(zonedDate, { weekStartsOn: 1 });
  // Return as UTC Date representing midnight Phoenix time
  return fromZonedTime(
    new Date(mondayZoned.getFullYear(), mondayZoned.getMonth(), mondayZoned.getDate(), 0, 0, 0),
    NAU_TIMEZONE
  );
}

/** Get Sunday (week end) for a given week start */
export function getWeekEnd(weekStart: Date): Date {
  return addDays(weekStart, 6);
}

/** Format a date in Phoenix timezone for display */
export function formatPhoenix(date: Date, fmt: string): string {
  return format(toZonedTime(date, NAU_TIMEZONE), fmt, { timeZone: NAU_TIMEZONE });
}

/** Check if a timestamp drift exceeds 30 seconds */
export function hasDrift(serverTs: Date, clientTs: Date | null): boolean {
  if (!clientTs) return false;
  return Math.abs(serverTs.getTime() - clientTs.getTime()) > 30_000;
}
