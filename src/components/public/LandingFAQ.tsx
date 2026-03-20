import { Accordion } from './Accordion';
import { LANDING_FAQS } from '@/lib/publicData';

export function LandingFAQ() {
  return (
    <section id="faq" className="py-16 lg:py-24 bg-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 lg:px-8">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <Accordion items={LANDING_FAQS} />
      </div>
    </section>
  );
}
