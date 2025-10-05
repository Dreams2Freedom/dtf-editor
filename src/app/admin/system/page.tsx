'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeft, Shield, Activity, Database, Gauge, AlertCircle, 
  CheckCircle, XCircle, RefreshCw, Server, HardDrive, Mail, 
  Cpu, Globe, Clock, TrendingUp, Users, Image, CreditCard,
  FileText, Package
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

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

interface SystemHealth {
  timestamp: string;
  status: string;
  services: {
    database: { status: string; latency: number };
    storage: { status: string; message: string };
    redis: { status: string; message: string };
    stripe: { status: string; message: string };
    email: { status: string; provider: string };
    ai_services: {
      openai: { status: string; message: string };
      deepImage: { status: string; message: string };
      clippingMagic: { status: string; message: string };
      vectorizer: { status: string; message: string };
    };
  };
  environment: {
    node_version: string;
    deployment: string;
    region: string;
    commit: string;
  };
  configuration: {
    supabase: boolean;
    stripe: boolean;
    redis: boolean;
    email: boolean;
    ai_services: {
      openai: boolean;
      deepImage: boolean;
      clippingMagic: boolean;
      vectorizer: boolean;
    };
  };
}

interface DatabaseStats {
  tables: {
    users: { total: number; recent_24h: number; active_7d: number };
    processed_images: { total: number; recent_24h: number };
    payments: { total: number };
    subscriptions: { total: number };
    credit_transactions: { total: number };
    audit_logs: { total: number };
    support_tickets: { total: number };
  };
  storage: {
    buckets: number;
    total_size_bytes: number;
    total_size_mb: string;
  };
  database: {
    provider: string;
    region: string;
    status: string;
  };
  summary: {
    total_records: number;
    growth_rate_24h: number;
  };
}

export default function SystemPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      fetchAllStats();
    }
  }, [user]);

  const fetchAllStats = async () => {
    setLoading(true);
    setError(null);
    
    await Promise.all([
      fetchSystemStats(),
      fetchHealthStatus(),
      fetchDatabaseStats(),
    ]);
    
    setLastRefresh(new Date());
    setLoading(false);
  };

  const fetchSystemStats = async () => {
    try {
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
      console.error('Error fetching rate limit stats:', err);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/health', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch health status: ${response.status}`);
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (err) {
      console.error('Error fetching health status:', err);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/system/database', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch database stats: ${response.status}`);
      }

      const data = await response.json();
      setDatabaseStats(data);
    } catch (err) {
      console.error('Error fetching database stats:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'not_configured':
        return <AlertCircle className="w-5 h-5 text-warning-500" />;
      default:
        return <XCircle className="w-5 h-5 text-error-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-success-600';
      case 'not_configured':
        return 'text-warning-600';
      default:
        return 'text-error-600';
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <Button
              onClick={fetchAllStats}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-error-200 bg-error-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-error-600">
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
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-warning-600 mt-0.5" />
                    <p className="text-sm text-warning-800">{rateLimitStats.warning}</p>
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
                        <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
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
            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                <CheckCircle className="w-4 h-4 text-success-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Operational</p>
            </div>

            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <CheckCircle className="w-4 h-4 text-success-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Connected</p>
            </div>

            <div className={`${rateLimitStats?.status === 'connected' ? 'bg-success-50' : 'bg-warning-50'} rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rate Limiting</span>
                {rateLimitStats?.status === 'connected' ? 
                  <CheckCircle className="w-4 h-4 text-success-500" /> :
                  <AlertCircle className="w-4 h-4 text-warning-500" />
                }
              </div>
              <p className="text-lg font-semibold mt-1">
                {rateLimitStats?.status === 'connected' ? 'Redis Active' : 'In-Memory'}
              </p>
            </div>

            <div className="bg-success-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage</span>
                <CheckCircle className="w-4 h-4 text-success-500" />
              </div>
              <p className="text-lg font-semibold mt-1">Available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Statistics */}
      {databaseStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Total Users</span>
                </div>
                <p className="text-2xl font-bold">{databaseStats.tables.users.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  +{databaseStats.tables.users.recent_24h} today
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-600">Processed Images</span>
                </div>
                <p className="text-2xl font-bold">{databaseStats.tables.processed_images.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  +{databaseStats.tables.processed_images.recent_24h} today
                </p>
              </div>

              <div className="bg-success-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-success-600" />
                  <span className="text-sm text-gray-600">Payments</span>
                </div>
                <p className="text-2xl font-bold">{databaseStats.tables.payments.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {databaseStats.tables.subscriptions.total} active subs
                </p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-600">Storage Used</span>
                </div>
                <p className="text-2xl font-bold">{databaseStats.storage.total_size_mb} MB</p>
                <p className="text-xs text-gray-500 mt-1">
                  {databaseStats.storage.buckets} buckets
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Database Provider</p>
                  <p className="font-semibold">{databaseStats.database.provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="font-semibold">{databaseStats.summary.total_records.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">24h Growth</p>
                  <p className="font-semibold text-success-600">
                    +{databaseStats.summary.growth_rate_24h.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      {systemHealth && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Core Services */}
              <div>
                <h3 className="font-semibold mb-3">Core Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>Database</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {systemHealth.services.database.status === 'healthy' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success-500" />
                          <span className="text-sm text-gray-500">{systemHealth.services.database.latency}ms</span>
                        </>
                      ) : (
                        <XCircle className="w-4 h-4 text-error-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>Storage</span>
                    </div>
                    {systemHealth.services.storage.status === 'healthy' ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Redis</span>
                    </div>
                    {systemHealth.services.redis.status === 'healthy' ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : systemHealth.services.redis.status === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-warning-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {systemHealth.services.stripe.status === 'healthy' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success-500" />
                          <span className="text-xs text-gray-500">{systemHealth.services.stripe.message}</span>
                        </>
                      ) : (
                        <XCircle className="w-4 h-4 text-error-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {systemHealth.services.email.status === 'healthy' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success-500" />
                          <span className="text-xs text-gray-500">{systemHealth.services.email.provider}</span>
                        </>
                      ) : (
                        <AlertCircle className="w-4 h-4 text-warning-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Services */}
              <div>
                <h3 className="font-semibold mb-3">AI Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>OpenAI (GPT-4)</span>
                    {systemHealth.configuration.ai_services.openai ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Deep-Image.ai</span>
                    {systemHealth.configuration.ai_services.deepImage ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>ClippingMagic</span>
                    {systemHealth.configuration.ai_services.clippingMagic ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Vectorizer.ai</span>
                    {systemHealth.configuration.ai_services.vectorizer ? (
                      <CheckCircle className="w-4 h-4 text-success-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Information */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Deployment</p>
                <p className="font-semibold capitalize">{systemHealth.environment.deployment}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Region</p>
                <p className="font-semibold">{systemHealth.environment.region}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Node Version</p>
                <p className="font-semibold">{systemHealth.environment.node_version}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Commit SHA</p>
                <p className="font-mono text-sm">{systemHealth.environment.commit.substring(0, 8)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}