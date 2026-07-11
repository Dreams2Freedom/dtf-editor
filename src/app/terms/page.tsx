import { PageHero } from '@/components/public/PageHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — DTF Editor',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'August 19, 2025';
  const effectiveDate = 'August 19, 2025';

  return (
    <div className="min-h-screen bg-white">
      <PageHero heading="Terms of Service" />
      <p className="text-sm text-gray-400 text-center mb-8">
        Last updated: {lastUpdated} | Effective: {effectiveDate}
      </p>

      <div className="prose prose-gray max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
        {/* Agreement to Terms */}
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using DTF Editor (&ldquo;Service&rdquo;), you agree to
          be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you
          disagree with any part of these terms, you do not have permission to
          access the Service.
        </p>
        <p>
          These Terms apply to all visitors, users, and others who access or use
          the Service, including but not limited to customers using our
          AI-powered image processing tools for Direct to Film (DTF) printing
          applications.
        </p>

        {/* Account Registration */}
        <h2>2. Account Registration</h2>
        <ul>
          <li>
            You must provide accurate and complete information during
            registration
          </li>
          <li>
            You are responsible for maintaining the security of your account
            credentials
          </li>
          <li>You must be at least 18 years old to use our Service</li>
          <li>
            You are responsible for all activities that occur under your account
          </li>
          <li>You must notify us immediately of any unauthorized access</li>
          <li>One person or entity may not maintain multiple free accounts</li>
        </ul>

        {/* Service Description */}
        <h2>3. Service Description</h2>
        <p>
          DTF Editor provides AI-powered image processing services including:
        </p>
        <ul>
          <li>Image upscaling and enhancement</li>
          <li>Background removal</li>
          <li>Image vectorization</li>
          <li>AI image generation</li>
          <li>Cloud storage for processed images</li>
          <li>Credit-based processing system</li>
        </ul>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of
          the Service at any time without prior notice.
        </p>

        {/* Acceptable Use */}
        <h2>4. Acceptable Use Policy</h2>
        <p>You agree NOT to use the Service to:</p>
        <ul>
          <li>Upload or process illegal, harmful, or offensive content</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Generate or process content that violates any laws</li>
          <li>Attempt to bypass security measures or access restrictions</li>
          <li>Use automated systems or bots without permission</li>
          <li>Resell or redistribute the Service without authorization</li>
          <li>Process images containing personal data without consent</li>
          <li>Create content that is fraudulent or misleading</li>
        </ul>

        {/* Payment Terms */}
        <h2>5. Payment Terms</h2>

        <h3>Credits and Pricing</h3>
        <ul>
          <li>
            Processing operations consume credits based on the operation type
          </li>
          <li>Free tier includes 2 credits per month</li>
          <li>Paid subscriptions include monthly credit allocations</li>
          <li>Additional credits can be purchased as needed</li>
          <li>Credits expire according to plan terms</li>
        </ul>

        <h3>Billing</h3>
        <ul>
          <li>Subscription fees are billed in advance monthly or annually</li>
          <li>All payments are processed securely through Stripe</li>
          <li>Prices are subject to change with 30 days notice</li>
          <li>You may cancel your subscription at any time</li>
        </ul>

        <h3>Refund Policy</h3>
        <ul>
          <li>
            <strong>7-Day Money Back Guarantee:</strong> New subscribers may
            request a full refund within 7 days of their first subscription
          </li>
          <li>
            <strong>Failed Processing:</strong> Credits are automatically
            refunded if image processing fails due to technical issues
          </li>
          <li>
            <strong>Annual Plans:</strong> May be cancelled within 30 days for a
            pro-rated refund
          </li>
          <li>
            <strong>Used Credits:</strong> No refunds for successfully used
            credits
          </li>
          <li>
            <strong>Unused Credits:</strong> Subscription credits expire monthly
            and do not carry over unless specified in your plan
          </li>
        </ul>

        {/* Intellectual Property */}
        <h2>6. Intellectual Property</h2>

        <h3>Your Content</h3>
        <ul>
          <li>You retain ownership rights to images you upload</li>
          <li>
            You grant us a license to process, store, and display your images
          </li>
          <li>
            You grant us permission to use uploaded and processed images for
            promotional purposes, including but not limited to:
            <ul>
              <li>Marketing materials and advertisements</li>
              <li>Website galleries and examples</li>
              <li>Social media posts</li>
              <li>Case studies and testimonials</li>
            </ul>
          </li>
          <li>
            You can request removal of your images from promotional materials by
            contacting support
          </li>
          <li>You are responsible for having rights to all uploaded content</li>
          <li>
            You warrant that uploaded content does not infringe on third-party
            rights
          </li>
        </ul>

        <h3>Our Service</h3>
        <ul>
          <li>The Service and its original content remain our property</li>
          <li>
            Our trademarks and trade dress may not be used without permission
          </li>
          <li>You may not copy or reverse engineer any part of the Service</li>
        </ul>

        {/* Privacy and Data */}
        <h2>7. Privacy and Data</h2>
        <p>
          Your use of our Service is also governed by our Privacy Policy. By
          using the Service, you consent to the collection and use of
          information as detailed in our Privacy Policy. We are committed to
          protecting your privacy and handling your data responsibly.
        </p>

        {/* Disclaimers */}
        <h2>8. Disclaimers and Limitations</h2>
        <p className="font-semibold uppercase text-sm">
          The Service is provided &ldquo;AS IS&rdquo; without warranties of any
          kind.
        </p>
        <ul>
          <li>We do not guarantee uninterrupted or error-free service</li>
          <li>Processing results may vary and are not guaranteed</li>
          <li>We are not liable for any indirect or consequential damages</li>
          <li>
            Our total liability is limited to the amount paid in the last 12
            months
          </li>
          <li>Some jurisdictions do not allow liability limitations</li>
        </ul>

        {/* Termination */}
        <h2>9. Termination</h2>
        <ul>
          <li>
            You may terminate your account at any time through account settings
          </li>
          <li>We may suspend or terminate accounts that violate these Terms</li>
          <li>
            Upon termination, your right to use the Service ceases immediately
          </li>
          <li>Processed images may be deleted 30 days after termination</li>
          <li>
            Termination does not affect any outstanding payment obligations
          </li>
        </ul>

        {/* Changes to Terms */}
        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. If we make
          material changes, we will notify you via email or through the Service
          at least 30 days before the changes take effect. Your continued use of
          the Service after the changes constitutes acceptance of the new Terms.
        </p>

        {/* Governing Law */}
        <h2>11. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the United States and the State of Delaware, without regard to
          its conflict of law provisions. Any disputes arising from these Terms
          will be resolved through binding arbitration in Delaware.
        </p>

        {/* Contact Information */}
        <h2>12. Contact Information</h2>
        <p>For questions about these Terms of Service, please contact us:</p>
        <p>
          <strong>Email:</strong> legal@dtfeditor.com
          <br />
          <strong>Support:</strong> support@dtfeditor.com
          <br />
          <strong>Address:</strong> DTF Editor, Inc.
          <br />
          123 Business Street, Suite 100
          <br />
          City, State 12345
          <br />
          United States
        </p>
      </div>
    </div>
  );
}
