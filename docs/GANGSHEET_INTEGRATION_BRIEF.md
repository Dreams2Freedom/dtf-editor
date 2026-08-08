# Gangsheet ↔ DTF Editor — Integration Brief

For the gangsheet-app engineer (and their Claude). This is the cover sheet; the
full contract is **`PARTNER_TOOLS_API.md`** (copy that file into this repo too).

## What you're integrating

Per-image editing inside the gangsheet builder. When a shop owner selects an
image in a sheet, they open DTF Editor's tools (background removal, upscale,
vectorize, DPI check, halftone, color-change, AI generate) on that one image and
drop the result back into the sheet. Each tool use is metered by DTF Editor and
**billed to the shop owner via a Shopify usage charge**.

DTF Editor hosts and runs the tools. You call its API / embed its Studio.

## What you've been handed (fill these in)

- **Base URL:** `https://__DTF_API_BASE__` (the deployed DTF Editor app)
- **Partner API key:** `ptk___________________` ← store as a **backend secret**, never in the browser
- **Full API spec:** `PARTNER_TOOLS_API.md`

## Integration tasks

1. **Store the API key** as a backend secret (e.g. env var).
2. **Open the editor for an image** (recommended: use the hosted embed):
   - From your **backend**, call `POST {BASE}/api/partner/v1/embed-session`
     with `Authorization: Bearer <key>` and `{ shop, imageUrl }`.
   - You get `{ embedUrl }`. Open it in an iframe/modal.
3. **Receive the result** in the browser:
   ```js
   window.addEventListener('message', e => {
     if (e.data?.type === 'dtf-studio-result') {
       // e.data.resultUrl -> replace the selected image in the sheet
       // e.data.totalCents -> optional
     }
     if (e.data?.type === 'dtf-studio-cancel') {
       /* closed, no change */
     }
   });
   ```
   (Prefer verifying `e.origin === <DTF base origin>` before trusting the message.)
4. **Billing (Shopify usage charges):** ensure each shop has an app subscription
   with a **usage-pricing line + capped amount**. Then either:
   - **Real-time:** on each tool use, create an `appUsageRecordCreate` from the
     returned `usage.costCents`; or
   - **Reconcile monthly:** pull `POST {BASE}/api/partner/v1/usage/summary`
     `{ shop, from, to }` and create one usage record per shop per cycle.
     See `PARTNER_TOOLS_API.md` §5 for the exact GraphQL.
5. **(Optional) headless mode:** instead of the embed, call individual tool
   endpoints directly from your backend (`/api/partner/v1/background-removal`,
   `/upscale`, `/vectorize`, `/dpi-check`, `/generate`) and build your own UI.
   Same auth + `usage` response.
6. **Test end-to-end:** select image → edit → result lands in the sheet →
   usage recorded → Shopify charge created.

## Kickoff prompt for your Claude

> We're integrating DTF Editor's Partner Tools API into this Shopify gangsheet
> app so store owners can edit individual sheet images (background removal,
> upscale, vectorize, DPI, etc.) and get billed per use via Shopify usage
> charges. Read `PARTNER_TOOLS_API.md` and `GANGSHEET_INTEGRATION_BRIEF.md` in
> this repo. Base URL and partner API key are in our backend secrets
> (`DTF_API_BASE`, `DTF_PARTNER_KEY`). Build: (1) a per-image "Edit" action that
> mints an embed session server-side and opens the embed, (2) the postMessage
> handler that drops the result back into the sheet, (3) Shopify usage-charge
> creation from the returned usage cost, wired to each shop's app subscription.
> Start by proposing a plan against our existing image-selection + Shopify
> billing code before writing anything.

## Notes

- The partner API key is a **secret** — only your backend uses it. The browser
  only ever gets short-lived embed tokens (minted by `embed-session`).
- Failed tool runs are logged with `costCents: 0` and are not billable.
- DTF Editor's `usage/summary` is the source of truth for reconciliation.
