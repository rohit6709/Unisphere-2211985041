import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, CalendarDays, MapPin, ExternalLink, X } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { cn } from '@/utils/cn';
import { cancelRegistration, getMyRegistrations } from '@/services/registrationService';

export default function MyRegistrationsPage() {
  useDocumentTitle('My Registrations');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all'); // all, upcoming, past
  const [selectedRegistration, setSelectedRegistration] = React.useState(null);

  const { data: registrations = [], isLoading, isError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const response = await getMyRegistrations();
      return response?.registrations || response || [];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId) => cancelRegistration(eventId),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: ['my-registrations'] });
      const previous = queryClient.getQueryData(['my-registrations']);

      queryClient.setQueryData(['my-registrations'], (old = []) => {
        return (Array.isArray(old) ? old : []).filter((reg) => {
          const registrationEventId = reg?.event?._id || reg?.event;
          return registrationEventId?.toString?.() !== eventId?.toString?.();
        });
      });

      return { previous };
    },
    onSuccess: () => {
      toast.success('Registration cancelled successfully');
      setSelectedRegistration(null);
    },
    onError: (error, _eventId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['my-registrations'], context.previous);
      }
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel registration');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
    },
  });

  const now = new Date();

  const filteredRegistrations = registrations.filter((reg) => {
    if (!reg.event) return false;
    
    // Search filter
    const matchesSearch = reg.event.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesStatus = true;
    const eventDate = new Date(reg.event.startsAt);
    if (filterStatus === 'upcoming') {
      matchesStatus = eventDate >= now;
    } else if (filterStatus === 'past') {
      matchesStatus = eventDate < now;
    }
    
    return matchesSearch && matchesStatus;
  });

  const selectedEventId = selectedRegistration?.event?._id || selectedRegistration?.event;
  const selectedEventTitle = selectedRegistration?.event?.title || 'this event';
  const selectedIsCancellable = Boolean(
    selectedRegistration &&
    selectedEventId &&
    selectedRegistration.status !== 'cancelled' &&
    selectedRegistration.status !== 'declined' &&
    new Date(selectedRegistration.event.startsAt) >= now
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-(--text-h) flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--primary-glow) flex items-center justify-center text-(--primary)">
              <ClipboardList className="w-5 h-5" />
            </div>
            My Registrations
          </h1>
          <p className="mt-2 text-(--text)">
            Track your event registrations and ticket statuses.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-(--bg-card) border border-(--border) rounded-3xl p-6 md:p-8 shadow-sm">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text)" />
            <Input
              type="text"
              placeholder="Search registered events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-(--bg-card-alt) w-full"
            />
          </div>
          
          <div className="flex w-full sm:w-auto p-1 bg-(--bg-card-alt) border border-(--border) rounded-lg">
            {['all', 'upcoming', 'past'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all",
                  filterStatus === status 
                    ? "bg-(--bg-card) text-(--text-h) shadow-sm" 
                    : "text-(--text) hover:text-(--text-h)"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* State Handling */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={ClipboardList}
            title="Failed to load registrations"
            description="We encountered an error while fetching your registrations. Please try again."
            action={<button onClick={() => window.location.reload()} className="text-(--primary) font-medium hover:underline">Reload page</button>}
          />
        ) : registrations.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No event registrations"
            description="You haven't registered for any events yet. Check out the event directory!"
            action={<Link to="/events" className="px-6 py-2.5 bg-(--primary) text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Browse Events</Link>}
            className="py-16"
          />
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-(--text)">No registrations match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegistrations.map((reg, idx) => {
              const event = reg.event;
              const isPast = new Date(event.startsAt) < now;
              
              return (
                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={reg._id}
                  className="flex flex-col h-full bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden hover:border-(--primary) hover:shadow-md transition-all group relative"
                >
                  <div className="relative h-32 bg-(--bg-card-alt) overflow-hidden">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-tr from-(--primary-glow) to-purple-500/20" />
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-bold rounded-lg shadow-sm capitalize",
                        reg.status === 'registered' ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                        reg.status === 'waitlisted' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      )}>
                        {reg.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                                      <div className="text-xs font-semibold text-(--primary) mb-2 uppercase tracking-wider">
                      {event.eventType}
                    </div>
                                      <h3 className="font-heading font-bold text-lg text-(--text-h) mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 mt-auto mb-4">
                                        <div className="flex items-center text-sm text-(--text) gap-2">
                                          <CalendarDays className="w-4 h-4 shrink-0 text-(--primary)" />
                        <span className="truncate">{format(new Date(event.startsAt), 'MMM d, yyyy • h:mm a')}</span>
                      </div>
                                        <div className="flex items-center text-sm text-(--text) gap-2">
                                          <MapPin className="w-4 h-4 shrink-0 text-(--primary)" />
                        <span className="truncate">{event.location || 'TBA'}</span>
                      </div>
                    </div>
                    
                                      <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                                            "text-xs font-medium px-2 py-1 rounded-md",
                                            isPast ? "bg-(--bg-card-alt) text-(--text)" : "bg-(--primary-glow) text-(--primary)"
                        )}>
                          {isPast ? "Event Ended" : "Upcoming"}
                        </span>
                        {!isPast && reg.status !== 'cancelled' && reg.status !== 'declined' && (
                          <button
                            type="button"
                            onClick={() => setSelectedRegistration(reg)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        )}
                        <Link 
                          to={`/events/${event._id}`}
                            className="w-8 h-8 rounded-full bg-(--bg-card-alt) flex items-center justify-center text-(--text-h) group-hover:bg-(--primary) group-hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(selectedRegistration)}
        onClose={() => {
          if (!cancelMutation.isPending) setSelectedRegistration(null);
        }}
        onConfirm={() => {
          if (!selectedIsCancellable) {
            toast.error('This registration can no longer be cancelled');
            return;
          }
          cancelMutation.mutate(selectedEventId);
        }}
        title="Cancel Registration"
        description={`Are you sure you want to cancel your registration for ${selectedEventTitle}? This action will remove your registration from the list.`}
        confirmLabel="Cancel Registration"
        cancelLabel="Keep Registration"
        confirmVariant="primary"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
