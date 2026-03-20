# Changelog

All notable changes to DTF Editor will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.1.1] - 2026-03-19

### Added
- **Help modals on all 7 pages** — step-by-step instructions that auto-show on first visit (stored in localStorage), reopenable via ? button
  - Dashboard, Process page, Upscale, Background Removal, Vectorize, AI Generate, Color Changer
- Shared `HelpModal` component with configurable accent colors, steps, and pro tips
- Color Changer help modal now auto-shows on first visit (was manual only)

---

## [1.1.0] - 2026-03-19

### Added
- **Color Changer Tool** — client-side color replacement with HSL shift preserving shading/texture
  - Global color selection (all matching pixels, not just connected)
  - Multi-color targeting with Shift+Click to add shades
  - Excluded colors with Alt+Click for positive/negative matching
  - Lasso tool for spatial refinement (draw, Shift+Draw to add area, Alt+Draw to exclude area)
  - Live tolerance slider that recomputes selection in real-time
  - Full undo/redo history stack (20 entries, keyboard shortcuts)
  - Color picker with react-colorful wheel + hex input
  - DPI quality warning on image load (checks 300 DPI at 10" wide)
  - Save to gallery, download PNG, route to upscale/BG removal
  - Help modal with step-by-step instructions and pro tips
  - Per-tier monthly usage allocations (Free: 5, Starter: 25, Pro: 50) with credit fallback
  - Database: `color_changes_used` tracking column + monthly reset function
- Color Change card on dashboard and process page
- Color Change in header Create dropdown menu

### Changed
- **Header redesign** — frosted glass effect, rounded pill nav items, gradient avatar with user initial, Create dropdown with tool descriptions, active route highlighting, close-on-outside-click
- **Dashboard redesign** — data-driven tool cards with colored icon backgrounds and hover animations, plan badge, tighter layout, "Quick Actions" section header
- **Process page polish** — refined upload dropzone with amber accent, data-driven tool cards with colored icons, unified toggle style
- **Tool page toggles** — unified Single/Bulk toggle across upscale and BG removal pages (rounded-xl, neutral active state)

### Fixed
- Checkerboard transparency background now uses white + light gray for better readability

---

## [1.0.0] - 2026-03-19

### Added
- **Bulk Background Removal** — process multiple images via ClippingMagic headless API with before/after review, flag for re-edit, download as ZIP
- **Bulk Upscaling** — batch upscale with per-image print size configuration, progress tracking, ZIP download
- Single/Bulk toggle on process page, upscale page, and BG removal page
- Image preview modal for bulk BG removal results (side-by-side original vs result)

### Fixed
- ClippingMagic headless auto-clip using `format=result` (replaced broken `format=json` polling)
- WebP to PNG conversion before ClippingMagic upload
- ZIP download handles data URLs via direct blob conversion (CSP fix)
- Edit modal snapshots flagged items to prevent list shrinking during sequential edits

### Technical
- Vendored magic-wand-js for ESM/webpack compatibility
- Dependencies: konva, react-konva, react-colorful, jszip
- `/api/process` timeout increased to 120s for headless BG removal
