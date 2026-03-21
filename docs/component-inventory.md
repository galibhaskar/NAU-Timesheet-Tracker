# Component Inventory -- NAU Timesheet Tracker

Every custom component in the system. Each entry documents purpose, key props,
visual variants/states, and the pages that consume it. All components are built
with React + Tailwind CSS + shadcn/ui primitives.

---

## 1. Timer

| Field       | Detail |
|-------------|--------|
| **Description** | Large countdown/count-up display showing elapsed time for the current work session. Renders in JetBrains Mono at `timer` size. Pulses gently while running. |
| **Props** | `elapsed: number` (seconds), `isRunning: boolean`, `size?: "lg" \| "sm"` |
| **Variants** | **Idle** -- `00:00:00` in muted text. **Running** -- white text with subtle pulse animation. **Paused** -- amber text, no pulse. **Compact (sm)** -- `timer-sm` size for tray popover. |
| **States** | Idle, Running, Paused |
| **Used By** | Desktop App main screen, Desktop App tray popover |

---

## 2. BudgetBar

| Field       | Detail |
|-------------|--------|
| **Description** | Horizontal progress bar showing hours used vs. hours budgeted for a TA or course. Color shifts from green to yellow to red as utilization increases. Displays fraction label (e.g., "34 / 40 hrs"). |
| **Props** | `usedHours: number`, `budgetHours: number`, `label?: string`, `showFraction?: boolean` |
| **Variants** | **Green** -- usage < 80%. **Yellow** -- usage 80-95%. **Red** -- usage > 95%. **Overflow** -- bar exceeds 100%, red with striped pattern. |
| **States** | Default, Hover (tooltip with exact numbers) |
| **Used By** | Instructor Dashboard (per-TA and per-course), Admin Dashboard (course cards), TA Dashboard (own budget) |

---

## 3. StatusBadge

| Field       | Detail |
|-------------|--------|
| **Description** | Small pill badge indicating submission status. Uses semantic colors and an optional leading dot/icon. |
| **Props** | `status: "draft" \| "submitted" \| "approved" \| "rejected" \| "revision"`, `size?: "sm" \| "md"` |
| **Variants** | **Draft** -- gray bg, gray text. **Submitted** -- blue bg, white text. **Approved** -- green bg, white text. **Rejected** -- red bg, white text. **Revision** -- yellow bg, dark text. |
| **States** | Static (no interactive states) |
| **Used By** | TA Dashboard (past submissions table), Instructor Dashboard (submission rows), Admin Dashboard (drill-down) |

---

## 4. SessionCard

| Field       | Detail |
|-------------|--------|
| **Description** | Card representing one work session within a week. Shows date, time range, duration, course, category, and optional screenshot thumbnail. |
| **Props** | `session: Session`, `onEdit?: () => void`, `onDelete?: () => void`, `readonly?: boolean` |
| **Variants** | **Editable** -- shows edit/delete icons on hover. **Readonly** -- no action icons (instructor/admin view). **With Screenshot** -- thumbnail in bottom-right corner. |
| **States** | Default, Hover (elevated shadow), Editing (outlined border) |
| **Used By** | TA Dashboard (current week sessions), Instructor Dashboard (submission detail) |

---

## 5. SubmissionRow

| Field       | Detail |
|-------------|--------|
| **Description** | Table row for a single weekly submission. Displays TA name, course, week range, total hours, status badge, and action buttons. |
| **Props** | `submission: Submission`, `onApprove?: () => void`, `onReject?: () => void`, `onView?: () => void`, `role: "instructor" \| "admin"` |
| **Variants** | **Pending** -- shows Approve/Reject buttons. **Reviewed** -- shows status badge only. **Flagged** -- amber left border (cross-course hours warning). |
| **States** | Default, Hover (row highlight), Selected (blue left border) |
| **Used By** | Instructor Dashboard (pending list), Admin Dashboard (drill-down table) |

---

## 6. ScreenshotGallery

