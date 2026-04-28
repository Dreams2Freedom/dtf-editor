# AI Brush — Plan History (Phases 1.7 → 1.14)

**Created:** April 28, 2026
**Branch:** `claude/in-house-background-processing-Ci5rc`
**Purpose:** Linear record of every plan written during the in-house background removal sprint, in reverse-chronological order (newest plan first). Each plan was approved by the user before implementation; each "SHIPPED" header marks a phase that landed in production.

This file shows **how we got here, decision by decision** — what the user reported, what we considered, what we picked, and what we deferred. Use this when:
- Re-entering this codebase after a break and trying to remember why a particular abstraction exists
- Considering a change that conflicts with a deliberately-chosen earlier design
- Reviewing the full evolution from "simple flood-fill" → "BFS with multi-color barriers + SAM-driven brush"

For per-phase commit details, see the April 27–28 entry in `DEVELOPMENT_LOG_PART1.md`.
For bug postmortems, see `BUGS_TRACKER.md` (BUG-068 through BUG-072).
For the user-visible release summary, see the `[1.2.0]` entry in `CHANGELOG.md`.

---

# Plan: Multi-Color Palettes Everywhere — Brush + Color Pick (Phase 1.14)

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.13 testing on TOP DAD: the initial cutout is great, but ongoing manual refinement leaves speckles. User diagnosed two issues:

1. **AI Brush palette is too sparse.** A Remove stroke that visibly sweeps across both pure-black and gray-fringe pixels currently samples *one* RGB value per SAM-prompt point — and those prompt points only land every `brushSize` pixels along the path (`samplePathPoints` rejects denser samples). With brushSize=5, a 100px stroke yields ~20 samples; with brushSize=20, ~5 samples. The fringe grays are typically *between* sample points, so they never enter the palette → cleanup misses them.

2. **Color Pick mode is single-color.** It supports one `targetColor` + tolerance + flood-fill from edges. The user wants **multi-color remove + multi-color keep** so they can work spatial nuance: "remove this black where it's near the background, but the same black inside the logo should stay." Pure pixel-classification can't do this — but BFS-from-edges with keep colors as barriers can.

User-confirmed UX choices:
- **Color Pick algorithm**: BFS-from-edges with multi-color remove palette + keep palette as **barriers** (so same-color content trapped inside the subject is preserved). Optional click-to-seed for interior speckles.
- **Edge Cleanup slider max → 150** (catches mid-grays without changing default behavior at 60).
- Mobile-friendly throughout.

## Recommended Approach

### Part A: Dense brush palette sampling

Replace the sparse SAM-prompt sampling with **path-based + neighborhood sampling**, run per stroke at commit time.

**Current** (`collectStrokeColors`, panel:174–192): iterates `s.points` (SAM-prompt points, ~5–30 per stroke) and grabs **one RGB per point**.

**New** `collectStrokePaletteColors(history, tool, orig)`:
- For each stroke of the matching tool, walk the **rawPath** in 2-pixel steps (so a 100px stroke gives ~50 samples).
- For each path point, sample a **3×3 neighborhood** centered on the point (9 pixels). Add all 9 RGBs to the palette.
- Dedupe via 4-bit-per-channel quantization (16³ = 4096 buckets): two RGBs that map to the same `(r>>4, g>>4, b>>4)` triple are collapsed. Output is typically 20–80 unique colors per stroke after dedup, fast in `applyColorCleanup`.

This reliably captures fringe/anti-aliasing colors that the current point-only sampling misses — directly addressing the "we have black AND gray, system only sees black" complaint.

### Part B: Color Pick mode → multi-color (remove + keep)

**State** (panel-local):
- `removeColors: RGB[]` (replaces `targetColor: RGB | null`)
- `keepColors: RGB[]` (new)
- `pickTool: 'remove' | 'keep'` (which list a click adds to)

**UI** (in the Color Pick side panel, replaces the existing single-swatch block):
- Two-button toggle: "Pick to Remove" (red) / "Pick to Keep" (green) — touch-friendly buttons (≥ 32 px tall)
- Below each: a chip row showing selected colors (28×28 swatches with × to delete)
- Existing Tolerance slider (max stays 150)
- "Click to remove a spot" / interior-seed button (existing): when active, next click starts BFS from that point instead of the edges
- "Reset palettes" button to clear both lists

**Click handling** (`handlePreviewClick` in panel):
- If `pickTool === 'remove'`: append the picked RGB to `removeColors`, recompute preview
- If `pickTool === 'keep'`: append to `keepColors`, recompute preview
- If `clickRemoveMode` is active: same logic but seed BFS from the click point

**Algorithm** (new `clientMultiFloodFill` in `useBackgroundRemoval.ts`, mirrors existing `clientFloodFill` shape):

```ts
clientMultiFloodFill(
  src: ImageData,
  removePalette: RGB[],
  keepPalette: RGB[],
  tolerance: number,
  seedPoint: {x, y} | null = null,
): ImageData
```

- Pre-pass: classify every pixel:
  - `2` = barrier (≤ tolerance from any keep color OR alpha < 10)
  - `1` = removable candidate (closer to a remove color than any keep, within tolerance)
  - `0` = neither (preserved)
- BFS from edges (or single seed) walking only state=1 cells; barriers and 0-cells are walls
- Set alpha=0 on visited cells
- Returns the modified ImageData

This gives the user the "context-aware removal" they described: black at the edges gets walked through and removed; black inside the subject is unreachable (because it's surrounded by red/white/green which are in the keep palette OR are simply "neither" cells that don't match remove).

**Server-side** (`rembg-service/main.py`):
- Extend `/remove` form params: accept JSON arrays for `target_colors_json` and `keep_colors_json`. Backwards-compat: legacy `target_color` keeps working as a single-element shortcut.
- New helper `_flood_fill_multi_color_removal(img, target_rgbs, keep_rgbs, tolerance, seed_points)` mirroring the client algorithm. Reuses the existing BFS skeleton from `_flood_fill_color_removal`.
- For mode `color-fill`: dispatch to the multi-color helper if either array is non-empty.

**Client service / types**:
- `RemovalOptions` adds `removeColors?: RGB[]` and `keepColors?: RGB[]` fields. `targetColor` stays for backwards compat.
- `removeBackground` in `src/services/bgRemoval.ts` serializes the arrays as JSON form fields.

### Part C: Raise AI Brush tolerance max to 150

One-line change: `<input type="range" min={0} max={150} ... />`. Default stays 60 (no behavior change for existing users); the extended range catches darker mid-tones (TOL=120 catches RGB ~85,85,85 against pure black).

### Part D: Mobile considerations

