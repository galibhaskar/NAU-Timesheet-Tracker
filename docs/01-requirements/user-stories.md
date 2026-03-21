# NAU TA Timesheet Tracker — User Stories

Derived from the [Design Spec](superpowers/specs/2026-03-17-nau-timesheet-tracker-design.md).

---

## Epic 1: Session Management

### US-01: Start a Work Session
**As a** TA, **I want to** start a timed work session for a specific course, category, and mode, **so that** my hours are tracked with server-authoritative timestamps.

**Acceptance Criteria:**
- [ ] AC1: TA can select a course (from their assigned courses), an activity category (GRADING, OFFICE_HOURS, LAB_PREP, TUTORING, MEETINGS, OTHER), and a mode (SCREEN or IN_PERSON).
- [ ] AC2: Clicking "Start" calls `POST /api/sessions/start` and begins the timer.
- [ ] AC3: The server records a `STARTED` SessionEvent with its own timestamp.
- [ ] AC4: The app minimizes to the system tray after starting.
- [ ] AC5: If the TA already has an ACTIVE session (any course), the API returns HTTP 409 with the active session ID.

### US-02: Pause a Work Session
**As a** TA, **I want to** pause my active session manually, **so that** breaks are not counted as work time.

**Acceptance Criteria:**
- [ ] AC1: A "Pause" button is available while a session is ACTIVE.
- [ ] AC2: Clicking "Pause" calls `POST /api/sessions/:id/pause` and the server records a `PAUSED` SessionEvent.
- [ ] AC3: The server recomputes `active_minutes` and `idle_minutes` from the SessionEvent log.
- [ ] AC4: The timer display shows a paused state.

### US-03: Resume a Paused Session
**As a** TA, **I want to** resume a paused session, **so that** I can continue tracking time after a break.

**Acceptance Criteria:**
- [ ] AC1: A "Resume" button is available while a session is PAUSED.
- [ ] AC2: Clicking "Resume" calls `POST /api/sessions/:id/resume` and the server records a `RESUMED` SessionEvent.
- [ ] AC3: The server recomputes `active_minutes` from the event log.
- [ ] AC4: Screenshot capture resumes (SCREEN mode only).

### US-04: Stop a Work Session
**As a** TA, **I want to** stop my session and add a description, **so that** the completed session is saved with context about what I did.

**Acceptance Criteria:**
- [ ] AC1: A "Stop" button is available while a session is ACTIVE or PAUSED.
- [ ] AC2: Stopping prompts the TA to enter a description of work done (required, 1-1000 characters).
- [ ] AC3: `POST /api/sessions/:id/stop` records a `STOPPED` SessionEvent and sets `ended_at`.
- [ ] AC4: Session status changes to COMPLETED.
- [ ] AC5: The server recomputes final `active_minutes`, `idle_minutes`, and `net_hours`.
- [ ] AC6: If the session is already COMPLETED, the API returns HTTP 409.

### US-05: Automatic Idle Detection and Auto-Pause
**As a** TA, **I want** the app to automatically pause my timer when I am idle, **so that** inactive time is not counted as work.

**Acceptance Criteria:**
- [ ] AC1: After X minutes of no mouse/keyboard activity (default 5, admin-configurable via `idle_timeout_minutes`), the timer auto-pauses.
- [ ] AC2: A desktop notification appears: "Timer paused — no activity detected."
- [ ] AC3: The idle pause is recorded as a `PAUSED` SessionEvent on the server.
- [ ] AC4: When activity is detected, the timer auto-resumes and a `RESUMED` SessionEvent is recorded.

### US-06: Automatic Screenshot Capture (SCREEN Mode)
**As a** TA working on-screen, **I want** the app to automatically capture screenshots at random intervals, **so that** proof of work is collected without my intervention.

**Acceptance Criteria:**
- [ ] AC1: In SCREEN mode, screenshots are captured at random intervals between `screenshot_interval_min` (default 3) and `screenshot_interval_max` (default 10) minutes.
- [ ] AC2: Screenshots are compressed to JPEG (quality 80%) and uploaded via `POST /api/sessions/:id/screenshots`.
- [ ] AC3: A thumbnail (200px wide) is generated on upload.
- [ ] AC4: The TA cannot see, preview, or delete captured screenshots.
- [ ] AC5: Screenshot capture pauses when the session is paused and resumes when resumed.
- [ ] AC6: The `minute_mark` field records the minute within the session when the capture occurred.

