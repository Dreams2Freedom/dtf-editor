'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  FileText,
  CreditCard,
  Mail,
  Shield,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogFilters {
  search?: string;
  action?: string;
  resource_type?: string;
  admin_id?: string;
  start_date?: string;
  end_date?: string;
  page: number;
  limit: number;
}

const ACTION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  user_created: User,
  user_updated: User,
  user_deleted: User,
  user_suspended: Shield,
  user_activated: Shield,
  credits_adjusted: CreditCard,
  bulk_credits_adjusted: CreditCard,
  email_sent: Mail,
  bulk_email_sent: Mail,
  test_email_sent: Mail,
  settings_updated: Settings,
  export_data: Download,
  default: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  user_deleted: 'text-red-600 bg-red-50',
  user_suspended: 'text-orange-600 bg-orange-50',
  user_activated: 'text-green-600 bg-green-50',
  credits_adjusted: 'text-blue-600 bg-blue-50',
  email_sent: 'text-purple-600 bg-purple-50',
  default: 'text-gray-600 bg-gray-50',
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/audit/logs?${queryParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotalLogs(data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || ACTION_ICONS.default;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || ACTION_COLORS.default;
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) {
      return <span className="text-gray-500">No additional details</span>;
    }

    return (
      <div className="space-y-1">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-sm font-medium text-gray-600 capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <span className="text-sm text-gray-900">
              {typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const totalPages = Math.ceil(totalLogs / filters.limit);

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'user_created', label: 'User Created' },
    { value: 'user_updated', label: 'User Updated' },
    { value: 'user_deleted', label: 'User Deleted' },
    { value: 'user_suspended', label: 'User Suspended' },
    { value: 'user_activated', label: 'User Activated' },
    { value: 'credits_adjusted', label: 'Credits Adjusted' },
    { value: 'email_sent', label: 'Email Sent' },
    { value: 'settings_updated', label: 'Settings Updated' },
  ];

  const resourceTypes = [
    { value: '', label: 'All Resources' },
    { value: 'user', label: 'User' },
    { value: 'credit', label: 'Credit' },
    { value: 'email', label: 'Email' },
    { value: 'settings', label: 'Settings' },
    { value: 'system', label: 'System' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search logs..."
                value={filters.search || ''}
                onChange={e => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Filter */}
            <select
              value={filters.action || ''}
              onChange={e => handleFilterChange('action', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Resource Type Filter */}
            <select
              value={filters.resource_type || ''}
              onChange={e =>
                handleFilterChange('resource_type', e.target.value)
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              {resourceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={e => handleFilterChange('start_date', e.target.value)}
                className="text-sm"
              />
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={e => handleFilterChange('end_date', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Loading audit logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No audit logs found</p>
            </div>
          ) : (
            logs.map(log => {
              const Icon = getActionIcon(log.action);
              const colorClass = getActionColor(log.action);
              const isExpanded = expandedLog === log.id;

              return (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">
                            {formatAction(log.action)}
                          </p>
                          {log.resource_type && (
                            <span className="text-sm text-gray-500">
                              on {log.resource_type}
                              {log.resource_id &&
                                ` (${log.resource_id.slice(0, 8)}...)`}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            By:{' '}
                            <span className="font-medium">
                              {log.admin_email || log.admin_id}
                            </span>
                          </p>
                          <p>{formatDate(log.created_at)}</p>
                          {log.ip_address && <p>IP: {log.ip_address}</p>}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Additional Details
                      </h4>
                      {renderDetails(log.details)}
                      {log.user_agent && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-600">
                            User Agent:
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {log.user_agent}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(filters.page - 1) * filters.limit + 1} to{' '}
              {Math.min(filters.page * filters.limit, totalLogs)} of {totalLogs}{' '}
              logs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-700">
                Page {filters.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
