# NAU TA Timesheet Tracker — Edge Cases

Derived from the [Design Spec](superpowers/specs/2026-03-17-nau-timesheet-tracker-design.md).

---

## EC-01: Network Loss Mid-Session

| Aspect | Detail |
|--------|--------|
| **Scenario** | The desktop app loses internet connectivity while a session is ACTIVE (e.g., Wi-Fi drops, VPN disconnects). |
| **Expected Behavior** | The local timer continues running. Screenshots are captured locally and queued for upload. Session events (pause/resume from idle detection) are queued locally with client timestamps. When connectivity is restored, queued events and screenshots are replayed to the server in order. The server records its own timestamps for each event upon receipt and flags any client-server timestamp discrepancy > 30 seconds in the audit log. |
| **API Response** | Queued API calls execute on reconnection. If the session was stopped server-side (e.g., admin action) while offline, replayed events return HTTP 409 (session already COMPLETED). |
| **UI Behavior** | The desktop app shows a connectivity indicator (e.g., orange dot). A banner reads: "Offline — session tracked locally, will sync when reconnected." The TA can continue working. On reconnection, a brief "Syncing..." state is shown. |

---

## EC-02: Simultaneous Pause/Stop Race Condition

| Aspect | Detail |
|--------|--------|
| **Scenario** | The idle detector triggers an auto-pause at the exact moment the TA clicks "Stop", causing both `POST /pause` and `POST /stop` requests to be sent near-simultaneously. |
| **Expected Behavior** | The server processes requests sequentially using a per-session lock (or optimistic concurrency via session status check). The first request to arrive transitions the state; the second finds an incompatible state and is handled accordingly. If pause arrives first, stop proceeds from PAUSED (valid transition). If stop arrives first, pause returns an error because the session is now COMPLETED. |
| **API Response** | If the session is already COMPLETED when a pause request arrives: HTTP 409 `{ "error": "session_already_completed", "session_id": "..." }`. Both valid transitions are idempotent in outcome — the session ends up COMPLETED either way. |
| **UI Behavior** | The app treats the session as stopped regardless of which request "wins." Any 409 error from the pause request is silently ignored since the intended outcome (session ended) was achieved. The stop confirmation dialog is shown. |

---

## EC-03: Timezone Boundaries — Session Spanning Midnight

| Aspect | Detail |
|--------|--------|
| **Scenario** | A TA starts a session at 11:30 PM on Sunday (America/Phoenix) and stops it at 12:30 AM on Monday. The session spans a week boundary. |
| **Expected Behavior** | The session is assigned to the week containing its `started_at` timestamp. In this case, the session belongs to the week ending Sunday (the week that is closing). The session is NOT split across weeks. The full 60 minutes are counted toward the Sunday week. |
| **API Response** | `POST /api/submissions/submit` for the Sunday week includes this session. The Monday week submission does not include it. |
| **UI Behavior** | The TA sees the session listed under the week it was started in. A subtle indicator (e.g., "Session ended Mon 12:30 AM") clarifies that the session crossed midnight. |

---

## EC-04: Budget Overflow on Approval

| Aspect | Detail |
|--------|--------|
| **Scenario** | An instructor approves a TA submission, but doing so would push the course's total approved hours beyond the weekly budget (computed or overridden). |
| **Expected Behavior** | The approval is NOT blocked — it is allowed with a warning. Budget limits are advisory, not hard caps. The system records that budget was exceeded in the audit log. The course status flips to red (> 100%) on both instructor and admin dashboards. |
| **API Response** | `POST /api/submissions/:id/approve` returns HTTP 200 with a `warnings` array: `[{ "type": "budget_exceeded", "course_id": "...", "budget_hours": 10.0, "approved_hours": 12.5 }]`. |
| **UI Behavior** | Before confirming, a modal warns: "Approving this submission will exceed the weekly budget for [Course] (12.5 / 10.0 hours). Proceed?" The instructor must explicitly confirm. After approval, the budget bar turns red. |

---

## EC-05: Max 3 Rejection Limit Enforcement

