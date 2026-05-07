import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCog, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreVertical,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion as Motion } from 'framer-motion';

import { createAdmin, getAllAdmins, toggleAdminStatus } from '@/services/authService';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/getInitials';

export default function AdminManagementPage() {
  useDocumentTitle('Admin Management | Unisphere');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all admins
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins-list'],
    queryFn: async () => {
      const payload = await getAllAdmins();
      return payload?.admins || payload || [];
    },
  });

  // Toggle Admin Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (adminId) => toggleAdminStatus(adminId),
    onSuccess: () => {
      toast.success('Admin status updated');
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Action failed'),
  });

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(search.toLowerCase()) || 
    admin.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <UserCog className="h-8 w-8 text-red-500" />
            Admin Management
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Control platform access, manage administrative roles, and oversee system governance.
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl h-12 px-6 shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700"
        >
          <Plus className="mr-2 h-5 w-5" /> Add New Admin
        </Button>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Total Admins" value={admins.length} icon={UserCog} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Active Accounts" value={admins.filter(a => a.isActive).length} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Deactivated" value={admins.filter(a => !a.isActive).length} icon={XCircle} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
             <button className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors">
               <ArrowUpDown className="h-5 w-5" />
             </button>
             <button className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors">
               <Filter className="h-5 w-5" />
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-8 space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
             </div>
          ) : filteredAdmins.length === 0 ? (
             <div className="py-20">
               <EmptyState 
                 title="No Admins Found" 
                 description="No administrator accounts match your current search criteria."
                 icon={AlertCircle}
               />
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-8 py-5">Administrator</th>
                  <th className="px-8 py-5">Role & Status</th>
                  <th className="px-8 py-5">Joined Date</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredAdmins.map((admin) => (
                  <Motion.tr 
                    layout
                    key={admin._id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/10">
                          {getInitials(admin?.name)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{admin.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                            <Mail className="h-3 w-3" /> {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{admin.role}</span>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          admin.isActive ? "bg-green-50 text-green-700 dark:bg-green-900/30" : "bg-red-50 text-red-700 dark:bg-red-900/30"
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", admin.isActive ? "bg-green-600" : "bg-red-600")} />
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-gray-500">{new Date(admin.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "rounded-xl h-10 px-4 text-xs font-bold",
                              admin.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-green-600 hover:bg-green-50 hover:text-green-700"
                            )}
                            onClick={() => toggleStatusMutation.mutate(admin._id)}
                            isLoading={toggleStatusMutation.isPending && toggleStatusMutation.variables === admin._id}
                          >
                            {admin.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all">
                             <MoreVertical className="h-5 w-5" />
                          </button>
                       </div>
                    </td>
                  </Motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Placeholder */}
      <AnimatePresence>
        {isModalOpen && (
           <AdminCreationModal onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-red-500/30 transition-all">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <h4 className="text-4xl font-black text-gray-900 dark:text-white">{value}</h4>
      </div>
      <div className={cn("p-4 rounded-[1.5rem] transition-transform group-hover:scale-110", bg, color)}>
        {React.createElement(icon, { className: 'h-7 w-7' })}
      </div>
    </div>
  );
}

function AdminCreationModal({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', email: '', role: 'admin' });

  const createMutation = useMutation({
    mutationFn: (payload) => createAdmin(payload),
    onSuccess: () => {
      toast.success('Admin invited successfully!');
      queryClient.invalidateQueries({ queryKey: ['admins-list'] });
      onClose();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to create admin'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <Motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <UserPlus className="h-32 w-32 -rotate-12" />
        </div>

        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Invite Admin</h2>
        <p className="text-gray-500 mb-10">Grant administrative access to a new user. They will receive credentials via email.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <Input 
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="rounded-2xl h-14 bg-gray-50 dark:bg-gray-800 border-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">University Email</label>
            <Input 
              type="email"
              placeholder="admin@university.edu"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="rounded-2xl h-14 bg-gray-50 dark:bg-gray-800 border-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Access Level</label>
            <div className="grid grid-cols-2 gap-3">
               <button
                 type="button"
                 onClick={() => setFormData({...formData, role: 'admin'})}
                 className={cn(
                   "p-4 rounded-2xl border-2 transition-all flex flex-col gap-2",
                   formData.role === 'admin' ? "border-red-500 bg-red-50/50 dark:bg-red-900/10" : "border-gray-100 dark:border-gray-800 opacity-60"
                 )}
               >
                 <ShieldCheck className={cn("h-6 w-6", formData.role === 'admin' ? "text-red-500" : "text-gray-400")} />
                 <span className="text-sm font-bold text-gray-900 dark:text-white">Admin</span>
               </button>
               <button
                 type="button"
                 onClick={() => setFormData({...formData, role: 'superadmin'})}
                 className={cn(
                   "p-4 rounded-2xl border-2 transition-all flex flex-col gap-2",
                   formData.role === 'superadmin' ? "border-red-500 bg-red-50/50 dark:bg-red-900/10" : "border-gray-100 dark:border-gray-800 opacity-60"
                 )}
               >
                 <ShieldAlert className={cn("h-6 w-6", formData.role === 'superadmin' ? "text-red-500" : "text-gray-400")} />
                 <span className="text-sm font-bold text-gray-900 dark:text-white">Superadmin</span>
               </button>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
             <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-2xl h-14 font-bold text-gray-500">Cancel</Button>
             <Button 
               type="submit" 
               className="flex-1 rounded-2xl h-14 font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20"
               isLoading={createMutation.isPending}
             >
               Send Invite
             </Button>
          </div>
        </form>
      </Motion.div>
    </div>
  );
}

