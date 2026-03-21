# Wireframe -- TA Dashboard (Web)

The TA's primary web interface for viewing sessions, submitting weekly
timesheets, and reviewing past submission history.

---

## Full Desktop Layout (>= 1280px)

```
+------------------+-----------------------------------------------------------+
|                  |  [NotificationBanner: "Week of Mar 9 approved!" x]       |
|  NAU Timesheet   |-----------------------------------------------------------+
|  Tracker         |                                                           |
|                  |  Week of Mar 16 - Mar 22, 2026        [< Prev] [Next >]  |
|  TA: Jane Doe    |  -----------------------------------------------         |
|                  |  [WeekPicker calendar dropdown]                           |
|  ---------------  |                                                           |
|                  |-----------------------------------------------------------+
|  MY COURSES      |                                                           |
|                  |  Sessions This Week                          [+ Add Manual]|
|  > CS 249  (act) |                                                           |
|    CS 386        |  +-------------------------------------------------------+|
|    CS 476        |  | Mon Mar 16                                             ||
|                  |  | +---------------------------------------------------+ ||
|  ---------------  |  | | Grading          9:00am - 11:30am     2h 30m     | ||
|                  |  | | CS 249           [screenshot thumb]    [Edit][Del]| ||
|  BUDGET          |  | +---------------------------------------------------+ ||
|  +-----------+   |  | +---------------------------------------------------+ ||
|  ||||||||    |   |  | | Office Hours     1:00pm - 3:00pm      2h 00m     | ||
|  +-----------+   |  | | CS 249                                [Edit][Del]| ||
|  24 / 40 hrs     |  | +---------------------------------------------------+ ||
|  (60%)           |  +-------------------------------------------------------+|
|                  |                                                           |
|  ---------------  |  +-------------------------------------------------------+|
|                  |  | Tue Mar 17                                             ||
|  [Export v]      |  | +---------------------------------------------------+ ||
|                  |  | | Lab Prep         10:00am - 12:00pm    2h 00m     | ||
|                  |  | | CS 249           [screenshot thumb]    [Edit][Del]| ||
|                  |  | +---------------------------------------------------+ ||
|                  |  +-------------------------------------------------------+|
|                  |                                                           |
|                  |  +-------------------------------------------------------+|
|                  |  | Wed Mar 18                                             ||
|                  |  |                                                        ||
|                  |  | (no sessions recorded)                                ||
|                  |  +-------------------------------------------------------+|
|                  |                                                           |
|                  |  ---------------------------------------------------------|
|                  |  Week Total: 6h 30m                                       |
|                  |  ---------------------------------------------------------|
|                  |                                                           |
|                  |  [        Submit Week for Review        ]  <-- gold btn   |
|                  |                                                           |
|                  |-----------------------------------------------------------+
|                  |                                                           |
|                  |  Past Submissions                                         |
|                  |                                                           |
|                  |  +------+------------+--------+----------+-----------+   |
|                  |  | Week | Course     | Hours  | Status   | Actions   |   |
|                  |  +------+------------+--------+----------+-----------+   |
|                  |  | 3/9  | CS 249    | 8.5h   | Approved | [Export]  |   |
|                  |  | 3/2  | CS 249    | 7.0h   | Approved | [Export]  |   |
|                  |  | 2/23 | CS 249    | 9.0h   | Approved | [Export]  |   |
|                  |  | 2/16 | CS 386    | 6.5h   | Approved | [Export]  |   |
|                  |  +------+------------+--------+----------+-----------+   |
|                  |                                                           |
|                  |  [< 1 2 3 >]   pagination                                |
|                  |                                                           |
+------------------+-----------------------------------------------------------+
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
|  TA: Jane Doe    |
|  jd123@nau.edu   |
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
|  SEMESTER BUDGET |
|                  |
|  CS 249          |
|  [||||||||   ]   |  <-- BudgetBar green
|  24 / 40 hrs     |
|                  |
|  CS 386          |
|  [|||||||||||| ] |  <-- BudgetBar yellow
|  17 / 20 hrs     |
|                  |
|  ================|
|                  |
|  [Export v]      |  <-- ExportButton
|  [Settings]      |
|  [Sign Out]      |
|                  |
+------------------+
```

---

## Add Manual Session Dialog

```
+--------------------------------------------+
|  Add Manual Session                    [x] |
|--------------------------------------------|
|                                            |
|  Course:    [ CS 249          v ]          |
|  Category:  [ Grading         v ]          |
|  Date:      [ Mar 18, 2026     ]           |
|  Start:     [ 09:00 AM         ]           |
|  End:       [ 11:00 AM         ]           |
|  Duration:  2h 00m (calculated)            |
|                                            |
|  Description:                              |
|  +----------------------------------------+|
|  | Graded midterm exams for section 2     ||
|  |                                        ||
|  +----------------------------------------+|
|                                            |
|  Screenshots (optional):                   |
|  +------+  +------+  +- - - - -+          |
|  | img1 |  | img2 |  |  + Add  |          |
|  | [x]  |  | [x]  |  |        |          |
|  +------+  +------+  +- - - - -+          |
|                                            |
|  [Cancel]              [Save Session]      |
+--------------------------------------------+
```

---

## Tablet Layout (768px - 1279px)

- Sidebar collapses to hamburger icon at top-left
- Sessions list takes full width
- Budget bars move to a collapsible section at top of main area
- Past submissions table scrolls horizontally if needed

---

## Mobile Layout (< 768px)

- Full-width single column
- Top bar: hamburger + "CS 249" + avatar
- Sessions as stacked cards
- Submit button sticky at bottom
- Past submissions as cards instead of table rows
