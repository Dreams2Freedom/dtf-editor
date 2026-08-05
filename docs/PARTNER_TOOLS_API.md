# DTF Editor — Partner Tools API

Metered, API-key-authenticated access to DTF Editor's in-house tools for external
apps (e.g. the Shopify gangsheet builder). Every tool call is authenticated,
runs on DTF Editor infrastructure, and is **logged as a priced usage event per
shop** so the partner app can bill the shop owner (Shopify usage charges).

Tools with an in-house engine (**background removal = SAM**, **halftone**,
**color-change**, **DPI check**) always use the in-house path. **No ClippingMagic
is exposed through this API.**

- **Base URL:** `https://<dtf-editor-domain>`
- **All requests:** `POST`, `Content-Type: application/json`
- **CORS:** enabled (the API key / embed token is the security boundary)

---

## 1. Setup (DTF Editor side)

1. Apply the migrations:
   - `supabase/migrations/20260730_partner_tools_api.sql` (tables + RLS/grants)
   - `supabase/migrations/20260730_partner_usage_summary.sql` (aggregation fn)
2. (Optional) set `PARTNER_EMBED_SECRET` for embed-token signing (defaults to a
   value derived from the service-role key).
3. Issue a partner API key:
   ```
   node scripts/create-partner-key.js "Gangsheet Builder"
   ```
   The raw key (`ptk_…`) is printed **once** — store it as a secret in the
   gangsheet app's backend.

---

## 2. Authentication

- **Server-to-server (partner backend):** send the API key as
  `Authorization: Bearer <ptk_…>` (or `X-API-Key: <ptk_…>`). Include `shop` in
  the body.
- **Browser embed:** the embed uses a short-lived **embed token** via the
  `X-Embed-Token` header (see §4). The token carries the shop, so the browser
  cannot forge which shop is billed, and the secret API key is never exposed
  client-side.

---

## 3. Tool endpoints

Every tool returns a `usage` block: `{ tool, costCents, eventId }`. Feed this
into Shopify billing (§5).

### Background removal (in-house SAM)

```
POST /api/partner/v1/background-removal
{ "shop": "store.myshopify.com", "imageUrl": "https://…" }
→ { "resultUrl": "https://…png", "usage": { "tool": "background-removal", "costCents": 5, "eventId": "…" } }
```

### Upscale (Deep-Image)

```
POST /api/partner/v1/upscale
{ "shop": "…", "imageUrl": "https://…", "scale": 2, "processingMode": "auto_enhance", "faceEnhance": false }
→ { "resultUrl": "https://…", "usage": { … } }
```

`scale`: 2 | 4. `processingMode`: `auto_enhance` | `generative_upscale` | `basic_upscale`.

### Vectorize (Vectorizer.ai)

```
POST /api/partner/v1/vectorize
{ "shop": "…", "imageUrl": "https://…" }
→ { "resultUrl": "https://…svg", "usage": { … } }
```

### AI generate (OpenAI gpt-image-1)

```
POST /api/partner/v1/generate
{ "shop": "…", "prompt": "…", "size": "1024x1024", "quality": "medium" }
→ { "resultUrl": "https://…png", "usage": { … } }
```

### DPI check (in-house — reports, does not transform)

```
POST /api/partner/v1/dpi-check
{ "shop": "…", "imageUrl": "https://…", "targetWidthInches": 11, "targetHeightInches": 11 }
→ { "pixels": { "width": 3300, "height": 3300 },
    "dpi": { "horizontal": 300, "vertical": 300, "min": 300 },
    "standard": 300, "meetsStandard": true,
    "maxSizeAtStandardInches": { "width": 11, "height": 11 },
    "usage": { … } }
```

### Report usage for a client-side in-house tool (halftone, color-change)

Halftone and color-change run in the browser (inside the embed). After a
successful client-side use, meter it:

```
POST /api/partner/v1/report-usage
{ "shop": "…", "tool": "halftone" }         // or "color-change"
→ { "usage": { "tool": "halftone", "costCents": 3, "eventId": "…" } }
```

**Errors:** `401` bad/missing key or token, `400` bad input, `502` upstream tool
failure, `503` engine not configured, `500` internal. Failed tool runs are
logged with `costCents: 0` and are **not** billable.

### Result URLs — canonical host

Every `resultUrl` we return (from the tool endpoints and from the embed's
`dtf-studio-result` message) is a **public object in our Supabase Storage**,
served from:

```
https://xysuxhdqukjtqgzetwps.supabase.co/storage/v1/object/public/images/…
```

Allowlist that host for result downloads. It is **not** on `dtfeditor.com`, and
it is never the `imageUrl` you passed in. If we ever have to change the host,
we will announce it in advance — a silent change would break edits only at your
download step, after the merchant has already been billed for the tool run.

