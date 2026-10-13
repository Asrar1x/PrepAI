import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '../../schemas/auth.schema';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GraduationCap, Mail, Lock, Shield } from '../../components/icons';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

const STAFF_ROLES = ['admin', 'super_admin', 'placement_officer', 'recruiter'];

export const Login: React.FC = () => {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'student',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ ...data, role });
      setAuth(res.user, res.token, res.refreshToken);
      toast.success(`Signed in as ${res.user.name}`);
      if (STAFF_ROLES.includes(res.user.role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole: 'student' | 'admin') => {
    setRole(newRole);
    setValue('role', newRole);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0D] text-[#F2F2EF] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-brand-600 selection:text-white">
      {/* Ambient background glows */}

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle size="md" />
      </div>

      {/* Brand Header */}
      <Link to="/" className="flex items-center space-x-2.5 mb-8 group relative z-10">
        <div className="w-11 h-11 rounded-lg bg-brand-600 flex items-center justify-center text-white transition-transform duration-200">
          <GraduationCap className="w-6 h-6" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-white">
          Prep<span className="text-gradient">AI</span>
        </span>
      </Link>

      <Card variant="premium" className="w-full max-w-md p-8 sm:p-9 relative z-10 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(74,118,217,0.12)]">
        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time authentication powered by MongoDB</p>
        </div>

        {/* Role Toggle */}
        <div className="flex p-1 bg-[#141413] rounded-xl border border-[#353532] mb-6">
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'student'
                ? 'bg-brand-600 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'admin'
                ? 'bg-amber-700 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>TPO / Admin</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="College / Academic Email"
            type="email"
            placeholder="you@college.edu"
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1.5">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end pt-1">
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Sign In as {role === 'admin' ? 'Placement Officer' : 'Student'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#353532]/80 text-center text-xs text-gray-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 hover:underline font-semibold">
            Create real student profile
          </Link>
        </div>
      </Card>
    </div>
  );
};

