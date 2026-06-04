import { Quote } from 'lucide-react';
import styles from './TestimonialTicker.module.css';

// TODO: Replace these placeholder testimonials with approved real customer testimonials before production.
const testimonials = [
  {
    quote:
      'DTF Editor made it easier to clean up customer artwork before sending it to print.',
    name: 'Placeholder Customer',
    context: 'Print shop owner',
  },
  {
    quote:
      'The DPI checker helps me know if a design is ready before I waste time testing it.',
    name: 'Placeholder Customer',
    context: 'Apparel creator',
  },
  {
    quote:
      'I like that the workflow is simple. Upload, choose a tool, and export the file.',
    name: 'Placeholder Customer',
    context: 'Small business owner',
  },
  {
    quote:
      'It saves time when customers send low-quality logos or files with messy backgrounds.',
    name: 'Placeholder Customer',
    context: 'DTF creator',
  },
];

function Card({
  quote,
  name,
  context,
  ariaHidden,
}: {
  quote: string;
  name: string;
  context: string;
  ariaHidden?: boolean;
}) {
  return (
    <figure className={styles.card} aria-hidden={ariaHidden || undefined}>
      <Quote className={styles.card__icon} size={16} aria-hidden="true" />
      <blockquote className={styles.card__quote}>{quote}</blockquote>
      <figcaption className={styles.card__who}>
        <span className={styles.card__name}>{name}</span>
        <span className={styles.card__ctx}>{context}</span>
      </figcaption>
    </figure>
  );
}

export function TestimonialTicker() {
  return (
    <section className={styles.strip} aria-label="Customer testimonials">
      <div className="wrap">
        <p className={styles.label}>
          Loved by creators, hobbyists, and print shops
        </p>
      </div>

      <div className={styles.ticker}>
        {/* The list is rendered twice so the marquee can loop seamlessly.
            The second copy is decorative and hidden from assistive tech. */}
        <div className={styles.ticker__track}>
          {testimonials.map((t, i) => (
            <Card key={`a-${i}`} {...t} />
          ))}
          {testimonials.map((t, i) => (
            <Card key={`b-${i}`} {...t} ariaHidden />
          ))}
        </div>
      </div>
    </section>
  );
}
