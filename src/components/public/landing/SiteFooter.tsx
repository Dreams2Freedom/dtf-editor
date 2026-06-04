import styles from './SiteFooter.module.css';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Tools', href: '#tools' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'DPI Checker', href: '#dpi' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Refunds', href: '/terms' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={styles.foot}>
      <div className={`wrap ${styles.foot__inner}`}>
        <div className={styles.foot__top}>
          <div className={styles.foot__brand}>
            <a className="brand" href="#top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/dtf-editor-logo.png" alt="DTF Editor" className="brand__logo" />
            </a>
            <p>
              AI artwork prep built specifically for DTF transfer creators,
              hobbyists, and small apparel businesses.
            </p>
          </div>
          <div className={styles.foot__cols}>
            {COLUMNS.map(col => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map(link => (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.foot__bottom}>
          <span>© 2026 DTF Editor. All rights reserved.</span>
          <span>Built for Direct-to-Film transfer creators.</span>
        </div>
      </div>
    </footer>
  );
}
