import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — DTF Editor',
  description:
    'Answers to common questions about DTF Editor: credits, plans, AI upscaling, background removal, vectorization, file formats, and print-ready DTF transfers.',
  alternates: { canonical: '/faq' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
