import { LucideIcon, ArrowUpCircle, Palette, Scissors, Pen, Sparkles, Package } from 'lucide-react';

export interface ToolData {
  name: string;
  slug: string;
  icon: LucideIcon;
  color: string;
  headline: string;
  copy: string;
  bullets: string[];
  mockupType: 'upscale' | 'color-change' | 'bg-removal' | 'vectorize' | 'ai-generate' | 'bulk-process';
}

export const TOOLS: ToolData[] = [
  {
    name: 'Upscale',
    slug: 'upscale',
    icon: ArrowUpCircle,
    color: 'blue',
    headline: 'Never reprint a blurry design again',
    copy: 'Customers send low-res files? Upscale to 4K with AI — every detail sharp, every line clean.',
    bullets: ['Up to 4x resolution increase', 'Preserves text clarity and fine lines', '300 DPI output, ready for print'],
    mockupType: 'upscale',
  },
  {
    name: 'Recolor',
    slug: 'color-change',
    icon: Palette,
    color: 'amber',
    headline: 'One design, unlimited colorways',
    copy: 'Click any color, pick a new one. Sell the same design in 10 colors without redesigning anything.',
    bullets: ['Click-to-select with tolerance control', 'Preserves shading and texture', 'Multiple color changes per image'],
    mockupType: 'color-change',
  },
  {
    name: 'Remove BG',
    slug: 'bg-removal',
    icon: Scissors,
    color: 'emerald',
    headline: 'Clean cutouts without Photoshop',
    copy: 'One click removes any background. Perfect edges on hair, fur, and complex shapes.',
    bullets: ['AI-powered edge detection', 'Handles hair, fur, and fine details', 'Transparent PNG ready for transfer'],
    mockupType: 'bg-removal',
  },
  {
    name: 'Vectorize',
    slug: 'vectorize',
    icon: Pen,
    color: 'purple',
    headline: 'Scale to any size without losing a pixel',
    copy: 'Convert raster images to clean SVG vectors. Perfect for vinyl cutting and large-format prints.',
    bullets: ['Pixel-perfect SVG output', 'Infinite scaling, zero quality loss', 'Perfect for vinyl and large formats'],
    mockupType: 'vectorize',
  },
  {
    name: 'AI Create',
    slug: 'ai-generate',
    icon: Sparkles,
    color: 'pink',
    headline: 'Describe it. We\'ll design it.',
    copy: 'Type what you want and get a unique, print-ready design in seconds. No design skills needed.',
    bullets: ['Text-to-image with AI', 'Unique designs every time', 'Print-ready output from the start'],
    mockupType: 'ai-generate',
  },
  {
    name: 'Bulk Process',
    slug: 'bulk-process',
    icon: Package,
    color: 'sky',
    headline: 'Process 50 files while you grab coffee',
    copy: 'Upload a batch, pick your settings, and let it run. Every file processed and ready to download.',
    bullets: ['Upload multiple files at once', 'Apply same processing to all', 'Download as ZIP when done'],
    mockupType: 'bulk-process',
  },
];

export interface PlanData {
  name: string;
  slug: string;
  price: string;
  period: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  ctaText: string;
}

export const PLANS: PlanData[] = [
  {
    name: 'Free',
    slug: 'free',
    price: '$0',
    period: '/mo',
    features: ['2 credits monthly', 'All AI tools', '48-hour file storage', 'Basic support'],
    highlighted: false,
    ctaText: 'Start Free',
  },
  {
    name: 'Hobbyist',
    slug: 'hobbyist',
    price: '$9.99',
    period: '/mo',
    features: ['20 credits monthly', '2-month credit rollover', '90-day file storage', 'Email support'],
    highlighted: false,
    ctaText: 'Get Started',
  },
  {
    name: 'Business',
    slug: 'business',
    price: '$24.99',
    period: '/mo',
    features: ['60 credits monthly', '2-month credit rollover', 'Permanent file storage', 'Priority support', 'Batch processing'],
    highlighted: true,
    badge: 'BEST VALUE',
    ctaText: 'Get Started',
  },
];

export interface CreditPackData {
  credits: number;
  price: string;
  perCredit: string;
  savingsPercent?: number;
  badge?: string;
}

export const CREDIT_PACKS: CreditPackData[] = [
  { credits: 10, price: '$7.99', perCredit: '$0.80' },
  { credits: 20, price: '$14.99', perCredit: '$0.75', savingsPercent: 6, badge: 'POPULAR' },
  { credits: 50, price: '$29.99', perCredit: '$0.60', savingsPercent: 25, badge: 'BEST VALUE' },
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const LANDING_FAQS: FAQItem[] = [
  { question: 'What file formats do you support?', answer: 'PNG, JPG, WebP, and BMP for input. Output is always 300 DPI PNG with transparency (or SVG for vectorization).' },
  { question: 'How does the credit system work?', answer: 'Each processing action costs 1 credit. Sign up free and get 2 credits. Buy more anytime or subscribe for monthly credits.' },
  { question: 'Can I try it before paying?', answer: 'Yes. Every account starts with 2 free credits. No credit card required.' },
  { question: 'What does "print-ready" mean?', answer: '300 DPI resolution with transparent backgrounds, optimized for DTF transfer printing.' },
  { question: 'How is this different from Photoshop?', answer: 'DTF Editor is purpose-built for transfer printing. One click does what takes 15 minutes in Photoshop. No design skills needed.' },
  { question: 'Do you store my images?', answer: 'Storage depends on your plan. Free: 48 hours. Hobbyist: 90 days. Business: permanent. You can delete anytime.' },
];

export const PRICING_FAQS: FAQItem[] = [
  { question: "What's the difference between subscriptions and credit packs?", answer: 'Subscriptions give you monthly credits at the best per-credit rate with extras like storage and rollover. Credit packs are one-time purchases that never expire — buy them when you need a quick top-up.' },
  { question: 'Do unused credits expire?', answer: 'Subscription credits roll over for up to 2 months on paid plans. Credit pack credits never expire.' },
  { question: 'Can I cancel anytime?', answer: 'Yes. Cancel your subscription anytime from your account settings. You keep access until the end of your billing period.' },
  { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, debit cards, and Apple Pay via Stripe.' },
  { question: 'Is there a refund policy?', answer: 'Unused credit packs can be refunded within 7 days of purchase. Subscription refunds are handled on a case-by-case basis.' },
];

export const COMPARISON_FEATURES = [
  { name: 'Monthly credits', free: '2', hobbyist: '20', business: '60' },
  { name: 'AI Upscaling', free: true, hobbyist: true, business: true },
  { name: 'Background Removal', free: true, hobbyist: true, business: true },
  { name: 'Color Changing', free: true, hobbyist: true, business: true },
  { name: 'Vectorization', free: true, hobbyist: true, business: true },
  { name: 'AI Generation', free: true, hobbyist: true, business: true },
  { name: 'Batch Processing', free: false, hobbyist: false, business: true },
  { name: 'Credit Rollover', free: '—', hobbyist: '2 months', business: '2 months' },
  { name: 'File Storage', free: '48 hours', hobbyist: '90 days', business: 'Permanent' },
  { name: 'Support', free: 'Basic', hobbyist: 'Email', business: 'Priority' },
] as const;
