'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Clock, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { supportService } from '@/services/support';
import { toast } from 'react-hot-toast';
import { PageHero } from '@/components/public/PageHero';

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (user) {
        // Logged in user - create ticket directly
        await supportService.createTicket({
          subject: formData.subject,
          message: formData.message,
          priority: 'medium',
        });
        setSubmitted(true);
        toast.success('Support ticket created successfully!');
      } else {
        // Guest user - create ticket with provided details
        const response = await fetch('/api/support/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit message');
        }

        setSubmitted(true);
        toast.success('Message sent successfully!');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Message Sent!
          </h2>
          <p className="text-gray-600 mb-8">
            Thank you for contacting us. We&apos;ll get back to you within 24 hours.
          </p>
          {user ? (
            <Button onClick={() => router.push('/support')}>
              View Your Tickets
            </Button>
          ) : (
            <Button onClick={() => router.push('/')}>Return Home</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        heading="Get in touch"
        subheading="Have a question or need help? Our support team is here to assist you."
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl p-6 lg:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Send us a message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Your Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={e =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Subject
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="How can we help you?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={e =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Please describe your question or issue in detail..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {user
                      ? 'Your message will create a support ticket.'
                      : "We'll respond to your email address."}
                  </p>
                  <Button type="submit" loading={loading}>
                    {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Info card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contact info
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Response time</p>
                    <p className="text-sm text-gray-500">
                      Usually within 12 hours
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Email</p>
                    <p className="text-sm text-gray-500">
                      support@dtfeditor.com
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">FAQ</p>
                    <Link
                      href="/faq"
                      className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                    >
                      Check our FAQ first
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">
                Before you contact us
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                You might find quick answers in our:
              </p>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/faq"
                    className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                  >
                    Frequently Asked Questions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                  >
                    Support Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
