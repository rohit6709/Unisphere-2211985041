import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, CalendarDays, ShieldCheck, Activity } from 'lucide-react';

import { api } from '@/api/axios';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const { user } = useAuth();

  const { data: clubs = [], isLoading: isLoadingClubs } = useQuery({
    queryKey: ['admin-clubs'],
    queryFn: async () => {
      const { data } = await api.get('/clubs/get-all-clubs');
      return data.data.clubs;
    },
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data } = await api.get('/events/all-events');
      return data.data.events;
    },
  });

  const pendingClubs = clubs.filter(c => c.status === 'pending').length;
  const activeClubs = clubs.filter(c => c.status === 'active').length;

  const pendingEvents = events.filter(e => e.status === 'pending' || e.status === 'in_review').length;
  const stats = [
    { label: 'Total Clubs', value: clubs.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pending Clubs', value: pendingClubs, icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Total Events', value: events.length, icon: CalendarDays, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Pending Events', value: pendingEvents, icon: Activity, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  if (isLoadingClubs || isLoadingEvents) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[var(--bg-card)] rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-[var(--text-h)] mb-2">
            Administrator Dashboard
          </h1>
          <p className="text-[var(--text)]">
            Platform overview, metrics, and pending approvals. Welcome back, {user?.name}.
          </p>
        </div>
        <div className="hidden md:flex w-16 h-16 rounded-2xl bg-[var(--primary-glow)] items-center justify-center text-[var(--primary)]">
          <ShieldCheck className="w-8 h-8" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-[var(--text)] mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-[var(--text-h)]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Events needing attention */}
        <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--primary)]" />
              Event Approvals Needed
            </h2>
            <Link to="/admin/approvals" className="text-sm font-medium text-[var(--primary)] hover:underline">
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            {events.filter(e => e.status === 'pending').slice(0, 5).map(event => (
              <div key={event._id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-card-alt)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--text-h)]">{event.title}</h4>
                  <p className="text-xs text-[var(--text)]">{event.club?.name || 'Unknown Club'}</p>
                </div>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold rounded-lg uppercase">
                  Pending
                </span>
              </div>
            ))}
            {events.filter(e => e.status === 'pending').length === 0 && (
              <div className="text-center py-8 text-[var(--text)]">No events pending approval.</div>
            )}
          </div>
        </section>

        {/* Club Status */}
        <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-h)] flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--primary)]" />
              Club Directory Status
            </h2>
            <Link to="/clubs" className="text-sm font-medium text-[var(--primary)] hover:underline">
              Manage Clubs
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card-alt)]">
              <div>
                <h4 className="font-semibold text-[var(--text-h)]">Active Clubs</h4>
                <p className="text-xs text-[var(--text)]">Currently operating</p>
              </div>
              <span className="text-xl font-bold text-[var(--text-h)]">{activeClubs}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <div>
                <h4 className="font-semibold text-orange-600 dark:text-orange-400">Pending Clubs</h4>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">Awaiting approval</p>
              </div>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{pendingClubs}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
