'use client';

import { useState, useEffect } from 'react';
import { Users, UserCheck, CreditCard, UserX } from 'lucide-react';

interface UserStats {
  total: number;
  active: number;
  paid: number;
  suspended: number;
}

export function UserStatsCards() {
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    paid: 0,
    suspended: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsConfig = [
    {
      label: 'Total Users',
      value: stats.total,
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Active Users',
      value: stats.active,
      icon: UserCheck,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: 'Paid Users',
      value: stats.paid,
      icon: CreditCard,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Suspended',
      value: stats.suspended,
      icon: UserX,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? (
                    <span className="animate-pulse">-</span>
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </p>
              </div>
              <div className={`p-3 ${stat.bgColor} rounded-full`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}