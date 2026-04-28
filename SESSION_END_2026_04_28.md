# Session End Summary - April 27–28, 2026

## Session Summary

**Session Duration:** Multi-part session, ~25–30 hours over 1.5 days
**Branch:** `claude/in-house-background-processing-Ci5rc`
**Total Commits:** 24 on this branch
**Major Areas:** In-house background removal microservice, SAM-powered AI Brush studio panel, multi-color palette analysis, mobile/touch support

---

## What Was Accomplished

Built a complete in-house background removal pipeline as a no-credit alternative to ClippingMagic, evolved through 9 user-feedback iterations from "simple flood-fill" to "interactive SAM brush with multi-color palette analysis, marching-ants outline, zoom/pan, and full mobile/touch support."

### 1. Server: Python rembg microservice

- FastAPI app (`rembg-service/main.py`) with auto-detect, multi-mode `/remove`, `/embed`, `/predict`, `/health`, `/debug-sam`
- MobileSAM ONNX wrapper (`sam_predictor.py`) — ~38MB encoder + ~6MB decoder (~2s encode, ~50ms decode on CPU)
- Single-color and multi-color BFS flood-fill helpers
- BRIA-rmbg promoted to default model; BiRefNet variants + U2Net + ISNet anime + SAM also supported
- Dockerfile pre-downloads default models (~330MB) for fast cold starts on Railway

### 2. Client: Studio Background Removal panel

Three modes in one panel (`src/components/studio/BackgroundRemovalPanel.tsx`):

**AI Brush mode (default)** — SAM-powered iterative refinement
- Smart initial mask: BRIA cutout chained with auto-color-fill on the detected dominant background color
- Per-stroke commit: SAM region union (Keep) or difference (Remove) applied to a SAM-only mask
- Color-aware cleanup: rawPath stride + 3×3 neighborhood + 4-bit dedup → 20–80 unique colors per stroke for refined per-pixel classification
- Solid SVG-path stroke visualization (green Keep / red Remove)
- Live "Edge Cleanup" tolerance slider (0–150)
- Marching-ants outline (static dashed) traces the cumulative mask boundary
- O(1) undo via pre-stroke mask snapshots — no SAM re-call

**Color (Color Pick) mode** — pure color-based BFS with multi-color palettes
- "Pick to Remove" / "Pick to Keep" tool toggle
- Multi-color palettes with chip rows (click-to-delete)
- Keep colors act as BFS barriers — same-color content trapped inside the subject is preserved automatically
- Click-to-clean-spot for interior speckles

**AI Only mode** — pure ML mask, no flood-fill, model selector

**Shared canvas chrome:**
- View toggle: Cutout (faded) / Preview (final transparent) / Original
- Zoom: bare wheel toward cursor (desktop), pinch (touch); range 0.25× – 8×
- Pan: spacebar+drag (desktop), two-finger drag (touch)
- Zoom controls pill: −/percent/+/Fit
- PointerEvents unify mouse/touch/pen
- ResizeObserver tracks un-transformed canvas size (transform-stable overlays)

### 3. Bugs fixed this sprint

- **BUG-068:** Production TDZ in tolerance useEffect (`a533398`)
- **BUG-069:** Production TDZ in runInitialAnalysis (`44b1a92`) — second instance of same class
- **BUG-070:** "Reset to original" left brush stuck on Preparing (`2585beb`)
- **BUG-071:** Marching ants rendered tiny in upper-left corner (`692d733`)
- **BUG-072:** Sparse SAM-prompt sampling missed fringe colors (`6590c86`)

See `BUGS_TRACKER.md` for postmortems.

---

## Phase Map (Linear History)

| Phase | Name | Commit |
|---|---|---|
| 1.6 | Flood-fill white removal | `3f3eb5a` |
| 1.7 | Universal BG removal (auto-detect, color pick, AI fallback) | `25eaa2c` |
| 1.8 | SAM brush masking (real MobileSAM ONNX) | `df85e2e` (+ 4 fixups) |
| 1.9 | Additive cumulative masking with original-underlay | `a41ff7d` |
| 1.10 | Solid-line strokes, color cleanup, parallel init | `68e03dd` |
| 1.11 | Live tolerance slider | `9e1ffbe` (+ TDZ fix `a533398`) |
| 1.11.5 | BRIA-rmbg as default + BiRefNet massive | `ad2b133` |
| 1.12 | Smart init mask + marching ants + view toggle | `5d4b390` (+ reset fix `2585beb` + TDZ fix `44b1a92`) |
| 1.13 | Fix marching ants, Preview view, zoom/pan, touch | `692d733` |
| 1.14 | Multi-color palettes everywhere | `6590c86` |

