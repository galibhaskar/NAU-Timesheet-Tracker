/**
 * Shared constants for the main process.
 * API_BASE_URL is read from the VITE_API_URL build-time env var,
 * with a fallback to localhost for development.
 */
export const API_BASE_URL: string =
  process.env['VITE_API_URL'] ?? 'http://localhost:3000'

/** Minimum screenshot interval in milliseconds (5 minutes) */
export const SCREENSHOT_INTERVAL_MIN_MS = 5 * 60 * 1000

/** Maximum screenshot interval in milliseconds (10 minutes) */
export const SCREENSHOT_INTERVAL_MAX_MS = 10 * 60 * 1000

/** Idle poll interval in milliseconds */
export const IDLE_POLL_INTERVAL_MS = 15 * 1000

/** Idle threshold before auto-pause (5 minutes in seconds) */
export const IDLE_THRESHOLD_SECONDS = 5 * 60

/** Threshold to consider "active again" after idle (seconds) */
export const IDLE_ACTIVE_THRESHOLD_SECONDS = 30

/** Upload retry interval (30 seconds) */
export const UPLOAD_RETRY_INTERVAL_MS = 30 * 1000

/** Maximum upload retries */
export const UPLOAD_MAX_RETRIES = 5

/** Session tick interval (1 second) */
export const TICK_INTERVAL_MS = 1000
