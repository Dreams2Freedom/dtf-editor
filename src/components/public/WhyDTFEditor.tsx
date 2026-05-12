import { Zap, ShieldCheck, DollarSign } from 'lucide-react';

const cards = [
  {
    icon: Zap,
    iconClass: 'bg-amber-50 text-amber-600',
    heading: 'Done in seconds, not hours',
    description:
      'Stop waiting on designers or fighting with Photoshop. Upload, process, download.',
  },
  {
    icon: ShieldCheck,
    iconClass: 'bg-emerald-50 text-emerald-600',
    heading: 'Print-ready guaranteed',
    description:
      "Every output is 300 DPI with transparent backgrounds. No guessing if it'll print right.",
  },
  {
    icon: DollarSign,
    iconClass: 'bg-blue-50 text-blue-600',
    heading: 'Save thousands vs. a designer',
    description:
      'Plans start free. Process images for a fraction of what a graphic designer charges.',
  },
];

export function WhyDTFEditor() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-10">
          Why DTF Editor
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.heading}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.iconClass}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {card.heading}
                </h3>
                <p className="text-sm text-gray-500">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