- Pick-tool toggle and chip × buttons sized ≥ 32×32 px (Tailwind `h-8 w-8` minimum) — works for thumb taps.
- Color-pick mode handles touch via existing PointerEvents (already in place from Phase 1.13). No special handling needed.
- New chip rows wrap on small screens (`flex flex-wrap gap-1.5`).

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Replace `collectStrokeColors` with denser `collectStrokePaletteColors` (rawPath stride + 3×3 neighborhood + 4-bit-dedup). Replace `targetColor` state with `removeColors`/`keepColors` arrays + `pickTool` state. Rewrite Color Pick side panel JSX. Update `handlePreviewClick` for two-list logic. Update `applyClientPreview` to call the new multi-color helper. Update `buildOptions` to send arrays. Bump `cleanupTolerance` slider max to 150. |
| `src/hooks/useBackgroundRemoval.ts` | Add `clientMultiFloodFill(src, remove, keep, tol, seed)` — pre-classify pass + BFS skeleton borrowed from existing `clientFloodFill`. Keep `clientFloodFill` as-is for callers that still want single-color. |
| `src/types/backgroundRemoval.ts` | Add `removeColors?: RGB[]`, `keepColors?: RGB[]` to `RemovalOptions`. |
| `src/services/bgRemoval.ts` | In `removeBackground`, serialize the new fields as JSON form params (`target_colors_json`, `keep_colors_json`). |
| `rembg-service/main.py` | Accept the new form fields. Add `_flood_fill_multi_color_removal()`. In `mode='color-fill'` dispatch: prefer multi-color helper when arrays present, fall back to existing single-color path otherwise. |

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx`:
  - `collectStrokeColors` (~line 174) — replace
  - Color Pick side-panel JSX block (~lines 1454–1527) — rewrite
  - `handlePreviewClick` (~line 869) — update for two-list dispatch
  - `applyClientPreview` (~line 285) — call new multi helper
  - `buildOptions` (~line 760) — send arrays
- `src/hooks/useBackgroundRemoval.ts` — `clientFloodFill` (~line 69) for the BFS skeleton to borrow
- `rembg-service/main.py` — `_flood_fill_color_removal` (~line 64), `remove_background` `/remove` endpoint (~line 270), `mode='color-fill'` dispatch (~line 352)

## Reusable Code

- `applyColorCleanup` (panel) — palette/tolerance plumbing pattern; new `clientMultiFloodFill` shares the per-pixel min-distance logic.
- `clientFloodFill` (hook) — BFS skeleton + queue management; copy structure into the multi-color version.
- `_flood_fill_color_removal` (server) — same: keep the BFS structure, swap the per-pixel "removable" check for a multi-color version.
- 4-bit-quantization dedup (new helper, trivial: `key = (r>>4)<<8 | (g>>4)<<4 | (b>>4)`).

## Verification

**Brush sampling (Part A):**
1. **TOP DAD speckle reduction**: place ~3 Remove strokes over speckled regions. Compared to Phase 1.13, fringe grays should disappear noticeably faster (need fewer strokes / lower tolerance for same coverage).
2. **Sample count**: log palette size after a stroke commit — expect 20–80 unique colors after dedup for a 100px stroke (vs ~5–10 before).
3. **No regression on simple inputs**: solid-color background images still get cleaned correctly (palette is small but valid).

**Color Pick multi-color (Part B):**
4. Click "Pick to Remove" → click black on TOP DAD bg → black bg gets removed (BFS from edges). Click again → "Pick to Remove" → click a darker gray speckle → BFS now also walks gray fringe; remove palette has 2 chips.
5. Click "Pick to Keep" → click white inside the letters → white now barrier-protected; bumping tolerance won't accidentally erode letters.
6. **The user's exact case**: image with same color inside subject and at the edge. Add the color to remove. The edge-connected instance is removed; the trapped-inside-subject instance stays (because keep-color barriers prevent BFS from reaching it).
7. **Click to seed**: enable "Click to remove a spot" → click an interior speckle → BFS removes only the connected speck, not the whole bg.
8. **Chip × delete**: removing a chip recomputes the preview live.
9. **Server save**: applying produces the same alpha output as the client preview (server-side multi-color helper agrees with client).

**Tolerance range (Part C):**
10. Edge Cleanup slider goes to 150. At 150 with both palettes set, mid-gray fringe (~RGB 80,80,80) is removed when palette includes black; pure red is preserved (it's far from black in distance).

**Mobile (Part D):**
11. Pick-tool toggle and chips are tappable on iPhone-size devices (DevTools touch emulation): no missed taps.
12. Existing touch pinch/pan still works in Color Pick mode.

## Implementation Order

1. **Part A (dense palette)** first — small, big-impact change. Verify TOP DAD speckle reduction visibly improves.
2. **Part C (tolerance max)** — one-line, no risk.
3. **Part B server** — extend `_flood_fill_color_removal` to multi-color, add form fields. Smoke-test with curl.
4. **Part B client (hook + types + service)** — `clientMultiFloodFill`, new options fields, service serialization.
5. **Part B UI** — Color Pick panel rewrite (two pick buttons, two chip rows, click dispatcher).
6. **Part D mobile audit** — sanity-check tap targets in DevTools touch emulation.
7. Manual QA per matrix.
8. Commit + push.

## Out of Scope (Phase 2 candidates)

- Color clustering for the auto-detect (currently picks dominant + secondary; could output 3+).
- AI Brush "click to add a color to global palette" (currently colors come from strokes only).
- Per-color tolerance (currently global).
- Eyedropper magnifier overlay on touch.
- Saving palettes per-image / across sessions.

---

# Plan: AI Brush — Fix Marching Ants, Static Outline, Preview Mode, Zoom/Pan (Phase 1.13) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.12 shipped marching ants + view toggle, but user testing surfaced four issues:

1. **Marching ants outline appears in the wrong location** — it's tiny and stuck in the upper-left corner of the canvas wrapper, not tracing the actual TOP DAD logo at full scale. Root cause: `canvasRect` is captured once on mount via `getBoundingClientRect`, **before** the init effect sizes the canvas to the image's natural dimensions. The window-resize listener doesn't fire because the canvas itself grew (its content changed); only window resizes trigger `update()`. So the marching-ants SVG is sized at the canvas's initial empty/300×150 default, while its `viewBox` is set to the image's actual natural size (e.g., 999×318) — content gets squashed into the small upper-left rect.
2. **Animated dashes are distracting.** The user wants a static dashed outline.
3. **No "Preview" view mode.** Currently we have Cutout (faded) and Original (full). They want a third option that shows the *final* cutout (kept regions only, removed regions fully transparent against checkerboard) **without** the marching-ants overlay — so they can see exactly what Apply Mask will produce.
4. **No zoom/pan.** They want to zoom in/out on the canvas (and pan when zoomed) without the panel chrome (header, side panel, footer) moving. Reference image showed only the canvas + overlays in the "zoomable" region.

## Recommended Approach

### Part 1: Fix `canvasRect` with a ResizeObserver

Replace the one-shot useEffect (`BackgroundRemovalPanel.tsx:259-270`) with a `ResizeObserver` attached to `previewRef.current`. Whenever the canvas's *display* rect changes — initial layout, content set, parent resize, anything — the observer fires and `setCanvasRect` to the new rect. The window-resize listener becomes redundant and is dropped.

```ts
useEffect(() => {
  const p = previewRef.current;
  if (!p || typeof ResizeObserver === 'undefined') return;
  const update = () => {
    const r = p.getBoundingClientRect();
    setCanvasRect({ width: r.width, height: r.height });
  };
  const ro = new ResizeObserver(update);
  ro.observe(p);
  update(); // initial
  return () => ro.disconnect();
}, []);
```

Also fixes a latent bug: stroke overlay positioning relies on the same `canvasRect` and would silently mis-scale on the first stroke if the canvas grew post-mount. ResizeObserver makes both overlays robust.

### Part 2: Static marching ants

Drop the animation. Keep the black solid + white dashed double-path so the outline stays visible on any background. Remove the `marching-ants` className. The CSS keyframes block in `globals.css` becomes unused — also remove for cleanliness.

```tsx
<svg ...>
  <path d={contoursD} fill="none" stroke="black" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
  <path d={contoursD} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
</svg>
```

### Part 3: New "Preview" view mode

Extend `viewMode` union to `'cutout' | 'original' | 'preview'` and add a third pill button labeled "Preview" in the top-left toggle (between Cutout and Original).

`renderPreviewFromMask` gets a third branch:
- `'cutout'` (default): kept = full alpha, removed = faded (≤76)
- `'original'`: full original, mask not applied
- `'preview'`: kept = full alpha, removed = alpha 0 (fully transparent against checkerboard) — same pixel output as Apply Mask, but the mask is not committed yet

Hide the marching-ants SVG when `viewMode === 'preview'` (so the user sees a "clean" final-result preview with no annotations).

### Part 4: Zoom + pan (canvas only)

Wrap the canvas + SVG overlays in a transformable inner container while the cursor circle, view toggle, and new zoom controls stay **outside** the transform (so they don't scale or pan).

**State:**
- `zoom: number` (default 1, clamped to [0.25, 8])
- `pan: { x: number; y: number }` (default {0, 0})
- `isPanning: boolean` (true while spacebar held — gives cursor feedback)

**DOM structure inside the existing `<div className="relative">`:**

```tsx
<div className="relative">
  <div
    className="canvas-zoom-wrapper"
    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
  >
    <canvas ref={previewRef} ... />
    {/* stroke overlay svg */}
    {/* marching ants svg (skipped when viewMode === 'preview') */}
  </div>
  {/* cursor circle, view-mode pill, zoom controls — NOT transformed */}
</div>
```

Because `eventToCanvasCoords` uses `previewRef.current.getBoundingClientRect()`, and `getBoundingClientRect` reflects CSS transforms, **brush stroke coordinates remain correct under any zoom/pan** with no math changes.

The cursor-circle dimensions need a tweak to account for zoom:
```ts
const visualScale = overlayScale * zoom;  // canvas-pixels → screen-pixels
// cursor circle: width/height = brushSize * visualScale
```
That keeps the visual brush size matched to the canvas-pixel area SAM will receive.

**Interactions:**
- **Wheel** anywhere on the canvas wrapper → zoom in/out toward the cursor. Adjust `pan` so the canvas-pixel under the cursor stays under the cursor (standard "zoom toward cursor" formula).
- **Spacebar held** → cursor switches to `cursor: grab`; mouse-down begins pan-drag (cursor: grabbing); drag updates `pan`. Releasing space exits pan mode. Left-click brush stroke is suppressed while spacebar is held.
- Without spacebar: existing brush-stroke behavior, identical to today.

**Zoom controls** (top-right of canvas wrapper, mirroring view toggle's top-left placement):
- `−` button (zoom out by 1.25×)
- Zoom level readout (e.g., "100%")
- `+` button (zoom in by 1.25×)
- "Fit" button (zoom = 1, pan = {0,0})

Use small floating pill style consistent with the view toggle.

### Part 5: Touch / mobile support

Switch the canvas's input handlers from `MouseEvent` (`onMouseDown/Move/Up/Leave`) to **Pointer Events** (`onPointerDown/Move/Up/Leave/Cancel`). Pointer events unify mouse, touch, and pen input under one API and provide a `pointerType` field (`'mouse' | 'touch' | 'pen'`) we can branch on.

**Brush stroke handlers**:
- Single active pointer (any type) with `pointerType !== 'touch'` OR with `pointerType === 'touch'` and not in a multi-pointer gesture → existing brush behavior, just with `e.pointerType`-aware logic.
- Use `setPointerCapture(e.pointerId)` on pointer-down so the stroke continues even if the pointer leaves the canvas mid-stroke.
- Pre-existing left-click cursor-circle hides when `pointerType === 'touch'` (no hover concept on touch).

**Multi-pointer gestures** — track active pointers in a `Map<number, {x, y}>`:
- **Two pointers down** → start gesture; record initial centroid + distance.
- **Pointermove with two active pointers** → compute new centroid + distance. `zoomDelta = newDistance / oldDistance`; `panDelta = newCentroid - oldCentroid`. Apply both, with the same "zoom toward midpoint" logic as the desktop wheel-toward-cursor.
- During a multi-pointer gesture, suppress brush handlers (cancel any in-progress stroke, similar to spacebar pan).
- **Pointerup / pointercancel** → remove from active map. Falling back to one pointer drops out of gesture mode.

**Other touch UX:**
- Suppress the cursor circle entirely on touch (`pointerType === 'touch'` → never show the hover ring; touch users get visual feedback from the live SVG stroke instead).
- Apply `touch-action: none` CSS on the canvas wrapper to prevent the browser from interpreting drags as scrolls / pinches as page-zooms — gives our handlers full control.
- Zoom-control pill remains tap-friendly (already adequate hit targets).

This lets the same brush + zoom + pan UX work seamlessly on phones and tablets without a separate code path. Spacebar pan is desktop-only; touch users use two-finger pan instead. The view-mode pill, zoom buttons, and side-panel controls already work on touch.

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Replace canvasRect useEffect with ResizeObserver. Remove `marching-ants` className from the dashed path. Extend `viewMode` to include `'preview'`; add third branch in `renderPreviewFromMask`; add Preview pill button. Wrap canvas + SVG overlays in zoom-transform container with `touch-action: none`. Add `zoom`, `pan`, `isSpaceHeld` state + handlers (wheel, keydown/up for spacebar). Switch brush/canvas handlers from MouseEvent to PointerEvent; add active-pointer Map; multi-pointer pinch/pan gesture detector. Add zoom-controls pill UI. Adjust cursor-circle sizing for zoom and hide on touch. |
| `src/app/globals.css` | Remove `@keyframes marching-ants` and `.marching-ants` class (now unused). |

No server changes.

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx`:
  - `canvasRect` useEffect (lines 259-270) — replace with ResizeObserver
  - `renderPreviewFromMask` (~line 333) — add `'preview'` branch
  - `viewMode` state + sync useEffect (~lines 235, 358) — extend union
  - Stroke overlay SVG block (~line 871) — wrap in zoom container
  - Marching-ants SVG block (~line 905) — remove `marching-ants` class; conditionally render based on viewMode
  - View-toggle pill block (~line 943) — add "Preview" button
  - `eventToCanvasCoords` (~line 537) — verify correctness under transforms (no change needed; `getBoundingClientRect` handles it)
