import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search, BookMarked, ExternalLink } from 'lucide-react';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClubSkeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { getMyClubs } from '@/services/clubService';
import { getInitials } from '@/utils/getInitials';

export default function MyClubsPage() {
  useDocumentTitle('My Clubs');
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: clubs = [], isLoading, isError } = useQuery({
    queryKey: ['my-clubs'],
    queryFn: async () => {
      const response = await getMyClubs();
      return response?.clubs || response || [];
    },
  });

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-(--text-h) flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--primary-glow) flex items-center justify-center text-(--primary)">
              <BookMarked className="w-5 h-5" />
            </div>
            My Clubs
          </h1>
          <p className="mt-2 text-(--text)">
            Manage the clubs you've joined and access their activities.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-(--bg-card) border border-(--border) rounded-3xl p-6 md:p-8 shadow-sm">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text)" />
            <Input
              type="text"
              placeholder="Search my clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-(--bg-card-alt) w-full"
            />
          </div>
        </div>

        {/* State Handling */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <ClubSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Users}
            title="Failed to load clubs"
            description="We encountered an error while fetching your clubs. Please try again."
            action={<button onClick={() => window.location.reload()} className="text-(--primary) font-medium hover:underline">Reload page</button>}
          />
        ) : clubs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You haven't joined any clubs"
            description="Explore the club directory to find communities that match your interests."
            action={<Link to="/clubs" className="px-6 py-2.5 bg-(--primary) text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Browse All Clubs</Link>}
            className="py-16"
          />
        ) : filteredClubs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-(--text)">No clubs match your search "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div key={club._id}>
                <Link
                  to={`/clubs/${club._id}`}
                  className="block h-full bg-(--bg-card) border border-(--border) rounded-2xl p-6 hover:border-(--primary) hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-(--primary) to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                      {getInitials(club.name)}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                      Member
                    </span>
                  </div>
                  
                  <h3 className="font-heading font-bold text-lg text-(--text-h) mb-2 group-hover:text-(--primary) transition-colors">
                    {club.name}
                  </h3>
                  
                  <p className="text-sm text-(--text) line-clamp-2 mb-6">
                    {club.description || 'No description provided for this club.'}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-(--border) flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-(--text) font-medium">
                      <Users className="w-4 h-4" />
                      {club.memberCount || 0} members
                    </div>
                    <div className="w-8 h-8 rounded-full bg-(--bg-card-alt) flex items-center justify-center text-(--text-h) group-hover:bg-(--primary) group-hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

