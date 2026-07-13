'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const linkError = searchParams.get('error');

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [message, setMessage] = useState<string>('');

  const handleResend = async () => {
    if (!email) {
      setStatus('error');
      setMessage(
        'We don’t have your email on this page. Please sign in to resend the link.'
      );
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.alreadyVerified) {
        setStatus('sent');
        setMessage('This email is already verified — you can sign in.');
      } else if (data.success) {
        setStatus('sent');
        setMessage('Sent! Check your inbox (and spam folder) for the link.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Could not resend the link. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not resend the link. Please try again.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#366494]/10">
          <Mail className="h-8 w-8 text-[#366494]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Verify your email
        </h1>

        <p className="mt-3 text-gray-600">
          We sent a verification link{email ? ' to ' : ' to your email address'}
          {email && <span className="font-semibold text-gray-900">{email}</span>}
          . Click the link to activate your account and start using the tools.
        </p>

        {linkError && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {linkError === 'expired'
                ? 'That verification link has expired or was already used. Request a new one below.'
                : 'That verification link was invalid. Request a new one below.'}
            </span>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-5 text-left">
          <p className="text-sm font-medium text-gray-700">
            Didn&rsquo;t get the email?
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Check your spam folder, or resend the link.
          </p>
          <Button
            onClick={handleResend}
            disabled={status === 'sending'}
            className="mt-4 w-full bg-[#366494] hover:bg-[#233E5C] text-white"
          >
            {status === 'sending' ? 'Sending…' : 'Resend verification email'}
          </Button>

          {message && (
            <div
              className={`mt-3 flex items-start gap-2 text-sm ${
                status === 'error' ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {status === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <span>{message}</span>
            </div>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Already verified?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-[#366494] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
