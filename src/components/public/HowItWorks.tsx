import { Upload, Wand2, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: 1,
    heading: 'Upload your image',
    description: 'Drag and drop or click to upload. PNG, JPG, and more.',
  },
  {
    icon: Wand2,
    number: 2,
    heading: 'Pick your tools',
    description: 'Upscale, recolor, remove backgrounds — use one or all.',
  },
  {
    icon: Download,
    number: 3,
    heading: 'Download print-ready files',
    description: '300 DPI transparent PNGs ready for your printer.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center mb-2">
          How it works
        </h2>
        <p className="text-sm text-gray-500 text-center mb-12">
          Three steps from upload to print-ready
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.number}>
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-sm flex items-center justify-center mx-auto md:mx-0 mb-3">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center md:text-left">
                  {step.heading}
                </h3>
                <p className="text-sm text-gray-500 text-center md:text-left">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
