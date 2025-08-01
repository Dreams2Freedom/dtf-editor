import { AuthLayout } from '@/components/layout/AuthLayout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
} 