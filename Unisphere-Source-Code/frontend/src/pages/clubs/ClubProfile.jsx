import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Mail, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  MessageSquare,
  Globe,
  PlusCircle,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { getClubById, getClubProfile, getClubTags, joinClub, removeMember } from '@/services/clubService';
import { getPublicEvents } from '@/services/eventService';
import { getInitials } from '@/utils/getInitials';
import { isStudentRole } from '@/utils/roles';

export default function ClubProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', id],
    queryFn: async () => {
      // Authenticated users get the fully-populated club (members, createdAt, etc.)
      // via getClubById. For anonymous/public visits we fall back to the profile
      // endpoint which wraps data as { club, upcomingEvents, personalContext } and
      // exposes only memberCount (no members array).
      try {
        return await getClubById(id);
      } catch {
        const profile = await getClubProfile(id);
        if (profile && profile.club) {
          return {
            ...profile.club,
            members: profile.club.members || [],
            upcomingEvents: profile.upcomingEvents,
            personalContext: profile.personalContext,
          };
        }
        return profile;
      }
    },
  });

  const { data: clubTags = [] } = useQuery({
    queryKey: ['club-tags', id],
    queryFn: async () => {
      const payload = await getClubTags(id);
      return payload?.tags || payload || [];
    },
    enabled: Boolean(id),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['club-events', id],
    queryFn: async () => {
      const payload = await getPublicEvents({ clubId: id });
      return payload?.events || payload || [];
    },
    enabled: !!club,
  });

  const isMember =
    club?.personalContext?.isJoined ||
    club?.members?.some((m) => m._id === user?._id);
  const isPresident = club?.president?._id === user?._id;
  const isVicePresident = club?.vicePresident?._id === user?._id;
  const isAdvisor = club?.advisors?.some((advisor) => advisor._id === user?._id);
  const isAdmin = role === 'admin' || role === 'superadmin';
  const canManageMembers = isAdmin || isAdvisor || isPresident;

  const removeMemberMutation = useMutation({
    mutationFn: (rollNo) => removeMember(id, rollNo),
    onSuccess: () => {
      toast.success('Member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['club', id] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to remove member');
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => joinClub(id),
    onSuccess: () => {
      toast.success('Welcome to the club!');
      queryClient.invalidateQueries({ queryKey: ['club', id] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Failed to join'),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !club) return <div className="text-center py-20">Club not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Dynamic Header */}
      <section className="relative rounded-[3rem] overflow-hidden bg-gray-900 dark:bg-black h-75 sm:h-100">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600/40 to-purple-800/40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-8 p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
            <div className="h-32 w-32 rounded-4xl bg-white p-2 shadow-2xl flex items-center justify-center text-5xl font-black text-indigo-600 border-4 border-white/20">
              {getInitials(club.name)}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest">
                  {club.department || 'Active Community'}
                </span>
                {isMember && (
                  <span className="px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Member
                  </span>
                )}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">{club.name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-gray-300 text-sm">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {club.memberCount ?? club.members?.length ?? 0} Members</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Founded {club.createdAt ? new Date(club.createdAt).getFullYear() : '—'}</span>
              </div>
            </div>
          </div>

          {isStudentRole(role) && !isMember && (
             <Button 
               size="lg" 
               className="rounded-2xl h-14 px-8 text-lg font-bold shadow-xl shadow-indigo-500/20"
               onClick={() => joinMutation.mutate()}
               isLoading={joinMutation.isPending}
             >
               <PlusCircle className="mr-2 h-5 w-5" /> Join Club
             </Button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* About & Events */}
        <div className="lg:col-span-8 space-y-10">
          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 sm:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-2xl font-bold dark:text-white mb-6 flex items-center gap-3">
              <Globe className="h-6 w-6 text-indigo-500" />
              Our Story
            </h2>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
              {club.description || "We are a passionate group of students dedicated to building a vibrant community around our shared interests. Join us as we organize workshops, events, and meaningful interactions."}
            </div>
            {clubTags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {clubTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-bold dark:text-white flex items-center gap-3">
                 <Calendar className="h-6 w-6 text-indigo-500" />
                 Upcoming Events
               </h2>
               <Link to="/events" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All</Link>
            </div>
            
            <div className="grid gap-4">
              {events.length > 0 ? events.slice(0, 3).map((event) => (
                <Link 
                  key={event._id} 
                  to={`/events/${event._id}`}
                  className="group flex items-center gap-6 p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-500 transition-all shadow-sm"
                >
                   <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 bg-indigo-50">
                     <img src={event.posterUrl} className="h-full w-full object-cover" alt="" />
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold dark:text-white group-hover:text-indigo-600 transition-colors">{event.title}</h4>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(event.startsAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.venue?.name || event.location || 'TBA'}</span>
                      </div>
                   </div>
                   <ChevronRight className="h-5 w-5 text-gray-300 group-hover:translate-x-1 transition-all" />
                </Link>
              )) : (
                <div className="p-12 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800/50 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500">No upcoming events scheduled.</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-3">
                <Users className="h-6 w-6 text-indigo-500" />
                Members
              </h2>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {club.memberCount ?? club.members?.length ?? 0} total
              </span>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(club.members || []).map((member) => {
                  const memberId = member?._id;
                  const memberRole =
                    club.president?._id === memberId
                      ? 'President'
                      : club.vicePresident?._id === memberId
                        ? 'Vice President'
                        : 'Member';

                  return (
                    <div key={memberId} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                          {member?.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{memberRole}</p>
                        </div>
                      </div>

                      {canManageMembers && memberRole === 'Member' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          isLoading={removeMemberMutation.isPending && removeMemberMutation.variables === member?.rollNo}
                          onClick={() => removeMemberMutation.mutate(member?.rollNo)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Leadership & Interaction */}
        <div className="lg:col-span-4 space-y-6">
           {(isPresident || isVicePresident) && (
             <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
               <h3 className="text-lg font-bold dark:text-white">Leadership Actions</h3>
               <div className="grid grid-cols-1 gap-3">
                 <Link to={`/clubs/${id}/governance`}>
                   <Button className="w-full">Club Governance</Button>
                 </Link>
                <Link to={`/events/create?clubId=${id}`}>
                   <Button variant="outline" className="w-full">Create Event</Button>
                 </Link>
                 <Link to={`/clubs/${id}/governance`}>
                   <Button variant="outline" className="w-full">Club Settings</Button>
                 </Link>
               </div>
             </section>
           )}

           <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
             <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
               <ShieldCheck className="h-5 w-5 text-indigo-500" />
               Club Leadership
             </h3>
             <div className="space-y-6">
               <LeaderItem user={club.president} role="President" />
               {club.vicePresident && <LeaderItem user={club.vicePresident} role="Vice President" />}
               <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Advisors</p>
                  <div className="space-y-4">
                    {club.advisors?.map(adv => (
                      <div key={adv._id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-indigo-500 font-bold">
                          {adv.name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{adv.name}</span>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
           </section>

           <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white">
             <h3 className="text-xl font-bold mb-4">Stay Connected</h3>
             <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
               Registered members get access to exclusive workshops, discussion groups, and early event notifications.
             </p>
             <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold">
                <MessageSquare className="mr-2 h-4 w-4" /> Message Club
             </Button>
           </section>
        </div>
      </div>
    </div>
  );
}

function LeaderItem({ user, role }) {
  if (!user) {
    return (
      <div className="flex items-center gap-3 opacity-50">
        <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-400">
          ?
        </div>
        <div>
          <p className="text-sm font-bold dark:text-white text-gray-400">Not Assigned</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
          {getInitials(user?.name)}
        </div>
        <div>
          <p className="text-sm font-bold dark:text-white">{user.name}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </div>
      {user.email && (
        <a href={`mailto:${user.email}`} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-colors">
          <Mail className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      <div className="h-100 w-full bg-gray-200 animate-pulse rounded-[3rem]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
           <div className="h-64 bg-gray-200 animate-pulse rounded-[2.5rem]" />
           <div className="h-96 bg-gray-200 animate-pulse rounded-[2.5rem]" />
        </div>
        <div className="lg:col-span-4 h-125 bg-gray-200 animate-pulse rounded-[2.5rem]" />
      </div>
    </div>
  );
}
