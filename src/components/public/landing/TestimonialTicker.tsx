import { Quote, Star } from 'lucide-react';
import styles from './TestimonialTicker.module.css';

// Single featured customer testimonial. Update the fields below to change it.
// A slider/ticker version is intentionally deferred to a later iteration.
const testimonial = {
  quote:
    'One of our biggest frustrations when it comes to running a print shop is bad artwork. However, we understand that everyone is not a graphic designer. DTF Editor is so easy to use we are able to send our customers to DTF Editor to have them fix their own artwork. It has saved us countless hours and we just can’t say enough good things about this tool.',
  name: 'Tami N.',
  context: 'Print Shop Manager',
  rating: 5,
};

export function TestimonialTicker() {
  // Single static featured testimonial — no slider/ticker animation.
  const t = testimonial;

  return (
    <section className={styles.strip} aria-label="Customer testimonial">
      <div className="wrap">
        <figure className={styles.card}>
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
        </figure>
      </div>
    </section>
  );
}