Full plan history (with rationale + alternatives + verification matrices) lives in `docs/AI_BRUSH_PLAN_HISTORY.md`.

---

## Documentation Updated

- ✅ `DEVELOPMENT_LOG_PART1.md` — comprehensive April 27–28 entry with phase map, design decisions, challenges, lessons
- ✅ `CHANGELOG.md` — version 1.2.0 entry
- ✅ `BUGS_TRACKER.md` — BUG-068 through BUG-072 logged + fixed
- ✅ `COMPLETION_TRACKER.md` — In-House BG Removal + AI Brush marked complete
- ✅ `docs/AI_BRUSH_PLAN_HISTORY.md` — full 1100+ line plan stack preserved
- ✅ This session-end file

---

## Production Status

- All commits pushed to `origin/claude/in-house-background-processing-Ci5rc`
- Vercel preview deployments ran cleanly after each commit (post-TDZ-fix)
- Railway rembg-service: deployed and warm
- BRIA-rmbg + BiRefNet-general-lite + SAM ONNX pre-downloaded in Docker image
- **Not yet merged to main** — branch is feature-complete, awaiting merge / PR review

---

## Next Steps

User indicated they want to "move on to making some larger changes" after this. Specific candidates (out of scope for this branch):

- Touch-first eyedropper magnifier overlay (improves color picking accuracy on small touchscreens)
- Per-color tolerance (currently a single global tolerance applies to all palette colors)
- Color-cube lookup optimization for cleanup pass on >1MP images
- AI Brush "click to add a color to global palette" (currently brush colors only come from sampled stroke pixels)
- Save brush sessions per-image / across sessions
- Numeric zoom input + cmd-+/-/0 keyboard shortcuts
- Merge `claude/in-house-background-processing-Ci5rc` to main once verified in production preview

---

## Key Files for Re-Entry (AI Brush, Phase 1.x)

If picking up the AI Brush work after a break, read these in order:

1. `docs/AI_BRUSH_PLAN_HISTORY.md` — every plan from 1.7 → 2.0, with rationale and trade-offs
2. `DEVELOPMENT_LOG_PART1.md` (April 27–28 entry) — what was built and why
3. `BUGS_TRACKER.md` (BUG-068 through BUG-075) — bugs encountered, with lessons
4. `CHANGELOG.md` (1.2.0 + 1.3.0) — user-visible feature summary
5. `src/tools/bg-removal/Panel.tsx` — the panel itself (1700+ lines, all three modes; moved here in Phase 2.0 Step 2)
6. `src/tools/bg-removal/useBackgroundRemoval.ts` — `runEmbed`, `runPredict`, `runPredictRaw`, `clientFloodFill`, `clientMultiFloodFill`, `samplePathPoints`
7. `rembg-service/main.py` — server endpoints + flood-fill helpers
8. `rembg-service/sam_predictor.py` — MobileSAM ONNX wrapper

---

# Follow-on Session Later That Day — Studio Plugin Architecture (Phase 2.0)

## Phase 2.0 Summary

**Branch:** same (`claude/in-house-background-processing-Ci5rc`)
**Commits added:** 9 (`dbde45b` → `ec9ee54`)
**Scope:** Architectural refactor — Studio is the durable home for the working image; tools (BG Remove, Upscale, Color Change) are self-contained plugins under `src/tools/<tool-id>/`. Refactoring one tool can no longer break another, and adding new API-backed tools is a folder-creation exercise rather than a Studio-shell change.

The user asked for a hub-and-spoke architecture: *"As we add tools, those tools stand alone on their own and plug into the studio for us to use… when we make changes, let's say, to the background editor and we're messing with the code that affects the color selection, I don't want it to also affect the code for the color changing plugin."*

## What Shipped

| Step | Commit | What |
|---|---|---|
| 1 | `dbde45b` | `src/tools/types.ts` plugin contract + empty registry + skeleton dirs |
| 2 | `33eb6ba` | BG Removal moved into `src/tools/bg-removal/` |
| 3 | `96cc91e` | Color Change moved into `src/tools/color-change/` |
| 4 | `45005b0` | New Upscale plugin: `Panel.tsx` + `providers/{types,deepImage}.ts` (first contract-native tool) |
| 5 | `70d5b6b` | Studio shell rewrite: `workingImage` state, plugin-driven tool picker, `onApply` chain handler, Save/Reset buttons |
| 9 | `410718a` | ESLint `no-restricted-imports` zones blocking cross-tool imports |
| H1 | `8b23b8b` | Hotfix: rename adapter `index.ts` → `index.tsx` (JSX in `.ts` failed swc) |
| H2 | `22f21e8` | Hotfix: add `'use client'` to adapter index files; reroute `/api/color-change/use` to import constants from `types.ts` directly |
| H3 | `ec9ee54` | Hotfix: extend ESLint exemption to include `src/app/api/**` |