### US-07: Upload Photo Proof (IN_PERSON Mode)
**As a** TA doing in-person work, **I want to** upload photos as proof when I stop my session, **so that** my instructor can verify my in-person work.

**Acceptance Criteria:**
- [ ] AC1: When stopping an IN_PERSON session, the TA is prompted to upload photo proof.
- [ ] AC2: Each photo requires a caption (1-500 characters) describing what it shows.
- [ ] AC3: Photos are uploaded via `POST /api/sessions/:id/photos` as JPEG or PNG (max 10MB).
- [ ] AC4: Photos are stored under `photos/{session_id}/{filename}` in S3/R2.

### US-08: Desktop App Authentication
**As a** TA, **I want to** sign in to the desktop app with my email and password, **so that** my sessions are linked to my account.

**Acceptance Criteria:**
- [ ] AC1: The desktop app presents an email/password login form.
- [ ] AC2: On success, a JWT (1-hour expiry) and refresh token (30-day expiry) are issued.
- [ ] AC3: Tokens are stored using Electron's `safeStorage` API (OS-level encryption).
- [ ] AC4: The refresh token rotates on each use.
- [ ] AC5: If the refresh token expires, the TA must re-login.

---

## Epic 2: Submissions

### US-09: Submit Weekly Hours
**As a** TA, **I want to** submit my completed sessions for a week per course, **so that** my instructor can review and approve my hours.

**Acceptance Criteria:**
- [ ] AC1: The web dashboard shows all sessions for the current week grouped by course.
- [ ] AC2: The TA can see total hours and categories (but not screenshots).
- [ ] AC3: Clicking "Submit Week" calls `POST /api/submissions/submit` and bundles all COMPLETED sessions for that course and week into a WeeklySubmission.
- [ ] AC4: The submission status transitions from DRAFT to SUBMITTED.
- [ ] AC5: If any ACTIVE or PAUSED sessions exist for that course and week, the API returns HTTP 422 with a list of in-progress session IDs.

### US-10: View Submission Status
**As a** TA, **I want to** see the status of my weekly submissions (DRAFT, SUBMITTED, APPROVED, REJECTED), **so that** I know where each submission stands.

**Acceptance Criteria:**
- [ ] AC1: The TA dashboard shows all submissions with their current status.
- [ ] AC2: REJECTED submissions display the most recent rejection reason.
- [ ] AC3: APPROVED submissions show a link to export.

### US-11: Resubmit After Rejection
**As a** TA, **I want to** add more sessions and resubmit a rejected week, **so that** I can address the instructor's feedback.

**Acceptance Criteria:**
- [ ] AC1: When a submission is REJECTED, the TA sees the rejection reason.
- [ ] AC2: The TA can add more COMPLETED sessions from the same week to the submission.
- [ ] AC3: Resubmission updates the existing WeeklySubmission record from REJECTED to SUBMITTED (same ID preserved).
- [ ] AC4: Previous rejection reasons are preserved in audit log entries.
- [ ] AC5: A maximum of 3 rejection/resubmission cycles is allowed per week; after that, admin intervention is required.

### US-12: Week Boundary Handling
**As a** TA, **I want** my sessions to be grouped into the correct week (Monday-Sunday, America/Phoenix), **so that** submissions accurately reflect weekly work.

**Acceptance Criteria:**
- [ ] AC1: Weeks run Monday 00:00 to Sunday 23:59:59 in America/Phoenix timezone.
- [ ] AC2: Sessions are assigned to the week containing their `started_at` timestamp.
- [ ] AC3: The `week_start` field on submissions is always a Monday.

---

## Epic 3: Review

### US-13: View Pending Submissions
**As an** instructor, **I want to** see all pending submissions for my courses with budget status, **so that** I can prioritize my review work.

**Acceptance Criteria:**
- [ ] AC1: The instructor dashboard lists courses with a count of pending (SUBMITTED) submissions.
- [ ] AC2: Budget bars show current utilization with traffic-light colors: green (< 80%), yellow (80-100%), red (> 100%).
- [ ] AC3: Only courses the instructor is assigned to are shown.

