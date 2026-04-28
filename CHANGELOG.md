# Changelog

All notable changes to DTF Editor will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.2.0] - 2026-04-28

In-house background removal — a no-credit alternative to ClippingMagic, built on a Python rembg microservice with an interactive SAM-powered AI brush. Branch: `claude/in-house-background-processing-Ci5rc`.

### Added — Server (`rembg-service/`)
- FastAPI service with auto-detect, multi-mode background removal, SAM encode/decode, health/debug endpoints
- MobileSAM ONNX wrapper (`sam_predictor.py`) — ~38MB encoder + ~6MB decoder
- BRIA-rmbg promoted to default ML model (was BiRefNet); BiRefNet-massive added as opt-in slow/quality option
- Single-color and multi-color BFS flood-fill helpers (`_flood_fill_color_removal`, `_flood_fill_multi_color_removal`)
- Dockerfile pre-downloads bria-rmbg + birefnet-general-lite + SAM ONNX so cold starts skip ~330MB of HuggingFace fetches

### Added — Studio Background Removal panel
- **AI Brush mode (default)** — SAM-powered iterative refinement
  - Smart initial mask: BRIA cutout + auto-color-fill on the detected dominant background color
  - Per-stroke commit applies SAM region union (Keep) or difference (Remove) to a cumulative mask
  - Color-aware cleanup: rawPath stride + 3×3 neighborhood sampling + 4-bit dedup yields 20–80 unique colors per stroke for refined per-pixel classification
  - Solid SVG-path stroke visualization (green Keep / red Remove)
  - Live "Edge Cleanup" tolerance slider (0–150)
  - O(1) undo via pre-stroke mask snapshots — no SAM re-call
  - Marching-ants outline (static dashed) traces the cumulative mask boundary
- **Color (Color Pick) mode** — pure color-based BFS with multi-color palettes
  - "Pick to Remove" / "Pick to Keep" tool toggle
  - Multiple chips per palette, click-to-delete
  - Keep colors act as BFS barriers — same-color content trapped inside the subject is preserved automatically
  - Click-to-clean-spot for interior speckles (BFS from seed)
- **AI Only mode** — ML mask, no flood-fill, model selector
- **Shared canvas chrome**
  - View toggle: Cutout (faded preview) / Preview (final transparent) / Original
  - Zoom: bare wheel toward cursor (desktop), pinch (touch); range 0.25× – 8×
  - Pan: spacebar+drag (desktop), two-finger drag (touch)
  - Zoom controls pill: −/percent/+/Fit
  - PointerEvents unify mouse, touch, and pen input
  - ResizeObserver tracks un-transformed canvas size for stable overlays under zoom

### Changed
- Default ML cutout model is now BRIA-rmbg (was BiRefNet General Lite)
- Studio's BG-removal flow is now a single panel with three modes (was separate routes)
- All new background removal flows cost 0 credits (ClippingMagic stays at 1 credit per image)

### Fixed
- Two production TDZ bugs in BG removal panel (commits `a533398`, `44b1a92`) — useCallback deps must reference identifiers declared earlier
- Marching ants outline rendering at wrong scale/position when canvas grew post-mount (ResizeObserver fix in 1.13)
- "Reset to original" not re-running AI analysis (commit `2585beb`)

### Technical
- New types: `BgDetectionResult`, `RemovalOptions` (with `removeColors`/`keepColors`), `SamPoint`, `SamSession`
- New hooks: `runEmbed`, `runPredict`, `runPredictRaw`, `clientMultiFloodFill`, `samplePathPoints`
- Dependencies: `huggingface_hub`, `onnxruntime` pinned (server)
- Reuses vendored `lib.traceContours` (magic-wand-js) for marching ants — no new client deps
- Full plan history preserved in `docs/AI_BRUSH_PLAN_HISTORY.md`

---

## [1.1.2] - 2026-03-19

### Fixed
- **Color changer: achromatic color replacement** — complete rewrite of the color shift algorithm with 4 distinct cases:
  - Chromatic→Chromatic: HSL hue shift (unchanged, works great)
  - Achromatic→Chromatic: luminance-mapped colorize (white→red, black→blue)
  - Chromatic→Achromatic: desaturation toward target luminance (red→black, blue→white)
  - Achromatic→Achromatic: direct replacement (black↔white now works perfectly)
- White→any color now produces the correct color at full brightness
- Black→any color now produces the correct color
- Black↔white transitions work with direct pixel replacement
- Uses perceived luminance (Rec. 709) instead of HSL lightness for accurate color math

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
