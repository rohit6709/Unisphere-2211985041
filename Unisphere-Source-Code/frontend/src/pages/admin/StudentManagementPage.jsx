import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  UserX, 
  UserCheck, 
  Mail, 
  Fingerprint, 
  BookOpen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { api } from '@/api/axios';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/getInitials';

export default function StudentManagementPage() {
  useDocumentTitle('Student Management | Unisphere');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deptFilter, setDeptFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['students-admin', search, page, deptFilter],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/students', {
        params: { search, page, limit: 10, department: deptFilter }
      });
      return data.data;
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => api.patch(`/api/v1/students/${id}/toggle-status`),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries(['students-admin']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const students = data?.students || [];
  const pagination = data?.pagination || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Student Directory
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage student accounts, monitor academic profiles, and audit platform access.
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="rounded-xl border-dashed border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20">
             <Download className="mr-2 h-4 w-4" /> Export
           </Button>
           <Link to="/admin/students/upload" className="inline-flex">
             <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-6">
               <Upload className="mr-2 h-4 w-4" /> Bulk Upload
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
            placeholder="Search by name, roll number, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
          />
        </div>
        <div className="relative">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
           <select 
             value={deptFilter}
             onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
             className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none shadow-sm"
           >
             <option value="">All Departments</option>
             <option value="Computer Science">Computer Science</option>
             <option value="Electronics">Electronics</option>
             <option value="Mechanical">Mechanical</option>
             <option value="Civil">Civil</option>
           </select>
        </div>
        <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
           <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
             Total: {pagination.total || 0} Students
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
          ) : students.length === 0 ? (
             <div className="py-20">
               <EmptyState title="No Students Found" description="Try adjusting your search or filters." icon={AlertCircle} />
             </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-8 py-6">Student Information</th>
                  <th className="px-8 py-6">Academic Details</th>
                  <th className="px-8 py-6">Account Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {students.map((student) => (
                  <tr
                    key={student._id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                  >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/10">
                            {getInitials(student?.name)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-tight">{student.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                              <Mail className="h-3 w-3" /> {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                             <Fingerprint className="h-3 w-3 text-blue-500" /> {student.rollNo}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-wider font-medium">
                             <BookOpen className="h-3 w-3" /> {student.department}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className={cn(
                           "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border",
                           student.isActive 
                             ? "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:border-green-800/50" 
                             : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800/50"
                         )}>
                           <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", student.isActive ? "bg-green-600" : "bg-red-600")} />
                           {student.isActive ? 'Active' : 'Deactivated'}
                         </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "rounded-xl h-10 px-4 text-xs font-bold",
                                student.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                              )}
                              onClick={() => toggleStatusMutation.mutate(student._id)}
                              isLoading={toggleStatusMutation.isPending && toggleStatusMutation.variables === student._id}
                            >
                              {student.isActive ? <><UserX className="h-4 w-4 mr-2" /> Disable</> : <><UserCheck className="h-4 w-4 mr-2" /> Enable</>}
                            </Button>
                            <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all opacity-0 group-hover:opacity-100">
                               <MoreVertical className="h-5 w-5" />
                            </button>
                         </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
               <button 
                 disabled={pagination.page === 1}
                 onClick={() => setPage(p => p - 1)}
                 className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:text-blue-600 transition-all"
               >
                 <ChevronLeft className="h-5 w-5" />
               </button>
               <button 
                 disabled={pagination.page === pagination.totalPages}
                 onClick={() => setPage(p => p + 1)}
                 className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 disabled:opacity-30 hover:text-blue-600 transition-all"
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

