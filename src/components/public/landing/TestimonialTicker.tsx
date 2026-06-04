import { Quote, Star } from 'lucide-react';
import styles from './TestimonialTicker.module.css';

// TODO: Replace this placeholder testimonial with an approved real customer testimonial before production.
// TODO: Slider/ticker version is intentionally saved for a later version.
//
// The data is kept as a single editable object so a future slider/ticker can
// promote it into an array without restructuring this file.
const testimonial = {
  quote:
    'DTF Editor makes it easier to clean up customer artwork before sending it to print.',
  name: 'Placeholder Customer',
  context: 'Print shop owner',
  rating: 5,
};

export function TestimonialTicker() {
  // Single static featured testimonial — no slider/ticker animation.
  const t = testimonial;

  return (
    <section className={styles.strip} aria-label="Customer proof">
      <div className="wrap">
        <p className={styles.label}>Customer proof</p>

        <figure className={styles.card}>
          <span className={styles.card__eyebrow}>
            <Quote className={styles.card__eyebrowIcon} size={13} aria-hidden="true" />
            Customer proof
          </span>

          <div
            className={styles.card__stars}
            role="img"
            aria-label={`${t.rating} out of 5 stars`}
          >
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star
                key={i}
                className={styles.card__star}
                size={20}
                aria-hidden="true"
              />
            ))}
          </div>

          <blockquote className={styles.card__quote}>
            <Quote className={styles.card__quoteMark} size={36} aria-hidden="true" />
            {t.quote}
          </blockquote>

          <figcaption className={styles.card__who}>
            <span className={styles.card__name}>{t.name}</span>
            <span className={styles.card__ctx}>{t.context}</span>
          </figcaption>

          {/* Visible reminder while content is unapproved; remove with the real review. */}
          <p className={styles.card__note}>
            Placeholder testimonial — replace with approved customer review
            before production.
          </p>
        </figure>
      </div>
    </section>
  );
}
