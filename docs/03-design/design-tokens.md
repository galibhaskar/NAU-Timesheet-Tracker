# Design Tokens -- NAU Timesheet Tracker

All visual primitives for the NAU TA Timesheet Tracker. These tokens feed into
Tailwind CSS via `tailwind.config.ts` and are consumed by every component in
both the Next.js web dashboards and the Electron desktop app.

---

## 1. Color Palette

### Brand Colors

| Token              | Hex       | Usage                                    |
|--------------------|-----------|------------------------------------------|
| `primary`          | `#003466` | NAU Navy -- headers, primary buttons     |
| `primary-light`    | `#1a5276` | Hover states, secondary surfaces         |
| `primary-dark`     | `#002244` | Active/pressed states                    |
| `accent`           | `#FFC627` | NAU Gold -- highlights, active tab, CTA  |
| `accent-dark`      | `#D4A017` | Gold hover/pressed                       |

### Semantic / Status Colors

| Token              | Hex       | Usage                                      |
|--------------------|-----------|--------------------------------------------|
| `budget-green`     | `#16a34a` | Budget under 80%, approval badge           |
| `budget-yellow`    | `#eab308` | Budget 80-95%, warning badge               |
| `budget-red`       | `#dc2626` | Budget over 95%, rejection badge, errors   |
| `info`             | `#2563eb` | Informational banners                      |

### Traffic-Light (Admin Dashboard)

| Token              | Hex       | Meaning                          |
|--------------------|-----------|----------------------------------|
| `traffic-green`    | `#22c55e` | All TAs submitted & approved     |
| `traffic-yellow`   | `#facc15` | Submissions pending review       |
| `traffic-red`      | `#ef4444` | Missing submissions / overdue    |

### Light Mode Surface Colors

| Token              | Hex       | Usage                            |
|--------------------|-----------|----------------------------------|
| `bg-page`          | `#f8fafc` | Page background (slate-50)       |
| `bg-surface`       | `#ffffff` | Cards, panels                    |
| `bg-surface-alt`   | `#f1f5f9` | Alternating table rows (slate-100)|
| `bg-sidebar`       | `#003466` | Sidebar background (navy)        |
| `text-primary`     | `#0f172a` | Headings (slate-900)             |
| `text-secondary`   | `#475569` | Body text (slate-600)            |
| `text-muted`       | `#94a3b8` | Placeholder, captions (slate-400)|
| `text-on-primary`  | `#ffffff` | Text on navy/dark backgrounds    |
| `text-on-accent`   | `#1e293b` | Text on gold backgrounds         |
| `border-default`   | `#e2e8f0` | Card borders, dividers (slate-200)|
| `border-focus`     | `#003466` | Focus ring color                 |

### Dark Mode Surface Colors

| Token              | Hex       | Usage                            |
|--------------------|-----------|----------------------------------|
| `bg-page`          | `#0f172a` | Page background (slate-900)      |
| `bg-surface`       | `#1e293b` | Cards, panels (slate-800)        |
| `bg-surface-alt`   | `#334155` | Alternating rows (slate-700)     |
| `bg-sidebar`       | `#002244` | Sidebar background               |
| `text-primary`     | `#f1f5f9` | Headings (slate-100)             |
| `text-secondary`   | `#cbd5e1` | Body text (slate-300)            |
| `text-muted`       | `#64748b` | Placeholder, captions (slate-500)|
| `text-on-primary`  | `#ffffff` | Text on navy backgrounds         |
| `text-on-accent`   | `#1e293b` | Text on gold backgrounds         |
| `border-default`   | `#334155` | Card borders, dividers (slate-700)|
| `border-focus`     | `#FFC627` | Focus ring color (gold in dark)  |

---

## 2. Typography

### Font Families

| Token         | Family                          | Usage                                |
|---------------|---------------------------------|--------------------------------------|
| `font-body`   | `Inter, system-ui, sans-serif`  | All body text, headings, UI labels   |
| `font-mono`   | `JetBrains Mono, monospace`     | Timer display, code, durations       |

### Type Scale

| Token    | Size   | Weight   | Line Height | Usage                          |
|----------|--------|----------|-------------|--------------------------------|
| `h1`     | 30px   | 700 Bold | 1.2         | Page titles                    |
| `h2`     | 24px   | 600 Semi | 1.3         | Section headings               |
| `h3`     | 20px   | 600 Semi | 1.4         | Card titles                    |
| `h4`     | 16px   | 600 Semi | 1.4         | Sub-section labels             |
| `body`   | 14px   | 400 Reg  | 1.5         | Default body text              |
| `body-sm`| 13px   | 400 Reg  | 1.5         | Table cells, secondary info    |
| `caption`| 12px   | 400 Reg  | 1.4         | Timestamps, hints, footnotes   |
| `label`  | 12px   | 500 Med  | 1.0         | Form labels, badges            |
| `timer`  | 48px   | 700 Bold | 1.0         | Timer display (JetBrains Mono) |
| `timer-sm`| 32px  | 700 Bold | 1.0         | Tray/compact timer             |

