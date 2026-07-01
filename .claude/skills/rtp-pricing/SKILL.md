---
name: rtp-pricing
description: Change prices on Ready to Press DTF Transfer size variants in the Shopify store (s2transfers.com). Use when the user wants to update, raise, lower, or put on sale the price of one or more transfer sizes (e.g. "change the 10 inch transfers to $3", "make the 3x3 $1.50 regular price") across the Ready to Press collection.
---

# Ready to Press (RTP) Variant Pricing

Bulk-update the price (and/or compare-at price) of one or more **size variants**
across the Ready to Press DTF Transfer catalog on the Shopify store
**s2transfers.com**.

## Store facts (verified 2026-07)

- **Collection:** "Ready to Press" — `gid://shopify/Collection/479202279710`, handle `ready-to-press`
- **Storefront:** https://s2transfers.com  (product URL = `https://s2transfers.com/products/<handle>`)
- **Target products:** every DTF Transfer in RTP. Filter query:
  `tag:rtp AND product_type:'DTF Transfer'` → **~2,059 products** (recount each time).
  - The collection has ~2,068 products total; the rest are "Premade DTF Gang Sheet"
    products with a single `Default Title` variant — **do not touch those** for size pricing.
- Each DTF Transfer has one option named **`Ready To Press DTF Transfer Size`** with
  these 11 variant titles (the size ladder). Prices below are the standard ladder as
  last seen — **always re-read live prices before editing, they change over time**:

  | Variant title | Typical price | On sale? (compareAt) |
  |---|---|---|
  | Pocket Size 3"x3"    | $1.50 | no (compareAt == price) |
  | Large Pocket Size 4"x4" | $1.75 | no |
  | Infant 5"            | $2.50 | no |
  | Toddler 6"           | $2.75 | no |
  | Large Toddler 7"     | $3.25 | no |
  | Youth 8"             | $3.75 | no |
  | Large Youth 9"       | $4.00 | no |
  | Adult Small-Large 10"| $3.00 | **yes** (compareAt $4.50) |
  | Adult M-2XL 11"      | $3.00 | **yes** (compareAt $5.25) |
  | Adult XL-2XL 12"     | $5.50 | no |
  | Adult 3XL 13"        | $6.75 | no |

  Match the size the user means by the **inch number in the variant title**
  (e.g. "10 inch" → `Adult Small-Large 10"`, "3x3" → `Pocket Size 3"x3"`).

## Compare-at price convention (IMPORTANT — ask if unclear)

Shopify shows a struck-through "sale" price when `compareAtPrice > price`.
This store's convention:

- **Regular price** (not on sale) → set **both** `price` and `compareAtPrice` to the
  new value (so no phantom sale shows). The user signals this with phrases like
  "regular price from here on out", "just make it $X".
- **Sale price** (keep it marked down) → set only `price`, **leave `compareAtPrice`
  as-is** so the original struck-through price stays. The user signals this with
  "it's on sale at $X, make it $Y", "put it on sale".

If the user doesn't make it clear which they want, **ask** before running.

## Workflow

1. **Re-read live data.** Confirm the current collection count and the exact variant
   titles/prices — do not trust cached numbers. Use:
   ```graphql
   { productsCount(query: "tag:rtp AND product_type:'DTF Transfer'") { count } }
   ```
2. **Confirm scope + compare-at handling** with the user (all products vs a test batch;
   regular vs sale). This is a live, customer-facing, hard-to-reverse change — always confirm.
3. **Test batch first.** Update ~3 products, give the user the storefront links, and wait
   for their OK before the full rollout. Good reusable test products (Christian designs,
   stable handles):
   - `if-the-stars-were-made-to-worship-dtf-transfer`
   - `i-can-do-all-things-through-christ-dtf-transfer`
   - `fall-for-jesus-dtf-transfer`
4. **Full rollout** after approval (see methods below).

## How to update (per product)

`productVariantsBulkUpdate` updates multiple variants of **one** product per call.
Only include the variant IDs for the sizes being changed.

```graphql
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id title price compareAtPrice }
    userErrors { field message }
  }
}
```
- Regular-price change → each variant `{ id, price, compareAtPrice }` (both set equal).
- Sale-price change → each variant `{ id, price }` only (omit compareAtPrice to preserve it).

### Finding the variant IDs
```graphql
{
  products(first: 3, query: "tag:rtp AND product_type:'DTF Transfer'") {
    edges { node { id title handle
      variants(first: 15) { edges { node { id title price compareAtPrice } } }
    } }
    pageInfo { hasNextPage endCursor }
  }
}
```
Pick the variant whose `title` matches the target size(s). Paginate with `after: endCursor`.

## Full rollout across ~2,059 products

That's thousands of variant writes. Two options:

- **Batched per-product mutations** (what the test uses, scaled up): reliable, one
  `productVariantsBulkUpdate` per product. Slower; keep the user posted on progress.
- **Server-side bulk operation** (preferred for the whole catalog): `stagedUploadsCreate`
  → upload a JSONL where each line is `{ "productId": "...", "variants": [ ... ] }` →
  `bulkOperationRunMutation` referencing `productVariantsBulkUpdate` → poll
  `currentBulkOperation { status objectCount }` until `COMPLETED`. Far fewer API calls
  and resilient to connection drops.

Multiple size changes (e.g. 3"/4"/5" regular **and** 10"/11" sale) can be bundled into
a single pass — include all changed variants for each product in one line/mutation.

## Gotchas

- The Shopify MCP connection in this environment drops frequently. Re-load tools via
  ToolSearch (`select:mcp__Shopify__graphql_mutation,mcp__Shopify__graphql_query`) and
  retry. Mutations are idempotent (setting a price to the same value again is harmless),
  so re-running a dropped batch is safe.
- Never change the "Premade DTF Gang Sheet" products or the `Default Title` variants.
- All prices are plain decimal strings, e.g. `"3.00"`.
- After any change, update `BUGS_TRACKER.md`/`DEVELOPMENT_LOG.md` only if relevant — this
  is a store-data task, not an app-code task, so repo tracking files usually don't apply.