### US-14: Review a TA Submission with Screenshots
**As an** instructor, **I want to** review a TA's submission by viewing session details and screenshot evidence, **so that** I can verify the work was actually performed.

**Acceptance Criteria:**
- [ ] AC1: For each submission, the instructor sees a session breakdown: category, hours, and description.
- [ ] AC2: For SCREEN sessions, a screenshot gallery is available with thumbnails and full-size views.
- [ ] AC3: For IN_PERSON sessions, photo proofs with captions are displayed.
- [ ] AC4: Screenshot/photo URLs are short-lived pre-signed URLs (15-minute expiry).
- [ ] AC5: Sessions where screenshots are suspiciously sparse relative to active time are flagged.

### US-15: View TA Cross-Course Hours
**As an** instructor, **I want to** see a TA's total hours across all their course assignments, **so that** I can identify overcommitted TAs.

**Acceptance Criteria:**
- [ ] AC1: During review, the instructor sees the TA's total weekly hours across all courses.
- [ ] AC2: A warning is displayed if the TA appears overcommitted.
- [ ] AC3: Data is retrieved via `GET /api/ta/:userId/cross-course-hours`.

### US-16: Approve a Submission
**As an** instructor, **I want to** approve a TA's weekly submission, **so that** the hours are finalized and available for export.

**Acceptance Criteria:**
- [ ] AC1: Clicking "Approve" calls `POST /api/submissions/:id/approve`.
- [ ] AC2: The submission status changes to APPROVED (terminal state).
- [ ] AC3: The reviewer_id and reviewed_at fields are set.
- [ ] AC4: The budget bar updates in real-time to reflect the newly approved hours.
- [ ] AC5: A warning is shown if approving would cause the course budget to be exceeded.
- [ ] AC6: An audit log entry is created.

### US-17: Reject a Submission
**As an** instructor, **I want to** reject a TA's submission with a reason, **so that** the TA knows what to fix before resubmitting.

**Acceptance Criteria:**
- [ ] AC1: Clicking "Reject" prompts for a rejection reason (required, 1-1000 characters).
- [ ] AC2: `POST /api/submissions/:id/reject` sets the status to REJECTED and stores the reason.
- [ ] AC3: The reviewer_id and reviewed_at fields are set.
- [ ] AC4: An audit log entry is created including the rejection reason.
- [ ] AC5: The TA is able to see the rejection reason on their dashboard.

### US-18: Set Dispute Hold
**As an** instructor, **I want to** place a dispute hold on a submission, **so that** proof files are preserved during a payroll dispute or audit.

**Acceptance Criteria:**
- [ ] AC1: The instructor can toggle `dispute_hold` on a submission.
- [ ] AC2: When `dispute_hold = true`, the proof purge job skips this submission's screenshots and photos.
- [ ] AC3: An audit log entry is created when dispute hold is toggled.

---

## Epic 4: Admin

### US-19: Manage Course Budgets
**As an** admin, **I want to** configure budget parameters per course, **so that** weekly hour budgets reflect actual course needs.

**Acceptance Criteria:**
- [ ] AC1: The admin can update `hours_per_student` (positive decimal, default 0.15) for any course via `PUT /api/admin/courses/:id/budget`.
- [ ] AC2: The admin can set an `override_weekly_budget` (positive decimal or null) that overrides the computed formula.
- [ ] AC3: The computed `weekly_hour_budget` equals `enrolled_students x hours_per_student` unless overridden.
- [ ] AC4: Changes are recorded in the audit log.

### US-20: Manage System Settings
**As an** admin, **I want to** configure system-wide settings (idle timeout, screenshot intervals, proof retention), **so that** the system adapts to institutional policies.

**Acceptance Criteria:**
- [ ] AC1: The admin can view and update settings via `GET/PUT /api/admin/settings`.
- [ ] AC2: Valid setting keys include: `idle_timeout_minutes`, `proof_retention_days`, `screenshot_interval_min`, `screenshot_interval_max`.
- [ ] AC3: Each setting update records the `updated_by` user and `updated_at` timestamp.
- [ ] AC4: Changes are recorded in the audit log with old and new values.

### US-21: Invite Users
**As an** admin, **I want to** invite instructors and TAs via email and assign them to courses, **so that** users can access the system with correct permissions.

