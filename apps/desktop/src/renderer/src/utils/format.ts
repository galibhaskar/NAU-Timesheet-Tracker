/**
 * Utility functions for formatting time and hours.
 */

/**
 * Formats elapsed seconds into HH:MM:SS string.
 * e.g. 5025 → "01:23:45"
 */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/**
 * Formats decimal hours to a display string.
 * e.g. 2.5 → "2.5h", 1.0 → "1.0h"
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`
}
