import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  User, 
  Lock, 
  Bell, 
  Camera, 
  Shield, 
  Save, 
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import { api } from '@/api/axios';
import { changePasswordByRole, updateProfileByRole } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/SEO';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/getInitials';

export default function ProfileSettingsPage() {
  const { user, role, updateUserData } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // profile, security, notifications
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    });
  }, [user]);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/api/v1/uploads/image', formData);
      return data.data.url;
    },
    onSuccess: async (url) => {
      await updateProfileByRole(role, { profilePicture: url });
      updateUserData({ profilePicture: url });
      toast.success('Profile picture updated!');
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Upload failed. Please try again.'),
  });

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload) => updateProfileByRole(role, payload),
    onSuccess: (updatedUser) => {
      updateUserData(updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Update failed'),
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (payload) => changePasswordByRole(role, payload),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Password change failed'),
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return toast.error('Please choose a valid image file');
      }
      if (file.size > 5 * 1024 * 1024) return toast.error('File too large (max 5MB)');
      uploadMutation.mutate(file);
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.error('Name is required');
    }
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordData.newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }
    changePasswordMutation.mutate(passwordData);
  };

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: User },
    { id: 'security', name: 'Password & Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <SEO title="Account Settings | Unisphere" />
      
      <div className="flex flex-col md:flex-row gap-12">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
           <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-8 tracking-tighter">Settings</h1>
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black transition-all",
                 activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" 
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
               )}
             >
                <tab.icon className="h-5 w-5" />
                {tab.name}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-950 rounded-[3rem] border border-gray-50 dark:border-gray-900 p-8 md:p-12 shadow-2xl shadow-indigo-500/5">
           
           <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <div
                  key="profile"
                  className="space-y-10"
                >
                   {/* Avatar Upload */}
                   <div className="flex flex-col items-center gap-6">
                      <div className="relative group">
                         <div className="h-32 w-32 rounded-[2.5rem] bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-2xl overflow-hidden flex items-center justify-center text-4xl font-black text-indigo-600">
                            {uploadMutation.isPending ? (
                               <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                               user?.profilePicture ? <img src={user.profilePicture} className="h-full w-full object-cover" /> : getInitials(user?.name)
                            )}
                         </div>
                         <button 
                           onClick={() => fileInputRef.current.click()}
                           className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-all"
                         >
                            <Camera className="h-5 w-5" />
                         </button>
                         <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      </div>
                      <div className="text-center">
                         <h3 className="text-xl font-black text-gray-900 dark:text-white">{user?.name}</h3>
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{role} Profile</p>
                      </div>
                   </div>

                   <form onSubmit={handleProfileSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
                            <input 
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label>
                            <div className="relative">
                               <input 
                                 disabled
                                 value={formData.email}
                                 className="w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm opacity-60 cursor-not-allowed" 
                               />
                               <Shield className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Bio / Description</label>
                         <textarea 
                           value={formData.bio}
                           onChange={(e) => setFormData({...formData, bio: e.target.value})}
                           rows={4}
                           className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none"
                         />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="w-full rounded-2xl h-14 bg-indigo-600 font-black shadow-xl shadow-indigo-500/20"
                      >
                         <Save className="h-5 w-5 mr-2" /> Save Changes
                      </Button>
                   </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div
                  key="security"
                  className="space-y-10"
                >
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Security</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manage your password and account protection.</p>
                   </div>

                   <form onSubmit={handlePasswordSubmit} className="space-y-6">
                      <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Current Password</label>
                            <input 
                              type={showPasswords ? "text" : "password"}
                              required
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm outline-none" 
                           />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">New Password</label>
                            <input 
                              type={showPasswords ? "text" : "password"}
                              required
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm outline-none" 
                           />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Confirm New Password</label>
                            <input 
                              type={showPasswords ? "text" : "password"}
                              required
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm outline-none" 
                           />
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-2">
                         <button 
                           type="button"
                           onClick={() => setShowPasswords(!showPasswords)}
                           className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]"
                         >
                            {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
                         </button>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        className="w-full rounded-2xl h-14 bg-gray-900 dark:bg-white dark:text-black font-black"
                      >
                         Update Password
                      </Button>
                   </form>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div
                  key="notifications"
                  className="space-y-10"
                >
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Notification Preferences</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control which updates you receive.</p>
                   </div>

                   <div className="space-y-4">
                      {[
                        { id: 'email_events', label: 'Event Reminders', desc: 'Get notified before your registered events start.' },
                        { id: 'email_approvals', label: 'Approval Alerts', desc: 'Get notified when your club or event is reviewed.' },
                        { id: 'push_chat', label: 'Chat Messages', desc: 'Receive real-time pings for new chat messages.' },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.desc}</p>
                           </div>
                           <div className="h-6 w-11 bg-indigo-600 rounded-full relative cursor-pointer">
                              <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
