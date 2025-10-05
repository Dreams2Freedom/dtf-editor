import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AffiliateSettings } from '@/components/affiliate/AffiliateSettings';
import { getAffiliateByUserId } from '@/services/affiliate';

export default async function AffiliateSettingsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has an affiliate account
  const affiliate = await getAffiliateByUserId(user.id);

  if (!affiliate) {
    redirect('/dashboard/affiliate');
  }

  if (affiliate.status !== 'approved') {
    redirect('/dashboard/affiliate');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <AffiliateSettings affiliate={affiliate} />
      </div>
    </div>
  );
}
