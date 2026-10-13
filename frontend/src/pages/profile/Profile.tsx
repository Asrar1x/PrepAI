import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userProfileSchema } from '../../schemas/user.schema';
import { useAuthStore } from '../../store/authStore';
import { apiClient, getFriendlyErrorMessage } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  User,
  Mail,
  Building,
  BookOpen,
  Calendar,
  Briefcase,
  Save,
  Bell
} from '../../components/icons';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: user?.name || '',
      collegeName: user?.collegeName || '',
      branch: user?.branch || 'Computer Science & Engineering',
      graduationYear: user?.graduationYear || 2026,
      targetRole: user?.targetRoles?.[0] || 'Software Development Engineer',
      targetCompany: user?.targetCompanies?.[0] || '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      await apiClient.put('/users/me/profile', {
        fullName: data.name,
        collegeName: data.collegeName,
        branch: data.branch,
        graduationYear: Number(data.graduationYear),
        targetRoles: [data.targetRole],
        targetCompanies: data.targetCompany ? [data.targetCompany] : [],
      });
      updateUser({
        name: data.name,
        collegeName: data.collegeName,
        branch: data.branch,
        graduationYear: Number(data.graduationYear),
        targetRoles: [data.targetRole],
        targetCompanies: data.targetCompany ? [data.targetCompany] : [],
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-lg bg-brand-600 flex items-center justify-center text-white text-2xl font-bold border border-brand-400/30 shadow-lg">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{user?.name || 'Student Candidate'}</h1>
              <Badge variant="accent">Class of {user?.graduationYear || 2026}</Badge>
            </div>
            <p className="text-xs text-gray-400">
              {user?.collegeName || 'Engineering Campus'} • {user?.branch || 'CS'}
            </p>
          </div>
        </div>

        <Link to="/profile/notifications">
          <Button variant="secondary" size="sm" leftIcon={<Bell className="w-4 h-4 text-brand-400" />}>
            Notification Settings
          </Button>
        </Link>
      </div>

      {/* Profile Form */}
      <Card className="p-8 bg-[#171716] border-gray-800 space-y-6">
        <div className="border-b border-gray-800 pb-3">
          <h3 className="text-base font-bold text-white">Academic & Placement Preferences</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            These parameters tailor the difficulty of mock interview counter-questions and company aptitude patterns.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message as string}
              {...register('name')}
            />
            <Input
              label="Registered Email (Immutable)"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="College / Institute"
              leftIcon={<Building className="w-4 h-4" />}
              error={errors.collegeName?.message as string}
              {...register('collegeName')}
            />
            <Input
              label="Branch / Specialization"
              leftIcon={<BookOpen className="w-4 h-4" />}
              error={errors.branch?.message as string}
              {...register('branch')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Graduation Year"
              type="number"
              leftIcon={<Calendar className="w-4 h-4" />}
              error={errors.graduationYear?.message as string}
              {...register('graduationYear')}
            />
            <Input
              label="Primary Target Role"
              leftIcon={<Briefcase className="w-4 h-4" />}
              error={errors.targetRole?.message as string}
              {...register('targetRole')}
            />
            <Input
              label="Dream Company"
              leftIcon={<Building className="w-4 h-4" />}
              error={errors.targetCompany?.message as string}
              {...register('targetCompany')}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