| Aspect | Detail |
|--------|--------|
| **Scenario** | A submission has been rejected 3 times and the TA attempts to resubmit a 4th time. |
| **Expected Behavior** | The system blocks the resubmission and requires admin intervention. The submission remains in REJECTED status. All 3 prior rejection reasons are preserved in the audit log. |
| **API Response** | `POST /api/submissions/submit` (resubmission) returns HTTP 422: `{ "error": "max_rejections_exceeded", "message": "This submission has been rejected 3 times. Please contact an administrator.", "rejection_count": 3 }`. |
| **UI Behavior** | The TA sees a message: "This submission has reached the maximum number of rejections. Please contact your administrator for assistance." The "Resubmit" button is disabled/hidden. |

---

## EC-06: Starting a Session While One is Already Active (409)

| Aspect | Detail |
|--------|--------|
| **Scenario** | A TA tries to start a new session (possibly for a different course) while they already have an ACTIVE session. |
| **Expected Behavior** | The server enforces the unique partial index constraint: at most one ACTIVE session per user globally. The new session is rejected. |
| **API Response** | `POST /api/sessions/start` returns HTTP 409: `{ "error": "active_session_exists", "active_session_id": "uuid-of-active-session", "course": "CS 249", "started_at": "2026-03-17T10:00:00Z" }`. |
| **UI Behavior** | The desktop app shows: "You already have an active session for [Course]. Please stop or pause it before starting a new one." A link/button offers to navigate to the active session. |

---

## EC-07: Submitting with Active/Paused Sessions (422)

| Aspect | Detail |
|--------|--------|
| **Scenario** | A TA tries to submit their week for a course, but they have ACTIVE or PAUSED sessions for that course and week that have not been stopped. |
| **Expected Behavior** | The submission is blocked. Only COMPLETED sessions can be bundled into a WeeklySubmission. The API identifies the in-progress sessions. |
| **API Response** | `POST /api/submissions/submit` returns HTTP 422: `{ "error": "sessions_in_progress", "message": "You have active or paused sessions that must be stopped before submitting.", "in_progress_sessions": ["session-id-1", "session-id-2"] }`. |
| **UI Behavior** | The TA sees a list of in-progress sessions with links to each one. The "Submit" button remains disabled until all sessions for that course/week are COMPLETED. |

---

## EC-08: Screenshot Capture Failure

| Aspect | Detail |
|--------|--------|
| **Scenario** | The desktop app fails to capture a screenshot due to OS permission denial (e.g., macOS Screen Recording permission not granted) or a disconnected/sleeping display. |
| **Expected Behavior** | The session continues running — screenshot failure does not stop the timer. The app retries once after 30 seconds. If still failing, the failure is logged locally and a reduced-frequency retry is attempted every `screenshot_interval_max` minutes. The session is flagged server-side as having sparse screenshots relative to active time. |
| **API Response** | Not applicable (client-side failure). When screenshots are eventually uploaded, the server accepts them normally. If zero screenshots are uploaded for a SCREEN session, the session is flagged for instructor review. |
| **UI Behavior** | On first failure, the app shows a system notification: "Screenshot capture failed. Please check screen recording permissions in System Settings." A small warning icon appears on the session in the system tray menu. |

---

## EC-09: Token Expiry During Active Session

| Aspect | Detail |
|--------|--------|
| **Scenario** | The TA's JWT (1-hour expiry) expires while a session is running. The refresh token may or may not also be expired (30-day expiry). |
| **Expected Behavior** | **JWT expired, refresh token valid**: The app transparently uses the refresh token to obtain a new JWT. The session continues uninterrupted. The refresh token rotates on use. **Both expired**: The app cannot authenticate API calls. Session events and screenshots are queued locally. The TA is prompted to re-login. After login, queued data is synced. |
| **API Response** | Expired JWT: HTTP 401. The client uses the refresh token endpoint to get a new JWT. If the refresh token is also expired: HTTP 401 on the refresh endpoint. |
| **UI Behavior** | **Transparent refresh**: No UI indication; session continues. **Full expiry**: A login dialog overlays the app: "Your session has expired. Please sign in again to continue." The timer display continues locally. After re-login, a "Syncing..." indicator appears briefly. |

