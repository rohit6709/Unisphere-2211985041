import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  UserX, 
  UserCheck, 
  Mail, 
  BadgeCheck, 
  BookOpen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { api } from '@/api/axios';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/getInitials';

export default function FacultyManagementPage() {
  useDocumentTitle('Faculty Management | Unisphere');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deptFilter, setDeptFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['faculty-admin', search, page, deptFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/faculty/get-all-faculty', {
        params: { search, page, limit: 10, department: deptFilter }
      });
      return data.data;
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/v1/faculty/get-all-faculty/${id}/toggle-status`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries(['faculty-admin']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const facultyList = data?.faculty || [];
  const pagination = data?.pagination || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-indigo-500" />
            Faculty Registry
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Oversee faculty profiles, departmental roles, and administrative permissions.
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl border-dashed border-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
             <Download className="mr-2 h-4 w-4" /> Export Data
           </Button>
           <Link to="/admin/faculty/upload" className="inline-flex">
             <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 px-6">
               <Upload className="mr-2 h-4 w-4" /> Add Faculty
             </Button>
           </Link>
        </div>
      </section>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, employee ID, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
           <select 
             value={deptFilter}
             onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
             className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 appearance-none shadow-sm"
           >
             <option value="">All Departments</option>
             <option value="Computer Science">Computer Science</option>
             <option value="Electronics">Electronics</option>
             <option value="Mechanical">Mechanical</option>
             <option value="Civil">Civil</option>
           </select>
        </div>
        <div className="flex items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
           <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
             {pagination.total || 0} Faculty Members
           </span>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-8 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
             </div>
          ) : facultyList.length === 0 ? (
             <div className="py-20">
               <EmptyState title="No Faculty Found" description="Try adjusting your search or filters." icon={AlertCircle} />
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-8 py-6">Faculty Member</th>
                  <th className="px-8 py-6">Employment Details</th>
                  <th className="px-8 py-6">Role & Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                <AnimatePresence mode="popLayout">
                  {facultyList.map((fac) => (
                    <Motion.tr 
                      layout
                      key={fac._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/10 text-xl">
                            {getInitials(fac?.name)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-tight">{fac.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                              <Mail className="h-3 w-3" /> {fac.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                             <BadgeCheck className="h-3 w-3 text-indigo-500" /> ID: {fac.employeeId}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-wider font-medium">
                             <Building className="h-3 w-3" /> {fac.department}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {fac.role || 'Faculty'}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border",
                            fac.isActive 
                              ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800/50" 
                              : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800/50"
                          )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full", fac.isActive ? "bg-green-600" : "bg-red-600")} />
                            {fac.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "rounded-xl h-10 px-4 text-xs font-bold",
                                fac.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                              )}
                              onClick={() => toggleStatusMutation.mutate(fac._id)}
                              isLoading={toggleStatusMutation.isPending && toggleStatusMutation.variables === fac._id}
                            >
                              {fac.isActive ? 'Suspend' : 'Activate'}
                            </Button>
                            <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all">
                               <MoreVertical className="h-5 w-5" />
                            </button>
                         </div>
                      </td>
                    </Motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Showing {facultyList.length} of {pagination.total} records
            </p>
            <div className="flex gap-2">
               <button 
                 disabled={pagination.page === 1}
                 onClick={() => setPage(p => p - 1)}
                 className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:text-indigo-600 transition-all"
               >
                 <ChevronLeft className="h-5 w-5" />
               </button>
               <button 
                 disabled={pagination.page === pagination.totalPages}
                 onClick={() => setPage(p => p + 1)}
                 className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:text-indigo-600 transition-all"
               >
                 <ChevronRight className="h-5 w-5" />
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