- `src/app/globals.css` — remove the `marching-ants` keyframes block

## Reusable Code

- All existing AI Brush pipeline code (commit/undo/clear/recompute) is untouched — zoom/pan operates purely on the visual layer.
- `getBoundingClientRect()`-based coord mapping already accounts for CSS transforms; no new math for stroke handlers.
- Existing pill-toggle CSS classes from the view-mode toggle.

## Verification

**Desktop:**
1. **Marching ants in correct position**: load TOP DAD. Marching ants overlay traces the actual letter/star/wing shapes at full canvas display size, not in the upper-left corner. Resize the browser window — outline stays correctly aligned.
2. **Static outline**: no animation; dashed line is stationary.
3. **Preview view**: click "Preview" pill → canvas shows only the kept regions at full opacity, removed regions transparent (checkerboard visible behind), no marching ants. Switch back to Cutout or Original — outline reappears, fade comes back as expected.
4. **Outline visibility**: ants visible in Cutout and Original, hidden in Preview.
5. **Apply Mask in Preview view**: clicking Apply while in Preview mode produces the same output as Apply from Cutout view — no regression.
6. **Zoom in (wheel up)**: image enlarges, cursor stays under the same canvas-pixel. Page does not scroll. Repeat to ~4×.
7. **Zoom out (wheel down)**: returns to fit and beyond (down to 0.25×).
8. **Pan (spacebar + drag)**: cursor switches to grab; dragging moves the canvas; release space → back to brush mode. Left-click while space held does NOT start a brush stroke.
9. **Brush stroke under zoom**: at zoom=2, draw a Keep stroke. SAM points land at correct canvas-pixel locations (verify mask updates). Cursor circle visible at the appropriate scaled size.
10. **Zoom controls pill**: −/readout/+/Fit visible top-right of canvas; clicking +/− steps zoom; Fit resets to 1× and pan to origin.
11. **Panel chrome stays still under zoom/pan**: side panel, header, footer never move.
12. **View toggle still works**: switching Cutout/Preview/Original under any zoom level updates content; zoom/pan state is preserved.

**Touch (test on a phone or browser DevTools touch emulation):**
13. **Single-finger brush stroke**: tap-and-drag on the canvas places a Keep/Remove stroke (depending on tool toggle). SAM commits on lift. No cursor circle (touch mode).
14. **Pinch zoom**: two-finger pinch out → canvas zooms in toward the midpoint; pinch in → zooms out. Page does not zoom (touch-action prevents browser hijack).
15. **Two-finger pan**: with two fingers down, drag both → canvas pans. Releasing one finger returns to single-touch (no stroke restart mid-gesture).
16. **No accidental stroke during pinch**: a stroke that started with one finger gets cancelled when a second finger lands (entering gesture mode).
17. **Mobile chrome**: side panel, sliders, buttons, view-mode pill all reachable and tap-friendly.

## Implementation Order

1. **Part 1 (ResizeObserver)** — small, fixes the headline visual bug. Verify marching ants now align correctly.
2. **Part 2 (static ants)** — one-line className removal + CSS cleanup.
3. **Part 3 (Preview view)** — extend union, add render branch, add pill button, gate marching ants on viewMode.
4. **Part 4 (desktop zoom/pan)** — state + transform wrapper + wheel handler + spacebar pan + zoom-controls pill. Verify brush coords still correct under transform.
5. **Part 5 (touch / pointer events)** — switch brush handlers from MouseEvent to PointerEvent; add active-pointer Map; pinch + two-finger pan gesture detector; suppress cursor circle on touch; `touch-action: none` on canvas wrapper.
6. Manual QA per matrix (desktop + touch via DevTools emulation or real device).
7. Commit + push.

## Out of Scope (Phase 2 candidates)

- Mouse-wheel zoom WITH ctrl/cmd modifier (current plan: bare wheel zooms — could revisit if accidental zooming is annoying).
- Numeric zoom input (typing "150%").
- Keyboard zoom shortcuts (cmd+/cmd− /cmd-0).
- Animating the marching-ants color rather than dashes (some users prefer flashing ants).
- Pan clamping (current plan: free pan; canvas can scroll fully off-screen — Fit button recovers).

---
# Plan: AI Brush — Smart Initial Mask + Marching Ants + View Toggle (Phase 1.12) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

User-tested Phase 1.11 against ClippingMagic on the TOP DAD logo. ClippingMagic's first-pass cutout (the marching-ants overlay shown in their UI) correctly identified the subject AND punched precise holes through every speckle of black-on-white texture leakage — without any user input. Our current init flow runs **just** `bria-rmbg` in `ml-only` mode, which gives us the macro subject shape but treats the white text as one solid blob, leaving thousands of black speckles inside that the user has to manually Remove-stroke away.

The user wants us to close that quality gap with **dynamic, generic logic** that works across any image, plus two ClippingMagic-inspired UI features: a marching-ants boundary overlay so they can see exactly where the cut line is, and a single-canvas toggle between "Cutout Preview" and "Original + Marks" views.

**Key infrastructure already exists** (no server changes needed for the quality fix, no new deps for marching ants):

- Server `/remove` already supports `mode='ml+color'` which **chains BRIA → flood-fill removal of a target color** in one round-trip (`rembg-service/main.py:371-379`).
- Server `/detect-bg` already returns `{dominant, secondary, recommended_mode, ...}` from a k-means edge analysis (`rembg-service/main.py:133-233, 258-271`). The client already calls it via `runDetect`, stores the result, but does **nothing** with it.
- Client already has a Moore-Neighbor contour tracer in `src/lib/magic-wand.js:595` (`lib.traceContours(mask)`) — pure JS, returns polygon points + inner/outer flag. Currently unused in the bg-removal pipeline.

## Recommended Approach

### Part 1: Smart initial mask (the big quality fix)

**Change the init flow** in `BackgroundRemovalPanel.tsx` (init `useEffect`, line ~227-255):

Currently:
```ts
runEmbed(canvas);
runRemoval(canvas, { mode: 'ml-only', model: 'bria-rmbg' }).then(seedMaskFromAlpha);
```

New:
```ts
runEmbed(canvas);  // SAM encoder loads in parallel — independent
const detection = await runDetect(canvas);  // ~50-200ms, k-means on edges
const opts: RemovalOptions = pickInitialOptions(detection);
runRemoval(canvas, opts).then(seedMaskFromAlpha);
```

Where `pickInitialOptions(detection)` returns:

```ts
function pickInitialOptions(d: BgDetectionResult | null): RemovalOptions {
  // No detection or model says "complex/photo" → AI alone, can't safely flood-fill
  if (!d || d.recommended_mode === 'ml-only' || d.recommended_mode === 'noop') {
    return { mode: 'ml-only', model: 'bria-rmbg' };
  }
  // Detected a dominant background color (uniform, two-color, or gradient with clear bg)
  // → run BRIA + auto-flood-fill on that color. Server's ml+color mode does both in one call.
  return {
    mode: 'ml+color',
    model: 'bria-rmbg',
    targetColor: d.dominant,
    tolerance: 30,
  };
}
```

This costs us ~100ms of latency (waiting for detect before kicking off BRIA) but gets us the speckle-cleanup automatically for any image with a dominant background — which is exactly the TOP DAD case and most DTF source art.

**Why this works for TOP DAD:** detect sees the black border, recommends `ml+color` with `dominant=[0,0,0]`. Server runs BRIA (gives clean letter shapes) → `_flood_fill_color_removal` BFS-floods from the edges removing connected black pixels (within tolerance 30). The black speckles INSIDE the white text are connected to the outer black background through the texture gaps, so flood-fill walks right through them. Result: subject + holes punched, ready for AI Brush refinement.

**Why this works generically:** any image with a flood-fillable background gets the cleanup; complex photo backgrounds fall through to plain `ml-only`.

### Part 2: Marching ants boundary overlay (always on)

Use `traceContours(mask)` from `src/lib/magic-wand.js` to extract the cumulative mask's boundary as polygons, then render them as animated SVG paths on top of the preview.

**New client helpers in `BackgroundRemovalPanel.tsx`:**

```ts
function maskToContours(mask: Uint8Array, w: number, h: number): {points: Array<{x:number;y:number}>; inner: boolean}[] {
  // Adapt mask + dims to magic-wand's expected format, call lib.traceContours.
  // (magic-wand expects a {data, width, height} object; mask is a flat Uint8Array of 0/1 bytes.)
}

function contoursToSvgPaths(contours, scale: number): string {
  // Return one SVG `d` string concatenated from all contours:
  //   "M x0 y0 L x1 y1 L ... Z M x0' y0' L ... Z"
}
```