Steps 6, 7, 8 of the original plan were intentionally collapsed/deferred:
- **Step 6** (thin standalone wrappers): standalone `/process/` routes already use `@/tools/...` imports as of Steps 2/3. The bigger flows (`/process/background-removal` is ClippingMagic, `/process/upscale` has bulk + DPI) are deliberately distinct UXs.
- **Step 7** (provider abstraction polish): Upscale already has the `providers/` pattern. BG Removal can adopt it when a 2nd provider lands.
- **Step 8** (internal nav redirects): the Create dropdown and dashboard cards still link to standalone tool routes. Routing to `/studio?tool=...` requires a unified upload UX (Studio currently needs an `imageId`); deferred.

## Architectural Outcome

```
src/tools/
  types.ts                            ← StudioTool / StudioToolPanelProps / ApplyMetadata contract
  registry.ts                         ← ordered tool list (3 entries)
  bg-removal/                         ← Panel + hook + api + types + adapter + providers/
  upscale/                            ← Panel + index + providers/{types, deepImage}
  color-change/                       ← Panel + components/ + hook + types + color-utils + adapter
```

Cross-tool imports blocked by ESLint zones. Integration layer (`src/app/{studio,process,api}/**`) exempt.

Studio shell holds two image refs: `originalImage` (immutable upload) and `workingImage` (current state). Tool chaining is automatic — each tool's `onApply(canvas, meta)` updates `workingImage`, becoming the next tool's input. Reset reverts; Save persists with the most-recent operation tag.

## Build-Failure Saga (Hotfixes 1–3)

After Step 9 was pushed, three sequential Vercel build failures surfaced different aspects of Next.js 15's server/client boundary rules. Each was a one- or two-line fix landed within minutes of the prior failure. Compile has been green since hotfix 2 (`22f21e8`); only the lint step kept failing until `ec9ee54`. See `BUGS_TRACKER.md` BUG-073/074/075 for full postmortems.

## Branch Status After Phase 2.0

- ✅ All Phase 2.0 commits pushed to `claude/in-house-background-processing-Ci5rc`
- ✅ Latest commit `ec9ee54` should pass both compile + lint on Vercel
- ✅ Documentation updated: this session-end file, `DEVELOPMENT_LOG_PART1.md`, `CHANGELOG.md` (v1.3.0), `BUGS_TRACKER.md` (BUG-073/074/075), `COMPLETION_TRACKER.md`, `docs/AI_BRUSH_PLAN_HISTORY.md`
- ⏸️ **Pending verification on Vercel deploy** — confirm `ec9ee54` actually passes (the user's last paste was from the pre-fix `22f21e8` build)
- ⏸️ Manual QA on deploy: tool chaining works (BG Remove → Upscale → Color Change → Save), standalone routes still work, ESLint isolation triggers on a deliberate violation

## Next Session Priorities

1. **Confirm Vercel green** on `ec9ee54`. If still failing, the lint exemption fix didn't reach the right path or there's a different error.
2. **Manual end-to-end QA** in deployed Studio: pick BG Remove → Apply → switch to Upscale → see chained cutout → Apply → switch to Color Change → Apply → Save to Gallery.
3. **Step 8 — internal nav redirects**: needs an upload UX decision (does `/studio` handle no-imageId case?). Likely a small phase of its own.
4. **Larger user-suggested changes** that prompted Phase 2.0 in the first place — pick up after the architecture is verified.

## Key Files for Re-Entry (Phase 2.0)

If picking up the plugin work after a break, read these in order:

1. `docs/AI_BRUSH_PLAN_HISTORY.md` (top section is Phase 2.0)
2. This file's "Phase 2.0 Summary" section above
3. `BUGS_TRACKER.md` BUG-073, BUG-074, BUG-075 — the build hotfixes
4. `src/tools/types.ts` — the plugin contract (60 lines)
5. `src/tools/registry.ts` — the ordered tool list
6. `src/app/studio/client.tsx` — the rewritten shell (~330 lines)
7. `src/tools/upscale/Panel.tsx` + `src/tools/upscale/providers/` — the cleanest example of a plugin native to the contract
8. `eslint.config.mjs` — the cross-tool isolation rules
