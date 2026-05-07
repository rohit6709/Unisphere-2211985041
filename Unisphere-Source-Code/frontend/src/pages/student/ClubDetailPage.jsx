import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  ShieldCheck, 
  Trophy,
  Target,
  UserPlus,
  UserMinus,
  Clock,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SmartImage } from '@/components/ui/SmartImage';
import { SEO } from '@/components/SEO';
import { getClubById, joinClub, leaveClub } from '@/services/clubService';
import { getClubEvents } from '@/services/eventService';
import { getInitials } from '@/utils/getInitials';

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => getClubById(clubId),
  });

  const { data: clubEvents } = useQuery({
    queryKey: ['club-events', clubId],
    queryFn: async () => (await getClubEvents(clubId))?.events || [],
    enabled: !!club
  });

  const joinMutation = useMutation({
    mutationFn: () => joinClub(clubId),
    onSuccess: () => {
      toast.success('Welcome to the club!');
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Failed to join'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveClub(clubId),
    onSuccess: () => {
      toast.success('You left the club');
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Failed to leave'),
  });

  if (isLoading) return <ClubDetailSkeleton />;
  if (isError || !club) return <ClubErrorState />;

  const isMember = club.members?.some((member) => member._id === user?._id);
  const isPresident = club.president?._id === user?._id;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-20">
      <SEO 
        title={club.name} 
        description={club.description} 
      />

      {/* Profile Header */}
      <div className="relative h-[45vh] min-h-87.5 w-full">
         <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
         <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
         
         <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 w-full pb-10">
               <div className="flex flex-col md:flex-row items-end gap-8">
                  <div className="h-40 w-40 rounded-[2.5rem] bg-white dark:bg-gray-900 border-8 border-white dark:border-gray-900 shadow-2xl flex items-center justify-center text-4xl font-black text-indigo-600 shrink-0">
                     {getInitials(club.name)}
                  </div>
                  <div className="flex-1 space-y-4 mb-4">
                     <div className="flex flex-wrap gap-2">
                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{club.department}</span>
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">Active Club</span>
                     </div>
                     <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                        {club.name}
                     </h1>
                     <div className="flex flex-wrap items-center gap-6 text-indigo-100 text-sm font-bold">
                        <div className="flex items-center gap-2">
                           <Users className="h-4 w-4" /> {club.members?.length || 0} Members
                        </div>
                        <div className="flex items-center gap-2">
                           <Calendar className="h-4 w-4" /> Est. {new Date(club.createdAt).getFullYear()}
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-3 mb-6">
                     {isMember ? (
                       <Button 
                         variant="outline" 
                         onClick={() => leaveMutation.mutate()}
                         className="rounded-2xl h-14 px-8 border-white/30 text-white hover:bg-white hover:text-indigo-600 font-black border-2"
                         disabled={isPresident || leaveMutation.isPending}
                       >
                          {isPresident ? 'Cannot Leave (President)' : 'Leave Club'}
                       </Button>
                     ) : (
                       <Button 
                         onClick={() => joinMutation.mutate()}
                         disabled={joinMutation.isPending}
                         className="rounded-2xl h-14 px-10 bg-white text-indigo-600 hover:bg-indigo-50 font-black text-lg shadow-xl"
                       >
                          <UserPlus className="h-5 w-5 mr-2" /> Join Club
                       </Button>
                     )}
                     <Link to="/messages">
                        <Button className="rounded-2xl h-14 w-14 p-0 bg-indigo-500 text-white hover:bg-indigo-400">
                           <MessageSquare className="h-6 w-6" />
                        </Button>
                     </Link>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
         
         {/* Left: Content */}
         <div className="lg:col-span-2 space-y-16">
            
            {/* Mission Section */}
            <section className="space-y-6">
               <h2 className="text-3xl font-black flex items-center gap-3">
                  <Target className="h-8 w-8 text-indigo-600" />
                  Our Mission
               </h2>
               <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic">
                    "{club.description}"
                  </p>
                  <Trophy className="absolute -bottom-6 -right-6 h-32 w-32 text-indigo-600 opacity-5 -rotate-12" />
               </div>
            </section>

            {/* Upcoming Events */}
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black flex items-center gap-3">
                     <Calendar className="h-8 w-8 text-indigo-600" />
                     Club Events
                  </h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clubEvents?.length > 0 ? (
                    clubEvents.map(event => (
                      <Link key={event._id} to={`/events/${event._id}`} className="group">
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-4xl hover:shadow-2xl transition-all h-full">
                           <SmartImage src={event.posterUrl} className="h-40 rounded-2xl mb-4" />
                           <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{event.title}</h4>
                           <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(event.startsAt), 'MMM dd')}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.venue?.name}</span>
                           </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-900/30 rounded-4xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                       <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No scheduled events</p>
                    </div>
                  )}
               </div>
            </section>

         </div>

         {/* Right: Sidebar */}
         <div className="space-y-8">
            
            {/* Leadership Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[3rem] p-8 shadow-xl shadow-indigo-500/5 space-y-8">
               <h3 className="text-xl font-black flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Leadership
               </h3>
               
               <div className="space-y-6">
                  <LeaderItem label="President" user={club.president} />
                  <LeaderItem label="Vice President" user={club.vicePresident} />
                  <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Advisors</p>
                     <div className="space-y-4">
                        {club.advisors?.map(adv => (
                           <LeaderItem key={adv._id} user={adv} />
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Stats Card */}
            <div className="bg-indigo-600 rounded-[3rem] p-8 text-white space-y-6 shadow-2xl shadow-indigo-500/20">
               <h3 className="text-xl font-black">Club Stats</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Total Events</p>
                     <p className="text-2xl font-black">{clubEvents?.length || 0}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Engagement</p>
                     <p className="text-2xl font-black">9.4/10</p>
                  </div>
               </div>
            </div>

         </div>

      </div>
    </div>
  );
}

function LeaderItem({ label, user }) {
   if (!user) return null;
   return (
      <div className="flex items-center gap-4 group">
         <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-400 shrink-0">
            {getInitials(user?.name)}
         </div>
         <div className="min-w-0">
            {label && <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">{label}</p>}
            <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest">{user.department}</p>
         </div>
      </div>
   )
}

function ClubDetailSkeleton() {
   return (
      <div className="min-h-screen animate-pulse">
         <div className="h-[45vh] bg-gray-200 dark:bg-gray-900" />
         <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
               <Skeleton className="h-20 w-48 rounded-3xl" />
               <Skeleton className="h-40 w-full rounded-[2.5rem]" />
            </div>
            <Skeleton className="h-80 w-full rounded-[3rem]" />
         </div>
      </div>
   )
}

function ClubErrorState() {
   return (
      <div className="min-h-screen flex items-center justify-center p-12">
         <div className="text-center space-y-6">
            <AlertCircle className="h-20 w-20 text-rose-500 mx-auto" />
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">Club Not Found</h2>
            <Link to="/discovery">
               <Button className="rounded-2xl h-14 px-8 bg-indigo-600 font-black">Back to Discovery</Button>
            </Link>
         </div>
      </div>
   )
}


