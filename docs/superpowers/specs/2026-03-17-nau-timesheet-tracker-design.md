# NAU TA Timesheet Tracker — Design Spec

## Problem

NAU instructors manage multiple TAs across multiple courses. TAs also work with other instructors, making it hard to track hours. The current system is honor-based: TAs manually enter hours and instructors blindly approve weekly. TAs can misrepresent hours, there's no proof of work, and no easy way to see budget utilization or justify budget increases.

## Solution

A two-component system — an **Electron desktop app** for TAs to track work with automatic proof capture, and a **Next.js web dashboard** for instructors and admins to review, approve, and manage budgets.

### Core Innovation
TAs start a work clock when they begin a task. The desktop app **automatically captures random screenshots** as proof of work. TAs cannot see or delete these screenshots — only instructors and admins can view them during review. An idle detection system auto-pauses the timer when no mouse/keyboard activity is detected, preventing clock padding.

### Anti-Fraud Guarantees
- **Single active session**: A TA may have at most one ACTIVE session at a time, globally across all course assignments. Starting a new session while one is active returns HTTP 409 with the active session ID.
- **Server-authoritative timing**: The server records its own timestamps for every start/pause/resume/stop event. `active_minutes` is always recomputed server-side from the `SessionEvent` log, never trusted from the client.
- **Screenshot frequency validation**: The server tracks expected screenshot intervals and flags sessions where screenshots are suspiciously sparse relative to active time.

---

## User Roles

| Role | Access | Primary Actions |
|------|--------|-----------------|
| **Admin** | All courses, all data | Configure budgets, manage users, audit logs, set system policies (idle timeout, retention period) |
| **Instructor** | Own assigned courses | Review submissions with screenshot proof, approve/reject, view TA cross-course hours, export reports |
| **TA** | Own assigned courses | Start/stop work clock, select course & category, add descriptions, upload photos for in-person work, submit weekly, export approved hours |

---

## System Architecture

```
┌──────────────────────────────────┐
│   Electron Desktop App (TA)      │
│   • Work clock timer             │
│   • Random screenshot capture    │
│   • Idle detection + auto-pause  │
│   • Photo upload (in-person)     │
└──────────────┬───────────────────┘
               │ REST API
               ▼
┌──────────────────────────────────┐
│   Next.js Web App + API          │
│   • API routes (shared by both)  │
│   • TA dashboard (submit/export) │
│   • Instructor dashboard (review)│
│   • Admin dashboard (budgets)    │
└──────────┬───────────┬───────────┘
           │           │
           ▼           ▼
     PostgreSQL    S3/R2 Storage
     (Prisma)      (screenshots,
                    photos, exports)
```

### Tech Stack
- **Desktop App**: Electron + React
- **Web App**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: NextAuth.js (email/password with invite links)
- **File Storage**: S3-compatible (AWS S3 or Cloudflare R2)
- **Deployment**: Vercel (web) + GitHub Releases (desktop app)

---

## Data Model

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| email | String (unique) | |
| name | String | |
| password | String (hashed) | |
| role | Enum: ADMIN, INSTRUCTOR, TA | |
| created_at | Timestamp | |

### Course
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| name | String | e.g., "Data Structures" |
| code | String | e.g., "CS 249" |
| semester | Enum: SPRING, SUMMER, FALL | |
| year | Int | |
| enrolled_students | Int | |
| hours_per_student | Decimal (default 0.15) | Admin-configurable per course |
| weekly_hour_budget | Virtual (computed) | = enrolled_students × hours_per_student |
| override_weekly_budget | Decimal (nullable) | When set, overrides the computed budget |
| created_at | Timestamp | |

### CourseAssignment
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| user_id | FK → User | |
| course_id | FK → Course | |
| role | Enum: INSTRUCTOR, TA | Role within this specific course |
| max_weekly_hours | Decimal (nullable) | Optional per-TA cap |
| created_at | Timestamp | |

