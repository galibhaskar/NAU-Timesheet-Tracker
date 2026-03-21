# Wireframe -- Admin Dashboard (Web)

The admin's interface for a bird's-eye view of all courses, TA management,
system settings, and audit logging.

---

## Full Desktop Layout (>= 1280px)

```
+------------------+-----------------------------------------------------------+
|                  | [NotificationBanner: "3 courses have overdue submissions"] |
|  NAU Timesheet   +-----------------------------------------------------------+
|  Tracker         |                                                           |
|                  |  [Courses]  [Users]  [Settings]  [Audit Log]  <-- tabs    |
|  Admin           |                                                           |
|  admin@nau.edu   |  =========================================================|
|                  |                                                           |
|  =============== |  COURSES TAB (default)                                    |
|                  |                                                           |
|  NAVIGATION      |  Week: [WeekPicker     v]     Semester: [Spring 2026 v]   |
|                  |                                                           |
|  [*] Courses     |  Course Overview                                          |
|  [ ] Users       |                                                           |
|  [ ] Settings    |  +---------------+ +---------------+ +---------------+    |
|  [ ] Audit Log   |  | (G) CS 126    | | (Y) CS 249    | | (R) CS 386    |    |
|                  |  |               | |               | |               |    |
|  =============== |  | 4 TAs         | | 6 TAs         | | 3 TAs         |    |
|                  |  | 4/4 approved  | | 4/6 approved  | | 0/3 submitted |    |
|                  |  |               | | 2 pending     | | 3 missing     |    |
|  QUICK STATS     |  |               | |               | |               |    |
|                  |  | Budget:       | | Budget:       | | Budget:       |    |
|  Courses: 8      |  | [||||||||  ]  | | [||||||||||] | | [||||||     ] |    |
|  TAs: 24         |  | 120/160 (75%) | | 85/90 (94%)  | | 42/80 (53%)  |    |
|  Pending: 5      |  +---------------+ +---------------+ +---------------+    |
|  Overdue: 3      |                                                           |
|                  |  +---------------+ +---------------+ +---------------+    |
|                  |  | (G) CS 476    | | (Y) CS 499    | | (G) CS 522    |    |
|                  |  |               | |               | |               |    |
|                  |  | 2 TAs         | | 5 TAs         | | 3 TAs         |    |
|                  |  | 2/2 approved  | | 3/5 approved  | | 3/3 approved  |    |
|                  |  |               | | 2 pending     | |               |    |
|                  |  | Budget:       | | Budget:       | | Budget:       |    |
|                  |  | [||||||    ]  | | [|||||||||  ] | | [|||||||   ]  |    |
|                  |  | 30/60 (50%)  | | 72/80 (90%)  | | 45/60 (75%)  |    |
|                  |  +---------------+ +---------------+ +---------------+    |
|                  |                                                           |
|                  |  +---------------+ +---------------+                      |
|                  |  | (R) CS 600    | | (G) CS 612    |                      |
|                  |  | ...           | | ...           |                      |
|                  |  +---------------+ +---------------+                      |
|                  |                                                           |
+------------------+-----------------------------------------------------------+
```

---

## Course Drill-Down (click a TrafficLightCard)

