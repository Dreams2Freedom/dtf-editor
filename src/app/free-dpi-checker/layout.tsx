import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free DPI Checker — Is Your Image Print Ready? | DTF Editor',
  description:
    'Check the DPI of any image for free. Instantly see if your artwork has enough resolution for DTF transfers and learn how to fix low-resolution images.',
  alternates: { canonical: '/free-dpi-checker' },
};

export default function FreeDpiCheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
