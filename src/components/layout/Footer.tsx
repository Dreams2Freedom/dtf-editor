import Link from 'next/link';
import { Crown } from 'lucide-react';

const navigation = {
  product: [
    { name: 'Process Image', href: '/process' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Dashboard', href: '/dashboard' },
  ],
  tools: [
    { name: 'Image Upscaling', href: '/process/upscale' },
    { name: 'Background Removal', href: '/process/background-removal' },
    { name: 'Vectorization', href: '/process/vectorize' },
  ],
  support: [
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Support Center', href: '/support' },
    { name: 'About Us', href: '/about' },
    { name: 'Blog', href: '/blog' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Affiliate Terms', href: '/affiliate/terms' },
  ],
  business: [
    { name: 'Affiliate Program', href: '/affiliate/apply' },
    { name: 'Become a Partner', href: '/affiliate/apply' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-primary-blue" />
              <span className="ml-2 text-xl font-bold text-white">
                DTF Editor
              </span>
            </div>
            <p className="text-sm leading-6 text-gray-300">
              AI-powered image processing tools for creating print-ready DTF
              transfers.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Product
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.product.map(item => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Tools
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.tools.map(item => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">
                  Support
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.support.map(item => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-300 hover:text-white"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-white">
                    Business
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.business.map(item => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-300 hover:text-white"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10">
                  <h3 className="text-sm font-semibold leading-6 text-white">
                    Legal
                  </h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.legal.map(item => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-300 hover:text-white"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-400">
            &copy; {new Date().getFullYear()} DTF Editor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
