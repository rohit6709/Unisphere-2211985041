import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { changePasswordByRole } from '@/services/authService';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ForceChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, role, updateUserData } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await changePasswordByRole(role || 'student', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      toast.success(response?.message || 'Password updated successfully!');
      
      // Update context so isFirstLogin is false
      updateUserData({ isFirstLogin: false });

      // Move to next step
      if (!user?.isOnboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard/student');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[var(--bg-card)] p-8 shadow-xl border border-[var(--border)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-h)]">
            Change Default Password
          </h2>
          <p className="mt-2 text-sm text-[var(--text)]">
            For security reasons, you must change your password on first login.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
              Current Password
            </label>
            <Input
              {...register('currentPassword')}
              type="password"
              placeholder="Enter current default password"
              error={errors.currentPassword?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
              New Password
            </label>
            <Input
              {...register('newPassword')}
              type="password"
              placeholder="At least 6 characters"
              error={errors.newPassword?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
              Confirm New Password
            </label>
            <Input
              {...register('confirmPassword')}
              type="password"
              placeholder="Retype new password"
              error={errors.confirmPassword?.message}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
