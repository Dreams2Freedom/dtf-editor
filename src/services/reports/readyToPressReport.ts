/**
 * Builds the weekly "Ready to Press" mobile add-to-cart recovery report.
 *
 * Context: a mobile design change in mid-May 2026 dropped the Ready to Press
 * (item_category = "DTF Transfer") mobile add-to-cart (cart-to-view) rate from
 * its healthy ~70% down to the low-50s. The mobile design was reworked on
 * 2026-06-13. This report tracks the recovery back toward the pre-drop
 * benchmark each week, broken out by device.
 *
 * "Cart-to-view rate" = items_added_to_cart / items_viewed at the item level —
 * the only way to isolate a collection here, since the store does not tag
 * GA4 item lists.
 */
import 'server-only';
import { fetchGA4, num, type GA4Row } from '@/services/analytics/windsorAnalytics';

const READY_TO_PRESS_CATEGORY = 'DTF Transfer';

/**
 * Benchmarks from the Apr 14 – May 13 (pre-drop) vs May 14 – Jun 12
 * (during-drop) device analysis of Ready to Press add-to-cart.
 */
export const RTP_BENCHMARK = {
  // Pre-drop healthy mobile cart-to-view rate — the recovery target.
  mobileCartToView: 0.698,
  // Pre-drop mobile view-to-purchase rate.
  mobileViewToPurchase: 0.219,
  // Depressed mobile cart-to-view level just before the 2026-06-13 redesign.
  dropLowMobileCartToView: 0.532,
  // Pre-drop desktop cart-to-view (context; desktop was unaffected).
  desktopCartToView: 0.654,
  // Target to declare full recovery.
  target: 0.7,
  redesignDate: '2026-06-13',
};

export interface DeviceStats {
  device: string;
  viewed: number;
  added: number;
  purchased: number;
  cartToView: number; // added / viewed
  viewToPurchase: number; // purchased / viewed
}

export interface ReadyToPressReport {
  subject: string;
  html: string;
  text: string;
  data: {
    rangeFrom: string;
    rangeTo: string;
    devices: Record<string, DeviceStats>;
    mobileCartToView: number;
    recoveryPct: number; // 0..1 of the way from the low back to benchmark
    status: 'recovered' | 'recovering' | 'flat';
  };
}

