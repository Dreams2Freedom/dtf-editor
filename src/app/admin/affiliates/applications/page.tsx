'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AffiliateAdminNav } from '@/components/admin/affiliates/AffiliateAdminNav';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  Globe,
  Users,
  FileText,
  Mail,
  Calendar,
  Eye,
  DollarSign
} from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  referral_code: string;
  status: 'pending' | 'approved' | 'rejected';
  website_url?: string;
  social_media?: any;
  promotional_methods?: string[];
  audience_size?: string;
  application_reason?: string;
  content_examples?: string;
  payment_method?: string;
  paypal_email?: string;
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

export default function AdminAffiliateApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      console.log('Fetching affiliates...');
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Affiliates fetched:', affiliates?.length || 0, error);
      if (error) throw error;

      // Fetch user details for each application
      const applicationsWithUsers = await Promise.all(
        (affiliates || []).map(async (affiliate) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', affiliate.user_id)
            .single();

          return {
            ...affiliate,
            user: profile
          };
        })
      );

      setApplications(applicationsWithUsers);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  async function approveApplication(applicationId: string) {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'admin'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application approved successfully');
      await fetchApplications();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectApplication(applicationId: string) {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          rejected_by: 'admin'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      setRejectionReason('');
      await fetchApplications();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const approvedApplications = applications.filter(a => a.status === 'approved');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  return (
    <div className="p-6">
      <AffiliateAdminNav />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{pendingApplications.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{approvedApplications.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{rejectedApplications.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Audience</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.user?.full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{app.user?.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{app.referral_code}</td>
                    <td className="px-4 py-3 text-sm">{app.audience_size || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                        {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedApplication(app)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Application Details</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Applicant</label>
                    <p className="font-medium">{selectedApplication.user?.full_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{selectedApplication.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Referral Code</label>
                    <p className="font-mono">{selectedApplication.referral_code}</p>
                  </div>
                </div>

                {selectedApplication.website_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Website
                    </label>
                    <p className="text-blue-600">{selectedApplication.website_url}</p>
                  </div>
                )}

                {selectedApplication.audience_size && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      <Users className="inline h-4 w-4 mr-1" />
                      Audience Size
                    </label>
                    <p>{selectedApplication.audience_size}</p>
                  </div>
                )}

                {selectedApplication.promotional_methods && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Promotional Methods</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedApplication.promotional_methods.map((method, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedApplication.application_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      <FileText className="inline h-4 w-4 mr-1" />
                      Application Reason
                    </label>
                    <p className="mt-1 text-sm">{selectedApplication.application_reason}</p>
                  </div>
                )}

                {selectedApplication.payment_method && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Payment Method
                    </label>
                    <p className="capitalize">{selectedApplication.payment_method}</p>
                    {selectedApplication.payment_method === 'paypal' && selectedApplication.paypal_email && (
                      <p className="text-sm text-gray-500">{selectedApplication.paypal_email}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Applied On
                  </label>
                  <p>{new Date(selectedApplication.created_at).toLocaleString()}</p>
                </div>

                {selectedApplication.status === 'pending' && (
                  <>
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-gray-600">
                        Rejection Reason (if rejecting)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                        rows={3}
                        placeholder="Provide a reason for rejection..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => approveApplication(selectedApplication.id)}
                        disabled={processingId === selectedApplication.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === selectedApplication.id ? 'Processing...' : 'Approve Application'}
                      </Button>
                      <Button
                        onClick={() => rejectApplication(selectedApplication.id)}
                        disabled={processingId === selectedApplication.id || !rejectionReason.trim()}
                        variant="secondary"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {processingId === selectedApplication.id ? 'Processing...' : 'Reject Application'}
                      </Button>
                    </div>
                  </>
                )}

                {selectedApplication.status === 'rejected' && selectedApplication.rejection_reason && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-600">Rejection Reason</label>
                    <p className="mt-1 text-sm text-red-600">{selectedApplication.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => {
                    setSelectedApplication(null);
                    setRejectionReason('');
                  }}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}