import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Share2, 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SmartImage } from '@/components/ui/SmartImage';
import { SEO } from '@/components/SEO';
import FeedbackSection from '@/components/events/FeedbackSection';
import { cn } from '@/utils/cn';
import { getPublicEvent } from '@/services/eventService';
import { getMyRegistrationStatus, registerForEvent } from '@/services/registrationService';
import { getInitials } from '@/utils/getInitials';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getPublicEvent(eventId),
    enabled: Boolean(eventId),
  });

  const { data: registration } = useQuery({
    queryKey: ['registration', eventId],
    queryFn: () => getMyRegistrationStatus(eventId),
    enabled: !!event && !!user
  });

  const registerMutation = useMutation({
    mutationFn: () => registerForEvent(eventId),
    onSuccess: () => {
      toast.success('Successfully registered');
      queryClient.invalidateQueries({ queryKey: ['registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Registration failed'),
  });

  if (isLoading) return <EventDetailSkeleton />;
  if (isError || !event) return <EventErrorState />;

  const isRegistrationOpen = new Date() < new Date(event.registrationDeadline) && event.status !== 'completed';
  const isRegistered = !!registration;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-20">
      <SEO 
        title={event.title} 
        description={event.description} 
        image={event.posterUrl} 
      />

      {/* Hero Header */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
         <SmartImage 
           src={event.posterUrl} 
           alt={event.title} 
           className="h-full w-full object-cover scale-105 blur-sm opacity-50 absolute inset-0"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent" />
         
         <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 w-full pb-12">
               <div className="flex flex-col md:flex-row gap-8 items-end">
                  <div className="w-full md:w-80 shrink-0 shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-white dark:border-gray-900 bg-white dark:bg-gray-900">
                     <SmartImage src={event.posterUrl} alt={event.title} className="aspect-[3/4] w-full" />
                  </div>
                  
                  <div className="flex-1 space-y-6">
                     <div className="flex flex-wrap gap-2">
                        {event.isFeatured && (
                          <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20">Featured</span>
                        )}
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                           {event.type}
                        </span>
                     </div>
                     
                     <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white leading-tight tracking-tighter">
                        {event.title}
                     </h1>
                     
                     <div className="flex flex-wrap items-center gap-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                           <Calendar className="h-5 w-5 text-indigo-600" />
                           {format(new Date(event.startsAt), 'MMMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                           <MapPin className="h-5 w-5 text-indigo-600" />
                           {event.venue?.name}
                        </div>
                        <div className="flex items-center gap-2">
                           <Users className="h-5 w-5 text-indigo-600" />
                           {event.registeredCount || 0} Registered
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
         
         {/* Left: Info */}
         <div className="lg:col-span-2 space-y-12">
            <section className="space-y-6">
               <h2 className="text-2xl font-black flex items-center gap-3">
                  <Info className="h-6 w-6 text-indigo-600" />
                  About the Event
               </h2>
               <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  {event.description}
               </div>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] p-8 md:p-12 border border-gray-100 dark:border-gray-800">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Organized By</h3>
                     <Link to={`/clubs/${event.club?._id}`} className="flex items-center gap-4 group">
                        <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl">
                           {getInitials(event.club?.name)}
                        </div>
                        <div>
                           <p className="font-black text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{event.club?.name}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visit Club Profile</p>
                        </div>
                     </Link>
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Visibility</h3>
                     <div className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        {event.visibility === 'public' ? 'Open to All Students' : 'Club Members Only'}
                     </div>
                  </div>
               </div>
            </section>

            <FeedbackSection 
              eventId={event._id} 
              canSubmit={isRegistered && new Date() > new Date(event.startsAt)} 
            />
         </div>

         {/* Right: Action Card */}
         <div className="space-y-6">
            <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl shadow-indigo-500/5 space-y-8">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Status</p>
                  <div className="flex items-center justify-between">
                     <h3 className={cn(
                        "text-xl font-black",
                        isRegistrationOpen ? "text-emerald-500" : "text-rose-500"
                     )}>
                        {isRegistrationOpen ? 'Open Now' : 'Closed'}
                     </h3>
                     <Clock className="h-5 w-5 text-gray-300" />
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex justify-between text-sm">
                     <span className="text-gray-500 font-bold">Starts At</span>
                     <span className="text-gray-900 dark:text-white font-black">{format(new Date(event.startsAt), 'HH:mm')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-gray-500 font-bold">Venue</span>
                     <span className="text-gray-900 dark:text-white font-black">{event.venue?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-gray-500 font-bold">Deadline</span>
                     <span className="text-gray-900 dark:text-white font-black">{format(new Date(event.registrationDeadline), 'MMM dd')}</span>
                  </div>
               </div>

               {isRegistered ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center space-y-3">
                     <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                     <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">You're Registered!</p>
                     <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Ticket ID: {registration._id.slice(-8).toUpperCase()}</p>
                     <Link to="/my-registrations">
                        <Button variant="ghost" size="sm" className="w-full text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">View Ticket</Button>
                     </Link>
                  </div>
               ) : (
                  <Button 
                    onClick={() => registerMutation.mutate()}
                    disabled={!isRegistrationOpen || registerMutation.isPending}
                    className="w-full rounded-2xl h-16 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 font-black text-lg"
                  >
                     {isRegistrationOpen ? 'Register Now' : 'Registration Closed'}
                  </Button>
               )}

               <div className="flex items-center justify-center gap-4 pt-4">
                  <Button variant="ghost" className="rounded-xl flex-1 text-xs font-black uppercase tracking-widest">
                     <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                  <Button variant="ghost" className="rounded-xl flex-1 text-xs font-black uppercase tracking-widest">
                     <ExternalLink className="h-4 w-4 mr-2" /> Add to Cal
                  </Button>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
       <div className="h-[60vh] bg-gray-100 dark:bg-gray-900" />
       <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
             <Skeleton className="h-8 w-48" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-96 rounded-[3rem]" />
       </div>
    </div>
  );
}

function EventErrorState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12">
       <div className="text-center space-y-6">
          <AlertTriangle className="h-20 w-20 text-rose-500 mx-auto" />
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">Event Not Found</h2>
          <p className="text-gray-500 font-medium">The event might have been cancelled or moved to a different dimension.</p>
          <Link to="/discovery">
             <Button className="rounded-2xl h-14 px-8 bg-indigo-600 font-black">Back to Discovery</Button>
          </Link>
       </div>
    </div>
  );
}

