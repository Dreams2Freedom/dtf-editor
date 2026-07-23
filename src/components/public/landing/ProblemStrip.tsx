import { ImageOff, Eraser, Gauge } from 'lucide-react';
import styles from './ProblemStrip.module.css';

const PROBLEMS = [
  {
    icon: ImageOff,
    mod: styles['pcard--a'],
    title: 'Blurry artwork',
    body: 'Upscale low-resolution images so they look cleaner and sharper before printing.',
  },
  {
    icon: Eraser,
    mod: styles['pcard--b'],
    title: 'Messy backgrounds',
    body: 'Remove backgrounds and export transparent PNG files ready for transfer.',
  },
  {
    icon: Gauge,
    mod: styles['pcard--c'],
    title: 'Unknown print quality',
    body: 'Check DPI before ordering so you know exactly what to expect on the shirt.',
  },
];

export function ProblemStrip() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head section-head--center">
          <h2 className="h-sec">Artwork problems shouldn&apos;t ruin your transfers</h2>
          <p className="sub">
            Most failed prints come down to three fixable issues. DTF Editor
            catches them before you press.
          </p>
        </div>
        <div className={styles.problems__grid}>
          {PROBLEMS.map(({ icon: Icon, mod, title, body }) => (
            <div key={title} className={`${styles.pcard} ${mod}`}>
              <div className={styles.pcard__ic}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