**State + computation:**
- `const [contoursD, setContoursD] = useState<string>('');`
- After every `recomputeCumulative()`, also recompute contours from `cumulativeMaskRef.current` and `setContoursD(...)`. Contour tracing is O(boundary pixels), ~20-80ms on 800×800 — runs in the same debounce window as the slider re-cleanup.
- Skip during the slider's debounce — only compute on stroke commit, undo, clear, BiRefNet seed, and slider settle (after 80ms).

**SVG overlay** (added to the existing preview-wrapper SVG block at line ~754):

```tsx
{contoursD && panelMode === 'ai-brush' && !hasResult && (
  <>
    <path
      d={contoursD}
      fill="none"
      stroke="black"
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
    <path
      d={contoursD}
      fill="none"
      stroke="white"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      strokeDashoffset="0"
      vectorEffect="non-scaling-stroke"
      className="marching-ants"
    />
  </>
)}
```

**CSS** (Tailwind arbitrary-value or a small global keyframes rule in `globals.css`):

```css
@keyframes marching-ants {
  to { stroke-dashoffset: -8; }
}
.marching-ants {
  animation: marching-ants 0.6s linear infinite;
}
```

The black-then-dashed-white pair gives the classic "marching ants" effect: solid black outline visible at all times, white dashes scrolling on top.

### Part 3: View toggle (single canvas)

A pill toggle in the top-left of the preview area (`absolute top-2 left-2 z-10`):

- **Cutout** (default): current dual-layer rendering — kept pixels at full alpha, removed at ~30% (76/255).
- **Original**: original ImageData drawn at full alpha, no fade.

Marching ants render in **both** modes (always overlaid).

**Implementation:**
- New state `viewMode: 'cutout' | 'original'`.
- Modify `renderPreviewFromMask(mask)` to branch on `viewMode`: in `'original'` mode, just `pCtx.putImageData(orig, 0, 0)` — no per-pixel alpha tweak (mask still drives the marching ants overlay, just not the fade).
- View-mode change → call `renderPreviewFromMask(cumulativeMaskRef.current)` to repaint.
- Reuse the existing pill-toggle styling pattern from the Mode switcher (`AI Brush / Color / AI Only`) for visual consistency, just smaller and floating.

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Init `useEffect`: wait for detect, dispatch `pickInitialOptions`. Add `maskToContours` + `contoursToSvgPaths` helpers (could live module-level or inline). Add `contoursD` state, recompute after `recomputeCumulative`. Add SVG marching-ants paths to the overlay. Add `viewMode` state + pill toggle. Modify `renderPreviewFromMask` to branch on `viewMode`. |
| `src/lib/magic-wand.js` | None — already exports `traceContours` and `prepareMask`. Just import and use. |
| `src/styles/globals.css` (or wherever Tailwind layers live — verify path) | Add `@keyframes marching-ants` + `.marching-ants` class. |
| `rembg-service/main.py`, `Dockerfile` | None — `ml+color` already exists and BRIA is already pre-loaded. |

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx`:
  - Init `useEffect` (lines ~225-258) — change the `runRemoval` call
  - `renderPreviewFromMask` (~338) — add viewMode branch
  - `recomputeCumulative` (~355) — add contour recomputation
  - SVG overlay block (~754) — add marching-ants paths
  - The mode-switcher styling (~826) — copy pattern for the view toggle pill
- `rembg-service/main.py:371-379` — confirm `ml+color` flow before relying on it
- `rembg-service/main.py:133-233` — `_detect_background` return shape
- `src/lib/magic-wand.js:563-650` — `prepareMask` and `traceContours` signatures
- `src/types/backgroundRemoval.ts` — `BgDetectionResult` shape, `RemovalOptions` shape

## Reusable Code (no new dependencies)

- `lib.traceContours` (`src/lib/magic-wand.js:595`) — boundary polygons from binary mask, pure JS.
- `lib.prepareMask` (`src/lib/magic-wand.js:563`) — pads with 1px border for the contour algo.
- Server `mode='ml+color'` (`rembg-service/main.py:371-379`) — chained BRIA + flood-fill, already there.
- `runDetect` + `BgDetectionResult` (already wired client-side, just unused).
- `renderPreviewFromMask`, `recomputeCumulative`, `samMaskRef`, `cumulativeMaskRef` — extend, don't rewrite.

## Verification

1. **TOP DAD initial mask quality**: load TOP DAD into AI Brush. Without making any strokes, the initial mask should show the white letters + red stripes + star with most/all black speckles already punched through (matching ClippingMagic's first-pass closely). Compare against current behavior — should be a dramatic improvement.
2. **Generic image (photo with complex background)**: load a photo with a non-uniform background. Detect returns `recommended_mode='ml-only'` → falls through to `ml-only` BRIA only, no flood-fill. No regression.
3. **Marching ants visible**: thin animated dashed black/white outline traces the mask boundary. Animation runs continuously (CSS, no React re-renders). Outline updates after each stroke commit, undo, clear, slider settle.
4. **Marching ants on disconnected regions**: place a stroke that creates two separate kept islands → both have outlines.
5. **View toggle — Cutout** (default): current dual-layer fade; removed regions ~30% opacity. Marching ants visible.
6. **View toggle — Original**: full-opacity original image. Marching ants visible. No fade. Click on either part of the image still works for SAM strokes (mask logic unchanged, only render changed).
7. **Toggle round-trip**: switch Cutout → Original → Cutout. State preserved, no flicker. Switching mid-stroke is harmless (live path still draws over either view).
8. **Slider live update**: dragging Edge Cleanup updates the fade AND the marching ants outline together (after 80ms debounce — single recompute pass).
9. **Apply Mask**: still produces final RGBA on canvasRef from `cumulativeMaskRef`. Marching ants overlay disappears (it's tied to `panelMode === 'ai-brush' && !hasResult`).
10. **Performance**: contour tracing on 800×800 image: target <80ms. Debounced together with slider re-cleanup so total per-stroke overhead is the existing ~150ms cleanup + ~50ms contour ≈ 200ms. Acceptable.

## Implementation Order

1. **Part 1 (smart init mask)** first — biggest impact, smallest risk. Change init effect to await detect → dispatch ml+color when applicable. Verify TOP DAD quality leaps.
2. **Part 2 (marching ants)** — add `maskToContours` adapter, contour state + recompute, SVG overlay, CSS keyframes. Verify outline visible.
3. **Part 3 (view toggle)** — viewMode state, branch in `renderPreviewFromMask`, pill toggle UI. Verify round-trip.
4. Manual QA per matrix.
5. Commit + push.

## Out of Scope (Phase 2 candidates)

- Side-by-side split view (single-canvas toggle is the chosen approach).
- "Show outline" off-toggle (always on per user choice).
- Re-running auto-cleanup on every stroke (current cleanup is per-stroke palette-based; the init-mask cleanup is a one-shot at load).
- Marching ants color customization.
- A `/auto-cutout` server endpoint (we get the same result by reusing `ml+color` from the client).

---

# Plan: AI Brush — Live Tolerance Slider for Color Cleanup (Phase 1.11) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.10 introduced color-aware cleanup with a hardcoded `TOL_SQ = 60²` threshold. User-tested on TOP DAD: result is dramatically better, but residual artifacts remain — thin dark fringe along letter edges (anti-aliased boundary pixels, mid-gray, currently fall on the "keep" side of the threshold) and scattered tiny dark specks inside white regions (texture leakage that didn't quite cross the threshold). The fix bumping the threshold needs user control because too-aggressive cleanup will start eroding legitimate dark content (shadows in red stripes, anti-aliased outlines around letters that should stay).

User picked: **tolerance slider** as the primary control. They explicitly opted **not** to add an upscaling tip note.

## Recommended Approach

### Split the cumulative mask into pre-cleanup and post-cleanup

**Today** `cumulativeMaskRef` plays two roles: the running SAM accumulation target (for unions/diffs) AND the rendered/applied display mask (post-cleanup). Cleanup currently runs once at stroke commit and the result is the source of truth for the next stroke. That couples cleanup to SAM history and prevents re-running cleanup at a different tolerance.

**Change** (`BackgroundRemovalPanel.tsx`):

- New ref `samMaskRef: useRef<Uint8Array | null>` — the **SAM-only** mask. Updated by stroke commits (union/diff) and seeded from BiRefNet on mount. Never has cleanup applied to it.
- Existing `cumulativeMaskRef` becomes the **post-cleanup** mask — derived from `samMaskRef` + current palettes + current tolerance. Used by `renderPreviewFromMask` and `handleApplyBrush` (both already read this ref, so no caller changes).
- `StrokeRecord.maskBefore` now snapshots the **pre-cleanup** mask (so undo restores the SAM-only state, then re-derives cumulative at current tolerance — undo behavior remains consistent with whatever tolerance is set when undoing).

### Make tolerance a state value + add slider

- New state: `cleanupTolerance: number`, default `60`. Range `0–100`, step `1`. `TOL_SQ = cleanupTolerance² ` (linear-feeling control).
- Modify `applyColorCleanup` signature to accept `tolerance: number` (in linear units; the function squares it internally). At `tolerance === 0`, skip the loop entirely (slider far-left = "no cleanup").
- Add helper `recomputeCumulative()`:
  ```ts
  const recomputeCumulative = useCallback(() => {
    const sam = samMaskRef.current;
    const orig = originalDataRef.current;
    if (!sam || !orig) return;
    const next = new Uint8Array(sam);  // clone
    const keepColors = collectStrokeColors(strokeHistoryRef.current, 'keep', orig);
    const removeColors = collectStrokeColors(strokeHistoryRef.current, 'remove', orig);
    applyColorCleanup(next, orig, keepColors, removeColors, cleanupTolerance);
    cumulativeMaskRef.current = next;
    renderPreviewFromMask(next);
  }, [cleanupTolerance, renderPreviewFromMask]);
  ```
- Wire into all three flows that mutate samMask:
  - `commitStroke`: after SAM union/diff is applied to `samMaskRef.current`, call `recomputeCumulative()`.
  - `handleUndoStroke`: after restoring `samMaskRef.current = popped.maskBefore`, call `recomputeCumulative()`.
  - `handleClearStrokes` / `resetCumulativeToInitial`: after seeding `samMaskRef.current` from BiRefNet alpha, call `recomputeCumulative()`.
  - Init `useEffect` BiRefNet `.then`: same — populate `samMaskRef` from alpha, then `recomputeCumulative`.
- Slider drag wiring: `useEffect` on `[cleanupTolerance]` calls `recomputeCumulative()` with a small `setTimeout` debounce (~80ms) so dragging is fluid (cleanup pass on an 800×800 image is ~150ms, debounce keeps the UI responsive).

### UI

In the AI Brush side panel, insert a new control block between the Brush Size slider (lines ~860–880) and the Undo/Clear buttons (~885):

```tsx
<div>
  <div className="flex items-center justify-between mb-1">
    <label className="text-xs font-medium text-gray-600">Edge Cleanup</label>
    <span className="text-xs text-gray-500 tabular-nums">{cleanupTolerance}</span>
  </div>
  <input
    type="range"
    min={0}
    max={100}
    step={1}
    value={cleanupTolerance}
    onChange={e => setCleanupTolerance(Number(e.target.value))}
    className="w-full accent-blue-600"
  />
  <p className="text-xs text-gray-400 mt-1">
    Higher = removes more anti-aliased fringe and specks. Too high may erase darker valid content.
  </p>
