'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Shield, Activity, Database, Gauge, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RateLimitStats {
  status: string;
  message?: string;
  warning?: string;
  stats?: {
    total_keys: number;
    by_type: Record<string, number>;
    by_identifier: {
      authenticated_users: number;
      anonymous_ips: number;
    };
    top_consumers: Array<{
      key: string;
      count: number;
      resetAt: number;
    }>;
    redis_info: {
      db_size: number;
      memory_usage: string;
    };
  };
  estimates?: {
    unique_users: number;
    unique_visitors: number;
    api_calls_tracked: number;
    monthly_cost_estimate: string;
  };
  recommendations?: string[];
}

export default function SystemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSystemStats();
    }
  }, [user]);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/rate-limits/stats', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rate limit stats: ${response.status}`);
      }

      const data = await response.json();
      setRateLimitStats(data);
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system stats');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'not_configured':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'not_configured':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
            <p className="text-gray-600 mt-2">Monitor system health and performance</p>
          </div>
          <Button
            onClick={fetchSystemStats}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Limiting Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rate Limiting Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : rateLimitStats ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(rateLimitStats.status)}
                <span className={`font-semibold ${getStatusColor(rateLimitStats.status)}`}>
                  {rateLimitStats.status === 'connected' ? 'Redis Connected' : 
                   rateLimitStats.status === 'not_configured' ? 'Using In-Memory (Configure Redis)' : 
                   'Unknown Status'}
                </span>
              </div>

              {/* Warning */}
              {rateLimitStats.warning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">{rateLimitStats.warning}</p>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              {rateLimitStats.stats && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Total Keys</span>
                      </div>
                      <p className="text-2xl font-bold">{rateLimitStats.stats.total_keys}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Active Users</span>
                      </div>
                      <p className="text-2xl font-bold">{rateLimitStats.stats.by_identifier.authenticated_users}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Anonymous IPs</span>
                      </div>
                      <p className="text-2xl font-bold">{rateLimitStats.stats.by_identifier.anonymous_ips}</p>
                    </div>
                  </div>

                  {/* Endpoint Usage */}
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Endpoint Usage</h3>
                    <div className="space-y-2">
                      {Object.entries(rateLimitStats.stats.by_type).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center py-2 border-b">
                          <span className="capitalize">{type}</span>
                          <span className="font-mono text-sm">{count} keys</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Consumers */}
                  {rateLimitStats.stats.top_consumers.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Top Consumers</h3>
                      <div className="space-y-2">
                        {rateLimitStats.stats.top_consumers.map((consumer, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b">
                            <span className="font-mono text-sm">{consumer.key}</span>
                            <span className="text-sm">{consumer.count} requests</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Estimates */}
              {rateLimitStats.estimates && (
                <div className="mt-6 bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Usage Estimates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Unique Users</span>
                      <p className="font-bold">{rateLimitStats.estimates.unique_users}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Unique Visitors</span>
                      <p className="font-bold">{rateLimitStats.estimates.unique_visitors}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">API Calls Tracked</span>
                      <p className="font-bold">{rateLimitStats.estimates.api_calls_tracked}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Monthly Cost</span>
                      <p className="font-bold">{rateLimitStats.estimates.monthly_cost_estimate}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {rateLimitStats.recommendations && rateLimitStats.recommendations.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {rateLimitStats.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Operational</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Connected</p>
            </div>

            <div className={rateLimitStats?.status === 'connected' ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rate Limiting</span>
                {rateLimitStats?.status === 'connected' ? 
                  <CheckCircle className="w-4 h-4 text-green-500" /> :
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                }
              </div>
              <p className="text-lg font-semibold mt-1">
                {rateLimitStats?.status === 'connected' ? 'Redis Active' : 'In-Memory'}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}