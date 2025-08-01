'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings,
  HeadphonesIcon,
  Shield,
  FileText,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: ['users', 'view'],
    children: [
      { name: 'All Users', href: '/admin/users', icon: Users },
      { name: 'User Activity', href: '/admin/users/activity', icon: FileText },
    ]
  },
  {
    name: 'Financial',
    href: '/admin/financial',
    icon: DollarSign,
    permission: ['financial', 'view'],
    children: [
      { name: 'Transactions', href: '/admin/financial/transactions', icon: DollarSign },
      { name: 'Coupons', href: '/admin/financial/coupons', icon: FileText },
      { name: 'Revenue', href: '/admin/financial/revenue', icon: BarChart3 },
    ]
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: ['analytics', 'view'],
  },
  {
    name: 'Support',
    href: '/admin/support',
    icon: HeadphonesIcon,
    permission: ['support', 'view'],
  },
  {
    name: 'System',
    href: '/admin/system',
    icon: Settings,
    permission: ['system', 'settings'],
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: Shield,
    permission: ['admin', 'manage'],
  },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const hasPermission = (permission?: string[]): boolean => {
    // For now, all admins have full permissions
    return true;
  };

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    if (!hasPermission(item.permission)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const active = isActive(item.href);

    return (
      <div key={item.name}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`
              w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg
              ${active
                ? 'bg-primary-blue text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
              ${isChild ? 'pl-11' : ''}
            `}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <Link
            href={item.href}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-lg
              ${active
                ? 'bg-primary-blue text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
              ${isChild ? 'pl-11' : ''}
            `}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Mobile close button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.map(item => renderMenuItem(item))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Version 1.0.0</p>
              <p className="mt-1">© 2025 DTF Editor</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}