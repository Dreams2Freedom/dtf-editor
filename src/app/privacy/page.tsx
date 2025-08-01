'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Shield, Mail, Lock, Database, Globe, Clock, Users, AlertCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 30, 2025';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[{ label: 'Privacy Policy' }]} />
          </div>
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <Shield className="h-16 w-16 text-primary-blue" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-gray-500 mt-4">Last updated: {lastUpdated}</p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-600 mb-4">
                  DTF Editor ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you use our AI-powered 
                  image processing service for Direct to Film (DTF) printing.
                </p>
                <p className="text-gray-600">
                  By using our service, you agree to the collection and use of information in accordance with this 
                  policy. If you do not agree with the terms of this privacy policy, please do not access the service.
                </p>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Database className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                      <li>Email address (required for account creation)</li>
                      <li>Name (optional, for personalization)</li>
                      <li>Company name (optional)</li>
                      <li>Phone number (optional)</li>
                      <li>Billing information (processed securely through Stripe)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Usage Data</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                      <li>Image processing history and preferences</li>
                      <li>Credit usage and transaction history</li>
                      <li>Service usage patterns and statistics</li>
                      <li>Device and browser information</li>
                      <li>IP address and location data</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Uploaded Content</h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                      <li>Images you upload for processing</li>
                      <li>Processed images and results</li>
                      <li>Metadata associated with your images</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How We Use Your Information */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Users className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
                </div>
                
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>To provide and maintain our image processing services</li>
                  <li>To process your transactions and manage your subscription</li>
                  <li>To send you service updates and important notifications</li>
                  <li>To improve our AI models and service quality</li>
                  <li>To provide customer support and respond to your requests</li>
                  <li>To detect and prevent fraud, abuse, or security issues</li>
                  <li>To comply with legal obligations and enforce our terms</li>
                  <li>To analyze usage patterns and optimize user experience</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Storage and Security */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Lock className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Data Storage and Security</h2>
                </div>
                
                <div className="space-y-4 text-gray-600">
                  <p>
                    We implement industry-standard security measures to protect your personal information:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>All data is encrypted in transit using SSL/TLS protocols</li>
                    <li>Sensitive data is encrypted at rest in our databases</li>
                    <li>Access to personal data is restricted to authorized personnel only</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>Secure cloud infrastructure with data backups</li>
                  </ul>
                  <p className="mt-4">
                    Your images are stored securely in our cloud storage system and are only accessible to you. 
                    We retain processed images for 30 days to allow you to re-download them, after which they 
                    are automatically deleted.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Third-Party Services */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Globe className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Third-Party Services</h2>
                </div>
                
                <p className="text-gray-600 mb-4">
                  We use trusted third-party services to provide our functionality:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  <li><strong>OpenAI:</strong> AI-powered image generation</li>
                  <li><strong>Deep-Image.ai:</strong> Image upscaling services</li>
                  <li><strong>ClippingMagic:</strong> Background removal services</li>
                  <li><strong>Vectorizer.ai:</strong> Image vectorization services</li>
                  <li><strong>Railway:</strong> Application hosting and deployment</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  Each of these services has their own privacy policy and data handling practices. We only 
                  share the minimum necessary information required to provide the requested service.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Shield className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Your Rights</h2>
                </div>
                
                <p className="text-gray-600 mb-4">You have the following rights regarding your personal data:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Objection:</strong> Object to certain uses of your data</li>
                  <li><strong>Restriction:</strong> Request limited processing of your data</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  To exercise any of these rights, please contact us at privacy@dtfeditor.com
                </p>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Clock className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Data Retention</h2>
                </div>
                
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Account information: Retained while your account is active</li>
                  <li>Processed images: Automatically deleted after 30 days</li>
                  <li>Transaction records: Retained for 7 years for tax compliance</li>
                  <li>Usage logs: Retained for 90 days for security and debugging</li>
                  <li>Marketing preferences: Updated immediately upon request</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  When you delete your account, we remove your personal information within 30 days, except 
                  where we are required to retain it for legal or regulatory purposes.
                </p>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Children's Privacy</h2>
                </div>
                
                <p className="text-gray-600">
                  Our service is not intended for children under 18 years of age. We do not knowingly collect 
                  personal information from children. If you are a parent or guardian and believe your child 
                  has provided us with personal information, please contact us immediately.
                </p>
              </CardContent>
            </Card>

            {/* International Data Transfers */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Globe className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">International Data Transfers</h2>
                </div>
                
                <p className="text-gray-600">
                  Your information may be transferred to and processed in countries other than your country of 
                  residence. These countries may have data protection laws that are different from the laws of 
                  your country. We ensure appropriate safeguards are in place to protect your information in 
                  accordance with this privacy policy.
                </p>
              </CardContent>
            </Card>

            {/* Updates to This Policy */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
                <p className="text-gray-600">
                  We may update this privacy policy from time to time. We will notify you of any changes by 
                  posting the new privacy policy on this page and updating the "Last updated" date. For 
                  significant changes, we will provide additional notice via email or through the service.
                </p>
              </CardContent>
            </Card>

            {/* Contact Us */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Mail className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                </div>
                
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@dtfeditor.com<br />
                    <strong>Support:</strong> support@dtfeditor.com<br />
                    <strong>Address:</strong> DTF Editor, Inc.<br />
                    123 Business Street, Suite 100<br />
                    City, State 12345<br />
                    United States
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}