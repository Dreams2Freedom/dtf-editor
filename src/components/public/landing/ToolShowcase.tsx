import {
  Scaling,
  Scissors,
  Spline,
  WandSparkles,
  Gauge,
  ListChecks,
  ArrowRight,
  ArrowUp,
  Sparkles,
  Check,
  Download,
} from 'lucide-react';
import styles from './ToolShowcase.module.css';

/** Reusable mountain-badge emblem mock. */
function Emblem({
  stroke = '#0f1b3d',
  pathFill = '#0f1b3d',
  className,
  style,
}: {
  stroke?: string;
  pathFill?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg className={className} viewBox="0 0 100 100" style={style} aria-hidden="true">
      <circle cx="50" cy="50" r="42" stroke={stroke} strokeWidth="3" fill="none" />
      <path d="M26 62 L42 42 L54 56 L62 46 L74 62 Z" fill={pathFill} />
      <circle cx="62" cy="36" r="6" fill="#d7870a" />
    </svg>
  );
}

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
          {/* Upscaling */}
          <article className={styles.tool}>
            <div className={styles.tool__preview}>
              <div className={`${styles.pv} ${styles['pv-split']}`}>
                <div className={styles.left}>
                  <span className={`${styles['pv-tag']} ${styles.l}`}>Before</span>
                  <Emblem className={styles.emblem} style={{ filter: 'blur(2px) contrast(.9)' }} />
                </div>
                <div className={styles.right}>
                  <span className={`${styles['pv-tag']} ${styles.r}`}>After</span>
                  <Emblem className={styles.emblem} />
                </div>
                <div className={styles.divider} />
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic}>
                    <Scaling size={17} aria-hidden="true" />
                  </span>{' '}
                  Image Upscaling
                </div>
                <span className="badge badge--credit">1 credit</span>
              </div>
              <p className={styles.tool__desc}>
                Make blurry or low-resolution artwork cleaner and sharper before
                printing.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#pricing">
                  Start plan to upscale <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>

          {/* Background Removal */}
          <article className={styles.tool}>
            <div className={styles.tool__preview}>
              <div className={`${styles.pv} ${styles['pv-split']}`}>
                <div className={styles.left}>
                  <span className={`${styles['pv-tag']} ${styles.l}`}>Before</span>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(120% 90% at 30% 20%,#6f8bd6,#243a78)',
                    }}
                  />
                  <Emblem stroke="#fff" pathFill="#fff" className={styles.emblem} style={{ position: 'relative' }} />
                </div>
                <div className={`${styles.right} ${styles['pv-checker']}`}>
                  <span className={`${styles['pv-tag']} ${styles.r}`}>After</span>
                  <Emblem className={styles.emblem} style={{ position: 'relative' }} />
                </div>
                <div className={styles.divider} />
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic}>
                    <Scissors size={17} aria-hidden="true" />
                  </span>{' '}
                  Background Removal
                </div>
                <span className="badge badge--credit">1 credit</span>
              </div>
              <p className={styles.tool__desc}>
                Remove unwanted backgrounds and create transparent PNG artwork
                for transfers.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#pricing">
                  Start plan to remove backgrounds <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>

          {/* Vectorization */}
          <article className={styles.tool}>
            <div className={styles.tool__preview}>
              <div className={`${styles.pv} ${styles['pv-split']}`}>
                <div className={styles.left}>
                  <span className={`${styles['pv-tag']} ${styles.l}`}>Raster</span>
                  <svg className={styles.emblem} viewBox="0 0 100 100" aria-hidden="true">
                    <g style={{ filter: 'blur(.6px)' }}>
                      <circle cx="50" cy="50" r="40" stroke="#0f1b3d" strokeWidth="4" fill="none" />
                      <path d="M30 60 L44 44 L54 55 L70 60 Z" fill="#1f3b86" />
                    </g>
                  </svg>
                </div>
                <div className={styles.right}>
                  <span className={`${styles['pv-tag']} ${styles.r}`}>Vector</span>
                  <svg className={styles.emblem} viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="40" stroke="#0f1b3d" strokeWidth="3" fill="none" />
                    <path d="M30 60 L44 44 L54 55 L70 60 Z" fill="#1f3b86" />
                    <circle cx="44" cy="44" r="2.4" fill="#d7870a" />
                    <circle cx="54" cy="55" r="2.4" fill="#d7870a" />
                    <circle cx="70" cy="60" r="2.4" fill="#d7870a" />
                    <circle cx="30" cy="60" r="2.4" fill="#d7870a" />
                  </svg>
                </div>
                <div className={styles.divider} />
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic}>
                    <Spline size={17} aria-hidden="true" />
                  </span>{' '}
                  Vectorization
                </div>
                <span className="badge badge--credit">1 credit</span>
              </div>
              <p className={styles.tool__desc}>
                Convert logos and graphics into cleaner, scalable artwork with
                smooth edges.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#pricing">
                  Start plan to vectorize <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>

          {/* AI Generation */}
          <article className={styles.tool}>
            <div
              className={styles.tool__preview}
              style={{ background: 'linear-gradient(135deg,#eef1f6,#e4eaf6)' }}
            >
              <div className={styles.pv} style={{ display: 'grid', placeItems: 'center' }}>
                <svg className={styles.emblem} viewBox="0 0 100 100" style={{ width: '52%' }} aria-hidden="true">
                  <rect x="18" y="22" width="64" height="56" rx="6" fill="#fff" stroke="#0f1b3d" strokeWidth="2.5" />
                  <circle cx="50" cy="44" r="11" fill="#d7870a" />
                  <path d="M30 70 L44 54 L54 63 L62 56 L72 70 Z" fill="#1f3b86" />
                </svg>
              </div>
              <div className={styles['pv-prompt']}>
                <Sparkles size={15} aria-hidden="true" style={{ color: 'var(--blue)' }} />
                <span className={styles.txt}>retro mountain badge for a tee</span>
                <span className={styles.go}>
                  <ArrowUp size={13} aria-hidden="true" />
                </span>
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic}>
                    <WandSparkles size={17} aria-hidden="true" />
                  </span>{' '}
                  AI Image Generation
                </div>
                <span className="badge badge--paid">Paid plans</span>
              </div>
              <p className={styles.tool__desc}>
                Create new shirt-ready artwork ideas from simple text prompts.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#pricing">
                  Start plan to generate <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>

          {/* Free DPI Checker */}
          <article className={styles.tool}>
            <div className={`${styles.tool__preview} ${styles['pv-dpi']}`}>
              <div className={styles.pv} style={{ display: 'grid', placeItems: 'center', padding: 14 }}>
                <div className={styles.card}>
                  <div className={styles.num}>
                    285 <small>DPI</small>
                  </div>
                  <span className={styles.ok}>
                    <Check size={12} aria-hidden="true" /> Good for DTF
                  </span>
                  <div className={styles.bars}>
                    <i className={styles.on} />
                    <i className={styles.on} />
                    <i className={styles.on} />
                    <i className={styles.on} />
                    <i />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic} style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                    <Gauge size={17} aria-hidden="true" />
                  </span>{' '}
                  Free DPI Checker
                </div>
                <span className="badge badge--free">Always free</span>
              </div>
              <p className={styles.tool__desc}>
                Check whether your image will print crisp or pixelated at your
                chosen size.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#dpi" style={{ color: 'var(--green)' }}>
                  Check DPI free <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>

          {/* Print-ready workflow */}
          <article className={styles.tool}>
            <div className={styles.tool__preview} style={{ background: 'var(--blue-tint)' }}>
              <div className={styles.pv} style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
                <div className={styles.workflow}>
                  <div className={styles.workflow__row}>
                    <Check size={14} aria-hidden="true" style={{ color: 'var(--green)' }} /> Upload artwork
                  </div>
                  <div className={styles.workflow__row}>
                    <Check size={14} aria-hidden="true" style={{ color: 'var(--green)' }} /> Fix &amp; clean up
                  </div>
                  <div className={styles.workflow__row}>
                    <Check size={14} aria-hidden="true" style={{ color: 'var(--green)' }} /> Check DPI
                  </div>
                  <div className={`${styles.workflow__row} ${styles['workflow__row--active']}`}>
                    <Download size={14} aria-hidden="true" /> Download print-ready
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.tool__body}>
              <div className={styles.tool__top}>
                <div className={styles.tool__name}>
                  <span className={styles.ic}>
                    <ListChecks size={17} aria-hidden="true" />
                  </span>{' '}
                  Print-Ready Workflow
                </div>
                <span className="badge badge--neutral">Guided</span>
              </div>
              <p className={styles.tool__desc}>
                Upload, fix, check, and download cleaner artwork in one guided
                process.
              </p>
              <div className={styles.tool__foot}>
                <a className="btn btn--link" href="#pricing">
                  See how it works <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
