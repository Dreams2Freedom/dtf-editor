import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AffiliateDashboard } from '@/components/affiliate/AffiliateDashboard';
import { getAffiliateByUserId, getAffiliateDashboardStats } from '@/services/affiliate';
import { createServiceClient } from '@/services/affiliate';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function AffiliateDashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has an affiliate account
  const affiliate = await getAffiliateByUserId(user.id);

  if (!affiliate) {
    // Not an affiliate yet, show application prompt
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Join Our Affiliate Program</h1>
            <p className="text-gray-600 mb-6">
              Earn 20% recurring commissions by referring customers to DTF Editor!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-2xl font-bold text-blue-600">20%</div>
                <p className="text-sm text-gray-600">Recurring Commission</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">30 Days</div>
                <p className="text-sm text-gray-600">Cookie Duration</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">$50</div>
                <p className="text-sm text-gray-600">Minimum Payout</p>
              </div>
            </div>
            <Link href="/affiliate/apply">
              <Button size="lg">Apply Now</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check affiliate status
  if (affiliate.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Application Under Review</h1>
            <p className="text-gray-700">
              Thank you for applying to our affiliate program! We're reviewing your application
              and will notify you within 24-48 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (affiliate.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Application Not Approved</h1>
            <p className="text-gray-700 mb-4">
              Unfortunately, your affiliate application was not approved at this time.
            </p>
            {affiliate.rejection_reason && (
              <p className="text-sm text-gray-600">
                Reason: {affiliate.rejection_reason}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (affiliate.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Account Suspended</h1>
            <p className="text-gray-700 mb-4">
              Your affiliate account has been suspended.
            </p>
            {affiliate.suspended_reason && (
              <p className="text-sm text-gray-600">
                Reason: {affiliate.suspended_reason}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-4">
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get dashboard data
  const stats = await getAffiliateDashboardStats(affiliate.id);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <p className="text-gray-600">Unable to load dashboard data. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get additional data
  const supabase = createServiceClient();

  // Get referrals
  const { data: rawReferrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get user profiles for referrals
  const userIds = rawReferrals?.map(r => r.referred_user_id).filter(Boolean) || [];
  let profiles = null;

  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_plan, subscription_status')
      .in('id', userIds);
    profiles = data;
  }

  // Merge profiles with referrals
  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const recentReferrals = rawReferrals?.map(ref => ({
    ...ref,
    referred_user: profilesMap.get(ref.referred_user_id) || null
  })) || [];

  const { data: recentCommissions } = await supabase
    .from('commissions')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://dtfeditor.com'}/?ref=${affiliate.referral_code}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <AffiliateDashboard
          initialData={{
            affiliate,
            stats,
            recentReferrals: recentReferrals || [],
            recentCommissions: recentCommissions || [],
            payouts: payouts || [],
            referralLink
          }}
        />
      </div>
    </div>
  );
}