```
+------------------+-----------------------------------------------------------+
|                  |                                                           |
|  (sidebar)       |  < Back to Courses          CS 249 - Data Structures      |
|                  |                                                           |
|                  |  Instructor: Dr. Smith          Semester: Spring 2026     |
|                  |  Total Budget: 160 hrs          Used: 120 hrs (75%)      |
|                  |  [||||||||||||||||||              ]  <-- BudgetBar        |
|                  |                                                           |
|                  |  =========================================================|
|                  |                                                           |
|                  |  TA Submissions -- Week of Mar 16                         |
|                  |                                                           |
|                  |  +--------+-----------+-------+----------+----------+    |
|                  |  | TA     | Hours     | Cat   | Status   | Reviewer |    |
|                  |  +--------+-----------+-------+----------+----------+    |
|                  |  | Jane D | 6.5h      | Mixed | Approved | Dr.Smith |    |
|                  |  | Bob J  | 8.0h      | Mixed | Approved | Dr.Smith |    |
|                  |  | Sara K | 7.0h      | Grade | Pending  |    --    |    |
|                  |  | Mike T | 10.5h [!] | Mixed | Pending  |    --    |    |
|                  |  | Alex R | --        |  --   | Missing  |    --    |    |
|                  |  | Li W   | 5.0h      | OH    | Approved | Dr.Smith |    |
|                  |  +--------+-----------+-------+----------+----------+    |
|                  |                                                           |
|                  |  [!] = cross-course hours flag                            |
|                  |                                                           |
|                  |  =========================================================|
|                  |                                                           |
|                  |  Per-TA Budget Usage                                      |
|                  |                                                           |
|                  |  Jane Doe        [||||||||          ]  24/40 hrs (60%)    |
|                  |  Bob Johnson     [||||||||||||      ]  30/40 hrs (75%)    |
|                  |  Sara Kim        [||||||||||||||    ]  28/40 hrs (70%)    |
|                  |  Mike Torres     [||||||||||||||||  ]  38/40 hrs (95%)    |
|                  |  Alex Ramirez    [||||||            ]  12/40 hrs (30%)    |
|                  |  Li Wang         [||||              ]   8/40 hrs (20%)    |
|                  |                                                           |
|                  |  [Export Report v]                                        |
|                  |                                                           |
+------------------+-----------------------------------------------------------+
```

---

## Users Tab

```
+-----------------------------------------------------------+
|                                                           |
|  [Users]  tab active                                      |
|                                                           |
|  [+ Add User]    [Import CSV]     Search: [___________]  |
|                                                           |
|  +------+-------------+-----------+--------+---------+   |
|  | Name | Email        | Role      | Courses| Actions |   |
|  +------+-------------+-----------+--------+---------+   |
|  | Jane | jd@nau.edu  | TA        | CS 249 | [E][D]  |   |
|  | Bob  | bj@nau.edu  | TA        | CS 249 | [E][D]  |   |
|  |      |             |           | CS 386 |         |   |
|  | Dr.S | as@nau.edu  | Instructor| CS 249 | [E][D]  |   |
|  |      |             |           | CS 386 |         |   |
|  |      |             |           | CS 476 |         |   |
|  | Mike | mt@nau.edu  | TA        | CS 249 | [E][D]  |   |
|  |      |             |           | CS 476 |         |   |
|  +------+-------------+-----------+--------+---------+   |
|                                                           |
|  [< 1 2 3 >]                                              |
|                                                           |
+-----------------------------------------------------------+
```

### Add/Edit User Dialog

```
+--------------------------------------------+
|  Add New User                         [x]  |
|--------------------------------------------|
|                                            |
|  Full Name:  [____________________]        |
|  Email:      [____________________]        |
|  Role:       ( ) Admin                     |
|              (*) Instructor                |
|              ( ) TA                        |
|                                            |
|  Assign Courses:                           |
|  [x] CS 249 - Data Structures             |
|  [ ] CS 386 - Operating Systems            |
|  [x] CS 476 - Computer Networks            |
|  [ ] CS 499 - Senior Capstone             |
|                                            |
|  Weekly Hour Limit:  [20] hrs              |
|  (TA role only)                            |
|                                            |
|  [Cancel]               [Save User]        |
+--------------------------------------------+
```

---

## Settings Tab

