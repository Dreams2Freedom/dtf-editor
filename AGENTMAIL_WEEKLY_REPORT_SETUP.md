# Weekly Ready to Press Report — AgentMail Setup

Automated weekly email tracking the **Ready to Press mobile add-to-cart (cart-to-view) recovery** after the 2026-06-13 mobile redesign. Sends to Shannon@s2transfers.com every Monday.

## What it does

- Pulls GA4 data for the last 7 days via the **Windsor.ai REST API** (reusing the existing GA4 ↔ Windsor connection).
- Isolates Ready to Press = `item_category = "DTF Transfer"` and computes cart-to-view + view→purchase by device (mobile / desktop / tablet).
- Compares mobile cart-to-view against the established benchmark:
  - **Recovery target (pre-drop): 69.8%**
  - **Pre-fix low (before 6/13 redesign): 53.2%**
- Emails the report through **AgentMail** (https://agentmail.to).

## Files

- `src/services/agentMail.ts` — AgentMail REST client (ensure inbox + send).
- `src/services/analytics/windsorAnalytics.ts` — Windsor.ai GA4 REST fetch.
- `src/services/reports/readyToPressReport.ts` — report builder (HTML + text) and benchmark constants.
- `src/app/api/cron/weekly-rtp-report/route.ts` — cron endpoint (auth via `CRON_SECRET`).
- `vercel.json` — schedule `0 13 * * 1` (Mondays 13:00 UTC ≈ 9am ET).

## Required environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Notes |
|---|---|---|
| `AGENTMAIL_API_KEY` | ✅ | From the AgentMail console (https://agentmail.to). |
| `WINDSOR_API_KEY` | ✅ | From windsor.ai account that has the GA4 (S2Transfers) connection. |
| `CRON_SECRET` | ✅ (already set) | Existing cron auth secret. |
| `AGENTMAIL_INBOX_ID` | optional | If unset, an inbox is auto-created/reused (client_id `dtf-editor-reports`). |
| `REPORT_RECIPIENT_EMAIL` | optional | Defaults to `Shannon@s2transfers.com`. |

## Testing after the keys are set

Dry run (build the report, no email sent):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://dtfeditor.com/api/cron/weekly-rtp-report?dryRun=1"
```

Send a real test email now:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://dtfeditor.com/api/cron/weekly-rtp-report"
```

## Notes

- Emails send from an `@agentmail.to` address. To send from a branded `@s2transfers.com`
  domain, configure a custom domain in AgentMail and set `AGENTMAIL_INBOX_ID` to that inbox.
- "Cart-to-view" is item-level (`items_added_to_cart / items_viewed`) — the only way to isolate
  a collection in GA4 for this store, since item lists aren't tagged.
- First clean post-redesign week is **Jun 15–21**, reported Monday **Jun 22**.
