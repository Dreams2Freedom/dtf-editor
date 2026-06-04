import {
  Scaling,
  Scissors,
  Spline,
  WandSparkles,
  Gauge,
  ListChecks,
  ArrowRight,
  ArrowUp,
  ChevronsLeftRight,
  Crosshair,
  UploadCloud,
  Wrench,
  Download,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { MountainBadge, BadgeNodes } from './MountainBadge';
import styles from './ToolShowcase.module.css';

/* ---------- shared bits ---------- */

function Spark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 0 L7 4.6 L12 6 L7 7.4 L6 12 L5 7.4 L0 6 L5 4.6 Z" fill="currentColor" />
    </svg>
  );
}

function Divider() {
  return (
    <div className={styles.divider}>
      <span className={styles.divider__ctrl}>
        <ChevronsLeftRight size={14} aria-hidden="true" />
      </span>
    </div>
  );
}

/* ---------- preview panels ---------- */

function UpscalePreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-split']}`}>
      <div className={`${styles.half} ${styles['half--gray']}`}>
        <span className={`${styles.tag} ${styles['tag--l']}`}>Before</span>
        <MountainBadge className={`${styles.badge} ${styles['badge--blur']}`} />
      </div>
      <div className={styles.half}>
        <span className={`${styles.tag} ${styles['tag--r']}`}>After</span>
        <Spark className={styles['spark--blue']} style={{ top: '16%', right: '12%' }} />
        <MountainBadge className={styles.badge} />
      </div>
      <Divider />
    </div>
  );
}

function BgRemovalPreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-split']}`}>
      <div className={`${styles.half} ${styles['half--blue']}`}>
        <Spark className={styles['spark--white']} style={{ top: '18%', left: '14%' }} />
        <Spark className={styles['spark--white']} style={{ bottom: '20%', left: '22%', opacity: 0.7 }} />
        <MountainBadge transparent className={styles.badge} />
      </div>
      <div className={`${styles.half} ${styles['half--checker']}`}>
        <MountainBadge transparent className={styles.badge} />
      </div>
      <Divider />
    </div>
  );
}

function VectorPreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-split']}`}>
      <div className={`${styles.half} ${styles['half--gray']}`}>
        <span className={`${styles.tag} ${styles['tag--l']}`}>Raster</span>
        <MountainBadge className={`${styles.badge} ${styles['badge--pixel']}`} />
      </div>
      <div className={styles.half}>
        <span className={`${styles.tag} ${styles['tag--r']}`}>Vector</span>
        <MountainBadge className={styles.badge} />
        <BadgeNodes className={`${styles.badge} ${styles.nodes}`} />
      </div>
      <Divider />
    </div>
  );
}

function AiPreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-ai']}`}>
      <span className={styles.dots} aria-hidden="true" />
      <Spark className={styles['spark--blue']} style={{ top: '14%', left: '46%' }} />
      <Spark className={styles['spark--orange']} style={{ bottom: '20%', right: '14%' }} />

      <div className={styles.prompt}>
        <span className={styles.prompt__txt}>
          retro mountain
          <br />
          badge for a tee
        </span>
        <span className={styles.prompt__go}>
          <ArrowUp size={14} aria-hidden="true" />
        </span>
      </div>

      <svg className={styles.flow} viewBox="0 0 100 60" aria-hidden="true" preserveAspectRatio="none">
        <path
          d="M14 40 C40 56 52 40 70 26"
          stroke="#9fb3c8"
          strokeWidth="1.4"
          strokeDasharray="3 3"
          fill="none"
        />
        <path d="M70 26 l-5 1.5 l3 3.5 z" fill="#9fb3c8" />
      </svg>

      <div className={styles.tshirt}>
        <svg viewBox="0 0 100 96" aria-hidden="true">
          <path
            d="M33 8 L42 8 Q50 15 58 8 L67 8 L90 26 L80 40 L72 34 L72 90 L28 90 L28 34 L20 40 L10 26 Z"
            fill="#fff"
            stroke="#d4d4d8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <MountainBadge className={styles.tshirt__badge} />
      </div>
    </div>
  );
}

function DpiPreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-pad']}`}>
      <div className={styles.dpi}>
        <div className={styles.dpi__row}>
          <div className={styles.dpi__num}>
            285 <small>DPI</small>
          </div>
          <span className={styles.dpi__target}>
            <Crosshair size={20} aria-hidden="true" />
          </span>
        </div>
        <span className={styles.dpi__ok}>
          <Check size={13} aria-hidden="true" /> Good for DTF
        </span>
        <div className={styles.dpi__bars}>
          <i className={styles.on} />
          <i className={styles.on} />
          <i className={styles.on} />
          <i className={styles.on} />
          <i />
        </div>
      </div>
    </div>
  );
}