| Field       | Detail |
|-------------|--------|
| **Description** | Grid of screenshot thumbnails attached to a submission. Clicking a thumbnail opens a lightbox overlay with full-size image, navigation arrows, and metadata. |
| **Props** | `screenshots: Screenshot[]`, `columns?: 2 \| 3 \| 4`, `onDelete?: (id: string) => void` |
| **Variants** | **Grid** -- default multi-column layout. **Single** -- one large image with nav arrows (lightbox mode). **Editable** -- delete badge overlay on each thumbnail. |
| **States** | Default, Lightbox open, Loading (skeleton placeholders) |
| **Used By** | Instructor Dashboard (review panel), TA Dashboard (session detail) |

---

## 7. WeekPicker

| Field       | Detail |
|-------------|--------|
| **Description** | Date-range selector locked to Mon-Sun week boundaries. Shows current week by default with prev/next arrows. Dropdown calendar for jumping to arbitrary weeks. |
| **Props** | `selectedWeek: DateRange`, `onChange: (range: DateRange) => void`, `minDate?: Date`, `maxDate?: Date` |
| **Variants** | **Inline** -- compact prev/label/next row. **Dropdown** -- expanded calendar grid. |
| **States** | Default, Open (calendar visible), Disabled weeks (outside min/max grayed out) |
| **Used By** | TA Dashboard (week selector), Instructor Dashboard (filter bar) |

---

## 8. CourseSelector

| Field       | Detail |
|-------------|--------|
| **Description** | Dropdown or radio group for picking the active course. Shows course code and name. In the Electron app it appears as a compact dropdown; on web it is a sidebar list. |
| **Props** | `courses: Course[]`, `selectedId: string`, `onChange: (id: string) => void`, `variant?: "dropdown" \| "list"` |
| **Variants** | **Dropdown** -- single-line with chevron (Electron). **List** -- sidebar vertical list with active highlight (web). |
| **States** | Default, Open, Selected, Disabled (no courses assigned) |
| **Used By** | Desktop App (course picker), TA Dashboard (sidebar), Instructor Dashboard (sidebar) |

---

## 9. CategoryPicker

| Field       | Detail |
|-------------|--------|
| **Description** | Segmented control or dropdown for selecting work category (e.g., Grading, Office Hours, Lab Prep, Meetings, Other). |
| **Props** | `categories: string[]`, `selected: string`, `onChange: (cat: string) => void`, `variant?: "segmented" \| "dropdown"` |
| **Variants** | **Segmented** -- horizontal pill buttons (Electron). **Dropdown** -- select menu (mobile/compact). |
| **States** | Default, Selected (filled pill), Disabled |
| **Used By** | Desktop App (category picker), TA Dashboard (manual entry form) |

---

## 10. ModeSwitcher

| Field       | Detail |
|-------------|--------|
| **Description** | Toggle between timer modes: **Auto** (timer runs, screenshots captured) and **Manual** (log hours after the fact). |
| **Props** | `mode: "auto" \| "manual"`, `onChange: (mode: "auto" \| "manual") => void` |
| **Variants** | **Auto selected** -- left pill highlighted. **Manual selected** -- right pill highlighted. |
| **States** | Default, Disabled (while timer is running, cannot switch) |
| **Used By** | Desktop App (below course selector) |

---

## 11. PhotoUploader

| Field       | Detail |
|-------------|--------|
| **Description** | Drag-and-drop zone or file picker for uploading proof-of-work photos/screenshots. Shows thumbnail preview after upload. |
| **Props** | `photos: File[]`, `onAdd: (files: File[]) => void`, `onRemove: (index: number) => void`, `maxFiles?: number`, `maxSizeMB?: number` |
| **Variants** | **Empty** -- dashed border with upload icon and "Drop files here" text. **With files** -- thumbnail grid with remove buttons. |
| **States** | Default, Drag-over (blue border highlight), Uploading (progress bar), Error (red border, message) |
| **Used By** | Desktop App (stop dialog), TA Dashboard (manual session entry) |

---

## 12. TrafficLightCard

