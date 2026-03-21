# Wireframe -- Electron Desktop App

The Electron desktop app provides time tracking with automatic screenshot
capture. Fixed viewport: **420 x 680 px**.

---

## 1. Login Screen

```
+------------------------------------------+
|                                          |
|                                          |
|                                          |
|           [NAU Logo / Shield]            |
|                                          |
|           NAU Timesheet Tracker          |
|           Desktop Timer                  |
|                                          |
|                                          |
|  +------------------------------------+  |
|  | Email                              |  |
|  | jd123@nau.edu                      |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  | Password                       [o] |  |
|  | ********                           |  |
|  +------------------------------------+  |
|                                          |
|  [x] Remember me                        |
|                                          |
|  +------------------------------------+  |
|  |           Sign In                  |  |
|  +------------------------------------+  |
|         ^^ NAU Navy bg, white text       |
|                                          |
|  Forgot password?    Sign in with NAU SSO|
|                                          |
|                                          |
|  ----------------------------------------|
|  v1.0.0                    NAU SICCS     |
+------------------------------------------+
```

---

## 2. Main Timer Screen (Idle)

```
+------------------------------------------+
|  [=] NAU Timesheet          Jane Doe [v] |
|------------------------------------------|
|                                          |
|  Course                                  |
|  +------------------------------------+  |
|  | CS 249 - Data Structures        v  |  |
|  +------------------------------------+  |
|                                          |
|  Category                                |
|  +--------+--------+--------+--------+  |
|  |Grading | OH     |Lab Prep|  Other |  |
|  +--------+--------+--------+--------+  |
|   ^^^^^^^^                               |
|   active (gold bg)                       |
|                                          |
|  Mode                                    |
|  +------------------+------------------+ |
|  |   Auto Timer    |  Manual Entry    | |
|  +------------------+------------------+ |
|   ^^^^^^^^^^^^^^^^^                      |
|   active (navy bg, white text)           |
|                                          |
|  ----------------------------------------|
|                                          |
|              00:00:00                    |
|          ^^ JetBrains Mono 48px          |
|             muted color (idle)           |
|                                          |
|  ----------------------------------------|
|                                          |
|         +------------------------+       |
|         |                        |       |
|         |     Start Timer        |       |
|         |                        |       |
|         +------------------------+       |
|          ^^ large green button           |
|                                          |
|  ----------------------------------------|
|  Today: 2h 30m    This week: 14h 00m    |
|  Budget: [||||||||||       ] 24/40 hrs   |
+------------------------------------------+
```

---

## 3. Main Timer Screen (Running)

```
+------------------------------------------+
|  [=] NAU Timesheet          Jane Doe [v] |
|------------------------------------------|
|                                          |
|  Course                                  |
|  +------------------------------------+  |
|  | CS 249 - Data Structures        v  |  |
|  +------------------------------------+  |
|    ^^ disabled while running             |
|                                          |
|  Category                                |
|  +--------+--------+--------+--------+  |
|  |Grading | OH     |Lab Prep|  Other |  |
|  +--------+--------+--------+--------+  |
|    ^^ disabled while running             |
|                                          |
|  Mode                                    |
|  +------------------+------------------+ |
|  |   Auto Timer    |  Manual Entry    | |
|  +------------------+------------------+ |
|    ^^ disabled while running             |
|                                          |
|  ----------------------------------------|
|                                          |
|              01:23:45                    |
|          ^^ JetBrains Mono 48px          |
|             white text, pulse animation  |
|                                          |
|     Started at 9:00 AM  --  Grading      |
|                                          |
|  ----------------------------------------|
|                                          |
|         +------------------------+       |
|         |                        |       |
|         |     Stop Timer         |       |
|         |                        |       |
|         +------------------------+       |
|          ^^ large red button             |
|                                          |
|  ----------------------------------------|
|  Today: 3h 53m    This week: 15h 23m    |
|  Budget: [||||||||||||     ] 25.4/40 hrs |
|  Next screenshot in: 2:34               |
+------------------------------------------+
```

---

## 4. Stop Timer Dialog

When the user clicks "Stop Timer," this dialog appears:

```
+------------------------------------------+
|                                          |
|  Session Complete                        |
|  ========================================|
|                                          |
|  Course:    CS 249 - Data Structures     |
|  Category:  Grading                      |
|  Duration:  1h 23m 45s                   |
|  Time:      9:00 AM - 10:23 AM          |
|                                          |
|  ----------------------------------------|
|                                          |
|  What did you work on?                   |
|  +------------------------------------+  |
|  | Graded homework 5 submissions      |  |
|  | for section 2 (papers 31-60).      |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  ----------------------------------------|
|                                          |
|  Proof of Work (optional)                |
|  Auto-captured: 16 screenshots           |
|  +------+ +------+ +------+ +------+    |
|  | ss1  | | ss2  | | ss3  | | ss4  |    |
|  +------+ +------+ +------+ +------+    |
|  +------+ +------+ +------+ +------+    |
|  | ss5  | | ss6  | | ss7  | | ss8  |    |
|  +------+ +------+ +------+ +------+    |
|  ... (scrollable)                        |
|                                          |
|  Add additional photo:                   |
|  +- - - - - - - - - - - - - - - - - -+  |
|  |    [camera icon]                   |  |
|  |    Drop file or click to browse    |  |
|  +- - - - - - - - - - - - - - - - - -+  |
|                                          |
|  ----------------------------------------|
|                                          |
|  [Discard Session]     [Save Session]    |
|   ^^ ghost/text btn    ^^ navy solid btn |
|                                          |
+------------------------------------------+
```

