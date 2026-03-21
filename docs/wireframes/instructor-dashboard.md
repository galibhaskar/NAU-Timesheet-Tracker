# Wireframe -- Instructor Dashboard (Web)

The instructor's interface for reviewing TA submissions, viewing proof-of-work
screenshots, approving or rejecting timesheets, and monitoring budget usage.

---

## Full Desktop Layout (>= 1280px)

```
+------------------+-------------------------------+----------------------------+
|                  | [NotificationBanner: "2 new submissions pending review"]   |
|  NAU Timesheet   +-------------------------------+----------------------------+
|  Tracker         |                               |                            |
|                  | Pending Submissions            | Submission Detail          |
|  Dr. Smith       | Week: [WeekPicker  v]          |                            |
|  Instructor      | Course: [All Courses v]        | TA: Jane Doe               |
|                  |                               | CS 249 -- Week of Mar 16   |
|  =============== | +--------------------------+  | Status: [Submitted]        |
|                  | |                          |  |                            |
|  MY COURSES      | | Jane Doe                 |  | Sessions (3)    Total: 6.5h|
|                  | | CS 249  Mar 16   6.5h    |  | ========================== |
|  > CS 249  (act) | | [Submitted]     [View >] |  |                            |
|    CS 386        | |                          |  | Mon Mar 16                 |
|    CS 476        | +--------------------------+  | +------------------------+ |
|                  | +--------------------------+  | | Grading   9a-11:30a    | |
|  =============== | |                          |  | | 2h 30m                 | |
|                  | | Bob Johnson              |  | | "Graded midterm p1-30" | |
|  BUDGET OVERVIEW | | CS 249  Mar 16   8.0h    |  | +------------------------+ |
|                  | | [Submitted]     [View >] |  |                            |
|  CS 249          | |                          |  | Mon Mar 16                 |
|  [||||||||   ]   | +--------------------------+  | +------------------------+ |
|  120/160 hrs     | +--------------------------+  | | Office Hrs  1p-3p      | |
|  (75%) - green   | |                          |  | | 2h 00m                 | |
|                  | | Alice Chen               |  | | "Held OH in rm 214"    | |
|  CS 386          | | CS 386  Mar 16   5.0h    |  | +------------------------+ |
|  [|||||||||||  ] | | [Submitted]     [View >] |  |                            |
|  78/90 hrs       | |                          |  | Tue Mar 17                 |
|  (87%) - yellow  | +--------------------------+  | +------------------------+ |
|                  |                               | | Lab Prep  10a-12p      | |
|  CS 476          | +--------------------------+  | | 2h 00m                 | |
|  [||||||||||||||]| |                          |  | | "Prepared lab 7 files" | |
|  57/60 hrs       | | Mike Torres              |  | +------------------------+ |
|  (95%) - red     | | CS 476  Mar 16  10.5h    |  |                            |
|                  | | [Submitted]  [!] [View >]|  | ========================== |
|  =============== | | ^ cross-course warning   |  |                            |
|                  | +--------------------------+  | Screenshots                |
|  [Export v]      |                               | +------+ +------+ +------+ |
|                  | Reviewed This Week             | | img1 | | img2 | | img3 | |
|                  | +--------------------------+  | |      | |      | |      | |
|                  | | Sara Kim                 |  | +------+ +------+ +------+ |
|                  | | CS 249  Mar 16   7.0h    |  | (click to enlarge)         |
|                  | | [Approved]               |  |                            |
|                  | +--------------------------+  | ========================== |
|                  |                               |                            |
|                  |                               | Cross-Course Hours Warning |
|                  |                               | ! Jane Doe has 14.5h total |
|                  |                               |   across 2 courses this    |
|                  |                               |   week. Max allowed: 20h   |
|                  |                               |                            |
|                  |                               | ========================== |
|                  |                               |                            |
|                  |                               | [  Reject  ] [  Approve  ] |
|                  |                               |   ^red btn     ^green btn  |
|                  |                               |                            |
+------------------+-------------------------------+----------------------------+
```

---

## Sidebar Detail

```
+------------------+
|                  |
|  [NAU Logo]      |
|  NAU Timesheet   |
|  Tracker         |
|                  |
|  Dr. Smith       |
|  Instructor      |
|  as123@nau.edu   |
|                  |
|  ================|
|                  |
|  MY COURSES      |
|                  |
|  [*] CS 249      |  <-- active (gold left border)
|  [ ] CS 386      |
|  [ ] CS 476      |
|                  |
|  ================|
|                  |
|  BUDGET OVERVIEW |
|  (all TAs in     |
|   course)        |
|                  |
|  CS 249 (6 TAs)  |
|  [||||||||   ]   |
|  120 / 160 hrs   |
|                  |
|  Per-TA breakdown|
|  Jane D. 24/40   |
|  Bob J.  30/40   |
|  Sara K. 28/40   |
|  ...             |
|                  |
|  ================|
|                  |
|  [Export v]      |
|  [Settings]      |
|  [Sign Out]      |
|                  |
+------------------+
```

---

## Cross-Course Hours Warning Panel

When a TA's total weekly hours across all courses exceeds a configurable
threshold, a warning banner appears in the submission detail panel:

```
+----------------------------------------------------------+
| !  CROSS-COURSE HOURS WARNING                            |
|----------------------------------------------------------|
|                                                          |
|  Mike Torres logged 10.5h in CS 476 this week.           |
|  Combined with other courses:                            |
|                                                          |
|    CS 249:   8.0h                                        |
|    CS 476:  10.5h                                        |
|    --------                                              |
|    Total:   18.5h   (max recommended: 20h)               |
|                                                          |
|  Consider verifying hours before approval.               |
|                                                          |
+----------------------------------------------------------+
```

---

## Rejection Dialog

```
+--------------------------------------------+
|  Reject Submission                    [x]  |
|--------------------------------------------|
|                                            |
|  TA: Jane Doe                              |
|  Week of Mar 16 -- CS 249                  |
|                                            |
|  Flag specific sessions (optional):        |
|  [x] Mon Mar 16 - Grading (2h 30m)        |
|  [ ] Mon Mar 16 - Office Hours (2h 00m)    |
|  [ ] Tue Mar 17 - Lab Prep (2h 00m)        |
|                                            |
|  Reason for rejection: *                   |
|  +----------------------------------------+|
|  | Grading session on Monday seems too    ||
|  | long for the number of papers. Please  ||
|  | verify and resubmit.                   ||
|  +----------------------------------------+|
|                                            |
|  [Cancel]           [Reject & Notify TA]   |
|                          ^red button       |
+--------------------------------------------+
```

---

## Screenshot Lightbox

```
+----------------------------------------------------------+
|                                                     [x]  |
|                                                          |
|   [<]         +----------------------------+        [>]  |
|               |                            |             |
|               |                            |             |
|               |     Full-size screenshot   |             |
|               |                            |             |
|               |                            |             |
|               +----------------------------+             |
|                                                          |
|   Session: Grading, Mon Mar 16, 9:00am                   |
|   Captured at: 9:23 AM                                   |
|   Image 1 of 3                                           |
|                                                          |
+----------------------------------------------------------+
```

---

## Tablet Layout (768px - 1279px)

- Sidebar collapses to hamburger
- Two-column layout changes to stacked: pending list on top, detail below
- Clicking a submission row scrolls to / expands the detail section
- Budget bars move to a horizontal scrollable row at the top

---

## Mobile Layout (< 768px)

- Single column, full-width
- Pending submissions as cards with tap-to-expand
- Screenshots in a horizontal scroll strip
- Approve/Reject as sticky footer buttons when viewing a submission
