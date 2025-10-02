'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  FileText,
  DollarSign,
  CreditCard,
  UsersRound
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Overview',
    href: '/admin/affiliates',
    icon: BarChart3
  },
  {
    name: 'Applications',
    href: '/admin/affiliates/applications',
    icon: FileText
  },
  {
    name: 'Commissions',
    href: '/admin/affiliates/commissions',
    icon: DollarSign
  },
  {
    name: 'Payouts',
    href: '/admin/affiliates/payouts',
    icon: CreditCard
  }
];

export function AffiliateAdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      {/* Back to Dashboard Link */}
      <Link
        href="/admin"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Admin Dashboard
      </Link>

      {/* Page Header */}
      <div className="flex items-center mb-4">
        <UsersRound className="h-8 w-8 text-blue-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold">Affiliate Program Management</h1>
          <p className="text-gray-600">Monitor and manage your affiliate program</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex space-x-1 border-b border-gray-200">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}