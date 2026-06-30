import { Route, Compass, BadgeCheck, Coins } from 'lucide-react';
import styles from './WhyDtfEditor.module.css';

const CARDS = [
  {
    icon: Route,
    title: 'DTF-first workflow',
    body: 'Every tool is framed around preparing artwork for transfers — not vague photo edits.',
  },
  {
    icon: Compass,
    title: 'Beginner-friendly guidance',
    body: "Clear next steps for users who aren't designers. We tell you what to fix and why.",
  },
  {
    icon: BadgeCheck,
    title: 'Quality confidence',
    body: 'Check DPI and file quality before printing so you never guess at the press.',
  },
  {
    icon: Coins,
    title: 'Simple credit system',
    body: 'Start free, then upgrade only when you need more processing. No surprises.',
  },
];

export function WhyDtfEditor() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head section-head--center">
          <h2 className="h-sec">Built for DTF creators, not generic photo editing</h2>
          <p className="sub">
            Every tool is framed around one outcome: artwork that presses cleanly
            onto a shirt.
          </p>
        </div>
        <div className={styles.why__grid}>
          {CARDS.map(({ icon: Icon, title, body }) => (
            <div key={title} className={styles.wcard}>
              <div className={styles.wcard__ic}>
                <Icon size={19} aria-hidden="true" />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