</div>
```

The slider is shown only when `panelMode === 'ai-brush' && !hasResult` (matches the surrounding controls' visibility).

### What stays unchanged

- SAM `/predict` contract — no server changes.
- `pathToSvgD`, `collectStrokeColors`, `applyColorCleanup` (only the signature gains a tolerance parameter).
- The dual-layer 30%-faded preview rendering.
- Undo / Clear / Apply / mode switch / save flows externally — internally they touch the new `samMaskRef` and call `recomputeCumulative`, but their UX behavior is identical.

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Add `samMaskRef`, `cleanupTolerance` state + slider UI, `recomputeCumulative` helper. Modify `applyColorCleanup` to accept tolerance param. Update `commitStroke`, `handleUndoStroke`, `handleClearStrokes`, `resetCumulativeToInitial`, init `useEffect`'s BiRefNet seeding to maintain `samMaskRef` and call `recomputeCumulative`. Add `useEffect` on tolerance for live updates with debounce. |

No other files require changes.

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx`:
  - `applyColorCleanup` (lines ~82–119)
  - `commitStroke` (lines ~362–415)
  - `resetCumulativeToInitial` (lines ~349–363)
  - `handleUndoStroke` (lines ~519–528) and `handleClearStrokes` (~530–534)
  - Init `useEffect` BiRefNet branch (lines ~228–251)
  - Brush Size slider block (UI insertion point)

## Reusable Code

- `applyColorCleanup` (in panel) — extend with tolerance parameter; keep core loop intact.
- `collectStrokeColors` (in panel) — reuse as-is; called from `recomputeCumulative` instead of inline.
- `renderPreviewFromMask` — reuse as-is; called by `recomputeCumulative`.
- `samplePathPoints`, `runPredictRaw` — unchanged.

## Verification

1. **Default behavior unchanged**: load a fresh image, place strokes — at default slider value (60), output matches Phase 1.10. No regression.
2. **Slider affects cleanup live**: place a Keep + Remove stroke on TOP DAD. Drag slider from 0 → 100. At 0, the dark fringe and specks are visible (cleanup off). At ~50–60, current behavior. At ~80–100, fringe and specks disappear; verify red stripes don't get over-eroded.
3. **No SAM re-runs on slider drag**: open DevTools network tab while dragging the slider — zero `/predict` calls.
4. **Undo respects current tolerance**: place 3 strokes, set tolerance to 80, undo all 3 strokes one at a time. Each undo should re-cleanup at tolerance=80 (not at the tolerance values that were active when the strokes were placed).
5. **Clear**: clears strokes; cumulative mask returns to BiRefNet seed (cleanup is no-op without strokes).
6. **Apply Mask**: at any tolerance, Apply produces a final RGBA where alpha is binary based on the post-cleanup mask. No fade artifacts.
7. **Tolerance = 0**: cleanup loop is skipped entirely (perf check — no change in stroke commit time vs. `applyColorCleanup` body).
8. **Performance**: dragging the slider feels smooth on an 800×800 image (debounce keeps UI responsive). On larger images (>1500px), there may be visible lag — acceptable for now (perf optimization in Phase 2 if needed).

## Implementation Order

1. Add tolerance parameter to `applyColorCleanup`. Replace `const TOL_SQ = 60*60` with `const TOL_SQ = tolerance*tolerance`. Add early-return when `tolerance === 0`.
2. Introduce `samMaskRef` ref. Refactor `commitStroke`, `resetCumulativeToInitial`, `handleUndoStroke`, `handleClearStrokes`, and the BiRefNet init seeding to maintain `samMaskRef` as the source of truth and derive `cumulativeMaskRef` via `recomputeCumulative`.
3. Add `cleanupTolerance` state (default 60) and `recomputeCumulative` callback.
4. Add `useEffect` on `[cleanupTolerance]` with 80ms `setTimeout` debounce calling `recomputeCumulative`.
5. Add slider UI in the AI Brush panel block.
6. Manual QA per verification matrix.
7. Commit + push to `claude/in-house-background-processing-Ci5rc`.

## Out of Scope (Phase 2 candidates)

- "Remove specks" connected-component despeckle button.
- Per-channel tolerance (R/G/B independent thresholds).
- Color-cube lookup optimization for cleanup pass on >1MP images.
- Slider-controlled morphological erosion ("Tighten edges").
- Upscale tip note (user explicitly opted out).

---

# Plan: AI Brush — Solid Line Strokes, Color-Aware Cleanup, Parallel Init (Phase 1.10) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

User-tested Phase 1.9 (additive cumulative masking) on a "TOP DAD" graphic. Three issues surfaced:

1. **Visual feedback is dot-only.** Dragging across the canvas shows only the discrete SAM prompt dots after the stroke commits. The user expects a fluid, solid colored brush line (green for Keep, red for Remove) at brush thickness, the way every paint/mask UI works. Quote: "When I draw across the screen, it creates a line… what I want to see is a solid line."
2. **Result quality lags expectations.** SAM correctly returned the macro letter shapes, but the distress-texture black speckles inside the white text were not cleaned up — SAM treats the whole letter region as one object and includes the speckles. The user wants the system to **integrate** the color information they're implicitly providing (white pixels under Keep strokes; black pixels under Remove strokes) with SAM's region info, rather than ignore it. Quote: "the black color in this area should be removed, but the white area in this area should be kept… It needs to be a more integrated system."
3. **Initial wait too long.** Currently embed → BiRefNet runs sequentially on panel mount; user reports ~20-30s before AI Brush is usable.

## Recommended Approach

### 1. Solid-line stroke visualization

