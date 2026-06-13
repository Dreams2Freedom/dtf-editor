import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us — DTF Editor',
  description:
    'Get in touch with the DTF Editor team. Questions about plans, credits, or preparing print-ready DTF transfers? We are happy to help.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
