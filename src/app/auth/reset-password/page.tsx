import { AuthLayout } from '@/components/layout/AuthLayout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
