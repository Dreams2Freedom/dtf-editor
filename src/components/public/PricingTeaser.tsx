import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS } from '@/lib/publicData';

export function PricingTeaser() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-2">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-gray-500 text-center mb-10">
          Start free. Upgrade when you need more.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.slug}
              className={`bg-white border rounded-xl p-6 ${
                plan.highlighted
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlighted && plan.badge && (
                <span className="bg-amber-100 text-amber-700 rounded-full text-xs font-semibold px-2.5 py-0.5 inline-block mb-3">
                  {plan.badge}
                </span>
              )}
              <p className="text-lg font-semibold text-gray-900">{plan.name}</p>
              <div className="mt-1">
                <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.period}</span>
              </div>
              <ul className="space-y-2 mt-4 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/auth/signup?plan=${plan.slug}`}
                className={`block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                {plan.ctaText}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            See full pricing details →
          </Link>
        </div>
      </div>
    </section>
  );
}