### WorkSession
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| assignment_id | FK → CourseAssignment | |
| submission_id | FK → WeeklySubmission (nullable) | Set when submitted |
| category | Enum: GRADING, OFFICE_HOURS, LAB_PREP, TUTORING, MEETINGS, OTHER | |
| mode | Enum: SCREEN, IN_PERSON | |
| description | Text | Added when session ends |
| started_at | Timestamp | Server-recorded |
| ended_at | Timestamp (nullable) | Server-recorded; null while active |
| active_minutes | Int (computed) | Recomputed from SessionEvent log server-side |
| idle_minutes | Int (computed) | Recomputed from SessionEvent log server-side |
| net_hours | Decimal (computed) | = active_minutes / 60 |
| status | Enum: ACTIVE, PAUSED, COMPLETED | |
| created_at | Timestamp | |

**Constraint**: At most one ACTIVE session per user globally (unique partial index on `user_id` WHERE `status = 'ACTIVE'`).

### SessionEvent (server-authoritative timeline)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| session_id | FK → WorkSession | |
| event_type | Enum: STARTED, PAUSED, RESUMED, STOPPED | |
| server_timestamp | Timestamp | Recorded by server, not client |
| client_timestamp | Timestamp (nullable) | Client-reported, for drift detection |
| created_at | Timestamp | |

The server recomputes `active_minutes` and `idle_minutes` from this event log on every status change. The Electron client sends both its local timestamp and the server records its own — discrepancies > 30 seconds are flagged in the audit log.

### Screenshot
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| session_id | FK → WorkSession | |
| captured_at | Timestamp | |
| file_url | String | S3/R2 path |
| thumbnail_url | String | Compressed thumbnail |
| file_size | Int (bytes) | |
| minute_mark | Int | Minute within session |
| created_at | Timestamp | |

**Access control:** Screenshots are accessible only to INSTRUCTOR and ADMIN roles. Access is verified by walking the chain: `Screenshot.session_id → WorkSession.assignment_id → CourseAssignment.course_id`. An instructor must have a CourseAssignment with role INSTRUCTOR for that specific `course_id`. Admins can access all screenshots. S3/R2 URLs are never exposed directly — the API generates short-lived pre-signed URLs (15 min expiry) after verifying access.

### PhotoProof
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| session_id | FK → WorkSession | |
| file_name | String | |
| file_url | String | S3/R2 path |
| file_size | Int (bytes) | |
| caption | Text | TA describes what the photo shows |
| uploaded_at | Timestamp | |

**Access control:** Same chain as Screenshots — verified via `PhotoProof.session_id → WorkSession.assignment_id → CourseAssignment.course_id`. Instructor must be assigned to the course. Admins can access all. Pre-signed URLs only.

### WeeklySubmission
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| assignment_id | FK → CourseAssignment | |
| week_start | Date | Monday of the week (America/Phoenix timezone) |
| week_end | Date | Sunday of the week (derived: week_start + 6 days) |
| total_hours | Decimal | Sum of session net_hours |
| total_screenshots | Int | Count of screenshots across sessions |
| status | Enum: DRAFT, SUBMITTED, APPROVED, REJECTED | |
| reviewer_id | FK → User (nullable) | Instructor who reviewed |
| rejection_reason | Text (nullable) | |
| submitted_at | Timestamp (nullable) | |
| reviewed_at | Timestamp (nullable) | |
| exported | Boolean (default false) | |
| exported_at | Timestamp (nullable) | |
| dispute_hold | Boolean (default false) | When true, prevents proof purge |

**Week boundary**: Canonical week runs Monday 00:00 to Sunday 23:59:59 in America/Phoenix (NAU timezone). Sessions are assigned to the week containing their `started_at` timestamp.

**Rejection/resubmission flow**: When rejected, the TA can add more COMPLETED sessions from the same week and resubmit. Resubmission updates the existing record's status from REJECTED → SUBMITTED (preserving the same ID). Previous rejection reasons are preserved in an audit log entry, not overwritten — the `rejection_reason` field reflects only the most recent rejection. A submission can be rejected and resubmitted up to 3 times per week; after that, admin intervention is required.

**Dispute hold**: An instructor or admin can set `dispute_hold = true` to prevent the proof purge job from deleting screenshots/photos for this submission. Used when a payroll dispute, audit, or grade review is pending.

