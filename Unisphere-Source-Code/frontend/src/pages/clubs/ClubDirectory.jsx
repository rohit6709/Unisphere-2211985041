import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Users, 
  ChevronRight, 
  Building2, 
  Trophy, 
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClubSkeleton } from '@/components/ui/Skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/getInitials';

export default function ClubDirectory() {
  useDocumentTitle('Discover Communities | Unisphere');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const { role } = useAuth();

  const { data: clubs, isLoading, isError } = useQuery({
    queryKey: ['clubs', search, department],
    queryFn: async () => {
      const { data } = await api.get('/clubs/get-all-clubs', {
        params: { search, department, limit: 100 },
      });
      return data.data.clubs;
    },
  });

  const departments = [
    'Computer Science', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Arts', 'Design', 'Business'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Header with Stats Overview */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
            Find Your <span className="text-indigo-600">Community.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Join student-led organizations that spark your passion, build your network, and enhance your campus experience.
          </p>
        </div>
        <div className="flex gap-4 sm:gap-8">
           <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{clubs?.length || 0}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Clubs</p>
           </div>
           
        </div>
      </section>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-2 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by club name or interests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[1.5rem] bg-transparent border-none px-14 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <div className="flex gap-2 p-1">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-[1.25rem] bg-gray-50 dark:bg-gray-800 border-none px-6 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="p-4 rounded-[1.25rem] bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
               <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <ClubSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <EmptyState title="Error" description="Failed to load clubs." />
      ) : clubs?.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No clubs found"
          description="Try broadening your search or choosing a different department."
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard key={club._id} club={club} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClubCard({ club, role }) {
  return (
    <div className="group relative flex flex-col rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-500">
      {/* Club Icon/Logo Placeholder */}
      <div className="flex justify-between items-start mb-8">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
          {getInitials(club.name)}
        </div>
        {role === 'admin' && (
           <span className={cn(
             "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
             club.status === 'active' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
           )}>
             {club.status}
           </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
          {club.name}
        </h3>
        <p className="text-sm font-medium text-indigo-500 mb-4 tracking-wide uppercase text-[10px]">
          {club.department || 'General'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-8 leading-relaxed">
          {club.description || 'Dedicated to fostering growth and community through shared interests and events.'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
        <div className="flex -space-x-2 overflow-hidden">
           {[1,2,3].map(i => (
             <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                {String.fromCharCode(64 + i)}
             </div>
           ))}
           <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-900 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600">
              +{club.members?.length || 0}
           </div>
        </div>
        <Link
          to={`/clubs/${club._id}`}
          className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white group/link"
        >
          View Profile
          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover/link:bg-indigo-600 group-hover/link:text-white transition-all">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
