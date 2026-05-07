import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserCircle, KeyRound, Mail, BookOpen, Fingerprint, CalendarDays, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { changeStudentPassword, getStudentProfile } from '@/services/authService';

export default function StudentProfilePage() {
  useDocumentTitle('My Profile');
  const { user } = useAuth();
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch full profile details
  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => getStudentProfile(),
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => changeStudentPassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to change password');
    }
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    passwordMutation.mutate(passwords);
  };

  const handlePasswordChange = (e) => {
    setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-3xl md:col-span-1" />
          <Skeleton className="h-96 w-full rounded-3xl md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm relative">
        <div className="h-32 bg-gradient-to-r from-[var(--primary)] to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-[var(--bg-card)] p-1.5 shadow-md">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-white font-heading font-bold text-4xl shadow-inner">
                {profile?.name?.charAt(0) || user?.name?.charAt(0) || '?'}
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm">
              Student
            </span>
          </div>
          
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-[var(--text-h)]">
              {profile?.name || user?.name}
            </h1>
            <p className="text-[var(--text)] font-medium mt-1 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              {profile?.rollNo || 'No Roll Number'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-[var(--text-h)] mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-[var(--primary)]" />
              Account Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--primary)] opacity-70" />
                  {profile?.email}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--primary)] opacity-70" />
                  {profile?.department || 'Not Assigned'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Joined Date</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[var(--primary)] opacity-70" />
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Account Status</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500 opacity-70" />
                  {profile?.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security/Settings */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-[var(--text-h)] mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[var(--primary)]" />
              Change Password
            </h3>
            <p className="text-sm text-[var(--text)] mb-6">
              Ensure your account is using a long, random password to stay secure.
            </p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)]">Current Password</label>
                <Input 
                  type="password" 
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)]">New Password</label>
                <Input 
                  type="password" 
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)]">Confirm New Password</label>
                <Input 
                  type="password" 
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                isLoading={passwordMutation.isPending}
                className="w-full sm:w-auto"
              >
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