---

## 3. Spacing

Base unit: **4px**

| Token  | Value | Common Usage                         |
|--------|-------|--------------------------------------|
| `0`    | 0px   | Reset                                |
| `0.5`  | 2px   | Micro gap (icon-to-text tight)       |
| `1`    | 4px   | Inline padding, tight gaps           |
| `1.5`  | 6px   | Badge padding                        |
| `2`    | 8px   | Icon gaps, small internal padding    |
| `3`    | 12px  | Input padding, list item gap         |
| `4`    | 16px  | Card padding, section gap            |
| `5`    | 20px  | Between form fields                  |
| `6`    | 24px  | Between card sections                |
| `8`    | 32px  | Major section spacing                |
| `10`   | 40px  | Page section breaks                  |
| `12`   | 48px  | Page top/bottom padding              |
| `16`   | 64px  | Sidebar width padding                |

---

## 4. Border Radius

| Token          | Value | Usage                              |
|----------------|-------|------------------------------------|
| `radius-sm`    | 4px   | Badges, small chips                |
| `radius-md`    | 6px   | Inputs, buttons                    |
| `radius-lg`    | 8px   | Cards, panels                      |
| `radius-xl`    | 12px  | Modal dialogs, popovers           |
| `radius-full`  | 9999px| Avatars, toggle knobs, pills       |

---

## 5. Shadows

| Token          | Value                                              | Usage               |
|----------------|----------------------------------------------------|---------------------|
| `shadow-sm`    | `0 1px 2px rgba(0,0,0,0.05)`                      | Subtle lift         |
| `shadow-md`    | `0 4px 6px -1px rgba(0,0,0,0.1)`                  | Cards, dropdowns    |
| `shadow-lg`    | `0 10px 15px -3px rgba(0,0,0,0.1)`                | Modals, popovers    |
| `shadow-glow`  | `0 0 0 3px rgba(0,52,102,0.25)`                   | Focus ring (light)  |
| `shadow-glow-gold` | `0 0 0 3px rgba(255,198,39,0.35)`             | Focus ring (dark)   |

---

## 6. Responsive Breakpoints

| Token       | Range            | Target                                  |
|-------------|------------------|-----------------------------------------|
| `mobile`    | < 768px          | Mobile web (rarely primary target)      |
| `tablet`    | 768px -- 1279px  | Tablet, small laptops                   |
| `desktop`   | >= 1280px        | Primary web dashboard layout            |
| `electron`  | fixed 420x680px  | Electron desktop app (non-responsive)   |

Sidebar collapses to hamburger below `tablet`. Budget bars stack vertically
below `desktop`. The Electron app uses a fixed viewport and does not respond to
browser breakpoints.

---

## 7. Tailwind Config Extension

Add the following to `tailwind.config.ts` to register all design tokens:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // -- Brand --
        "nau-navy": "#003466",
        "nau-navy-light": "#1a5276",
        "nau-navy-dark": "#002244",
        "nau-gold": "#FFC627",
        "nau-gold-dark": "#D4A017",

        // -- Semantic --
        "budget-green": "#16a34a",
        "budget-yellow": "#eab308",
        "budget-red": "#dc2626",
        info: "#2563eb",

        // -- Traffic lights --
        "traffic-green": "#22c55e",
        "traffic-yellow": "#facc15",
        "traffic-red": "#ef4444",

        // -- Surfaces (light) --
        "surface-page": "#f8fafc",
        "surface-card": "#ffffff",
        "surface-alt": "#f1f5f9",

        // -- Surfaces (dark) -- consumed via dark: prefix
        "surface-page-dark": "#0f172a",
        "surface-card-dark": "#1e293b",
        "surface-alt-dark": "#334155",
      },
      fontFamily: {
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        timer: ["48px", { lineHeight: "1", fontWeight: "700" }],
        "timer-sm": ["32px", { lineHeight: "1", fontWeight: "700" }],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        glow: "0 0 0 3px rgba(0,52,102,0.25)",
        "glow-gold": "0 0 0 3px rgba(255,198,39,0.35)",
      },
      screens: {
        tablet: "768px",
        desktop: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 8. CSS Custom Properties (optional layer)

For contexts outside Tailwind (Electron native chrome, raw CSS), expose tokens
as CSS custom properties in `globals.css`:

```css
:root {
  --color-primary: #003466;
  --color-primary-light: #1a5276;
  --color-accent: #FFC627;
  --color-bg-page: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-border: #e2e8f0;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --radius-md: 6px;
  --radius-lg: 8px;
}

.dark {
  --color-bg-page: #0f172a;
  --color-bg-surface: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-border: #334155;
}
```
