import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCircle, KeyRound, Mail, BookOpen, Fingerprint, CalendarDays, ShieldCheck, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { changeFacultyPassword, getFacultyProfile, updateFacultyProfile } from '@/services/authService';

export default function FacultyProfilePage() {
  useDocumentTitle('My Profile');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    officeHours: user?.officeHours || ''
  });

  // Fetch full profile details
  const { data: profile, isLoading } = useQuery({
    queryKey: ['faculty-profile'],
    queryFn: () => getFacultyProfile(),
  });

  useEffect(() => {
    if (!profile) return;
    setProfileData({
      name: profile.name || '',
      phone: profile.phone || '',
      officeHours: profile.officeHours || '',
    });
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => updateFacultyProfile(data),
    onSuccess: (response) => {
      toast.success('Profile updated successfully');
      queryClient.setQueryData(['faculty-profile'], response);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => changeFacultyPassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    passwordMutation.mutate(passwords);
  };

  const handleProfileChange = (e) => {
    setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] w-full rounded-3xl md:col-span-1" />
          <Skeleton className="h-[500px] w-full rounded-3xl md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm relative">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-[var(--bg-card)] p-1.5 shadow-md">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-heading font-bold text-4xl shadow-inner">
                {profile?.name?.charAt(0) || user?.name?.charAt(0) || '?'}
              </div>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-bold rounded-lg uppercase tracking-wider shadow-sm">
              Faculty Advisor
            </span>
          </div>
          
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-[var(--text-h)]">
              {profile?.name || user?.name}
            </h1>
            <p className="text-[var(--text)] font-medium mt-1 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Emp ID: {profile?.employeeId || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Read-Only Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-[var(--text-h)] mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              System Data
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2 break-all">
                  <Mail className="w-4 h-4 text-indigo-500 opacity-70 shrink-0" />
                  {profile?.email}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500 opacity-70 shrink-0" />
                  {profile?.department || 'Not Assigned'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Designation</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-indigo-500 opacity-70 shrink-0" />
                  {profile?.designation || 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-1">Joined Date</p>
                <p className="text-sm text-[var(--text-h)] font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-500 opacity-70 shrink-0" />
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Password */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-[var(--text-h)] mb-1 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-[var(--primary)]" />
              Edit Profile
            </h3>
            <p className="text-sm text-[var(--text)] mb-6">
              Update your personal contact details and office hours.
            </p>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)]">Full Name</label>
                <Input 
                  type="text" 
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)] flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[var(--text)]" /> Phone Number
                </label>
                <Input 
                  type="tel" 
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-h)] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--text)]" /> Office Hours
                </label>
                <Input 
                  type="text" 
                  name="officeHours"
                  value={profileData.officeHours}
                  onChange={handleProfileChange}
                  placeholder="e.g. Mon & Wed 2PM - 4PM"
                />
              </div>
              
              <Button 
                type="submit" 
                isLoading={updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                Save Changes
              </Button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-[var(--text-h)] mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
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
                variant="secondary"
                isLoading={passwordMutation.isPending}
                className="w-full sm:w-auto hover:border-amber-500 hover:text-amber-500 transition-colors"
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
