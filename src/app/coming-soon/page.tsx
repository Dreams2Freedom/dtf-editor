'use client';

import { useState, useEffect } from 'react';
import { Crown, Mail, Sparkles, Zap, Scissors, Upload } from 'lucide-react';
import Image from 'next/image';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer - set your launch date here
  const launchDate = new Date('2025-09-01T00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = launchDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/coming-soon/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setEmail('');
      } else {
        alert(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      alert('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-2">
            <Crown className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">DTF Editor</span>
          </div>
        </div>

        {/* Main content */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Something Amazing is
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {' '}
              Coming Soon
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-12">
            The ultimate AI-powered platform for creating professional DTF
            transfers. Transform your designs with one-click background removal,
            AI upscaling, and instant vectorization.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">AI Upscaling</h3>
              <p className="text-gray-600 text-sm">
                Enhance image quality up to 4x with AI-powered upscaling
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <Scissors className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Background Removal
              </h3>
              <p className="text-gray-600 text-sm">
                Professional background removal in seconds
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">
                Instant Vectorization
              </h3>
              <p className="text-gray-600 text-sm">
                Convert images to scalable vectors instantly
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Launching In
            </h2>
            <div className="flex justify-center space-x-4">
              <div className="bg-white rounded-lg shadow-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.days}
                </div>
                <div className="text-sm text-gray-600">Days</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.hours}
                </div>
                <div className="text-sm text-gray-600">Hours</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.minutes}
                </div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 min-w-[80px]">
                <div className="text-3xl font-bold text-blue-600">
                  {timeLeft.seconds}
                </div>
                <div className="text-sm text-gray-600">Seconds</div>
              </div>
            </div>
          </div>

          {/* Email signup */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Get Early Access
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to know when we launch and get exclusive early bird
              pricing!
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Subscribing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Sparkles className="mr-2 h-5 w-5" />
                      Get Early Access
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  You're on the list!
                </h4>
                <p className="text-gray-600">
                  We'll notify you as soon as we launch.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-600 text-sm">
            <p>&copy; 2025 DTF Editor. All rights reserved.</p>
            <div className="mt-4 space-x-6">
              <a
                href="/privacy"
                className="hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="mailto:support@dtfeditor.com"
                className="hover:text-gray-900 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
