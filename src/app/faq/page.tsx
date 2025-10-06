'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import Link from 'next/link';
import { useReferralTracking } from '@/hooks/useReferralTracking';

interface FAQItem {
  id: string;
  question: string;
  answer: string | JSX.Element;
  category: string;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-dtf',
    question: 'What is DTF Editor?',
    answer:
      'DTF Editor is a web-based tool designed specifically for creating print-ready Direct to Film (DTF) transfers. It helps hobbyists and small businesses fix poor-quality images and create professional designs using AI-powered tools like background removal, image upscaling, vectorization, and AI image generation.',
    category: 'Getting Started',
  },
  {
    id: 'how-to-start',
    question: 'How do I get started?',
    answer: (
      <div>
        <p>Getting started is easy:</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Sign up for a free account</li>
          <li>You&apos;ll receive 2 free credits to try our tools</li>
          <li>Upload an image or create one with AI</li>
          <li>Use our tools to enhance, remove backgrounds, or vectorize</li>
          <li>Download your print-ready file at 300 DPI</li>
        </ol>
      </div>
    ),
    category: 'Getting Started',
  },
  {
    id: 'file-formats',
    question: 'What file formats are supported?',
    answer:
      'We support JPEG, PNG, and WebP files for upload. All processed images are delivered as high-quality PNG files at 300 DPI with transparent backgrounds (when background removal is used), perfect for DTF printing.',
    category: 'Getting Started',
  },
  {
    id: 'mobile-support',
    question: 'Can I use DTF Editor on my phone?',
    answer:
      'Yes! DTF Editor is designed mobile-first, meaning it works perfectly on smartphones and tablets. You can create and edit designs on the go, then download them directly to your device.',
    category: 'Getting Started',
  },

  // Credits & Pricing
  {
    id: 'what-are-credits',
    question: 'What are credits and how do they work?',
    answer: (
      <div>
        <p>Credits are used to process images through our AI tools:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>1 credit</strong> = 1 image processing operation
          </li>
          <li>Background removal: 1 credit</li>
          <li>Image upscaling: 1 credit</li>
          <li>Vectorization: 1 credit</li>
          <li>
            AI image generation (Beta): 1 credit (standard) or 2 credits (HD)
          </li>
        </ul>
      </div>
    ),
    category: 'Credits & Pricing',
  },
  {
    id: 'free-credits',
    question: 'Do I get any free credits?',
    answer:
      'Yes! All new users receive 2 free credits upon signup to try our tools. Free users also get 2 credits that refresh monthly.',
    category: 'Credits & Pricing',
  },
  {
    id: 'pricing-plans',
    question: 'What pricing plans are available?',
    answer: (
      <div>
        <p>We offer flexible pricing options:</p>
        <ul className="list-disc list-inside mt-2 space-y-2">
          <li>
            <strong>Free Plan:</strong> 2 credits/month, 48-hour image storage
          </li>
          <li>
            <strong>Starter Plan ($9.99/month):</strong> 20 credits/month,
            unlimited storage
          </li>
          <li>
            <strong>Pro Plan ($19.99/month):</strong> 50 credits/month,
            unlimited storage, priority support
          </li>
          <li>
            <strong>Pay-As-You-Go:</strong> Buy credit packs (10 for $7.99, 20
            for $14.99, 50 for $29.99)
          </li>
        </ul>
      </div>
    ),
    category: 'Credits & Pricing',
  },
  {
    id: 'credit-expiration',
    question: 'Do credits expire?',
    answer:
      "Monthly subscription credits roll over for up to 2 months. For example, if you don't use all your January credits, they'll be available in February and March. Pay-as-you-go credits never expire.",
    category: 'Credits & Pricing',
  },
  {
    id: 'cancel-subscription',
    question: 'Can I cancel my subscription anytime?',
    answer:
      "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access to your credits until the end of your billing period.",
    category: 'Credits & Pricing',
  },

  // Features
  {
    id: 'background-removal',
    question: 'How does background removal work?',
    answer:
      'Our background removal tool uses advanced AI to automatically detect and remove backgrounds from your images. Simply upload your image, and our system will process it to create a transparent background PNG. The result is automatically cropped to fit with minimal padding (0.05%) for optimal printing.',
    category: 'Features',
  },
  {
    id: 'image-upscaling',
    question: 'What is image upscaling?',
    answer:
      "Image upscaling uses AI to increase the resolution and quality of low-resolution images. It's perfect for when you have a small or blurry image that needs to be printed at a larger size. Our upscaling can enhance images up to 4x their original resolution while maintaining or improving quality.",
    category: 'Features',
  },
  {
    id: 'vectorization',
    question: 'What is vectorization and when should I use it?',
    answer:
      'Vectorization converts raster images (made of pixels) into vector format (made of mathematical paths). This is ideal for logos, simple graphics, or when you need to resize an image without losing quality. Vector images can be scaled to any size without becoming pixelated.',
    category: 'Features',
  },
  {
    id: 'ai-generation',
    question: 'How does AI image generation work?',
    answer:
      "Our AI image generation (currently in Beta) uses OpenAI's DALL-E 3 to create original images from text descriptions. Simply describe what you want, choose a style and size, and the AI will generate a unique image. This feature is available to paid subscribers only and uses 1-2 credits depending on quality settings.",
    category: 'Features',
  },
  {
    id: 'ai-edit',
    question: 'Can I edit parts of an existing image with AI?',
    answer:
      'Yes! Our AI editing feature (available to paid subscribers) allows you to select parts of an image and modify them using text prompts. You can change colors, add or remove elements, or transform specific areas while keeping the rest of the image intact.',
    category: 'Features',
  },

  // Storage & Gallery
  {
    id: 'image-storage',
    question: 'How long are my images stored?',
    answer: (
      <div>
        <p>Storage duration depends on your plan:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>Free users:</strong> 48 hours
          </li>
          <li>
            <strong>Pay-as-you-go:</strong> 90 days from last credit purchase
          </li>
          <li>
            <strong>Subscribers:</strong> Unlimited storage while subscribed
          </li>
        </ul>
        <p className="mt-2">
          You&apos;ll see expiration warnings in your gallery for images that
          will be deleted soon.
        </p>
      </div>
    ),
    category: 'Storage & Gallery',
  },
  {
    id: 'bulk-operations',
    question: 'Can I download or delete multiple images at once?',
    answer:
      'Yes! In your image gallery, you can select multiple images using the checkbox mode and then download them all as a ZIP file or delete them in bulk. This is great for managing large collections of designs.',
    category: 'Storage & Gallery',
  },
  {
    id: 'search-gallery',
    question: 'How do I find specific images in my gallery?',
    answer:
      'Your gallery includes powerful search and filter options. You can search by filename, filter by processing type (upscale, background removal, etc.), select date ranges, and sort by various criteria like newest, oldest, file size, or name.',
    category: 'Storage & Gallery',
  },

  // Technical
  {
    id: 'file-size-limit',
    question: 'What is the maximum file size I can upload?',
    answer:
      'The maximum file size for uploads is 10MB. If you have larger files, we recommend compressing them first or using an image editing tool to reduce the file size before uploading.',
    category: 'Technical',
  },
  {
    id: 'output-quality',
    question: 'What quality are the output files?',
    answer:
      'All processed images are exported at 300 DPI (dots per inch) in PNG format, which is the industry standard for high-quality DTF printing. This ensures your prints will be sharp and professional-looking.',
    category: 'Technical',
  },
  {
    id: 'browser-support',
    question: 'Which browsers are supported?',
    answer:
      'DTF Editor works best on modern browsers including Chrome, Safari, Firefox, and Edge. We recommend keeping your browser updated to the latest version for the best experience.',
    category: 'Technical',
  },
  {
    id: 'offline-use',
    question: 'Can I use DTF Editor offline?',
    answer:
      'No, DTF Editor requires an internet connection as it uses cloud-based AI services to process your images. This ensures you always get the latest and best processing capabilities without needing powerful hardware.',
    category: 'Technical',
  },

  // Account & Security
  {
    id: 'forgot-password',
    question: 'What if I forgot my password?',
    answer: (
      <div>
        You can reset your password by clicking the "Forgot Password?" link on
        the login page. We&apos;ll send you an email with instructions to create
        a new password. Check your spam folder if you don&apos;t see it within a
        few minutes.
      </div>
    ),
    category: 'Account & Security',
  },
  {
    id: 'change-email',
    question: 'Can I change my email address?',
    answer:
      "Yes, you can update your email address in your account settings. You'll need to verify the new email address before the change takes effect.",
    category: 'Account & Security',
  },
  {
    id: 'data-security',
    question: 'Is my data secure?',
    answer:
      "Yes! We use industry-standard encryption for all data transmission and storage. Your images are stored securely on Supabase's infrastructure, and we never share your personal information or designs with third parties.",
    category: 'Account & Security',
  },
  {
    id: 'delete-account',
    question: 'Can I delete my account?',
    answer:
      "Yes, you can request account deletion by contacting our support team. We'll permanently delete your account and all associated data within 30 days of your request.",
    category: 'Account & Security',
  },

  // Troubleshooting
  {
    id: 'processing-failed',
    question: 'Why did my image processing fail?',
    answer: (
      <div>
        <p>Processing can fail for several reasons:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Insufficient credits (check your balance)</li>
          <li>File is corrupted or in an unsupported format</li>
          <li>File size exceeds 10MB limit</li>
          <li>Temporary server issues (try again in a few minutes)</li>
        </ul>
        <p className="mt-2">If the issue persists, contact our support team.</p>
      </div>
    ),
    category: 'Troubleshooting',
  },
  {
    id: 'slow-processing',
    question: 'Why is processing taking so long?',
    answer:
      'Processing time depends on the image size and complexity. Most operations complete within 10-30 seconds. AI image generation may take up to 60 seconds. If processing takes longer than 2 minutes, try refreshing the page and attempting again.',
    category: 'Troubleshooting',
  },
  {
    id: 'credits-not-showing',
    question: "I purchased credits but they're not showing up",
    answer:
      "Credits are usually added instantly. If they don't appear within 5 minutes, try logging out and back in. If the issue persists, contact support with your order number and we'll resolve it immediately.",
    category: 'Troubleshooting',
  },
];

export default function FAQPage() {
  useReferralTracking();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    'All',
    ...Array.from(new Set(faqs.map(faq => faq.category))),
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof faq.answer === 'string' &&
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600">
            Find answers to common questions about DTF Editor
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No FAQs found matching your search.
              </p>
            </div>
          ) : (
            filteredFAQs.map(faq => (
              <div
                key={faq.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpanded(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-medium text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {expandedItems.has(faq.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedItems.has(faq.id) && (
                  <div className="px-6 pb-4">
                    <div className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Still Need Help Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="mb-6">
            Our support team is here to help you with any questions not covered
            in the FAQ.
          </p>
          <Link
            href="/support"
            className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