**Acceptance Criteria:**
- [ ] AC1: `POST /api/admin/invite` accepts an email, role (ADMIN, INSTRUCTOR, TA), and optional course_id.
- [ ] AC2: An invite link is sent to the user's email.
- [ ] AC3: The invited user clicks the link and sets their password.
- [ ] AC4: For INSTRUCTOR and TA roles, a CourseAssignment is created linking them to the specified course.
- [ ] AC5: An audit log entry is created for the invitation.

### US-22: View Audit Log
**As an** admin, **I want to** search and browse the audit log, **so that** I can investigate issues and maintain accountability.

**Acceptance Criteria:**
- [ ] AC1: `GET /api/admin/audit-log` returns a paginated, searchable list of audit entries.
- [ ] AC2: Entries include: user, action type, entity type/ID, details (JSON), IP address, and timestamp.
- [ ] AC3: The admin can filter by action type, user, entity, and date range.

### US-23: Admin Dashboard Overview
**As an** admin, **I want to** see a traffic-light overview of all courses, **so that** I can quickly identify budget issues.

**Acceptance Criteria:**
- [ ] AC1: The admin dashboard shows all courses with traffic-light status: green (< 80%), yellow (80-100%), red (> 100%).
- [ ] AC2: The admin can drill into any course to see per-TA breakdowns and weekly trends.
- [ ] AC3: The admin can view screenshots for any session across all courses.
- [ ] AC4: Overspend alerts are prominently displayed.

### US-24: Proof Retention and Purge
**As an** admin, **I want** expired proof files to be automatically purged, **so that** storage costs are controlled while meeting retention requirements.

**Acceptance Criteria:**
- [ ] AC1: A background job runs daily and deletes screenshots/photos older than `proof_retention_days` (default 30) post-approval.
- [ ] AC2: Submissions with `dispute_hold = true` are skipped.
- [ ] AC3: Proof from abandoned submissions (DRAFT or REJECTED for > 90 days) is also purged.
- [ ] AC4: The admin can trigger a manual purge via `POST /api/admin/purge-expired`.
- [ ] AC5: Each purge operation is recorded in the audit log.

### US-25: Manage Course Assignments
**As an** admin, **I want to** assign TAs and instructors to courses with optional per-TA weekly hour caps, **so that** workload limits are enforced.

**Acceptance Criteria:**
- [ ] AC1: The admin can create CourseAssignment records linking users to courses with a role (INSTRUCTOR or TA).
- [ ] AC2: An optional `max_weekly_hours` cap can be set per TA per course.
- [ ] AC3: Changes are recorded in the audit log.

---

## Epic 5: Export

### US-26: Export Approved Hours as CSV
**As a** TA, **I want to** download my approved hours as a CSV file, **so that** I can upload them to NAU's official timesheet system.

**Acceptance Criteria:**
- [ ] AC1: `GET /api/export/:submissionId?format=csv` generates a CSV download for an APPROVED submission.
- [ ] AC2: The CSV includes hours, categories, descriptions, and dates — no screenshot/photo URLs.
- [ ] AC3: The submission's `exported` flag is set to true and `exported_at` is recorded.
- [ ] AC4: An audit log entry is created for the export.

### US-27: Export Approved Hours as PDF
**As a** TA, **I want to** download my approved hours as a PDF report, **so that** I have a formatted document for NAU records.

**Acceptance Criteria:**
- [ ] AC1: `GET /api/export/:submissionId?format=pdf` generates a PDF download for an APPROVED submission.
- [ ] AC2: The PDF includes hours, categories, descriptions, and dates — no screenshot/photo URLs.
- [ ] AC3: Generated exports are cached in `exports/{submission_id}.{csv|pdf}` in S3/R2.
- [ ] AC4: The submission's `exported` flag is set to true and `exported_at` is recorded.

### US-28: Instructor and Admin Export Access
**As an** instructor or admin, **I want to** export approved submissions for TAs in my courses (or all courses for admin), **so that** I can generate reports for departmental records.

**Acceptance Criteria:**
- [ ] AC1: Instructors can export submissions for TAs in their assigned courses.
- [ ] AC2: Admins can export any submission across all courses.
- [ ] AC3: The export format and content is identical to TA exports.
- [ ] AC4: An audit log entry is created for each export.