| Field       | Detail |
|-------------|--------|
| **Description** | Course overview card for the Admin dashboard. Shows course name, TA count, submission stats, and a colored dot (green/yellow/red) indicating overall status. |
| **Props** | `course: CourseOverview`, `onClick?: () => void` |
| **Variants** | **Green** -- all TAs approved. **Yellow** -- pending reviews. **Red** -- missing or overdue submissions. |
| **States** | Default, Hover (shadow lift, pointer cursor), Active/Selected (gold left border) |
| **Used By** | Admin Dashboard (course grid) |

---

## 13. AuditLogTable

| Field       | Detail |
|-------------|--------|
| **Description** | Paginated table displaying system events: logins, approvals, rejections, edits, exports. Each row shows timestamp, actor, action, and target. Filterable by action type and date range. |
| **Props** | `entries: AuditEntry[]`, `page: number`, `totalPages: number`, `onPageChange: (p: number) => void`, `filters?: AuditFilters` |
| **Variants** | **Default** -- full table. **Compact** -- fewer columns for embedded widget. |
| **States** | Loading (skeleton rows), Empty ("No events found"), Populated |
| **Used By** | Admin Dashboard (audit log tab) |

---

## 14. RejectionDialog

| Field       | Detail |
|-------------|--------|
| **Description** | Modal dialog shown when an instructor clicks "Reject." Requires a reason (text area) and optionally flags specific sessions. Sends notification to the TA. |
| **Props** | `submission: Submission`, `onConfirm: (reason: string, flaggedSessions?: string[]) => void`, `onCancel: () => void` |
| **Variants** | **Simple** -- reason textarea only. **Detailed** -- session checklist + reason. |
| **States** | Open, Submitting (button disabled, spinner), Error (inline message) |
| **Used By** | Instructor Dashboard (reject action) |

---

## 15. ExportButton

| Field       | Detail |
|-------------|--------|
| **Description** | Button with dropdown for exporting data. Supports CSV, PDF, and print. Shows a loading spinner during generation. |
| **Props** | `onExport: (format: "csv" \| "pdf" \| "print") => void`, `disabled?: boolean`, `label?: string` |
| **Variants** | **Single** -- one default format (no dropdown). **Multi** -- dropdown with format options. |
| **States** | Default, Open (dropdown visible), Exporting (spinner), Disabled |
| **Used By** | TA Dashboard (export submissions), Instructor Dashboard (export report), Admin Dashboard (export audit log) |

---

## 16. NotificationBanner

| Field       | Detail |
|-------------|--------|
| **Description** | Full-width banner at top of page for system messages: submission approved, rejection, deadline reminders, errors. Auto-dismisses after timeout or manual close. |
| **Props** | `type: "success" \| "warning" \| "error" \| "info"`, `message: string`, `dismissable?: boolean`, `autoDismissMs?: number`, `action?: { label: string, onClick: () => void }` |
| **Variants** | **Success** -- green-left-border, check icon. **Warning** -- yellow-left-border, alert icon. **Error** -- red-left-border, x-circle icon. **Info** -- blue-left-border, info icon. |
| **States** | Visible, Dismissing (fade-out animation), Hidden |
| **Used By** | All dashboards (top of page), Desktop App (inline notifications) |

---

## Component-to-Page Matrix

| Component            | TA Dash | Instructor Dash | Admin Dash | Desktop App |
|----------------------|:-------:|:----------------:|:----------:|:-----------:|
| Timer                |         |                  |            | x           |
| BudgetBar            | x       | x                | x          |             |
| StatusBadge          | x       | x                | x          |             |
| SessionCard          | x       | x                |            |             |
| SubmissionRow        |         | x                | x          |             |
| ScreenshotGallery    | x       | x                |            |             |
| WeekPicker           | x       | x                |            |             |
| CourseSelector       | x       | x                |            | x           |
| CategoryPicker       | x       |                  |            | x           |
| ModeSwitcher         |         |                  |            | x           |
| PhotoUploader        | x       |                  |            | x           |
| TrafficLightCard     |         |                  | x          |             |
| AuditLogTable        |         |                  | x          |             |
| RejectionDialog      |         | x                |            |             |
| ExportButton         | x       | x                | x          |             |
| NotificationBanner   | x       | x                | x          | x           |