---

## EC-10: Concurrent Approvals by Multiple Instructors

| Aspect | Detail |
|--------|--------|
| **Scenario** | Two instructors assigned to the same course both attempt to approve (or one approves while the other rejects) the same TA submission simultaneously. |
| **Expected Behavior** | The server uses optimistic concurrency control (e.g., checking the submission status before updating). The first request to commit wins. The second request finds the submission already in a terminal state (APPROVED) or a changed state and fails. |
| **API Response** | The second instructor's request returns HTTP 409: `{ "error": "submission_already_reviewed", "status": "APPROVED", "reviewer": "Dr. Smith", "reviewed_at": "2026-03-17T14:00:00Z" }`. |
| **UI Behavior** | The second instructor sees: "This submission has already been approved by Dr. Smith." The page refreshes to show the current status. Real-time updates (if implemented) would remove the submission from the pending queue. |

---

## EC-11: Session with Zero Screenshots

| Aspect | Detail |
|--------|--------|
| **Scenario** | A SCREEN-mode session completes but has zero screenshots because the entire session was spent in idle-paused state, or because all capture attempts failed (see EC-08). |
| **Expected Behavior** | The session is still valid and can be submitted. However, it is flagged for instructor attention during review. The server compares expected screenshot count (based on active_minutes and screenshot interval settings) against actual count. A flag or warning is attached to the session. |
| **API Response** | The session data returned to the instructor includes a `screenshot_warning: true` flag and `expected_screenshots` vs `actual_screenshots` counts. |
| **UI Behavior** | During instructor review, the session row is highlighted with a warning: "No screenshots captured during this session." The instructor can still approve or reject based on their judgment (e.g., if the session was very short or mostly idle). |

---

## EC-12: Large File Uploads (Oversized Screenshots/Photos)

| Aspect | Detail |
|--------|--------|
| **Scenario** | A TA (or the desktop app) attempts to upload a file exceeding the size limit — screenshots > 5MB or photos > 10MB. Could also involve an unsupported file format (e.g., BMP, TIFF, GIF). |
| **Expected Behavior** | The server rejects the upload at the validation layer before storage. The file is never written to S3/R2. For screenshots, the desktop app should compress to JPEG quality 80% before uploading to stay under limits. |
| **API Response** | `POST /api/sessions/:id/screenshots` returns HTTP 413: `{ "error": "file_too_large", "max_size_bytes": 5242880, "received_size_bytes": 8388608 }`. For invalid format: HTTP 422: `{ "error": "invalid_file_type", "allowed_types": ["image/jpeg", "image/png"], "received_type": "image/bmp" }`. |
| **UI Behavior** | **Screenshots** (auto-captured): The desktop app retries with higher compression. If still too large, logs the failure and skips (see EC-08 for sparse screenshot handling). **Photos** (manual upload): The upload form shows: "File too large. Maximum size is 10MB. Please resize or compress the image." The file is rejected client-side before the API call when possible. |

---

## EC-13: Abandoned Sessions (Started but Never Stopped)

| Aspect | Detail |
|--------|--------|
| **Scenario** | A TA starts a session, then closes the desktop app (crash, force-quit, or system shutdown) without stopping the session. The session remains ACTIVE or PAUSED in the database indefinitely. |
| **Expected Behavior** | The system handles this in two ways: (1) **On next app launch**: The desktop app checks for any ACTIVE/PAUSED sessions belonging to the user. If found, it prompts the TA to stop or resume the session. (2) **Submission guard**: The TA cannot submit a week that contains abandoned (non-COMPLETED) sessions (see EC-07). There is no automatic server-side timeout that stops sessions — the TA must explicitly stop them. |
| **API Response** | `GET /api/dashboard/ta` includes an `active_session` field if one exists. The desktop app's startup check can use this to detect abandoned sessions. |
| **UI Behavior** | **Desktop app startup**: "You have an unstopped session for [Course] started on [date/time]. Would you like to stop it now or resume working?" The TA can add a description and stop it, or resume. **Web dashboard**: A banner warns: "You have [N] unstopped session(s). Please open the desktop app to stop them before submitting." |
