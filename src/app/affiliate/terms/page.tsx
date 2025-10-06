import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function AffiliateTermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <Card className="p-8">
          <div className="flex items-center mb-6">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold">
              Affiliate Program Terms & Conditions
            </h1>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              Effective Date: January 1, 2025 | Last Updated: January 2, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                1. Program Overview
              </h2>
              <p className="mb-4">
                The DTF Editor Affiliate Program ("Program") allows approved
                partners ("Affiliates") to earn commissions by referring new
                customers to DTF Editor's services. By participating in this
                Program, you agree to these Terms and Conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                2. Commission Structure
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">
                  2.1 Base Commission Rates
                </h3>
                <ul className="list-disc ml-6 space-y-1">
                  <li>
                    <strong>Standard Tier:</strong> 20% recurring commission for
                    24 months, then 10% lifetime
                  </li>
                  <li>
                    <strong>Silver Tier:</strong> 22% recurring commission for
                    24 months, then 10% lifetime (requires $500/mo MRR)
                  </li>
                  <li>
                    <strong>Gold Tier:</strong> 25% recurring commission for 24
                    months, then 10% lifetime (requires $1,500/mo MRR)
                  </li>
                </ul>
              </div>

              <h3 className="font-semibold mb-2">2.2 Commission Eligibility</h3>
              <ul className="list-disc ml-6 space-y-1 mb-4">
                <li>
                  Commissions are earned on successful payments from referred
                  customers
                </li>
                <li>
                  Self-referrals are strictly prohibited and will result in
                  account termination
                </li>
                <li>
                  Commissions are subject to a 30-day hold period for refund
                  protection
                </li>
                <li>
                  Refunded or charged-back payments will result in commission
                  reversal
                </li>
              </ul>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">
                  2.3 Commission Modification Rights
                </h3>
                <p className="text-sm">
                  <strong>
                    DTF Editor reserves the absolute right to modify, adjust, or
                    terminate commission structures, rates, and terms at any
                    time, with or without notice.
                  </strong>{' '}
                  Changes may apply to existing and future commissions.
                  Continued participation constitutes acceptance of modified
                  terms.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Payment Terms</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Minimum Payout:</strong> $50 USD
                </li>
                <li>
                  <strong>Payment Methods:</strong> PayPal or Check (US only)
                </li>
                <li>
                  <strong>Payment Schedule:</strong> Manual processing,
                  typically within 7-14 business days of request
                </li>
                <li>
                  <strong>Tax Requirements:</strong> W-9 (US) or W-8BEN
                  (International) must be on file before payouts
                </li>
                <li>
                  <strong>1099-MISC:</strong> Issued for US affiliates earning
                  $600+ annually
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                4. Referral Tracking
              </h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Cookie Duration:</strong> 30 days from initial click
                </li>
                <li>
                  <strong>Attribution:</strong> Last-click attribution model
                </li>
                <li>
                  <strong>Tracking Method:</strong> Cookies and server-side
                  tracking via referral codes
                </li>
                <li>Affiliates must use approved tracking links only</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                5. Promotional Guidelines
              </h2>
              <h3 className="font-semibold mb-2">5.1 Approved Methods</h3>
              <ul className="list-disc ml-6 space-y-1 mb-4">
                <li>Content marketing (blogs, videos, tutorials)</li>
                <li>Social media promotion</li>
                <li>Email marketing to your own list</li>
                <li>Paid advertising (with restrictions)</li>
              </ul>

              <h3 className="font-semibold mb-2">5.2 Prohibited Activities</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Spam or unsolicited emails</li>
                <li>Misleading or false advertising</li>
                <li>Trademark bidding on "DTF Editor" or variations</li>
                <li>Cookie stuffing or forced clicks</li>
                <li>Incentivized traffic without disclosure</li>
                <li>Adult, violent, or discriminatory content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                6. Intellectual Property
              </h2>
              <p className="mb-4">
                Affiliates are granted a limited, non-exclusive, revocable
                license to use DTF Editor's marketing materials and trademarks
                solely for promoting the Program. All intellectual property
                rights remain with DTF Editor (Dreams2Freedom LLC).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                7. Data Protection & Privacy
              </h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  Affiliates must comply with all applicable data protection
                  laws (GDPR, CCPA, etc.)
                </li>
                <li>
                  Customer data obtained through referrals belongs to DTF Editor
                </li>
                <li>
                  Affiliates may not collect or store customer payment
                  information
                </li>
                <li>Tax information is encrypted and stored securely</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Termination</h2>
              <p className="mb-4">
                Either party may terminate participation with 30 days notice.
                DTF Editor reserves the right to immediately terminate accounts
                for:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Violation of these terms</li>
                <li>Fraudulent or suspicious activity</li>
                <li>Damage to DTF Editor's reputation</li>
                <li>Inactivity exceeding 180 days</li>
              </ul>
              <p className="mt-4">
                Upon termination, unpaid commissions above the minimum threshold
                will be paid within 60 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                9. Limitation of Liability
              </h2>
              <p className="mb-4">
                DTF EDITOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT
                LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
                INTANGIBLE LOSSES.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                10. Indemnification
              </h2>
              <p className="mb-4">
                Affiliate agrees to indemnify and hold harmless DTF Editor,
                Dreams2Freedom LLC, and its officers, directors, employees, and
                agents from any claims, damages, losses, or expenses arising
                from Affiliate's participation in the Program.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Governing Law</h2>
              <p className="mb-4">
                These Terms are governed by the laws of the State of Florida,
                United States. Any disputes shall be resolved in the courts of
                Hernando County, Florida.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                12. Contact Information
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="mb-2">
                  <strong>Dreams2Freedom LLC</strong>
                </p>
                <p className="mb-2">
                  18865 Cortez Blvd
                  <br />
                  Brooksville, FL 34601
                </p>
                <p className="mb-2">Email: affiliates@dtfeditor.com</p>
                <p>Website: https://dtfeditor.com</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                13. Acceptance of Terms
              </h2>
              <p className="mb-4">
                By participating in the DTF Editor Affiliate Program, you
                acknowledge that you have read, understood, and agree to be
                bound by these Terms and Conditions.
              </p>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm font-semibold">
                  13.2 Modification Rights: DTF Editor reserves the right to
                  modify these terms at any time. Continued participation after
                  modifications constitutes acceptance.
                </p>
              </div>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                © 2025 Dreams2Freedom LLC. All rights reserved.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
