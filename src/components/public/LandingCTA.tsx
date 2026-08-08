import Link from 'next/link';

export function LandingCTA() {
  return (
    <section className="bg-gray-900 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-4">
          Ready to stop losing money on bad prints?
        </h2>
        <p className="text-sm lg:text-base text-gray-400 mb-8">
          Start free with 2 credits. No credit card required.
        </p>
        <Link
          href="/auth/signup"
          className="inline-flex items-center px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-base transition-colors shadow-lg shadow-amber-500/20"
        >
          Start Free — 2 Credits Included
        </Link>
      </div>
    </section>
  );
}
