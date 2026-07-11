import { PageHero } from '@/components/public/PageHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — DTF Editor',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 30, 2025';

  return (
    <div className="min-h-screen bg-white">
      <PageHero heading="Privacy Policy" />
      <p className="text-sm text-gray-400 text-center mb-8">
        Last updated: {lastUpdated}
      </p>

      <div className="prose prose-gray max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <h2>Introduction</h2>
        <p>
          DTF Editor (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
          is committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your information when you
          use our AI-powered image processing service for Direct to Film (DTF)
          printing.
        </p>
        <p>
          By using our service, you agree to the collection and use of
          information in accordance with this policy. If you do not agree with
          the terms of this privacy policy, please do not access the service.
        </p>

        {/* Information We Collect */}
        <h2>Information We Collect</h2>

        <h3>Personal Information</h3>
        <ul>
          <li>Email address (required for account creation)</li>
          <li>Name (optional, for personalization)</li>
          <li>Company name (optional)</li>
          <li>Phone number (optional)</li>
          <li>Billing information (processed securely through Stripe)</li>
        </ul>

        <h3>Usage Data</h3>
        <ul>
          <li>Image processing history and preferences</li>
          <li>Credit usage and transaction history</li>
          <li>Service usage patterns and statistics</li>
          <li>Device and browser information</li>
          <li>IP address and location data</li>
        </ul>

        <h3>Uploaded Content</h3>
        <ul>
          <li>Images you upload for processing</li>
          <li>Processed images and results</li>
          <li>Metadata associated with your images</li>
        </ul>

        {/* How We Use Your Information */}
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain our image processing services</li>
          <li>To process your transactions and manage your subscription</li>
          <li>To send you service updates and important notifications</li>
          <li>To improve our AI models and service quality</li>
          <li>To provide customer support and respond to your requests</li>
          <li>To detect and prevent fraud, abuse, or security issues</li>
          <li>To comply with legal obligations and enforce our terms</li>
          <li>To analyze usage patterns and optimize user experience</li>
        </ul>

        {/* Data Storage and Security */}
        <h2>Data Storage and Security</h2>
        <p>
          We implement industry-standard security measures to protect your
          personal information:
        </p>
        <ul>
          <li>All data is encrypted in transit using SSL/TLS protocols</li>
          <li>Sensitive data is encrypted at rest in our databases</li>
          <li>
            Access to personal data is restricted to authorized personnel only
          </li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Secure cloud infrastructure with data backups</li>
        </ul>
        <p>
          Your images are stored securely in our cloud storage system and are
          only accessible to you. We retain processed images for 30 days to
          allow you to re-download them, after which they are automatically
          deleted.
        </p>

        {/* Third-Party Services */}
        <h2>Third-Party Services</h2>
        <p>We use trusted third-party services to provide our functionality:</p>
        <ul>
          <li>
            <strong>Stripe:</strong> Payment processing (PCI-DSS compliant)
          </li>
          <li>
            <strong>Supabase:</strong> Database and authentication services
          </li>
          <li>
            <strong>OpenAI:</strong> AI-powered image generation
          </li>
          <li>
            <strong>Deep-Image.ai:</strong> Image upscaling services
          </li>
          <li>
            <strong>ClippingMagic:</strong> Background removal services
          </li>
          <li>
            <strong>Vectorizer.ai:</strong> Image vectorization services
          </li>
          <li>
            <strong>Railway:</strong> Application hosting and deployment
          </li>
        </ul>
        <p>
          Each of these services has their own privacy policy and data handling
          practices. We only share the minimum necessary information required to
          provide the requested service.
        </p>

        {/* Your Rights */}
        <h2>Your Rights</h2>
        <p>You have the following rights regarding your personal data:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of your personal data
          </li>
          <li>
            <strong>Correction:</strong> Update or correct inaccurate
            information
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your account and data
          </li>
          <li>
            <strong>Portability:</strong> Receive your data in a portable format
          </li>
          <li>
            <strong>Objection:</strong> Object to certain uses of your data
          </li>
          <li>
            <strong>Restriction:</strong> Request limited processing of your
            data
          </li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at
          privacy@dtfeditor.com
        </p>

        {/* Data Retention */}
        <h2>Data Retention</h2>
        <ul>
          <li>Account information: Retained while your account is active</li>
          <li>Processed images: Automatically deleted after 30 days</li>
          <li>Transaction records: Retained for 7 years for tax compliance</li>
          <li>Usage logs: Retained for 90 days for security and debugging</li>
          <li>Marketing preferences: Updated immediately upon request</li>
        </ul>
        <p>
          When you delete your account, we remove your personal information
          within 30 days, except where we are required to retain it for legal or
          regulatory purposes.
        </p>

        {/* Children's Privacy */}
        <h2>Children&apos;s Privacy</h2>
        <p>
          Our service is not intended for children under 18 years of age. We do
          not knowingly collect personal information from children. If you are a
          parent or guardian and believe your child has provided us with
          personal information, please contact us immediately.
        </p>

        {/* International Data Transfers */}
        <h2>International Data Transfers</h2>
        <p>
          Your information may be transferred to and processed in countries
          other than your country of residence. These countries may have data
          protection laws that are different from the laws of your country. We
          ensure appropriate safeguards are in place to protect your information
          in accordance with this privacy policy.
        </p>

        {/* Updates to This Policy */}
        <h2>Updates to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify
          you of any changes by posting the new privacy policy on this page and
          updating the &ldquo;Last updated&rdquo; date. For significant changes,
          we will provide additional notice via email or through the service.
        </p>

        {/* Contact Us */}
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us:
        </p>
        <p>
          <strong>Email:</strong> privacy@dtfeditor.com
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
