import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CalendarDays, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  Users, 
  Info, 
  Share2, 
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { getPublicEvent } from '@/services/eventService';
import { getMyRegistrationStatus, registerForEvent } from '@/services/registrationService';
import { isStudentRole } from '@/utils/roles';

export default function EventProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getPublicEvent(id),
    enabled: Boolean(id),
  });

  const { data: registrationStatus = null } = useQuery({
    queryKey: ['registration-status', id],
    queryFn: () => getMyRegistrationStatus(id),
    enabled: !!user && isStudentRole(role),
  });

  const isRegistered = Boolean(registrationStatus);
  const registeredCount = event?.registeredCount ?? 0;
  const isFull = event?.maxParticipants ? registeredCount >= event.maxParticipants : false;
  const deadlineDate = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const now = new Date();
  const isPastDeadline = deadlineDate ? now > deadlineDate : false;

  const registerMutation = useMutation({
    mutationFn: () => registerForEvent(id),
    onSuccess: () => {
      toast.success('Successfully registered!');
      queryClient.invalidateQueries({ queryKey: ['registration-status', id] });
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Registration failed'),
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !event) return <ErrorState onBack={() => navigate('/events')} />;

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);
  const hasStarted = now >= startDate;
  const eventClosed = !['approved', 'live'].includes(event.status);
  const canRegister = isStudentRole(role) && !isRegistered && !hasStarted && !isPastDeadline && !isFull && !eventClosed;
  const venueName = event?.venue?.name || 'TBA';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <div className="mr-3 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Events
        </button>
        <button 
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:border-indigo-500 transition-all"
        >
          <Share2 className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Visuals & Content */}
        <div className="lg:col-span-8 space-y-8">
          <div className="relative h-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/10">
            <img 
              src={event.posterUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80'} 
              className="h-full w-full object-cover" 
              alt={event.title} 
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-4 py-1 rounded-full bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg">
                  {event.eventType}
                </span>
                <span className="px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest">
                  {event.visibility?.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-4xl p-8 sm:p-10 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-2xl font-bold dark:text-white mb-6">About the Event</h2>
            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed">
              {event.description.split('\n').map((para, i) => (
                <p key={i} className="mb-4">{para}</p>
              ))}
            </div>
            
            {/* Tags / Keywords if available */}
            {event.tags?.length > 0 && (
              <div className="mt-10 pt-10 border-t border-gray-50 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-8 space-y-6">
            {/* Registration Card */}
            <div className="bg-white dark:bg-gray-900 rounded-4xl p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-indigo-500/5">
              <div className="mb-8">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Registration</p>
                {isRegistered ? (
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-400 font-bold text-lg">
                    <CheckCircle2 className="h-6 w-6" />
                    Your Spot is Confirmed!
                  </div>
                ) : eventClosed ? (
                  <div className="flex items-center gap-3 text-red-600 font-bold">
                    <AlertCircle className="h-5 w-5" />
                    Event Not Open
                  </div>
                ) : isPastDeadline || hasStarted ? (
                  <div className="flex items-center gap-3 text-red-600 font-bold">
                    <AlertCircle className="h-5 w-5" />
                    Registration Closed
                  </div>
                ) : (
                  <div className="text-3xl font-extrabold dark:text-white">
                    Free Entry
                  </div>
                )}
              </div>

              {canRegister && (
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-500/20"
                  onClick={() => registerMutation.mutate()}
                  isLoading={registerMutation.isPending}
                  disabled={!canRegister}
                >
                  {isFull ? 'Waitlist Only' : 'Register Now'}
                </Button>
              )}

              {isStudentRole(role) && isRegistered && !hasStarted && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">You're registered</p>
                    <Link to="/my-registrations" className="text-xs text-emerald-600 hover:underline">View in My Registrations</Link>
                  </div>
                </div>
              )}

              {!user && (
                 <Link to="/login" className="inline-flex w-full items-center justify-center rounded-2xl h-14 px-6 bg-indigo-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-indigo-500/20">
                   Login to Register
                 </Link>
              )}

              {isStudentRole(role) && isRegistered && hasStarted && (
                <Link to={`/events/${id}/feedback`}>
                  <Button variant="outline" className="w-full h-12 rounded-2xl mt-3">
                    Share Feedback
                  </Button>
                </Link>
              )}

              <div className="mt-8 space-y-4 text-sm">
                <div className="flex justify-between items-center text-gray-500">
                  <span>Spots Available</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {event.maxParticipants
                      ? `${Math.max(0, event.maxParticipants - registeredCount)} / ${event.maxParticipants}`
                      : 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <span>Deadline</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {deadlineDate ? deadlineDate.toLocaleDateString([], {month:'short', day:'numeric'}) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Info Card */}
            <div className="bg-white dark:bg-gray-900 rounded-4xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">Date & Time</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {startDate.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })} <br />
                    {startDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {endDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">Location</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {venueName} <br />
                    {event.venue?.building && <span className="opacity-60">{event.venue.building}</span>}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Organizer</p>
                 <Link to={`/clubs/${event.club?._id}`} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-indigo-600">
                        {event.club?.name?.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">{event.club?.name}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 transition-all" />
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between"><div className="h-10 w-40 bg-gray-200 animate-pulse rounded-xl" /><div className="h-10 w-10 bg-gray-200 animate-pulse rounded-xl" /></div>
      <div className="h-100 w-full bg-gray-200 animate-pulse rounded-[2.5rem]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 h-64 bg-gray-200 animate-pulse rounded-4xl" />
        <div className="lg:col-span-4 h-96 bg-gray-200 animate-pulse rounded-4xl" />
      </div>
    </div>
  );
}

function ErrorState({ onBack }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="inline-flex p-6 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 mb-6">
        <AlertCircle className="h-12 w-12" />
      </div>
      <h2 className="text-3xl font-bold dark:text-white mb-2">Event not found</h2>
      <p className="text-gray-500 mb-8">The event you're looking for might have been cancelled or removed.</p>
      <Button onClick={onBack} variant="outline" className="rounded-xl">Go Back to Directory</Button>
    </div>
  );
}
