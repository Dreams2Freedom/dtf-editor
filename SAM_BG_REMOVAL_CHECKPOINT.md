# SAM In-House Background Removal — Checkpoint / Resume Point

**Status:** Paused mid-development. When the user says _"let's circle back to the
in-house BG removal tool"_, resume from here.

**Branch:** `claude/festive-hamilton-6nHZj` (PREVIEW only — **not** merged to
`main`/production). Nothing here has shipped to customers.

**Last confirmed state:** SAM is running and producing the auto-cut (verified via
the on-screen "SAM: applied ✓" badge). The brush was just changed to a bounded,
size-scaled reach. Awaiting user retest of the brush.

---

## The goal

Replace the **first cut** (initial background removal) in the existing in-house
BG-removal tool with the **SAM semantic engine**, while keeping the tool's
brushes, sliders, layout, and location **unchanged**. Target quality: match
ClippingMagic, especially on complex photos and framed/graphic logos. The brush
logic should feel like ClippingMagic (context-aware keep/remove).

## How it works (architecture)

- **AI service:** `rembg-service/` (FastAPI, Python) hosted on **Railway** (app
  reachable via `REMBG_SERVICE_URL`; the `fly.toml` in that dir is a stale,
  abandoned plan — ignore it). Railway **auto-deploys from GitHub** on push.
- **SAM find-everything:** `rembg-service/sam_predictor.py`
  - `segment_everything()` — grid-point sweep over the proven single-point
    `predict()`, dedup via IoU NMS. Returns all object "pieces".
  - `select_subject_mask()` — OUR removal logic: a SAM piece is background if it's
    flat AND (border-connected OR background-colored anywhere). Keeps colorful/
    detailed pieces (text, badges). Removes outer bg, gaps, AND enclosed bg
    pockets (tan inside a border). Fills tiny enclosed specks.
  - `/segment-everything` endpoint in `rembg-service/main.py` (returns cutout PNG
    - optional debug overlay; `overlay=false` for the customer path).
- **Next.js proxy:** `src/app/api/background-removal/segment-everything/route.ts`
  — gated to **paid users + admins** (same as the in-house route).
- **Client call:** `src/tools/bg-removal/api.ts` → `samRemoveBackground()` (lean,
  cutout only) and `segmentEverything()` (eval, returns overlay too).
- **Integration into the real tool:** `src/tools/bg-removal/Panel.tsx`
  - `const SAM_FIRST_CUT_ENABLED = true;` — the on/off flag.
  - `applySamFirstCut()` — calls SAM, converts cutout alpha → mask, overrides
    `samMaskRef` + `initialMaskRef`, recomputes. Runs in PARALLEL with the
    classical chain, which stays the **guaranteed fallback** (SAM overrides on
    success; classical result remains on failure). Bails if the user has started
    brushing.
  - **SAM status badge** (temporary diagnostic) shows running / applied / failed.
  - Brushes/sliders/layout are otherwise **unchanged**; in the default
    "Keep whole shape" mode the cleanup sliders are bypassed (SAM output is
    already cleaned), which is the existing behavior.

## Testing surfaces (admin-only, additive, safe)

- `/admin/bg-eval` — 6-column engine comparison (Classical / BRIA / BiRefNet /
  SAM pieces / SAM subject). `src/app/admin/bg-eval/page.tsx`.
- `/admin/bg-studio` — customer-experience sandbox (upload → Remove Background →
  Restore/Erase brushes). `src/app/admin/bg-studio/page.tsx`.
- The **real tool** on the preview deploy (Studio bg-removal, or
  `/process/background-removal`) — this is where SAM is wired in.

## Key commits (on `claude/festive-hamilton-6nHZj`)

- `f736286` Phase 1: bg-eval comparison page
- `fe5dc25` Phase 2: SAM find-everything + eval integration
- `b754d2d`/`4b9593a`/`9785ce3`/`91e4f1d` subject-selection tuning (border-connect,
  pastels, colorful-keep, speck fill)
- `376f8d9` speed (warp best-only, lower res, fewer grid points)
- `9dd7cc1` bg-studio customer sandbox
- `1ad9b2e` SAM wired into Panel.tsx as flag-gated first cut
- `19a4a1a` enclosed-background removal + endpoint opened to paid users
- `2952b86` brush: decouple size from mode (over-corrected)
- `868432f` SAM status badge diagnostic
- `433ff3c` brush: bounded continuous reach (fix keep-stroke flooding whole bg)

## What works

- SAM runs as the primary first cut (confirmed via badge). Classical fallback
  intact. Enclosed-tan removal in place. Auto-cut is the semantic engine.
- **SAM semantic click-brush ("Smart select") — IMPLEMENTED (beta, awaiting
  user test).** In the AI-Brush tool, a "Smart select" toggle switches the
  Keep/Remove brush from colour-grow to a SAM click-to-select. Click an object
  → SAM `/embed` + `/predict` return that segment → the active Keep tool unions
  it, Remove subtracts it. Undo works like any stroke.
  - All in `src/tools/bg-removal/Panel.tsx` (additive): `smartSelect` state +
    toggle UI, `ensureSamSession()` (lazy, cached `/embed`; invalidated on new
    image), `runSmartSelect()` (predict → alpha→mask → union/subtract →
    StrokeRecord → recompute), and a smart-click branch in `handlePointerDown`.
    Reuses existing `embedImage`/`predictMask` in `api.ts` and the gated
    `/api/background-removal/{embed,predict}` routes.
  - Resilience: overlapping clicks ignored while a predict is in flight;
    expired-embedding (server TTL) → auto re-embed + retry once; predict
    failure no-ops the click and shows a status line.

## Open issues / next steps (resume here)

1. **Smart-select click-brush — TEST + refine.** Implemented (above). Next:
   real-image testing for ClippingMagic parity, especially on distressed/grunge
   text. Possible refinements once tested: cumulative multi-point refinement
   (accumulate points to refine one selection instead of independent clicks),
   a visual marker at the clicked point, and tuning the alpha→mask threshold
   (currently >127). The current brush-size slider is inert in Smart mode
   (SAM decides extent) — consider hiding it there.
2. **Speed** — SAM is ~20s warm (grid sweep on CPU). Fix: **MobileSAM** (docs
   scoped it in `docs/AI_BRUSH_PLAN_HISTORY.md`; ~2s vs ~15s). Needs new model
   files + adapting `sam_predictor.py` loader. Blocks making SAM the default for
   customers.
3. **Remove the SAM status badge** + clean up now-unused brush constants in
   `Panel.tsx` (reachForBrushSize, BRUSH_MEDIUM_SIZE, BRUSH_WHOLE_SIZE,
   GROW_REACH_PER_SIZE, GROW_COLOR_TOLERANCE — currently unused warnings) once
   finalized.
4. **Production rollout** (only after speed + testing): endpoint is already open
   to paid users; keep classical as fallback; consider gating SAM as an opt-in
   "New AI removal (beta)" first, then default.

## Deploy notes

- **Two systems:** Vercel (website/frontend) + Railway (`rembg-service` AI).
  Both auto-deploy from GitHub push. **Vercel's webhook has been flaky** — if a
  push doesn't build, do a manual Redeploy in the Vercel dashboard.
- `REMBG_SERVICE_URL` + `REMBG_SERVICE_API_KEY` must be set for the environment
  (confirmed on Production; also added to Preview).
- Nothing in this effort is on `main`/production yet.
