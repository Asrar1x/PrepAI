import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../../schemas/auth.schema';
import { authApi } from '../../api/auth';
import { getFriendlyErrorMessage } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from '../../components/icons';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';

export const ForgotPassword: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('If an account exists for this email, a reset code has been sent.');
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
        {!isSubmitted ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Reset your password</h2>
              <p className="text-xs text-gray-400 mt-1">Enter your registered email address to receive recovery instructions</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Registered College Email"
                type="email"
                placeholder="you@college.edu"
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Send Password Reset OTP
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="flex items-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">OTP Dispatched</h3>
            <p className="text-xs text-gray-400">
              Check your inbox for a 6-digit verification code to reset your account credentials.
            </p>
            <Link to={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}>
              <Button variant="primary" className="w-full mt-2">
                Enter Verification OTP
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <Link to="/login" className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};
