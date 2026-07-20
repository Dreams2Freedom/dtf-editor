/**
 * Hamilton support-bot knowledge base.
 *
 * This is Hamilton's single source of truth. It is assembled from the SAME
 * modules that power the live site — pricing/plans (publicData), the trial
 * rules (lib/trial), the curated FAQs, and the Owner's Manual tool sections —
 * plus an authoritative, hand-written overview of what DTF Editor is and how
 * credits work. Because the pricing/plan/credit facts are imported (not
 * re-typed), Hamilton can never quote a price or credit count that disagrees
 * with what the user sees on the pricing page.
 *
 * Hamilton is instructed to answer ONLY from this block; anything not covered
 * routes the user to a support ticket.
 */
import { HAMILTON_FAQS } from '@/components/notifications/hamiltonFaqs';
import { TOOL_MANUAL_SECTIONS } from '@/config/toolManualContent';
import {
  PLANS,
  CREDIT_PACKS,
  LANDING_FAQS,
  PRICING_FAQS,
  COMPARISON_FEATURES,
} from '@/lib/publicData';
import { TRIAL_DAYS, TRIAL_PLAN_IDS, TRIAL_DISCLOSURE } from '@/lib/trial';

let cached: string | null = null;

/**
 * Per-operation credit costs. Mirrors getOperationCost() in
 * src/services/imageProcessing.ts — keep in sync if that changes.
 */
const CREDIT_COSTS: Array<{ tool: string; cost: string }> = [
  { tool: 'AI Upscaling', cost: '1 credit' },
  { tool: 'Background Removal', cost: '1 credit' },
  { tool: 'Vectorization', cost: '2 credits' },
  { tool: 'AI Image Generation', cost: '3 credits' },
  { tool: 'Color Change / Color Swap', cost: 'free (0 credits)' },
];

function appOverview(): string {
  return [
    '# About DTF Editor',
    'DTF Editor is a mobile-first web app for creating print-ready',
    'Direct-to-Film (DTF) transfers. It gives you AI-powered image tools —',
    'upscaling, background removal, vectorization, color change, and AI image',
    'generation — so you can turn ordinary artwork into clean, 300 DPI,',
    'transparent-background files ready to print, without needing Photoshop or',
    'design skills. It works on phones, tablets, and desktop, and processed',
    'images are saved to your gallery so you can come back to them.',
    '',
    'The "Studio" is the unified editor: you upload one image and can apply',
    'tools in any order, chaining the results, then download when finished',
    '(the finished file is also auto-saved to your gallery).',
  ].join('\n');
}

function creditSystem(): string {
  const lines: string[] = [];
  lines.push('# Credits — how they work');
  lines.push(
    'Credits are what you spend to run the AI tools. Every account starts',
    'with 2 free credits (no credit card required), and free accounts get 2',
    'credits that refresh each month.'
  );
  lines.push('');
  lines.push('What each tool costs:');
  for (const c of CREDIT_COSTS) lines.push(`  - ${c.tool}: ${c.cost}`);
  lines.push('');
  lines.push(
    'There are TWO ways to get more credits, and you can use either or both:'
  );
  lines.push(
    '  1. A monthly subscription (Basic / Starter / Professional) — gives you',
    '     a batch of credits every month at the best per-credit price, plus',
    '     extras like more storage. Subscription credits roll over for up to',
    '     2 months on paid plans.',
    '  2. Pay-as-you-go credit packs — a ONE-TIME purchase of credits that you',
    '     can buy anytime, on any plan (including Free). YES, you can buy',
    '     credits individually / on their own without subscribing. Credit-pack',
    '     credits NEVER expire.'
  );
  lines.push('');
  lines.push('Credit packs available:');
  for (const p of CREDIT_PACKS) {
    const extra = p.badge ? ` (${p.badge})` : '';
    lines.push(
      `  - ${p.credits} credits — ${p.price} (${p.perCredit} per credit)${extra}`
    );
  }
  return lines.join('\n');
}

