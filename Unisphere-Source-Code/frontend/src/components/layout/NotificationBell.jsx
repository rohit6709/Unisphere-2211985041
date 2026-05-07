import React, { useState } from 'react';
import { Bell, Check, Inbox } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

import { cn } from '@/utils/cn';
import { notificationService } from '@/services/notificationService';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getMyNotifications({ limit: 5 }),
    refetchInterval: 30000 // Refresh every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-all group"
      >
        <Bell className={cn(
          "h-6 w-6 transition-all",
          isOpen ? "text-indigo-600 scale-110" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200"
        )} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-4 ring-white dark:ring-gray-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-4 w-[400px] bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl z-50 overflow-hidden shadow-indigo-500/10">
              <div className="p-6 border-b border-gray-50 dark:border-gray-900 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                 <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Notifications</h3>
                 <button 
                   onClick={() => markAllReadMutation.mutate()}
                   className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                   disabled={unreadCount === 0 || markAllReadMutation.isPending}
                 >
                   Mark all as read
                 </button>
              </div>

              <div className="max-h-[450px] overflow-y-auto scrollbar-hide">
                 {notifications.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                       <Inbox className="h-12 w-12 text-gray-200 dark:text-gray-800 mx-auto" />
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All caught up!</p>
                    </div>
                 ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-900">
                       {notifications.map((notif) => (
                         <div 
                           key={notif._id} 
                           className={cn(
                             "p-6 transition-all hover:bg-gray-50/50 dark:hover:bg-gray-900/50 relative group",
                             !notif.isRead && "bg-indigo-50/20 dark:bg-indigo-900/5"
                           )}
                         >
                            <div className="flex gap-4">
                               <div className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                 notif.isRead ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                               )}>
                                  {notif.type === 'chat' ? <MessageSquare className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                               </div>
                               <div className="flex-1 space-y-1">
                                  <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{notif.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium line-clamp-2">{notif.message}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">{format(new Date(notif.createdAt), 'MMM dd, HH:mm')}</p>
                               </div>
                            </div>
                            
                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               {!notif.isRead && (
                                 <button 
                                   onClick={() => markReadMutation.mutate(notif._id)}
                                   className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-emerald-500 hover:bg-emerald-50 shadow-sm"
                                 >
                                    <Check className="h-4 w-4" />
                                 </button>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                 )}
              </div>

              <Link 
                to="/notifications" 
                onClick={() => setIsOpen(false)}
                className="block p-5 text-center text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-50 dark:border-gray-900 transition-colors"
              >
                 View All Notifications
              </Link>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageSquare(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> }
