import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loginWithEmail } from '@/services/authService';
import { getDashboardPath } from '@/utils/roleRedirect';
import { isStudentRole } from '@/utils/roles';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await loginWithEmail({
        email: data.email,
        password: data.password,
      });

      const resData = response?.data || response;
      const user = resData.user || resData.admin || resData.faculty;
      const resolvedRole = resData.role || user?.role;

      if (!user || !resolvedRole) {
        throw new Error('Unable to resolve account role. Please contact support.');
      }
      
      login(user, resolvedRole);
      toast.success(response?.message || 'Logged in successfully!');

      if (resData.forcePasswordChange || user.isFirstLogin) {
        navigate('/force-change-password');
        return;
      }

      if (isStudentRole(resolvedRole) && !user.isOnboarded) {
        navigate('/onboarding');
        return;
      }

      navigate(getDashboardPath(resolvedRole));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to login. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[var(--bg-card)] p-8 shadow-xl border border-[var(--border)]">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[var(--text-h)] font-heading tracking-tight">
            Welcome to Unisphere
          </h2>
          <p className="mt-2 text-sm text-[var(--text)]">
            Log in with your email to access your dashboard
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
                Email Address
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="Enter your work or institute email"
                error={errors.email?.message}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[var(--text-h)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
      </div>
    </div>
  );
}
