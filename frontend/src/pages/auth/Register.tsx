import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '../../schemas/auth.schema';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GraduationCap, User, Mail, Lock, Building, BookOpen, Calendar } from '../../components/icons';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      collegeName: '',
      branch: 'Computer Science & Engineering',
      graduationYear: 2026,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      setAuth(res.user, res.token, res.refreshToken);
      toast.success('Registration successful! Welcome to PrepAI.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E0D] text-[#F2F2EF] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-brand-600 selection:text-white">
      {/* Ambient background glows */}

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle size="md" />
      </div>

      <Link to="/" className="flex items-center space-x-2.5 mb-8 group relative z-10">
        <div className="w-11 h-11 rounded-lg bg-brand-600 flex items-center justify-center text-white transition-transform duration-200">
          <GraduationCap className="w-6 h-6" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-white">
          Prep<span className="text-gradient">AI</span>
        </span>
      </Link>

      <Card variant="premium" className="w-full max-w-xl p-8 sm:p-10 relative z-10 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(74,118,217,0.12)]">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your student profile</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time profile creation directly in MongoDB database</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Your full name"
              autoComplete="name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="College Email"
              type="email"
              placeholder="you@college.edu"
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="College / University Name"
              placeholder="Your college"
              autoComplete="organization"
              leftIcon={<Building className="w-4 h-4" />}
              error={errors.collegeName?.message}
              {...register('collegeName')}
            />
            <Input
              label="Branch / Major"
              placeholder="Your branch"
              autoComplete="off"
              leftIcon={<BookOpen className="w-4 h-4" />}
              error={errors.branch?.message}
              {...register('branch')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Graduation Year"
              type="number"
              placeholder="Graduation year"
              autoComplete="off"
              leftIcon={<Calendar className="w-4 h-4" />}
              error={errors.graduationYear?.message}
              {...register('graduationYear', { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password (min 8 chars)"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4"
          >
            Complete Registration & Start Preparing
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#353532]/80 text-center text-xs text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 hover:underline font-semibold">
            Sign in here
          </Link>
        </div>
      </Card>
    </div>
  );
};

