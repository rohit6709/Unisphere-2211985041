import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  UserMinus, 
  ShieldCheck, 
  Download, 
  Search, 
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/SEO';
import { getInitials } from '@/utils/getInitials';

const normalizeMembers = (payload) => {
   if (Array.isArray(payload)) return payload;
   if (Array.isArray(payload?.members)) return payload.members;
   return [];
};

export default function ClubGovernancePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Club Details (to check leadership)
  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ['club-governance', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/clubs/get-club/${id}`);
      return data.data;
    },
  });

  // Fetch Members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['club-members', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/clubs/${id}/members`);
      return data.data;
    },
  });

  // Mutation: Promote to VP
  const promoteVPMutation = useMutation({
    mutationFn: (rollNo) => api.patch(`/api/v1/clubs/${id}/assign-vice-president`, { rollNo }),
    onSuccess: () => {
      toast.success('Member promoted to Vice President');
      queryClient.invalidateQueries(['club-governance', id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Promotion failed'),
  });

  // Mutation: Remove Member
  const removeMemberMutation = useMutation({
    mutationFn: (rollNo) => api.delete(`/api/v1/clubs/${id}/remove-member/${rollNo}`),
    onSuccess: () => {
      toast.success('Member removed from club');
      queryClient.invalidateQueries(['club-members', id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Removal failed'),
  });

   const memberList = normalizeMembers(members);
   const filteredMembers = memberList.filter((member) => {
      const name = (member?.name || '').toLowerCase();
      const rollNo = (member?.rollNo || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || rollNo.includes(query);
   });

  if (clubLoading || membersLoading) return <div className="p-20 text-center">Loading Governance Hub...</div>;

  const isAdvisor = club?.advisors?.some(a => a._id === currentUser?._id);
  const isPresident = club?.president?._id === currentUser?._id;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      <SEO title={`Governance | ${club?.name}`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="space-y-2">
            <div className="flex items-center gap-3 text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
               <ShieldCheck className="h-4 w-4" />
               Club Administration
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
               {club?.name} Hub
            </h1>
            <p className="text-gray-500 font-medium">Manage memberships, roles, and administrative reports.</p>
         </div>

         <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl h-12">
               <Download className="mr-2 h-4 w-4" /> Export Member List
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         
         {/* Member Management */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                  />
               </div>
               <Button className="rounded-2xl h-14 px-8 bg-indigo-600 font-black">
                  <Filter className="mr-2 h-4 w-4" /> Filter
               </Button>
            </div>

            <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-50 dark:border-gray-900 overflow-hidden shadow-2xl shadow-indigo-500/5">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-gray-50 dark:border-gray-900">
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                     {filteredMembers.map((member) => (
                       <tr key={member._id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-black text-indigo-600">
                                   {getInitials(member?.name)}
                                </div>
                                <div>
                                   <p className="text-sm font-black text-gray-900 dark:text-white">{member.name}</p>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{member.rollNo}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <span className="text-xs font-bold text-gray-500">{member.department}</span>
                          </td>
                          <td className="px-8 py-6">
                             {club.president?._id === member._id ? (
                               <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest">President</span>
                             ) : club.vicePresident?._id === member._id ? (
                               <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Vice President</span>
                             ) : (
                               <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-black uppercase tracking-widest">Member</span>
                             )}
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end gap-2">
                                {(isAdvisor || isPresident) && club.president?._id !== member._id && (
                                   <button 
                                     onClick={() => removeMemberMutation.mutate(member.rollNo)}
                                     disabled={removeMemberMutation.isPending}
                                     className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                                   >
                                      <UserMinus className="h-4 w-4" />
                                   </button>
                                )}
                                {isAdvisor && club.president?._id !== member._id && club.vicePresident?._id !== member._id && (
                                   <button 
                                     onClick={() => promoteVPMutation.mutate(member.rollNo)}
                                     className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all"
                                   >
                                      <ShieldCheck className="h-4 w-4" />
                                   </button>
                                )}
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Stats & Tools */}
         <div className="space-y-6">
            <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/20">
               <h3 className="text-xl font-black mb-6">Governance Summary</h3>
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-indigo-100 text-sm font-bold uppercase tracking-widest">Total Members</span>
                     <span className="text-3xl font-black">{memberList.length}</span>
                  </div>
                  <div className="h-[1px] bg-white/10" />
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">President</p>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">{getInitials(club.president?.name)}</div>
                           <span className="text-sm font-bold">{club.president?.name}</span>
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">Vice President</p>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                              {getInitials(club.vicePresident?.name)}
                           </div>
                           <span className="text-sm font-bold">{club.vicePresident ? club.vicePresident.name : 'Unassigned'}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </section>
         </div>

      </div>
    </div>
  );
}
