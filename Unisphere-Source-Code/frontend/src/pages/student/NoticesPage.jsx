import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BellRing, 
  Megaphone, 
  AlertTriangle, 
  Info, 
  Clock, 
  User,
  ArrowDownCircle,
  FileText,
  X
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import { getMyNotices, getNotice } from '@/services/noticeService';

export default function NoticesPage() {
  useDocumentTitle('Official Notices | Unisphere');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);

  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['my-notices', priorityFilter],
    queryFn: async () => {
      const response = await getMyNotices({ priority: priorityFilter || undefined });
      return response?.notices || response || [];
    },
  });

  const { data: selectedNotice, isLoading: isNoticeLoading } = useQuery({
    queryKey: ['notice', selectedNoticeId],
    queryFn: () => getNotice(selectedNoticeId),
    enabled: Boolean(selectedNoticeId),
  });

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800/50';
      case 'medium': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800/50';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800/50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-5 w-5" />;
      case 'medium': return <Megaphone className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Campus <span className="text-indigo-600">Feed.</span>
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Important announcements, deadlines, and updates curated for you.
          </p>
        </div>
        <div className="flex gap-2">
           {['', 'high', 'medium', 'low'].map(p => (
             <button
               key={p}
               onClick={() => setPriorityFilter(p)}
               className={cn(
                 "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
                 priorityFilter === p 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30" 
                  : "bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-800 hover:border-indigo-500"
               )}
             >
               {p || 'All'}
             </button>
           ))}
        </div>
      </section>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
           {[1,2,3].map(i => (
             <div key={i} className="h-48 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-[2rem]" />
           ))}
        </div>
      ) : !noticesData?.length ? (
        <EmptyState 
          icon={BellRing}
          title="Clear Dashboard"
          description="You're all caught up! No active notices at the moment."
          className="py-20"
        />
      ) : (
        <div className="space-y-6">
           <AnimatePresence>
             {noticesData.map((notice, index) => (
               <Motion.div
                 key={notice._id}
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className={cn(
                   "relative overflow-hidden rounded-[2.5rem] p-8 border shadow-sm transition-all hover:shadow-md",
                   getPriorityStyles(notice.priority)
                 )}
                 role="button"
                 tabIndex={0}
                 onClick={() => setSelectedNoticeId(notice._id)}
                 onKeyDown={(event) => {
                   if (event.key === 'Enter' || event.key === ' ') {
                     event.preventDefault();
                     setSelectedNoticeId(notice._id);
                   }
                 }}
               >
                 <div className="flex flex-col sm:flex-row gap-6">
                   <div className={cn(
                     "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                     notice.priority === 'high' ? "bg-red-600 text-white" : "bg-white dark:bg-gray-800"
                   )}>
                     {getPriorityIcon(notice.priority)}
                   </div>
                   
                   <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                           {new Date(notice.createdAt).toLocaleDateString([], { month:'long', day:'numeric', year:'numeric'})}
                         </span>
                         <span className="h-1 w-1 rounded-full bg-current opacity-30" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-1">
                           <User className="h-3 w-3" /> {notice.postedByRole?.replace('_', ' ')}
                         </span>
                      </div>

                      <h3 className="text-2xl font-black tracking-tight">{notice.title}</h3>
                      <p className="text-lg leading-relaxed opacity-80 whitespace-pre-wrap">
                        {notice.content}
                      </p>

                      <div className="pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-current border-opacity-10">
                         <div className="flex items-center gap-2 text-xs font-bold opacity-60">
                            <Clock className="h-4 w-4" />
                            {notice.expiresAt ? `Expires ${new Date(notice.expiresAt).toLocaleDateString()}` : 'Indefinite'}
                         </div>
                         
                         {notice.attachment?.url && (
                            <a 
                              href={notice.attachment.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-xs font-bold hover:bg-white/60 transition-all"
                            >
                              <FileText className="h-4 w-4" /> {notice.attachment.filename}
                            </a>
                         )}
                      </div>
                   </div>
                 </div>
                 
                 {/* Visual Accent */}
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Megaphone className="h-24 w-24 rotate-12" />
                 </div>
               </Motion.div>
             ))}
           </AnimatePresence>
        </div>
      )}

      {/* Load More Button Placeholder */}
      <div className="flex justify-center pt-8">
        <Button variant="ghost" className="rounded-full text-gray-400 hover:text-indigo-600">
           <ArrowDownCircle className="mr-2 h-5 w-5" /> Load Previous Notices
        </Button>
      </div>

      <Modal open={Boolean(selectedNoticeId)} onClose={() => setSelectedNoticeId(null)} title="Notice Details">
        {isNoticeLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-6 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ) : selectedNotice ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  {selectedNotice.priority || 'notice'}
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{selectedNotice.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticeId(null)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Posted {selectedNotice.createdAt ? new Date(selectedNotice.createdAt).toLocaleString() : 'recently'}
            </p>
            <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {selectedNotice.content}
            </div>
            {selectedNotice.attachment?.url && (
              <a
                href={selectedNotice.attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                <FileText className="h-4 w-4" />
                {selectedNotice.attachment.filename || 'Open attachment'}
              </a>
            )}
          </div>
        ) : (
          <p className="py-4 text-sm text-gray-500">Unable to load this notice right now.</p>
        )}
      </Modal>
    </div>
  );
}
