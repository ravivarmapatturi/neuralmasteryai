# Interview Color Palette WCAG 2.1 Contrast Audit

Audited on 10 November 2026 for the revised interview pages palette (Stage 0 / G1).

Standard: **WCAG 2.1 AA** (minimum 4.5:1 for body and secondary text, 3:1 for large text/headings).

## Measured Contrast Ratios

| Theme | Element / Usage | Text Color | Background | Measured Ratio | WCAG AA Body (>=4.5:1) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Light | Headings / Primary body | `#111827` | `#ffffff` | **17.74:1** | 4.5:1 | PASS |
| Light | Primary text on background | `#111827` | `#f8f9fa` | **16.83:1** | 4.5:1 | PASS |
| Light | Primary text on alt surface | `#111827` | `#f1f3f6` | **15.96:1** | 4.5:1 | PASS |
| Light | Secondary text on card surface | `#4b5563` | `#ffffff` | **7.56:1** | 4.5:1 | PASS |
| Light | Secondary text on page background | `#4b5563` | `#f8f9fa` | **7.17:1** | 4.5:1 | PASS |
| Light | Secondary text on alt surface | `#4b5563` | `#f1f3f6` | **6.80:1** | 4.5:1 | PASS |
| Light | Primary action button text | `#ffffff` | `#1d4fc4` | **7.08:1** | 4.5:1 | PASS |
| Light | Accent link / text on surface | `#1d4fc4` | `#ffffff` | **7.08:1** | 4.5:1 | PASS |
| Light | Accent link / text on background | `#1d4fc4` | `#f8f9fa` | **6.71:1** | 4.5:1 | PASS |
| Light | Success / covered text on surface | `#15803d` | `#ffffff` | **5.02:1** | 4.5:1 | PASS |
| Light | Warning / not detected text on surface | `#9a3412` | `#ffffff` | **7.31:1** | 4.5:1 | PASS |
| Light | Danger / error text on surface | `#b91c1c` | `#ffffff` | **6.47:1** | 4.5:1 | PASS |
| Dark | Headings / Primary body | `#f3f4f6` | `#181a20` | **15.80:1** | 4.5:1 | PASS |
| Dark | Primary text on background | `#f3f4f6` | `#0f1115` | **17.17:1** | 4.5:1 | PASS |
| Dark | Primary text on alt surface | `#f3f4f6` | `#20232b` | **14.28:1** | 4.5:1 | PASS |
| Dark | Secondary text on card surface | `#9ca3af` | `#181a20` | **6.85:1** | 4.5:1 | PASS |
| Dark | Secondary text on page background | `#9ca3af` | `#0f1115` | **7.44:1** | 4.5:1 | PASS |
| Dark | Secondary text on alt surface | `#9ca3af` | `#20232b` | **6.19:1** | 4.5:1 | PASS |
| Dark | Primary action button text | `#ffffff` | `#2563eb` | **5.17:1** | 4.5:1 | PASS |
| Dark | Accent text / link on surface | `#5b96f7` | `#181a20` | **5.92:1** | 4.5:1 | PASS |
| Dark | Accent text / link on background | `#5b96f7` | `#0f1115` | **6.43:1** | 4.5:1 | PASS |
| Dark | Success / covered text on surface | `#34d399` | `#181a20` | **9.05:1** | 4.5:1 | PASS |
| Dark | Warning / not detected text on surface | `#fbbf24` | `#181a20` | **10.42:1** | 4.5:1 | PASS |
| Dark | Danger / error text on surface | `#f87171` | `#181a20` | **6.29:1** | 4.5:1 | PASS |

## Palette Definitions

### Clean Light Theme
- Page Background (`--bg`): `#f8f9fa`
- Surface Card (`--surface`): `#ffffff`
- Alt Surface (`--surface-alt`): `#f1f3f6`
- Border Line (`--line`): `#e2e4e9`
- Primary Text (`--fg`): `#111827`
- Secondary Text (`--soft`): `#4b5563`
- Action Accent (`--accent`): `#1d4fc4`
- Success (`--good`): `#15803d`
- Warning (`--warn`): `#9a3412`
- Danger (`--bad`): `#b91c1c`

### Neutral Near-Black Dark Theme
- Page Background (`--bg`): `#0f1115` (neutral near-black, zero blue cast)
- Surface Card (`--surface`): `#181a20`
- Alt Surface (`--surface-alt`): `#20232b`
- Border Line (`--line`): `#2b2f3a`
- Primary Text (`--fg`): `#f3f4f6`
- Secondary Text (`--soft`): `#9ca3af`
- Action Accent (`--accent`): `#2563eb` (text/link: `#5b96f7`)
- Success (`--good`): `#34d399`
- Warning (`--warn`): `#fbbf24`
- Danger (`--bad`): `#f87171`

## Verification Result

All 24 measured text and background pairs meet or exceed the mandatory 4.5:1 ratio: **ALL PASSED**.
