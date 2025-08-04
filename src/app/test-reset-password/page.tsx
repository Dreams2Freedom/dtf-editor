'use client';

import { useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function TestResetPassword() {
  const [email, setEmail] = useState('shannonherod@gmail.com');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleResetPassword = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const supabase = createClientSupabaseClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setStatus('error');
        setMessage(`Error: ${error.message}`);
      } else {
        setStatus('success');
        setMessage('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Test Password Reset</h1>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            
            <Button
              onClick={handleResetPassword}
              disabled={status === 'loading'}
              className="w-full"
            >
              {status === 'loading' ? 'Sending...' : 'Send Reset Email'}
            </Button>
            
            {message && (
              <div className={`p-4 rounded-lg ${
                status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Enter your email address</li>
            <li>Click "Send Reset Email"</li>
            <li>Check your inbox for a password reset link</li>
            <li>Follow the link to set a new password</li>
            <li>Try logging in with your new password</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}