---

## 4. Embeddable Studio (per-image editor)

For a ready-made UI, open the hosted Studio for one image.

**Step 1 — mint a session (partner backend, API key):**

```
POST /api/partner/v1/embed-session
{ "shop": "store.myshopify.com", "imageUrl": "https://…", "ttlSeconds": 1800 }
→ { "token": "…", "embedUrl": "https://…/embed/studio?token=…", "expiresAt": "…" }
```

**Step 2 — open `embedUrl`** in an iframe or popup.

**Step 3 — receive the result** via `postMessage`:

```js
window.addEventListener('message', e => {
  if (e.data?.type === 'dtf-studio-ready') {
    // Embed has rendered and is interactive. Fires once, on first render.
    // Use this instead of the iframe `load` event to hide your loading state —
    // `load` also fires for a frame blocked by X-Frame-Options.
  }
  if (e.data?.type === 'dtf-studio-result') {
    const { resultUrl, totalCents } = e.data; // drop resultUrl back into the sheet
    // resultUrl is always on our Supabase host (see "Result URLs" above) and is
    // the edited file — never the imageUrl you passed in.
  }
  if (e.data?.type === 'dtf-studio-cancel') {
    // user closed without saving
  }
});
```

**Messages the embed emits:** `dtf-studio-ready` (once, on first render),
`dtf-studio-result` (`{ resultUrl, totalCents }` on Done), `dtf-studio-cancel`
(on Cancel/close).

Inside the embed, each tool call is authorized by the token (`X-Embed-Token`)
and metered per shop automatically — you don't manage keys client-side. The
embed currently exposes Remove BG (SAM), Upscale, Vectorize, and DPI check;
halftone/color-change are a planned addition.

---

## 5. Billing — Shopify usage charges

DTF Editor **meters and prices**; the **gangsheet Shopify app creates the usage
charge** on the shop owner's app subscription. Two integration styles:

**A. Charge per use (real-time).** After each tool call, take the returned
`usage.costCents` and create a Shopify usage record on that shop's active app
subscription line (which must have a usage-pricing plan with a capped amount):

```graphql
mutation appUsageRecordCreate(
  $subscriptionLineItemId: ID!
  $price: MoneyInput!
  $description: String!
) {
  appUsageRecordCreate(
    subscriptionLineItemId: $subscriptionLineItemId
    price: $price
    description: $description
  ) {
    appUsageRecord {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

```js
// price = costCents / 100, in the shop's currency
await admin.graphql(APP_USAGE_RECORD_CREATE, {
  variables: {
    subscriptionLineItemId: shopSubscription.usageLineItemId,
    price: { amount: (usage.costCents / 100).toFixed(2), currencyCode: 'USD' },
    description: `DTF ${usage.tool} — event ${usage.eventId}`,
  },
});
```

Prerequisite: create the per-shop app subscription once (on install/upgrade) via
`appSubscriptionCreate` with a `usagePricing` line + `cappedAmount`.

**B. Reconcile periodically.** Meter throughout the period, then at cycle end
pull the total per shop from us and create one usage record:

```
POST /api/partner/v1/usage/summary
{ "shop": "store.myshopify.com", "from": "2026-07-01T00:00:00Z", "to": "2026-08-01T00:00:00Z" }
→ { "shop": "…", "byTool": { "background-removal": { "uses": 40, "costCents": 200 }, … },
    "totalUses": 63, "totalCents": 410 }
```

Individual events for audit:

```
POST /api/partner/v1/usage/events
{ "shop": "…", "from": "…", "to": "…", "limit": 100 }
→ { "events": [ { "id", "shop_domain", "tool", "cost_cents", "status", "result_ref", "created_at" }, … ] }
```

Handle Shopify's `cappedAmount` (a merchant must approve a raised cap) and treat
DTF Editor's usage records as the source of truth for reconciliation.

---

## 6. Pricing (per use, cents — tune in `src/lib/partner/pricing.ts`)

| Tool               | cents |
| ------------------ | ----- |
| background-removal | 5     |
| upscale            | 8     |
| vectorize          | 10    |
| halftone           | 3     |
| dpi-check          | 1     |
| color-change       | 3     |
| generate           | 12    |

---

## 7. Notes / roadmap

- **Speed:** in-house SAM background removal is CPU-bound (~seconds+). MobileSAM
  is the planned speed upgrade (see `SAM_BG_REMOVAL_CHECKPOINT.md`).
- **Client-side tools in the embed:** halftone + color-change need their canvas
  components ported into `/embed/studio` (currently metered via `report-usage`).
- **Admin dashboard** for partner keys + usage is a planned internal add.
