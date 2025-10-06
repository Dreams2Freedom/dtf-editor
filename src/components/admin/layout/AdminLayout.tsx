'use client';

import { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main
          className={`flex-1 pt-16 transition-all duration-200 ease-in-out ${
            sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'
          }`}
        >
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