---

## 5. Manual Entry Mode

When "Manual Entry" is selected instead of "Auto Timer":

```
+------------------------------------------+
|  [=] NAU Timesheet          Jane Doe [v] |
|------------------------------------------|
|                                          |
|  Course                                  |
|  +------------------------------------+  |
|  | CS 249 - Data Structures        v  |  |
|  +------------------------------------+  |
|                                          |
|  Category                                |
|  +--------+--------+--------+--------+  |
|  |Grading | OH     |Lab Prep|  Other |  |
|  +--------+--------+--------+--------+  |
|                                          |
|  Mode                                    |
|  +------------------+------------------+ |
|  |   Auto Timer    |  Manual Entry    | |
|  +------------------+------------------+ |
|                      ^^^^^^^^^^^^^^^^^^  |
|                      active              |
|                                          |
|  ----------------------------------------|
|                                          |
|  Date:   [Mar 21, 2026     ]             |
|  Start:  [09:00 AM         ]             |
|  End:    [11:00 AM         ]             |
|                                          |
|  Duration: 2h 00m (auto-calculated)      |
|                                          |
|  ----------------------------------------|
|                                          |
|  Description:                            |
|  +------------------------------------+  |
|  | Held office hours, helped 8       |  |
|  | students with homework 5.         |  |
|  +------------------------------------+  |
|                                          |
|  Proof of Work:                          |
|  +- - - - - - - - - - - - - - - - - -+  |
|  |    Drop file or click to browse    |  |
|  +- - - - - - - - - - - - - - - - - -+  |
|                                          |
|  ----------------------------------------|
|                                          |
|         +------------------------+       |
|         |    Save Session        |       |
|         +------------------------+       |
|                                          |
|  ----------------------------------------|
|  Today: 2h 30m    This week: 14h 00m    |
|  Budget: [||||||||||       ] 24/40 hrs   |
+------------------------------------------+
```

---

## 6. System Tray States

The app minimizes to the system tray. The tray icon and menu change based on
state.

### Tray Icon States

```
  [T]  -- Idle (navy icon, no activity)
  [T*] -- Running (green dot overlay, pulsing)
  [T!] -- Reminder (red dot, submission due soon)
```

### Tray Context Menu (Idle)

```
+------------------------------+
|  NAU Timesheet Tracker       |
|  --------------------------  |
|  Start Timer...              |
|  Open Dashboard (web)        |
|  --------------------------  |
|  Today: 2h 30m               |
|  This Week: 14h 00m          |
|  --------------------------  |
|  Preferences...              |
|  Quit                        |
+------------------------------+
```

### Tray Context Menu (Running)

```
+------------------------------+
|  NAU Timesheet Tracker       |
|  --------------------------  |
|  RECORDING: CS 249 Grading   |
|                              |
|     01:23:45                 |
|     (JetBrains Mono)         |
|                              |
|  Stop Timer                  |
|  --------------------------  |
|  Open Dashboard (web)        |
|  --------------------------  |
|  Quit                        |
+------------------------------+
```

### Tray Popover (macOS, on click)

```
+------------------------------+
|                              |
|  CS 249 - Grading            |
|                              |
|       01:23:45               |
|                              |
|  Started: 9:00 AM            |
|  Screenshots: 16             |
|                              |
|  [  Stop Timer  ]            |
|                              |
+------------------------------+
```

---

## 7. Hamburger Menu (top-left [=])

```
+---------------------------+
|  Jane Doe                 |
|  jd123@nau.edu            |
|  TA                       |
|  ======================== |
|  Timer           (home)   |
|  My Sessions              |
|  Open Web Dashboard  -->  |
|  ======================== |
|  Preferences              |
|  About                    |
|  Sign Out                 |
+---------------------------+
```

---

## 8. Preferences Screen

```
+------------------------------------------+
|  [<] Preferences                         |
|------------------------------------------|
|                                          |
|  General                                 |
|  ======================================  |
|  Launch at login:       [toggle ON ]     |
|  Minimize to tray:      [toggle ON ]     |
|  Show tray timer:       [toggle ON ]     |
|                                          |
|  Screenshots                             |
|  ======================================  |
|  Capture interval:      [5] min          |
|  Capture quality:       [Medium   v]     |
|  Storage location:      [~/nau-ss]       |
|                           [Browse...]    |
|                                          |
|  Notifications                           |
|  ======================================  |
|  Submission reminders:  [toggle ON ]     |
|  Reminder day:          [Sunday   v]     |
|  Reminder time:         [6:00 PM  ]      |
|                                          |
|  ======================================  |
|                                          |
|  [Reset to Defaults]  [Save]            |
|                                          |
+------------------------------------------+
```

---

## Window Behavior Notes

- Fixed size: 420 x 680 px, not resizable
- Close button (x) minimizes to tray (does not quit)
- Quit only via tray menu or hamburger menu
- Always-on-top option available in Preferences
- Single instance enforced (opening again focuses existing window)
