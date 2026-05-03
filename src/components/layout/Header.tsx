'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import {
  Menu,
  X,
  Home,
  Images,
  Upload,
  Settings,
  LogOut,
  User,
  DollarSign,
  Crown,
  HardDrive,
  Sparkles,
  ChevronDown,
  HelpCircle,
  Shield,
  Ruler,
  Palette,
  Scissors,
  Zap,
  Grid3x3,
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
    description?: string;
  }[];
}

export function Header() {
  const { user, profile, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  const isAdmin = profile?.is_admin === true;

  const navigation: NavItem[] = user
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        {
          name: 'Create',
          icon: Sparkles,
          submenu: [
            {
              name: 'Studio',
              href: '/studio',
              icon: Upload,
              description: 'Upload, edit, chain tools',
            },
            {
              name: 'Remove Background',
              href: '/studio?tool=bg-removal',
              icon: Scissors,
              description: 'AI brush + auto removal',
            },
            {
              name: 'Upscale',
              href: '/studio?tool=upscale',
              icon: Sparkles,
              description: 'Enhance resolution 2× / 4×',
            },
            {
              name: 'Change Colors',
              href: '/studio?tool=color-change',
              icon: Palette,
              description: 'Replace colors in designs',
            },
            {
              name: 'Vectorize',
              href: '/studio?tool=vectorize',
              icon: Zap,
              description: 'Convert to scalable SVG',
            },
            {
              name: 'Halftone',
              href: '/studio?tool=halftone',
              icon: Grid3x3,
              description: 'DTF-ready dot pattern',
            },
            {
              name: 'Generate Image',
              href: '/generate',
              icon: Sparkles,
              description: 'Create with AI',
            },
            {
              name: 'DPI Checker',
              href: '/free-dpi-checker',
              icon: Ruler,
              description: 'Check print quality',
            },
          ],
        },
        { name: 'My Images', href: '/dashboard#my-images', icon: Images },
        { name: 'Pricing', href: '/pricing', icon: DollarSign },
      ]
    : [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Pricing', href: '/pricing', icon: DollarSign },
        { name: 'DPI Checker', href: '/free-dpi-checker', icon: Ruler },
      ];

  const userNavigation = [
    ...(isAdmin
      ? [{ name: 'Admin Dashboard', href: '/admin', icon: Shield }]
      : []),
    { name: 'Affiliate Dashboard', href: '/dashboard/affiliate', icon: Crown },
    { name: 'Storage', href: '/storage', icon: HardDrive },
    { name: 'Settings', href: '/settings', icon: Settings },
    {
      name: 'Support',
      href: isAdmin ? '/admin/support' : '/support',
      icon: HelpCircle,
    },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <header
      className="bg-white/80 backdrop-blur-lg border-b border-gray-200/80 sticky top-0 z-40"
      ref={dropdownRef}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              href={user ? '/dashboard' : '/'}
              className="flex items-center flex-shrink-0"
            >
              <Image
                src="/logo-horizontal.png"
                alt="DTF Editor"
                width={130}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navigation.map(item =>
                item.submenu ? (
                  <div key={item.name} className="relative">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        openDropdown === item.name
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === item.name ? null : item.name
                        )
                      }
                      onMouseEnter={() => setOpenDropdown(item.name)}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${openDropdown === item.name ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openDropdown === item.name && (
                      <div
                        className="absolute left-0 top-full mt-1 w-64 rounded-xl shadow-lg shadow-gray-200/50 bg-white border border-gray-200 overflow-hidden"
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <div className="py-1">
                          {item.submenu.map(subitem => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                                isActive(subitem.href)
                                  ? 'bg-amber-50 text-amber-900'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => setOpenDropdown(null)}
                            >
                              <subitem.icon
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive(subitem.href) ? 'text-amber-600' : 'text-gray-400'}`}
                              />
                              <div>
                                <div className="text-sm font-medium">
                                  {subitem.name}
                                </div>
                                {subitem.description && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {subitem.description}
                                  </div>
                                )}
                              </div>
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
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ) : null
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <CreditDisplay />
                <NotificationBell />
                <div className="relative">
                  <button
                    className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
                      openDropdown === 'user'
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      setOpenDropdown(openDropdown === 'user' ? null : 'user')
                    }
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(
                          profile?.first_name?.[0] ||
                          profile?.email?.[0] ||
                          user.email?.[0] ||
                          'U'
                        ).toUpperCase()}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 hidden sm:block transition-transform ${openDropdown === 'user' ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openDropdown === 'user' && (
                    <div className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-lg shadow-gray-200/50 bg-white border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile?.first_name || 'Account'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {profile?.email || user.email}
                        </p>
                      </div>
                      <div className="py-1">
                        {userNavigation.map(item => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <item.icon className="w-4 h-4 text-gray-400" />
                            {item.name}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="py-2 px-4 space-y-1">
            {navigation.map(item =>
              item.submenu ? (
                <div key={item.name}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {item.name}
                  </div>
                  {item.submenu.map(subitem => (
                    <Link
                      key={subitem.name}
                      href={subitem.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive(subitem.href)
                          ? 'bg-amber-50 text-amber-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <subitem.icon
                        className={`w-4 h-4 ${isActive(subitem.href) ? 'text-amber-600' : 'text-gray-400'}`}
                      />
                      {subitem.name}
                    </Link>
                  ))}
                </div>
              ) : item.href ? (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-amber-50 text-amber-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 ${isActive(item.href) ? 'text-amber-600' : 'text-gray-400'}`}
                  />
                  {item.name}
                </Link>
              ) : null
            )}
          </div>

          {user ? (
            <div className="border-t border-gray-200 py-3 px-4">
              <div className="flex items-center gap-3 mb-3 px-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {(
                      profile?.first_name?.[0] ||
                      user.email?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {profile?.first_name || 'Account'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {profile?.subscription_plan || 'Free'} Plan
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {userNavigation.map(item => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.name}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 py-3 px-4">
              <div className="flex gap-2">
                <Link href="/auth/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="flex-1">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
