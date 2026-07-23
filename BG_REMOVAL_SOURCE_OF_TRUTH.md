# Background Removal — Source of Truth (v1)

> **Status: KNOWN-GOOD. Confirmed by the team as "AMAZING."**
>
> The in-house Background Removal tool and its Keep/Remove brushes are frozen
> here as the reference implementation. **Future changes MUST BUILD ON this
> system — extend it, don't replace or re-architect it.** The logic below is
> the contract; preserve its integrity.

## Frozen reference point

- **Good commit:** `98f5c70` (`Remove dev reference images from public/ before production merge`)
  - This commit is reachable from `main` (merged via PR #58), so git will never
    garbage-collect it — it is a permanent, immutable reference.
- **View any file exactly as it was:**
  `git show 98f5c70:src/tools/bg-removal/Panel.tsx`
- **Diff current vs. the good state:**
  `git diff 98f5c70 -- src/tools/bg-removal/`
- **Restore a single file if something regresses:**
  `git checkout 98f5c70 -- src/tools/bg-removal/<file>`

(A local tag `bg-removal-sot-v1` was also cut, but this environment's git proxy
blocks tag pushes, so the commit SHA above is the canonical anchor.)

## The files that make up the tool

All under `src/tools/bg-removal/`:

| File | Responsibility (do not gut these) |
| --- | --- |
| `Panel.tsx` | Orchestrator: canvas, zoom/pan, pointer handlers, brush commit, the `samMask → recomputeCumulative → cumulativeMask → render` pipeline, all tuning constants, and the "Keep whole shape" mode. |
| `scribbleBrush.ts` | Core brush algorithms: `strokeToSeeds`, `growRegionFromStroke` (edge-aware local grow), `computeBackgroundMask` + `fillConnectedRegion` (big-brush connected-component fill), `computeWholeShapeMask` (silhouette keep), `featherAlpha`, `detectBorderColor`. |
| `strokeSemantics.ts` | Turns stroke history into `protect` (Keep) / `forceCarve` (Remove) masks for the cleanup passes. |
| `strokeMask.ts` | Rasterizes the literal brush footprint (always honored). |
| `holeDetection.ts` | Carves background-colored pockets enclosed by the subject (e.g. inside of letters). |
| `edgeFlood.ts` | Border-connected background flood (primary bg detection) + `floodFromSeeds`. |
| `strandedComponents.ts` | Removes small stranded foreground specks. |
| `imageStats.ts` | Classifies graphic vs. photographic content. |
| `useBackgroundRemoval.ts` | Server-model calls (BRIA / BiRefNet; legacy SAM embed/predict). |
| `api.ts` | Client → API wrappers for the removal/detect endpoints. |
| `types.ts` | Shared types. |
| `ClippingMagicPanel.tsx` | The separate ClippingMagic panel (not the in-house brush). |
| `index.tsx` | Studio plugin entry. |

## The logic to preserve (the contract)

1. **Two-stage mask model.** `samMaskRef` = the base mask (initial cutout +
   brush edits). `recomputeCumulative()` derives `cumulativeMaskRef` from it by
   running cleanup passes. Rendering always comes from `cumulativeMaskRef`.
   Brush edits mutate `samMaskRef` directly (Keep = `OR region`, Remove =
   `AND NOT region`).

2. **Brush size tiers (`reachForBrushSize`).**
   - **Precise** (small): edge-aware local grow — pixel-level touch-ups.
   - **Fill** (mid): connected-component fill, reach-BOUNDED and scaled by image
     resolution — grabs a coherent region, isolatable by size.
   - **Whole shape** (`>= BRUSH_WHOLE_SIZE`): unbounded connected-component fill.
   - **Every stroke also always unions its literal footprint**, so painting
     never does *less* than what you paint (critical for same-color-as-bg areas
     like a helmet).

3. **Keep-whole-shape mode (default on for graphics).** Base mask =
   `computeWholeShapeMask` (barrier = non-background line-work, dilated to seal
   hairline gaps; flood the exterior; keep everything inside the silhouette).
   When on, `recomputeCumulative` **bypasses the carve passes** so they can't
   re-remove same-color subject parts, and the cleanup sliders are greyed out.

4. **Stroke semantics.** Keep strokes produce a `protect` mask that shields the
   grown region from the carve passes; Remove strokes produce `forceCarve`.
   Never let a cleanup pass override an explicit user stroke.

5. **Resolution independence.** Reach and seal radius scale with the image's
   longest side (`REACH_REFERENCE_DIM`) so behavior is consistent from a small
   logo to a 4K design.

## Rules for future changes

- **Additive only.** Add new modes/options/passes; do not rewrite the pipeline
  or the brush model above.
- **If a change is risky,** snapshot again first: note the new good commit here
  before touching the core files, so there's always a fresh rollback point.
- **Regression test against the frozen state:** `git diff 98f5c70 -- src/tools/bg-removal/`
  should show only intentional, additive changes.
- If a proposed fix would require replacing any of the core logic in §"The logic
  to preserve," stop and confirm before proceeding.
