'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Tag,
  Percent,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_uses?: number;
  uses_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

interface CouponMetrics {
  total_coupons: number;
  active_coupons: number;
  expired_coupons: number;
  total_uses: number;
  total_discount_given: number;
  most_used_coupon: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [metrics, setMetrics] = useState<CouponMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: 0,
    max_uses: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const filterCoupons = useCallback(() => {
    let filtered = coupons;

    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const isExpired = new Date(c.valid_until) < now;
        if (statusFilter === 'active') return c.is_active && !isExpired;
        if (statusFilter === 'expired') return isExpired;
        if (statusFilter === 'inactive') return !c.is_active;
        return true;
      });
    }

    setFilteredCoupons(filtered);
  }, [coupons, searchQuery, statusFilter]);

  useEffect(() => {
    filterCoupons();
  }, [filterCoupons]);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/admin/financial/coupons');
      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }

      const data = await response.json();
      setCoupons(data.coupons || []);
      setMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };


  const handleCreateCoupon = async () => {
    try {
      const response = await fetch('/api/admin/financial/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create coupon');
      }

      toast.success('Coupon created successfully');
      setShowCreateModal(false);
      fetchCoupons();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/financial/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update coupon');
      }

      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await fetch(`/api/admin/financial/coupons/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard');
  };

  const formatDiscount = (type: string, value: number) => {
    return type === 'percentage' ? `${value}%` : `$${(value / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-600 mt-1">Manage discount codes and promotional offers</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} variant="default">
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Coupons</p>
                    <p className="text-xl font-bold">{metrics.total_coupons}</p>
                  </div>
                  <Tag className="w-8 h-8 text-info-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-xl font-bold">{metrics.active_coupons}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Expired</p>
                    <p className="text-xl font-bold">{metrics.expired_coupons}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-error-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Uses</p>
                    <p className="text-xl font-bold">{metrics.total_uses}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Saved</p>
                    <p className="text-xl font-bold">${(metrics.total_discount_given / 100).toFixed(2)}</p>
                  </div>
                  <Percent className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-gray-600">Most Used</p>
                  <p className="text-sm font-bold truncate">{metrics.most_used_coupon || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search coupons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Coupons</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Coupons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Coupon List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Code</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Discount</th>
                    <th className="text-left py-3 px-4">Uses</th>
                    <th className="text-left py-3 px-4">Valid Until</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No coupons found
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon) => {
                      const isExpired = new Date(coupon.valid_until) < new Date();
                      return (
                        <tr key={coupon.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold">{coupon.code}</code>
                              <button
                                onClick={() => copyToClipboard(coupon.code)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{coupon.description}</td>
                          <td className="py-3 px-4">
                            <Badge variant="success">
                              {formatDiscount(coupon.discount_type, coupon.discount_value)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {coupon.uses_count}
                            {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {new Date(coupon.valid_until).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isExpired ? (
                              <Badge variant="error">Expired</Badge>
                            ) : coupon.is_active ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                                className="text-primary-600 hover:text-primary-800"
                                disabled={isExpired}
                              >
                                {coupon.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                className="text-error-600 hover:text-error-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Create New Coupon</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Summer sale discount"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.discount_type === 'percentage' ? 'Percent' : 'Amount ($)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.discount_type === 'percentage' ? formData.discount_value : formData.discount_value / 100}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        discount_value: formData.discount_type === 'percentage' 
                          ? Number(e.target.value)
                          : Number(e.target.value) * 100
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase ($)</label>
                    <Input
                      type="number"
                      value={formData.min_purchase / 100}
                      onChange={(e) => setFormData({ ...formData, min_purchase: Number(e.target.value) * 100 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                    <Input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                      placeholder="0 for unlimited"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCoupon} variant="default">
                  Create Coupon
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}