'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { CostAnalyticsDashboard } from '@/components/admin/analytics/CostAnalyticsDashboard';
import { ProfitabilityAnalysis } from '@/components/admin/analytics/ProfitabilityAnalysis';
import { KPIDashboard } from '@/components/admin/analytics/KPIDashboard';
import { RevenueCharts } from '@/components/admin/analytics/RevenueCharts';
import { ActiveUserMetrics } from '@/components/admin/analytics/ActiveUserMetrics';
import { Tab } from '@headlessui/react';
import { DollarSign, TrendingUp, Calculator, BarChart3, Activity, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';

export default function AdminAnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  const { user, isAdmin, initialize } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        await initialize();
      }
      
      const state = useAuthStore.getState();
      
      if (!state.user) {
        toast.error('Please login to access admin analytics');
        router.push('/admin/login');
        return;
      }
      
      if (!state.isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
    };
    
    checkAuth();
  }, [router, initialize]);

  const tabs = [
    { name: 'Key Metrics', icon: Activity, component: KPIDashboard },
    { name: 'Revenue', icon: TrendingUp, component: RevenueCharts },
    { name: 'Active Users', icon: Users, component: ActiveUserMetrics },
    { name: 'Cost Tracking', icon: DollarSign, component: CostAnalyticsDashboard },
    { name: 'Profitability', icon: Calculator, component: ProfitabilityAnalysis }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Profitability</h1>
          <p className="text-gray-600">Monitor API costs and track profitability across all services</p>
        </div>

        {/* Tab Navigation */}
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                  ${selected 
                    ? 'bg-white text-primary-blue shadow' 
                    : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900'
                  } 
                  transition-all duration-200 flex items-center justify-center gap-2`
                }
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            {tabs.map((tab, idx) => (
              <Tab.Panel key={idx}>
                <tab.component />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </AdminLayout>
  );
}