function daysAgo(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function aggregateReadyToPress(rows: GA4Row[]): Record<string, DeviceStats> {
  const byDevice: Record<string, DeviceStats> = {};

  for (const row of rows) {
    if (String(row.item_category) !== READY_TO_PRESS_CATEGORY) continue;

    const device = String(row.devicecategory || 'unknown');
    if (!byDevice[device]) {
      byDevice[device] = {
        device,
        viewed: 0,
        added: 0,
        purchased: 0,
        cartToView: 0,
        viewToPurchase: 0,
      };
    }

    byDevice[device].viewed += num(row.items_viewed);
    byDevice[device].added += num(row.items_added_to_cart);
    byDevice[device].purchased += num(row.items_purchased);
  }

  for (const stats of Object.values(byDevice)) {
    stats.cartToView = stats.viewed > 0 ? stats.added / stats.viewed : 0;
    stats.viewToPurchase = stats.viewed > 0 ? stats.purchased / stats.viewed : 0;
  }

  return byDevice;
}

export async function buildReadyToPressReport(
  referenceDate: Date = new Date()
): Promise<ReadyToPressReport> {
  // Last 7 full days (ending yesterday).
  const to = daysAgo(referenceDate, 1);
  const from = daysAgo(referenceDate, 7);
  const rangeFrom = fmtDate(from);
  const rangeTo = fmtDate(to);

  const rows = await fetchGA4({
    fields: [
      'item_category',
      'devicecategory',
      'items_viewed',
      'items_added_to_cart',
      'items_purchased',
    ],
    dateFrom: rangeFrom,
    dateTo: rangeTo,
  });

  const devices = aggregateReadyToPress(rows);
  const mobile = devices['mobile'];
  const mobileCartToView = mobile?.cartToView ?? 0;

  const { dropLowMobileCartToView: low, mobileCartToView: benchmark } =
    RTP_BENCHMARK;
  const recoveryPct =
    benchmark > low
      ? Math.max(0, (mobileCartToView - low) / (benchmark - low))
      : 0;

  let status: ReadyToPressReport['data']['status'];
  let statusLabel: string;
  if (mobileCartToView >= RTP_BENCHMARK.target) {
    status = 'recovered';
    statusLabel = '✅ Recovered to the pre-drop benchmark';
  } else if (mobileCartToView > low) {
    status = 'recovering';
    statusLabel = `🟡 Recovering — ${pct(recoveryPct)} of the way from the pre-fix low back to benchmark`;
  } else {
    status = 'flat';
    statusLabel = '🔴 Still at or below the pre-fix low';
  }

  const deviceOrder = ['mobile', 'desktop', 'tablet'];
  const orderedDevices = deviceOrder
    .filter((d) => devices[d])
    .map((d) => devices[d]);

  const subject = `Ready to Press — Mobile Add-to-Cart: ${pct(mobileCartToView)} (${rangeFrom} → ${rangeTo})`;

  // ---- HTML ----
  const rowsHtml = orderedDevices
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${d.device}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:${d.device === 'mobile' ? 700 : 400};">${pct(d.cartToView)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${pct(d.viewToPurchase)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${d.viewed.toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${d.added.toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${d.purchased.toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;">
    <h2 style="color:#366494;margin-bottom:4px;">Ready to Press — Weekly Mobile Add-to-Cart Recovery</h2>
    <p style="color:#666;margin-top:0;">${rangeFrom} → ${rangeTo} · Collection: individual DTF Transfers (item_category = "DTF Transfer")</p>

    <div style="background:#f5f8fc;border:1px solid #dbe6f2;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-size:18px;">
        <strong>Mobile cart-to-view: ${pct(mobileCartToView)}</strong>
      </p>
      <p style="margin:6px 0 0;font-size:15px;">${statusLabel}</p>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">
        Benchmark (pre-drop target): ${pct(RTP_BENCHMARK.mobileCartToView)} ·
        Pre-fix low: ${pct(RTP_BENCHMARK.dropLowMobileCartToView)} ·
        Redesign shipped: ${RTP_BENCHMARK.redesignDate}
      </p>
    </div>

    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#366494;color:#fff;">
          <th style="padding:8px 12px;text-align:left;">Device</th>
          <th style="padding:8px 12px;text-align:right;">Cart-to-view</th>
          <th style="padding:8px 12px;text-align:right;">View→purchase</th>
          <th style="padding:8px 12px;text-align:right;">Viewed</th>
          <th style="padding:8px 12px;text-align:right;">Added</th>
          <th style="padding:8px 12px;text-align:right;">Purchased</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <p style="color:#888;font-size:12px;margin-top:20px;">
      Cart-to-view = items added to cart ÷ items viewed (item-level, the only way to isolate a
      collection in GA4 for this store). Source: GA4 via Windsor.ai. Automated weekly report.
    </p>
  </div>`;

  // ---- Plain text ----
  const textRows = orderedDevices
    .map(
      (d) =>
        `  ${d.device.padEnd(8)}  cart-to-view ${pct(d.cartToView).padStart(6)}  |  view→purchase ${pct(d.viewToPurchase).padStart(6)}  |  viewed ${d.viewed}  added ${d.added}  purchased ${d.purchased}`
    )
    .join('\n');

  const text = [
    `Ready to Press — Weekly Mobile Add-to-Cart Recovery`,
    `${rangeFrom} -> ${rangeTo} (item_category = "DTF Transfer")`,
    ``,
    `Mobile cart-to-view: ${pct(mobileCartToView)}`,
    statusLabel.replace(/[✅🟡🔴]/g, '').trim(),
    `Benchmark target: ${pct(RTP_BENCHMARK.mobileCartToView)} | Pre-fix low: ${pct(RTP_BENCHMARK.dropLowMobileCartToView)} | Redesign: ${RTP_BENCHMARK.redesignDate}`,
    ``,
    `By device:`,
    textRows,
    ``,
    `Cart-to-view = items added to cart / items viewed (item-level). Source: GA4 via Windsor.ai.`,
  ].join('\n');

  return {
    subject,
    html,
    text,
    data: {
      rangeFrom,
      rangeTo,
      devices,
      mobileCartToView,
      recoveryPct,
      status,
    },
  };
}