const FLOW_STEPS: Array<{ icon: LucideIcon; label: string; active?: boolean }> = [
  { icon: UploadCloud, label: 'Upload artwork' },
  { icon: Wrench, label: 'Fix & clean up' },
  { icon: Crosshair, label: 'Check DPI' },
  { icon: Download, label: 'Download print-ready', active: true },
];

function WorkflowPreview() {
  return (
    <div className={`${styles.pv} ${styles['pv-pad']}`}>
      <span className={styles.dots} aria-hidden="true" />
      <Spark className={styles['spark--blue']} style={{ top: '16%', right: '10%' }} />
      <Spark className={styles['spark--orange']} style={{ bottom: '24%', right: '16%' }} />
      <div className={styles.flowcard}>
        <ul className={styles.checklist}>
          {FLOW_STEPS.map(({ icon: Icon, label, active }) => (
            <li
              key={label}
              className={`${styles.checklist__item} ${active ? styles['checklist__item--active'] : ''}`}
            >
              <span className={styles.checklist__ic}>
                <Icon size={15} aria-hidden="true" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- card ---------- */

type Card = {
  preview: React.ReactNode;
  icon: LucideIcon;
  iconGreen?: boolean;
  title: string;
  badgeLabel: string;
  badgeClass: string;
  desc: string;
  ctaLabel: string;
  ctaHref: string;
  ctaGreen?: boolean;
};

const CARDS: Card[] = [
  {
    preview: <UpscalePreview />,
    icon: Scaling,
    title: 'Image Upscaling',
    badgeLabel: '1 credit',
    badgeClass: 'badge--credit',
    desc: 'Make blurry or low-resolution artwork cleaner and sharper before printing.',
    ctaLabel: 'Start plan to upscale',
    ctaHref: '#pricing',
  },
  {
    preview: <BgRemovalPreview />,
    icon: Scissors,
    title: 'Background Removal',
    badgeLabel: '1 credit',
    badgeClass: 'badge--credit',
    desc: 'Remove unwanted backgrounds and create transparent PNG artwork for transfers.',
    ctaLabel: 'Start plan to remove backgrounds',
    ctaHref: '#pricing',
  },
  {
    preview: <VectorPreview />,
    icon: Spline,
    title: 'Vectorization',
    badgeLabel: '1 credit',
    badgeClass: 'badge--credit',
    desc: 'Convert logos and graphics into cleaner, scalable artwork with smooth edges.',
    ctaLabel: 'Start plan to vectorize',
    ctaHref: '#pricing',
  },
  {
    preview: <AiPreview />,
    icon: WandSparkles,
    title: 'AI Image Generation',
    badgeLabel: 'Paid plans',
    badgeClass: 'badge--paid',
    desc: 'Create new shirt-ready artwork ideas from simple text prompts.',
    ctaLabel: 'Start plan to generate',
    ctaHref: '#pricing',
  },
  {
    preview: <DpiPreview />,
    icon: Gauge,
    iconGreen: true,
    title: 'Free DPI Checker',
    badgeLabel: 'Always free',
    badgeClass: 'badge--free',
    desc: 'Check whether your image will print crisp or pixelated at your chosen size.',
    ctaLabel: 'Check DPI free',
    ctaHref: '#dpi',
    ctaGreen: true,
  },
  {
    preview: <WorkflowPreview />,
    icon: ListChecks,
    title: 'Print-Ready Workflow',
    badgeLabel: 'Guided',
    badgeClass: 'badge--neutral',
    desc: 'Upload, fix, check, and download cleaner artwork in one guided process.',
    ctaLabel: 'See how it works',
    ctaHref: '#pricing',
  },
];

export function ToolShowcase() {
  return (
    <section className="section section--tint" id="tools">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">The toolkit</span>
          <h2 className="h-sec">Choose the right tool for your artwork</h2>
          <p className="sub">
            Whether your file is blurry, has a background, or needs a quality
            check, DTF Editor guides you to the next best step.
          </p>
        </div>

        <div className={styles.tools__grid}>
          {CARDS.map(card => {
            const Icon = card.icon;
            return (
              <article key={card.title} className={styles.tool}>
                <div className={styles.tool__preview}>{card.preview}</div>
                <div className={styles.tool__body}>
                  <div className={styles.tool__top}>
                    <div className={styles.tool__name}>
                      <span
                        className={`${styles.ic} ${card.iconGreen ? styles['ic--green'] : ''}`}
                      >
                        <Icon size={17} aria-hidden="true" />
                      </span>{' '}
                      {card.title}
                    </div>
                    <span className={`badge ${card.badgeClass}`}>{card.badgeLabel}</span>
                  </div>
                  <p className={styles.tool__desc}>{card.desc}</p>
                  <div className={styles.tool__foot}>
                    <a
                      className={`btn btn--link ${card.ctaGreen ? styles['cta--green'] : ''}`}
                      href={card.ctaHref}
                    >
                      {card.ctaLabel} <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