**Per-stroke raw path is preserved (currently it's discarded).** Add a new field to `StrokeRecord`:

```ts
interface StrokeRecord {
  tool: BrushTool;
  points: SamPoint[];          // existing (SAM prompts, sampled)
  rawPath: Array<{x:number;y:number}>;  // NEW — full mouse path in canvas-pixel space
  brushSize: number;           // NEW — captured at commit time so undoing/redrawing is consistent
  maskBefore: Uint8Array;      // existing (undo snapshot)
}
```

**Committed strokes** are rendered in the existing SVG overlay (currently shows dots) as one `<path>` per stroke:

```tsx
{strokeHistory.map((s, i) => (
  <path
    key={i}
    d={pathToSvgD(s.rawPath, overlayScale)}
    stroke={s.tool === 'keep' ? '#10b981' : '#ef4444'}
    strokeWidth={s.brushSize * overlayScale}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    opacity={0.65}
  />
))}
```

The dots overlay (current `allSamPoints.map(...)` `<circle>`s) is **removed** per user's preference.

**In-progress stroke (during drag)** uses an SVG `<path>` rendered into the same overlay, with a `useRef`-bound DOM element. On every `mousemove` while drawing, mutate the path's `d` attribute directly via `pathRef.current.setAttribute('d', ...)`. This avoids React re-renders on every mouse position and keeps drawing fluid. On stroke commit, clear the in-progress path; the committed path appears in the React-rendered list.

Helper: `function pathToSvgD(path, scale)` returns `M x0 y0 L x1 y1 L ...`. Scale converts canvas-pixel coords to display-pixel coords for the SVG (the SVG sits inside the relative wrapper with `width=canvasRect.width` etc., already in display pixels).

### 2. Color-aware cleanup integrated into the cumulative mask flow

**Concept:** the user's Keep strokes implicitly label "these colors should be preserved"; Remove strokes label "these colors should be erased." After SAM determines a macro region for a stroke and we apply union/diff to the cumulative mask, run a per-pixel color-similarity classifier inside the kept region to clean up texture leakage.

**Color sampling:** when committing a stroke, sample RGB from `originalDataRef.current` at each `SamPoint` (the already-discretized prompt positions) — these become the stroke's color contribution. Maintain two cumulative palettes derived from `strokeHistory`:

```ts
const keepColors: RGB[]   = collectColors(strokeHistory.filter(s => s.tool === 'keep'));
const removeColors: RGB[] = collectColors(strokeHistory.filter(s => s.tool === 'remove'));
```

Recompute on each stroke commit (cheap — O(strokes × points-per-stroke) ≈ low hundreds).

**Cleanup pass** (runs at the end of `commitStroke`, right after the SAM union/diff and before `renderPreviewFromMask`):

```ts
function applyColorCleanup(
  mask: Uint8Array,
  orig: ImageData,
  keepColors: RGB[],
  removeColors: RGB[]
): void {
  if (keepColors.length === 0 || removeColors.length === 0) return; // need both sides
  const TOL_SQ = 60 * 60; // hardcoded for now — tune empirically
  const data = orig.data;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) continue;
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    const dK = minDistSq(r, g, b, keepColors);
    const dR = minDistSq(r, g, b, removeColors);
    if (dR < dK && dR < TOL_SQ) mask[i] = 0;
  }
}
```

`minDistSq` is a tiny inline helper computing squared-Euclidean distance to the nearest palette color. For typical stroke counts (≤30 SAM points × ≤10 strokes per side = 300 colors) and an ~800×800 image (~640k pixels), this is ~200M comparisons — runs in ~150ms in JS, acceptable for per-stroke commit. Optimization (build a 16³ color cube lookup) deferred.

**Why this is the right integration point:** the existing `clientFloodFill` (`src/hooks/useBackgroundRemoval.ts:69`) operates on a single target color with BFS-spatial-connectivity, which doesn't fit here — we want a non-spatial color classifier across the SAM region. This new helper is purpose-built but small.

**Edge cases handled:**
- Only Keep strokes: `removeColors` empty → cleanup is a no-op. SAM-only behavior preserved.
- Only Remove strokes: `keepColors` empty → no-op. Cumulative mask state must already include something to remove from (typically the BiRefNet seed); SAM-only behavior preserved.
- No strokes (just BiRefNet seed): no-op. Initial mask unchanged.

### 3. Parallelize embed + BiRefNet on mount

**Current** (`BackgroundRemovalPanel.tsx:145-171`):
```ts
runEmbed(canvas).then(() => {
  runRemoval(c, { mode: 'ml-only', model: 'birefnet-general-lite' }).then(img => { ... });
});
```

**New:**
```ts
const embedP = runEmbed(canvas);
const birefnetP = runRemoval(c, { mode: 'ml-only', model: 'birefnet-general-lite' });
// embedP resolves → samSession set → samReady banner flips.
birefnetP.then(img => {
  // Seed cumulativeMaskRef from BiRefNet alpha (only if user hasn't started brushing yet).
  // Same logic as today, just moved out of the embed.then chain.
});
```

Brush becomes interactive as soon as `runEmbed` resolves — independent of BiRefNet. Both endpoints hit the same Railway service; the Python server handles concurrent requests via FastAPI's threadpool, and the SAM encoder + BiRefNet are different models loaded along independent code paths.

No `/warm` endpoint, no elapsed-seconds counter (per user choice).

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Extend `StrokeRecord` with `rawPath` + `brushSize`. Add `pathToSvgD` helper. Replace dot SVG overlay with stroke `<path>` overlay (committed) + in-progress `<path>` ref updated on `mousemove`. Add `applyColorCleanup` helper + invocation in `commitStroke`. Parallelize embed + BiRefNet in init `useEffect`. |

No other files require changes — server `/predict` and `runPredictRaw` are sufficient as-is.

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx` — focus on:
  - lines 87-95 (`StrokeRecord` interface)
  - lines 122-173 (init `useEffect`, embed→BiRefNet chain)
  - lines 283-326 (`commitStroke`)
  - lines 329-366 (mouse handlers, `currentStrokeRef`)
  - lines 547-593 (preview canvas wrapper, cursor + dot overlays — the SVG block at ~558)
- `src/hooks/useBackgroundRemoval.ts` — `samplePathPoints` (already used to discretize raw path into SAM points).

## Reusable Code

- `samplePathPoints` (`src/hooks/useBackgroundRemoval.ts`) — existing path discretization, untouched.
- `runPredictRaw` (added in 1.9) — returns `{img, mask, w, h}`, used as-is.
- `originalDataRef.current` — already the source of truth for sampling colors per stroke.
- `clientFloodFill` (in the same hook) — **not** reused for cleanup; cleanup is a non-spatial color classifier and doesn't fit flood-fill. Left intact for Color Pick mode.

## Implementation Order

1. Add `rawPath` + `brushSize` to `StrokeRecord`. Plumb into `commitStroke` (read raw points from `currentStrokeRef` directly into the record, snapshot brush size).
2. Replace dot SVG block with committed-strokes `<path>` map. Verify visual after a single stroke commits.
3. Add in-progress path ref + `mousemove`-driven DOM mutation. Verify live drawing during drag.
4. Add `applyColorCleanup` helper. Wire into `commitStroke` after the union/diff, before `renderPreviewFromMask`. Verify on TOP DAD: black speckles inside white letters disappear after one Keep on white + one Remove on black.
5. Refactor init `useEffect` to start `runEmbed` and `runRemoval` concurrently (no chain). Verify "AI Brush ready" banner flips before BiRefNet finishes.
6. Manual QA pass against the verification matrix below.
7. Commit + push to `claude/in-house-background-processing-Ci5rc`.

## Verification

1. **Solid line rendering**: drag across the canvas — see a thick green line follow the cursor in real time (Keep tool) or red (Remove). Multiple strokes accumulate as multiple visible lines, no dots.
2. **Live drag**: mid-stroke, the line is drawn live before mouseUp. Releasing commits and the line stays.
3. **Brush size respected**: lines render at the slider's brush thickness (display-scaled).
4. **TOP DAD cleanup**: Keep stroke on white text + Remove stroke on black grunge → after the Remove stroke, black speckles inside white letters disappear (color cleanup post-pass kicked in).
5. **Edge cases**: with only Keep strokes (no Remove), behaviour matches Phase 1.9 (no aggressive deletion). With only Remove strokes (no Keep), same — cleanup is no-op.
6. **Undo**: undo restores both the cumulative mask AND removes the line for that stroke from the SVG overlay.
7. **Clear**: clears all stroke lines from overlay + resets cumulative mask to BiRefNet seed.
8. **Apply Mask**: produces final RGBA on canvasRef without any line/dot artefacts (overlays are SVG, not on the canvas).
9. **Speed-up**: open BG removal panel; "AI Brush ready" banner flips noticeably sooner than today (target: ~5-10s on warm Railway, was ~10-20s after BiRefNet completed).
10. **Other modes unaffected**: Color Pick + AI Only round-trip works as before.

## Out of Scope (Phase 2 candidates)

- Tolerance slider for color cleanup (currently hardcoded `TOL_SQ = 3600`).
- 16³ color-cube lookup optimization for cleanup speed at >1MP images.
- `/warm` endpoint + Studio-page pre-warm.
- Elapsed-seconds counter in "Preparing..." banner.
- Toggle to merge AI Brush + Color Pick into one unified mode.

---

# Plan: AI Brush — Additive Cumulative Masking with Original-Underlay (Phase 1.9) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.8 shipped a working SAM-based AI Brush, but user testing on a "TOP GUN" logo revealed a UX problem: every click runs SAM, which returns a *single-object* segmentation, and the panel **replaces** the canvas with that result. So clicking once on the white "P" wipes everything else (the rest of the letters disappear because SAM only returned the P). The user can't iteratively add more keep-points because the rest of the image is now invisible — they can't see what to click on next.

User wants two changes:
1. **Original visible underneath** at reduced opacity, so "removed" regions remain clickable for further refinement.
2. **Additive cumulative masking** — Keep strokes ADD to the existing mask (union), Remove strokes SUBTRACT from it (difference). The initial mask is the BiRefNet auto-result from Phase 1.8. So the user starts from a sensible auto-guess and builds on it instead of starting over with each click.

This matches the user's mental model: "the BiRefNet result is mostly right; the brush lets me touch up what it got wrong."

## Recommended Approach

### Client: cumulative binary mask + dual-layer rendering

**New state in `BackgroundRemovalPanel.tsx`:**
- `cumulativeMaskRef: useRef<Uint8Array | null>` — W×H of 0/1 bytes; the running mask (1 = keep, 0 = remove). Initialized from the BiRefNet result's alpha channel on mount.
- `strokeHistory: { tool: 'keep' | 'remove'; points: SamPoint[]; maskBefore: Uint8Array }[]` — replaces the current `SamPoint[][]`. Each entry records the stroke + a snapshot of the cumulative mask *before* the stroke ran, so undo is O(1) and doesn't require re-running SAM.

**Stroke commit flow (replaces current `commitStroke` → `runBrushPredict`):**
1. User finishes a stroke (mouseUp / mouseLeave).
2. Sample the path into SAM points (via the existing `samplePathPoints` helper).
3. Snapshot the current `cumulativeMaskRef` into a `Uint8Array.slice()` — this is `maskBefore`.
4. Call `/predict` with **only this stroke's points** (do not send accumulated points across strokes — each stroke is its own SAM region).
5. The server returns RGBA PNG; on the client, draw it into an offscreen canvas and `getImageData` to extract its alpha channel as a Uint8Array — call this `samMask`.
6. Update `cumulativeMaskRef`:
   - If stroke tool === 'keep': for each pixel `i`, `cumulativeMask[i] = cumulativeMask[i] | samMask[i]` (union).
   - If stroke tool === 'remove': for each pixel `i`, `cumulativeMask[i] = cumulativeMask[i] & ~samMask[i]` (difference).
7. Push `{tool, points, maskBefore}` onto `strokeHistory`.
8. Re-render the preview (see below).

**Dual-layer preview rendering (replaces `runBrushPredict` re-draw):**
- The preview canvas displays a composite computed by manipulating ImageData directly (single pass, fast):
  - Start from `originalDataRef.current` (the source-of-truth ImageData captured on mount).
  - For each pixel `i`: `previewData[i*4 + 3] = cumulativeMask[i] ? 255 : 76` (76 ≈ 30% of 255).
  - RGB channels stay as-is.
- Result: kept regions render at full opacity against the panel's checkerboard; removed regions render at 30% opacity (visibly faded but still clickable). The user always sees what's there.

**Undo (handleUndoStroke):**
- Pop the last entry from `strokeHistory`.
- Restore `cumulativeMaskRef.current = maskBefore.slice()`.
- Re-render preview. **No SAM call needed.**

**Clear (handleClearStrokes):**
- Reset `cumulativeMaskRef` to the initial BiRefNet-derived mask.
- Empty `strokeHistory`.
- Re-render preview.

**Apply Mask (handleApplyBrush):**
- Build the final RGBA from `originalDataRef + cumulativeMask` (alpha = mask × 255, full opacity for kept, 0 for removed — *not* the faded preview).
- Write that to `canvasRef` (the source-of-truth canvas that gets saved).
- Set `hasResult = true`.

### Server: drop chained-refinement caching

**`rembg-service/main.py` `/predict`:**
- Currently caches `low_res_mask` per `embedding_id` and feeds it back on the next call. That made sense for "iteratively refine one mask"; it's wrong for "each stroke is an independent region".
- Change: stop reading or writing `cached["low_res_mask"]`. Always call `predictor.predict(state, points, labels, prev_low_res=None)`. Each call gets a fresh single-object mask for just its points.

**`rembg-service/sam_predictor.py`:** unchanged. The `predict()` method already supports `prev_low_res=None`.

### Frontend: extract SAM mask from the predict response

**`src/hooks/useBackgroundRemoval.ts`:**
- `runPredict` currently returns `HTMLImageElement | null`. Add a sibling helper `runPredictRaw(points): Promise<{img: HTMLImageElement; mask: Uint8Array} | null>` that draws the result to a temp canvas, calls `getImageData`, and returns both the image element (for compatibility) and the binary alpha mask (Uint8Array of size W×H, 0 or 1).
- The panel uses `runPredictRaw` for stroke commits; existing `runPredict` callers (none currently) stay on the simple version.

### What stays unchanged
- The dot overlay (SVG circles at each placed point) — points are still drawn on the panel for user feedback. **Note**: with the new model, we display dots from `strokeHistory.flatMap(s => s.points)` since strokes track their own points.
- The brush cursor circle, brush size slider, Keep/Remove tool toggle.
- `/embed` endpoint and embed flow.
- BiRefNet initial mask.
- Color Pick / AI Only modes — completely untouched.

## Files to Modify

| File | Change |
|---|---|
| `src/components/studio/BackgroundRemovalPanel.tsx` | Replace `strokeHistory`/`commitStroke`/`runBrushPredict`/render path with cumulative-mask + dual-layer rendering. Init `cumulativeMaskRef` from the BiRefNet result's alpha. Update Undo/Clear/Apply to operate on the cumulative mask. |
| `src/hooks/useBackgroundRemoval.ts` | Add `runPredictRaw` returning `{img, mask: Uint8Array}`. |
| `rembg-service/main.py` | `/predict`: drop `prev_low_res` caching — always call with `prev_low_res=None`. Each stroke is independent. |

## Critical Files (read before implementing)

- `src/components/studio/BackgroundRemovalPanel.tsx` — current `commitStroke` (lines 254–269), `runBrushPredict` (237–252), `handleUndoStroke` (354–359), `handleClearStrokes` (361–364), `handleApplyBrush` (403–412).
- `src/hooks/useBackgroundRemoval.ts` — `runPredict` (lines 290–311); add a sibling that exposes the raw mask.
- `rembg-service/main.py` — `/predict` (currently lines 422–471 after recent additions); strip `cached["low_res_mask"]` read/write.
- `rembg-service/sam_predictor.py` — already supports `prev_low_res=None`; no change.

## Reusable Code (already in place)

- `samplePathPoints` (`src/hooks/useBackgroundRemoval.ts`) — keep using for stroke point sampling.
- `originalDataRef`, `initialMaskRef` (panel) — `originalDataRef` is the source of truth for the original image; `initialMaskRef` already holds the BiRefNet result ImageData. Use the alpha channel of `initialMaskRef` to seed `cumulativeMaskRef`.
- The `/predict` endpoint contract (form fields `embedding_id` + `points` JSON, RGBA PNG response).
- `apply_mask` in `sam_predictor.py` — still used server-side to produce the RGBA response.

## Verification Plan

1. **TOP GUN regression** (the failure case): upload, enter studio. BiRefNet initial mask runs. Verify the preview shows the BiRefNet result with the rest of the image at 30% opacity faded underneath. Click Keep on the white "P" — only the P region should be ADDED to the visible mask (the BiRefNet result + P stays visible together). Click Keep on each remaining letter — each adds in turn. Confirm transparent regions still show faded underneath the whole time.
2. **Subtract test**: with the BiRefNet auto-mask showing the subject, click Remove on a part of the subject. That region should disappear (alpha → 30%), while the rest of the kept area stays at full opacity.
3. **Undo**: place 5 strokes alternating Keep/Remove. Click Undo 5 times — each undo should be instant (no SAM call), restoring the previous cumulative mask.
4. **Clear**: place several strokes, click Clear. Preview returns to the BiRefNet initial state. Stroke history is empty.
5. **Apply Mask**: stroke around, click Apply. The 30%-opacity faded preview disappears; only the kept regions remain (full opacity); transparent regions show the checkerboard. Save flow still works.
6. **Already-transparent input**: load an already-cut PNG. BiRefNet should produce a near-identity mask. Brush should still work (Keep on a transparent region adds it back; Remove subtracts).
7. **Performance**: each stroke triggers exactly one SAM call (~150–300ms). Undo and Clear are instant. Re-render after mask update is <50ms (single ImageData pass for an 800×800 image).
8. **Mode switch**: AI Brush → Color Pick → AI Only round-trip preserves the original image, no leaked mask state across modes.

## Implementation Order

1. **Server tweak**: drop `prev_low_res` caching in `/predict`. One-line change. Smoke-test with curl that two consecutive predict calls with different points return independent masks.
2. **Hook**: add `runPredictRaw` returning `{img, mask: Uint8Array}`.
3. **Panel rewrite**: introduce `cumulativeMaskRef`, change `strokeHistory` shape, rewrite stroke commit / render / undo / clear / apply. The existing dot overlay and cursor stay.
4. **Manual QA** against the verification matrix.
5. **Commit + push** to `claude/in-house-background-processing-Ci5rc`.

## Out of Scope (Phase 2 candidates)

- Toggle to hide the faded original (full-opacity preview only).
- "Additive vs replace" mode toggle (some users might want SAM's native single-object behavior back).
- Box prompts.
- Manual paint brush (literal alpha painting, no SAM).
- Persisting brush sessions per user.

---

# Plan: SAM-Based Interactive Brush Masking (Phase 1.8) — SHIPPED

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.7 shipped Auto/Color Pick/AI Only modes. User-tested on a distressed "TOP DAD" graphic (textured black background with bleed-through into white text) and Color Pick failed catastrophically — the speckled black background is "connected" to the white text and red stripes through tiny gaps in the distress texture, so the BFS flood-fill leaks through and erases most of the design. Pure ML modes (BiRefNet) over-fill interior negative space.

User wants a **SAM-based interactive brush UX**: green "keep" and red "remove" brushes, adjustable brush size, click or draw to add positive/negative point prompts that SAM uses to produce a precise mask. The user's mental model: "draw a green circle around what I want to keep, red around what I want gone, AI figures out the boundary."

The frontend already has the SAM scaffolding wired (`runEmbed`, `runPredict`, `embedImage`, `predictMask`, `SamPoint`/`SamSession` types, `/api/background-removal/embed` and `/predict` proxy routes). **The Python `/embed` and `/predict` endpoints are stubs** — they import `rembg.sessions.sam.SamSession.predict_masks` (which doesn't exist in rembg 2.0.57) and silently fall back to `remove()` ignoring the points entirely. So the entire SAM pipeline is broken end-to-end despite looking implemented. We need a real SAM implementation.

## User Decisions (already gathered)

1. **Modes**: AI Brush becomes the **default** mode. Color Pick and AI Only stay as alternate modes. The current "Auto" detect-bg mode is folded into AI Brush (which auto-runs SAM on image load to give an initial mask the user refines from).
2. **Embed timing**: Eager — SAM encoder runs as soon as the panel opens, in parallel with an initial BiRefNet mask, so the brush feels instant.

## Recommended Approach

### Python service: real SAM via MobileSAM ONNX

**Model choice:** MobileSAM ONNX (`vision_encoder.onnx` ~38MB + `prompt_encoder_mask_decoder.onnx` ~6MB). Total ~50MB — negligible vs current Railway image. CPU latency: ~2s encode, ~50ms decode. Source: `Xenova/mobile-sam` on HuggingFace (well-maintained, 5M+ downloads).

If quality is insufficient on graphics, swap to `Xenova/sam-vit-base` (~380MB total, ~6s encode, ~150ms decode) — same API, drop-in.

**New file `rembg-service/sam_predictor.py`:**
- Class `MobileSamPredictor` wrapping two `onnxruntime.InferenceSession`s (encoder + decoder).
- `set_image(img)` → preprocesses to 1024×1024 (with letterbox + normalize), runs encoder, returns embedding (1×256×64×64) plus stored `(orig_h, orig_w)`.
- `predict(embedding, points, labels, mask_input=None)` → builds decoder inputs, scales point coords from original space to 1024 space, runs decoder, returns boolean mask at original resolution + confidence score + low-res mask logits (for chained refinement).
- Lazy module-level loader so cold container startup is fast; first `/embed` call pays the load cost.

**`rembg-service/main.py` rewrites:**
- `/embed`:
  - Run `MobileSamPredictor.set_image()` → cache `{"embedding": np.ndarray, "img_array": np.ndarray, "low_res_mask": None}` in existing `_embeddings` TTLCache (30-min TTL already set).
  - Return `{"embedding_id", "width", "height"}` (unchanged from current contract).
- `/predict`:
  - Accept existing `embedding_id` + `points` JSON (`[{x, y, label}, ...]`) — no contract change.
  - Run decoder with cached embedding + points + previous `low_res_mask` (chained refinement: each click feeds the previous mask back in for stable iterative editing).
  - Persist updated `low_res_mask` in the cache entry.
  - Return RGBA PNG: alpha = mask × 255, RGB = original.

**Dockerfile:** pre-download both ONNX files to `/app/models/` during build via `huggingface_hub.snapshot_download(repo_id="Xenova/mobile-sam", allow_patterns=["onnx/*.onnx"])`. Keeps cold start clean.

**`requirements.txt`:** add `huggingface_hub`. `onnxruntime` is already pulled in transitively by `rembg[cpu]`; pin it explicitly to avoid surprises.

### Frontend: AI Brush mode

**`src/types/backgroundRemoval.ts`:**
- `PanelMode` becomes `'ai-brush' | 'color-pick' | 'ai-only'` (drop `'auto'` and `'click-remove'` — neither is user-facing now). Keep `RemovalMode` server contract unchanged.

**`src/components/studio/BackgroundRemovalPanel.tsx`:**
- Default `panelMode` → `'ai-brush'`.
- On image load, kick off **two parallel ops**:
  1. `runEmbed(canvas)` — primes SAM for interactive editing.
  2. `runRemoval(canvas, {mode: 'ml-only', model: 'birefnet-general-lite'})` — initial automatic mask shown immediately (within 5–15s).
- The BiRefNet result populates the preview as the "starting point". As soon as the user adds their first SAM point, the preview switches to SAM-driven prediction.
- New state: `samPoints: SamPoint[]`, `brushTool: 'keep' | 'remove'`, `brushSize: number` (5–50, default 20), `lastStrokeId: number`.

**Brush UI (AI Brush mode):**
- Tool toggle: green "Keep" (`Plus` icon, default) ↔ red "Remove" (`Minus` icon).
- Brush size slider (5–50, default 20). Visual only — controls the cursor circle radius and stroke point sampling interval.
- Cursor: colored ring overlay following mouse, color = current tool, radius = brush size (in canvas-pixel space, scaled to display).
- Click → push one point at the click coord with `label = brushTool === 'keep' ? 1 : 0`, debounced 250ms then call `runPredict(allPoints)`.
- Click + drag → sample points along the path at `brushSize`-pixel intervals; on `mouseup`, call `runPredict(allPoints)` once with the full updated set.
- Undo button: pops last point/stroke and re-predicts. Clear button: empties points and reverts to BiRefNet starting mask.
- Each predicted result is drawn into the offscreen `canvasRef` (source of truth) and the visible `previewRef`. Existing `runRemoval` code path stays unchanged (still used by Color Pick / AI Only).

**`src/hooks/useBackgroundRemoval.ts`:** small additions only.
- `runPredict` already exists — it just needs the Python `/predict` to actually work.
- Add a `samplePathPoints(path, brushSize)` helper exported alongside `clientFloodFill` (pure function, takes an array of `{x, y}` raw mouse positions and returns a deduplicated point list at `brushSize` intervals).

### Color Pick + AI Only modes: untouched

Color Pick keeps eyedropper + tolerance + flood-fill. AI Only keeps the model dropdown. Detection banner moves into AI Brush mode (shown beneath brush controls as supplementary info: "Detected uniform black background — AI Brush will work well here").

## Files to Modify

| File | Change |
|---|---|
| `rembg-service/requirements.txt` | Add `huggingface_hub`, pin `onnxruntime` |
| `rembg-service/Dockerfile` | Pre-download MobileSAM ONNX files via `huggingface_hub` |
| `rembg-service/sam_predictor.py` | **NEW** — MobileSAM ONNX wrapper (encoder + decoder split, point-prompt API) |
| `rembg-service/main.py` | Rewrite `/embed` to run real encoder + cache embedding; rewrite `/predict` to run real decoder + return RGBA |
| `src/types/backgroundRemoval.ts` | Replace `PanelMode` with `'ai-brush' \| 'color-pick' \| 'ai-only'` |
| `src/hooks/useBackgroundRemoval.ts` | Add `samplePathPoints` helper |
| `src/components/studio/BackgroundRemovalPanel.tsx` | Default mode → AI Brush; eager embed + BiRefNet on mount; brush toolbar (Keep/Remove/Size/Undo/Clear); click+drag handlers; cursor overlay; existing Color Pick / AI Only code untouched |

## Critical Files (read before implementing)

- `rembg-service/main.py` — current `/embed` (lines 368–398) and `/predict` (lines 401–434) stubs to replace; `_embeddings` TTLCache infra already in place
- `rembg-service/Dockerfile` — model pre-download pattern to copy
- `src/components/studio/BackgroundRemovalPanel.tsx` — current 4-mode panel, eyedropper click handler at the `previewRef.onClick` (reuse coordinate-mapping logic for brush)
- `src/hooks/useBackgroundRemoval.ts` — `runEmbed` (lines 245–258) and `runPredict` (lines 260–281) already implemented
- `src/services/bgRemoval.ts` — `embedImage` and `predictMask` (lines 87–124) already implemented, contract matches plan
- `src/app/api/background-removal/embed/route.ts` and `predict/route.ts` — already auth-gated proxies

## Reusable Code (already in place)

- `clientFloodFill` (`src/hooks/useBackgroundRemoval.ts`) — keep for Color Pick previews
- `_detect_background` (`rembg-service/main.py:133`) — still used to power the supplementary banner in AI Brush mode
- `_embeddings` TTLCache (`rembg-service/main.py:20`) — reuse for SAM embeddings
- Coordinate-mapping logic in `BackgroundRemovalPanel.handlePreviewClick` — extract to a small helper, reuse for brush

## Deployment Considerations

- **Image size**: +50MB for MobileSAM ONNX. Total Railway image impact small.
- **RAM**: encoder peak ~500MB, decoder ~50MB. Existing 2GB Railway plan fine.
- **Cold start**: first `/embed` after scale-to-zero loads the encoder session (~1s). Acceptable.
- **TTLCache**: 30-min TTL means a user idle >30min loses their embedding and must re-embed. Reasonable.
- **Single replica only**: TTLCache is in-process. If Railway ever scales horizontally, swap to Redis. Out of scope today.

## Verification Plan

1. **Smoke test Python**: `curl -F image=@test.png /embed` returns `{embedding_id, width, height}`. `curl -F embedding_id=… -F 'points=[{"x":500,"y":500,"label":1}]' /predict` returns a valid PNG with non-trivial alpha mask. Confirm via `python -c 'from PIL import Image; im = Image.open("out.png"); print(im.getextrema())'`.
2. **TOP DAD logo regression** (the failure case): Upload, enter studio, BG removal. Initial preview = BiRefNet result. Click "Keep" on the white text → SAM should refine to keep just the logo. Click "Remove" on any black bleed-through → mask updates. Confirm crisp letter interiors and no white halo.
3. **Watercolor turtle regression**: Initial BiRefNet result should be good (it was already good in Phase 1.7). One Keep click on the turtle should preserve all interior petal gaps as transparent. SAM shouldn't make it worse.
4. **Photo portrait**: Initial mask works; brush refines hair edges with negative points around stray strands.
5. **Already-transparent input**: SAM with center positive point should return the existing alpha unchanged (or close to it).
6. **Brush size sampling**: Click+drag a 200px line at brush size 20 should generate ~10 points; same line at brush size 5 should generate ~40. Confirm via dev-tools console log.
7. **Undo**: 5 clicks → 5 undos → preview returns to initial BiRefNet. Predict count = 6 (initial + 5 incremental).
8. **Mode switch**: AI Brush → Color Pick → AI Only round-trip preserves the original image, doesn't crash, doesn't leak SAM points into other modes.
9. **Performance**: First click after embed completes responds in <500ms. Subsequent clicks <300ms. Stroke (mouseup) processes as a single predict call.

## Implementation Order

1. **Python (highest risk)**: write `sam_predictor.py`, swap `/embed` and `/predict` to use it, pre-download model in Dockerfile. **Smoke-test via curl before touching frontend.**
2. **Types**: update `PanelMode` (one-line change).
3. **Hook**: add `samplePathPoints`.
4. **Panel rewrite**: AI Brush mode default + brush toolbar + click/drag handlers + cursor overlay + eager embed-and-BiRefNet. Color Pick / AI Only branches untouched.
5. **Manual QA** against the verification matrix.
6. **Commit + push** to `claude/in-house-background-processing-Ci5rc`.

## Out of Scope (Phase 2 candidates)

- Box prompts (drag rectangle around subject as a coarse hint)
- Mask paintbrush (literally painting alpha bits, no SAM in the loop) — useful for fine-detail touch-up SAM can't reach
- Multi-object selection (separate masks per object)
- Server-side SAM with quantized models for higher quality (`sam-vit-base` swap)
- Saving brush sessions per user
- Mobile/touch event handlers (current plan is mouse-only; touch should mostly work via React's synthetic events but untested)

---

# Plan: Universal Background Removal (Phase 1.7) — SHIPPED

[Phase 1.7 plan retained below for reference; superseded by Phase 1.8 above.]

## Branch

Continue on **`claude/in-house-background-processing-Ci5rc`**.

## Context

Phase 1.6 added a `_flood_fill_white_removal()` post-processing step that BFS from every edge pixel and zeroes alpha on connected near-white regions (RGB > 240). Combined with a `model="white-fill"` mode that skips ML entirely, this **perfectly handles white-background DTF art** — including the watercolor turtle case where ML alone left interior whites between petals.

User feedback: *"that gave a great result. But we can't count on solid white backgrounds. What if the background is black, grey, red, purple, multi-toned, or gradient? We need an easy way that is user-friendly to deal with whatever is thrown our way and do it with great results."*

Real DTF source art arrives with: solid white, solid black (e.g. "TOP DAD" logo), solid colors, gradients, photos, already-transparent PNGs, and mixed two-color backgrounds. The current single-color flood-fill is too narrow.

The fix: generalize the flood-fill to any sampled color, auto-detect the background color from edge pixels on load, and add an eyedropper + tolerance slider for manual override. ML stays as a fallback for genuinely complex/photo backgrounds. Skip SAM (overkill, heavy) and skip a paint-back restore brush for now (Reset button covers the bail-out case in this iteration).
