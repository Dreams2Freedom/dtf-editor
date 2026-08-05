# Branch Sync Notes — festive-hamilton ⇄ main

**Purpose:** track what's already on production (`main`) vs the working branch
(`claude/festive-hamilton-6nHZj`) so nothing gets lost or regressed when we
deploy the in-house BG-removal work later.

_Last updated: partner-integration fix session._

---

## ✅ Already shipped to `main` (production) this session

Cherry-picked directly onto `main` (partner/coworker integration work):

| main commit | What                                                                                    | festive twin |
| ----------- | --------------------------------------------------------------------------------------- | ------------ |
| `666d40b`   | Pan + zoom in shared Studio canvas (Upscale, Vectorize)                                 | `927ba18`    |
| `1b448f7`   | Partner background-removal auth: accept `X-Embed-Token` (fixed embed "Missing API key") | `21a9dda`    |
| `6e5694e`   | CSP: allow `www.facebook.com` in `frame-src` (Meta Pixel iframe)                        | `daecda6`    |

These are LIVE on main. Do not re-push / duplicate them.

## 🌿 On festive only — NOT yet on main (intentional)

| festive commit                     | What                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `2673db0`                          | Fix lingering blur overlay after bg-removal cut completes (in-house tool) |
| + ongoing in-house BG-removal work | (this is what we're continuing now)                                       |

## ⚠️ Divergence warning — READ BEFORE festive → main

`festive-hamilton` is **~44 commits BEHIND `main`** and is missing production
work that main already has. Most important:

- **`src/middleware.ts` embed-framing** (main only): `getCSP(allowFraming)`,
  the `isEmbed` check, `frame-ancestors *` for `/embed/*`, and the
  `X-Frame-Options` skip for `/embed/*`. festive's `middleware.ts` does NOT
  have this. A naive festive → main would **regress** partner embed framing.
- 40+ other production commits festive lacks.

## 🔧 Reconciliation plan (do this BEFORE deploying festive to main)

1. `git fetch origin main`
2. Rebase festive onto main (brings festive up to production, keeps our
   bg-removal work on top):
   `git checkout claude/festive-hamilton-6nHZj && git rebase origin/main`
   - The 3 partner commits above should drop out automatically (already on main
     as identical patches) or resolve trivially.
   - `2673db0` (blur fix) reapplies on top of main's current bg-removal code —
     watch for conflicts in `src/tools/bg-removal/Panel.tsx` (main's copy is
     ~44 commits diverged from festive's).
3. After rebase, confirm these are present in the tree:
   - middleware embed-framing (main's `getCSP(allowFraming)` + `isEmbed`)
   - `frame-src` includes `https://www.facebook.com`
   - partner bg-removal route uses `requirePartnerAndShop`
   - Studio pan/zoom (`interactive` StudioCanvasFrame)
4. `npm run type-check` + `npm run lint`, then deploy.

## Checklist: "must be on main" at deploy time

- [ ] Partner bg-removal embed-token auth (`requirePartnerAndShop`)
- [ ] Studio pan/zoom (interactive canvas)
- [ ] CSP `frame-src` facebook.com
- [ ] CSP embed-framing (`/embed/*` frame-ancestors) — already on main, don't lose it
- [ ] In-house BG-removal blur fix + whatever we build next
- [ ] Embed-token secret fail-safe guard (`src/lib/partner/embedToken.ts`) — security hardening
