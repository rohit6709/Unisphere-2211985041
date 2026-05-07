import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion as Motion } from 'framer-motion';

import { FeedbackForm } from '@/components/features/FeedbackForm';
import { cn } from '@/utils/cn';
import { feedbackService } from '@/services/feedbackService';
import { getInitials } from '@/utils/getInitials';

export default function FeedbackSection({ eventId, canSubmit }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Fetch Feedback
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['event-feedback', eventId],
    queryFn: () => feedbackService.getEventFeedback(eventId),
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload) => feedbackService.submitFeedback(payload),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['event-feedback', eventId] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submission failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Please select a rating');
    submitMutation.mutate({ eventId, rating, comment, isAnonymous });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-gray-400">Loading Reviews...</div>;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
               <MessageSquare className="h-6 w-6 text-indigo-600" />
               Attendee Reviews
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
               {feedbackData.summary.totalReviews} total reviews • {feedbackData.summary.averageRating.toFixed(1)} Average Rating
            </p>
         </div>
      </div>

      {/* Submission Form */}
      {canSubmit && (
        <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] p-8 border border-indigo-100 dark:border-indigo-900/30">
           <FeedbackForm
             rating={rating}
             hoverRating={hoverRating}
             onRatingChange={setRating}
             onHoverChange={setHoverRating}
             comment={comment}
             onCommentChange={setComment}
             isAnonymous={isAnonymous}
             onAnonymousChange={setIsAnonymous}
             onSubmit={handleSubmit}
             isSubmitting={submitMutation.isPending}
           />
        </div>
      )}

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {feedbackData.feedbacks.length > 0 ? feedbackData.feedbacks.map((item) => (
           <Motion.div 
             key={item._id}
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="p-8 rounded-[2.5rem] bg-white dark:bg-gray-950 border border-gray-50 dark:border-gray-900 shadow-xl shadow-indigo-500/5 space-y-4"
           >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-black text-indigo-600 overflow-hidden">
                       {item.isAnonymous ? (
                         <Shield className="h-5 w-5 text-gray-400" />
                       ) : (
                                     item.student?.profilePicture ? <img src={item.student.profilePicture} className="h-full w-full object-cover" /> : getInitials(item.student?.name)
                       )}
                    </div>
                    <div>
                       <p className="text-sm font-black text-gray-900 dark:text-white">
                          {item.isAnonymous ? 'Anonymous Attendee' : item.student?.name}
                       </p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                       </p>
                    </div>
                 </div>
                 <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={cn(
                          "h-3.5 w-3.5",
                          item.rating >= star ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-800"
                        )}
                      />
                    ))}
                 </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">
                 "{item.comment || 'No comment provided'}"
              </p>
           </Motion.div>
         )) : (
            <div className="col-span-full py-20 text-center space-y-4">
               <div className="h-16 w-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto">
                  <Star className="h-8 w-8 text-gray-300" />
               </div>
               <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No reviews yet. Be the first!</p>
            </div>
         )}
      </div>
    </div>
  );
}
