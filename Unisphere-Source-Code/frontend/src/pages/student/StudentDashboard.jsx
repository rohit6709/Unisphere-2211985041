import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, MessageSquare, ChevronRight, Activity } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { getStudentDashboard } from '@/services/dashboardService';
import { getInitials } from '@/utils/getInitials';

export default function StudentDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();

  const { data: dashboardData, isLoading, isError } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: () => getStudentDashboard(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState 
        title="Failed to load dashboard"
        description="We couldn't fetch your dashboard data at the moment. Please try again."
        action={
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[var(--primary)] text-white rounded-full">
            Retry
          </button>
        }
      />
    );
  }

  const { upcomingEvents = [], clubs = [], activeChats = [] } = dashboardData || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-heading font-extrabold mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-white/80 max-w-lg">
            Here's what's happening around campus. You have {upcomingEvents.length} upcoming events and {activeChats.length} active discussions.
          </p>
        </div>
      </Motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Events & Clubs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Events */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[var(--primary)]" />
                Your Upcoming Events
              </h2>
              <Link to="/events" className="text-sm font-medium text-[var(--primary)] hover:underline flex items-center">
                Browse all <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <EmptyState 
                icon={CalendarDays}
                title="No upcoming events"
                description="You haven't registered for any upcoming events yet."
                action={<Link to="/events" className="text-[var(--primary)] font-medium">Explore Events</Link>}
                className="py-10"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingEvents.map((event, i) => (
                  <Motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={event._id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--primary)] transition-colors shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg capitalize">
                        {event.eventType}
                      </span>
                    </div>
                    <h3 className="font-bold text-[var(--text-h)] mb-1 line-clamp-1">{event.title}</h3>
                    <p className="text-xs text-[var(--text)] mb-4 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(event.startsAt).toLocaleDateString()}
                    </p>
                    <Link to={`/events/${event._id}`} className="text-sm text-[var(--primary)] font-medium hover:underline">
                      View Details
                    </Link>
                  </Motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Joined Clubs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--primary)]" />
                Your Clubs
              </h2>
              <Link to="/clubs" className="text-sm font-medium text-[var(--primary)] hover:underline flex items-center">
                Discover more <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {clubs.length === 0 ? (
              <EmptyState 
                icon={Users}
                title="No clubs joined"
                description="Join clubs to stay updated with their activities."
                action={<Link to="/clubs" className="text-[var(--primary)] font-medium">Explore Clubs</Link>}
                className="py-10"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clubs.slice(0, 4).map(club => (
                  <Link key={club._id} to={`/clubs/${club._id}`} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4 hover:bg-[var(--bg-card-alt)] transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {getInitials(club.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-h)] line-clamp-1">{club.name}</h3>
                      <p className="text-xs text-[var(--text)]">{club.memberCount || 0} members</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column - Active Chats & Quick Links */}
        <div className="space-y-8">
          <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--text-h)] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
                Recent Messages
              </h2>
            </div>
            
            <div className="space-y-4">
              {activeChats.length === 0 ? (
                <p className="text-sm text-[var(--text)] text-center py-4">No active conversations.</p>
              ) : (
                activeChats.slice(0, 5).map(chat => (
                  <Link to="/messages" key={chat.roomId} className="flex gap-3 items-center group">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center text-[var(--text-h)] font-bold group-hover:bg-[var(--primary)] group-hover:text-white transition-colors shrink-0">
                      {getInitials(chat.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-[var(--text-h)] truncate">{chat.name}</h4>
                      <p className="text-xs text-[var(--text)] truncate">
                        {chat.lastMessage ? chat.lastMessage.content : 'No messages yet'}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            
            <Link to="/messages" className="block text-center text-sm text-[var(--primary)] font-medium mt-6 hover:underline">
              Open Messaging Hub
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
