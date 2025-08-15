'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { 
  Menu, 
  X, 
  Home,
  Images,
  Upload,
  CreditCard,
  Settings,
  LogOut,
  User,
  DollarSign,
  Crown,
  HardDrive,
  Sparkles,
  Edit3,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export function Header() {
  const { user, profile, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const navigation: NavItem[] = user ? [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Process Image', href: '/process', icon: Upload },
    { name: 'Generate Image', href: '/generate', icon: Sparkles },
    { name: 'My Images', href: '/dashboard#my-images', icon: Images },
    { name: 'Storage', href: '/storage', icon: HardDrive },
    { name: 'Support', href: '/support', icon: HelpCircle },
    { name: 'Pricing', href: '/pricing', icon: DollarSign },
  ] : [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Pricing', href: '/pricing', icon: DollarSign },
    { name: 'Process', href: '/process', icon: Upload },
  ];

  const userNavigation = [
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Billing', href: '/settings?tab=billing', icon: CreditCard },
  ];

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href={user ? '/dashboard' : '/'} className="flex items-center">
                <Crown className="h-8 w-8 text-primary-blue" />
                <span className="ml-2 text-xl font-bold text-gray-900">DTF Editor</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                item.submenu ? (
                  <div key={item.name} className="relative">
                    <button
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      onClick={() => setAiMenuOpen(!aiMenuOpen)}
                      onMouseEnter={() => setAiMenuOpen(true)}
                    >
                      <item.icon className="w-4 h-4 mr-1" />
                      {item.name}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                    {aiMenuOpen && (
                      <div 
                        className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                        onMouseLeave={() => setAiMenuOpen(false)}
                      >
                        <div className="py-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setAiMenuOpen(false)}
                            >
                              <subitem.icon className="w-4 h-4 mr-2" />
                              {subitem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : item.href ? (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  >
                    <item.icon className="w-4 h-4 mr-1" />
                    {item.name}
                  </Link>
                ) : null
              ))}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {user ? (
              <>
                <CreditDisplay />
                <NotificationBell />
                <div className="relative ml-3">
                  <div className="flex items-center space-x-3">
                    {userNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <item.icon className="h-5 w-5" />
                      </Link>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            {user && <CreditDisplay />}
            <button
              type="button"
              className="ml-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-blue"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`sm:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="space-y-1 pb-3 pt-2">
          {navigation.map((item) => (
            item.submenu ? (
              <div key={item.name}>
                <div className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-700 bg-gray-50">
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                </div>
                {item.submenu.map((subitem) => (
                  <Link
                    key={subitem.name}
                    href={subitem.href}
                    className="block border-l-4 border-transparent py-2 pl-8 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <subitem.icon className="w-4 h-4 mr-3" />
                      {subitem.name}
                    </div>
                  </Link>
                ))}
              </div>
            ) : item.href ? (
              <Link
                key={item.name}
                href={item.href}
                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            ) : null
          ))}
        </div>
        {user && (
          <>
            <div className="border-t border-gray-200 pb-3 pt-4">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <User className="h-10 w-10 rounded-full bg-gray-200 p-2" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {profile?.email || user.email}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {profile?.subscription_plan || 'Free'} Plan
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {userNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                >
                  <div className="flex items-center">
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
        {!user && (
          <div className="border-t border-gray-200 pb-3 pt-4">
            <div className="flex items-center px-4 space-x-3">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup" className="flex-1">
                <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
        {/* Privacy Policy Link */}
        <div className="border-t border-gray-200 py-3">
          <Link
            href="/privacy"
            className="block px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setMobileMenuOpen(false)}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </header>
  );
}