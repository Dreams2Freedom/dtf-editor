/**
 * Hamilton support-bot knowledge base.
 *
 * Assembles our own help content — the curated FAQs + the Owner's Manual tool
 * sections — into one plain-text block that grounds the assistant. Hamilton is
 * instructed to answer ONLY from this; anything not covered here routes the
 * user to a support ticket. Keeping this derived from the SAME source modules
 * the FAQ page and Owner's Manual render means the bot never drifts from what
 * users see on the site.
 */
import { HAMILTON_FAQS } from '@/components/notifications/hamiltonFaqs';
import { TOOL_MANUAL_SECTIONS } from '@/config/toolManualContent';

let cached: string | null = null;

export function buildHamiltonKnowledgeBase(): string {
  if (cached) return cached;

  const parts: string[] = [];

  parts.push('# DTF Editor — FAQ');
  for (const f of HAMILTON_FAQS) {
    parts.push(`Q: ${f.q}\nA: ${f.a}`);
  }

  parts.push('\n# DTF Editor — Owner’s Manual (tools)');
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
