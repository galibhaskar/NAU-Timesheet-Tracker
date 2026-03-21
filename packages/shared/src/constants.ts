// ─── Timeouts & Intervals ────────────────────────────────────────────────────

/** Default idle timeout in minutes before auto-stopping a session */
export const DEFAULT_IDLE_TIMEOUT = 15;

/** Default screenshot capture interval in minutes */
export const DEFAULT_SCREENSHOT_INTERVAL = 5;

/** Maximum allowed session duration in hours */
export const DEFAULT_MAX_SESSION_HOURS = 8;

/** Default data retention period in days (~7 years) */
export const DEFAULT_RETENTION_DAYS = 2555;

// ─── Limits ──────────────────────────────────────────────────────────────────

/** Default maximum hours per week for a TA */
export const DEFAULT_MAX_HOURS_PER_WEEK = 20;

/** Maximum file size for screenshot uploads in bytes (5 MB) */
export const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

/** Maximum file size for photo proof uploads in bytes (10 MB) */
export const MAX_PHOTO_PROOF_SIZE = 10 * 1024 * 1024;

// ─── Date/Time ───────────────────────────────────────────────────────────────

/** The timezone used for all date calculations */
export const APP_TIMEZONE = 'America/Phoenix';

/** Week starts on Monday (ISO standard) */
export const WEEK_START_DAY = 1; // Monday

// ─── S3 ──────────────────────────────────────────────────────────────────────

/** S3 key prefix for screenshots */
export const S3_SCREENSHOT_PREFIX = 'screenshots';

/** S3 key prefix for photo proofs */
export const S3_PHOTO_PROOF_PREFIX = 'photo-proofs';

/** Presigned URL expiration in seconds (15 minutes) */
export const PRESIGNED_URL_EXPIRY = 900;

// ─── Pagination ──────────────────────────────────────────────────────────────

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size for paginated queries */
export const MAX_PAGE_SIZE = 100;
