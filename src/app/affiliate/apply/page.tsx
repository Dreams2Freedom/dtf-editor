import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AffiliateApplicationForm } from '@/components/affiliate/AffiliateApplicationForm';
import { getAffiliateByUserId } from '@/services/affiliate';

export default async function AffiliateApplyPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has an affiliate account
  const existingAffiliate = await getAffiliateByUserId(user.id);

  if (existingAffiliate) {
    // Already an affiliate, redirect to dashboard
    redirect('/dashboard/affiliate');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <AffiliateApplicationForm userId={user.id} />
    </div>
  );
}