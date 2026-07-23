import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  Lightbulb,
  CreditCard,
  ArrowRight,
  LifeBuoy,
  MessageCircle,
  LayoutDashboard,
  Wand2,
} from 'lucide-react';
import {
  TOOL_MANUAL_SECTIONS,
  TOC_ITEMS,
  QUICK_NAV_CHIPS,
  QUICK_START_STEPS,
  WORKFLOW_STEPS,
  CREDIT_ROWS,
  GENERAL_TROUBLESHOOTING,
  type ManualToolSection,
} from '@/config/toolManualContent';

const PAGE_SUBTITLE =
  'Learn how to prep artwork, remove backgrounds, upscale images, check DPI, change colors, and create cleaner files before you print.';

/** Small uppercase blue section label. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
      {children}
    </p>
  );
}

/** White content card matching the design system. */
function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  // scroll-mt clears the sticky app header when jumping to an anchor.
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

function Hero() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <SectionLabel>Owner&rsquo;s Manual</SectionLabel>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          DTF Editor Owner&rsquo;s Manual
        </h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600 sm:text-lg">
          {PAGE_SUBTITLE}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Need help? Visit the{' '}
          <Link
            href="/faq"
            className="font-medium text-primary-600 underline-offset-2 hover:underline"
          >
            Help Center
          </Link>{' '}
          or{' '}
          <Link
            href="/contact"
            className="font-medium text-primary-600 underline-offset-2 hover:underline"
          >
            contact support
          </Link>
          .
        </p>

        {/* Pill-style quick navigation */}
        <nav aria-label="Quick navigation" className="mt-6 flex flex-wrap gap-2">
          {QUICK_NAV_CHIPS.map(chip => (
            <a
              key={chip.id}
              href={`#${chip.id}`}
              className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {chip.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function TableOfContents() {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-600">
        On This Page
      </p>
      <ul className="space-y-1">
        {TOC_ITEMS.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileJumpMenu() {
  return (
    <Panel className="lg:hidden">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-600">
        Jump to Section
      </p>
      <div className="flex flex-wrap gap-2">
        {TOC_ITEMS.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {item.label}
          </a>
        ))}
      </div>
    </Panel>
  );
}

function Steps({ steps }: { steps: ManualToolSection['steps'] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white"
          >
            {i + 1}
          </span>
          <div>
            <p className="font-semibold text-gray-900">{step.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TroubleshootingItem({
  issue,
  solution,
}: {
  issue: string;
  solution: string;
}) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden">
        <span>{issue}</span>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <p className="border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-600">
        {solution}
      </p>
    </details>
  );
}

function ToolImageCard({ section }: { section: ManualToolSection }) {
  const isPortrait = section.orientation === 'portrait';
  return (
    <figure className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
      <Image
        src={section.image}
        alt={section.imageAlt}
        width={section.imageWidth}
        height={section.imageHeight}
        sizes={
          isPortrait
            ? '(max-width: 768px) 100vw, 460px'
            : '(max-width: 1024px) 100vw, 760px'
        }
        className={
          isPortrait
            ? 'mx-auto h-auto w-full max-w-[460px] rounded-lg border border-gray-200 bg-white'
            : 'h-auto w-full rounded-lg border border-gray-200 bg-white'
        }
      />
      <figcaption className="sr-only">{section.imageAlt}</figcaption>
    </figure>
  );
}

function ToolSection({ section }: { section: ManualToolSection }) {
  return (
    <Section id={section.id}>
      <Panel>
        <SectionLabel>Tool Guide</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          {section.title}
        </h2>
        <p className="mt-1 text-gray-600">{section.subtitle}</p>

        <div className="mt-6">
          <ToolImageCard section={section} />
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Overview
        </h3>
        <p className="mt-2 leading-relaxed text-gray-700">{section.overview}</p>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Step by step
        </h3>
        <div className="mt-3">
          <Steps steps={section.steps} />
        </div>

        {section.settings && (
          <>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {section.settings.title}
            </h3>
            <dl className="mt-3 space-y-3">
              {section.settings.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <dt className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-600">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {section.bulk && (
          <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm leading-relaxed text-gray-700">
            <span className="font-semibold text-primary-700">Bulk mode: </span>
            {section.bulk}
          </div>
        )}

        {/* Tips — orange accent, used sparingly */}
        <div className="mt-6 rounded-xl border border-accent-200 bg-accent-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-700">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            Tips
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
            {section.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Credit cost */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <CreditCard
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Credit cost: </span>
            {section.creditCost}
          </p>
        </div>

        {/* Troubleshooting */}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Troubleshooting
        </h3>
        <div className="mt-3 space-y-2">
          {section.troubleshooting.map((t, i) => (
            <TroubleshootingItem key={i} issue={t.issue} solution={t.solution} />
          ))}
        </div>
      </Panel>
    </Section>
  );
}

function QuickStartSection() {
  return (
    <Section id="quick-start">
      <Panel>
        <SectionLabel>Quick Start</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Before You Start
        </h2>
        <p className="mt-3 leading-relaxed text-gray-700">
          DTF Editor helps you clean up artwork before printing using a set of
          focused tools for image prep. Each tool is designed to fix a different
          artwork problem, and you can move from one tool to another when
          supported — so you do not have to restart from scratch.
        </p>

        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="text-sm font-semibold text-primary-700">
            The basic flow
          </p>
          <ol className="mt-3 space-y-2">
            {QUICK_START_STEPS.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white"
                >
                  {i + 1}
                </span>
                <span className="text-sm text-gray-800">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Panel>
    </Section>
  );
}

function WorkflowSection() {
  return (
    <Section id="workflow">
      <Panel>
        <SectionLabel>Recommended Workflow</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Suggested DTF Prep Workflow
        </h2>
        <p className="mt-2 text-gray-600">
          A reliable order for prepping most artwork. Each tool can hand its
          result to the next.
        </p>

        <ol className="mt-6 space-y-4">
          {WORKFLOW_STEPS.map(step => (
            <li
              key={step.step}
              className="flex gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white"
              >
                {step.step}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{step.body}</p>
                <a
                  href={`#${step.anchor}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 underline-offset-2 hover:underline"
                >
                  Read the {step.title} guide
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </Section>
  );
}

function CreditsSection() {
  return (
    <Section id="credits">
      <Panel>
        <SectionLabel>Credits</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Credit Costs
        </h2>
        <p className="mt-2 text-gray-600">
          What each tool costs to run. This section is informational only.
        </p>

        <ul className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {CREDIT_ROWS.map(row => (
            <li
              key={row.anchor}
              className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <a
                href={`#${row.anchor}`}
                className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
              >
                {row.tool}
              </a>
              <span className="text-sm text-gray-600 sm:text-right">
                {row.cost}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm leading-relaxed text-gray-700">
          <span className="font-semibold text-accent-700">Note: </span>
          Credit availability depends on your current plan, your monthly
          credits, and any Pay As You Go credits.
        </div>
      </Panel>
    </Section>
  );
}

function TroubleshootingSection() {
  return (
    <Section id="troubleshooting">
      <Panel>
        <SectionLabel>Troubleshooting</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Common Issues and Fixes
        </h2>

        <div className="mt-6 space-y-6">
          {TOOL_MANUAL_SECTIONS.map(section => (
            <div key={section.id}>
              <h3 className="text-sm font-semibold text-gray-900">
                {section.title}
              </h3>
              <div className="mt-2 space-y-2">
                {section.troubleshooting.map((t, i) => (
                  <TroubleshootingItem
                    key={i}
                    issue={t.issue}
                    solution={t.solution}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-primary-200 bg-primary-50 p-5">
          <p className="text-sm font-semibold text-primary-700">
            General guidance
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
            {GENERAL_TROUBLESHOOTING.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </Panel>
    </Section>
  );
}

function NeedMoreHelpSection() {
  const links = [
    {
      href: '/faq',
      label: 'FAQ',
      description: 'Browse frequently asked questions.',
      icon: LifeBuoy,
    },
    {
      href: '/contact',
      label: 'Contact Support',
      description: 'Reach our team for help.',
      icon: MessageCircle,
    },
    {
      href: '/dashboard',
      label: 'Back to Dashboard',
      description: 'Return to your workspace.',
      icon: LayoutDashboard,
    },
    {
      href: '/process',
      label: 'Tools',
      description: 'Jump into the editing tools.',
      icon: Wand2,
    },
  ];
  return (
    <Section id="need-more-help">
      <Panel>
        <SectionLabel>Support</SectionLabel>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          Need More Help?
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {links.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Icon
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-semibold text-gray-900">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-600">
                    {link.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </Section>
  );
}

export function OwnerManual() {
  return (
    <div className="min-h-screen bg-primary-50">
      <Hero />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Sticky desktop table of contents */}
          <aside className="hidden lg:block">
            <TableOfContents />
          </aside>

          {/* Manual content */}
          <main className="min-w-0 space-y-8">
            <MobileJumpMenu />
            <QuickStartSection />
            <WorkflowSection />
            {TOOL_MANUAL_SECTIONS.map(section => (
              <ToolSection key={section.id} section={section} />
            ))}
            <CreditsSection />
            <TroubleshootingSection />
            <NeedMoreHelpSection />
          </main>
        </div>
      </div>
    </div>
  );
}