### SystemSettings
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| key | String (unique) | e.g., "idle_timeout_minutes", "proof_retention_days" |
| value | String | |
| updated_by | FK → User | |
| updated_at | Timestamp | |

Default settings:
- `idle_timeout_minutes`: 5
- `proof_retention_days`: 30
- `screenshot_interval_min`: 3
- `screenshot_interval_max`: 10

### AuditLog
| Field | Type | Notes |
|-------|------|-------|
| id | UUID (PK) | |
| user_id | FK → User | Who performed the action |
| action | Enum: SESSION_STARTED, SESSION_PAUSED, SESSION_RESUMED, SESSION_STOPPED, SUBMITTED, APPROVED, REJECTED, EXPORTED, SETTINGS_CHANGED, USER_INVITED, PROOF_PURGED | |
| entity_type | String | e.g., "WorkSession", "WeeklySubmission" |
| entity_id | UUID | |
| details | JSON | Additional context |
| ip_address | String | |
| created_at | Timestamp | |

---

## Workflows

### TA — Daily Work (Desktop App)

1. Open desktop app → Sign in → See assigned courses
2. Select course → Pick activity category → Choose mode (SCREEN or IN_PERSON)
3. Click **Start** → Timer begins, app minimizes to system tray
   - SCREEN mode: random screenshots captured every 3-10 minutes (admin-configurable)
   - IN_PERSON mode: no auto-capture, TA uploads photos when stopping
4. Work normally — app runs silently in background
5. **Idle detection**: After X minutes (admin-configurable, default 5) of no mouse/keyboard activity, timer auto-pauses with a desktop notification: "Timer paused — no activity detected." Timer resumes when activity detected.
6. Click **Stop** → Add description of work done → Session saved
7. For IN_PERSON sessions: upload photo proof (e.g., tutoring room, whiteboard)

### TA — Weekly Submit (Web Dashboard)

1. End of week → Open web dashboard → Review all sessions
2. See total hours per course (only hours and categories — no screenshot access)
3. Click **Submit Week** per course → Sessions bundled into WeeklySubmission
4. If REJECTED → See rejection reason, add more sessions, resubmit
5. If APPROVED → Click **Export** → Download CSV/PDF for NAU upload

### Instructor — Weekly Review (Web Dashboard)

1. Log in → See courses with pending submission count + budget bars
2. Select course → See all TA submissions for the week
3. For each TA submission:
   - See session breakdown: category, hours, description
   - **View screenshot gallery** for SCREEN sessions (thumbnails + full-size)
   - **View photo proofs** for IN_PERSON sessions
   - See TA's **total hours across ALL course assignments** (cross-course visibility)
   - Warning if TA appears overcommitted
4. **Approve** or **Reject** (with reason) each submission
5. Budget bar updates in real-time; warning if approving would exceed budget
6. Use screenshot evidence to justify budget increase requests to admin

### Admin — Oversight (Web Dashboard)

1. See all courses: green (on track), yellow (near limit), red (overspent)
2. Drill into any course: per-TA breakdown, weekly trends, screenshots
3. **Configure budget**: override `hours_per_student` for specific courses
4. **System settings**: idle timeout, proof retention period, screenshot intervals
5. **User management**: invite instructors/TAs, assign to courses
6. **Audit log**: searchable log of all system actions
7. **Proof retention**: background job auto-purges screenshots/photos older than retention period (post-approval)

---

## Key Design Decisions

1. **TAs cannot view screenshots** — Screenshots are proof for instructors/admins only. This simplifies the TA experience and prevents TAs from knowing exactly when captures happen.

2. **Idle detection with notification** — Timer auto-pauses on inactivity with a desktop notification. Prevents clock padding while being transparent.

3. **Auto-purge with retention policy** — Admin sets how long proof is retained after approval (default 30 days). Background cron job purges expired files from storage and marks records in DB.

4. **Cross-course TA visibility** — Instructors see a TA's total hours across all course assignments, not just their own course. Helps identify overcommitted TAs.

5. **Two proof modes** — SCREEN (auto-capture) for computer work, IN_PERSON (photo upload) for physical activities. Covers all TA work types.