function plans(): string {
  const lines: string[] = [];
  lines.push('# Plans & pricing (monthly subscriptions)');
  for (const p of PLANS) {
    const badge = p.badge ? ` [${p.badge}]` : '';
    lines.push(`## ${p.name} — ${p.price}${p.period}${badge}`);
    for (const f of p.features) lines.push(`  - ${f}`);
  }
  lines.push('');
  lines.push('You can cancel a subscription anytime from account settings and');
  lines.push('keep access until the end of the billing period.');
  return lines.join('\n');
}

function trial(): string {
  const eligible = TRIAL_PLAN_IDS.map(
    p => p.charAt(0).toUpperCase() + p.slice(1)
  ).join(' and ');
  return [
    '# Free trial',
    `New users can start a ${TRIAL_DAYS}-day free trial. Trials are available`,
    `on the ${eligible} plans, and it's one trial per user, ever (you're`,
    'eligible only while on the Free plan and have never subscribed before).',
    `Disclosure users must see: "${TRIAL_DISCLOSURE}"`,
    'So: a payment method is required to start the trial, and billing begins',
    'after the trial ends unless the user cancels first.',
  ].join('\n');
}

function comparison(): string {
  const lines: string[] = [
    '# Plan comparison (Free / Basic / Starter / Professional)',
  ];
  for (const row of COMPARISON_FEATURES) {
    const fmt = (v: string | boolean) =>
      v === true ? 'Yes' : v === false ? 'No' : String(v);
    lines.push(
      `  - ${row.name}: Free=${fmt(row.free)}, Basic=${fmt(row.basic)}, ` +
        `Starter=${fmt(row.starter)}, Professional=${fmt(row.professional)}`
    );
  }
  return lines.join('\n');
}

function faqBlock(
  title: string,
  items: { question: string; answer: string }[]
): string {
  const lines = [`# ${title}`];
  for (const f of items) lines.push(`Q: ${f.question}\nA: ${f.answer}`);
  return lines.join('\n');
}

export function buildHamiltonKnowledgeBase(): string {
  if (cached) return cached;

  const parts: string[] = [];

  parts.push(appOverview());
  parts.push(creditSystem());
  parts.push(plans());
  parts.push(trial());
  parts.push(comparison());

  // Curated + canonical FAQs.
  parts.push(
    faqBlock(
      'Common questions',
      HAMILTON_FAQS.map(f => ({ question: f.q, answer: f.a }))
    )
  );
  parts.push(faqBlock('General FAQ', LANDING_FAQS));
  parts.push(faqBlock('Pricing & billing FAQ', PRICING_FAQS));

  // Owner's Manual — per-tool how-to.
  parts.push('# DTF Editor — Owner’s Manual (tools)');
  for (const s of TOOL_MANUAL_SECTIONS) {
    const lines: string[] = [];
    lines.push(`## ${s.title}`);
    if (s.subtitle) lines.push(s.subtitle);
    if (s.overview) lines.push(s.overview);
    if (s.creditCost) lines.push(`Credit cost: ${s.creditCost}`);
    if (s.steps?.length) {
      lines.push('How to use:');
      s.steps.forEach((st, i) =>
        lines.push(`  ${i + 1}. ${st.title}: ${st.body}`)
      );
    }
    if (s.settings?.items?.length) {
      lines.push(`${s.settings.title}:`);
      s.settings.items.forEach(it =>
        lines.push(`  - ${it.label}: ${it.description}`)
      );
    }
    if (s.bulk) lines.push(`Bulk mode: ${s.bulk}`);
    if (s.tips?.length) lines.push(`Tips: ${s.tips.join(' ')}`);
    if (s.troubleshooting?.length) {
      lines.push('Troubleshooting:');
      s.troubleshooting.forEach(t =>
        lines.push(`  - Issue: ${t.issue} Fix: ${t.solution}`)
      );
    }
    parts.push(lines.join('\n'));
  }

  cached = parts.join('\n\n');
  return cached;
}
