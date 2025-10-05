import Link from 'next/link';
import { ChevronRight, Home, LayoutDashboard } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  homeLabel?: string;
}

export function Breadcrumb({ items, homeHref = '/dashboard', homeLabel = 'Dashboard' }: BreadcrumbProps) {
  const isAdmin = homeHref.startsWith('/admin');

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href={homeHref}
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            {isAdmin ? (
              <LayoutDashboard className="mr-2 h-4 w-4" />
            ) : (
              <Home className="mr-2 h-4 w-4" />
            )}
            {homeLabel}
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}