```
+-----------------------------------------------------------+
|                                                           |
|  [Settings]  tab active                                   |
|                                                           |
|  General Settings                                         |
|  ============================================             |
|                                                           |
|  Semester:         [Spring 2026     v]                    |
|  Semester Start:   [Jan 12, 2026     ]                    |
|  Semester End:     [May 08, 2026     ]                    |
|                                                           |
|  Submission Deadline:                                     |
|  Day: [Sunday   v]  Time: [11:59 PM]                     |
|                                                           |
|  Screenshot Settings                                      |
|  ============================================             |
|                                                           |
|  Auto-capture interval:  [5] minutes                     |
|  Require screenshots:    [x] Yes                         |
|  Max file size:          [5] MB                           |
|  Allowed formats:        [x] PNG [x] JPG [ ] GIF        |
|                                                           |
|  Budget / Hours                                           |
|  ============================================             |
|                                                           |
|  Default weekly max per TA:    [20] hrs                   |
|  Cross-course warning at:      [15] hrs/week             |
|  Budget warning threshold:     [80] %                    |
|  Budget critical threshold:    [95] %                    |
|                                                           |
|  Notifications                                            |
|  ============================================             |
|                                                           |
|  [x] Email TAs when submission is rejected               |
|  [x] Email instructors when submissions arrive           |
|  [x] Email admin on overdue submissions                  |
|  [ ] Slack webhook integration                           |
|      Webhook URL: [____________________________]         |
|                                                           |
|  [Reset to Defaults]            [Save Settings]          |
|                                                           |
+-----------------------------------------------------------+
```

---

## Audit Log Tab

```
+-----------------------------------------------------------+
|                                                           |
|  [Audit Log]  tab active                                  |
|                                                           |
|  Filters:                                                 |
|  Action: [All Actions  v]  User: [All Users v]           |
|  From: [Mar 01, 2026]      To: [Mar 21, 2026]           |
|  [Apply Filters]                          [Export CSV v]  |
|                                                           |
|  +------------+----------+----------------+-------------+ |
|  | Timestamp  | Actor    | Action         | Target      | |
|  +------------+----------+----------------+-------------+ |
|  | Mar 21     | Dr.Smith | approved       | Jane Doe    | |
|  | 10:23 AM   |          | submission     | CS249 wk3/16| |
|  +------------+----------+----------------+-------------+ |
|  | Mar 21     | Dr.Smith | rejected       | Mike Torres | |
|  | 10:18 AM   |          | submission     | CS476 wk3/16| |
|  +------------+----------+----------------+-------------+ |
|  | Mar 20     | Jane Doe | submitted      | CS249       | |
|  | 11:45 PM   |          | weekly hours   | wk 3/16     | |
|  +------------+----------+----------------+-------------+ |
|  | Mar 20     | admin    | updated        | Settings    | |
|  | 3:00 PM    |          | settings       | budget warn | |
|  +------------+----------+----------------+-------------+ |
|  | Mar 19     | Bob J.   | logged in      |     --      | |
|  | 9:01 AM    |          |                |             | |
|  +------------+----------+----------------+-------------+ |
|  | Mar 18     | admin    | created user   | Li Wang     | |
|  | 2:30 PM    |          |                | (TA)        | |
|  +------------+----------+----------------+-------------+ |
|  | Mar 18     | admin    | assigned       | Li Wang     | |
|  | 2:31 PM    |          | course         | -> CS 249   | |
|  +------------+----------+----------------+-------------+ |
|                                                           |
|  Showing 1-20 of 143 entries        [< 1 2 3 4 ... 8 >] |
|                                                           |
+-----------------------------------------------------------+
```

---

## Traffic-Light Legend

```
  (G) Green  = All TAs submitted and approved for the selected week
  (Y) Yellow = One or more submissions pending instructor review
  (R) Red    = One or more TAs have not submitted / overdue
```

---

## Tablet Layout (768px - 1279px)

- Sidebar collapses to hamburger
- Traffic-light cards display in a 2-column grid
- Drill-down table scrolls horizontally
- Tabs remain visible in a horizontal scrollable strip

## Mobile Layout (< 768px)

- Single column layout
- Traffic-light cards stack vertically, full width
- Tabs become a dropdown selector
- Tables convert to card-based layouts