6. **Export bridge to NAU** — Approved hours exported as CSV/PDF for upload to NAU's official timesheet system. Decouples our quality controls from institutional constraints.

7. **Admin-configurable settings** — Idle timeout, screenshot intervals, retention period, and budget formula are all admin-configurable rather than hardcoded.

---

## API Routes

### Session Management (Desktop App → API)
- `POST /api/sessions/start` — Start a new work session
- `POST /api/sessions/:id/pause` — Pause session (idle or manual)
- `POST /api/sessions/:id/resume` — Resume paused session
- `POST /api/sessions/:id/stop` — End session, add description. Returns 409 if session already COMPLETED.
- `POST /api/sessions/:id/screenshots` — Upload screenshot (from desktop app)
- `POST /api/sessions/:id/photos` — Upload photo proof

### Submissions (Web Dashboard)
- `POST /api/submissions/submit` — Submit week for a course. Only bundles COMPLETED sessions. Returns 422 with list of in-progress session IDs if any ACTIVE/PAUSED sessions exist for that course+week.
- `POST /api/submissions/:id/approve` — Instructor approves
- `POST /api/submissions/:id/reject` — Instructor rejects with reason
- `GET /api/export/:submissionId?format=csv|pdf` — Download approved hours. Accessible by TA (own submissions), INSTRUCTOR (their courses), and ADMIN (all). Export does NOT include screenshot/photo URLs — only hours, categories, descriptions, and dates.

### Admin
- `GET/PUT /api/admin/settings` — System settings CRUD
- `GET/PUT /api/admin/courses/:id/budget` — Override course budget
- `GET /api/admin/audit-log` — Search audit log
- `POST /api/admin/invite` — Invite user via email
- `POST /api/admin/purge-expired` — Trigger manual proof purge

### Dashboard Data
- `GET /api/dashboard/ta` — TA's courses, sessions, submissions
- `GET /api/dashboard/instructor` — Instructor's courses, pending reviews, budget status
- `GET /api/dashboard/admin` — All courses, overspend alerts, system stats
- `GET /api/ta/:userId/cross-course-hours` — TA's total hours across all assignments

---

## File Storage

- **Screenshots**: Captured as PNG, compressed to JPEG (quality 80%), stored in S3/R2 under `screenshots/{session_id}/{timestamp}.jpg`
- **Thumbnails**: Generated on upload, 200px wide, stored alongside originals
- **Photo proofs**: Stored as-is under `photos/{session_id}/{filename}`
- **Exports**: Generated on-demand, cached in `exports/{submission_id}.{csv|pdf}`
- **Retention**: Background job runs daily, deletes files older than `proof_retention_days` post-approval. Skips submissions with `dispute_hold = true`. Also purges proof from abandoned submissions (DRAFT or REJECTED status for > 90 days).

---

## Authentication & Authorization

- **Email/password** with bcrypt hashing
- **Invite flow**: Admin creates course → invites instructor/TA via email link → user sets password
- **Role-based middleware**: Routes check user role before allowing access
- **Screenshot/photo access**: Middleware enforces that only INSTRUCTOR (for their courses) and ADMIN can access proof files. TAs get 403.
- **Electron app auth**: Desktop app exchanges email/password for a JWT (short-lived, 1 hour) + refresh token (30 days). Tokens stored in Electron's `safeStorage` API (OS-level encryption). Refresh token rotates on each use. If refresh token expires, TA must re-login.
- **Target platforms**: macOS and Windows. Idle detection uses Electron's `powerMonitor.getSystemIdleTime()` API which works consistently on both platforms.

---

## Budget & Overspend

- `weekly_hour_budget` is a **virtual/computed value**, always derived at query time: `enrolled_students × hours_per_student`
- Default `hours_per_student = 0.15`, admin can override per course
- If an admin needs to set a completely custom budget that doesn't follow the formula, they can use `override_weekly_budget` (nullable Decimal field on Course). When set, this takes precedence over the computed value.
- Dashboard shows traffic-light status: green (< 80%), yellow (80-100%), red (> 100%)
- Overspend alerts visible on instructor and admin dashboards
- Audit log records when budget is exceeded
