import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  CalendarDays, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Filter, 
  Sparkles,
  Zap,
  LayoutGrid,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { api } from '@/api/axios';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export default function EventDirectory() {
  useDocumentTitle('Discover Events | Unisphere');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', search, eventType],
    queryFn: async () => {
      const { data } = await api.get('/events/public', {
        params: { search, eventType, limit: 100 },
      });
      return data.data.events;
    },
  });

  const featuredEvents = useMemo(() => events?.filter(e => e.isFeatured) || [], [events]);
  const regularEvents = useMemo(() => events?.filter(e => !e.isFeatured) || [], [events]);

  const getEventTypeColor = (type) => {
    const colors = {
      workshop: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      seminar: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      competition: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      cultural: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
      sports: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 sm:p-12 text-white">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            Discover What's New
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your Campus, <br />
            <span className="text-indigo-200">Your Experience.</span>
          </h1>
          <p className="mt-6 text-lg text-indigo-100">
            Explore workshops, competitions, and festivals happening around you. Join the community today.
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </section>

      {/* Featured Section */}
      {featuredEvents.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-bold dark:text-white">
            <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            <h2>Featured Events</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredEvents.map((event) => (
              <FeaturedEventCard key={event._id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Main Controls */}
      <div className="sticky top-0 z-30 flex flex-col gap-4 py-4 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, club, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl bg-white dark:bg-gray-900 border-none px-12 py-3.5 text-sm ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="rounded-2xl bg-white dark:bg-gray-900 border-none pl-4 pr-10 py-3.5 text-sm ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm capitalize"
            >
              <option value="">All Categories</option>
              {['workshop', 'seminar', 'competition', 'cultural', 'sports'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="hidden sm:flex rounded-2xl bg-white dark:bg-gray-900 p-1 ring-1 ring-gray-200 dark:ring-gray-800 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  viewMode === 'grid' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40" : "text-gray-400"
                )}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  viewMode === 'list' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40" : "text-gray-400"
                )}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : regularEvents.length === 0 && !featuredEvents.length ? (
        <EmptyState 
          title="No events found" 
          description="We couldn't find any events matching your filters. Try a different search term."
          icon={CalendarDays}
        />
      ) : (
        <div className={cn(
          "grid gap-8",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {regularEvents.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              viewMode={viewMode}
              badgeColor={getEventTypeColor(event.eventType)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedEventCard({ event }) {
  return (
    <Link to={`/events/${event._id}`} className="group block relative rounded-3xl overflow-hidden aspect-[16/9] bg-gray-900">
      <img 
        src={event.posterUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80'} 
        alt={event.title}
        className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white mb-4">
          <Zap className="h-3 w-3 fill-white" />
          FEATURED
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{event.title}</h3>
        <div className="flex gap-4 text-gray-300 text-sm">
          <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{new Date(event.startsAt).toLocaleDateString()}</div>
          <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.venue.name}</div>
        </div>
      </div>
    </Link>
  );
}

function EventCard({ event, viewMode, badgeColor }) {
  const startDate = new Date(event.startsAt);
  
  if (viewMode === 'list') {
    return (
      <div className="group relative flex gap-6 p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-500 transition-all shadow-sm">
        <div className="h-32 w-48 rounded-2xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
          <img src={event.posterUrl || ''} className="h-full w-full object-cover group-hover:scale-105 transition-transform" alt="" />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold dark:text-white line-clamp-1">{event.title}</h3>
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase", badgeColor)}>
              {event.eventType}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
            {event.description}
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
             <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{startDate.toLocaleDateString()}</span>
             <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
             <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">By {event.club?.name}</span>
          </div>
        </div>
        <Link to={`/events/${event._id}`} className="absolute inset-0 z-10" />
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-500">
      <div className="relative h-56 overflow-hidden">
        <img 
          src={event.posterUrl || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80'} 
          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" 
          alt={event.title} 
        />
        <div className="absolute top-4 left-4">
          <span className={cn("px-3 py-1 rounded-full text-[10px] font-extrabold uppercase backdrop-blur-md shadow-sm", badgeColor)}>
            {event.eventType}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold dark:text-white mb-2 line-clamp-1">{event.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 flex-1">
          {event.description}
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span>{startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="truncate">{event.venue.name}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
              {event.club?.name?.charAt(0)}
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{event.club?.name}</span>
          </div>
          <Link
            to={`/events/${event._id}`}
            className="flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 group/link"
          >
            Details
            <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
