import { Shirt, Flame, Package, Scissors, Store } from 'lucide-react';
import styles from './TrustStrip.module.css';

const SHOPS = [
  { icon: Shirt, name: 'PressLab' },
  { icon: Flame, name: 'Heat & Co' },
  { icon: Package, name: 'InkDrop Tees' },
  { icon: Scissors, name: 'CutSew Studio' },
  { icon: Store, name: 'Mainline Apparel' },
];

export function TrustStrip() {
  return (
    <section className={styles.logos}>
      <div className="wrap">
        <p className={styles.logos__label}>
          Trusted by DTF transfer creators &amp; small apparel shops
        </p>
        <div className={styles.logos__row}>
          {SHOPS.map(({ icon: Icon, name }) => (
            <span key={name}>
              <Icon size={17} aria-hidden="true" /> {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
