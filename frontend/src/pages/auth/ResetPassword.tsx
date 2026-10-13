import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordFormData } from '../../schemas/auth.schema';
import { authApi } from '../../api/auth';
import { getFriendlyErrorMessage } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GraduationCap, KeyRound, Lock, ArrowLeft, Mail } from '../../components/icons';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';

export const ResetPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.resetPassword(data);
      toast.success('Password successfully reset! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121211] text-gray-100 flex flex-col justify-center items-center px-4 py-12 relative selection:bg-brand-600 selection:text-white">
      <div className="absolute top-6 right-6">
        <ThemeToggle size="md" />
      </div>

      <Link to="/" className="flex items-center space-x-2.5 mb-8 group">
        <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-lg transition-transform">
          <GraduationCap className="w-5 h-5" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-white">
          Prep<span className="text-brand-400">AI</span>
        </span>
      </Link>

      <Card className="w-full max-w-md p-8 bg-[#171716] border border-gray-800">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Set new password</h2>
          <p className="text-xs text-gray-400 mt-1">Enter your verification code and choose a secure new password</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@college.edu"
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Verification OTP"
            placeholder="6-digit code"
            autoComplete="one-time-code"
            leftIcon={<KeyRound className="w-4 h-4" />}
            error={errors.otp?.message}
            {...register('otp')}
          />

          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Update Password & Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <Link to="/login" className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};
