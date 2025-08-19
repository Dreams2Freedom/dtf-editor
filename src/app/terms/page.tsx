'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FileText, AlertCircle, CreditCard, Ban, Scale, Mail, Shield, Clock } from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = 'August 19, 2025';
  const effectiveDate = 'August 19, 2025';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[{ label: 'Terms of Service' }]} />
          </div>
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <FileText className="h-16 w-16 text-primary-blue" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Please read these terms carefully before using DTF Editor services.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {lastUpdated} | Effective: {effectiveDate}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Agreement to Terms */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
                <p className="text-gray-600 mb-4">
                  By accessing or using DTF Editor ("Service"), you agree to be bound by these Terms of Service 
                  ("Terms"). If you disagree with any part of these terms, you do not have permission to access 
                  the Service.
                </p>
                <p className="text-gray-600">
                  These Terms apply to all visitors, users, and others who access or use the Service, including 
                  but not limited to customers using our AI-powered image processing tools for Direct to Film 
                  (DTF) printing applications.
                </p>
              </CardContent>
            </Card>

            {/* Account Registration */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Shield className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">2. Account Registration</h2>
                </div>
                
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>You must provide accurate and complete information during registration</li>
                  <li>You are responsible for maintaining the security of your account credentials</li>
                  <li>You must be at least 18 years old to use our Service</li>
                  <li>You are responsible for all activities that occur under your account</li>
                  <li>You must notify us immediately of any unauthorized access</li>
                  <li>One person or entity may not maintain multiple free accounts</li>
                </ul>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Service Description</h2>
                <p className="text-gray-600 mb-4">
                  DTF Editor provides AI-powered image processing services including:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Image upscaling and enhancement</li>
                  <li>Background removal</li>
                  <li>Image vectorization</li>
                  <li>AI image generation</li>
                  <li>Cloud storage for processed images</li>
                  <li>Credit-based processing system</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  We reserve the right to modify, suspend, or discontinue any part of the Service at any time 
                  without prior notice.
                </p>
              </CardContent>
            </Card>

            {/* Acceptable Use */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <AlertCircle className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">4. Acceptable Use Policy</h2>
                </div>
                
                <p className="text-gray-600 mb-4">You agree NOT to use the Service to:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Upload or process illegal, harmful, or offensive content</li>
                  <li>Infringe on intellectual property rights of others</li>
                  <li>Generate or process content that violates any laws</li>
                  <li>Attempt to bypass security measures or access restrictions</li>
                  <li>Use automated systems or bots without permission</li>
                  <li>Resell or redistribute the Service without authorization</li>
                  <li>Process images containing personal data without consent</li>
                  <li>Create content that is fraudulent or misleading</li>
                </ul>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">5. Payment Terms</h2>
                </div>
                
                <div className="space-y-4 text-gray-600">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Credits and Pricing</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Processing operations consume credits based on the operation type</li>
                      <li>Free tier includes 2 credits per month</li>
                      <li>Paid subscriptions include monthly credit allocations</li>
                      <li>Additional credits can be purchased as needed</li>
                      <li>Credits expire according to plan terms</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Billing</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Subscription fees are billed in advance monthly or annually</li>
                      <li>All payments are processed securely through Stripe</li>
                      <li>Prices are subject to change with 30 days notice</li>
                      <li>You may cancel your subscription at any time</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Refund Policy</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>7-Day Money Back Guarantee:</strong> New subscribers may request a full refund within 7 days of their first subscription</li>
                      <li><strong>Failed Processing:</strong> Credits are automatically refunded if image processing fails due to technical issues</li>
                      <li><strong>Annual Plans:</strong> May be cancelled within 30 days for a pro-rated refund</li>
                      <li><strong>Used Credits:</strong> No refunds for successfully used credits</li>
                      <li><strong>Unused Credits:</strong> Subscription credits expire monthly and do not carry over unless specified in your plan</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Scale className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">6. Intellectual Property</h2>
                </div>
                
                <div className="space-y-4 text-gray-600">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Your Content</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>You retain ownership rights to images you upload</li>
                      <li>You grant us a license to process, store, and display your images</li>
                      <li>You grant us permission to use uploaded and processed images for promotional purposes, including but not limited to:</li>
                      <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                        <li>Marketing materials and advertisements</li>
                        <li>Website galleries and examples</li>
                        <li>Social media posts</li>
                        <li>Case studies and testimonials</li>
                      </ul>
                      <li>You can request removal of your images from promotional materials by contacting support</li>
                      <li>You are responsible for having rights to all uploaded content</li>
                      <li>You warrant that uploaded content does not infringe on third-party rights</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Our Service</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>The Service and its original content remain our property</li>
                      <li>Our trademarks and trade dress may not be used without permission</li>
                      <li>You may not copy or reverse engineer any part of the Service</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy and Data */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Privacy and Data</h2>
                <p className="text-gray-600">
                  Your use of our Service is also governed by our Privacy Policy. By using the Service, you 
                  consent to the collection and use of information as detailed in our Privacy Policy. We are 
                  committed to protecting your privacy and handling your data responsibly.
                </p>
              </CardContent>
            </Card>

            {/* Disclaimers */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Ban className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">8. Disclaimers and Limitations</h2>
                </div>
                
                <div className="space-y-4 text-gray-600">
                  <p className="font-semibold uppercase text-sm">
                    The Service is provided "AS IS" without warranties of any kind.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>We do not guarantee uninterrupted or error-free service</li>
                    <li>Processing results may vary and are not guaranteed</li>
                    <li>We are not liable for any indirect or consequential damages</li>
                    <li>Our total liability is limited to the amount paid in the last 12 months</li>
                    <li>Some jurisdictions do not allow liability limitations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Clock className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">9. Termination</h2>
                </div>
                
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>You may terminate your account at any time through account settings</li>
                  <li>We may suspend or terminate accounts that violate these Terms</li>
                  <li>Upon termination, your right to use the Service ceases immediately</li>
                  <li>Processed images may be deleted 30 days after termination</li>
                  <li>Termination does not affect any outstanding payment obligations</li>
                </ul>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
                <p className="text-gray-600">
                  We reserve the right to modify these Terms at any time. If we make material changes, we will 
                  notify you via email or through the Service at least 30 days before the changes take effect. 
                  Your continued use of the Service after the changes constitutes acceptance of the new Terms.
                </p>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law</h2>
                <p className="text-gray-600">
                  These Terms shall be governed by and construed in accordance with the laws of the United States 
                  and the State of Delaware, without regard to its conflict of law provisions. Any disputes arising 
                  from these Terms will be resolved through binding arbitration in Delaware.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Mail className="h-6 w-6 text-primary-blue mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">12. Contact Information</h2>
                </div>
                
                <p className="text-gray-600 mb-4">
                  For questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> legal@dtfeditor.com<br />
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