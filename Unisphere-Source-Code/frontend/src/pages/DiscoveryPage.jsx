import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Clock,
  Compass,
  Building2,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import { getAllClubs } from '@/services/clubService';
import { getPublicEvents } from '@/services/eventService';
import { getInitials } from '@/utils/getInitials';

export default function DiscoveryPage() {
  useDocumentTitle('Discover Unisphere');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: eventsData, isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['discovery-events', searchTerm],
    queryFn: () => getPublicEvents({ search: searchTerm, limit: 6 }),
  });

  const { data: clubsData, isLoading: clubsLoading, isError: clubsError } = useQuery({
    queryKey: ['discovery-clubs', searchTerm],
    queryFn: () => getAllClubs({ search: searchTerm, limit: 6 }),
  });

  const events = eventsData?.events || eventsData || [];
  const clubs = clubsData?.clubs || clubsData || [];
  const featuredEvents = events?.filter(e => e.isFeatured) || [];

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Search Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 pointer-events-none" />
         <div className="max-w-7xl mx-auto px-4 relative">
            <div className="text-center max-w-3xl mx-auto space-y-6">
               <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                 Explore Your <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                   Campus Universe
                 </span>
               </h1>
               <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                 Discover the most exciting clubs, events, and opportunities tailored just for you.
               </p>

               <div className="relative mt-10">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for 'Robotics Club', 'Tech Fusion 2024', or 'Music'..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border-none rounded-[2.5rem] pl-16 pr-6 py-6 text-lg shadow-2xl shadow-indigo-200/50 dark:shadow-none focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
                     <Button className="rounded-full px-8 py-6 h-auto bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
                        Discover Now
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-24">
        
        {/* Featured Events Carousel */}
        {featuredEvents.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
               <h2 className="text-3xl font-black flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-amber-500 fill-amber-500" />
                  Featured Highlights
               </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {featuredEvents.slice(0, 2).map((event, idx) => (
                 <FeaturedCard key={event._id} event={event} variant={idx === 0 ? 'large' : 'compact'} />
               ))}
            </div>
          </section>
        )}

        {/* Discovery Tabs */}
        <section className="space-y-12">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-fit">
                 {['all', 'clubs', 'events'].map(tab => (
                   <button
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={cn(
                       "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                       activeTab === tab 
                         ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-sm" 
                         : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                     )}
                   >
                     {tab}
                   </button>
                 ))}
              </div>
              <Link to={activeTab === 'events' ? '/events' : '/clubs'} className="text-sm font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 group">
                 View All {activeTab === 'all' ? 'Content' : activeTab}
                 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                 {(activeTab === 'all' || activeTab === 'events') && events?.map(event => (
                   <EventCompactCard key={event._id} event={event} />
                 ))}
                 {(activeTab === 'all' || activeTab === 'clubs') && clubs?.map(club => (
                   <ClubCompactCard key={club._id} club={club} />
                 ))}
              </AnimatePresence>
           </div>

           {(eventsLoading || clubsLoading) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-80 rounded-[2.5rem]" />)}
              </div>
           )}

           {(eventsError || clubsError) && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
                We could not load discovery data right now. Please refresh and try again.
              </div>
           )}
        </section>

        {/* Trending Section */}
        <section className="bg-indigo-600 rounded-[3.5rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/40">
           <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
              <TrendingUp className="h-64 w-64 rotate-12" />
           </div>
           <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                 <h2 className="text-4xl md:text-5xl font-black leading-tight">
                   Join the <br />
                   <span className="text-indigo-200">Campus Trend</span>
                 </h2>
                 <p className="text-lg text-indigo-100 font-medium max-w-md">
                   These clubs and events are blowing up! Don't miss out on what everyone is talking about.
                 </p>
                 <Button className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl px-10 py-7 h-auto font-black shadow-xl">
                   Join the Movement
                 </Button>
              </div>
              <div className="space-y-4">
                 {[
                   { name: 'Hackathon 2024', stats: '400+ Joined', icon: Trophy },
                   { name: 'AI Society', stats: 'Trending in CS', icon: Compass },
                   { name: 'Cultural Fest', stats: 'New Event', icon: Sparkles }
                 ].map((item, i) => (
                   <div
                     key={i}
                     className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-6 group hover:bg-white/20 transition-all cursor-pointer"
                   >
                      <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                         <item.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                         <p className="font-bold text-lg">{item.name}</p>
                         <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">{item.stats}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all" />
                   </div>
                 ))}
              </div>
           </div>
        </section>

      </div>
    </div>
  );
}

function FeaturedCard({ event, variant }) {
  return (
    <Motion.div 
      whileHover={{ y: -8 }}
      className={cn(
        "relative rounded-[3rem] overflow-hidden group cursor-pointer shadow-xl",
        variant === 'large' ? "h-[500px]" : "h-[500px]"
      )}
    >
       <img src={event.posterUrl} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
       
       <div className="absolute bottom-0 p-10 space-y-4 w-full">
          <div className="flex items-center gap-3">
             <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Featured</span>
             <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-3 w-3" /> {new Date(event.startsAt).toLocaleDateString()}
             </span>
          </div>
          <h3 className="text-3xl font-black text-white leading-tight">{event.title}</h3>
          <p className="text-gray-300 text-sm line-clamp-2 max-w-xl font-medium">{event.description}</p>
          <Link to={`/events/${event._id}`} className="inline-flex">
            <Button className="rounded-2xl bg-white text-black hover:bg-gray-100 font-black mt-4 px-8">
              Explore Event
            </Button>
          </Link>
       </div>
    </Motion.div>
  );
}

function EventCompactCard({ event }) {
  return (
    <Motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 hover:shadow-2xl transition-all group cursor-pointer"
    >
       <div className="h-48 rounded-[2rem] overflow-hidden mb-6 relative">
          <img src={event.posterUrl} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-2xl shadow-sm">
             <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
       </div>
       <div className="space-y-2">
          <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight line-clamp-1">{event.title}</h4>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event.club?.name}</p>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50 dark:border-gray-800">
             <span className="text-[10px] font-black text-gray-500 flex items-center gap-1.5 uppercase">
                <MapPin className="h-3 w-3" /> {event.venue?.name}
             </span>
             <Link to={`/events/${event._id}`} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">
                View Details
             </Link>
          </div>
       </div>
    </Motion.div>
  );
}

function ClubCompactCard({ club }) {
  return (
    <Motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-indigo-50 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-800 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all group relative overflow-hidden"
    >
       <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
          <Building2 className="h-32 w-32 -rotate-12" />
       </div>
       <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/20 mb-6">
          {getInitials(club.name)}
       </div>
       <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{club.name}</h4>
       <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2 mb-8">{club.description}</p>
       
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
             <Users className="h-4 w-4" /> {club.members?.length || 0} Members
          </div>
          <Link to={`/clubs/${club._id}`}>
            <Button variant="ghost" size="sm" className="rounded-xl h-10 w-10 p-0 hover:bg-indigo-600 hover:text-white transition-all">
               <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
       </div>
    </Motion.div>
  );
}
