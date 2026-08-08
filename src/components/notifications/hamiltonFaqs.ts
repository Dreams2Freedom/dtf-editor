/**
 * A short, curated subset of the /faq content for the Hamilton help panel.
 * Plain text only. Keep it to the handful of things users ask most; the panel
 * links to the full /faq page for everything else.
 */
export interface HamiltonFaq {
  q: string;
  a: string;
}

export const HAMILTON_FAQS: HamiltonFaq[] = [
  {
    q: 'How do I get started?',
    a: 'Sign up for a free account (you get 2 free credits), upload an image or generate one with AI, use the tools to enhance/remove background/vectorize, then download your print-ready 300 DPI file.',
  },
  {
    q: 'How do credits work?',
    a: '1 credit = 1 processing operation. Background removal and upscaling are 1 credit, vectorization is 2. Free users get 2 credits that refresh monthly.',
  },
  {
    q: 'What file formats can I use?',
    a: 'You can upload JPEG, PNG, and WebP. Processed images come back as high-quality PNGs at 300 DPI — with a transparent background when you use background removal.',
  },
  {
    q: 'Can I use DTF Editor on my phone?',
    a: 'Yes — it’s built mobile-first, so you can create and edit on a phone or tablet and download straight to your device.',
  },
  {
    q: 'Do my images get saved?',
    a: 'Your processed images are saved to your gallery so you can come back to them. You can download or delete them any time from your dashboard.',
  },
];
