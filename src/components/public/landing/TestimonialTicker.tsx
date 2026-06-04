import { Quote } from 'lucide-react';
import styles from './TestimonialTicker.module.css';

// TODO: Replace this placeholder testimonial with an approved real customer testimonial before production.
// TODO: Save testimonial slider/ticker functionality for a later version.
//
// The data is kept as an array (rendering only the first entry for now) so a
// future slider/ticker can iterate over it without restructuring this file.
const testimonials = [
  {
    quote:
      'DTF Editor makes it easier to clean up customer artwork before sending it to print.',
    name: 'Placeholder Customer',
    context: 'Print shop owner',
  },
];

export function TestimonialTicker() {
  // Single static testimonial for now — no slider/ticker animation.
  const t = testimonials[0];

  return (
    <section className={styles.strip} aria-label="Customer testimonial">
      <div className="wrap">
        <p className={styles.label}>
          Loved by creators, hobbyists, and print shops
        </p>

        <figure className={styles.card}>
          <Quote className={styles.card__icon} size={18} aria-hidden="true" />
          <blockquote className={styles.card__quote}>{t.quote}</blockquote>
          <figcaption className={styles.card__who}>
            <span className={styles.card__name}>{t.name}</span>
            <span className={styles.card__ctx}>{t.context}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
